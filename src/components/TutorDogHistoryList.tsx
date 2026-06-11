import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { formatDate } from "@/lib/formatters";

type TutorDogHistoryListProps = {
  dogId: Id<"dogs">;
};

export function TutorDogHistoryList({ dogId }: TutorDogHistoryListProps) {
  const history = useQuery(api.tutors.listHistoryByDog, { dogId });

  if (history === undefined) {
    return <LoadingSkeleton rows={3} />;
  }

  if (!history || history.length === 0) {
    return (
      <EmptyState
        description="O historico sera preenchido por adocoes, devolucoes e transferencias."
        title="Sem historico de tutores"
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {history.map((entry) => (
        <li className="rounded-xl border p-4" key={entry._id}>
          <p className="font-medium">{entry.tutor_nome}</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(entry.inicio)}
            {entry.fim ? ` ate ${formatDate(entry.fim)}` : " (vigente)"}
          </p>
          <p className="text-sm">
            {entry.tipo_inicio}
            {entry.tipo_fim ? ` / ${entry.tipo_fim}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
