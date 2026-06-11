import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { getCurrentUser, requireAnyPermission } from "./lib/auth";

/**
 * URL assinada para upload de fotos via Convex File Storage.
 */
export const createSignedUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    requireAnyPermission(actor, [
      "dogs.create",
      "dogs.edit",
      "tutors.create",
      "tutors.edit",
      "occurrences.create_rotina",
      "occurrences.create_clinica",
      "occurrences.create_risco",
      "occurrences.create_legal",
      "occurrences.create_adocao",
      "occurrences.create_outro",
    ]);
    return await ctx.storage.generateUploadUrl();
  },
});
