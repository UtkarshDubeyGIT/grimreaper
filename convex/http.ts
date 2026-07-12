import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/api/dodo/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.json();
    const event = mapDodoWebhook(payload);

    if (!event) {
      return json({ error: "Unsupported Dodo webhook payload." }, 400);
    }

    await ctx.runMutation(api.payments.recordDodoWebhook, { event });
    return json({ ok: true });
  }),
});

export default http;

function mapDodoWebhook(payload: any) {
  const data = payload?.data ?? payload;
  const providerSessionId = data?.checkout_session_id ?? data?.payment_id ?? data?.id;
  const status = mapPaymentStatus(data?.status ?? payload?.type);

  if (!providerSessionId || !status) {
    return null;
  }

  return {
    providerSessionId: String(providerSessionId),
    status,
    amount: Number(data?.amount ?? data?.total_amount ?? 0),
    currency: String(data?.currency ?? "USD").toUpperCase(),
    scanRunId: data?.metadata?.scanRunId,
    metadata: stringifyMetadata(data?.metadata),
  };
}

function mapPaymentStatus(status: string | undefined) {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized.includes("paid") || normalized.includes("succeeded") || normalized.includes("success")) {
    return "paid" as const;
  }
  if (normalized.includes("fail")) {
    return "failed" as const;
  }
  if (normalized.includes("refund")) {
    return "refunded" as const;
  }
  if (normalized.includes("created") || normalized.includes("pending")) {
    return "created" as const;
  }
  return null;
}

function stringifyMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(metadata as Record<string, unknown>).map(([key, value]) => [key, String(value)]),
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
