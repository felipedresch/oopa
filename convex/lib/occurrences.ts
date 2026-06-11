import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { validationError } from "../errors";
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
  | "outro";

export type Severity = Doc<"occurrences">["gravidade"];

export const CREATE_PERMISSION_BY_CATEGORY: Record<OccurrenceCategory, Permission> = {
  rotina: "occurrences.create_rotina",
  clinica: "occurrences.create_clinica",
  risco: "occurrences.create_risco",
  legal: "occurrences.create_legal",
  adocao: "occurrences.create_adocao",
  outro: "occurrences.create_outro",
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
      return hasPermission(permissions, "occurrences.read");
    case "risco":
    case "legal":
      return hasPermission(permissions, "occurrences.read_legal");
    case "adocao":
      return hasAllPermissions(permissions, ["dogs.read", "tutors.read"]);
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

export async function buildTutorSnapshot(
  ctx: Pick<QueryCtx, "db">,
  tutorId: Id<"tutors">,
): Promise<NonNullable<Doc<"occurrences">["tutor_snapshot"]>> {
  const tutor = await ctx.db.get("tutors", tutorId);
  if (!tutor) {
    throw validationError("Tutor não encontrado para snapshot.");
  }

  const bairro = tutor.bairro_id ? await ctx.db.get("bairros", tutor.bairro_id) : null;

  return {
    nome_completo: tutor.nome_completo,
    cpf: tutor.cpf,
    rg: tutor.rg,
    telefone: tutor.telefone,
    email: tutor.email,
    endereco_logradouro: tutor.endereco_logradouro,
    endereco_numero: tutor.endereco_numero,
    endereco_complemento: tutor.endereco_complemento,
    endereco_cep: tutor.endereco_cep,
    bairro_id: tutor.bairro_id,
    bairro_nome: bairro?.nome,
    data_nascimento: tutor.data_nascimento,
    observacoes: tutor.observacoes,
  };
}

export async function getOccurrenceTypeByName(
  ctx: Pick<QueryCtx, "db">,
  nome: string,
): Promise<Doc<"occurrence_types"> | null> {
  const types = await ctx.db.query("occurrence_types").collect();
  return types.find((type) => type.nome === nome) ?? null;
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
