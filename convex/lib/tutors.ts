import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  isValidCep,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  normalizeCep,
  normalizeCpf,
  normalizePhone,
  VALIDATION_MESSAGES,
} from "../domainValidators";
import { conflict, notFound, validationError } from "../errors";
import { hasPermission } from "../permissions";

export type TutorAlertLevel = "none" | "yellow" | "red";

export type TutorAlertSummary = {
  level: TutorAlertLevel;
  altaCount: number;
  mediaCount: number;
};

export type TutorInput = {
  nome_completo: string;
  cpf?: string;
  rg?: string;
  telefone?: string;
  email?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_cep?: string;
  bairro_id?: Id<"bairros">;
  data_nascimento?: number;
  observacoes?: string;
};

export function canReadSensitiveTutorData(permissions: readonly string[]): boolean {
  return hasPermission(permissions, "tutors.read_sensitive");
}

export async function getAttributableOccurrences(
  ctx: QueryCtx,
  tutorId: Id<"tutors">,
): Promise<Doc<"occurrences">[]> {
  const occurrences = await ctx.db
    .query("occurrences")
    .withIndex("by_tutor", (q) => q.eq("tutor_id", tutorId))
    .collect();

  return occurrences.filter((occurrence) => occurrence.atribuivel_ao_tutor);
}

export function computeTutorAlertFromOccurrences(
  occurrences: readonly Doc<"occurrences">[],
): TutorAlertSummary {
  const attributable = occurrences.filter((occurrence) => occurrence.atribuivel_ao_tutor);
  const altaCount = attributable.filter((occurrence) => occurrence.gravidade === "alta").length;
  const mediaCount = attributable.filter((occurrence) => occurrence.gravidade === "media").length;

  let level: TutorAlertLevel = "none";
  if (altaCount > 0) {
    level = "red";
  } else if (mediaCount > 0) {
    level = "yellow";
  }

  return { level, altaCount, mediaCount };
}

export async function computeTutorAlert(
  ctx: QueryCtx,
  tutorId: Id<"tutors">,
): Promise<TutorAlertSummary> {
  const occurrences = await getAttributableOccurrences(ctx, tutorId);
  return computeTutorAlertFromOccurrences(occurrences);
}

export function normalizeTutorInput(input: TutorInput): TutorInput {
  const nome = input.nome_completo.trim();
  const cpf = input.cpf ? normalizeCpf(input.cpf) : undefined;
  const telefone = input.telefone ? normalizePhone(input.telefone) : undefined;
  const email = input.email?.trim() || undefined;
  const endereco_cep = input.endereco_cep ? normalizeCep(input.endereco_cep) : undefined;

  return {
    nome_completo: nome,
    cpf: cpf || undefined,
    rg: input.rg?.trim() || undefined,
    telefone: telefone || undefined,
    email,
    endereco_logradouro: input.endereco_logradouro?.trim() || undefined,
    endereco_numero: input.endereco_numero?.trim() || undefined,
    endereco_complemento: input.endereco_complemento?.trim() || undefined,
    endereco_cep: endereco_cep || undefined,
    bairro_id: input.bairro_id,
    data_nascimento: input.data_nascimento,
    observacoes: input.observacoes?.trim() || undefined,
  };
}

export function validateTutorInput(input: TutorInput): void {
  if (!input.nome_completo) {
    throw validationError("Nome completo obrigatorio.");
  }

  if (input.cpf && !isValidCpf(input.cpf)) {
    throw validationError(VALIDATION_MESSAGES.cpf);
  }

  if (input.telefone && !isValidPhone(input.telefone)) {
    throw validationError(VALIDATION_MESSAGES.phone);
  }

  if (input.email && !isValidEmail(input.email)) {
    throw validationError(VALIDATION_MESSAGES.email);
  }

  if (input.endereco_cep && !isValidCep(input.endereco_cep)) {
    throw validationError(VALIDATION_MESSAGES.cep);
  }
}

export async function assertUniqueCpf(
  ctx: Pick<MutationCtx, "db">,
  cpf: string | undefined,
  excludeTutorId?: Id<"tutors">,
): Promise<void> {
  if (!cpf) {
    return;
  }

  const existing = await ctx.db
    .query("tutors")
    .withIndex("by_cpf", (q) => q.eq("cpf", cpf))
    .unique();

  if (existing && existing._id !== excludeTutorId) {
    throw conflict("Ja existe um tutor com este CPF.");
  }
}

export async function assertActiveBairro(
  ctx: Pick<MutationCtx, "db">,
  bairroId: Id<"bairros"> | undefined,
): Promise<void> {
  if (!bairroId) {
    return;
  }

  const bairro = await ctx.db.get("bairros", bairroId);
  if (!bairro) {
    throw notFound("Bairro");
  }

  if (!bairro.ativo) {
    throw validationError("Bairro inativo.");
  }
}
