import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { recordAudit } from "./audit";
import {
  occurrenceCategoryValidator,
  severityValidator,
  tutorSnapshotValidator,
} from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import { getCurrentUser } from "./lib/auth";
import type { MutationCtx } from "./_generated/server";
import {
  buildTutorSnapshot,
  canCreateOccurrenceCategory,
  canReadOccurrenceCategory,
  defaultAtribuivelForCategory,
  getOccurrenceTypeByName,
  HISTORY_AFFECTING_TYPE_NAMES,
  isSensitiveCategory,
  loadOccurrenceWithType,
  resolveSeverity,
  type OccurrenceCategory,
} from "./lib/occurrences";
import { notifyLegalOccurrence } from "./lib/notifications";
import { normalizePaginationOpts } from "./lib/pagination";
import { filterTutorSnapshotForViewer } from "./lib/tutors";
import { applyHistoryForOccurrence } from "./lib/tutorDogHistory";
import { validateImageStorage } from "./lib/storage";
import { mutation, query } from "./_generated/server";

const occurrencePhotoValidator = v.object({
  _id: v.id("occurrence_photos"),
  storage_id: v.id("_storage"),
  url: v.union(v.string(), v.null()),
  descricao: v.optional(v.string()),
  criado_em: v.number(),
});

const occurrenceSummaryValidator = v.object({
  _id: v.id("occurrences"),
  dog_id: v.id("dogs"),
  occurrence_type_id: v.id("occurrence_types"),
  type_nome: v.string(),
  categoria: occurrenceCategoryValidator,
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  atribuivel_ao_tutor: v.boolean(),
  original_id: v.optional(v.id("occurrences")),
  bairro_nome: v.union(v.string(), v.null()),
});

const occurrenceDetailValidator = v.object({
  _id: v.id("occurrences"),
  dog_id: v.id("dogs"),
  dog_nome: v.string(),
  occurrence_type_id: v.id("occurrence_types"),
  type_nome: v.string(),
  categoria: occurrenceCategoryValidator,
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  atribuivel_ao_tutor: v.boolean(),
  bairro_id: v.optional(v.id("bairros")),
  bairro_nome: v.union(v.string(), v.null()),
  local_descricao: v.optional(v.string()),
  tutor_id: v.optional(v.id("tutors")),
  tutor_snapshot: v.optional(tutorSnapshotValidator),
  original_id: v.optional(v.id("occurrences")),
  original_summary: v.optional(v.string()),
  registrado_por: v.id("users"),
  criado_em: v.number(),
  photos: v.array(occurrencePhotoValidator),
  can_rectify: v.boolean(),
});

function assertCanReadOccurrence(
  category: OccurrenceCategory,
  permissions: readonly string[],
): void {
  if (!canReadOccurrenceCategory(permissions, category)) {
    throw forbidden();
  }
}

async function insertOccurrencePhotos(
  ctx: MutationCtx,
  occurrenceId: Id<"occurrences">,
  storageIds: Id<"_storage">[],
  actorId: Id<"users">,
): Promise<void> {
  for (const storageId of storageIds) {
    await validateImageStorage(ctx, storageId);
    await ctx.db.insert("occurrence_photos", {
      occurrence_id: occurrenceId,
      storage_id: storageId,
      criado_em: Date.now(),
      criado_por: actorId,
    });

    await recordAudit(ctx, {
      actorUserId: actorId,
      action: "occurrence_photos.add",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: "Foto adicionada a ocorrencia",
    });
  }
}

