import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { recordAudit } from "./audit";
import { dogStatusValidator, severityValidator } from "./domainValidators";
import { forbidden, notFound } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import {
  assertActiveBairro,
  assertUniqueCpf,
  canReadSensitiveTutorData,
  computeTutorAlert,
  getAttributableOccurrences,
  normalizeTutorInput,
  validateTutorInput,
  type TutorInput,
} from "./lib/tutors";
import { hasPermission } from "./permissions";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const tutorAlertLevelValidator = v.union(
  v.literal("none"),
  v.literal("yellow"),
  v.literal("red"),
);

const tutorInputFields = {
  nome_completo: v.string(),
  cpf: v.optional(v.string()),
  rg: v.optional(v.string()),
  telefone: v.optional(v.string()),
  email: v.optional(v.string()),
  endereco_logradouro: v.optional(v.string()),
  endereco_numero: v.optional(v.string()),
  endereco_complemento: v.optional(v.string()),
  endereco_cep: v.optional(v.string()),
  bairro_id: v.optional(v.id("bairros")),
  data_nascimento: v.optional(v.number()),
  observacoes: v.optional(v.string()),
};

const tutorSummaryValidator = v.object({
  _id: v.id("tutors"),
  nome_completo: v.string(),
  bairro_nome: v.union(v.string(), v.null()),
  alert_level: v.optional(tutorAlertLevelValidator),
});

const tutorSensitiveValidator = v.object({
  cpf: v.optional(v.string()),
  rg: v.optional(v.string()),
  telefone: v.optional(v.string()),
  email: v.optional(v.string()),
  endereco_logradouro: v.optional(v.string()),
  endereco_numero: v.optional(v.string()),
  endereco_complemento: v.optional(v.string()),
  endereco_cep: v.optional(v.string()),
  data_nascimento: v.optional(v.number()),
  observacoes: v.optional(v.string()),
});

const tutorAlertOccurrenceValidator = v.object({
  _id: v.id("occurrences"),
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  dog_id: v.id("dogs"),
  dog_nome: v.string(),
});

const tutorAlertValidator = v.object({
  level: tutorAlertLevelValidator,
  alta_count: v.number(),
  media_count: v.number(),
  occurrences: v.array(tutorAlertOccurrenceValidator),
});

const tutorDogSummaryValidator = v.object({
  _id: v.id("dogs"),
  nome: v.string(),
  microchip: v.string(),
  status_atual: dogStatusValidator,
});

const tutorHistoryValidator = v.object({
  _id: v.id("tutor_dog_history"),
  dog_id: v.id("dogs"),
  dog_nome: v.string(),
  inicio: v.number(),
  fim: v.optional(v.number()),
  tipo_inicio: v.string(),
  tipo_fim: v.optional(v.string()),
});

const tutorDetailValidator = v.object({
  _id: v.id("tutors"),
  nome_completo: v.string(),
  bairro: v.union(
    v.object({
      _id: v.id("bairros"),
      nome: v.string(),
    }),
    v.null(),
  ),
  sensitive_hidden: v.boolean(),
  sensitive: v.optional(tutorSensitiveValidator),
  alert: v.optional(tutorAlertValidator),
  current_dogs: v.array(tutorDogSummaryValidator),
  history: v.array(tutorHistoryValidator),
  criado_em: v.number(),
  atualizado_em: v.optional(v.number()),
});

async function persistTutor(
  ctx: MutationCtx,
  input: TutorInput,
): Promise<TutorInput> {
  const normalized = normalizeTutorInput(input);
  validateTutorInput(normalized);
  await assertActiveBairro(ctx, normalized.bairro_id);

  return {
    nome_completo: normalized.nome_completo,
    cpf: normalized.cpf,
    rg: normalized.rg,
    telefone: normalized.telefone,
    email: normalized.email,
    endereco_logradouro: normalized.endereco_logradouro,
    endereco_numero: normalized.endereco_numero,
    endereco_complemento: normalized.endereco_complemento,
    endereco_cep: normalized.endereco_cep,
    bairro_id: normalized.bairro_id,
    data_nascimento: normalized.data_nascimento,
    observacoes: normalized.observacoes,
  };
}

async function getBairroNome(
  ctx: QueryCtx,
  bairroId: Id<"bairros"> | undefined,
): Promise<string | null> {
  if (!bairroId) {
    return null;
  }

  const bairro = await ctx.db.get("bairros", bairroId);
  return bairro?.nome ?? null;
}

export const create = mutation({
  args: tutorInputFields,
  returns: v.id("tutors"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "tutors.create");

    const data = await persistTutor(ctx, args);
    await assertUniqueCpf(ctx, data.cpf);

    const now = Date.now();
    const tutorId = await ctx.db.insert("tutors", {
      ...data,
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "tutors.create",
      entityType: "tutor",
      entityId: tutorId,
      summary: `Tutor criado: ${data.nome_completo}`,
    });

    return tutorId;
  },
});

export const update = mutation({
  args: {
    tutorId: v.id("tutors"),
    ...tutorInputFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "tutors.edit");

    const tutor = await ctx.db.get("tutors", args.tutorId);
    if (!tutor) {
      throw notFound("Tutor");
    }

    const data = await persistTutor(ctx, args);
    await assertUniqueCpf(ctx, data.cpf, args.tutorId);

    const now = Date.now();
    await ctx.db.patch(args.tutorId, {
      ...data,
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "tutors.update",
      entityType: "tutor",
      entityId: args.tutorId,
      summary: `Tutor atualizado: ${data.nome_completo}`,
    });

    return null;
  },
});

