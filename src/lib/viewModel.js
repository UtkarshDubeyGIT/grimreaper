const PROGRESS_BY_STATUS = {
  queued: 8,
  claiming: 20,
  running: 55,
  finalizing: 78,
  completed: 100,
  failed: 100,
  cancelled: 100,
};

const RESULT_DISPLAY = {
  dead: {
    title: "Death certificate",
    badge: "App declared dead",
    accent: "danger",
  },
  survived: {
    title: "Survival badge",
    badge: "Survived the haunt",
    accent: "safe",
  },
};

export function progressForStatus(status) {
  return PROGRESS_BY_STATUS[status] ?? 0;
}

export function resultDisplay(result) {
  return RESULT_DISPLAY[result] ?? {
    title: "Verdict pending",
    badge: "Awaiting scan",
    accent: "neutral",
  };
}

export function targetLabel(app) {
  if (!app) {
    return "No active target";
  }
  if (app.title?.trim()) {
    return app.title.trim();
  }

  try {
    return new URL(app.normalizedUrl || app.url).hostname;
  } catch {
    return app.normalizedUrl || app.url || "Unknown target";
  }
}

export function leaderboardVerdicts(rows) {
  return rows.filter(
    ({ run }) =>
      run?.status === "completed" &&
      (run.result === "dead" || run.result === "survived") &&
      Number.isFinite(run.score),
  );
}

export function scanFormDefaults() {
  return {
    url: "",
    placeholder: "https://example.com",
  };
}

export function statusLabel(status) {
  switch (status) {
    case "queued":
      return "Queued";
    case "claiming":
      return "Claiming";
    case "running":
      return "Running";
    case "finalizing":
      return "Finalizing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    default:
      return "Unknown";
  }
}
