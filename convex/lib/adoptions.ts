import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { validationError } from "../errors";
import {
  buildPersonSnapshot,
  defaultAtribuivelForCategory,
  getOccurrenceTypeByName,
  resolveSeverity,
} from "./occurrences";
import { applyHistoryForOccurrence } from "./personDogHistory";
import { validateImageStorage } from "./storage";
import { recordAudit } from "../audit";
import {
  canReadSensitivePersonData,
  computePersonAlert,
  getAttributableOccurrences,
} from "./people";

export const BAIRRO_WARNING_MESSAGE =
  "Este cão já teve devolução ou abandono suspeito associado a tutor deste bairro. Revise antes de concluir.";

const RISK_TYPE_NAMES = new Set(["Devolução a ONG", "Abandono Suspeito"]);

export type AdoptionPayloadInput = {
  data_adocao: number;
  numero_termo_adocao: string;
  responsavel_ong_user_id: Id<"users">;
  condicoes_adocao: string;
  observacoes_adocao?: string;
  confirmou_documentos: boolean;
  confirmou_orientacoes: boolean;
  termo_adocao_storage_id?: Id<"_storage">;
};

export function validateAdoptionPayload(payload: AdoptionPayloadInput): void {
  if (!Number.isFinite(payload.data_adocao) || payload.data_adocao <= 0) {
    throw validationError("Data de adoção inválida.");
  }
  if (!payload.numero_termo_adocao.trim()) {
    throw validationError("Número do termo de adoção obrigatório.");
  }
  if (!payload.condicoes_adocao.trim()) {
    throw validationError("Condições de adoção obrigatórias.");
  }
  if (!payload.confirmou_documentos) {
    throw validationError("Confirme a entrega dos documentos.");
  }
  if (!payload.confirmou_orientacoes) {
    throw validationError("Confirme as orientacoes ao tutor.");
  }
}

async function resolvePersonBairroId(
  ctx: Pick<QueryCtx, "db">,
  occurrence: Doc<"occurrences">,
): Promise<Id<"bairros"> | undefined> {
  if (occurrence.pessoa_snapshot?.bairro_id) {
    return occurrence.pessoa_snapshot.bairro_id;
  }
  if (!occurrence.pessoa_id) {
    return undefined;
  }
  const pessoa = await ctx.db.get("people", occurrence.pessoa_id);
  return pessoa?.bairro_id;
}

export async function computeBairroWarning(
  ctx: Pick<QueryCtx, "db">,
  dogId: Id<"dogs">,
  newPessoaId: Id<"people">,
): Promise<{ has_warning: boolean; message: string | null; bairro_nome: string | null }> {
  const newPessoa = await ctx.db.get("people", newPessoaId);
  if (!newPessoa?.bairro_id) {
    return { has_warning: false, message: null, bairro_nome: null };
  }

  const bairro = await ctx.db.get("bairros", newPessoa.bairro_id);
  const occurrences = await ctx.db
    .query("occurrences")
    .withIndex("by_dog", (q) => q.eq("dog_id", dogId))
    .collect();

  for (const occurrence of occurrences) {
    const type = await ctx.db.get("occurrence_types", occurrence.occurrence_type_id);
    if (!type || !RISK_TYPE_NAMES.has(type.nome)) {
      continue;
    }

    const pessoaBairroId = await resolvePersonBairroId(ctx, occurrence);
    if (pessoaBairroId === newPessoa.bairro_id) {
      return {
        has_warning: true,
        message: BAIRRO_WARNING_MESSAGE,
        bairro_nome: bairro?.nome ?? null,
      };
    }
  }

  return {
    has_warning: false,
    message: null,
    bairro_nome: bairro?.nome ?? null,
  };
}

export async function buildPersonAssessment(
  ctx: QueryCtx,
  pessoaId: Id<"people">,
  permissions: readonly string[],
) {
  const pessoa = await ctx.db.get("people", pessoaId);
  if (!pessoa) {
    throw validationError("Pessoa não encontrada.");
  }

  const bairro = pessoa.bairro_id ? await ctx.db.get("bairros", pessoa.bairro_id) : null;
  const canSeeSensitive = canReadSensitivePersonData(permissions);

  if (!canSeeSensitive) {
    return {
      pessoa_nome: pessoa.nome_completo,
      bairro_nome: bairro?.nome ?? null,
      alert: undefined,
    };
  }

  const alertSummary = await computePersonAlert(ctx, pessoaId);
  const attributable = await getAttributableOccurrences(ctx, pessoaId);
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
        dog_nome: dog?.nome ?? "Cão removido",
      };
    }),
  );

  return {
    pessoa_nome: pessoa.nome_completo,
    bairro_nome: bairro?.nome ?? null,
    alert: {
      level: alertSummary.level,
      alta_count: alertSummary.altaCount,
      media_count: alertSummary.mediaCount,
      occurrences,
    },
  };
}

