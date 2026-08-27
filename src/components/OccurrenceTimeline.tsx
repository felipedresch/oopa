import { usePaginatedQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { FilterBar } from "@/components/FilterBar";
import { OccurrenceCardList } from "@/components/OccurrenceCardList";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import type { Severity } from "@/lib/domain-colors";
import { SEVERITY_LABELS } from "@/lib/domain-colors";

const CATEGORY_OPTIONS = [
  { value: "", label: "Todas as categorias" },
  { value: "rotina", label: "Rotina" },
  { value: "clinica", label: "Clínica" },
  { value: "risco", label: "Risco" },
  { value: "legal", label: "Legal" },
  { value: "adocao", label: "Adoção" },
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

  return (
    <div className="flex flex-col gap-4">
      <FilterBar>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-severity">Gravidade</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <DatePicker id="occ-from" onChange={setFromDate} value={fromDate} />
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-to">Até</Label>
          <DatePicker id="occ-to" onChange={setToDate} value={toDate} />
        </div>
      </FilterBar>

      <OccurrenceCardList
        emptyDescription="Nenhuma ocorrência visivel com os filtros atuais."
        occurrences={results?.map((occurrence) => ({ ...occurrence, dog_id: dogId }))}
        onLoadMore={() => loadMore(25)}
        paginationStatus={status}
      />
    </div>
  );
}