export const create = mutation({
  args: {
    dogId: v.id("dogs"),
    occurrenceTypeId: v.id("occurrence_types"),
    descricao: v.string(),
    data_ocorrencia: v.number(),
    bairro_id: v.optional(v.id("bairros")),
    local_descricao: v.optional(v.string()),
    gravidade: v.optional(severityValidator),
    atribuivel_ao_tutor: v.optional(v.boolean()),
    photo_storage_ids: v.array(v.id("_storage")),
    new_tutor_id: v.optional(v.id("tutors")),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    const type = await ctx.db.get("occurrence_types", args.occurrenceTypeId);
    if (!type || !type.ativo) {
      throw notFound("Tipo de ocorrencia");
    }

    if (type.nome === "Correcao/Retificacao") {
      throw validationError("Use a acao de retificacao para corrigir ocorrencias.");
    }

    const category = type.categoria;
    if (!canCreateOccurrenceCategory(actor.permissions, category)) {
      throw forbidden();
    }

    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Descricao obrigatoria.");
    }

    if (type.requer_foto && args.photo_storage_ids.length === 0) {
      throw validationError("Este tipo exige pelo menos uma foto.");
    }

    const gravidade = resolveSeverity(type.gravidade_padrao, args.gravidade);
    const atribuivel =
      args.atribuivel_ao_tutor ?? defaultAtribuivelForCategory(category);

    let tutorId = dog.tutor_atual_id;
    let tutorSnapshot: Awaited<ReturnType<typeof buildTutorSnapshot>> | undefined;

    if (type.nome === "Adocao" || type.nome === "Transferencia de Tutor") {
      if (!args.new_tutor_id) {
        throw validationError("Informe o tutor de destino.");
      }
      tutorId = args.new_tutor_id;
      tutorSnapshot = await buildTutorSnapshot(ctx, args.new_tutor_id);
    } else if (tutorId) {
      tutorSnapshot = await buildTutorSnapshot(ctx, tutorId);
    }

    if (args.bairro_id) {
      const bairro = await ctx.db.get("bairros", args.bairro_id);
      if (!bairro?.ativo) {
        throw validationError("Bairro invalido ou inativo.");
      }
    }

    const now = Date.now();
    const occurrenceId = await ctx.db.insert("occurrences", {
      dog_id: args.dogId,
      tutor_id: tutorId,
      tutor_snapshot: tutorSnapshot,
      atribuivel_ao_tutor: atribuivel,
      occurrence_type_id: args.occurrenceTypeId,
      gravidade,
      data_ocorrencia: args.data_ocorrencia,
      bairro_id: args.bairro_id,
      local_descricao: args.local_descricao?.trim() || undefined,
      descricao,
      registrado_por: actor._id,
      criado_em: now,
    });

    if (args.photo_storage_ids.length > 0) {
      await insertOccurrencePhotos(ctx, occurrenceId, args.photo_storage_ids, actor._id);
    }

    if (HISTORY_AFFECTING_TYPE_NAMES.has(type.nome)) {
      await applyHistoryForOccurrence(ctx, {
        dog,
        occurrenceId,
        typeName: type.nome,
        occurredAt: args.data_ocorrencia,
        newTutorId: args.new_tutor_id,
      });
    }

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "occurrences.create",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: `Ocorrencia criada: ${type.nome} para ${dog.nome}`,
      metadata: { categoria: category, gravidade, atribuivel },
    });

    if (category === "legal") {
      await notifyLegalOccurrence(ctx, {
        organizacao: actor.organizacao,
        occurrenceId,
        dogNome: dog.nome,
        typeNome: type.nome,
        actorNome: actor.nome,
      });
    }

    return occurrenceId;
  },
});

