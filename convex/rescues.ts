import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { recordAudit } from "./audit";
import { rescueStatusValidator, severityValidator } from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { fanOutNotification } from "./lib/notifications";
import { validateImageStorage } from "./lib/storage";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const SEVERITY_RANK: Record<string, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
  info: 0,
};

const rescueSummaryValidator = v.object({
  _id: v.id("rescue_requests"),
  tipo: v.string(),
  gravidade: severityValidator,
  descricao_solicitante: v.string(),
  status: rescueStatusValidator,
  bairro_id: v.optional(v.id("bairros")),
  bairro_nome: v.union(v.string(), v.null()),
  dog_id: v.optional(v.id("dogs")),
  dog_nome: v.optional(v.string()),
  solicitante_id: v.optional(v.id("people")),
  solicitante_nome: v.optional(v.string()),
  criado_em: v.number(),
});

const rescueDetailValidator = rescueSummaryValidator.extend({
  local_descricao: v.optional(v.string()),
  descricao_ong: v.optional(v.string()),
  fotos_urls: v.array(v.string()),
  criado_por: v.id("users"),
  atualizado_em: v.optional(v.number()),
});

async function enrichRescue(ctx: Pick<QueryCtx, "db">, rescue: Doc<"rescue_requests">) {
  const [bairro, dog, solicitante] = await Promise.all([
    rescue.bairro_id ? ctx.db.get("bairros", rescue.bairro_id) : null,
    rescue.dog_id ? ctx.db.get("dogs", rescue.dog_id) : null,
    rescue.solicitante_id ? ctx.db.get("people", rescue.solicitante_id) : null,
  ]);

  return {
    _id: rescue._id,
    tipo: rescue.tipo,
    gravidade: rescue.gravidade,
    descricao_solicitante: rescue.descricao_solicitante,
    status: rescue.status,
    bairro_id: rescue.bairro_id,
    bairro_nome: bairro?.nome ?? null,
    dog_id: rescue.dog_id,
    dog_nome: dog?.nome,
    solicitante_id: rescue.solicitante_id,
    solicitante_nome: solicitante?.nome_completo,
    criado_em: rescue.criado_em,
  };
}

export const create = mutation({
  args: {
    solicitante_id: v.optional(v.id("people")),
    tipo: v.string(),
    gravidade: severityValidator,
    descricao_solicitante: v.string(),
    bairro_id: v.optional(v.id("bairros")),
    local_descricao: v.optional(v.string()),
    dog_id: v.optional(v.id("dogs")),
    photo_storage_ids: v.array(v.id("_storage")),
  },
  returns: v.id("rescue_requests"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "rescues.create");

    const tipo = args.tipo.trim();
    if (!tipo) {
      throw validationError("Tipo de resgate obrigatório.");
    }

    const descricao = args.descricao_solicitante.trim();
    if (!descricao) {
      throw validationError("Descrição obrigatória.");
    }

    if (args.bairro_id) {
      const bairro = await ctx.db.get("bairros", args.bairro_id);
      if (!bairro?.ativo) {
        throw validationError("Bairro inválido ou inativo.");
      }
    }

    if (args.dog_id) {
      const dog = await ctx.db.get("dogs", args.dog_id);
      if (!dog) {
        throw notFound("Cão");
      }
    }

    if (args.solicitante_id) {
      const solicitante = await ctx.db.get("people", args.solicitante_id);
      if (!solicitante) {
        throw notFound("Pessoa");
      }
    }

    for (const storageId of args.photo_storage_ids) {
      await validateImageStorage(ctx, storageId);
    }

    const now = Date.now();
    const rescueId = await ctx.db.insert("rescue_requests", {
      solicitante_id: args.solicitante_id,
      tipo,
      gravidade: args.gravidade,
      descricao_solicitante: descricao,
      bairro_id: args.bairro_id,
      local_descricao: args.local_descricao?.trim() || undefined,
      status: "aberta",
      dog_id: args.dog_id,
      fotos: args.photo_storage_ids,
      criado_por: actor._id,
      criado_em: now,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "rescues.create",
      entityType: "rescue_request",
      entityId: rescueId,
      summary: `Solicitação de resgate registrada: ${tipo}`,
      metadata: { gravidade: args.gravidade },
    });

    if (args.gravidade === "alta") {
      await fanOutNotification(ctx, {
        organizacao: actor.organizacao,
        shouldNotify: (user) =>
          hasPermission(user.permissions, "rescues.manage") &&
          user.receber_alertas_resgate !== false,
        tipo: "rescue_alert",
        titulo: "Alerta de resgate urgente",
        mensagem: `${actor.nome} registrou um resgate de gravidade alta: ${tipo}.`,
        entidade_tipo: "rescue_request",
        entidade_id: rescueId,
      });
    }

    return rescueId;
  },
});

