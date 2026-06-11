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
  return (
    <Link
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
      to={`/dogs/${dogId}/occurrences/${occurrenceId}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">{typeNome}</p>
        <SeverityBadge severity={gravidade} />
        {atribuivel ? (
          <span className="text-xs text-amber-700 dark:text-amber-300">Atribuivel ao tutor</span>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{formatDate(dataOcorrencia)}</p>
      {bairroNome ? <p className="text-sm text-muted-foreground">{bairroNome}</p> : null}
      <p className="line-clamp-2 text-sm">{descricao}</p>
    </Link>
  );
}
