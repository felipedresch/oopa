import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import { recordAudit } from "./audit";
import { dogStatusValidator, personPapelValidator, severityValidator } from "./domainValidators";
import { forbidden, notFound } from "./errors";
import { getCurrentUser, requirePermission } from "./lib/auth";
import { normalizePaginationOpts } from "./lib/pagination";
import { normalizeCpf, normalizeRg } from "./domainValidators";
import {
  assertActiveBairro,
  assertUniqueCpf,
  assertUniqueRg,
  canReadSensitivePersonData,
  computePersonAlert,
  getAttributableOccurrences,
  normalizePersonInput,
  validatePersonInput,
  type PersonInput,
} from "./lib/people";
import { hasPermission } from "./permissions";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const personAlertLevelValidator = v.union(
  v.literal("none"),
  v.literal("yellow"),
  v.literal("red"),
);

const personInputFields = {
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
  data_cadastro_cadunico: v.optional(v.number()),
  papeis: v.optional(v.array(personPapelValidator)),
  observacoes: v.optional(v.string()),
};

const personSummaryValidator = v.object({
  _id: v.id("people"),
  nome_completo: v.string(),
  bairro_nome: v.union(v.string(), v.null()),
  alert_level: v.optional(personAlertLevelValidator),
});

const personSensitiveValidator = v.object({
  cpf: v.optional(v.string()),
  rg: v.optional(v.string()),
  telefone: v.optional(v.string()),
  email: v.optional(v.string()),
  endereco_logradouro: v.optional(v.string()),
  endereco_numero: v.optional(v.string()),
  endereco_complemento: v.optional(v.string()),
  endereco_cep: v.optional(v.string()),
  data_nascimento: v.optional(v.number()),
  data_cadastro_cadunico: v.optional(v.number()),
  observacoes: v.optional(v.string()),
});

const personAlertOccurrenceValidator = v.object({
  _id: v.id("occurrences"),
  gravidade: severityValidator,
  data_ocorrencia: v.number(),
  descricao: v.string(),
  dog_id: v.optional(v.id("dogs")),
  dog_nome: v.string(),
});

const personAlertValidator = v.object({
  level: personAlertLevelValidator,
  alta_count: v.number(),
  media_count: v.number(),
  occurrences: v.array(personAlertOccurrenceValidator),
});

const personDogSummaryValidator = v.object({
  _id: v.id("dogs"),
  nome: v.string(),
  microchip: v.optional(v.string()),
  status_atual: dogStatusValidator,
});

const personHistoryValidator = v.object({
  _id: v.id("person_dog_history"),
  dog_id: v.id("dogs"),
  dog_nome: v.string(),
  inicio: v.number(),
  fim: v.optional(v.number()),
  tipo_inicio: v.string(),
  tipo_fim: v.optional(v.string()),
});

const personDetailValidator = v.object({
  _id: v.id("people"),
  nome_completo: v.string(),
  bairro: v.union(
    v.object({
      _id: v.id("bairros"),
      nome: v.string(),
    }),
    v.null(),
  ),
  sensitive_hidden: v.boolean(),
  sensitive: v.optional(personSensitiveValidator),
  alert: v.optional(personAlertValidator),
  papeis: v.array(personPapelValidator),
  current_dogs: v.array(personDogSummaryValidator),
  history: v.array(personHistoryValidator),
  criado_em: v.number(),
  atualizado_em: v.optional(v.number()),
});

async function persistPerson(
  ctx: MutationCtx,
  input: PersonInput,
): Promise<PersonInput> {
  const normalized = normalizePersonInput(input);
  validatePersonInput(normalized);
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
    data_cadastro_cadunico: normalized.data_cadastro_cadunico,
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
  args: personInputFields,
  returns: v.id("people"),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "people.create");

    const data = await persistPerson(ctx, args);
    await assertUniqueCpf(ctx, data.cpf);
    await assertUniqueRg(ctx, data.rg);

    const now = Date.now();
    const personId = await ctx.db.insert("people", {
      ...data,
      papeis: args.papeis ?? [],
      criado_em: now,
      criado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "people.create",
      entityType: "person",
      entityId: personId,
      summary: `Pessoa criada: ${data.nome_completo}`,
    });

    return personId;
  },
});

