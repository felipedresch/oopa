import { v } from "convex/values";

import { recordAudit } from "./audit";
import { isValidMicrochip, normalizeMicrochip } from "./domainValidators";
import { forbidden, validationError } from "./errors";
import { getCurrentUser } from "./lib/auth";
import { hasPermission } from "./permissions";
import { mutation } from "./_generated/server";

export const reportDogNotFound = mutation({
  args: {
    microchip: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }

    if (hasPermission(actor.permissions, "dogs.create")) {
      throw validationError("Use o cadastro de novo cao para este microchip.");
    }

    const microchip = normalizeMicrochip(args.microchip);
    if (!isValidMicrochip(microchip)) {
      throw validationError("Informe um microchip valido com 15 digitos.");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_active", (q) => q.eq("ativo", true))
      .collect();

    const recipients = users.filter(
      (user) =>
        user.organizacao === actor.organizacao &&
        hasPermission(user.permissions, "dogs.create") &&
        hasPermission(user.permissions, "dogs.read"),
    );

    const formatted = `${microchip.slice(0, 3)} ${microchip.slice(3, 6)} ${microchip.slice(6, 9)} ${microchip.slice(9, 12)} ${microchip.slice(12)}`;
    const now = Date.now();

    for (const recipient of recipients) {
      await ctx.db.insert("notifications", {
        user_id: recipient._id,
        tipo: "dog_not_found",
        titulo: "Microchip nao encontrado",
        mensagem: `${actor.nome} nao encontrou o cao com microchip ${formatted} na identificacao.`,
        entidade_id: microchip,
        lida: false,
        criado_em: now,
      });
    }

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "notifications.reportDogNotFound",
      entityType: "dog",
      entityId: microchip,
      summary: `Aviso de microchip nao encontrado: ${formatted}`,
      metadata: { recipients: recipients.length },
    });

    return null;
  },
});
