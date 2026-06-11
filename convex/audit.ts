import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import { entityTypeValidator } from "./domainValidators";
import { forbidden } from "./errors";
import { hasPermission } from "./permissions";

type AuditEntityType =
  | "user"
  | "dog"
  | "tutor"
  | "occurrence"
  | "permission_template"
  | "bairro"
  | "occurrence_type";

const auditLogValidator = v.object({
  _id: v.id("audit_logs"),
  _creationTime: v.number(),
  actor_user_id: v.optional(v.id("users")),
  action: v.string(),
  entity_type: entityTypeValidator,
  entity_id: v.optional(v.string()),
  summary: v.string(),
  metadata: v.optional(v.any()),
  created_at: v.number(),
});

export async function recordAudit(
  ctx: Pick<MutationCtx, "db">,
  args: {
    actorUserId?: Id<"users">;
    action: string;
    entityType: AuditEntityType;
    entityId?: string;
    summary: string;
    metadata?: unknown;
  },
) {
  return await ctx.db.insert("audit_logs", {
    actor_user_id: args.actorUserId,
    action: args.action,
    entity_type: args.entityType,
    entity_id: args.entityId,
    summary: args.summary,
    metadata: args.metadata,
    created_at: Date.now(),
  });
}

export const recordAuditInternal = internalMutation({
  args: {
    actorUserId: v.optional(v.id("users")),
    action: v.string(),
    entityType: entityTypeValidator,
    entityId: v.optional(v.string()),
    summary: v.string(),
    metadata: v.optional(v.any()),
  },
  returns: v.id("audit_logs"),
  handler: async (ctx, args) => {
    return await recordAudit(ctx, {
      actorUserId: args.actorUserId,
      action: args.action,
      entityType: args.entityType,
      entityId: args.entityId,
      summary: args.summary,
      metadata: args.metadata,
    });
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorUserId: v.optional(v.id("users")),
    entityType: v.optional(entityTypeValidator),
    action: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    callerPermissions: v.array(v.string()),
  },
  returns: v.object({
    page: v.array(auditLogValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!hasPermission(args.callerPermissions, "system.audit_log")) {
      throw forbidden("Voce nao tem permissao para consultar a auditoria.");
    }

    const result = await ctx.db
      .query("audit_logs")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(args.paginationOpts);

    const page = result.page.filter((entry) => {
      if (args.actorUserId && entry.actor_user_id !== args.actorUserId) {
        return false;
      }
      if (args.entityType && entry.entity_type !== args.entityType) {
        return false;
      }
      if (args.action && entry.action !== args.action) {
        return false;
      }
      if (args.from && entry.created_at < args.from) {
        return false;
      }
      if (args.to && entry.created_at > args.to) {
        return false;
      }
      return true;
    });

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const exportCsv = query({
  args: {
    callerPermissions: v.array(v.string()),
    actorUserId: v.optional(v.id("users")),
    entityType: v.optional(entityTypeValidator),
    action: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    if (!hasPermission(args.callerPermissions, "system.audit_log")) {
      throw forbidden("Voce nao tem permissao para exportar a auditoria.");
    }

    const maxRows = Math.min(args.limit ?? 1000, 5000);
    const entries = await ctx.db
      .query("audit_logs")
      .withIndex("by_created_at")
      .order("desc")
      .take(maxRows);

    const filtered = entries.filter((entry) => {
      if (args.actorUserId && entry.actor_user_id !== args.actorUserId) {
        return false;
      }
      if (args.entityType && entry.entity_type !== args.entityType) {
        return false;
      }
      if (args.action && entry.action !== args.action) {
        return false;
      }
      if (args.from && entry.created_at < args.from) {
        return false;
      }
      if (args.to && entry.created_at > args.to) {
        return false;
      }
      return true;
    });

    const header = [
      "created_at",
      "actor_user_id",
      "action",
      "entity_type",
      "entity_id",
      "summary",
    ];

    const rows = filtered.map((entry) => [
      new Date(entry.created_at).toISOString(),
      entry.actor_user_id ?? "",
      entry.action,
      entry.entity_type,
      entry.entity_id ?? "",
      entry.summary.replaceAll('"', '""'),
    ]);

    return [header.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join(
      "\n",
    );
  },
});
