import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { CastrationCard } from "@/components/CastrationCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import type { CastrationStatus } from "@/lib/domain-colors";
import { CASTRATION_STATUS_LABELS } from "@/lib/domain-colors";

const STATUS_OPTIONS: { value: CastrationStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  ...(Object.entries(CASTRATION_STATUS_LABELS) as [CastrationStatus, string][]).map(
    ([value, label]) => ({ value, label }),
  ),
];

export function CastrationsListPage() {
  const { can } = usePermissions();
  const canRead = can("castration.read");
  const [status, setStatus] = useState<CastrationStatus | "">("");

  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.castration.list,
    canRead ? { status: status || undefined } : "skip",
    { initialNumItems: 25 },
  );

  if (!canRead) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("castration.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/castration/new">Nova solicitação</Link>
            </Button>
          ) : undefined
        }
        description="Fila de castração, ordenada por ordem de solicitação (FIFO)."
        title="Castração"
      />

      <FilterBar>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="castration-status-filter">Status</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="castration-status-filter"
            onChange={(event) => setStatus(event.target.value as CastrationStatus | "")}
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

      {results === undefined ? <LoadingSkeleton rows={4} /> : null}

      {results && results.length === 0 ? (
        <EmptyState
          description="Ajuste os filtros ou registre uma nova solicitação de castração."
          title="Nenhuma solicitação encontrada"
        />
      ) : null}

      {results && results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.map((request, index) => (
            <CastrationCard
              animalEspecie={request.animal_descricao.especie}
              animalNome={request.animal_descricao.nome}
              castrationId={request._id}
              dataSolicitacao={request.data_solicitacao}
              key={request._id}
              pessoaNome={request.pessoa_nome}
              position={index + 1}
              status={request.status}
            />
          ))}

          {paginationStatus === "CanLoadMore" ? (
            <Button className="min-h-11 self-start" onClick={() => loadMore(25)} variant="outline">
              Carregar mais
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
