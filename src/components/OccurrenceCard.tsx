import { Link } from "react-router-dom";

import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDate } from "@/lib/formatters";
import type { Severity } from "@/lib/domain-colors";

type OccurrenceCardProps = {
  occurrenceId: string;
  dogId: string;
  typeNome: string;
  gravidade: Severity;
  dataOcorrencia: number;
  descricao: string;
  bairroNome?: string | null;
  atribuivel?: boolean;
};

export function OccurrenceCard({
  occurrenceId,
  dogId,
  typeNome,
  gravidade,
  dataOcorrencia,
  descricao,
  bairroNome,
  atribuivel = false,
}: OccurrenceCardProps) {
  const meta = [formatDate(dataOcorrencia), bairroNome].filter(Boolean).join(" · ");

  return (
    <Link
      className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
      to={`/dogs/${dogId}/occurrences/${occurrenceId}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-semibold">{typeNome}</p>
        <SeverityBadge severity={gravidade} />
        {atribuivel ? (
          <span className="rounded-full bg-warning/14 px-2.5 py-0.5 text-xs font-medium text-warning">
            Atribuivel ao tutor
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{meta}</p>
      <p className="line-clamp-2 text-sm leading-6">{descricao}</p>
    </Link>
  );
}
