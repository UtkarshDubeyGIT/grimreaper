import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  classifyFallbackResult,
  ensureScanMode,
  ensureScanTier,
  normalizeSubmittedUrl,
  publicSlugForScan,
  scanConfigForTier,
} from "../packages/shared/src/contracts.js";

const scanModeArg = v.union(
  v.literal("landing"),
  v.literal("signup"),
  v.literal("dashboard"),
  v.literal("chaos"),
);

const scanTierArg = v.union(v.literal("free"), v.literal("deep"));

const personaStatusArg = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("success"),
  v.literal("failed"),
  v.literal("skipped"),
);

const finalResultArg = v.object({
  result: v.union(v.literal("dead"), v.literal("survived")),
  score: v.number(),
  severity: v.union(
    v.literal("minor"),
    v.literal("embarrassing"),
    v.literal("critical"),
    v.literal("apocalyptic"),
  ),
  survivedUsers: v.optional(v.number()),
  maxUsers: v.optional(v.number()),
  causeOfDeath: v.optional(v.string()),
  fatalRoute: v.optional(v.string()),
  verdictText: v.string(),
  roastText: v.string(),
  fixSuggestions: v.array(v.string()),
  audioUrl: v.optional(v.string()),
  shareImageUrl: v.optional(v.string()),
});

export const submitScan = mutation({
  args: {
    url: v.string(),
    mode: v.optional(scanModeArg),
    tier: v.optional(scanTierArg),
  },
  handler: async (ctx, args) => {
    const normalized = normalizeSubmittedUrl(args.url);
    if (!normalized.ok) {
      throw new Error(normalized.error);
    }

    const now = Date.now();
    const mode = ensureScanMode(args.mode);
    const tier = ensureScanTier(args.tier);
    const scanConfig = scanConfigForTier(tier);

    let app = await ctx.db
      .query("apps")
      .withIndex("by_normalizedUrl", (q) => q.eq("normalizedUrl", normalized.value))
      .unique();

    if (!app) {
      const appId = await ctx.db.insert("apps", {
        url: args.url.trim(),
        normalizedUrl: normalized.value,
        createdAt: now,
      });
      app = await ctx.db.get(appId);
    }

    if (!app) {
      throw new Error("Could not create app record.");
    }

    const scanRunId = await ctx.db.insert("scanRuns", {
      appId: app._id,
      mode,
      tier,
      status: "queued",
      survivedUsers: 0,
      maxUsers: scanConfig.personas,
      currentStage: "Queued for exorcism",
      createdAt: now,
      updatedAt: now,
    });

    return {
      scanRunId,
      appId: app._id,
      normalizedUrl: normalized.value,
      status: "queued",
    };
  },
});

export const claimNextScan = mutation({
  args: {
    runnerId: v.string(),
    runnerToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);

    const now = Date.now();
    const queued = await ctx.db
      .query("scanRuns")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "queued"))
      .order("asc")
      .first();

    if (!queued) {
      return null;
    }

    await ctx.db.patch(queued._id, {
      status: "claiming",
      runnerId: args.runnerId,
      claimExpiresAt: now + 30_000,
      currentStage: "Claimed by runner",
      updatedAt: now,
    });

    const app = await ctx.db.get(queued.appId);
    return {
      scanRunId: queued._id,
      appId: queued.appId,
      url: app?.normalizedUrl ?? app?.url,
      mode: queued.mode,
      tier: queued.tier,
      config: scanConfigForTier(queued.tier),
    };
  },
});

export const heartbeatScan = mutation({
  args: {
    scanRunId: v.id("scanRuns"),
    runnerId: v.string(),
    runnerToken: v.optional(v.string()),
    stage: v.string(),
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    const scanRun = await requireRunnerOwnedRun(ctx, args.scanRunId, args.runnerId);
    const now = Date.now();

    await ctx.db.patch(scanRun._id, {
      status: scanRun.status === "claiming" ? "running" : scanRun.status,
      currentStage: trimSummary(args.stage, 180),
      claimExpiresAt: now + 30_000,
      updatedAt: now,
    });
  },
});

