import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { notFound, validationError } from "../errors";
import {
  hasAllPermissions,
  hasPermission,
  type Permission,
} from "../permissions";

export type OccurrenceCategory =
  | "rotina"
  | "clinica"
  | "risco"
  | "legal"
  | "adocao"
  | "outro"
  | "denuncia_externa";

export type Severity = Doc<"occurrences">["gravidade"];

export const CREATE_PERMISSION_BY_CATEGORY: Record<OccurrenceCategory, Permission> = {
  rotina: "occurrences.create_rotina",
  clinica: "occurrences.create_clinica",
  risco: "occurrences.create_risco",
  legal: "occurrences.create_legal",
  adocao: "occurrences.create_adocao",
  outro: "occurrences.create_outro",
  // Sem permissão dedicada ainda: denúncias externas são criadas pela
  // triagem de `public_reports` (ver Fase 16 do backlog), não pelo fluxo
  // manual comum de ocorrência.
  denuncia_externa: "occurrences.create_outro",
};

export const HISTORY_AFFECTING_TYPE_NAMES = new Set([
  "Adoção",
  "Devolução a ONG",
  "Transferência de Tutor",
  "Abandono Suspeito",
  "Obito",
  "Fuga Confirmada",
]);

export function canCreateOccurrenceCategory(
  permissions: readonly string[],
  category: OccurrenceCategory,
): boolean {
  return hasPermission(permissions, CREATE_PERMISSION_BY_CATEGORY[category]);
}

export function canReadOccurrenceCategory(
  permissions: readonly string[],
  category: OccurrenceCategory,
): boolean {
  switch (category) {
    case "rotina":
    case "clinica":
    case "outro":
    case "denuncia_externa":
      return hasPermission(permissions, "occurrences.read");
    case "risco":
    case "legal":
      return hasPermission(permissions, "occurrences.read_legal");
    case "adocao":
      return hasAllPermissions(permissions, ["dogs.read", "people.read"]);
  }
}

export function defaultAtribuivelForCategory(category: OccurrenceCategory): boolean {
  return category !== "rotina" && category !== "clinica";
}

export function resolveSeverity(
  typeDefault: Severity,
  requested: Severity | undefined,
): Severity {
  if (!requested) {
    return typeDefault;
  }

  if (requested === "info") {
    throw validationError("Gravidade informativa vem do tipo de ocorrência.");
  }

  if (requested !== "baixa" && requested !== "media" && requested !== "alta") {
    throw validationError("Gravidade inválida.");
  }

  return requested;
}

export function isSensitiveCategory(category: OccurrenceCategory): boolean {
  return category === "risco" || category === "legal";
}

export async function buildPersonSnapshot(
  ctx: Pick<QueryCtx, "db">,
  pessoaId: Id<"people">,
): Promise<NonNullable<Doc<"occurrences">["pessoa_snapshot"]>> {
  const pessoa = await ctx.db.get("people", pessoaId);
  if (!pessoa) {
    throw validationError("Pessoa não encontrada para snapshot.");
  }

  const bairro = pessoa.bairro_id ? await ctx.db.get("bairros", pessoa.bairro_id) : null;

  return {
    nome_completo: pessoa.nome_completo,
    cpf: pessoa.cpf,
    rg: pessoa.rg,
    telefone: pessoa.telefone,
    email: pessoa.email,
    endereco_logradouro: pessoa.endereco_logradouro,
    endereco_numero: pessoa.endereco_numero,
    endereco_complemento: pessoa.endereco_complemento,
    endereco_cep: pessoa.endereco_cep,
    bairro_id: pessoa.bairro_id,
    bairro_nome: bairro?.nome,
    data_nascimento: pessoa.data_nascimento,
    observacoes: pessoa.observacoes,
  };
}

export async function getOccurrenceTypeByName(
  ctx: Pick<QueryCtx, "db">,
  nome: string,
): Promise<Doc<"occurrence_types"> | null> {
  return await ctx.db
    .query("occurrence_types")
    .withIndex("by_nome", (q) => q.eq("nome", nome))
    .unique();
}

/**
 * Igual a `getOccurrenceTypeByName`, mas falha com uma mensagem acionavel.
 * Tipos de catalogo vem do seed; se o deploy nao reaplicou `seeds:seedAll`, a
 * feature que depende do tipo quebra e o erro precisa dizer o porque.
 */
export async function requireOccurrenceTypeByName(
  ctx: Pick<QueryCtx, "db">,
  nome: string,
): Promise<Doc<"occurrence_types">> {
  const type = await getOccurrenceTypeByName(ctx, nome);
  if (!type) {
    throw notFound(
      `Tipo de ocorrência "${nome}" (rode os seeds do catálogo para criá-lo)`,
    );
  }
  return type;
}

export type OccurrenceWithType = Doc<"occurrences"> & {
  type: Doc<"occurrence_types">;
};

export async function loadOccurrenceWithType(
  ctx: Pick<QueryCtx, "db">,
  occurrenceId: Id<"occurrences">,
): Promise<OccurrenceWithType | null> {
  const occurrence = await ctx.db.get("occurrences", occurrenceId);
  if (!occurrence) {
    return null;
  }

  const type = await ctx.db.get("occurrence_types", occurrence.occurrence_type_id);
  if (!type) {
    return null;
  }

  return { ...occurrence, type };
}

export function categoryPermissionLabel(category: OccurrenceCategory): string {
  return CREATE_PERMISSION_BY_CATEGORY[category];
}
