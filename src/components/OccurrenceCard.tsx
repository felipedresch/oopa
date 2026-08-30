import { ChevronRightIcon, DogIcon, MapPinIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDate } from "@/lib/formatters";
import type { Severity } from "@/lib/domain-colors";
import { cn } from "@/lib/utils";

type OccurrenceCardProps = {
  occurrenceId: string;
  dogId?: string;
  dogNome?: string;
  typeNome: string;
  gravidade: Severity;
  dataOcorrencia: number;
  descricao: string;
  bairroNome?: string | null;
  atribuivel?: boolean;
  /** Em listas agrupadas por dia a data ja aparece no cabecalho do grupo. */
  hideDate?: boolean;
};

/** Faixa lateral: da para varrer a lista pela gravidade sem ler os badges. */
const SEVERITY_ACCENT: Record<Severity, string> = {
  info: "bg-muted-foreground/30",
  baixa: "bg-success",
  media: "bg-warning",
  alta: "bg-destructive",
};

export function OccurrenceCard({
  occurrenceId,
  dogId,
  dogNome,
  typeNome,
  gravidade,
  dataOcorrencia,
  descricao,
  bairroNome,
  atribuivel = false,
  hideDate = false,
}: OccurrenceCardProps) {
  const to = dogId
    ? `/dogs/${dogId}/occurrences/${occurrenceId}`
    : `/occurrences/${occurrenceId}`;

  return (
    <Link
      className="group relative flex gap-3 overflow-hidden rounded-xl border bg-card py-3.5 pr-3 pl-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
      to={to}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1 rounded-l-xl",
          SEVERITY_ACCENT[gravidade],
        )}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-semibold">{typeNome}</p>
          <SeverityBadge severity={gravidade} />
          {atribuivel ? (
            <span className="rounded-full bg-warning/14 px-2.5 py-0.5 text-xs font-medium text-warning">
              Atribuivel ao tutor
            </span>
          ) : null}
        </div>

        <p className="line-clamp-2 text-sm leading-6">{descricao}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {hideDate ? null : <span>{formatDate(dataOcorrencia)}</span>}
          <span className="inline-flex items-center gap-1">
            <DogIcon aria-hidden="true" className="size-3.5" />
            {dogNome ?? "Sem animal vinculado"}
          </span>
          {bairroNome ? (
            <span className="inline-flex items-center gap-1">
              <MapPinIcon aria-hidden="true" className="size-3.5" />
              {bairroNome}
            </span>
          ) : null}
        </div>
      </div>

      <ChevronRightIcon
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
