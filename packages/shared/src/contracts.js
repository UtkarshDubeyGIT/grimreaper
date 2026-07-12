export const SCAN_MODES = ["landing", "signup", "dashboard", "chaos"];
export const SCAN_TIERS = ["free", "deep"];
export const SCAN_STATUSES = [
  "queued",
  "claiming",
  "running",
  "finalizing",
  "completed",
  "failed",
  "cancelled",
];

export const RESULT_TYPES = ["dead", "survived"];
export const SEVERITIES = ["minor", "embarrassing", "critical", "apocalyptic"];

const DEFAULT_SCAN_CONFIG = {
  free: {
    personas: 5,
    timeoutSeconds: 90,
    maxScreenshots: 2,
  },
  deep: {
    personas: 25,
    timeoutSeconds: 300,
    maxScreenshots: 10,
  },
};

const STATUS_TRANSITIONS = new Map([
  ["queued", new Set(["claiming", "cancelled"])],
  ["claiming", new Set(["running", "failed", "cancelled", "queued"])],
  ["running", new Set(["finalizing", "failed", "cancelled", "queued"])],
  ["finalizing", new Set(["completed", "failed"])],
  ["completed", new Set()],
  ["failed", new Set()],
  ["cancelled", new Set()],
]);

export function normalizeSubmittedUrl(input) {
  if (typeof input !== "string" || input.trim().length === 0) {
    return { ok: false, error: "Enter a public app URL." };
  }

  const raw = input.trim();
  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(raw) ? raw : `https://${raw}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { ok: false, error: "Enter a valid public app URL." };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Only http and https URLs can be scanned." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with embedded credentials cannot be scanned." };
  }

  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();

  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: "Use a publicly reachable app URL." };
  }

  return {
    ok: true,
    value: parsed.toString(),
    hostname: parsed.hostname,
  };
}

export function isBlockedHost(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }

  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    return true;
  }

  const looksLikeIp = /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":");
  if (!looksLikeIp && !host.includes(".")) {
    return true;
  }

  return false;
}

export function isPrivateIpv4(host) {
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return false;
  }

  const parts = host.split(".").map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export function isPrivateIpv6(host) {
  if (!host.includes(":")) {
    return false;
  }

  const normalized = host.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("0:0:0:0:0:0:0:1")
  );
}

export function scanConfigForTier(tier, env = {}) {
  const selectedTier = tier === "deep" ? "deep" : "free";
  const defaults = DEFAULT_SCAN_CONFIG[selectedTier];
  const prefix = selectedTier === "deep" ? "DEEP_SCAN" : "FREE_SCAN";

  return {
    personas: positiveInt(env[`${prefix}_PERSONAS`], defaults.personas),
    timeoutSeconds: positiveInt(env[`${prefix}_TIMEOUT_SECONDS`], defaults.timeoutSeconds),
    maxScreenshots: positiveInt(env[`${prefix}_MAX_SCREENSHOTS`], defaults.maxScreenshots),
  };
}

export function isAllowedStatusTransition(from, to) {
  return STATUS_TRANSITIONS.get(from)?.has(to) ?? false;
}

export function classifyFallbackResult(personaRuns) {
  const runs = Array.isArray(personaRuns) ? personaRuns : [];
  const failedRuns = runs.filter((run) => run.status === "failed");
  const consoleErrors = runs.reduce((total, run) => total + (Number(run.consoleErrorCount) || 0), 0);

  if (failedRuns.length > 0 || consoleErrors >= 4) {
    const primaryFailure = failedRuns[0];
    const score = Math.max(8, 100 - failedRuns.length * 26 - consoleErrors * 6);
    return {
      result: "dead",
      score,
      severity: severityForScore(score),
      causeOfDeath:
        primaryFailure?.failureReason ??
        `${consoleErrors} console errors were observed during the scan.`,
      fatalRoute: primaryFailure?.route,
    };
  }

  return {
    result: "survived",
    score: 88,
    severity: "minor",
    causeOfDeath: undefined,
    fatalRoute: undefined,
  };
}

export function publicSlugForScan(scanRunId, now = Date.now()) {
  const shortId = String(scanRunId).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toLowerCase();
  return `gr-${now.toString(36)}-${shortId || randomBase36(5)}`;
}

export function ensureScanMode(mode) {
  return SCAN_MODES.includes(mode) ? mode : "landing";
}

export function ensureScanTier(tier) {
  return tier === "deep" ? "deep" : "free";
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function severityForScore(score) {
  if (score <= 25) {
    return "apocalyptic";
  }
  if (score <= 50) {
    return "critical";
  }
  if (score <= 75) {
    return "embarrassing";
  }
  return "minor";
}

function randomBase36(length) {
  return Math.random().toString(36).slice(2, 2 + length);
}
