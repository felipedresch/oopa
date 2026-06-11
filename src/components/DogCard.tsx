import { AlertTriangleIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { DogStatusBadge } from "@/components/DogStatusBadge";
import { formatMicrochip } from "@/lib/formatters";
import type { DogStatus } from "@/lib/domain-colors";

type DogCardProps = {
  dogId: string;
  nome: string;
  microchip: string;
  status: DogStatus;
  fotoUrl?: string | null;
  graveAlert?: boolean;
  selectable?: boolean;
};

export function DogCard({
  dogId,
  nome,
  microchip,
  status,
  fotoUrl,
  graveAlert = false,
  selectable = false,
}: DogCardProps) {
  const className =
    "flex gap-3.5 rounded-xl border bg-card p-3 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30";

  const content = (
    <>
      {fotoUrl ? (
        <img
          alt={`Foto de ${nome}`}
          className="size-20 min-h-20 min-w-20 rounded-lg object-cover"
          src={fotoUrl}
        />
      ) : (
        <div
          aria-hidden="true"
          className="flex size-20 min-h-20 min-w-20 items-center justify-center rounded-lg bg-accent font-heading text-2xl font-bold text-accent-foreground"
        >
          {nome.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{nome}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatMicrochip(microchip)}
            </p>
          </div>
          {graveAlert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2.5 py-0.5 text-xs font-medium text-destructive">
              <AlertTriangleIcon aria-hidden="true" className="size-3.5" />
              Alerta
            </span>
          ) : null}
        </div>
        <div>
          <DogStatusBadge status={status} />
        </div>
      </div>
    </>
  );

  if (selectable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link className={className} to={`/dogs/${dogId}`}>
      {content}
    </Link>
  );
}
