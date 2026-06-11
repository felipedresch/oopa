import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { recordAudit } from "./audit";
import { entityTypeValidator, isValidMicrochip, normalizeMicrochip, notificationTypeValidator } from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import { getCurrentUser } from "./lib/auth";
import {
  fanOutNotification,
  formatMicrochipForMessage,
  resolveNotificationHref,
} from "./lib/notifications";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const notificationItemValidator = v.object({
  _id: v.id("notifications"),
  tipo: notificationTypeValidator,
  titulo: v.string(),
  mensagem: v.string(),
  entidade_tipo: v.optional(entityTypeValidator),
  entidade_id: v.optional(v.string()),
  lida: v.boolean(),
  criado_em: v.number(),
  lida_em: v.optional(v.number()),
  href: v.union(v.string(), v.null()),
});

const readFilterValidator = v.optional(
  v.union(v.literal("all"), v.literal("unread"), v.literal("read")),
);

export const listMine = query({
  args: {
    paginationOpts: paginationOptsValidator,
    readFilter: readFilterValidator,
  },
  returns: v.object({
    page: v.array(notificationItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    const readFilter = args.readFilter ?? "all";

    const baseQuery =
      readFilter === "unread"
        ? ctx.db
            .query("notifications")
            .withIndex("by_user_unread", (q) =>
              q.eq("user_id", actor._id).eq("lida", false),
            )
        : readFilter === "read"
          ? ctx.db
              .query("notifications")
              .withIndex("by_user_unread", (q) =>
                q.eq("user_id", actor._id).eq("lida", true),
              )
          : ctx.db
              .query("notifications")
              .withIndex("by_user_and_created", (q) => q.eq("user_id", actor._id));

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);
    const page = await Promise.all(
      result.page.map(async (notification) => ({
        _id: notification._id,
        tipo: notification.tipo,
        titulo: notification.titulo,
        mensagem: notification.mensagem,
        entidade_tipo: notification.entidade_tipo,
        entidade_id: notification.entidade_id,
        lida: notification.lida,
        criado_em: notification.criado_em,
        lida_em: notification.lida_em,
        href: await resolveNotificationHref(ctx, notification),
      })),
    );

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const unreadCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", actor._id).eq("lida", false))
      .collect();

    return unread.length;
  },
});

export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    const notification = await ctx.db.get("notifications", args.notificationId);
    if (!notification) {
      throw notFound("Notificacao");
    }

    if (notification.user_id !== actor._id) {
      throw forbidden();
    }

    if (notification.lida) {
      return null;
    }

    await ctx.db.patch(args.notificationId, {
      lida: true,
      lida_em: Date.now(),
    });

    return null;
  },
});

export const markAllRead = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("user_id", actor._id).eq("lida", false))
      .collect();

    const now = Date.now();
    for (const notification of unread) {
      await ctx.db.patch(notification._id, {
        lida: true,
        lida_em: now,
      });
    }

    return unread.length;
  },
});

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

    const formatted = formatMicrochipForMessage(microchip);
    const recipients = await fanOutNotification(ctx, {
      organizacao: actor.organizacao,
      shouldNotify: (user) =>
        hasPermission(user.permissions, "dogs.create") &&
        hasPermission(user.permissions, "dogs.read"),
      tipo: "dog_not_found",
      titulo: "Microchip nao encontrado",
      mensagem: `${actor.nome} nao encontrou o cao com microchip ${formatted} na identificacao.`,
      entidade_id: microchip,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "notifications.reportDogNotFound",
      entityType: "dog",
      entityId: microchip,
      summary: `Aviso de microchip nao encontrado: ${formatted}`,
      metadata: { recipients },
    });

    return null;
  },
});
