import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";

/**
 * URL assinada para upload de fotos via Convex File Storage.
 */
export const createSignedUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await getCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
