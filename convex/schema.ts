import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  adoptionPayloadValidator,
  dogSexValidator,
  dogSizeValidator,
  dogStatusValidator,
  entityTypeValidator,
  notificationTypeValidator,
  occurrenceCategoryValidator,
  permissionStringValidator,
  severityValidator,
  tutorSnapshotValidator,
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
    microchip: v.string(),
    nome: v.string(),
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
    tutor_atual_id: v.optional(v.id("tutors")),
    observacoes: v.optional(v.string()),
    ...timestampFields,
  })
    .index("by_microchip", ["microchip"])
    .index("by_status", ["status_atual"])
    .index("by_tutor", ["tutor_atual_id"]),

  dog_photos: defineTable({
    dog_id: v.id("dogs"),
    storage_id: v.id("_storage"),
    descricao: v.optional(v.string()),
    criado_em: v.number(),
    criado_por: v.optional(v.id("users")),
  }).index("by_dog", ["dog_id"]),

  tutors: defineTable({
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
    ...timestampFields,
  })
    .index("by_cpf", ["cpf"])
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
    dog_id: v.id("dogs"),
    tutor_id: v.optional(v.id("tutors")),
    tutor_snapshot: v.optional(tutorSnapshotValidator),
    atribuivel_ao_tutor: v.boolean(),
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
    .index("by_tutor", ["tutor_id"])
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

  tutor_dog_history: defineTable({
    dog_id: v.id("dogs"),
    tutor_id: v.id("tutors"),
    inicio: v.number(),
    fim: v.optional(v.number()),
    tipo_inicio: v.string(),
    tipo_fim: v.optional(v.string()),
    occurrence_id_inicio: v.optional(v.id("occurrences")),
    occurrence_id_fim: v.optional(v.id("occurrences")),
  })
    .index("by_dog", ["dog_id"])
    .index("by_tutor", ["tutor_id"]),

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
  }).index("by_user_unread", ["user_id", "lida"]),

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
});
