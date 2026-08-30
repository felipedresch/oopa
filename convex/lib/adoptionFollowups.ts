import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

const MONTHS_IN_FIRST_FOLLOWUP = 3;

/**
 * Adds calendar months instead of a fixed number of milliseconds. This keeps
 * the follow-up on the expected day and clamps dates such as January 31 to the
 * last valid day of the target month.
 */
export function addCalendarMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  const originalDay = date.getUTCDate();

  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));

  return date.getTime();
}

export async function createInitialAdoptionFollowup(
  ctx: MutationCtx,
  args: {
    dogId: Id<"dogs">;
    pessoaId: Id<"people">;
    occurrenceIdAdocao: Id<"occurrences">;
    dataAdocao: number;
    actorId: Id<"users">;
  },
): Promise<Id<"adoption_followups">> {
  return await ctx.db.insert("adoption_followups", {
    dog_id: args.dogId,
    pessoa_id: args.pessoaId,
    occurrence_id_adocao: args.occurrenceIdAdocao,
    data_prevista: addCalendarMonths(args.dataAdocao, MONTHS_IN_FIRST_FOLLOWUP),
    sequencia: 1,
    status: "pendente",
    tentativas: 0,
    criado_em: Date.now(),
    criado_por: args.actorId,
  });
}