export const update = mutation({
  args: {
    personId: v.id("people"),
    ...personInputFields,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    requirePermission(actor, "people.edit");

    const person = await ctx.db.get("people", args.personId);
    if (!person) {
      throw notFound("Pessoa");
    }

    const data = await persistPerson(ctx, args);
    await assertUniqueCpf(ctx, data.cpf, args.personId);
    await assertUniqueRg(ctx, data.rg, args.personId);

    const now = Date.now();
    await ctx.db.patch(args.personId, {
      ...data,
      papeis: args.papeis ?? person.papeis ?? [],
      atualizado_em: now,
      atualizado_por: actor._id,
    });

    await recordAudit(ctx, {
      actorUserId: actor._id,
      action: "people.update",
      entityType: "person",
      entityId: args.personId,
      summary: `Pessoa atualizada: ${data.nome_completo}`,
    });

    return null;
  },
});

const duplicateMatchValidator = v.object({
  exists: v.boolean(),
  nome: v.union(v.string(), v.null()),
});

/**
 * Checagem ao vivo de CPF/RG já cadastrados, usada pelo formulário enquanto o
 * usuário digita. A unicidade definitiva é garantida nas mutations.
 */
export const checkDuplicate = query({
  args: {
    cpf: v.optional(v.string()),
    rg: v.optional(v.string()),
    excludePersonId: v.optional(v.id("people")),
  },
  returns: v.object({
    cpf: duplicateMatchValidator,
    rg: duplicateMatchValidator,
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (
      !hasPermission(actor.permissions, "people.create") &&
      !hasPermission(actor.permissions, "people.edit")
    ) {
      throw forbidden();
    }

    const empty = { exists: false, nome: null as string | null };
    const result = { cpf: { ...empty }, rg: { ...empty } };

    const cpf = args.cpf ? normalizeCpf(args.cpf) : "";
    if (cpf.length === 11) {
      const match = await ctx.db
        .query("people")
        .withIndex("by_cpf", (q) => q.eq("cpf", cpf))
        .unique();
      if (match && match._id !== args.excludePersonId) {
        result.cpf = { exists: true, nome: match.nome_completo };
      }
    }

    const rg = args.rg ? normalizeRg(args.rg) : "";
    if (rg.length >= 5) {
      const match = await ctx.db
        .query("people")
        .withIndex("by_rg", (q) => q.eq("rg", rg))
        .unique();
      if (match && match._id !== args.excludePersonId) {
        result.rg = { exists: true, nome: match.nome_completo };
      }
    }

    return result;
  },
});

export const get = query({
  args: {
    personId: v.id("people"),
  },
  returns: v.union(personDetailValidator, v.null()),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "people.read")) {
      throw forbidden();
    }

    const person = await ctx.db.get("people", args.personId);
    if (!person) {
      return null;
    }

    const canSeeSensitive = canReadSensitivePersonData(actor.permissions);
    const bairro = person.bairro_id ? await ctx.db.get("bairros", person.bairro_id) : null;

    const currentDogs = await ctx.db
      .query("dogs")
      .withIndex("by_pessoa", (q) => q.eq("pessoa_atual_id", args.personId))
      .collect();

    const historyRows = await ctx.db
      .query("person_dog_history")
      .withIndex("by_pessoa", (q) => q.eq("pessoa_id", args.personId))
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
            dog_id: Id<"dogs"> | undefined;
            dog_nome: string;
          }>;
        }
      | undefined;

    if (canSeeSensitive) {
      const alertSummary = await computePersonAlert(ctx, args.personId);
      const attributable = await getAttributableOccurrences(ctx, args.personId);
      const alertOccurrences = attributable.filter(
        (occurrence) => occurrence.gravidade === "alta" || occurrence.gravidade === "media",
      );

      const occurrences = await Promise.all(
        alertOccurrences.map(async (occurrence) => {
          const dog = occurrence.dog_id ? await ctx.db.get("dogs", occurrence.dog_id) : null;
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
      _id: person._id,
      nome_completo: person.nome_completo,
      bairro: bairro
        ? {
            _id: bairro._id,
            nome: bairro.nome,
          }
        : null,
      sensitive_hidden: !canSeeSensitive,
      sensitive: canSeeSensitive
        ? {
            cpf: person.cpf,
            rg: person.rg,
            telefone: person.telefone,
            email: person.email,
            endereco_logradouro: person.endereco_logradouro,
            endereco_numero: person.endereco_numero,
            endereco_complemento: person.endereco_complemento,
            endereco_cep: person.endereco_cep,
            data_nascimento: person.data_nascimento,
            data_cadastro_cadunico: person.data_cadastro_cadunico,
            observacoes: person.observacoes,
          }
        : undefined,
      alert,
      papeis: person.papeis ?? [],
      current_dogs: currentDogs.map((dog) => ({
        _id: dog._id,
        nome: dog.nome,
        microchip: dog.microchip,
        status_atual: dog.status_atual,
      })),
      history: history.sort((left, right) => right.inicio - left.inicio),
      criado_em: person.criado_em,
      atualizado_em: person.atualizado_em,
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
    page: v.array(personSummaryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "people.read")) {
      throw forbidden();
    }

    const canSeeSensitive = canReadSensitivePersonData(actor.permissions);
    const search = args.search?.trim();
    const searchLower = search?.toLowerCase();
    const cpfSearch = canSeeSensitive && search ? search.replace(/\D/g, "") : "";

    const bairroFilter = args.bairro_id;
    const baseQuery = bairroFilter
      ? ctx.db.query("people").withIndex("by_bairro", (q) => q.eq("bairro_id", bairroFilter))
      : ctx.db.query("people");

    const result = await baseQuery
      .order("desc")
      .paginate(normalizePaginationOpts(args.paginationOpts));

    const page = (
      await Promise.all(
        result.page.map(async (person) => {
          if (searchLower) {
            const matchesNome = person.nome_completo.toLowerCase().includes(searchLower);
            const matchesCpf =
              canSeeSensitive && cpfSearch.length > 0 && person.cpf?.includes(cpfSearch);
            if (!matchesNome && !matchesCpf) {
              return null;
            }
          }

          const bairroNome = await getBairroNome(ctx, person.bairro_id);
          let alert_level: "none" | "yellow" | "red" | undefined;

          if (canSeeSensitive) {
            const alert = await computePersonAlert(ctx, person._id);
            alert_level = alert.level;
          }

          return {
            _id: person._id,
            nome_completo: person.nome_completo,
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

const personDogHistoryItemValidator = v.object({
  _id: v.id("person_dog_history"),
  pessoa_id: v.id("people"),
  pessoa_nome: v.string(),
  inicio: v.number(),
  fim: v.optional(v.number()),
  tipo_inicio: v.string(),
  tipo_fim: v.optional(v.string()),
});

export const listHistoryByDog = query({
  args: {
    dogId: v.id("dogs"),
  },
  returns: v.array(personDogHistoryItemValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);
    if (!hasPermission(actor.permissions, "dogs.read")) {
      throw forbidden();
    }

    const dog = await ctx.db.get("dogs", args.dogId);
    if (!dog) {
      throw notFound("Cao");
    }

    const entries = await ctx.db
      .query("person_dog_history")
      .withIndex("by_dog", (q) => q.eq("dog_id", args.dogId))
      .order("desc")
      .take(100);

    const history = await Promise.all(
      entries.map(async (entry) => {
        const person = await ctx.db.get("people", entry.pessoa_id);
        return {
          _id: entry._id,
          pessoa_id: entry.pessoa_id,
          pessoa_nome: person?.nome_completo ?? "Pessoa removida",
          inicio: entry.inicio,
          fim: entry.fim,
          tipo_inicio: entry.tipo_inicio,
          tipo_fim: entry.tipo_fim,
        };
      }),
    );

    return history.sort((left, right) => right.inicio - left.inicio);
  },
});
