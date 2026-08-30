import { type Infer, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import {
  calendarEntityTypeValidator,
  calendarEventTypeValidator,
} from "./domainValidators";
import { validationError } from "./errors";
import { hasPermission } from "./permissions";

/** Limite padrão e máximo de eventos retornados por consulta. */
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

/** Nomes exibidos no título do evento por tipo de atendimento. */
const APPOINTMENT_TYPE_TITLES: Record<Doc<"service_appointments">["tipo_atendimento"], string> = {
  consulta: "Consulta",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  castracao: "Castração",
  emergencia: "Emergência",
  outro: "Atendimento",
};

const calendarEventValidator = v.object({
  data: v.number(),
  tipo: calendarEventTypeValidator,
  titulo: v.string(),
  entidade_tipo: calendarEntityTypeValidator,
  entidade_id: v.string(),
  status: v.string(),
});

type CalendarEvent = {
  data: number;
  tipo: Infer<typeof calendarEventTypeValidator>;
  titulo: string;
  entidade_tipo: Infer<typeof calendarEntityTypeValidator>;
  entidade_id: string;
  status: string;
};

function withinRange(data: number, inicio?: number, fim?: number): boolean {
  if (inicio !== undefined && data < inicio) {
    return false;
  }
  if (fim !== undefined && data > fim) {
    return false;
  }
  return true;
}

async function dogName(ctx: QueryCtx, dogId: Doc<"dogs">["_id"]): Promise<string> {
  const dog = await ctx.db.get("dogs", dogId);
  return dog?.nome ?? "Animal removido";
}

async function collectAdoptionFollowups(
  ctx: QueryCtx,
  inicio: number | undefined,
  fim: number | undefined,
  limit: number,
): Promise<CalendarEvent[]> {
  const followups = await ctx.db
    .query("adoption_followups")
    .withIndex("by_status_and_due", (q) => {
      const scoped = q.eq("status", "pendente");
      if (inicio !== undefined && fim !== undefined) {
        return scoped.gte("data_prevista", inicio).lte("data_prevista", fim);
      }
      if (inicio !== undefined) {
        return scoped.gte("data_prevista", inicio);
      }
      if (fim !== undefined) {
        return scoped.lte("data_prevista", fim);
      }
      return scoped;
    })
    .order("asc")
    .take(limit);

  return await Promise.all(
    followups.map(async (followup) => ({
      data: followup.data_prevista,
      tipo: "lembrete_adocao" as const,
      titulo: `Acompanhamento pós-adoção — ${await dogName(ctx, followup.dog_id)}`,
      entidade_tipo: "adoption_followup" as const,
      entidade_id: followup._id,
      status: followup.status,
    })),
  );
}

async function collectCastrations(
  ctx: QueryCtx,
  inicio: number | undefined,
  fim: number | undefined,
  limit: number,
): Promise<CalendarEvent[]> {
  const requests = await ctx.db
    .query("castration_requests")
    .withIndex("by_status_and_data_agendada", (q) => {
      const scoped = q.eq("status", "agendada");
      if (inicio !== undefined && fim !== undefined) {
        return scoped.gte("data_agendada", inicio).lte("data_agendada", fim);
      }
      if (inicio !== undefined) {
        return scoped.gte("data_agendada", inicio);
      }
      if (fim !== undefined) {
        return scoped.lte("data_agendada", fim);
      }
      return scoped;
    })
    .order("asc")
    .take(limit);

  const events: CalendarEvent[] = [];
  for (const request of requests) {
    if (request.data_agendada === undefined) {
      continue;
    }

    const nome =
      request.animal_descricao.nome?.trim() ||
      (request.dog_id ? await dogName(ctx, request.dog_id) : "Animal sem nome");

    events.push({
      data: request.data_agendada,
      tipo: "castracao",
      titulo: `Castração — ${nome}`,
      entidade_tipo: "castration_request",
      entidade_id: request._id,
      status: request.status,
    });
  }

  return events;
}

async function collectAppointments(
  ctx: QueryCtx,
  inicio: number | undefined,
  fim: number | undefined,
  limit: number,
): Promise<CalendarEvent[]> {
  const appointments = await ctx.db
    .query("service_appointments")
    .withIndex("by_status_and_date", (q) => {
      const scoped = q.eq("status", "agendado");
      if (inicio !== undefined && fim !== undefined) {
        return scoped.gte("data_atendimento", inicio).lte("data_atendimento", fim);
      }
      if (inicio !== undefined) {
        return scoped.gte("data_atendimento", inicio);
      }
      if (fim !== undefined) {
        return scoped.lte("data_atendimento", fim);
      }
      return scoped;
    })
    .order("asc")
    .take(limit);

  return await Promise.all(
    appointments.map(async (appointment) => ({
      data: appointment.data_atendimento,
      tipo: appointment.tipo_atendimento,
      titulo: `${APPOINTMENT_TYPE_TITLES[appointment.tipo_atendimento]} — ${await dogName(
        ctx,
        appointment.dog_id,
      )}`,
      entidade_tipo: "service_appointment" as const,
      entidade_id: appointment._id,
      status: appointment.status,
    })),
  );
}

/**
 * View agregada do calendário (Fase 23). Não tem tabela própria: une
 * acompanhamentos pós-adoção pendentes, castrações agendadas e atendimentos
 * agendados numa forma normalizada, incluindo cada fonte apenas quando o
 * usuário tem a permissão de leitura do módulo correspondente.
 */
export const list = query({
  args: {
    inicio: v.optional(v.number()),
    fim: v.optional(v.number()),
    tipos: v.optional(v.array(calendarEventTypeValidator)),
    limite: v.optional(v.number()),
  },
  returns: v.array(calendarEventValidator),
  handler: async (ctx, args) => {
    const actor = await getCurrentUser(ctx);

    if (args.inicio !== undefined && args.fim !== undefined && args.inicio > args.fim) {
      throw validationError("O período informado é inválido.");
    }

    const limit = Math.min(Math.max(args.limite ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
    const tipos = args.tipos && args.tipos.length > 0 ? new Set(args.tipos) : null;

    const events: CalendarEvent[] = [];

    if (hasPermission(actor.permissions, "adoptions.read")) {
      events.push(...(await collectAdoptionFollowups(ctx, args.inicio, args.fim, limit)));
    }
    if (hasPermission(actor.permissions, "castration.read")) {
      events.push(...(await collectCastrations(ctx, args.inicio, args.fim, limit)));
    }
    if (hasPermission(actor.permissions, "appointments.read")) {
      events.push(...(await collectAppointments(ctx, args.inicio, args.fim, limit)));
    }

    return events
      .filter((event) => withinRange(event.data, args.inicio, args.fim))
      .filter((event) => (tipos ? tipos.has(event.tipo) : true))
      .sort((a, b) => a.data - b.data)
      .slice(0, limit);
  },
});