export const upsertPersonaResult = mutation({
  args: {
    scanRunId: v.id("scanRuns"),
    runnerId: v.string(),
    runnerToken: v.optional(v.string()),
    persona: v.object({
      personaName: v.string(),
      task: v.string(),
      status: personaStatusArg,
      summary: v.optional(v.string()),
      failureReason: v.optional(v.string()),
      route: v.optional(v.string()),
      artifactUrls: v.optional(v.array(v.string())),
      consoleErrorCount: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    await requireRunnerOwnedRun(ctx, args.scanRunId, args.runnerId);

    const now = Date.now();
    const existing = await ctx.db
      .query("personaRuns")
      .withIndex("by_scanRunId", (q) => q.eq("scanRunId", args.scanRunId))
      .filter((q) => q.eq(q.field("personaName"), args.persona.personaName))
      .first();

    const boundedPersona = {
      personaName: trimSummary(args.persona.personaName, 80),
      task: trimSummary(args.persona.task, 200),
      status: args.persona.status,
      summary: optionalTrim(args.persona.summary, 700),
      failureReason: optionalTrim(args.persona.failureReason, 300),
      route: optionalTrim(args.persona.route, 160),
      artifactUrls: args.persona.artifactUrls?.slice(0, 10),
      consoleErrorCount: args.persona.consoleErrorCount ?? 0,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, boundedPersona);
      return existing._id;
    }

    return await ctx.db.insert("personaRuns", {
      scanRunId: args.scanRunId,
      ...boundedPersona,
      createdAt: now,
    });
  },
});

export const completeScan = mutation({
  args: {
    scanRunId: v.id("scanRuns"),
    runnerId: v.string(),
    runnerToken: v.optional(v.string()),
    result: finalResultArg,
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    const scanRun = await requireRunnerOwnedRun(ctx, args.scanRunId, args.runnerId);
    const now = Date.now();
    const publicSlug = scanRun.publicSlug ?? publicSlugForScan(args.scanRunId, now);
    const survivedUsers =
      args.result.survivedUsers ?? (args.result.result === "survived" ? scanRun.maxUsers : 0);
    const maxUsers = args.result.maxUsers ?? scanRun.maxUsers;

    await ctx.db.patch(args.scanRunId, {
      status: "completed",
      result: args.result.result,
      publicSlug,
      survivedUsers,
      maxUsers,
      score: args.result.score,
      causeOfDeath: optionalTrim(args.result.causeOfDeath, 240),
      fatalRoute: optionalTrim(args.result.fatalRoute, 160),
      severity: args.result.severity,
      currentStage: "Verdict published",
      claimExpiresAt: undefined,
      updatedAt: now,
      completedAt: now,
    });

    const existingCertificate = await ctx.db
      .query("deathCertificates")
      .withIndex("by_scanRunId", (q) => q.eq("scanRunId", args.scanRunId))
      .first();

    const certificate = {
      scanRunId: args.scanRunId,
      publicSlug,
      verdictText: trimSummary(args.result.verdictText, 1200),
      roastText: trimSummary(args.result.roastText, 1200),
      fixSuggestions: args.result.fixSuggestions.slice(0, 6).map((item) => trimSummary(item, 240)),
      audioUrl: args.result.audioUrl,
      shareImageUrl: args.result.shareImageUrl,
      createdAt: existingCertificate?.createdAt ?? now,
    };

    if (existingCertificate) {
      await ctx.db.patch(existingCertificate._id, certificate);
    } else {
      await ctx.db.insert("deathCertificates", certificate);
    }

    return { publicSlug };
  },
});

export const completeScanWithFallback = mutation({
  args: {
    scanRunId: v.id("scanRuns"),
    runnerId: v.string(),
    runnerToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    const scanRun = await requireRunnerOwnedRun(ctx, args.scanRunId, args.runnerId);
    const personas = await ctx.db
      .query("personaRuns")
      .withIndex("by_scanRunId", (q) => q.eq("scanRunId", args.scanRunId))
      .collect();
    const fallback = classifyFallbackResult(personas);
    const now = Date.now();
    const publicSlug = scanRun.publicSlug ?? publicSlugForScan(args.scanRunId, now);

    await ctx.db.patch(args.scanRunId, {
      status: "completed",
      publicSlug,
      result: fallback.result,
      score: fallback.score,
      severity: fallback.severity,
      causeOfDeath: fallback.causeOfDeath,
      fatalRoute: fallback.fatalRoute,
      survivedUsers: fallback.result === "survived" ? scanRun.maxUsers : 0,
      currentStage: "Fallback verdict published",
      claimExpiresAt: undefined,
      updatedAt: now,
      completedAt: now,
    });

    await ctx.db.insert("deathCertificates", {
      scanRunId: args.scanRunId,
      publicSlug,
      verdictText:
        fallback.result === "dead"
          ? "The app collapsed under the demo scan. Evidence was limited, so this verdict uses deterministic fallback classification."
          : "The app survived the demo scan with no fatal evidence collected.",
      roastText:
        fallback.result === "dead"
          ? "The reaper found enough smoke to call time of death, even without the full orchestra."
          : "No fatal hauntings detected. The app gets to keep breathing.",
      fixSuggestions:
        fallback.result === "dead"
          ? ["Review the failing route or action from the persona summary.", "Reduce console errors before the next public demo."]
          : ["Keep the scan path stable.", "Add deeper auth and dashboard checks before launch."],
      createdAt: now,
    });

    return { publicSlug };
  },
});

export const failScan = mutation({
  args: {
    scanRunId: v.id("scanRuns"),
    runnerId: v.string(),
    runnerToken: v.optional(v.string()),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    await requireRunnerOwnedRun(ctx, args.scanRunId, args.runnerId);
    const now = Date.now();

    await ctx.db.patch(args.scanRunId, {
      status: "failed",
      errorMessage: trimSummary(args.errorMessage, 300),
      currentStage: "Scan failed safely",
      claimExpiresAt: undefined,
      updatedAt: now,
      completedAt: now,
    });
  },
});

export const getRun = query({
  args: { scanRunId: v.id("scanRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.scanRunId);
    if (!run) {
      return null;
    }
    const app = await ctx.db.get(run.appId);
    const personas = await ctx.db
      .query("personaRuns")
      .withIndex("by_scanRunId", (q) => q.eq("scanRunId", args.scanRunId))
      .collect();

    return { run, app, personas };
  },
});

export const getPublicResult = query({
  args: { publicSlug: v.string() },
  handler: async (ctx, args) => {
    const run = await ctx.db
      .query("scanRuns")
      .withIndex("by_publicSlug", (q) => q.eq("publicSlug", args.publicSlug))
      .unique();
    if (!run) {
      return null;
    }
    const app = await ctx.db.get(run.appId);
    const certificate = await ctx.db
      .query("deathCertificates")
      .withIndex("by_publicSlug", (q) => q.eq("publicSlug", args.publicSlug))
      .first();

    return { run, app, certificate };
  },
});

export const getLeaderboard = query({
  args: {
    mode: v.optional(scanModeArg),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const completed = await ctx.db
      .query("scanRuns")
      .withIndex("by_result_score")
      .order("desc")
      .take(limit * 2);

    const filtered = args.mode ? completed.filter((run) => run.mode === args.mode) : completed;
    const rows = await Promise.all(
      filtered.slice(0, limit).map(async (run) => ({
        run,
        app: await ctx.db.get(run.appId),
      })),
    );

    return rows;
  },
});

export const getRecentRuns = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    return await ctx.db.query("scanRuns").withIndex("by_status_createdAt").order("desc").take(limit);
  },
});

async function requireRunnerOwnedRun(
  ctx: { db: any },
  scanRunId: Id<"scanRuns">,
  runnerId: string,
) {
  const scanRun = await ctx.db.get(scanRunId);
  if (!scanRun) {
    throw new Error("Scan run not found.");
  }
  if (scanRun.runnerId !== runnerId) {
    throw new Error("Runner does not own this scan.");
  }
  return scanRun;
}

function assertRunnerToken(token?: string) {
  const expected = process.env.CONVEX_RUNNER_TOKEN;
  if (expected && token !== expected) {
    throw new Error("Invalid runner token.");
  }
}

function optionalTrim(value: string | undefined, maxLength: number) {
  return typeof value === "string" ? trimSummary(value, maxLength) : undefined;
}

function trimSummary(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength);
}
