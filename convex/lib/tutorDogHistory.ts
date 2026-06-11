import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { validationError } from "../errors";

export async function getVigenteHistory(
  ctx: Pick<MutationCtx, "db">,
  dogId: Id<"dogs">,
): Promise<Doc<"tutor_dog_history"> | null> {
  const entries = await ctx.db
    .query("tutor_dog_history")
    .withIndex("by_dog", (q) => q.eq("dog_id", dogId))
    .collect();

  const vigentes = entries.filter((entry) => entry.fim === undefined);
  if (vigentes.length > 1) {
    throw validationError("Mais de um historico vigente para o mesmo cao.");
  }

  return vigentes[0] ?? null;
}

export async function closeVigenteHistory(
  ctx: Pick<MutationCtx, "db">,
  dogId: Id<"dogs">,
  args: {
    fim: number;
    tipo_fim: string;
    occurrence_id_fim?: Id<"occurrences">;
  },
): Promise<void> {
  const vigente = await getVigenteHistory(ctx, dogId);
  if (!vigente) {
    return;
  }

  await ctx.db.patch(vigente._id, {
    fim: args.fim,
    tipo_fim: args.tipo_fim,
    occurrence_id_fim: args.occurrence_id_fim,
  });
}

export async function openHistory(
  ctx: Pick<MutationCtx, "db">,
  args: {
    dog_id: Id<"dogs">;
    tutor_id: Id<"tutors">;
    inicio: number;
    tipo_inicio: string;
    occurrence_id_inicio?: Id<"occurrences">;
  },
): Promise<Id<"tutor_dog_history">> {
  const vigente = await getVigenteHistory(ctx, args.dog_id);
  if (vigente) {
    throw validationError("Ja existe historico vigente para este cao.");
  }

  return await ctx.db.insert("tutor_dog_history", {
    dog_id: args.dog_id,
    tutor_id: args.tutor_id,
    inicio: args.inicio,
    tipo_inicio: args.tipo_inicio,
    occurrence_id_inicio: args.occurrence_id_inicio,
  });
}

export async function syncDogTutorFromHistory(
  ctx: Pick<MutationCtx, "db">,
  dogId: Id<"dogs">,
): Promise<void> {
  const vigente = await getVigenteHistory(ctx, dogId);
  await ctx.db.patch(dogId, {
    tutor_atual_id: vigente?.tutor_id,
  });
}

export async function applyHistoryForOccurrence(
  ctx: Pick<MutationCtx, "db">,
  args: {
    dog: Doc<"dogs">;
    occurrenceId: Id<"occurrences">;
    typeName: string;
    occurredAt: number;
    newTutorId?: Id<"tutors">;
  },
): Promise<void> {
  const { dog, occurrenceId, typeName, occurredAt, newTutorId } = args;

  switch (typeName) {
    case "Adoção": {
      if (!newTutorId) {
        throw validationError("Adoção exige tutor de destino.");
      }
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await openHistory(ctx, {
        dog_id: dog._id,
        tutor_id: newTutorId,
        inicio: occurredAt,
        tipo_inicio: typeName,
        occurrence_id_inicio: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        tutor_atual_id: newTutorId,
        status_atual: "adotado",
      });
      return;
    }
    case "Transferência de Tutor": {
      if (!newTutorId) {
        throw validationError("Transferência exige tutor de destino.");
      }
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await openHistory(ctx, {
        dog_id: dog._id,
        tutor_id: newTutorId,
        inicio: occurredAt,
        tipo_inicio: typeName,
        occurrence_id_inicio: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        tutor_atual_id: newTutorId,
      });
      return;
    }
    case "Devolução a ONG": {
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        tutor_atual_id: undefined,
        status_atual: "na_ong",
      });
      return;
    }
    case "Abandono Suspeito": {
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        tutor_atual_id: undefined,
      });
      return;
    }
    case "Óbito": {
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        tutor_atual_id: undefined,
        status_atual: "falecido",
      });
      return;
    }
    case "Fuga Confirmada": {
      await ctx.db.patch(dog._id, {
        status_atual: "desaparecido",
      });
      return;
    }
    default:
      return;
  }
}
