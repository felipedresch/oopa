import { useQuery } from "convex/react";
import { CalendarDaysIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CALENDAR_PERIOD_LABELS,
  CALENDAR_TYPE_LABELS,
  CALENDAR_TYPE_ORDER,
  calendarEventLink,
  calendarTypeBadgeClass,
  groupEventsByDay,
  resolveCustomPeriod,
  resolvePeriodPreset,
  type CalendarEventType,
  type CalendarPeriodPreset,
} from "@/lib/calendar";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const PERIOD_PRESETS: CalendarPeriodPreset[] = [
  "este_mes",
  "mes_passado",
  "ultimos_30",
  "personalizado",
];

const DAY_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export function CalendarPage() {
  const { can, canAny } = usePermissions();
  const canRead = canAny(["adoptions.read", "castration.read", "appointments.read"]);

  const [preset, setPreset] = useState<CalendarPeriodPreset>("este_mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [tipos, setTipos] = useState<CalendarEventType[]>([]);
  const [agora] = useState(() => Date.now());

  const periodo = useMemo(() => {
    if (preset === "personalizado") {
      return resolveCustomPeriod(customFrom, customTo);
    }
    return resolvePeriodPreset(preset, agora);
  }, [preset, customFrom, customTo, agora]);

  const periodoInvalido =
    periodo.inicio !== undefined &&
    periodo.fim !== undefined &&
    periodo.inicio > periodo.fim;

  const events = useQuery(
    api.calendar.list,
    canRead && !periodoInvalido
      ? {
          inicio: periodo.inicio,
          fim: periodo.fim,
          tipos: tipos.length > 0 ? tipos : undefined,
        }
      : "skip",
  );

  const groups = useMemo(() => groupEventsByDay(events ?? []), [events]);

  if (!canRead) {
    return <PermissionDenied />;
  }

  function toggleTipo(tipo: CalendarEventType) {
    setTipos((current) =>
      current.includes(tipo)
        ? current.filter((value) => value !== tipo)
        : [...current, tipo],
    );
  }

  const availableTypes = CALENDAR_TYPE_ORDER.filter((tipo) => {
    if (tipo === "lembrete_adocao") {
      return can("adoptions.read");
    }
    if (tipo === "castracao") {
      return can("castration.read") || can("appointments.read");
    }
    return can("appointments.read");
  });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Lembretes pós-adoção, castrações e atendimentos agendados reunidos por dia."
        title="Calendário"
      />

      <FilterBar>
        <div className="flex flex-col gap-2">
          <Label htmlFor="calendar-period">Período</Label>
          <div className="flex w-fit flex-wrap gap-1 rounded-xl bg-muted p-1" id="calendar-period">
            {PERIOD_PRESETS.map((value) => (
              <button
                aria-pressed={preset === value}
                className={cn(
                  "min-h-10 rounded-lg px-4 text-sm font-medium transition-colors",
                  preset === value
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                key={value}
                onClick={() => setPreset(value)}
                type="button"
              >
                {CALENDAR_PERIOD_LABELS[value]}
              </button>
            ))}
          </div>
        </div>

        {preset === "personalizado" ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor="calendar-from">De</Label>
              <DatePicker id="calendar-from" onChange={setCustomFrom} value={customFrom} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="calendar-to">Até</Label>
              <DatePicker id="calendar-to" onChange={setCustomTo} value={customTo} />
            </div>
          </>
        ) : null}
      </FilterBar>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium" id="calendar-types-label">
          Tipo de lembrete
        </span>
        <div
          aria-labelledby="calendar-types-label"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {availableTypes.map((tipo) => {
            const selected = tipos.includes(tipo);
            return (
              <button
                aria-pressed={selected}
                className={cn(
                  "min-h-11 rounded-full border border-input px-4 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
                key={tipo}
                onClick={() => toggleTipo(tipo)}
                type="button"
              >
                {CALENDAR_TYPE_LABELS[tipo]}
              </button>
            );
          })}
        </div>
      </div>

      {periodoInvalido ? (
        <p className="text-sm text-destructive">
          A data inicial precisa ser anterior à data final. Ajuste o período para ver os
          eventos.
        </p>
      ) : null}

      {!periodoInvalido && events === undefined ? <LoadingSkeleton rows={4} /> : null}

      {!periodoInvalido && events && events.length === 0 ? (
        <EmptyState
          description="Ajuste o período ou os tipos de lembrete para ver outros agendamentos."
          title="Nenhum evento no período"
        />
      ) : null}

      {!periodoInvalido && events && events.length > 0 ? (
        <div className="flex flex-col gap-6">
          {groups.map((group) => (
            <div className="flex flex-col gap-2" key={group.dia}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <CalendarDaysIcon aria-hidden="true" className="size-4" />
                {DAY_FORMATTER.format(new Date(group.dia))}
              </h2>
              <ul className="divide-y rounded-2xl border bg-card">
                {group.eventos.map((event) => (
                  <li key={`${event.entidade_tipo}-${event.entidade_id}`}>
                    <Link
                      className="flex min-h-14 flex-col gap-1 px-4 py-3 transition-colors hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
                      to={calendarEventLink(event)}
                    >
                      <span className="font-medium">{event.titulo}</span>
                      <span className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            calendarTypeBadgeClass[event.tipo],
                          )}
                        >
                          {CALENDAR_TYPE_LABELS[event.tipo]}
                        </span>
                        {formatDateTime(event.data)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
