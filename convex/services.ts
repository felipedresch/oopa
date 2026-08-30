import { v } from "convex/values";

import { recordAudit } from "./audit";
import { serviceCategoryValidator } from "./domainValidators";
import { conflict, forbidden, notFound, validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const serviceValidator = v.object({
  _id: v.id("services"),
  nome: v.string(),
  descricao: v.optional(v.string()),
  categoria: serviceCategoryValidator,
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
  returns: v.array(serviceValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "services.manage")) {
      throw forbidden();
    }

    const search = args.search?.trim().toLowerCase();
    const services = await ctx.db.query("services").collect();

    return services
      .filter((service) => {
        if (args.ativo !== undefined && service.ativo !== args.ativo) {
          return false;
        }
        if (search && !service.nome.toLowerCase().includes(search)) {
          return false;
        }
        return true;
      })
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((service) => ({
        _id: service._id,
        nome: service.nome,
        descricao: service.descricao,
        categoria: service.categoria,
        valor_padrao: service.valor_padrao,
        ativo: service.ativo,
        criado_em: service.criado_em,
        atualizado_em: service.atualizado_em,
      }));
  },
});

export const create = mutation({
  args: {
    nome: v.string(),
    descricao: v.optional(v.string()),
    categoria: serviceCategoryValidator,
    valor_padrao: v.number(),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "services.manage");

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do serviço obrigatório.");
    }
    assertValidValor(args.valor_padrao);

    const existing = (await ctx.db.query("services").collect()).find(
      (service) => service.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (existing) {
      throw conflict("Já existe um serviço com este nome.");
    }

    const now = Date.now();
    const serviceId = await ctx.db.insert("services", {
      nome,
      descricao: args.descricao?.trim() || undefined,
      categoria: args.categoria,
      valor_padrao: args.valor_padrao,
      ativo: true,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "services.create",
      entityType: "service",
      entityId: serviceId,
      summary: `Serviço criado: ${nome}`,
    });

    return serviceId;
  },
});

export const update = mutation({
  args: {
    serviceId: v.id("services"),
    nome: v.string(),
    descricao: v.optional(v.string()),
    categoria: serviceCategoryValidator,
    valor_padrao: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "services.manage");

    const service = await ctx.db.get("services", args.serviceId);
    if (!service) {
      throw notFound("Serviço");
    }

    const nome = normalizeNome(args.nome);
    if (!nome) {
      throw validationError("Nome do serviço obrigatório.");
    }
    assertValidValor(args.valor_padrao);

    const duplicate = (await ctx.db.query("services").collect()).find(
      (item) => item._id !== args.serviceId && item.nome.toLowerCase() === nome.toLowerCase(),
    );
    if (duplicate) {
      throw conflict("Já existe um serviço com este nome.");
    }

    await ctx.db.patch(args.serviceId, {
      nome,
      descricao: args.descricao?.trim() || undefined,
      categoria: args.categoria,
      valor_padrao: args.valor_padrao,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "services.update",
      entityType: "service",
      entityId: args.serviceId,
      summary: `Serviço atualizado: ${nome}`,
    });

    return null;
  },
});

export const setActive = mutation({
  args: {
    serviceId: v.id("services"),
    ativo: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "services.manage");

    const service = await ctx.db.get("services", args.serviceId);
    if (!service) {
      throw notFound("Serviço");
    }

    if (service.ativo === args.ativo) {
      return null;
    }

    await ctx.db.patch(args.serviceId, {
      ativo: args.ativo,
      atualizado_em: Date.now(),
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: args.ativo ? "services.activate" : "services.deactivate",
      entityType: "service",
      entityId: args.serviceId,
      summary: `${args.ativo ? "Serviço ativado" : "Serviço desativado"}: ${service.nome}`,
    });

    return null;
  },
});
