import type { ScanBundle, ScanMode, ScanTier, SubmitScanInput } from "./types";

const now = Date.now();

export const demoLeaderboard: ScanBundle[] = [
  completedRun("gr-demo-landing", "https://checkout-shadows.example", "landing", "free", "dead", 31),
  completedRun("gr-demo-safe", "https://calm-dashboard.example", "dashboard", "free", "survived", 88),
  completedRun("gr-demo-chaos", "https://signup-labyrinth.example", "signup", "deep", "dead", 17),
];

export function makeDemoRun(input: SubmitScanInput): ScanBundle {
  const id = `demo-${Math.random().toString(36).slice(2, 9)}`;
  return {
    run: {
      _id: id,
      mode: input.mode,
      tier: input.tier,
      status: "queued",
      survivedUsers: 0,
      maxUsers: input.tier === "deep" ? 25 : 5,
      currentStage: "Queued for exorcism",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    app: {
      url: input.url,
      normalizedUrl: input.url,
      title: new URL(input.url).hostname,
    },
    personas: [],
  };
}

export function advanceDemoRun(bundle: ScanBundle): ScanBundle {
  const statusOrder = ["queued", "claiming", "running", "finalizing", "completed"] as const;
  const currentIndex = statusOrder.indexOf(bundle.run.status as (typeof statusOrder)[number]);
  const nextStatus = statusOrder[Math.min(currentIndex + 1, statusOrder.length - 1)];
  const isDead = bundle.run.mode === "signup" || bundle.run.mode === "chaos";
  const completed = nextStatus === "completed";

  return {
    ...bundle,
    run: {
      ...bundle.run,
      status: nextStatus,
      result: completed ? (isDead ? "dead" : "survived") : bundle.run.result,
      publicSlug: completed ? `gr-${bundle.run._id}` : bundle.run.publicSlug,
      score: completed ? (isDead ? 34 : 88) : bundle.run.score,
      severity: completed ? (isDead ? "critical" : "minor") : bundle.run.severity,
      survivedUsers: completed ? (isDead ? 1 : bundle.run.maxUsers) : bundle.run.survivedUsers,
      causeOfDeath: completed && isDead ? "Signup flow accepted the first click, then stranded the persona without feedback." : undefined,
      fatalRoute: completed && isDead ? "/signup" : undefined,
      currentStage: stageForStatus(nextStatus),
      updatedAt: Date.now(),
      completedAt: completed ? Date.now() : undefined,
    },
    personas: personasForStatus(nextStatus, bundle.run.mode),
    certificate: completed
      ? {
          publicSlug: `gr-${bundle.run._id}`,
          verdictText: isDead
            ? "Declared dead after the signup persona hit a silent failure and could not recover."
            : "The app survived the core path with no fatal evidence collected.",
          roastText: isDead
            ? "The signup flow has the confidence of a locked door with no handle."
            : "No fatal hauntings detected. Annoyingly competent.",
          fixSuggestions: isDead
            ? ["Return visible validation errors on failed signup actions.", "Add a success or retry state after the primary CTA.", "Monitor client-side exceptions on the signup route."]
            : ["Keep the core path stable.", "Add deeper authenticated dashboard checks before launch."],
        }
      : bundle.certificate,
  };
}

function completedRun(
  slug: string,
  url: string,
  mode: ScanMode,
  tier: ScanTier,
  result: "dead" | "survived",
  score: number,
): ScanBundle {
  return {
    run: {
      _id: slug,
      mode,
      tier,
      status: "completed",
      result,
      publicSlug: slug,
      survivedUsers: result === "survived" ? 5 : 1,
      maxUsers: tier === "deep" ? 25 : 5,
      score,
      causeOfDeath: result === "dead" ? "Primary path produced a dead end under persona pressure." : undefined,
      fatalRoute: result === "dead" ? "/signup" : undefined,
      severity: result === "dead" ? "critical" : "minor",
      currentStage: "Verdict published",
      createdAt: now - score * 60_000,
      updatedAt: now - score * 60_000,
      completedAt: now - score * 60_000,
    },
    app: {
      url,
      normalizedUrl: url,
      title: new URL(url).hostname,
    },
    personas: personasForStatus("completed", mode),
    certificate: {
      publicSlug: slug,
      verdictText:
        result === "dead"
          ? "The app died in the public demo path after a persona found a blocking failure."
          : "The app survived the current GrimReaper scan.",
      roastText:
        result === "dead"
          ? "The interface tried to be mysterious and accidentally became inaccessible."
          : "The reaper left with paperwork unsigned.",
      fixSuggestions:
        result === "dead"
          ? ["Patch the fatal route.", "Add observable error states.", "Replay this scan before the next demo."]
          : ["Run a deep scan before launch.", "Keep monitoring critical paths."],
    },
  };
}

function stageForStatus(status: string) {
  switch (status) {
    case "claiming":
      return "Hermes runner claimed the scan";
    case "running":
      return "Personas are attacking the core path";
    case "finalizing":
      return "Classifier is writing the verdict";
    case "completed":
      return "Verdict published";
    default:
      return "Queued for exorcism";
  }
}

function personasForStatus(status: string, mode: ScanMode) {
  if (status === "queued" || status === "claiming") {
    return [];
  }

  const fatal = mode === "signup" || mode === "chaos";
  return [
    {
      personaName: "Impatient founder",
      task: "Reach the value proposition and primary CTA.",
      status: "success" as const,
      summary: "Found the CTA and loaded the first interaction path.",
      route: "/",
      consoleErrorCount: 0,
    },
    {
      personaName: "Skeptical buyer",
      task: "Attempt the conversion path without extra guidance.",
      status: fatal && status !== "running" ? ("failed" as const) : ("running" as const),
      summary: fatal && status !== "running" ? "Conversion stalled after the signup action." : "Inspecting form and feedback states.",
      failureReason: fatal && status !== "running" ? "No confirmation, validation, or recovery state after submit." : undefined,
      route: fatal ? "/signup" : "/pricing",
      consoleErrorCount: fatal ? 2 : 0,
    },
  ];
}
