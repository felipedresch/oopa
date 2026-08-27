import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FilterBar } from "@/components/FilterBar";
import { OccurrenceCardList } from "@/components/OccurrenceCardList";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
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
  { value: "denuncia_externa", label: "Denúncia externa" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "", label: "Todas as gravidades" },
  ...Object.entries(SEVERITY_LABELS).map(([value, label]) => ({ value, label })),
] as const;

export function OccurrencesListPage() {
  const { canAny } = usePermissions();
  const canRead = canAny(["occurrences.read", "occurrences.read_legal"]);

  const [gravidade, setGravidade] = useState<Severity | "">("");
  const [categoria, setCategoria] = useState<(typeof CATEGORY_OPTIONS)[number]["value"]>("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const from = fromDate ? Date.parse(`${fromDate}T00:00:00.000Z`) : undefined;
  const to = toDate ? Date.parse(`${toDate}T23:59:59.999Z`) : undefined;

  const bairros = useQuery(api.bairros.search, canRead ? { limit: 50 } : "skip");

  const { results, status, loadMore } = usePaginatedQuery(
    api.occurrences.listAll,
    canRead
      ? {
          gravidade: gravidade || undefined,
          categoria: categoria || undefined,
          bairro_id: bairroId || undefined,
          from,
          to,
        }
      : "skip",
    { initialNumItems: 25 },
  );

  if (!canRead) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Todas as ocorrências da ONG, com ou sem animal vinculado."
        title="Ocorrências"
      />

      <FilterBar>
        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-all-category">Categoria</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="occ-all-category"
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
          <Label htmlFor="occ-all-severity">Gravidade</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="occ-all-severity"
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
          <Label htmlFor="occ-all-bairro">Bairro</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="occ-all-bairro"
            onChange={(event) => setBairroId(event.target.value as Id<"bairros"> | "")}
            value={bairroId}
          >
            <option value="">Todos os bairros</option>
            {bairros?.map((bairro) => (
              <option key={bairro._id} value={bairro._id}>
                {bairro.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-all-from">De</Label>
          <DatePicker id="occ-all-from" onChange={setFromDate} value={fromDate} />
        </div>

        <div className="flex min-w-40 flex-1 flex-col gap-2">
          <Label htmlFor="occ-all-to">Até</Label>
          <DatePicker id="occ-all-to" onChange={setToDate} value={toDate} />
        </div>
      </FilterBar>

      <OccurrenceCardList
        emptyDescription="Nenhuma ocorrência encontrada com os filtros atuais."
        occurrences={results}
        onLoadMore={() => loadMore(25)}
        paginationStatus={status}
      />
    </section>
  );
}
