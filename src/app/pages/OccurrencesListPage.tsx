import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { OccurrenceCardList } from "@/components/OccurrenceCardList";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PublicReportsTriagePanel } from "@/components/PublicReportsTriagePanel";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { usePermissions } from "@/hooks/usePermissions";
import { dateInputToTimestamp, todayAsDateInput } from "@/lib/dates";
import type { OccurrenceCategoria, Severity } from "@/lib/domain-colors";
import { OCCURRENCE_CATEGORY_LABELS, SEVERITY_LABELS } from "@/lib/domain-colors";
import { cn } from "@/lib/utils";

type Tab = "occurrences" | "public_reports";

const CATEGORY_OPTIONS: { value: OccurrenceCategoria | ""; label: string }[] = [
  { value: "", label: "Todas as categorias" },
  ...(
    Object.entries(OCCURRENCE_CATEGORY_LABELS) as [OccurrenceCategoria, string][]
  ).map(([value, label]) => ({ value, label })),
];

type CategoryValue = OccurrenceCategoria | "";

/** Gravidade e o filtro mais usado na triagem diaria: fica sempre a um clique. */
const SEVERITY_CHIPS: { value: Severity | ""; label: string }[] = [
  { value: "", label: "Todas" },
  ...(Object.entries(SEVERITY_LABELS) as [Severity, string][]).map(([value, label]) => ({
    value,
    label,
  })),
];

const PERIOD_PRESETS = [
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
] as const;

function dateInputDaysAgo(days: number): string {
  return todayAsDateInput(Date.now() - days * 24 * 60 * 60 * 1000);
}

function ChipButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ActiveFilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-3 text-xs font-medium">
      {label}
      <button
        aria-label={`Remover filtro ${label}`}
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        onClick={onRemove}
        type="button"
      >
        <XIcon aria-hidden="true" className="size-3.5" />
      </button>
    </span>
  );
}