export const rectify = mutation({
  args: {
    originalId: v.id("occurrences"),
    descricao: v.string(),
    data_ocorrencia: v.optional(v.number()),
    photo_storage_ids: v.optional(v.array(v.id("_storage"))),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    if (!canCreateOccurrenceCategory(actor.permissions, "outro")) {
      throw forbidden();
    }

    const original = await loadOccurrenceWithType(ctx, args.originalId);
    if (!original) {
      throw notFound("Ocorrencia");
    }

    assertCanReadOccurrence(original.type.categoria, actor.permissions);

    const rectificationType = await getOccurrenceTypeByName(ctx, "Correcao/Retificacao");
    if (!rectificationType?.ativo) {
      throw notFound("Tipo de ocorrencia");
    }

    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Descricao da retificacao obrigatoria.");
    }

    const dog = await ctx.db.get("dogs", original.dog_id);
    if (!dog) {
      throw notFound("Cao");
    }

    const now = Date.now();
    const occurrenceId = await ctx.db.insert("occurrences", {
      dog_id: original.dog_id,
      tutor_id: original.tutor_id,
      tutor_snapshot: original.tutor_snapshot,
      atribuivel_ao_tutor: false,
      occurrence_type_id: rectificationType._id,
      gravidade: rectificationType.gravidade_padrao,
      data_ocorrencia: args.data_ocorrencia ?? now,
      bairro_id: original.bairro_id,
      local_descricao: original.local_descricao,
      descricao,
      registrado_por: actor._id,
      original_id: args.originalId,
      criado_em: now,
    });

    const photos = args.photo_storage_ids ?? [];
    if (photos.length > 0) {
      await insertOccurrencePhotos(ctx, occurrenceId, photos, actor._id);
    }

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "occurrences.rectify",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: `Retificacao registrada para ocorrencia ${args.originalId}`,
      metadata: { original_id: args.originalId },
    });

    return occurrenceId;
  },
});

export const get = query({
  args: {
    occurrenceId: v.id("occurrences"),
  },
  returns: v.union(occurrenceDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    const loaded = await loadOccurrenceWithType(ctx, args.occurrenceId);
    if (!loaded) {
      return null;
    }

    assertCanReadOccurrence(loaded.type.categoria, actor.permissions);

    const dog = await ctx.db.get("dogs", loaded.dog_id);
    const bairro = loaded.bairro_id ? await ctx.db.get("bairros", loaded.bairro_id) : null;
    const photos = await ctx.db
      .query("occurrence_photos")
      .withIndex("by_occurrence", (q) => q.eq("occurrence_id", args.occurrenceId))
      .collect();

    const enrichedPhotos = await Promise.all(
      photos.map(async (photo) => ({
        _id: photo._id,
        storage_id: photo.storage_id,
        url: await ctx.storage.getUrl(photo.storage_id),
        descricao: photo.descricao,
        criado_em: photo.criado_em,
      })),
    );

    let original_summary: string | undefined;
    if (loaded.original_id) {
      const original = await ctx.db.get("occurrences", loaded.original_id);
      if (original) {
        original_summary = original.descricao.slice(0, 120);
      }
    }

    const can_rectify =
      loaded.type.nome !== "Correcao/Retificacao" &&
      canCreateOccurrenceCategory(actor.permissions, "outro");

    return {
      _id: loaded._id,
      dog_id: loaded.dog_id,
      dog_nome: dog?.nome ?? "Cao removido",
      occurrence_type_id: loaded.occurrence_type_id,
      type_nome: loaded.type.nome,
      categoria: loaded.type.categoria,
      gravidade: loaded.gravidade,
      data_ocorrencia: loaded.data_ocorrencia,
      descricao: loaded.descricao,
      atribuivel_ao_tutor: loaded.atribuivel_ao_tutor,
      bairro_id: loaded.bairro_id,
      bairro_nome: bairro?.nome ?? null,
      local_descricao: loaded.local_descricao,
      tutor_id: loaded.tutor_id,
      tutor_snapshot: filterTutorSnapshotForViewer(
        loaded.tutor_snapshot,
        actor.permissions,
      ),
      original_id: loaded.original_id,
      original_summary,
      registrado_por: loaded.registrado_por,
      criado_em: loaded.criado_em,
      photos: enrichedPhotos,
      can_rectify,
    };
  },
});

