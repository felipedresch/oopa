import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, query } from "./_generated/server";
import { entityTypeValidator } from "./domainValidators";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { normalizePaginationOpts } from "./lib/pagination";

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
  actor_nome: v.union(v.string(), v.null()),
  action: v.string(),
  entity_type: entityTypeValidator,
  entity_id: v.optional(v.string()),
  summary: v.string(),
  metadata: v.optional(v.any()),
  created_at: v.number(),
});

const auditActorValidator = v.object({
  _id: v.id("users"),
  nome: v.string(),
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

async function filterAuditPage(
  ctx: Pick<QueryCtx, "db">,
  entries: Array<{
    _id: Id<"audit_logs">;
    _creationTime: number;
    actor_user_id?: Id<"users">;
    action: string;
    entity_type: AuditEntityType;
    entity_id?: string;
    summary: string;
    metadata?: unknown;
    created_at: number;
  }>,
  args: {
    actorUserId?: Id<"users">;
    entityType?: AuditEntityType;
    action?: string;
    from?: number;
    to?: number;
  },
) {
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

  return await Promise.all(
    filtered.map(async (entry) => {
      const actor = entry.actor_user_id
        ? await ctx.db.get("users", entry.actor_user_id)
        : null;

      return {
        _id: entry._id,
        _creationTime: entry._creationTime,
        actor_user_id: entry.actor_user_id,
        actor_nome: actor?.nome ?? null,
        action: entry.action,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        summary: entry.summary,
        metadata: entry.metadata,
        created_at: entry.created_at,
      };
    }),
  );
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    actorUserId: v.optional(v.id("users")),
    entityType: v.optional(entityTypeValidator),
    action: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.object({
    page: v.array(auditLogValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

    const result = await ctx.db
      .query("audit_logs")
      .withIndex("by_created_at")
      .order("desc")
      .paginate(normalizePaginationOpts(args.paginationOpts));

    const page = await filterAuditPage(ctx, result.page, args);

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const listActors = query({
  args: {},
  returns: v.array(auditActorValidator),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

    const entries = await ctx.db
      .query("audit_logs")
      .withIndex("by_created_at")
      .order("desc")
      .take(300);

    const actorIds = [
      ...new Set(entries.map((entry) => entry.actor_user_id).filter(Boolean)),
    ] as Id<"users">[];

    const actors = await Promise.all(actorIds.map((userId) => ctx.db.get("users", userId)));
    return actors
      .filter((user): user is NonNullable<typeof user> => Boolean(user))
      .map((user) => ({ _id: user._id, nome: user.nome }))
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"));
  },
});

function buildAuditCsv(
  entries: Array<{
    created_at: number;
    actor_user_id?: Id<"users">;
    action: string;
    entity_type: string;
    entity_id?: string;
    summary: string;
  }>,
): string {
  const header = [
    "created_at",
    "actor_user_id",
    "action",
    "entity_type",
    "entity_id",
    "summary",
  ];

  const rows = entries.map((entry) => [
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
}

export const exportCsv = query({
  args: {
    actorUserId: v.optional(v.id("users")),
    entityType: v.optional(entityTypeValidator),
    action: v.optional(v.string()),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "system.audit_log");

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

    return buildAuditCsv(filtered);
  },
});
