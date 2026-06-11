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
        description="O histórico será preenchido por adoções, devoluções e transferencias."
        title="Sem histórico de tutores"
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {history.map((entry) => (
        <li className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0" key={entry._id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="font-medium">{entry.tutor_nome}</p>
            {entry.fim ? null : (
              <span className="rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">
                Vigente
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(entry.inicio)}
            {entry.fim ? ` ate ${formatDate(entry.fim)}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {entry.tipo_inicio}
            {entry.tipo_fim ? ` / ${entry.tipo_fim}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
