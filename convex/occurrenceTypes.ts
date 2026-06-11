import { v } from "convex/values";

import { recordAudit } from "./audit";
import {
  occurrenceCategoryValidator,
  severityValidator,
} from "./domainValidators";
import { conflict, forbidden, notFound, validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import {
  canCreateOccurrenceCategory,
  categoryPermissionLabel,
} from "./lib/occurrences";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const occurrenceTypeSummaryValidator = v.object({
  _id: v.id("occurrence_types"),
  nome: v.string(),
  categoria: occurrenceCategoryValidator,
  requer_foto: v.boolean(),
  gravidade_padrao: severityValidator,
  ativo: v.boolean(),
  criado_em: v.number(),
  atualizado_em: v.optional(v.number()),
  required_permission: v.string(),
});

const occurrenceTypeOptionValidator = v.object({
  _id: v.id("occurrence_types"),
  nome: v.string(),
  categoria: occurrenceCategoryValidator,
  requer_foto: v.boolean(),
  gravidade_padrao: severityValidator,
});

function normalizeNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    ativo: v.optional(v.boolean()),
  },
  returns: v.array(occurrenceTypeSummaryValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "occurrence_types.manage")) {
      throw forbidden();
    }

    const search = args.search?.trim().toLowerCase();
    const types = await ctx.db.query("occurrence_types").collect();

    return types
      .filter((type) => {
        if (args.ativo !== undefined && type.ativo !== args.ativo) {
          return false;
        }
        if (search && !type.nome.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((type) => ({
        _id: type._id,
        nome: type.nome,
        categoria: type.categoria,
        requer_foto: type.requer_foto,
        gravidade_padrao: type.gravidade_padrao,
        ativo: type.ativo,
        criado_em: type.criado_em,
        atualizado_em: type.atualizado_em,
        required_permission: categoryPermissionLabel(type.categoria),
      }));
  },
});

export const availableForCreate = query({
  args: {},
  returns: v.array(occurrenceTypeOptionValidator),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    const types = await ctx.db.query("occurrence_types").collect();

    return types
      .filter(
        (type) =>
          type.ativo &&
          type.nome !== "Correção/Retificação" &&
          canCreateOccurrenceCategory(actor.permissions, type.categoria),
      )
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((type) => ({
        _id: type._id,
        nome: type.nome,
        categoria: type.categoria,
        requer_foto: type.requer_foto,
        gravidade_padrao: type.gravidade_padrao,
      }));
  },
});

export const create = mutation({
  args: {
    nome: v.string(),
    categoria: occurrenceCategoryValidator,
    requer_foto: v.boolean(),
    gravidade_padrao: severityValidator,
  },
  returns: v.id("occurrence_types"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "occurrence_types.manage");

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do tipo obrigatório.");
    }

    const existing = (await ctx.db.query("occurrence_types").collect()).find(
      (type) => type.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (existing) {
      throw conflict("Já existe um tipo com este nome.");
    }

    const now = Date.now();
    const typeId = await ctx.db.insert("occurrence_types", {
      nome,
      categoria: args.categoria,
      requer_foto: args.requer_foto,
      gravidade_padrao: args.gravidade_padrao,
      ativo: true,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "occurrence_types.create",
      entityType: "occurrence_type",
      entityId: typeId,
      summary: `Tipo de ocorrência criado: ${nome}`,
    });

    return typeId;
  },
});

export const update = mutation({
  args: {
    occurrenceTypeId: v.id("occurrence_types"),
    nome: v.string(),
    categoria: occurrenceCategoryValidator,
    requer_foto: v.boolean(),
    gravidade_padrao: severityValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "occurrence_types.manage");

    const type = await ctx.db.get("occurrence_types", args.occurrenceTypeId);
    if (!type) {
      throw notFound("Tipo de ocorrência");
    }

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do tipo obrigatório.");
    }

    const duplicate = (await ctx.db.query("occurrence_types").collect()).find(
      (item) =>
        item._id !== args.occurrenceTypeId && item.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (duplicate) {
      throw conflict("Já existe um tipo com este nome.");
    }

    const now = Date.now();
    await ctx.db.patch(args.occurrenceTypeId, {
      nome,
      categoria: args.categoria,
      requer_foto: args.requer_foto,
      gravidade_padrao: args.gravidade_padrao,
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "occurrence_types.update",
      entityType: "occurrence_type",
      entityId: args.occurrenceTypeId,
      summary: `Tipo de ocorrência atualizado: ${nome}`,
    });

    return null;
  },
});

export const setActive = mutation({
  args: {
    occurrenceTypeId: v.id("occurrence_types"),
    ativo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "occurrence_types.manage");

    const type = await ctx.db.get("occurrence_types", args.occurrenceTypeId);
    if (!type) {
      throw notFound("Tipo de ocorrência");
    }

    if (type.ativo === args.ativo) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.occurrenceTypeId, {
      ativo: args.ativo,
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: args.ativo ? "occurrence_types.activate" : "occurrence_types.deactivate",
      entityType: "occurrence_type",
      entityId: args.occurrenceTypeId,
      summary: `${args.ativo ? "Tipo ativado" : "Tipo desativado"}: ${type.nome}`,
    });

    return null;
  },
});
