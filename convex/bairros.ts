import { v } from "convex/values";

import { recordAudit } from "./audit";
import { forbidden, notFound, validationError, conflict } from "./errors";
import { getCurrentUser, requirePermission, requireAnyPermission } from "./lib/auth";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const bairroSummaryValidator = v.object({
  _id: v.id("bairros"),
  nome: v.string(),
  ativo: v.boolean(),
  criado_em: v.number(),
  atualizado_em: v.optional(v.number()),
});

const bairroOptionValidator = v.object({
  _id: v.id("bairros"),
  nome: v.string(),
});

function normalizeNome(nome: string): string {
  return nome.trim().replace(/\s+/g, " ");
}

function matchesPrefix(nome: string, prefix: string): boolean {
  return nome.toLowerCase().startsWith(prefix.toLowerCase());
}

export const list = query({
  args: {
    search: v.optional(v.string()),
    ativo: v.optional(v.boolean()),
  },
  returns: v.array(bairroSummaryValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "bairros.manage")) {
      throw forbidden();
    }

    const search = args.search?.trim().toLowerCase();
    const bairros = await ctx.db.query("bairros").collect();

    return bairros
      .filter((bairro) => {
        if (args.ativo !== undefined && bairro.ativo !== args.ativo) {
          return false;
        }
        if (search && !bairro.nome.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((bairro) => ({
        _id: bairro._id,
        nome: bairro.nome,
        ativo: bairro.ativo,
        criado_em: bairro.criado_em,
        atualizado_em: bairro.atualizado_em,
      }));
  },
});

export const search = query({
  args: {
    prefix: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  returns: v.array(bairroOptionValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requireAnyPermission(actor, [
      "tutors.read",
      "tutors.create",
      "tutors.edit",
      "bairros.manage",
    ]);

    const prefix = args.prefix?.trim() ?? "";
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 50);
    const bairros = await ctx.db.query("bairros").collect();

    return bairros
      .filter((bairro) => bairro.ativo && (prefix === "" || matchesPrefix(bairro.nome, prefix)))
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .slice(0, limit)
      .map((bairro) => ({
        _id: bairro._id,
        nome: bairro.nome,
      }));
  },
});

export const create = mutation({
  args: {
    nome: v.string(),
  },
  returns: v.id("bairros"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "bairros.manage");

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do bairro obrigatorio.");
    }

    const existing = await ctx.db
      .query("bairros")
      .withIndex("by_nome", (q) => q.eq("nome", nome))
      .unique();
    if (existing) {
      throw conflict("Ja existe um bairro com este nome.");
    }

    const now = Date.now();
    const bairroId = await ctx.db.insert("bairros", {
      nome,
      ativo: true,
      criado_em: now,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "bairros.create",
      entityType: "bairro",
      entityId: bairroId,
      summary: `Bairro criado: ${nome}`,
    });

    return bairroId;
  },
});

export const setActive = mutation({
  args: {
    bairroId: v.id("bairros"),
    ativo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "bairros.manage");

    const bairro = await ctx.db.get("bairros", args.bairroId);
    if (!bairro) {
      throw notFound("Bairro");
    }

    if (bairro.ativo === args.ativo) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.bairroId, {
      ativo: args.ativo,
      atualizado_em: now,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: args.ativo ? "bairros.activate" : "bairros.deactivate",
      entityType: "bairro",
      entityId: args.bairroId,
      summary: `${args.ativo ? "Bairro ativado" : "Bairro desativado"}: ${bairro.nome}`,
    });

    return null;
  },
});
