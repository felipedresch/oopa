import { v } from "convex/values";

import { recordAudit } from "./audit";
import { severityValidator } from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import {
  buildPersonAssessment,
  computeBairroWarning,
  createOccurrenceWithHistory,
  validateAdoptionPayload,
  type AdoptionPayloadInput,
} from "./lib/adoptions";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { validatePdfStorage } from "./lib/storage";
import { hasPermission } from "./permissions";
import { mutation, query } from "./_generated/server";

const personAlertOccurrenceValidator = v.object({
  _id: v.id("occurrences"),
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  dog_nome: v.string(),
});

const personAssessmentValidator = v.object({
  pessoa_nome: v.string(),
  bairro_nome: v.union(v.string(), v.null()),
  alert: v.optional(
    v.object({
      level: v.union(v.literal("none"), v.literal("yellow"), v.literal("red")),
      alta_count: v.number(),
      media_count: v.number(),
      occurrences: v.array(personAlertOccurrenceValidator),
    }),
  ),
});

const evaluatePersonValidator = v.object({
  pessoa: personAssessmentValidator,
  bairro_warning: v.object({
    has_warning: v.boolean(),
    message: v.union(v.string(), v.null()),
    bairro_nome: v.union(v.string(), v.null()),
  }),
});

const ongStaffValidator = v.object({
  _id: v.id("users"),
  nome: v.string(),
  email: v.union(v.string(), v.null()),
});

export const listOngStaff = query({
  args: {},
  returns: v.array(ongStaffValidator),
  handler: async (ctx) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "occurrences.create_adocao")) {
      throw forbidden();
    }

    const users = await ctx.db.query("users").withIndex("by_active", (q) => q.eq("ativo", true)).take(200);
    return users
      .filter((user) => user.ativo && user.organizacao === actor.organizacao)
      .sort((left, right) => left.nome.localeCompare(right.nome, "pt-BR"))
      .map((user) => ({
        _id: user._id,
        nome: user.nome,
        email: user.email ?? null,
      }));
  },
});

export const evaluatePerson = query({
  args: {
    dogId: v.id("dogs"),
    personId: v.id("people"),
  },
  returns: evaluatePersonValidator,
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }
    if (!hasPermission(actor.permissions, "people.read")) {
      throw forbidden();
    }

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cão");
    }

    const person = await ctx.db.get("people", args.personId);
    if (!person) {
      throw notFound("Pessoa");
    }

    const assessment = await buildPersonAssessment(ctx, args.personId, actor.permissions);
    const bairroWarning = await computeBairroWarning(ctx, args.dogId, args.personId);

    return {
      pessoa: assessment,
      bairro_warning: bairroWarning,
    };
  },
});

export const create = mutation({
  args: {
    dogId: v.id("dogs"),
    personId: v.id("people"),
    data_adocao: v.number(),
    numero_termo_adocao: v.string(),
    responsavel_ong_user_id: v.id("users"),
    condicoes_adocao: v.string(),
    observacoes_adocao: v.optional(v.string()),
    confirmou_documentos: v.boolean(),
    confirmou_orientacoes: v.boolean(),
    termo_adocao_storage_id: v.optional(v.id("_storage")),
    descricao: v.optional(v.string()),
    photo_storage_ids: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "occurrences.create_adocao");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cão");
    }

    const person = await ctx.db.get("people", args.personId);
    if (!person) {
      throw notFound("Pessoa");
    }

    const responsavel = await ctx.db.get("users", args.responsavel_ong_user_id);
    if (!responsavel?.ativo) {
      throw validationError("Responsavel ONG inválido.");
    }

    if (args.termo_adocao_storage_id) {
      await validatePdfStorage(ctx, args.termo_adocao_storage_id);
    }

    const payload: AdoptionPayloadInput = {
      data_adocao: args.data_adocao,
      numero_termo_adocao: args.numero_termo_adocao,
      responsavel_ong_user_id: args.responsavel_ong_user_id,
      condicoes_adocao: args.condicoes_adocao,
      observacoes_adocao: args.observacoes_adocao,
      confirmou_documentos: args.confirmou_documentos,
      confirmou_orientacoes: args.confirmou_orientacoes,
      termo_adocao_storage_id: args.termo_adocao_storage_id,
    };
    validateAdoptionPayload(payload);

    const adoptionPayload = {
      ...payload,
      observacoes_adocao: payload.observacoes_adocao?.trim() || undefined,
      numero_termo_adocao: payload.numero_termo_adocao.trim(),
      condicoes_adocao: payload.condicoes_adocao.trim(),
    };

    const occurrenceId = await createOccurrenceWithHistory(ctx, actor, {
      dog,
      typeName: "Adoção",
      descricao: args.descricao?.trim() || `Adoção: termo ${adoptionPayload.numero_termo_adocao}`,
      data_ocorrencia: args.data_adocao,
      new_pessoa_id: args.personId,
      adoption_payload: adoptionPayload,
      photo_storage_ids: args.photo_storage_ids ?? [],
      atribuivel_a_pessoa: false,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "adoptions.create",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: `Adoção registrada: ${dog.nome} para ${person.nome_completo}`,
      metadata: {
        dog_id: args.dogId,
        pessoa_id: args.personId,
        termo_adocao_anexado: Boolean(args.termo_adocao_storage_id),
      },
    });

    return occurrenceId;
  },
});

export const returnToOng = mutation({
  args: {
    dogId: v.id("dogs"),
    descricao: v.string(),
    data_ocorrencia: v.optional(v.number()),
    photo_storage_ids: v.array(v.id("_storage")),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "occurrences.create_adocao");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cão");
    }

    if (!dog.pessoa_atual_id) {
      throw validationError("Cão não possui tutor atual para devolução.");
    }

    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Motivo da devolução obrigatório.");
    }

    const occurredAt = args.data_ocorrencia ?? Date.now();
    const occurrenceId = await createOccurrenceWithHistory(ctx, actor, {
      dog,
      typeName: "Devolução a ONG",
      descricao,
      data_ocorrencia: occurredAt,
      photo_storage_ids: args.photo_storage_ids,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "adoptions.returnToOng",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: `Devolução a ONG: ${dog.nome}`,
      metadata: { dog_id: args.dogId },
    });

    return occurrenceId;
  },
});

export const transferTutor = mutation({
  args: {
    dogId: v.id("dogs"),
    newPersonId: v.id("people"),
    descricao: v.string(),
    data_ocorrencia: v.optional(v.number()),
    photo_storage_ids: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "occurrences.create_adocao");

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cão");
    }

    if (!dog.pessoa_atual_id) {
      throw validationError("Cão não possui tutor atual para transferencia.");
    }

    const newPerson = await ctx.db.get("people", args.newPersonId);
    if (!newPerson) {
      throw notFound("Pessoa");
    }

    if (dog.pessoa_atual_id === args.newPersonId) {
      throw validationError("O tutor de destino deve ser diferente do tutor atual.");
    }

    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Descrição da transferencia obrigatória.");
    }

    const occurredAt = args.data_ocorrencia ?? Date.now();
    const occurrenceId = await createOccurrenceWithHistory(ctx, actor, {
      dog,
      typeName: "Transferência de Tutor",
      descricao,
      data_ocorrencia: occurredAt,
      new_pessoa_id: args.newPersonId,
      photo_storage_ids: args.photo_storage_ids ?? [],
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "adoptions.transferTutor",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: `Transferencia de tutor: ${dog.nome} para ${newPerson.nome_completo}`,
      metadata: { dog_id: args.dogId, pessoa_id: args.newPersonId },
    });

    return occurrenceId;
  },
});
