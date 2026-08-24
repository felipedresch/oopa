import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { validationError } from "../errors";

export async function getVigenteHistory(
  ctx: Pick<MutationCtx, "db">,
  dogId: Id<"dogs">,
): Promise<Doc<"person_dog_history"> | null> {
  const entries = await ctx.db
    .query("person_dog_history")
    .withIndex("by_dog", (q) => q.eq("dog_id", dogId))
    .collect();

  const vigentes = entries.filter((entry) => entry.fim === undefined);
  if (vigentes.length > 1) {
    throw validationError("Mais de um histórico vigente para o mesmo cão.");
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
    pessoa_id: Id<"people">;
    inicio: number;
    tipo_inicio: string;
    occurrence_id_inicio?: Id<"occurrences">;
  },
): Promise<Id<"person_dog_history">> {
  const vigente = await getVigenteHistory(ctx, args.dog_id);
  if (vigente) {
    throw validationError("Já existe histórico vigente para este cão.");
  }

  return await ctx.db.insert("person_dog_history", {
    dog_id: args.dog_id,
    pessoa_id: args.pessoa_id,
    inicio: args.inicio,
    tipo_inicio: args.tipo_inicio,
    occurrence_id_inicio: args.occurrence_id_inicio,
  });
}

export async function syncDogPersonFromHistory(
  ctx: Pick<MutationCtx, "db">,
  dogId: Id<"dogs">,
): Promise<void> {
  const vigente = await getVigenteHistory(ctx, dogId);
  await ctx.db.patch(dogId, {
    pessoa_atual_id: vigente?.pessoa_id,
  });
}

export async function applyHistoryForOccurrence(
  ctx: Pick<MutationCtx, "db">,
  args: {
    dog: Doc<"dogs">;
    occurrenceId: Id<"occurrences">;
    typeName: string;
    occurredAt: number;
    newPessoaId?: Id<"people">;
  },
): Promise<void> {
  const { dog, occurrenceId, typeName, occurredAt, newPessoaId } = args;

  switch (typeName) {
    case "Adoção": {
      if (!newPessoaId) {
        throw validationError("Adoção exige pessoa de destino.");
      }
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await openHistory(ctx, {
        dog_id: dog._id,
        pessoa_id: newPessoaId,
        inicio: occurredAt,
        tipo_inicio: typeName,
        occurrence_id_inicio: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        pessoa_atual_id: newPessoaId,
        status_atual: "adotado",
      });
      return;
    }
    case "Transferência de Tutor": {
      if (!newPessoaId) {
        throw validationError("Transferência exige pessoa de destino.");
      }
      await closeVigenteHistory(ctx, dog._id, {
        fim: occurredAt,
        tipo_fim: typeName,
        occurrence_id_fim: occurrenceId,
      });
      await openHistory(ctx, {
        dog_id: dog._id,
        pessoa_id: newPessoaId,
        inicio: occurredAt,
        tipo_inicio: typeName,
        occurrence_id_inicio: occurrenceId,
      });
      await ctx.db.patch(dog._id, {
        pessoa_atual_id: newPessoaId,
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
        pessoa_atual_id: undefined,
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
        pessoa_atual_id: undefined,
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
        pessoa_atual_id: undefined,
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