export const get = query({
  args: {
    tutorId: v.id("tutors"),
  },
  returns: v.union(tutorDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "tutors.read")) {
      throw forbidden();
    }

    const tutor = await ctx.db.get("tutors", args.tutorId);
    if (!tutor) {
      return null;
    }

    const canSeeSensitive = canReadSensitiveTutorData(actor.permissions);
    const bairro = tutor.bairro_id ? await ctx.db.get("bairros", tutor.bairro_id) : null;

    const currentDogs = await ctx.db
      .query("dogs")
      .withIndex("by_tutor", (q) => q.eq("tutor_atual_id", args.tutorId))
      .collect();

    const historyRows = await ctx.db
      .query("tutor_dog_history")
      .withIndex("by_tutor", (q) => q.eq("tutor_id", args.tutorId))
      .collect();

    const history = await Promise.all(
      historyRows.map(async (entry) => {
        const dog = await ctx.db.get("dogs", entry.dog_id);
        return {
          _id: entry._id,
          dog_id: entry.dog_id,
          dog_nome: dog?.nome ?? "Cao removido",
          inicio: entry.inicio,
          fim: entry.fim,
          tipo_inicio: entry.tipo_inicio,
          tipo_fim: entry.tipo_fim,
        };
      }),
    );

    let alert:
      | {
          level: "none" | "yellow" | "red";
          alta_count: number;
          media_count: number;
          occurrences: Array<{
            _id: Id<"occurrences">;
            gravidade: "info" | "baixa" | "media" | "alta";
            data_ocorrencia: number;
            descricao: string;
            dog_id: Id<"dogs">;
            dog_nome: string;
          }>;
        }
      | undefined;

    if (canSeeSensitive) {
      const alertSummary = await computeTutorAlert(ctx, args.tutorId);
      const attributable = await getAttributableOccurrences(ctx, args.tutorId);
      const alertOccurrences = attributable.filter(
        (occurrence) => occurrence.gravidade === "alta" || occurrence.gravidade === "media",
      );

      const occurrences = await Promise.all(
        alertOccurrences.map(async (occurrence) => {
          const dog = await ctx.db.get("dogs", occurrence.dog_id);
          return {
            _id: occurrence._id,
            gravidade: occurrence.gravidade,
            data_ocorrencia: occurrence.data_ocorrencia,
            descricao: occurrence.descricao,
            dog_id: occurrence.dog_id,
            dog_nome: dog?.nome ?? "Cao removido",
          };
        }),
      );

      alert = {
        level: alertSummary.level,
        alta_count: alertSummary.altaCount,
        media_count: alertSummary.mediaCount,
        occurrences,
      };
    }

    return {
      _id: tutor._id,
      nome_completo: tutor.nome_completo,
      bairro: bairro
        ? {
            _id: bairro._id,
            nome: bairro.nome,
          }
        : null,
      sensitive_hidden: !canSeeSensitive,
      sensitive: canSeeSensitive
        ? {
            cpf: tutor.cpf,
            rg: tutor.rg,
            telefone: tutor.telefone,
            email: tutor.email,
            endereco_logradouro: tutor.endereco_logradouro,
            endereco_numero: tutor.endereco_numero,
            endereco_complemento: tutor.endereco_complemento,
            endereco_cep: tutor.endereco_cep,
            data_nascimento: tutor.data_nascimento,
            observacoes: tutor.observacoes,
          }
        : undefined,
      alert,
      current_dogs: currentDogs.map((dog) => ({
        _id: dog._id,
        nome: dog.nome,
        microchip: dog.microchip,
        status_atual: dog.status_atual,
      })),
      history: history.sort((left, right) => right.inicio - left.inicio),
      criado_em: tutor.criado_em,
      atualizado_em: tutor.atualizado_em,
    };
  },
});

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    bairro_id: v.optional(v.id("bairros")),
  },
  returns: v.object({
    page: v.array(tutorSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "tutors.read")) {
      throw forbidden();
    }

    const canSeeSensitive = canReadSensitiveTutorData(actor.permissions);
    const search = args.search?.trim();
    const searchLower = search?.toLowerCase();
    const cpfSearch = canSeeSensitive && search ? search.replace(/\D/g, "") : "";

    const bairroFilter = args.bairro_id;
    const baseQuery = bairroFilter
      ? ctx.db.query("tutors").withIndex("by_bairro", (q) => q.eq("bairro_id", bairroFilter))
      : ctx.db.query("tutors");

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);

    const page = (
      await Promise.all(
        result.page.map(async (tutor) => {
          if (searchLower) {
            const matchesNome = tutor.nome_completo.toLowerCase().includes(searchLower);
            const matchesCpf =
              canSeeSensitive && cpfSearch.length > 0 && tutor.cpf?.includes(cpfSearch);
            if (!matchesNome && !matchesCpf) {
              return null;
            }
          }

          const bairroNome = await getBairroNome(ctx, tutor.bairro_id);
          let alert_level: "none" | "yellow" | "red" | undefined;

          if (canSeeSensitive) {
            const alert = await computeTutorAlert(ctx, tutor._id);
            alert_level = alert.level;
          }

          return {
            _id: tutor._id,
            nome_completo: tutor.nome_completo,
            bairro_nome: bairroNome,
            alert_level,
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
