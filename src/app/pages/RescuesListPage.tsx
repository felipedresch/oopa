import { useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { RescueCard } from "@/components/RescueCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import type { RescueStatus } from "@/lib/domain-colors";
import { RESCUE_STATUS_LABELS } from "@/lib/domain-colors";

const STATUS_OPTIONS: { value: RescueStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  ...(Object.entries(RESCUE_STATUS_LABELS) as [RescueStatus, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

export function RescuesListPage() {
  const { can } = usePermissions();
  const canRead = can("rescues.read");
  const [status, setStatus] = useState<RescueStatus | "">("");

  const rescues = useQuery(
    api.rescues.list,
    canRead ? { status: status || undefined } : "skip",
  );

  if (!canRead) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("rescues.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/rescues/new">Nova solicitação</Link>
            </Button>
          ) : undefined
        }
        description="Solicitações de resgate, ordenadas por gravidade e data."
        title="Resgates"
      />

      <FilterBar>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="rescue-status-filter">Status</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="rescue-status-filter"
            onChange={(event) => setStatus(event.target.value as RescueStatus | "")}
            value={status}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {rescues === undefined ? <LoadingSkeleton rows={4} /> : null}

      {rescues && rescues.length === 0 ? (
        <EmptyState
          description="Ajuste os filtros ou registre uma nova solicitação de resgate."
          title="Nenhum resgate encontrado"
        />
      ) : null}

      {rescues && rescues.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rescues.map((rescue) => (
            <RescueCard
              bairroNome={rescue.bairro_nome}
              criadoEm={rescue.criado_em}
              descricao={rescue.descricao_solicitante}
              dogNome={rescue.dog_nome}
              gravidade={rescue.gravidade}
              key={rescue._id}
              rescueId={rescue._id}
              status={rescue.status}
              tipo={rescue.tipo}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
