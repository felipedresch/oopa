import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import {
  dogSexValidator,
  dogSizeValidator,
  dogStatusValidator,
  isValidMicrochip,
  normalizeMicrochip,
} from "../domainValidators";
import { validationError } from "../errors";
import { hasPermission } from "../permissions";

export const GRAVE_OCCURRENCE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

export const dogFieldsValidator = {
  microchip: (value: string) => normalizeMicrochip(value),
  nome: (value: string) => value.trim(),
};

export function assertValidMicrochip(value: string): string {
  const microchip = normalizeMicrochip(value);
  if (!isValidMicrochip(microchip)) {
    throw validationError("Microchip deve ter exatamente 15 digitos numericos.");
  }
  return microchip;
}

export async function dogHasRecentGraveOccurrence(
  ctx: Pick<QueryCtx, "db">,
  dogId: Id<"dogs">,
  now: number,
): Promise<boolean> {
  const cutoff = now - GRAVE_OCCURRENCE_WINDOW_MS;
  const occurrences = await ctx.db
    .query("occurrences")
    .withIndex("by_dog", (q) => q.eq("dog_id", dogId))
    .collect();

  return occurrences.some(
    (occurrence) => occurrence.gravidade === "alta" && occurrence.data_ocorrencia >= cutoff,
  );
}

export function canReadDogs(permissions: readonly string[]): boolean {
  return hasPermission(permissions, "dogs.read");
}

export function filterDogForViewer(
  dog: Doc<"dogs">,
  permissions: readonly string[],
) {
  const canSeeHealthNotes = hasPermission(permissions, "dogs.edit");
  const canSeeTutor = hasPermission(permissions, "tutors.read");

  return {
    _id: dog._id,
    microchip: dog.microchip,
    nome: dog.nome,
    sexo: dog.sexo,
    data_nascimento_aproximada: dog.data_nascimento_aproximada,
    porte: dog.porte,
    raca_aparente: dog.raca_aparente,
    cor_pelagem: dog.cor_pelagem,
    caracteristicas_visuais: dog.caracteristicas_visuais,
    caracteristicas_comportamentais: dog.caracteristicas_comportamentais,
    condicoes_saude: canSeeHealthNotes ? dog.condicoes_saude : undefined,
    castrado: dog.castrado,
    vacinas_em_dia: dog.vacinas_em_dia,
    foto_perfil_storage_id: dog.foto_perfil_storage_id,
    status_atual: dog.status_atual,
    tutor_atual_id: canSeeTutor ? dog.tutor_atual_id : undefined,
    observacoes: canSeeHealthNotes ? dog.observacoes : undefined,
    criado_em: dog.criado_em,
    criado_por: dog.criado_por,
    atualizado_em: dog.atualizado_em,
    atualizado_por: dog.atualizado_por,
  };
}

export { dogSexValidator, dogSizeValidator, dogStatusValidator };
