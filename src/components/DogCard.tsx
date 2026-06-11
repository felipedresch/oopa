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
};

export function DogCard({
  dogId,
  nome,
  microchip,
  status,
  fotoUrl,
  graveAlert = false,
}: DogCardProps) {
  return (
    <Link
      className="flex gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted/40"
      to={`/dogs/${dogId}`}
    >
      {fotoUrl ? (
        <img
          alt={`Foto de ${nome}`}
          className="size-20 min-h-20 min-w-20 rounded-lg border object-cover"
          src={fotoUrl}
        />
      ) : (
        <div className="flex size-20 min-h-20 min-w-20 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
          Sem foto
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{nome}</p>
            <p className="text-sm text-muted-foreground">{formatMicrochip(microchip)}</p>
          </div>
          {graveAlert ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-900 dark:bg-red-950 dark:text-red-100">
              <AlertTriangleIcon aria-hidden="true" className="size-3.5" />
              Alerta
            </span>
          ) : null}
        </div>
        <DogStatusBadge status={status} />
      </div>
    </Link>
  );
}
