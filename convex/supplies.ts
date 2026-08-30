import { v } from "convex/values";

import { recordAudit } from "./audit";
import { supplyCategoryValidator } from "./domainValidators";
import { conflict, forbidden, notFound, validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const supplyValidator = v.object({
  _id: v.id("supplies"),
  nome: v.string(),
  descricao: v.optional(v.string()),
  categoria: supplyCategoryValidator,
  unidade_medida: v.optional(v.string()),
  valor_padrao: v.number(),
  ativo: v.boolean(),
  criado_em: v.number(),
  atualizado_em: v.optional(v.number()),
});

function normalizeNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

function assertValidValor(valor: number): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw validationError("Valor padrão deve ser um número maior ou igual a zero.");
  }
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    ativo: v.optional(v.boolean()),
  },
  returns: v.array(supplyValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "supplies.manage")) {
      throw forbidden();
    }

    const search = args.search?.trim().toLowerCase();
    const supplies = await ctx.db.query("supplies").collect();

    return supplies
      .filter((supply) => {
        if (args.ativo !== undefined && supply.ativo !== args.ativo) {
          return false;
        }
        if (search && !supply.nome.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((supply) => ({
        _id: supply._id,
        nome: supply.nome,
        descricao: supply.descricao,
        categoria: supply.categoria,
        unidade_medida: supply.unidade_medida,
        valor_padrao: supply.valor_padrao,
        ativo: supply.ativo,
        criado_em: supply.criado_em,
        atualizado_em: supply.atualizado_em,
      }));
  },
});

/** Catálogo ativo consumido pelo lançamento de atendimentos. */
export const listActiveForAppointments = query({
  args: {},
  returns: v.array(supplyValidator),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "appointments.create");

    const supplies = await ctx.db.query("supplies").take(500);
    return supplies
      .filter((supply) => supply.ativo)
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((supply) => ({
        _id: supply._id,
        nome: supply.nome,
        descricao: supply.descricao,
        categoria: supply.categoria,
        unidade_medida: supply.unidade_medida,
        valor_padrao: supply.valor_padrao,
        ativo: supply.ativo,
        criado_em: supply.criado_em,
        atualizado_em: supply.atualizado_em,
      }));
  },
});

export const create = mutation({
  args: {
    nome: v.string(),
    descricao: v.optional(v.string()),
    categoria: supplyCategoryValidator,
    unidade_medida: v.optional(v.string()),
    valor_padrao: v.number(),
  },
  returns: v.id("supplies"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "supplies.manage");

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do insumo obrigatório.");
    }
    assertValidValor(args.valor_padrao);

    const existing = (await ctx.db.query("supplies").collect()).find(
      (supply) => supply.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (existing) {
      throw conflict("Já existe um insumo com este nome.");
    }

    const now = Date.now();
    const supplyId = await ctx.db.insert("supplies", {
      nome,
      descricao: args.descricao?.trim() || undefined,
      categoria: args.categoria,
      unidade_medida: args.unidade_medida?.trim() || undefined,
      valor_padrao: args.valor_padrao,
      ativo: true,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "supplies.create",
      entityType: "supply",
      entityId: supplyId,
      summary: `Insumo criado: ${nome}`,
    });

    return supplyId;
  },
});

export const update = mutation({
  args: {
    supplyId: v.id("supplies"),
    nome: v.string(),
    descricao: v.optional(v.string()),
    categoria: supplyCategoryValidator,
    unidade_medida: v.optional(v.string()),
    valor_padrao: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "supplies.manage");

    const supply = await ctx.db.get("supplies", args.supplyId);
    if (!supply) {
      throw notFound("Insumo");
    }

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do insumo obrigatório.");
    }
    assertValidValor(args.valor_padrao);

    const duplicate = (await ctx.db.query("supplies").collect()).find(
      (item) => item._id !== args.supplyId && item.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (duplicate) {
      throw conflict("Já existe um insumo com este nome.");
    }

    await ctx.db.patch(args.supplyId, {
      nome,
      descricao: args.descricao?.trim() || undefined,
      categoria: args.categoria,
      unidade_medida: args.unidade_medida?.trim() || undefined,
      valor_padrao: args.valor_padrao,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "supplies.update",
      entityType: "supply",
      entityId: args.supplyId,
      summary: `Insumo atualizado: ${nome}`,
    });

    return null;
  },
});

export const setActive = mutation({
  args: {
    supplyId: v.id("supplies"),
    ativo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "supplies.manage");

    const supply = await ctx.db.get("supplies", args.supplyId);
    if (!supply) {
      throw notFound("Insumo");
    }

    if (supply.ativo === args.ativo) {
      return null;
    }

    await ctx.db.patch(args.supplyId, {
      ativo: args.ativo,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: args.ativo ? "supplies.activate" : "supplies.deactivate",
      entityType: "supply",
      entityId: args.supplyId,
      summary: `${args.ativo ? "Insumo ativado" : "Insumo desativado"}: ${supply.nome}`,
    });

    return null;
  },
});
