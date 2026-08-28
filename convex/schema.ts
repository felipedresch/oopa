import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  adoptionPayloadValidator,
  castrationAnimalDescricaoValidator,
  castrationStatusValidator,
  dogSexValidator,
  dogSizeValidator,
  dogSpeciesValidator,
  dogStatusValidator,
  entityTypeValidator,
  notificationTypeValidator,
  occurrenceCategoryValidator,
  permissionStringValidator,
  personPapelValidator,
  personSnapshotValidator,
  publicReportStatusValidator,
  rescueStatusValidator,
  serviceCategoryValidator,
  severityValidator,
  supplyCategoryValidator,
} from "./domainValidators";
import { permissionValidator } from "./permissions";

const auditMetadataFields = {
  actor_user_id: v.optional(v.id("users")),
  action: v.string(),
  entity_type: entityTypeValidator,
  entity_id: v.optional(v.string()),
  summary: v.string(),
  metadata: v.optional(v.any()),
  created_at: v.number(),
};

const timestampFields = {
  criado_em: v.number(),
  criado_por: v.optional(v.id("users")),
  atualizado_em: v.optional(v.number()),
  atualizado_por: v.optional(v.id("users")),
};

const { users: _authUsersTable, ...otherAuthTables } = authTables;
void _authUsersTable;

