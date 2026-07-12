import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const recordDodoWebhook = mutation({
  args: {
    event: v.object({
      providerSessionId: v.string(),
      status: v.union(
        v.literal("created"),
        v.literal("paid"),
        v.literal("failed"),
        v.literal("refunded"),
      ),
      amount: v.number(),
      currency: v.string(),
      scanRunId: v.optional(v.id("scanRuns")),
      metadata: v.optional(v.record(v.string(), v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("payments")
      .withIndex("by_providerSessionId", (q) =>
        q.eq("providerSessionId", args.event.providerSessionId),
      )
      .unique();

    const payment = {
      provider: "dodo" as const,
      providerSessionId: args.event.providerSessionId,
      status: args.event.status,
      amount: args.event.amount,
      currency: args.event.currency,
      scanRunId: args.event.scanRunId,
      metadata: args.event.metadata,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payment);
      return existing._id;
    }

    return await ctx.db.insert("payments", {
      ...payment,
      createdAt: now,
    });
  },
});
