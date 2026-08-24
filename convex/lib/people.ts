import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  isValidCep,
  isValidCpf,
  isValidEmail,
  isValidPhone,
  isValidRg,
  normalizeCep,
  normalizeCpf,
  normalizePhone,
  normalizeRg,
  VALIDATION_MESSAGES,
} from "../domainValidators";
import { conflict, notFound, validationError } from "../errors";
import { hasPermission } from "../permissions";

export type PersonAlertLevel = "none" | "yellow" | "red";

export type PersonAlertSummary = {
  level: PersonAlertLevel;
  altaCount: number;
  mediaCount: number;
};

export type PersonInput = {
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
  data_cadastro_cadunico?: number;
  observacoes?: string;
};

export function canReadSensitivePersonData(permissions: readonly string[]): boolean {
  return hasPermission(permissions, "people.read_sensitive");
}

export function filterPersonSnapshotForViewer(
  snapshot: Doc<"occurrences">["pessoa_snapshot"],
  permissions: readonly string[],
): Doc<"occurrences">["pessoa_snapshot"] {
  if (!snapshot) {
    return undefined;
  }

  if (canReadSensitivePersonData(permissions)) {
    return snapshot;
  }

  return {
    nome_completo: snapshot.nome_completo,
    bairro_id: snapshot.bairro_id,
    bairro_nome: snapshot.bairro_nome,
  };
}

export async function getAttributableOccurrences(
  ctx: QueryCtx,
  pessoaId: Id<"people">,
): Promise<Doc<"occurrences">[]> {
  const occurrences = await ctx.db
    .query("occurrences")
    .withIndex("by_pessoa", (q) => q.eq("pessoa_id", pessoaId))
    .collect();

  return occurrences.filter((occurrence) => occurrence.atribuivel_a_pessoa);
}

export function computePersonAlertFromOccurrences(
  occurrences: readonly Doc<"occurrences">[],
): PersonAlertSummary {
  const attributable = occurrences.filter((occurrence) => occurrence.atribuivel_a_pessoa);
  const altaCount = attributable.filter((occurrence) => occurrence.gravidade === "alta").length;
  const mediaCount = attributable.filter((occurrence) => occurrence.gravidade === "media").length;

  let level: PersonAlertLevel = "none";
  if (altaCount > 0) {
    level = "red";
  } else if (mediaCount > 0) {
    level = "yellow";
  }

  return { level, altaCount, mediaCount };
}

export async function computePersonAlert(
  ctx: QueryCtx,
  pessoaId: Id<"people">,
): Promise<PersonAlertSummary> {
  const occurrences = await getAttributableOccurrences(ctx, pessoaId);
  return computePersonAlertFromOccurrences(occurrences);
}

export function normalizePersonInput(input: PersonInput): PersonInput {
  const nome = input.nome_completo.trim();
  const cpf = input.cpf ? normalizeCpf(input.cpf) : undefined;
  const telefone = input.telefone ? normalizePhone(input.telefone) : undefined;
  const email = input.email?.trim() || undefined;
  const endereco_cep = input.endereco_cep ? normalizeCep(input.endereco_cep) : undefined;

  const rg = input.rg ? normalizeRg(input.rg) : undefined;

  return {
    nome_completo: nome,
    cpf: cpf || undefined,
    rg: rg || undefined,
    telefone: telefone || undefined,
    email,
    endereco_logradouro: input.endereco_logradouro?.trim() || undefined,
    endereco_numero: input.endereco_numero?.trim() || undefined,
    endereco_complemento: input.endereco_complemento?.trim() || undefined,
    endereco_cep: endereco_cep || undefined,
    bairro_id: input.bairro_id,
    data_nascimento: input.data_nascimento,
    data_cadastro_cadunico: input.data_cadastro_cadunico,
    observacoes: input.observacoes?.trim() || undefined,
  };
}

export function validatePersonInput(input: PersonInput): void {
  if (!input.nome_completo) {
    throw validationError("Nome completo obrigatório.");
  }

  if (input.cpf && !isValidCpf(input.cpf)) {
    throw validationError(VALIDATION_MESSAGES.cpf);
  }

  if (input.rg && !isValidRg(input.rg)) {
    throw validationError(VALIDATION_MESSAGES.rg);
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
  excludePersonId?: Id<"people">,
): Promise<void> {
  if (!cpf) {
    return;
  }

  const existing = await ctx.db
    .query("people")
    .withIndex("by_cpf", (q) => q.eq("cpf", cpf))
    .unique();

  if (existing && existing._id !== excludePersonId) {
    throw conflict("Já existe uma pessoa com este CPF.");
  }
}

export async function assertUniqueRg(
  ctx: Pick<MutationCtx, "db">,
  rg: string | undefined,
  excludePersonId?: Id<"people">,
): Promise<void> {
  if (!rg) {
    return;
  }

  const existing = await ctx.db
    .query("people")
    .withIndex("by_rg", (q) => q.eq("rg", rg))
    .unique();

  if (existing && existing._id !== excludePersonId) {
    throw conflict("Já existe uma pessoa com este RG.");
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
