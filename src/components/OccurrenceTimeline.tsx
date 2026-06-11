import { usePaginatedQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Severity } from "@/lib/domain-colors";
import { SEVERITY_LABELS } from "@/lib/domain-colors";

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas as categorias" },
  { value: "rotina", label: "Rotina" },
  { value: "clinica", label: "Clinica" },
  { value: "risco", label: "Risco" },
  { value: "legal", label: "Legal" },
  { value: "adocao", label: "Adocao" },
  { value: "outro", label: "Outro" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "", label: "Todas as gravidades" },
  ...Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label })),
] as const;

type OccurrenceTimelineProps = {
  dogId: Id<"dogs">;
};

export function OccurrenceTimeline({ dogId }: OccurrenceTimelineProps) {
  const [gravidade, setGravidade] = useState<Severity | "">("");
  const [categoria, setCategoria] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const from = fromDate ? Date.parse(`${fromDate}T00:00:00.000Z`) : undefined;
  const to = toDate ? Date.parse(`${toDate}T23:59:59.999Z`) : undefined;

  const { results, status, loadMore } = usePaginatedQuery(
    api.occurrences.listByDog,
    {
      dogId,
      gravidade: gravidade || undefined,
      categoria: categoria || undefined,
      from,
      to,
    },
    { initialNumItems: 25 },
  );

  if (results === undefined) {
    return <LoadingSkeleton rows={4} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-severity">Gravidade</Label>
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            id="occ-severity"
            onChange={(event) => setGravidade(event.target.value as Severity | "")}
            value={gravidade}
          >
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-category">Categoria</Label>
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            id="occ-category"
            onChange={(event) =>
              setCategoria(event.target.value as (typeof CATEGORY_OPTIONS)[number]["value"])
            }
            value={categoria}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-from">De</Label>
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            id="occ-from"
            onChange={(event) => setFromDate(event.target.value)}
            type="date"
            value={fromDate}
          />
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-to">Ate</Label>
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            id="occ-to"
            onChange={(event) => setToDate(event.target.value)}
            type="date"
            value={toDate}
          />
        </div>
      </FilterBar>

      {results.length === 0 ? (
        <EmptyState
          description="Nenhuma ocorrencia visivel com os filtros atuais."
          title="Sem ocorrencias"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((occurrence) => (
            <OccurrenceCard
              atribuivel={occurrence.atribuivel_ao_tutor}
              bairroNome={occurrence.bairro_nome}
              dataOcorrencia={occurrence.data_ocorrencia}
              descricao={occurrence.descricao}
              dogId={dogId}
              gravidade={occurrence.gravidade}
              key={occurrence._id}
              occurrenceId={occurrence._id}
              typeNome={occurrence.type_nome}
            />
          ))}
          {status === "CanLoadMore" ? (
            <Button className="min-h-11 self-start" onClick={() => loadMore(25)} variant="outline">
              Carregar mais
            </Button>
          ) : null}
          {status === "LoadingMore" ? <LoadingSkeleton rows={2} /> : null}
        </div>
      )}
    </div>
  );
}
