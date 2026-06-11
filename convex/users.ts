import {
  createAccount,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { recordAudit } from "./audit";
import { isValidEmail } from "./domainValidators";
import {
  conflict,
  forbidden,
  notFound,
  tokenExpired,
  tokenUsed,
  validationError,
} from "./errors";
import {
  countActiveTeamManagers,
  getCurrentUser,
  hasTeamAccess,
  requireAnyPermission,
  requirePermission,
} from "./lib/auth";
import { normalizePaginationOpts } from "./lib/pagination";
import { generateRawToken, hashToken, INVITE_TTL_MS, RESET_TTL_MS } from "./lib/tokens";
import {
  permissionValidator,
  permissionsToModuleMap,
  PERMISSION_CATALOG,
  type Permission,
} from "./permissions";

const userSummaryValidator = v.object({
  _id: v.id("users"),
  nome: v.string(),
  email: v.string(),
  telefone: v.optional(v.string()),
  organizacao: v.string(),
  ativo: v.boolean(),
  permissions: v.array(v.string()),
  moduleMap: v.object({
    dogs: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
    tutors: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
    occurrences: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
    adoptions: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
    team: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
    settings: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
    system: v.union(
      v.literal("none"),
      v.literal("read"),
      v.literal("write"),
      v.literal("manage"),
    ),
  }),
  ultimo_acesso_em: v.optional(v.number()),
  criado_em: v.number(),
});

function toUserSummary(user: Doc<"users">) {
  return {
    _id: user._id,
    nome: user.nome,
    email: user.email ?? "",
    telefone: user.telefone,
    organizacao: user.organizacao,
    ativo: user.ativo,
    permissions: user.permissions,
    moduleMap: permissionsToModuleMap(user.permissions),
    ultimo_acesso_em: user.ultimo_acesso_em,
    criado_em: user.criado_em,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validatePermissions(permissions: string[]): Permission[] {
  const allowed = new Set<string>(PERMISSION_CATALOG);
  for (const permission of permissions) {
    if (!allowed.has(permission)) {
      throw validationError(`Permissao invalida: ${permission}`);
    }
  }
  return permissions as Permission[];
}

export const me = query({
  args: {},
  returns: v.union(userSummaryValidator, v.null()),
  handler: async (ctx) => {
    try {
      const user = await getCurrentUser(ctx);
      return toUserSummary(user);
    } catch {
      return null;
    }
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    ativo: v.optional(v.boolean()),
    organizacao: v.optional(v.string()),
  },
  returns: v.object({
    page: v.array(userSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requireAnyPermission(actor, ["users.invite", "users.manage_permissions"]);

    const search = args.search?.trim().toLowerCase();
    const baseQuery =
      args.ativo === undefined
        ? ctx.db.query("users")
        : ctx.db.query("users").withIndex("by_active", (q) => q.eq("ativo", args.ativo!));

    const result = await baseQuery
      .order("desc")
      .paginate(normalizePaginationOpts(args.paginationOpts));

    const page = result.page
      .filter((user) => {
        if (
          args.organizacao &&
          user.organizacao.toLowerCase() !== args.organizacao.toLowerCase()
        ) {
          return false;
        }
        if (!search) {
          return true;
        }
        return (
          user.nome.toLowerCase().includes(search) ||
          (user.email ?? "").toLowerCase().includes(search)
        );
      })
      .map(toUserSummary)
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const listOrganizations = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    requireAnyPermission(actor, ["users.invite", "users.manage_permissions"]);

    const users = await ctx.db.query("users").take(500);
    return [...new Set(users.map((user) => user.organizacao))].sort((a, b) =>
      a.localeCompare(b, "pt-BR"),
    );
  },
});

export const get = query({
  args: { userId: v.id("users") },
  returns: userSummaryValidator,
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requireAnyPermission(actor, ["users.invite", "users.manage_permissions"]);

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw notFound("Usuario");
    }

    return toUserSummary(user);
  },
});

export const invite = mutation({
  args: {
    nome: v.string(),
    email: v.string(),
    organizacao: v.string(),
    telefone: v.optional(v.string()),
    permissions: v.array(permissionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "users.invite");

    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw validationError("Email invalido.");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (existing) {
      throw conflict("Ja existe um usuario com este email.");
    }

    const now = Date.now();
    const permissions = validatePermissions(args.permissions);
    const userId = await ctx.db.insert("users", {
      nome: args.nome.trim(),
      name: args.nome.trim(),
      email,
      telefone: args.telefone,
      organizacao: args.organizacao.trim(),
      ativo: false,
      permissions,
      criado_em: now,
      criado_por: actor._id,
    });

    const rawToken = generateRawToken();
    await ctx.db.insert("user_invites", {
      user_id: userId,
      email,
      token_hash: await hashToken(rawToken),
      expires_at: now + INVITE_TTL_MS,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "users.invite",
      entityType: "user",
      entityId: userId,
      summary: `Convite enviado para ${email}`,
      metadata: { nome: args.nome, organizacao: args.organizacao },
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmail, {
      email,
      nome: args.nome,
      token: rawToken,
    });

    return null;
  },
});

export const updatePermissions = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(permissionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "users.manage_permissions");

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw notFound("Usuario");
    }

    const permissions = validatePermissions(args.permissions);

    if (user.ativo && hasTeamAccess(user) && !hasTeamAccess({ ...user, permissions })) {
      const managers = await countActiveTeamManagers(ctx);
      if (managers <= 1) {
        throw conflict("Nao e possivel remover a ultima conta ativa com acesso a Equipe.");
      }
    }

    await ctx.db.patch(args.userId, {
      permissions,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "users.update_permissions",
      entityType: "user",
      entityId: args.userId,
      summary: `Permissoes atualizadas para ${user.email ?? user.nome}`,
      metadata: { permissions },
    });

    return null;
  },
});