export default defineSchema({
  ...otherAuthTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    nome: v.string(),
    telefone: v.optional(v.string()),
    organizacao: v.string(),
    ativo: v.boolean(),
    permissions: v.array(permissionStringValidator),
    ultimo_acesso_em: v.optional(v.number()),
    veterinario: v.optional(v.boolean()),
    receber_alertas_resgate: v.optional(v.boolean()),
    ...timestampFields,
  })
    .index("email", ["email"])
    .index("by_active", ["ativo"]),

  user_invites: defineTable({
    user_id: v.id("users"),
    email: v.string(),
    token_hash: v.string(),
    expires_at: v.number(),
    used_at: v.optional(v.number()),
    criado_em: v.number(),
    criado_por: v.id("users"),
  })
    .index("by_token_hash", ["token_hash"])
    .index("by_email", ["email"]),

  password_reset_tokens: defineTable({
    user_id: v.id("users"),
    email: v.string(),
    token_hash: v.string(),
    expires_at: v.number(),
    used_at: v.optional(v.number()),
    criado_em: v.number(),
  }).index("by_token_hash", ["token_hash"]),

  permission_templates: defineTable({
    nome: v.string(),
    descricao: v.string(),
    permissions: v.array(permissionValidator),
    ativo: v.boolean(),
    ...timestampFields,
  }),

  dogs: defineTable({
    microchip: v.optional(v.string()),
    nome: v.string(),
    especie: v.optional(dogSpeciesValidator),
    sexo: dogSexValidator,
    data_nascimento_aproximada: v.optional(v.number()),
    porte: dogSizeValidator,
    raca_aparente: v.optional(v.string()),
    cor_pelagem: v.optional(v.string()),
    caracteristicas_visuais: v.optional(v.string()),
    caracteristicas_comportamentais: v.optional(v.string()),
    condicoes_saude: v.optional(v.string()),
    castrado: v.boolean(),
    vacinas_em_dia: v.boolean(),
    foto_perfil_storage_id: v.optional(v.id("_storage")),
    status_atual: dogStatusValidator,
    pessoa_atual_id: v.optional(v.id("people")),
    observacoes: v.optional(v.string()),
    ...timestampFields,
  })
    .index("by_microchip", ["microchip"])
    .index("by_status", ["status_atual"])
    .index("by_pessoa", ["pessoa_atual_id"]),

  dog_photos: defineTable({
    dog_id: v.id("dogs"),
    storage_id: v.id("_storage"),
    descricao: v.optional(v.string()),
    criado_em: v.number(),
    criado_por: v.optional(v.id("users")),
  }).index("by_dog", ["dog_id"]),

  people: defineTable({
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
    ...timestampFields,
  })
    .index("by_cpf", ["cpf"])
    .index("by_rg", ["rg"])
    .index("by_bairro", ["bairro_id"]),

  bairros: defineTable({
    nome: v.string(),
    ativo: v.boolean(),
    ...timestampFields,
  }).index("by_nome", ["nome"]),

  occurrence_types: defineTable({
    nome: v.string(),
    categoria: occurrenceCategoryValidator,
    requer_foto: v.boolean(),
    gravidade_padrao: severityValidator,
    ativo: v.boolean(),
    ...timestampFields,
  }),

  occurrences: defineTable({
    dog_id: v.optional(v.id("dogs")),
    pessoa_id: v.optional(v.id("people")),
    pessoa_snapshot: v.optional(personSnapshotValidator),
    atribuivel_a_pessoa: v.boolean(),
    occurrence_type_id: v.id("occurrence_types"),
    gravidade: severityValidator,
    data_ocorrencia: v.number(),
    bairro_id: v.optional(v.id("bairros")),
    local_descricao: v.optional(v.string()),
    descricao: v.string(),
    registrado_por: v.id("users"),
    original_id: v.optional(v.id("occurrences")),
    adoption_payload: v.optional(adoptionPayloadValidator),
    criado_em: v.number(),
  })
    .index("by_dog", ["dog_id"])
    .index("by_pessoa", ["pessoa_id"])
    .index("by_type", ["occurrence_type_id"])
    .index("by_gravity", ["gravidade"])
    .index("by_bairro", ["bairro_id"])
    .index("by_date", ["data_ocorrencia"]),

  occurrence_photos: defineTable({
    occurrence_id: v.id("occurrences"),
    storage_id: v.id("_storage"),
    descricao: v.optional(v.string()),
    criado_em: v.number(),
    criado_por: v.optional(v.id("users")),
  }).index("by_occurrence", ["occurrence_id"]),

  person_dog_history: defineTable({
    dog_id: v.id("dogs"),
    pessoa_id: v.id("people"),
    inicio: v.number(),
    fim: v.optional(v.number()),
    tipo_inicio: v.string(),
    tipo_fim: v.optional(v.string()),
    occurrence_id_inicio: v.optional(v.id("occurrences")),
    occurrence_id_fim: v.optional(v.id("occurrences")),
  })
    .index("by_dog", ["dog_id"])
    .index("by_pessoa", ["pessoa_id"]),

  notifications: defineTable({
    user_id: v.id("users"),
    tipo: notificationTypeValidator,
    titulo: v.string(),
    mensagem: v.string(),
    entidade_tipo: v.optional(entityTypeValidator),
    entidade_id: v.optional(v.string()),
    lida: v.boolean(),
    criado_em: v.number(),
    lida_em: v.optional(v.number()),
  })
    .index("by_user_unread", ["user_id", "lida"])
    .index("by_user_and_created", ["user_id", "criado_em"]),

  audit_logs: defineTable(auditMetadataFields).index("by_created_at", ["created_at"]),

  ocr_logs: defineTable({
    user_id: v.id("users"),
    success: v.boolean(),
    candidate: v.optional(v.string()),
    confidence: v.optional(v.number()),
    failure_code: v.optional(v.string()),
    failure_message: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_created_at", ["created_at"]),

  public_reports: defineTable({
    nome_denunciante: v.optional(v.string()),
    contato: v.optional(v.string()),
    tipo_denuncia: v.string(),
    descricao: v.string(),
    bairro_id: v.optional(v.id("bairros")),
    local_descricao: v.optional(v.string()),
    fotos: v.array(v.id("_storage")),
    status: publicReportStatusValidator,
    occurrence_id_gerada: v.optional(v.id("occurrences")),
    criado_em: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_bairro", ["bairro_id"]),

  rescue_requests: defineTable({
    solicitante_id: v.optional(v.id("people")),
    tipo: v.string(),
    gravidade: severityValidator,
    descricao_solicitante: v.string(),
    bairro_id: v.optional(v.id("bairros")),
    local_descricao: v.optional(v.string()),
    status: rescueStatusValidator,
    descricao_ong: v.optional(v.string()),
    dog_id: v.optional(v.id("dogs")),
    fotos: v.array(v.id("_storage")),
    criado_por: v.id("users"),
    criado_em: v.number(),
    atualizado_em: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_gravity", ["gravidade"])
    .index("by_bairro", ["bairro_id"])
    .index("by_dog", ["dog_id"]),

  castration_requests: defineTable({
    pessoa_id: v.id("people"),
    dog_id: v.optional(v.id("dogs")),
    animal_descricao: castrationAnimalDescricaoValidator,
    data_solicitacao: v.number(),
    data_agendada: v.optional(v.number()),
    status: castrationStatusValidator,
    observacoes: v.optional(v.string()),
    criado_por: v.id("users"),
    criado_em: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_data_solicitacao", ["data_solicitacao"])
    .index("by_pessoa", ["pessoa_id"])
    .index("by_dog", ["dog_id"]),

  organization_settings: defineTable({
    razao_social: v.string(),
    nome_fantasia: v.optional(v.string()),
    cnpj: v.string(),
    inscricao_estadual: v.optional(v.string()),
    endereco_logradouro: v.optional(v.string()),
    endereco_numero: v.optional(v.string()),
    endereco_complemento: v.optional(v.string()),
    endereco_cep: v.optional(v.string()),
    bairro_id: v.optional(v.id("bairros")),
    telefone: v.optional(v.string()),
    email: v.optional(v.string()),
    logo_storage_id: v.optional(v.id("_storage")),
    atualizado_em: v.optional(v.number()),
    atualizado_por: v.optional(v.id("users")),
  }),

  services: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
    categoria: serviceCategoryValidator,
    valor_padrao: v.number(),
    ativo: v.boolean(),
    ...timestampFields,
  }),

  supplies: defineTable({
    nome: v.string(),
    descricao: v.optional(v.string()),
    categoria: supplyCategoryValidator,
    unidade_medida: v.optional(v.string()),
    valor_padrao: v.number(),
    ativo: v.boolean(),
    ...timestampFields,
  }),
});
