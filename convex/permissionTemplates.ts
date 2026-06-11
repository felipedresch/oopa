import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./audit";
import { conflict, notFound, validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import {
  permissionValidator,
  permissionsToModuleMap,
  PERMISSION_CATALOG,
  type Permission,
} from "./permissions";

const moduleMapValidator = v.object({
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
});

const templateValidator = v.object({
  _id: v.id("permission_templates"),
  nome: v.string(),
  descricao: v.string(),
  permissions: v.array(permissionValidator),
  moduleMap: moduleMapValidator,
  ativo: v.boolean(),
  criado_em: v.number(),
});

function validatePermissions(permissions: string[]): Permission[] {
  const allowed = new Set<string>(PERMISSION_CATALOG);
  for (const permission of permissions) {
    if (!allowed.has(permission)) {
      throw validationError(`Permissao invalida: ${permission}`);
    }
  }
  return permissions as Permission[];
}

function toTemplate(template: {
  _id: Id<"permission_templates">;
  nome: string;
  descricao: string;
  permissions: Permission[];
  ativo: boolean;
  criado_em: number;
}) {
  return {
    _id: template._id,
    nome: template.nome,
    descricao: template.descricao,
    permissions: template.permissions,
    ativo: template.ativo,
    criado_em: template.criado_em,
    moduleMap: permissionsToModuleMap(template.permissions),
  };
}

export const listForInvite = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("permission_templates"),
      nome: v.string(),
      descricao: v.string(),
      moduleMap: moduleMapValidator,
    }),
  ),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "users.invite");

    const templates = await ctx.db.query("permission_templates").collect();
    return templates
      .filter((template) => template.ativo)
      .map((template) => ({
        _id: template._id,
        nome: template.nome,
        descricao: template.descricao,
        moduleMap: permissionsToModuleMap(template.permissions),
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    ativo: v.optional(v.boolean()),
  },
  returns: v.array(templateValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "templates.manage");

    const search = args.search?.trim().toLowerCase();
    const templates = await ctx.db.query("permission_templates").collect();

    return templates
      .filter((template) => {
        if (args.ativo !== undefined && template.ativo !== args.ativo) {
          return false;
        }
        if (!search) {
          return true;
        }
        return (
          template.nome.toLowerCase().includes(search) ||
          template.descricao.toLowerCase().includes(search)
        );
      })
      .map((template) => toTemplate(template))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  },
});

export const get = query({
  args: { templateId: v.id("permission_templates") },
  returns: templateValidator,
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "templates.manage");

    const template = await ctx.db.get("permission_templates", args.templateId);
    if (!template) {
      throw notFound("Template de permissao");
    }

    return toTemplate(template);
  },
});

export const create = mutation({
  args: {
    nome: v.string(),
    descricao: v.string(),
    permissions: v.array(permissionValidator),
  },
  returns: v.id("permission_templates"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "templates.manage");

    const nome = args.nome.trim();
    if (!nome) {
      throw validationError("Nome obrigatorio.");
    }

    const existing = await ctx.db.query("permission_templates").collect();
    if (existing.some((template) => template.nome.toLowerCase() === nome.toLowerCase())) {
      throw conflict("Ja existe um template com este nome.");
    }

    const now = Date.now();
    const permissions = validatePermissions(args.permissions);
    const templateId = await ctx.db.insert("permission_templates", {
      nome,
      descricao: args.descricao.trim(),
      permissions,
      ativo: true,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "templates.create",
      entityType: "permission_template",
      entityId: templateId,
      summary: `Template criado: ${nome}`,
    });

    return templateId;
  },
});

export const update = mutation({
  args: {
    templateId: v.id("permission_templates"),
    nome: v.string(),
    descricao: v.string(),
    permissions: v.array(permissionValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "templates.manage");

    const template = await ctx.db.get("permission_templates", args.templateId);
    if (!template) {
      throw notFound("Template de permissao");
    }

    const nome = args.nome.trim();
    const permissions = validatePermissions(args.permissions);

    await ctx.db.patch(args.templateId, {
      nome,
      descricao: args.descricao.trim(),
      permissions,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "templates.update",
      entityType: "permission_template",
      entityId: args.templateId,
      summary: `Template atualizado: ${nome}`,
    });

    return null;
  },
});

export const duplicate = mutation({
  args: { templateId: v.id("permission_templates") },
  returns: v.id("permission_templates"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "templates.manage");

    const template = await ctx.db.get("permission_templates", args.templateId);
    if (!template) {
      throw notFound("Template de permissao");
    }

    const now = Date.now();
    const nome = `${template.nome} (copia)`;
    const templateId = await ctx.db.insert("permission_templates", {
      nome,
      descricao: template.descricao,
      permissions: template.permissions,
      ativo: true,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "templates.duplicate",
      entityType: "permission_template",
      entityId: templateId,
      summary: `Template duplicado de ${template.nome}`,
    });

    return templateId;
  },
});

export const setActive = mutation({
  args: {
    templateId: v.id("permission_templates"),
    ativo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "templates.manage");

    const template = await ctx.db.get("permission_templates", args.templateId);
    if (!template) {
      throw notFound("Template de permissao");
    }

    await ctx.db.patch(args.templateId, {
      ativo: args.ativo,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: args.ativo ? "templates.activate" : "templates.deactivate",
      entityType: "permission_template",
      entityId: args.templateId,
      summary: `${args.ativo ? "Ativado" : "Desativado"} template ${template.nome}`,
    });

    return null;
  },
});

