import { usePaginatedQuery } from "convex/react";
import { ClipboardPlusIcon, FileHeartIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";

export function MedicalRecordTimeline({ dogId }: { dogId: Id<"dogs"> }) {
  const { can } = usePermissions();
  const { results, status, loadMore } = usePaginatedQuery(
    api.appointments.listMedicalRecordsByDog,
    can("appointments.read") ? { dogId } : "skip",
    { initialNumItems: 10 },
  );

  if (!can("appointments.read")) {
    return <EmptyState description="Você não tem acesso ao prontuário médico." title="Acesso restrito" />;
  }
  if (results === undefined) {
    return <LoadingSkeleton rows={3} />;
  }
  if (results.length === 0) {
    return (
      <EmptyState
        description="Os registros clínicos deste animal aparecerão aqui quando um atendimento for concluído."
        title="Prontuário vazio"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.map((record) => (
        <article className="relative rounded-2xl border bg-card p-4 pl-14 shadow-xs" key={record._id}>
          <span className="absolute left-4 top-4 flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileHeartIcon aria-hidden="true" className="size-4" />
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{APPOINTMENT_TYPE_LABELS[record.tipo]}</h3>
              <time className="text-sm text-muted-foreground">{formatDate(record.data_atendimento)}</time>
            </div>
            <p className="text-sm text-muted-foreground">Veterinário: {record.veterinario.nome}</p>
            {record.diagnostico ? <p className="mt-2 text-sm"><strong>Diagnóstico:</strong> {record.diagnostico}</p> : null}
            {record.procedimentos ? <p className="text-sm"><strong>Procedimentos:</strong> {record.procedimentos}</p> : null}
            {record.medicamentos ? <p className="text-sm"><strong>Medicamentos:</strong> {record.medicamentos}</p> : null}
            {record.peso_kg !== undefined || record.temperatura_c !== undefined ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {record.peso_kg !== undefined ? `Peso: ${record.peso_kg} kg` : ""}
                {record.peso_kg !== undefined && record.temperatura_c !== undefined ? " · " : ""}
                {record.temperatura_c !== undefined ? `Temperatura: ${record.temperatura_c} °C` : ""}
              </p>
            ) : null}
            {record.appointment_id ? (
              <Link className="mt-3 inline-flex items-center gap-1 self-start text-sm text-primary underline-offset-2 hover:underline" to={`/appointments/${record.appointment_id}`}>
                <ClipboardPlusIcon aria-hidden="true" className="size-4" />
                Ver atendimento
              </Link>
            ) : null}
          </div>
        </article>
      ))}
      {status === "CanLoadMore" ? (
        <Button className="min-h-11 self-center" onClick={() => loadMore(10)} type="button" variant="outline">
          Carregar mais registros
        </Button>
      ) : null}
    </div>
  );
}
