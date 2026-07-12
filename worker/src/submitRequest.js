import {
  ensureScanMode,
  ensureScanTier,
  normalizeSubmittedUrl,
} from "../../packages/shared/src/contracts.js";

export function parseSubmitScanBody(body) {
  if (!body || typeof body !== "object" || typeof body.url !== "string") {
    return { ok: false, error: "Submit a JSON body with a URL." };
  }

  const normalized = normalizeSubmittedUrl(body.url);
  if (!normalized.ok) {
    return { ok: false, error: normalized.error };
  }

  return {
    ok: true,
    value: {
      url: normalized.value,
      mode: ensureScanMode(body.mode),
      tier: ensureScanTier(body.tier),
    },
  };
}

export function isAllowedByHostAllowlist(url, allowlist) {
  if (!allowlist || allowlist.trim().length === 0) {
    return true;
  }

  const host = new URL(url).hostname.toLowerCase();
  const allowedHosts = allowlist
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}
