import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { OccurrenceCard } from "@/components/OccurrenceCard";
import { Button } from "@/components/ui/button";
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
};

export function OccurrenceCardList({
  occurrences,
  paginationStatus,
  onLoadMore,
  emptyTitle = "Sem ocorrências",
  emptyDescription = "Nenhuma ocorrência encontrada com os filtros atuais.",
}: OccurrenceCardListProps) {
  if (occurrences === undefined) {
    return <LoadingSkeleton rows={4} />;
  }

  if (occurrences.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {occurrences.map((occurrence) => (
        <OccurrenceCard
          atribuivel={occurrence.atribuivel_a_pessoa}
          bairroNome={occurrence.bairro_nome}
          dataOcorrencia={occurrence.data_ocorrencia}
          descricao={occurrence.descricao}
          dogId={occurrence.dog_id}
          dogNome={occurrence.dog_nome}
          gravidade={occurrence.gravidade}
          key={occurrence._id}
          occurrenceId={occurrence._id}
          typeNome={occurrence.type_nome}
        />
      ))}
      {paginationStatus === "CanLoadMore" ? (
        <Button className="min-h-11 self-start" onClick={onLoadMore} variant="outline">
          Carregar mais
        </Button>
      ) : null}
      {paginationStatus === "LoadingMore" ? <LoadingSkeleton rows={2} /> : null}
    </div>
  );
}