async function insertOccurrencePhotos(
  ctx: MutationCtx,
  occurrenceId: Id<"occurrences">,
  storageIds: Id<"_storage">[],
  actorId: Id<"users">,
): Promise<void> {
  for (const storageId of storageIds) {
    await validateImageStorage(ctx, storageId);
    await ctx.db.insert("occurrence_photos", {
      occurrence_id: occurrenceId,
      storage_id: storageId,
      criado_em: Date.now(),
      criado_por: actorId,
    });

    await recordAudit(ctx, {
      actorUserId: actorId,
      action: "occurrence_photos.add",
      entityType: "occurrence",
      entityId: occurrenceId,
      summary: "Foto adicionada a ocorrência",
    });
  }
}

export async function createOccurrenceWithHistory(
  ctx: MutationCtx,
  actor: Doc<"users">,
  args: {
    dog: Doc<"dogs">;
    typeName: string;
    descricao: string;
    data_ocorrencia: number;
    new_pessoa_id?: Id<"people">;
    adoption_payload?: Doc<"occurrences">["adoption_payload"];
    photo_storage_ids: Id<"_storage">[];
    bairro_id?: Id<"bairros">;
    atribuivel_a_pessoa?: boolean;
  },
): Promise<Id<"occurrences">> {
  const type = await getOccurrenceTypeByName(ctx, args.typeName);
  if (!type?.ativo) {
    throw validationError(`Tipo de ocorrência indisponível: ${args.typeName}`);
  }

  if (type.requer_foto && args.photo_storage_ids.length === 0) {
    throw validationError("Este tipo exige pelo menos uma foto.");
  }

  const gravidade = resolveSeverity(type.gravidade_padrao, undefined);
  const atribuivel = args.atribuivel_a_pessoa ?? defaultAtribuivelForCategory(type.categoria);

  let pessoaId = args.dog.pessoa_atual_id;
  let pessoaSnapshot: Awaited<ReturnType<typeof buildPersonSnapshot>> | undefined;

  if (args.typeName === "Adoção" || args.typeName === "Transferência de Tutor") {
    if (!args.new_pessoa_id) {
      throw validationError("Informe a pessoa de destino.");
    }
    pessoaId = args.new_pessoa_id;
    pessoaSnapshot = await buildPersonSnapshot(ctx, args.new_pessoa_id);
  } else if (pessoaId) {
    pessoaSnapshot = await buildPersonSnapshot(ctx, pessoaId);
  }

  const now = Date.now();
  const occurrenceId = await ctx.db.insert("occurrences", {
    dog_id: args.dog._id,
    pessoa_id: pessoaId,
    pessoa_snapshot: pessoaSnapshot,
    atribuivel_a_pessoa: atribuivel,
    occurrence_type_id: type._id,
    gravidade,
    data_ocorrencia: args.data_ocorrencia,
    bairro_id: args.bairro_id,
    descricao: args.descricao.trim(),
    registrado_por: actor._id,
    adoption_payload: args.adoption_payload,
    criado_em: now,
  });

  if (args.photo_storage_ids.length > 0) {
    await insertOccurrencePhotos(ctx, occurrenceId, args.photo_storage_ids, actor._id);
  }

  await applyHistoryForOccurrence(ctx, {
    dog: args.dog,
    occurrenceId,
    typeName: args.typeName,
    occurredAt: args.data_ocorrencia,
    newPessoaId: args.new_pessoa_id,
  });

  return occurrenceId;
}

export async function createAdoptionFollowupVisit(
  ctx: MutationCtx,
  actor: Doc<"users">,
  args: {
    dogId: Id<"dogs">;
    pessoaId: Id<"people">;
    data_ocorrencia: number;
    descricao: string;
  },
): Promise<Id<"occurrences">> {
  const dog = await ctx.db.get("dogs", args.dogId);
  if (!dog) {
    throw validationError("Cão não encontrado para o acompanhamento.");
  }

  const person = await ctx.db.get("people", args.pessoaId);
  if (!person) {
    throw validationError("Tutor não encontrado para o acompanhamento.");
  }

  return await createOccurrenceWithHistory(ctx, actor, {
    dog: { ...dog, pessoa_atual_id: args.pessoaId },
    typeName: "Visita de acompanhamento",
    descricao: args.descricao,
    data_ocorrencia: args.data_ocorrencia,
    photo_storage_ids: [],
    atribuivel_a_pessoa: false,
  });
}
