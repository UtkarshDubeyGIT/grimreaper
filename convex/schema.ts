import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const scanMode = v.union(
  v.literal("landing"),
  v.literal("signup"),
  v.literal("dashboard"),
  v.literal("chaos"),
);

const scanTier = v.union(v.literal("free"), v.literal("deep"));

const scanStatus = v.union(
  v.literal("queued"),
  v.literal("claiming"),
  v.literal("running"),
  v.literal("finalizing"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("cancelled"),
);

const scanResult = v.union(v.literal("dead"), v.literal("survived"));

const severity = v.union(
  v.literal("minor"),
  v.literal("embarrassing"),
  v.literal("critical"),
  v.literal("apocalyptic"),
);

export default defineSchema({
  users: defineTable({
    externalId: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_externalId", ["externalId"]),

  apps: defineTable({
    ownerId: v.optional(v.id("users")),
    url: v.string(),
    normalizedUrl: v.string(),
    title: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_normalizedUrl", ["normalizedUrl"])
    .index("by_createdAt", ["createdAt"]),

  scanRuns: defineTable({
    appId: v.id("apps"),
    mode: scanMode,
    tier: scanTier,
    status: scanStatus,
    result: v.optional(scanResult),
    publicSlug: v.optional(v.string()),
    survivedUsers: v.number(),
    maxUsers: v.number(),
    score: v.optional(v.number()),
    causeOfDeath: v.optional(v.string()),
    fatalRoute: v.optional(v.string()),
    severity: v.optional(severity),
    currentStage: v.optional(v.string()),
    runnerId: v.optional(v.string()),
    claimExpiresAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_publicSlug", ["publicSlug"])
    .index("by_appId_createdAt", ["appId", "createdAt"])
    .index("by_result_score", ["result", "score"]),

  personaRuns: defineTable({
    scanRunId: v.id("scanRuns"),
    personaName: v.string(),
    task: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("skipped"),
    ),
    summary: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    route: v.optional(v.string()),
    artifactUrls: v.optional(v.array(v.string())),
    consoleErrorCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_scanRunId", ["scanRunId"]),

  deathCertificates: defineTable({
    scanRunId: v.id("scanRuns"),
    publicSlug: v.string(),
    verdictText: v.string(),
    roastText: v.string(),
    fixSuggestions: v.array(v.string()),
    audioUrl: v.optional(v.string()),
    shareImageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_publicSlug", ["publicSlug"])
    .index("by_scanRunId", ["scanRunId"]),

  payments: defineTable({
    userId: v.optional(v.id("users")),
    scanRunId: v.optional(v.id("scanRuns")),
    provider: v.literal("dodo"),
    providerSessionId: v.string(),
    status: v.union(
      v.literal("created"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("refunded"),
    ),
    amount: v.number(),
    currency: v.string(),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_providerSessionId", ["providerSessionId"])
    .index("by_scanRunId", ["scanRunId"]),
});
