import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { validationError } from "../errors";
import {
  buildTutorSnapshot,
  defaultAtribuivelForCategory,
  getOccurrenceTypeByName,
  resolveSeverity,
} from "./occurrences";
import { applyHistoryForOccurrence } from "./tutorDogHistory";
import { validateImageStorage } from "./storage";
import { recordAudit } from "../audit";
import {
  canReadSensitiveTutorData,
  computeTutorAlert,
  getAttributableOccurrences,
} from "./tutors";

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
};

export function validateAdoptionPayload(payload: AdoptionPayloadInput): void {
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

async function resolveTutorBairroId(
  ctx: Pick<QueryCtx, "db">,
  occurrence: Doc<"occurrences">,
): Promise<Id<"bairros"> | undefined> {
  if (occurrence.tutor_snapshot?.bairro_id) {
    return occurrence.tutor_snapshot.bairro_id;
  }
  if (!occurrence.tutor_id) {
    return undefined;
  }
  const tutor = await ctx.db.get("tutors", occurrence.tutor_id);
  return tutor?.bairro_id;
}

export async function computeBairroWarning(
  ctx: Pick<QueryCtx, "db">,
  dogId: Id<"dogs">,
  newTutorId: Id<"tutors">,
): Promise<{ has_warning: boolean; message: string | null; bairro_nome: string | null }> {
  const newTutor = await ctx.db.get("tutors", newTutorId);
  if (!newTutor?.bairro_id) {
    return { has_warning: false, message: null, bairro_nome: null };
  }

  const bairro = await ctx.db.get("bairros", newTutor.bairro_id);
  const occurrences = await ctx.db
    .query("occurrences")
    .withIndex("by_dog", (q) => q.eq("dog_id", dogId))
    .collect();

  for (const occurrence of occurrences) {
    const type = await ctx.db.get("occurrence_types", occurrence.occurrence_type_id);
    if (!type || !RISK_TYPE_NAMES.has(type.nome)) {
      continue;
    }

    const tutorBairroId = await resolveTutorBairroId(ctx, occurrence);
    if (tutorBairroId === newTutor.bairro_id) {
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

export async function buildTutorAssessment(
  ctx: QueryCtx,
  tutorId: Id<"tutors">,
  permissions: readonly string[],
) {
  const tutor = await ctx.db.get("tutors", tutorId);
  if (!tutor) {
    throw validationError("Tutor não encontrado.");
  }

  const bairro = tutor.bairro_id ? await ctx.db.get("bairros", tutor.bairro_id) : null;
  const canSeeSensitive = canReadSensitiveTutorData(permissions);

  if (!canSeeSensitive) {
    return {
      tutor_nome: tutor.nome_completo,
      bairro_nome: bairro?.nome ?? null,
      alert: undefined,
    };
  }

  const alertSummary = await computeTutorAlert(ctx, tutorId);
  const attributable = await getAttributableOccurrences(ctx, tutorId);
  const alertOccurrences = attributable.filter(
    (occurrence) => occurrence.gravidade === "alta" || occurrence.gravidade === "media",
  );

  const occurrences = await Promise.all(
    alertOccurrences.map(async (occurrence) => {
      const dog = await ctx.db.get("dogs", occurrence.dog_id);
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
    tutor_nome: tutor.nome_completo,
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
    new_tutor_id?: Id<"tutors">;
    adoption_payload?: Doc<"occurrences">["adoption_payload"];
    photo_storage_ids: Id<"_storage">[];
    bairro_id?: Id<"bairros">;
    atribuivel_ao_tutor?: boolean;
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
  const atribuivel = args.atribuivel_ao_tutor ?? defaultAtribuivelForCategory(type.categoria);

  let tutorId = args.dog.tutor_atual_id;
  let tutorSnapshot: Awaited<ReturnType<typeof buildTutorSnapshot>> | undefined;

  if (args.typeName === "Adoção" || args.typeName === "Transferência de Tutor") {
    if (!args.new_tutor_id) {
      throw validationError("Informe o tutor de destino.");
    }
    tutorId = args.new_tutor_id;
    tutorSnapshot = await buildTutorSnapshot(ctx, args.new_tutor_id);
  } else if (tutorId) {
    tutorSnapshot = await buildTutorSnapshot(ctx, tutorId);
  }

  const now = Date.now();
  const occurrenceId = await ctx.db.insert("occurrences", {
    dog_id: args.dog._id,
    tutor_id: tutorId,
    tutor_snapshot: tutorSnapshot,
    atribuivel_ao_tutor: atribuivel,
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
    newTutorId: args.new_tutor_id,
  });

  return occurrenceId;
}
