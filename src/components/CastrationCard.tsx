import { Link } from "react-router-dom";

import { CastrationStatusBadge } from "@/components/CastrationStatusBadge";
import type { CastrationStatus, DogEspecie } from "@/lib/domain-colors";
import { ESPECIE_LABELS } from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";

type CastrationCardProps = {
  castrationId: string;
  position?: number;
  animalNome?: string;
  animalEspecie: DogEspecie;
  pessoaNome?: string;
  status: CastrationStatus;
  dataSolicitacao: number;
};

export function CastrationCard({
  castrationId,
  position,
  animalNome,
  animalEspecie,
  pessoaNome,
  status,
  dataSolicitacao,
}: CastrationCardProps) {
  const meta = [formatDate(dataSolicitacao), pessoaNome].filter(Boolean).join(" · ");

  return (
    <Link
      className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
      to={`/castration/${castrationId}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {position ? (
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
            {position}
          </span>
        ) : null}
        <p className="font-semibold">
          {animalNome ?? "Sem nome"} · {ESPECIE_LABELS[animalEspecie]}
        </p>
        <CastrationStatusBadge status={status} />
      </div>
      <p className="text-xs text-muted-foreground">{meta}</p>
    </Link>
  );
}
