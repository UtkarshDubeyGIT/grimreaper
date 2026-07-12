import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const createAudioUploadUrl = mutation({
  args: { runnerToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    return await ctx.storage.generateUploadUrl();
  },
});

export const resolveAudioUrl = mutation({
  args: {
    runnerToken: v.optional(v.string()),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    assertRunnerToken(args.runnerToken);
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new Error("Uploaded audio could not be resolved.");
    }
    return url;
  },
});

function assertRunnerToken(token?: string) {
  const expected = process.env.CONVEX_RUNNER_TOKEN;
  if (expected && token !== expected) {
    throw new Error("Invalid runner token.");
  }
}