export const deactivate = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "users.deactivate");

    if (args.userId === actor._id) {
      throw forbidden("Voce nao pode desativar a propria conta.");
    }

    const user = await ctx.db.get("users", args.userId);
    if (!user) {
      throw notFound("Usuario");
    }

    if (user.ativo && hasTeamAccess(user)) {
      const managers = await countActiveTeamManagers(ctx);
      if (managers <= 1) {
        throw conflict("Nao e possivel desativar a ultima conta ativa com acesso a Equipe.");
      }
    }

    await ctx.db.patch(args.userId, {
      ativo: false,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "users.deactivate",
      entityType: "user",
      entityId: args.userId,
      summary: `Usuario desativado: ${user.email ?? user.nome}`,
    });

    return null;
  },
});

export const getInvitePreview = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({
      status: v.literal("valid"),
      nome: v.string(),
      email: v.string(),
      organizacao: v.string(),
    }),
    v.object({ status: v.literal("expired") }),
    v.object({ status: v.literal("used") }),
    v.object({ status: v.literal("invalid") }),
  ),
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const invite = await ctx.db
      .query("user_invites")
      .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
      .unique();

    if (!invite) {
      return { status: "invalid" as const };
    }
    if (invite.used_at) {
      return { status: "used" as const };
    }
    if (invite.expires_at < Date.now()) {
      return { status: "expired" as const };
    }

    const user = await ctx.db.get("users", invite.user_id);
    if (!user) {
      return { status: "invalid" as const };
    }

    return {
      status: "valid" as const,
      nome: user.nome,
      email: user.email ?? invite.email,
      organizacao: user.organizacao,
    };
  },
});

export const consumeInviteToken = internalMutation({
  args: { token: v.string() },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    nome: v.string(),
    organizacao: v.string(),
    permissions: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const invite = await ctx.db
      .query("user_invites")
      .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
      .unique();

    if (!invite) {
      throw validationError("Convite invalido.");
    }
    if (invite.used_at) {
      throw tokenUsed();
    }
    if (invite.expires_at < Date.now()) {
      throw tokenExpired();
    }

    const user = await ctx.db.get("users", invite.user_id);
    if (!user) {
      throw notFound("Usuario");
    }

    await ctx.db.patch(invite._id, { used_at: Date.now() });

    return {
      userId: user._id,
      email: user.email ?? invite.email,
      nome: user.nome,
      organizacao: user.organizacao,
      permissions: user.permissions,
    };
  },
});

