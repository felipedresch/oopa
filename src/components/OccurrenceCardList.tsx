import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { Button } from "@/components/ui/button";
import { dayGroupLabel } from "@/lib/dates";
import type { Severity } from "@/lib/domain-colors";

export type OccurrenceListEntry = {
  _id: string;
  dog_id?: string;
  dog_nome?: string;
  type_nome: string;
  gravidade: Severity;
  data_ocorrencia: number;
  descricao: string;
  bairro_nome?: string | null;
  atribuivel_a_pessoa?: boolean;
};

type PaginationStatus = "LoadingFirstPage" | "CanLoadMore" | "LoadingMore" | "Exhausted";

type OccurrenceCardListProps = {
  occurrences: OccurrenceListEntry[] | undefined;
  paginationStatus: PaginationStatus;
  onLoadMore: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Agrupa por dia ("Hoje", "Ontem", "12 de agosto") em listas cronologicas. */
  groupByDate?: boolean;
};

type OccurrenceGroup = { label: string; items: OccurrenceListEntry[] };

function groupByDay(occurrences: OccurrenceListEntry[]): OccurrenceGroup[] {
  const groups: OccurrenceGroup[] = [];
  for (const occurrence of occurrences) {
    const label = dayGroupLabel(occurrence.data_ocorrencia);
    const last = groups.at(-1);
    if (last?.label === label) {
      last.items.push(occurrence);
    } else {
      groups.push({ label, items: [occurrence] });
    }
  }
  return groups;
}

export function OccurrenceCardList({
  occurrences,
  paginationStatus,
  onLoadMore,
  emptyTitle = "Sem ocorrências",
  emptyDescription = "Nenhuma ocorrência encontrada com os filtros atuais.",
  groupByDate = false,
}: OccurrenceCardListProps) {
  if (occurrences === undefined) {
    return <LoadingSkeleton rows={4} />;
  }

  if (occurrences.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  const renderCard = (occurrence: OccurrenceListEntry) => (
    <OccurrenceCard
      atribuivel={occurrence.atribuivel_a_pessoa}
      bairroNome={occurrence.bairro_nome}
      dataOcorrencia={occurrence.data_ocorrencia}
      descricao={occurrence.descricao}
      dogId={occurrence.dog_id}
      dogNome={occurrence.dog_nome}
      gravidade={occurrence.gravidade}
      hideDate={groupByDate}
      key={occurrence._id}
      occurrenceId={occurrence._id}
      typeNome={occurrence.type_nome}
    />
  );

  return (
    <div className="flex flex-col gap-3">
      {groupByDate
        ? groupByDay(occurrences).map((group) => (
            <section className="flex flex-col gap-2" key={group.label}>
              <h3 className="sticky top-0 z-10 -mx-1 bg-background/95 px-1 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase backdrop-blur">
                {group.label}
              </h3>
              <div className="flex flex-col gap-2.5">{group.items.map(renderCard)}</div>
            </section>
          ))
        : occurrences.map(renderCard)}
      {paginationStatus === "CanLoadMore" ? (
        <Button className="min-h-11 self-start" onClick={onLoadMore} variant="outline">
          Carregar mais
        </Button>
      ) : null}
      {paginationStatus === "LoadingMore" ? <LoadingSkeleton rows={2} /> : null}
    </div>
  );
}
