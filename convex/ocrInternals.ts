import { v } from "convex/values";

import { internalMutation, internalQuery } from "./_generated/server";
import { requireActiveUser } from "./lib/auth";

const activeUserValidator = v.object({
  _id: v.id("users"),
  nome: v.string(),
});

export const getActiveUser = internalQuery({
  args: {},
  returns: activeUserValidator,
  handler: async (ctx) => {
    const user = await requireActiveUser(ctx);
    return {
      _id: user._id,
      nome: user.nome,
    };
  },
});

export const logAttempt = internalMutation({
  args: {
    userId: v.id("users"),
    success: v.boolean(),
    candidate: v.optional(v.string()),
    confidence: v.optional(v.number()),
    failureCode: v.optional(v.string()),
    failureMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("ocr_logs", {
      user_id: args.userId,
      success: args.success,
      candidate: args.candidate,
      confidence: args.confidence,
      failure_code: args.failureCode,
      failure_message: args.failureMessage,
      created_at: Date.now(),
    });
    return null;
  },
});
