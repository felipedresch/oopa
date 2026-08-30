import { usePaginatedQuery } from "convex/react";
import { CalendarClockIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  appointmentStatusBadgeClass,
  type AppointmentStatus,
} from "@/lib/domain-colors";
import { formatCurrency, formatDateTime } from "@/lib/formatters";

const STATUS_OPTIONS: Array<{ value: AppointmentStatus | ""; label: string }> = [
  { value: "", label: "Todos os status" },
  ...Object.entries(APPOINTMENT_STATUS_LABELS).map(([value, label]) => ({
    value: value as AppointmentStatus,
    label,
  })),
];

function startOfDay(value: string): number | undefined {
  return value ? new Date(`${value}T00:00:00`).getTime() : undefined;
}

function endOfDay(value: string): number | undefined {
  return value ? new Date(`${value}T23:59:59.999`).getTime() : undefined;
}

export function AppointmentsListPage() {
  const { can } = usePermissions();
  const [status, setStatus] = useState<AppointmentStatus | "">("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [dogSearch, setDogSearch] = useState("");
  const [dogId, setDogId] = useState<Id<"dogs"> | undefined>();
  const [now] = useState(() => Date.now());

  const { results: dogs } = usePaginatedQuery(
    api.dogs.list,
    can("appointments.read") && dogSearch && !dogId
      ? { search: dogSearch, now }
      : "skip",
    { initialNumItems: 8 },
  );
  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.appointments.list,
    can("appointments.read")
      ? {
          status: status || undefined,
          dogId,
          inicio: startOfDay(inicio),
          fim: endOfDay(fim),
        }
      : "skip",
    { initialNumItems: 20 },
  );

  if (!can("appointments.read")) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("appointments.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/appointments/new">Novo atendimento</Link>
            </Button>
          ) : undefined
        }
        description="Acompanhe a agenda, os valores lançados e o histórico clínico dos animais."
        title="Atendimentos"
      />

      <FilterBar>
        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor="appointment-status">Status</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="appointment-status"
            onChange={(event) => setStatus(event.target.value as AppointmentStatus | "")}
            value={status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor="appointment-start">De</Label>
          <DatePicker id="appointment-start" onChange={setInicio} value={inicio} />
        </div>
        <div className="flex min-w-44 flex-1 flex-col gap-2">
          <Label htmlFor="appointment-end">Até</Label>
          <DatePicker id="appointment-end" onChange={setFim} value={fim} />
        </div>
        <div className="relative flex min-w-56 flex-[1.5] flex-col gap-2">
          <Label htmlFor="appointment-dog">Animal</Label>
          <Input
            autoComplete="off"
            id="appointment-dog"
            onChange={(event) => {
              setDogSearch(event.target.value);
              setDogId(undefined);
            }}
            placeholder="Filtrar por nome ou microchip"
            value={dogSearch}
          />
          {dogs && dogs.length > 0 && !dogId ? (
            <ul className="absolute top-full z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
              {dogs.map((dog) => (
                <li key={dog._id}>
                  <button
                    className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent/50"
                    onClick={() => {
                      setDogId(dog._id);
                      setDogSearch(dog.nome);
                    }}
                    type="button"
                  >
                    {dog.nome}
                    {dog.microchip ? ` · ${dog.microchip}` : ""}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {dogId ? (
          <Button
            className="min-h-11"
            onClick={() => {
              setDogId(undefined);
              setDogSearch("");
            }}
            type="button"
            variant="ghost"
          >
            Limpar animal
          </Button>
        ) : null}
      </FilterBar>

      {results === undefined ? <LoadingSkeleton rows={5} /> : null}
      {results?.length === 0 ? (
        <EmptyState
          description="Ajuste os filtros ou registre um novo atendimento."
          title="Nenhum atendimento encontrado"
        >
          {can("appointments.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/appointments/new">Registrar atendimento</Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : null}

      {results && results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.map((appointment) => (
            <Link
              className="group flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-ring/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
              key={appointment._id}
              to={`/appointments/${appointment._id}`}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClockIcon aria-hidden="true" className="size-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{appointment.dog?.nome ?? "Animal removido"}</h2>
                    <Badge className={appointmentStatusBadgeClass[appointment.status]} variant="secondary">
                      {APPOINTMENT_STATUS_LABELS[appointment.status]}
                    </Badge>
                    {appointment.nota_fiscal_url ? (
                      <Badge variant="outline">
                        <FileTextIcon aria-hidden="true" className="mr-1 size-3" />
                        NF anexada
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateTime(appointment.data_atendimento)} · {APPOINTMENT_TYPE_LABELS[appointment.tipo_atendimento]}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    Veterinário: {appointment.veterinario.nome}
                    {appointment.solicitante ? ` · Solicitante: ${appointment.solicitante.nome_completo}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
                <span className="text-lg font-semibold tabular-nums">{formatCurrency(appointment.valor_total)}</span>
                <span className="text-xs text-muted-foreground">Ver atendimento →</span>
              </div>
            </Link>
          ))}
          {paginationStatus === "CanLoadMore" ? (
            <Button className="min-h-11 self-center" onClick={() => loadMore(20)} type="button" variant="outline">
              Carregar mais
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
