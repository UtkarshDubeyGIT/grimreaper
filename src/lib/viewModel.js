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
