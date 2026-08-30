/**
 * Apoio à tela `/calendar` (Fase 23): rótulos dos tipos de evento, presets de
 * período e agrupamento por dia. Mantido puro para ser testável sem Convex.
 */

export type CalendarEventType =
  | "lembrete_adocao"
  | "consulta"
  | "vacina"
  | "cirurgia"
  | "exame"
  | "castracao"
  | "emergencia"
  | "outro";

export type CalendarEntityType =
  | "adoption_followup"
  | "castration_request"
  | "service_appointment";

export type CalendarEvent = {
  data: number;
  tipo: CalendarEventType;
  titulo: string;
  entidade_tipo: CalendarEntityType;
  entidade_id: string;
  status: string;
};

export const CALENDAR_TYPE_LABELS: Record<CalendarEventType, string> = {
  lembrete_adocao: "Lembrete de adoção",
  consulta: "Consulta",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  castracao: "Castração",
  emergencia: "Emergência",
  outro: "Outro",
};

export const CALENDAR_TYPE_ORDER: CalendarEventType[] = [
  "lembrete_adocao",
  "castracao",
  "consulta",
  "vacina",
  "cirurgia",
  "exame",
  "emergencia",
  "outro",
];

export const calendarTypeBadgeClass: Record<CalendarEventType, string> = {
  lembrete_adocao: "bg-success/12 text-success",
  consulta: "bg-info/12 text-info",
  vacina: "bg-info/12 text-info",
  cirurgia: "bg-warning/14 text-warning",
  exame: "bg-info/12 text-info",
  castracao: "bg-warning/14 text-warning",
  emergencia: "bg-destructive/12 text-destructive",
  outro: "bg-muted text-muted-foreground",
};

export type CalendarPeriodPreset =
  | "este_mes"
  | "mes_passado"
  | "ultimos_30"
  | "personalizado";

export const CALENDAR_PERIOD_LABELS: Record<CalendarPeriodPreset, string> = {
  este_mes: "Este mês",
  mes_passado: "Mês passado",
  ultimos_30: "Últimos 30 dias",
  personalizado: "Personalizado",
};

export type CalendarPeriod = { inicio: number; fim: number };

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function endOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  ).getTime();
}

/** Converte um preset em `{ inicio, fim }` antes de consultar o backend. */
export function resolvePeriodPreset(
  preset: Exclude<CalendarPeriodPreset, "personalizado">,
  now: number,
): CalendarPeriod {
  const reference = new Date(now);

  if (preset === "este_mes") {
    const first = new Date(reference.getFullYear(), reference.getMonth(), 1);
    const last = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
    return { inicio: startOfDay(first), fim: endOfDay(last) };
  }

  if (preset === "mes_passado") {
    const first = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
    const last = new Date(reference.getFullYear(), reference.getMonth(), 0);
    return { inicio: startOfDay(first), fim: endOfDay(last) };
  }

  const start = new Date(reference);
  start.setDate(start.getDate() - 29);
  return { inicio: startOfDay(start), fim: endOfDay(reference) };
}

/** Converte as datas `yyyy-MM-dd` do `DatePicker` em um intervalo em ms. */
export function resolveCustomPeriod(
  from: string,
  to: string,
): Partial<CalendarPeriod> {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) {
      return undefined;
    }
    return new Date(year, month - 1, day);
  };

  const start = parse(from);
  const end = parse(to);

  return {
    ...(start ? { inicio: startOfDay(start) } : {}),
    ...(end ? { fim: endOfDay(end) } : {}),
  };
}

/** Rota da entidade de origem do evento. */
export function calendarEventLink(event: CalendarEvent): string {
  switch (event.entidade_tipo) {
    case "castration_request":
      return `/castration/${event.entidade_id}`;
    case "service_appointment":
      return `/appointments/${event.entidade_id}`;
    default:
      return "/adoptions/followups";
  }
}

export type CalendarDayGroup = { dia: number; eventos: CalendarEvent[] };

/** Agrupa eventos já ordenados por dia, preservando a ordem cronológica. */
export function groupEventsByDay(events: CalendarEvent[]): CalendarDayGroup[] {
  const groups = new Map<number, CalendarEvent[]>();

  for (const event of [...events].sort((a, b) => a.data - b.data)) {
    const dia = startOfDay(new Date(event.data));
    const bucket = groups.get(dia);
    if (bucket) {
      bucket.push(event);
    } else {
      groups.set(dia, [event]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dia, eventos]) => ({ dia, eventos }));
}