export const activateAfterInvite = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.patch(args.userId, {
      ativo: true,
      ultimo_acesso_em: now,
      atualizado_em: now,
    });
    return null;
  },
});

export const acceptInvite = action({
  args: {
    token: v.string(),
    password: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.password.length < 8) {
      throw validationError("Senha deve ter pelo menos 8 caracteres.");
    }

    const invite = await ctx.runMutation(internal.users.consumeInviteToken, {
      token: args.token,
    });

    await createAccount(ctx, {
      provider: "password",
      account: {
        id: invite.email,
        secret: args.password,
      },
      profile: {
        email: invite.email,
        name: invite.nome,
        nome: invite.nome,
        organizacao: invite.organizacao,
        ativo: true,
        permissions: invite.permissions,
        criado_em: Date.now(),
      },
    });

    await ctx.runMutation(internal.users.activateAfterInvite, {
      userId: invite.userId,
    });

    await ctx.runMutation(internal.users.auditInviteAccepted, {
      userId: invite.userId,
      email: invite.email,
    });

    return null;
  },
});

export const auditInviteAccepted = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await recordAudit(ctx, {
      actorUserId: args.userId,
      action: "users.accept_invite",
      entityType: "user",
      entityId: args.userId,
      summary: `Convite aceito por ${args.email}`,
    });
    return null;
  },
});

export const requestPasswordReset = mutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!isValidEmail(email)) {
      throw validationError("Email invalido.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (!user?.ativo) {
      return null;
    }

    const now = Date.now();
    const rawToken = generateRawToken();
    await ctx.db.insert("password_reset_tokens", {
      user_id: user._id,
      email,
      token_hash: await hashToken(rawToken),
      expires_at: now + RESET_TTL_MS,
      criado_em: now,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendPasswordResetEmail, {
      email,
      token: rawToken,
    });

    return null;
  },
});

export const consumePasswordResetToken = internalMutation({
  args: { token: v.string() },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
  }),
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const reset = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
      .unique();

    if (!reset) {
      throw validationError("Link de reset invalido.");
    }
    if (reset.used_at) {
      throw tokenUsed();
    }
    if (reset.expires_at < Date.now()) {
      throw tokenExpired();
    }

    await ctx.db.patch(reset._id, { used_at: Date.now() });

    return {
      userId: reset.user_id,
      email: reset.email,
    };
  },
});

export const resetPasswordWithToken = action({
  args: {
    token: v.string(),
    password: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.password.length < 8) {
      throw validationError("Senha deve ter pelo menos 8 caracteres.");
    }

    const reset = await ctx.runMutation(internal.users.consumePasswordResetToken, {
      token: args.token,
    });

    await retrieveAccount(ctx, {
      provider: "password",
      account: { id: reset.email },
    });

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: reset.email,
        secret: args.password,
      },
    });

    await invalidateSessions(ctx, { userId: reset.userId });

    await ctx.runMutation(internal.users.auditPasswordReset, {
      userId: reset.userId,
      email: reset.email,
    });

    return null;
  },
});

export const auditPasswordReset = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await recordAudit(ctx, {
      actorUserId: args.userId,
      action: "users.reset_password",
      entityType: "user",
      entityId: args.userId,
      summary: `Senha redefinida para ${args.email}`,
    });
    return null;
  },
});

export const getResetPreview = query({
  args: { token: v.string() },
  returns: v.union(
    v.object({ status: v.literal("valid") }),
    v.object({ status: v.literal("expired") }),
    v.object({ status: v.literal("used") }),
    v.object({ status: v.literal("invalid") }),
  ),
  handler: async (ctx, args) => {
    const tokenHash = await hashToken(args.token);
    const reset = await ctx.db
      .query("password_reset_tokens")
      .withIndex("by_token_hash", (q) => q.eq("token_hash", tokenHash))
      .unique();

    if (!reset) {
      return { status: "invalid" as const };
    }
    if (reset.used_at) {
      return { status: "used" as const };
    }
    if (reset.expires_at < Date.now()) {
      return { status: "expired" as const };
    }
    return { status: "valid" as const };
  },
});

