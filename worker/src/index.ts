import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { isAllowedByHostAllowlist, parseSubmitScanBody } from "./submitRequest.js";

export interface Env {
  CONVEX_URL: string;
  SCANS_ENABLED?: string;
  ALLOWLIST_ONLY?: string;
  ALLOWLIST_HOSTS?: string;
}

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return json({ ok: true, service: "grimreaper-edge" });
    }

    if (url.pathname === "/api/scan" && request.method === "POST") {
      return handleScanSubmission(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};

async function handleScanSubmission(request: Request, env: Env) {
  if (env.SCANS_ENABLED === "false") {
    return json({ error: "New scans are temporarily disabled." }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const parsed = parseSubmitScanBody(body);
  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  const submission = parsed.value;
  if (!submission) {
    return json({ error: "Invalid scan submission." }, 400);
  }

  if (
    env.ALLOWLIST_ONLY === "true" &&
    !isAllowedByHostAllowlist(submission.url, env.ALLOWLIST_HOSTS)
  ) {
    return json({ error: "This demo is currently limited to allowlisted hosts." }, 403);
  }

  const convex = new ConvexHttpClient(env.CONVEX_URL);
  const result = await convex.mutation(anyApi.scans.submitScan, submission);
  return json(result, 201);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders,
    },
  });
}
