import { v } from "convex/values";

export const MICROCHIP_LENGTH = 15;

export const dogSpeciesValidator = v.union(v.literal("cao"), v.literal("gato"));

export const dogSexValidator = v.union(v.literal("macho"), v.literal("femea"));

export const dogSizeValidator = v.union(
  v.literal("pequeno"),
  v.literal("medio"),
  v.literal("grande"),
);

export const dogStatusValidator = v.union(
  v.literal("na_ong"),
  v.literal("adotado"),
  v.literal("desaparecido"),
  v.literal("falecido"),
  v.literal("transferido"),
  v.literal("comunitario"),
);

export const severityValidator = v.union(
  v.literal("info"),
  v.literal("baixa"),
  v.literal("media"),
  v.literal("alta"),
);

export const occurrenceCategoryValidator = v.union(
  v.literal("rotina"),
  v.literal("clinica"),
  v.literal("risco"),
  v.literal("legal"),
  v.literal("adocao"),
  v.literal("outro"),
  v.literal("denuncia_externa"),
);

export const personPapelValidator = v.union(
  v.literal("tutor"),
  v.literal("denunciante"),
  v.literal("solicitante_castracao"),
  v.literal("solicitante_resgate"),
);

export const notificationTypeValidator = v.union(
  v.literal("legal_occurrence"),
  v.literal("dog_not_found"),
  v.literal("system"),
  v.literal("rescue_alert"),
  v.literal("microchip_pendente"),
);

export const entityTypeValidator = v.union(
  v.literal("user"),
  v.literal("dog"),
  v.literal("person"),
  v.literal("occurrence"),
  v.literal("permission_template"),
  v.literal("bairro"),
  v.literal("occurrence_type"),
  v.literal("public_report"),
  v.literal("rescue_request"),
  v.literal("castration_request"),
  v.literal("organization_settings"),
  v.literal("service"),
  v.literal("supply"),
  v.literal("appointment"),
  v.literal("medical_record"),
);

export const publicReportStatusValidator = v.union(
  v.literal("novo"),
  v.literal("em_analise"),
  v.literal("convertido"),
  v.literal("arquivado"),
);

export const rescueStatusValidator = v.union(
  v.literal("aberta"),
  v.literal("em_atendimento"),
  v.literal("concluida"),
  v.literal("cancelada"),
);

export const castrationStatusValidator = v.union(
  v.literal("aguardando"),
  v.literal("agendada"),
  v.literal("realizada"),
  v.literal("cancelada"),
  v.literal("nao_compareceu"),
);

export const castrationAnimalDescricaoValidator = v.object({
  nome: v.optional(v.string()),
  especie: dogSpeciesValidator,
  porte: dogSizeValidator,
  sexo: dogSexValidator,
  cor: v.optional(v.string()),
});

export const serviceCategoryValidator = v.union(
  v.literal("consulta"),
  v.literal("vacina"),
  v.literal("cirurgia"),
  v.literal("castracao"),
  v.literal("exame"),
  v.literal("outro"),
);

export const appointmentTypeValidator = v.union(
  v.literal("consulta"),
  v.literal("vacina"),
  v.literal("cirurgia"),
  v.literal("exame"),
  v.literal("castracao"),
  v.literal("emergencia"),
  v.literal("outro"),
);

export const appointmentStatusValidator = v.union(
  v.literal("agendado"),
  v.literal("realizado"),
  v.literal("cancelado"),
);

export const supplyCategoryValidator = v.union(
  v.literal("medicamento"),
  v.literal("material"),
  v.literal("vacina"),
  v.literal("outro"),
);

export const adoptionPayloadValidator = v.object({
  data_adocao: v.number(),
  numero_termo_adocao: v.string(),
  responsavel_ong_user_id: v.id("users"),
  condicoes_adocao: v.string(),
  observacoes_adocao: v.optional(v.string()),
  confirmou_documentos: v.boolean(),
  confirmou_orientacoes: v.boolean(),
  termo_adocao_storage_id: v.optional(v.id("_storage")),
});

export const personSnapshotValidator = v.object({
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
  bairro_nome: v.optional(v.string()),
  data_nascimento: v.optional(v.number()),
  observacoes: v.optional(v.string()),
});

export const paginationOptsValidator = v.object({
  cursor: v.union(v.string(), v.null()),
  numItems: v.number(),
});

export const permissionStringValidator = v.string();

export function isValidMicrochip(value: string): boolean {
  return /^\d{15}$/.test(value);
}

export function normalizeMicrochip(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calculateDigit = (slice: string, factor: number) => {
    let total = 0;
    for (const char of slice) {
      total += Number(char) * factor--;
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 9), 10);
  const secondDigit = calculateDigit(digits.slice(0, 10), 11);
  return firstDigit === Number(digits[9]) && secondDigit === Number(digits[10]);
}

export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCnpj(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calculateDigit = (slice: string, weights: number[]) => {
    let total = 0;
    for (let i = 0; i < slice.length; i++) {
      total += Number(slice[i]) * weights[i];
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return firstDigit === Number(digits[12]) && secondDigit === Number(digits[13]);
}

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 11;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidCep(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\D/g, ""));
}

export function normalizeCep(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * RG normalizado: apenas dígitos e um eventual dígito verificador "X" final.
 * O formato do RG varia entre estados, então mantemos a validação flexível.
 */
export function normalizeRg(value: string): string {
  return value.toUpperCase().replace(/[^0-9X]/g, "");
}

export function isValidRg(value: string): boolean {
  const cleaned = normalizeRg(value);
  return cleaned.length >= 5 && cleaned.length <= 9;
}

export const VALIDATION_MESSAGES = {
  microchip: "Microchip deve ter exatamente 15 dígitos numéricos.",
  cpf: "CPF inválido.",
  cnpj: "CNPJ inválido.",
  rg: "RG deve ter entre 5 e 9 caracteres.",
  phone: "Telefone deve ter 10 ou 11 dígitos.",
  email: "Email inválido.",
  cep: "CEP deve ter 8 dígitos.",
  required: "Campo obrigatório.",
} as const;