export function OccurrencesListPage() {
  const { can, canAny } = usePermissions();
  const canRead = canAny(["occurrences.read", "occurrences.read_legal"]);
  const canTriage = can("public_reports.triage");

  const [tab, setTab] = useState<Tab>("occurrences");
  const [gravidade, setGravidade] = useState<Severity | "">("");
  const [categoria, setCategoria] = useState<CategoryValue>("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | "">("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const from = dateInputToTimestamp(fromDate, "start");
  const to = dateInputToTimestamp(toDate, "end");

  const bairros = useQuery(api.bairros.search, canRead ? { limit: 50 } : "skip");
  const pendingReports = useQuery(api.publicReports.pendingCount, canTriage ? {} : "skip");

  const { results, status, loadMore } = usePaginatedQuery(
    api.occurrences.listAll,
    canRead && tab === "occurrences"
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

  if (!canRead && !canTriage) {
    return <PermissionDenied />;
  }

  const activeTab = canRead ? tab : "public_reports";
  const bairroNome = bairros?.find((bairro) => bairro._id === bairroId)?.nome;
  const categoriaLabel = CATEGORY_OPTIONS.find(
    (option) => option.value === categoria,
  )?.label;

  const activeFilters = [
    categoria ? { key: "categoria", label: categoriaLabel ?? categoria, clear: () => setCategoria("") } : null,
    bairroId ? { key: "bairro", label: bairroNome ?? "Bairro", clear: () => setBairroId("") } : null,
    fromDate ? { key: "from", label: `De ${fromDate.split("-").reverse().join("/")}`, clear: () => setFromDate("") } : null,
    toDate ? { key: "to", label: `Até ${toDate.split("-").reverse().join("/")}`, clear: () => setToDate("") } : null,
  ].filter((filter): filter is { key: string; label: string; clear: () => void } =>
    filter !== null,
  );

  const clearAll = () => {
    setCategoria("");
    setBairroId("");
    setFromDate("");
    setToDate("");
    setGravidade("");
  };

  const activePeriod = PERIOD_PRESETS.find(
    (preset) => !toDate && fromDate === dateInputDaysAgo(preset.days),
  );

  const togglePeriod = (days: number) => {
    const next = dateInputDaysAgo(days);
    setToDate("");
    setFromDate((current) => (current === next ? "" : next));
  };

  return (
    <section className="flex flex-col gap-5">
      <PageHeader
        description="Todas as ocorrências da ONG, com ou sem animal vinculado."
        title="Ocorrências"
      />

      {canTriage && canRead ? (
        <div
          className="inline-flex w-full max-w-md gap-1 rounded-xl bg-muted p-1"
          role="group"
        >
          <button
            aria-pressed={activeTab === "occurrences"}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
              activeTab === "occurrences"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("occurrences")}
            type="button"
          >
            Ocorrências
          </button>
          <button
            aria-pressed={activeTab === "public_reports"}
            className={cn(
              "min-h-10 flex-1 rounded-lg px-3 text-sm font-medium transition-colors",
              activeTab === "public_reports"
                ? "bg-card text-foreground shadow-xs ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTab("public_reports")}
            type="button"
          >
            Denúncias pendentes
            {pendingReports ? (
              <span
                aria-hidden="true"
                className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground"
              >
                {pendingReports >= 99 ? "99+" : pendingReports}
              </span>
            ) : null}
          </button>
        </div>
      ) : null}

      {activeTab === "public_reports" ? (
        <PublicReportsTriagePanel />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {SEVERITY_CHIPS.map((chip) => (
                <ChipButton
                  active={gravidade === chip.value}
                  key={chip.value || "all"}
                  onClick={() => setGravidade(chip.value)}
                >
                  {chip.label}
                </ChipButton>
              ))}

              <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

              {PERIOD_PRESETS.map((preset) => (
                <ChipButton
                  active={activePeriod?.days === preset.days}
                  key={preset.days}
                  onClick={() => togglePeriod(preset.days)}
                >
                  {preset.label}
                </ChipButton>
              ))}

              <Button
                aria-expanded={filtersOpen}
                className="ml-auto min-h-9"
                onClick={() => setFiltersOpen((open) => !open)}
                size="lg"
                type="button"
                variant="outline"
              >
                <SlidersHorizontalIcon aria-hidden="true" />
                Filtros
                {activeFilters.length > 0 ? (
                  <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                    {activeFilters.length}
                  </span>
                ) : null}
              </Button>
            </div>

            {filtersOpen ? (
              <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="occ-all-category">Categoria</Label>
                  <Select
                    id="occ-all-category"
                    onChange={(event) => setCategoria(event.target.value as CategoryValue)}
                    value={categoria}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value || "all"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="occ-all-bairro">Bairro</Label>
                  <Select
                    id="occ-all-bairro"
                    onChange={(event) =>
                      setBairroId(event.target.value as Id<"bairros"> | "")
                    }
                    value={bairroId}
                  >
                    <option value="">Todos os bairros</option>
                    {bairros?.map((bairro) => (
                      <option key={bairro._id} value={bairro._id}>
                        {bairro.nome}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="occ-all-from">De</Label>
                  <DatePicker id="occ-all-from" onChange={setFromDate} value={fromDate} />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="occ-all-to">Até</Label>
                  <DatePicker id="occ-all-to" onChange={setToDate} value={toDate} />
                </div>
              </div>
            ) : null}

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {activeFilters.map((filter) => (
                  <ActiveFilterChip
                    key={filter.key}
                    label={filter.label}
                    onRemove={filter.clear}
                  />
                ))}
                <Button onClick={clearAll} size="sm" type="button" variant="ghost">
                  Limpar filtros
                </Button>
              </div>
            ) : null}
          </div>

          <OccurrenceCardList
            emptyDescription="Nenhuma ocorrência encontrada com os filtros atuais."
            groupByDate
            occurrences={results}
            onLoadMore={() => loadMore(25)}
            paginationStatus={status}
          />
        </>
      )}
    </section>
  );
}
