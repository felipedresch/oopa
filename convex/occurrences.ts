import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { recordAudit } from "./audit";
import {
  occurrenceCategoryValidator,
  severityValidator,
  personSnapshotValidator,
} from "./domainValidators";
import { forbidden, notFound, validationError } from "./errors";
import { getCurrentUser } from "./lib/auth";
import type { MutationCtx } from "./_generated/server";
import {
  buildPersonSnapshot,
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
import { filterPersonSnapshotForViewer } from "./lib/people";
import { applyHistoryForOccurrence } from "./lib/personDogHistory";
import { validateImageStorage } from "./lib/storage";
import { mutation, query } from "./_generated/server";

const adoptionPayloadOutputValidator = v.object({
  data_adocao: v.number(),
  numero_termo_adocao: v.string(),
  condicoes_adocao: v.string(),
  observacoes_adocao: v.optional(v.string()),
  termo_adocao_url: v.union(v.string(), v.null()),
});

const occurrencePhotoValidator = v.object({
  _id: v.id("occurrence_photos"),
  storage_id: v.id("_storage"),
  url: v.union(v.string(), v.null()),
  descricao: v.optional(v.string()),
  criado_em: v.number(),
});

const occurrenceSummaryValidator = v.object({
  _id: v.id("occurrences"),
  dog_id: v.optional(v.id("dogs")),
  occurrence_type_id: v.id("occurrence_types"),
  type_nome: v.string(),
  categoria: occurrenceCategoryValidator,
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  atribuivel_a_pessoa: v.boolean(),
  original_id: v.optional(v.id("occurrences")),
  bairro_nome: v.union(v.string(), v.null()),
});

const occurrenceDetailValidator = v.object({
  _id: v.id("occurrences"),
  dog_id: v.optional(v.id("dogs")),
  dog_nome: v.optional(v.string()),
  occurrence_type_id: v.id("occurrence_types"),
  type_nome: v.string(),
  categoria: occurrenceCategoryValidator,
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  atribuivel_a_pessoa: v.boolean(),
  bairro_id: v.optional(v.id("bairros")),
  bairro_nome: v.union(v.string(), v.null()),
  local_descricao: v.optional(v.string()),
  pessoa_id: v.optional(v.id("people")),
  pessoa_snapshot: v.optional(personSnapshotValidator),
  original_id: v.optional(v.id("occurrences")),
  original_summary: v.optional(v.string()),
  registrado_por: v.id("users"),
  criado_em: v.number(),
  photos: v.array(occurrencePhotoValidator),
  can_rectify: v.boolean(),
  adoption_payload: v.optional(adoptionPayloadOutputValidator),
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
      summary: "Foto adicionada a ocorrência",
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
    atribuivel_a_pessoa: v.optional(v.boolean()),
    photo_storage_ids: v.array(v.id("_storage")),
    new_pessoa_id: v.optional(v.id("people")),
  },
  returns: v.id("occurrences"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cão");
    }

    const type = await ctx.db.get("occurrence_types", args.occurrenceTypeId);
    if (!type || !type.ativo) {
      throw notFound("Tipo de ocorrência");
    }

    if (type.nome === "Correção/Retificação") {
      throw validationError("Use a ação de retificação para corrigir ocorrências.");
    }

    const category = type.categoria;
    if (!canCreateOccurrenceCategory(actor.permissions, category)) {
      throw forbidden();
    }

    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Descrição obrigatória.");
    }

    if (type.requer_foto && args.photo_storage_ids.length === 0) {
      throw validationError("Este tipo exige pelo menos uma foto.");
    }

    const gravidade = resolveSeverity(type.gravidade_padrao, args.gravidade);
    const atribuivel =
      args.atribuivel_a_pessoa ?? defaultAtribuivelForCategory(category);

    let pessoaId = dog.pessoa_atual_id;
    let pessoaSnapshot: Awaited<ReturnType<typeof buildPersonSnapshot>> | undefined;

    if (type.nome === "Adoção" || type.nome === "Transferência de Tutor") {
      if (!args.new_pessoa_id) {
        throw validationError("Informe a pessoa de destino.");
      }
      pessoaId = args.new_pessoa_id;
      pessoaSnapshot = await buildPersonSnapshot(ctx, args.new_pessoa_id);
    } else if (pessoaId) {
      pessoaSnapshot = await buildPersonSnapshot(ctx, pessoaId);
    }

    if (args.bairro_id) {
      const bairro = await ctx.db.get("bairros", args.bairro_id);
      if (!bairro?.ativo) {
        throw validationError("Bairro inválido ou inativo.");
      }
    }

    const now = Date.now();
    const occurrenceId = await ctx.db.insert("occurrences", {
      dog_id: args.dogId,
      pessoa_id: pessoaId,
      pessoa_snapshot: pessoaSnapshot,
      atribuivel_a_pessoa: atribuivel,
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
        newPessoaId: args.new_pessoa_id,
      });
    }

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "occurrences.create",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: `Ocorrência criada: ${type.nome} para ${dog.nome}`,
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
      throw notFound("Ocorrência");
    }

    assertCanReadOccurrence(original.type.categoria, actor.permissions);

    const rectificationType = await getOccurrenceTypeByName(ctx, "Correção/Retificação");
    if (!rectificationType?.ativo) {
      throw notFound("Tipo de ocorrência");
    }

    const descricao = args.descricao.trim();
    if (!descricao) {
      throw validationError("Descrição da retificação obrigatória.");
    }

    if (original.dog_id) {
      const dog = await ctx.db.get("dogs", original.dog_id);
      if (!dog) {
        throw notFound("Cão");
      }
    }

    const now = Date.now();
    const occurrenceId = await ctx.db.insert("occurrences", {
      dog_id: original.dog_id,
      pessoa_id: original.pessoa_id,
      pessoa_snapshot: original.pessoa_snapshot,
      atribuivel_a_pessoa: false,
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
      summary: `Retificação registrada para ocorrência ${args.originalId}`,
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

    const dog = loaded.dog_id ? await ctx.db.get("dogs", loaded.dog_id) : null;
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
      loaded.type.nome !== "Correção/Retificação" &&
      canCreateOccurrenceCategory(actor.permissions, "outro");

    const adoption_payload = loaded.adoption_payload
      ? {
          data_adocao: loaded.adoption_payload.data_adocao,
          numero_termo_adocao: loaded.adoption_payload.numero_termo_adocao,
          condicoes_adocao: loaded.adoption_payload.condicoes_adocao,
          observacoes_adocao: loaded.adoption_payload.observacoes_adocao,
          termo_adocao_url: loaded.adoption_payload.termo_adocao_storage_id
            ? await ctx.storage.getUrl(loaded.adoption_payload.termo_adocao_storage_id)
            : null,
        }
      : undefined;

    return {
      _id: loaded._id,
      dog_id: loaded.dog_id,
      dog_nome: loaded.dog_id ? (dog?.nome ?? "Cão removido") : undefined,
      occurrence_type_id: loaded.occurrence_type_id,
      type_nome: loaded.type.nome,
      categoria: loaded.type.categoria,
      gravidade: loaded.gravidade,
      data_ocorrencia: loaded.data_ocorrencia,
      descricao: loaded.descricao,
      atribuivel_a_pessoa: loaded.atribuivel_a_pessoa,
      bairro_id: loaded.bairro_id,
      bairro_nome: bairro?.nome ?? null,
      local_descricao: loaded.local_descricao,
      pessoa_id: loaded.pessoa_id,
      pessoa_snapshot: filterPersonSnapshotForViewer(
        loaded.pessoa_snapshot,
        actor.permissions,
      ),
      original_id: loaded.original_id,
      original_summary,
      registrado_por: loaded.registrado_por,
      criado_em: loaded.criado_em,
      photos: enrichedPhotos,
      can_rectify,
      adoption_payload,
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
      throw notFound("Cão");
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
            atribuivel_a_pessoa: occurrence.atribuivel_a_pessoa,
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

export const listByPerson = query({
  args: {
    personId: v.id("people"),
    gravidade: v.optional(severityValidator),
    occurrence_type_id: v.optional(v.id("occurrence_types")),
    bairro_id: v.optional(v.id("bairros")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.array(occurrenceSummaryValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    const person = await ctx.db.get("people", args.personId);
    if (!person) {
      throw notFound("Pessoa");
    }

    const occurrences = await ctx.db
      .query("occurrences")
      .withIndex("by_pessoa", (q) => q.eq("pessoa_id", args.personId))
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
            atribuivel_a_pessoa: occurrence.atribuivel_a_pessoa,
            original_id: occurrence.original_id,
            bairro_nome: bairro?.nome ?? null,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return summaries;
  },
});

const occurrenceListItemValidator = occurrenceSummaryValidator.extend({
  dog_nome: v.optional(v.string()),
  pessoa_id: v.optional(v.id("people")),
  pessoa_nome: v.optional(v.string()),
});

export const listAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
    categoria: v.optional(occurrenceCategoryValidator),
    gravidade: v.optional(severityValidator),
    bairro_id: v.optional(v.id("bairros")),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  returns: v.object({
    page: v.array(occurrenceListItemValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    const paginationOpts = normalizePaginationOpts(args.paginationOpts);
    const { categoria, gravidade, bairro_id: bairroId, from, to } = args;

    const baseQuery =
      from !== undefined || to !== undefined
        ? ctx.db.query("occurrences").withIndex("by_date", (q) => {
            if (from !== undefined && to !== undefined) {
              return q.gte("data_ocorrencia", from).lte("data_ocorrencia", to);
            }
            if (from !== undefined) {
              return q.gte("data_ocorrencia", from);
            }
            return q.lte("data_ocorrencia", to!);
          })
        : bairroId !== undefined
          ? ctx.db.query("occurrences").withIndex("by_bairro", (q) => q.eq("bairro_id", bairroId))
          : gravidade !== undefined
            ? ctx.db.query("occurrences").withIndex("by_gravity", (q) => q.eq("gravidade", gravidade))
            : ctx.db.query("occurrences").withIndex("by_date");

    const result = await baseQuery.order("desc").paginate(paginationOpts);

    const page = (
      await Promise.all(
        result.page.map(async (occurrence) => {
          const type = await ctx.db.get("occurrence_types", occurrence.occurrence_type_id);
          if (!type) {
            return null;
          }

          if (!canReadOccurrenceCategory(actor.permissions, type.categoria)) {
            return null;
          }
          if (categoria && type.categoria !== categoria) {
            return null;
          }
          if (gravidade && occurrence.gravidade !== gravidade) {
            return null;
          }
          if (bairroId && occurrence.bairro_id !== bairroId) {
            return null;
          }

          const dog = occurrence.dog_id ? await ctx.db.get("dogs", occurrence.dog_id) : null;
          const bairro = occurrence.bairro_id
            ? await ctx.db.get("bairros", occurrence.bairro_id)
            : null;

          return {
            _id: occurrence._id,
            dog_id: occurrence.dog_id,
            dog_nome: occurrence.dog_id ? (dog?.nome ?? "Cão removido") : undefined,
            pessoa_id: occurrence.pessoa_id,
            pessoa_nome: occurrence.pessoa_snapshot?.nome_completo,
            occurrence_type_id: occurrence.occurrence_type_id,
            type_nome: type.nome,
            categoria: type.categoria,
            gravidade: occurrence.gravidade,
            data_ocorrencia: occurrence.data_ocorrencia,
            descricao: occurrence.descricao,
            atribuivel_a_pessoa: occurrence.atribuivel_a_pessoa,
            original_id: occurrence.original_id,
            bairro_nome: bairro?.nome ?? null,
          };
        }),
      )
    ).filter((item): item is NonNullable<typeof item> => item !== null);

    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
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