export const listByDog = query({
  args: {
    dogId: v.id("dogs"),
    paginationOpts: paginationOptsValidator,
    gravidade: v.optional(severityValidator),
    categoria: v.optional(occurrenceCategoryValidator),
    bairro_id: v.optional(v.id("bairros")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.object({
    page: v.array(occurrenceSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    const paginationOpts = normalizePaginationOpts(args.paginationOpts);
    const result = await ctx.db
      .query("occurrences")
      .withIndex("by_dog", (q) => q.eq("dog_id", args.dogId))
      .order("desc")
      .paginate(paginationOpts);

    const summaries = (
      await Promise.all(
        result.page.map(async (occurrence) => {
          const type = await ctx.db.get("occurrence_types", occurrence.occurrence_type_id);
          if (!type) {
            return null;
          }

          const category = type.categoria;
          if (!canReadOccurrenceCategory(actor.permissions, category)) {
            return null;
          }

          if (args.gravidade && occurrence.gravidade !== args.gravidade) {
            return null;
          }
          if (args.categoria && type.categoria !== args.categoria) {
            return null;
          }
          if (args.bairro_id && occurrence.bairro_id !== args.bairro_id) {
            return null;
          }
          if (args.from && occurrence.data_ocorrencia < args.from) {
            return null;
          }
          if (args.to && occurrence.data_ocorrencia > args.to) {
            return null;
          }

          const bairro = occurrence.bairro_id
            ? await ctx.db.get("bairros", occurrence.bairro_id)
            : null;

          return {
            _id: occurrence._id,
            dog_id: occurrence.dog_id,
            occurrence_type_id: occurrence.occurrence_type_id,
            type_nome: type.nome,
            categoria: type.categoria,
            gravidade: occurrence.gravidade,
            data_ocorrencia: occurrence.data_ocorrencia,
            descricao: occurrence.descricao,
            atribuivel_ao_tutor: occurrence.atribuivel_ao_tutor,
            original_id: occurrence.original_id,
            bairro_nome: bairro?.nome ?? null,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      page: summaries,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const listByTutor = query({
  args: {
    tutorId: v.id("tutors"),
    gravidade: v.optional(severityValidator),
    occurrence_type_id: v.optional(v.id("occurrence_types")),
    bairro_id: v.optional(v.id("bairros")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.array(occurrenceSummaryValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    const tutor = await ctx.db.get("tutors", args.tutorId);
    if (!tutor) {
      throw notFound("Tutor");
    }

    const occurrences = await ctx.db
      .query("occurrences")
      .withIndex("by_tutor", (q) => q.eq("tutor_id", args.tutorId))
      .order("desc")
      .collect();

    const summaries = (
      await Promise.all(
        occurrences.map(async (occurrence) => {
          const type = await ctx.db.get("occurrence_types", occurrence.occurrence_type_id);
          if (!type) {
            return null;
          }

          const category = type.categoria;
          if (!canReadOccurrenceCategory(actor.permissions, category)) {
            return null;
          }

          if (args.gravidade && occurrence.gravidade !== args.gravidade) {
            return null;
          }
          if (args.occurrence_type_id && occurrence.occurrence_type_id !== args.occurrence_type_id) {
            return null;
          }
          if (args.bairro_id && occurrence.bairro_id !== args.bairro_id) {
            return null;
          }
          if (args.from && occurrence.data_ocorrencia < args.from) {
            return null;
          }
          if (args.to && occurrence.data_ocorrencia > args.to) {
            return null;
          }

          const bairro = occurrence.bairro_id
            ? await ctx.db.get("bairros", occurrence.bairro_id)
            : null;

          return {
            _id: occurrence._id,
            dog_id: occurrence.dog_id,
            occurrence_type_id: occurrence.occurrence_type_id,
            type_nome: type.nome,
            categoria: type.categoria,
            gravidade: occurrence.gravidade,
            data_ocorrencia: occurrence.data_ocorrencia,
            descricao: occurrence.descricao,
            atribuivel_ao_tutor: occurrence.atribuivel_ao_tutor,
            original_id: occurrence.original_id,
            bairro_nome: bairro?.nome ?? null,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return summaries;
  },
});

export const isSensitiveType = query({
  args: {
    occurrenceTypeId: v.id("occurrence_types"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    await getCurrentUser(ctx);
    const type = await ctx.db.get("occurrence_types", args.occurrenceTypeId);
    if (!type) {
      return false;
    }
    return isSensitiveCategory(type.categoria);
  },
});
