import { v } from "convex/values";

import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { canReadOccurrenceCategory } from "./lib/occurrences";
import { getCurrentUser } from "./lib/auth";
import { hasPermission } from "./permissions";

/** Termo mínimo para disparar a busca; abaixo disso o resultado é vazio. */
const MIN_TERM_LENGTH = 2;
/** Documentos lidos por tabela antes do filtro em memória. */
const SCAN_LIMIT = 500;
const DEFAULT_LIMIT_PER_TYPE = 5;
const MAX_LIMIT_PER_TYPE = 20;

const searchResultTypeValidator = v.union(
  v.literal("dogs"),
  v.literal("people"),
  v.literal("occurrences"),
  v.literal("rescues"),
  v.literal("castration"),
);

const searchGroupValidator = v.object({
  tipo: searchResultTypeValidator,
  label: v.string(),
  itens: v.array(
    v.object({
      id: v.string(),
      titulo: v.string(),
      subtitulo: v.optional(v.string()),
      rota: v.string(),
    }),
  ),
});

type SearchItem = { id: string; titulo: string; subtitulo?: string; rota: string };

const GROUP_LABELS = {
  dogs: "Animais",
  people: "Pessoas",
  occurrences: "Ocorrências",
  rescues: "Resgates",
  castration: "Castrações",
} as const;

function matches(term: string, ...fields: Array<string | undefined>): boolean {
  return fields.some((field) => field?.toLowerCase().includes(term));
}

async function searchDogs(ctx: QueryCtx, term: string, limit: number): Promise<SearchItem[]> {
  const digits = term.replace(/\D/g, "");
  const dogs = await ctx.db.query("dogs").order("desc").take(SCAN_LIMIT);
  const items: SearchItem[] = [];

  for (const dog of dogs) {
    const matchesMicrochip = digits.length > 0 && dog.microchip?.includes(digits);
    if (!matches(term, dog.nome) && !matchesMicrochip) {
      continue;
    }
    items.push({
      id: dog._id,
      titulo: dog.nome,
      subtitulo: dog.microchip ? `Microchip ${dog.microchip}` : "Sem microchip",
      rota: `/dogs/${dog._id}`,
    });
    if (items.length === limit) {
      break;
    }
  }

  return items;
}

async function searchPeople(
  ctx: QueryCtx,
  term: string,
  limit: number,
  canSeeSensitive: boolean,
): Promise<SearchItem[]> {
  const digits = canSeeSensitive ? term.replace(/\D/g, "") : "";
  const people = await ctx.db.query("people").order("desc").take(SCAN_LIMIT);
  const items: SearchItem[] = [];

  for (const person of people) {
    const matchesCpf = digits.length > 0 && person.cpf?.includes(digits);
    if (!matches(term, person.nome_completo) && !matchesCpf) {
      continue;
    }
    items.push({
      id: person._id,
      titulo: person.nome_completo,
      rota: `/people/${person._id}`,
    });
    if (items.length === limit) {
      break;
    }
  }

  return items;
}

async function searchOccurrences(
  ctx: QueryCtx,
  term: string,
  limit: number,
  permissions: readonly string[],
): Promise<SearchItem[]> {
  const types = new Map(
    (await ctx.db.query("occurrence_types").collect()).map((type) => [type._id, type]),
  );
  const occurrences = await ctx.db
    .query("occurrences")
    .withIndex("by_date")
    .order("desc")
    .take(SCAN_LIMIT);
  const items: SearchItem[] = [];

  for (const occurrence of occurrences) {
    const type = types.get(occurrence.occurrence_type_id);
    if (!type || !canReadOccurrenceCategory(permissions, type.categoria)) {
      continue;
    }
    if (!matches(term, occurrence.descricao, type.nome, occurrence.local_descricao)) {
      continue;
    }
    items.push({
      id: occurrence._id,
      titulo: type.nome,
      subtitulo: occurrence.descricao,
      rota: occurrence.dog_id
        ? `/dogs/${occurrence.dog_id}/occurrences/${occurrence._id}`
        : "/occurrences",
    });
    if (items.length === limit) {
      break;
    }
  }

  return items;
}

async function searchRescues(ctx: QueryCtx, term: string, limit: number): Promise<SearchItem[]> {
  const rescues = await ctx.db
    .query("rescue_requests")
    .withIndex("by_criado_em")
    .order("desc")
    .take(SCAN_LIMIT);
  const items: SearchItem[] = [];

  for (const rescue of rescues) {
    if (!matches(term, rescue.tipo, rescue.descricao_solicitante, rescue.local_descricao)) {
      continue;
    }
    items.push({
      id: rescue._id,
      titulo: rescue.tipo,
      subtitulo: rescue.descricao_solicitante,
      rota: `/rescues/${rescue._id}`,
    });
    if (items.length === limit) {
      break;
    }
  }

  return items;
}

async function searchCastrations(
  ctx: QueryCtx,
  term: string,
  limit: number,
): Promise<SearchItem[]> {
  const requests = await ctx.db
    .query("castration_requests")
    .withIndex("by_data_solicitacao")
    .order("desc")
    .take(SCAN_LIMIT);
  const items: SearchItem[] = [];

  for (const request of requests) {
    const person = await ctx.db.get("people", request.pessoa_id);
    if (
      !matches(
        term,
        request.animal_descricao.nome,
        request.observacoes,
        person?.nome_completo,
      )
    ) {
      continue;
    }
    items.push({
      id: request._id,
      titulo: request.animal_descricao.nome?.trim() || "Animal sem nome",
      subtitulo: person ? `Solicitante: ${person.nome_completo}` : undefined,
      rota: `/castration/${request._id}`,
    });
    if (items.length === limit) {
      break;
    }
  }

  return items;
}

/**
 * Busca global do header (Fase 25). Cada tabela só é consultada quando o
 * usuário tem a permissão de leitura correspondente, e apenas grupos com
 * resultado são devolvidos.
 */
export const global = query({
  args: {
    termo: v.string(),
    limitePorTipo: v.optional(v.number()),
  },
  returns: v.array(searchGroupValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    const term = args.termo.trim().toLowerCase();
    if (term.length < MIN_TERM_LENGTH) {
      return [];
    }

    const limit = Math.min(
      Math.max(args.limitePorTipo ?? DEFAULT_LIMIT_PER_TYPE, 1),
      MAX_LIMIT_PER_TYPE,
    );
    const permissions = actor.permissions;
    const groups: Array<{
      tipo: keyof typeof GROUP_LABELS;
      label: string;
      itens: SearchItem[];
    }> = [];

    const push = (tipo: keyof typeof GROUP_LABELS, itens: SearchItem[]) => {
      if (itens.length > 0) {
        groups.push({ tipo, label: GROUP_LABELS[tipo], itens });
      }
    };

    if (hasPermission(permissions, "dogs.read")) {
      push("dogs", await searchDogs(ctx, term, limit));
    }
    if (hasPermission(permissions, "people.read")) {
      push(
        "people",
        await searchPeople(
          ctx,
          term,
          limit,
          hasPermission(permissions, "people.read_sensitive"),
        ),
      );
    }
    if (
      hasPermission(permissions, "occurrences.read") ||
      hasPermission(permissions, "occurrences.read_legal")
    ) {
      push("occurrences", await searchOccurrences(ctx, term, limit, permissions));
    }
    if (hasPermission(permissions, "rescues.read")) {
      push("rescues", await searchRescues(ctx, term, limit));
    }
    if (hasPermission(permissions, "castration.read")) {
      push("castration", await searchCastrations(ctx, term, limit));
    }

    return groups;
  },
});
