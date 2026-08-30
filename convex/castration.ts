import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { recordAudit } from "./audit";
import { castrationAnimalDescricaoValidator, castrationStatusValidator } from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { normalizePaginationOpts } from "./lib/pagination";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const castrationSummaryValidator = v.object({
  _id: v.id("castration_requests"),
  pessoa_id: v.id("people"),
  pessoa_nome: v.optional(v.string()),
  dog_id: v.optional(v.id("dogs")),
  dog_nome: v.optional(v.string()),
  animal_descricao: castrationAnimalDescricaoValidator,
  data_solicitacao: v.number(),
  data_agendada: v.optional(v.number()),
  status: castrationStatusValidator,
  observacoes: v.optional(v.string()),
});

async function enrichCastration(ctx: Pick<QueryCtx, "db">, request: Doc<"castration_requests">) {
  const [pessoa, dog] = await Promise.all([
    ctx.db.get("people", request.pessoa_id),
    request.dog_id ? ctx.db.get("dogs", request.dog_id) : null,
  ]);

  return {
    _id: request._id,
    pessoa_id: request.pessoa_id,
    pessoa_nome: pessoa?.nome_completo,
    dog_id: request.dog_id,
    dog_nome: dog?.nome,
    animal_descricao: request.animal_descricao,
    data_solicitacao: request.data_solicitacao,
    data_agendada: request.data_agendada,
    status: request.status,
    observacoes: request.observacoes,
  };
}

export const create = mutation({
  args: {
    pessoa_id: v.id("people"),
    animal_descricao: castrationAnimalDescricaoValidator,
    dog_id: v.optional(v.id("dogs")),
    observacoes: v.optional(v.string()),
  },
  returns: v.id("castration_requests"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "castration.create");

    const pessoa = await ctx.db.get("people", args.pessoa_id);
    if (!pessoa) {
      throw notFound("Pessoa");
    }

    if (args.dog_id) {
      const dog = await ctx.db.get("dogs", args.dog_id);
      if (!dog) {
        throw notFound("Cão");
      }
    }

    const now = Date.now();
    const castrationId = await ctx.db.insert("castration_requests", {
      pessoa_id: args.pessoa_id,
      dog_id: args.dog_id,
      animal_descricao: {
        nome: args.animal_descricao.nome?.trim() || undefined,
        especie: args.animal_descricao.especie,
        porte: args.animal_descricao.porte,
        sexo: args.animal_descricao.sexo,
        cor: args.animal_descricao.cor?.trim() || undefined,
      },
      data_solicitacao: now,
      status: "aguardando",
      observacoes: args.observacoes?.trim() || undefined,
      criado_por: actor._id,
      criado_em: now,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "castration.create",
      entityType: "castration_request",
      entityId: castrationId,
      summary: `Solicitação de castração registrada para ${pessoa.nome_completo}`,
    });

    return castrationId;
  },
});

export const updateDataSolicitacao = mutation({
  args: {
    castrationId: v.id("castration_requests"),
    data_solicitacao: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "castration.manage");

    const request = await ctx.db.get("castration_requests", args.castrationId);
    if (!request) {
      throw notFound("Solicitação de castração");
    }

    await ctx.db.patch(args.castrationId, { data_solicitacao: args.data_solicitacao });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "castration.update_data_solicitacao",
      entityType: "castration_request",
      entityId: args.castrationId,
      summary: "Posição na fila de castração reordenada",
      metadata: {
        data_anterior: request.data_solicitacao,
        data_nova: args.data_solicitacao,
      },
    });

    return null;
  },
});

export const updateStatus = mutation({
  args: {
    castrationId: v.id("castration_requests"),
    status: castrationStatusValidator,
    data_agendada: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "castration.manage");

    if (args.status === "realizada") {
      throw validationError("Use a ação de concluir para marcar como realizada.");
    }

    const request = await ctx.db.get("castration_requests", args.castrationId);
    if (!request) {
      throw notFound("Solicitação de castração");
    }

    await ctx.db.patch(args.castrationId, {
      status: args.status,
      data_agendada: args.data_agendada ?? request.data_agendada,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "castration.update_status",
      entityType: "castration_request",
      entityId: args.castrationId,
      summary: `Status da castração alterado para ${args.status}`,
      metadata: { status_anterior: request.status, status_novo: args.status },
    });

    return null;
  },
});

export const markRealizada = mutation({
  args: {
    castrationId: v.id("castration_requests"),
    dogId: v.optional(v.id("dogs")),
  },
  returns: v.id("dogs"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "castration.manage");

    const request = await ctx.db.get("castration_requests", args.castrationId);
    if (!request) {
      throw notFound("Solicitação de castração");
    }
    if (request.status === "realizada") {
      throw validationError("Solicitação já marcada como realizada.");
    }

    let dogId = args.dogId ?? request.dog_id;
    let dogCriado = false;

    if (dogId) {
      const dog = await ctx.db.get("dogs", dogId);
      if (!dog) {
        throw notFound("Cão");
      }
    } else {
      const now = Date.now();
      const nome = request.animal_descricao.nome?.trim() || "Sem nome";
      dogId = await ctx.db.insert("dogs", {
        nome,
        especie: request.animal_descricao.especie,
        sexo: request.animal_descricao.sexo,
        porte: request.animal_descricao.porte,
        cor_pelagem: request.animal_descricao.cor,
        castrado: true,
        vacinas_em_dia: false,
        status_atual: "na_ong",
        pessoa_atual_id: request.pessoa_id,
        observacoes: request.observacoes,
        criado_em: now,
        criado_por: actor._id,
      });
      dogCriado = true;

      await recordAudit(ctx, {
        actorUserId: actor._id,
        action: "dogs.create",
        entityType: "dog",
        entityId: dogId,
        summary: `Animal cadastrado a partir de solicitação de castração: ${nome}`,
      });
    }

    await ctx.db.patch(args.castrationId, {
      status: "realizada",
      dog_id: dogId,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "castration.mark_realizada",
      entityType: "castration_request",
      entityId: args.castrationId,
      summary: "Castração marcada como realizada",
      metadata: { dog_id: dogId, dog_criado: dogCriado },
    });

    return dogId;
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    status: v.optional(castrationStatusValidator),
  },
  returns: v.object({
    page: v.array(castrationSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "castration.read")) {
      throw forbidden();
    }

    const paginationOpts = normalizePaginationOpts(args.paginationOpts);
    const status = args.status;

    const result = await ctx.db
      .query("castration_requests")
      .withIndex("by_data_solicitacao")
      .order("asc")
      .paginate(paginationOpts);

    const filtered = status
      ? result.page.filter((request) => request.status === status)
      : result.page;

    const page = await Promise.all(filtered.map((request) => enrichCastration(ctx, request)));

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const get = query({
  args: {
    castrationId: v.id("castration_requests"),
  },
  returns: v.union(castrationSummaryValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "castration.read")) {
      throw forbidden();
    }

    const request = await ctx.db.get("castration_requests", args.castrationId);
    if (!request) {
      return null;
    }

    return await enrichCastration(ctx, request);
  },
});