export const updateStatus = mutation({
  args: {
    rescueId: v.id("rescue_requests"),
    status: rescueStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "rescues.manage");

    const rescue = await ctx.db.get("rescue_requests", args.rescueId);
    if (!rescue) {
      throw notFound("Solicitação de resgate");
    }

    if (rescue.status === args.status) {
      return null;
    }

    await ctx.db.patch(args.rescueId, {
      status: args.status,
      atualizado_em: Date.now(),
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "rescues.update_status",
      entityType: "rescue_request",
      entityId: args.rescueId,
      summary: `Status do resgate alterado para ${args.status}`,
      metadata: { status_anterior: rescue.status, status_novo: args.status },
    });

    return null;
  },
});

export const setOngDescription = mutation({
  args: {
    rescueId: v.id("rescue_requests"),
    descricao_ong: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "rescues.manage");

    const rescue = await ctx.db.get("rescue_requests", args.rescueId);
    if (!rescue) {
      throw notFound("Solicitação de resgate");
    }

    const descricao = args.descricao_ong.trim();
    if (!descricao) {
      throw validationError("Descrição obrigatória.");
    }

    await ctx.db.patch(args.rescueId, {
      descricao_ong: descricao,
      atualizado_em: Date.now(),
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "rescues.set_ong_description",
      entityType: "rescue_request",
      entityId: args.rescueId,
      summary: "Descrição da ONG registrada para o resgate",
    });

    return null;
  },
});

export const list = query({
  args: {
    status: v.optional(rescueStatusValidator),
  },
  returns: v.array(rescueSummaryValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "rescues.read")) {
      throw forbidden();
    }

    const status = args.status;
    const rescues = status
      ? await ctx.db
          .query("rescue_requests")
          .withIndex("by_status", (q) => q.eq("status", status))
          .collect()
      : await ctx.db.query("rescue_requests").collect();

    const sorted = [...rescues].sort((left, right) => {
      const gravityDiff = SEVERITY_RANK[right.gravidade] - SEVERITY_RANK[left.gravidade];
      if (gravityDiff !== 0) {
        return gravityDiff;
      }
      return right.criado_em - left.criado_em;
    });

    return await Promise.all(sorted.map((rescue) => enrichRescue(ctx, rescue)));
  },
});

export const get = query({
  args: {
    rescueId: v.id("rescue_requests"),
  },
  returns: v.union(rescueDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "rescues.read")) {
      throw forbidden();
    }

    const rescue = await ctx.db.get("rescue_requests", args.rescueId);
    if (!rescue) {
      return null;
    }

    const summary = await enrichRescue(ctx, rescue);
    const fotosUrls = (
      await Promise.all(rescue.fotos.map((storageId) => ctx.storage.getUrl(storageId)))
    ).filter((url): url is string => url !== null);

    return {
      ...summary,
      local_descricao: rescue.local_descricao,
      descricao_ong: rescue.descricao_ong,
      fotos_urls: fotosUrls,
      criado_por: rescue.criado_por,
      atualizado_em: rescue.atualizado_em,
    };
  },
});
