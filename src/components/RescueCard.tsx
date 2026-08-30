import { Link } from "react-router-dom";

import { RescueStatusBadge } from "@/components/RescueStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import type { RescueStatus, Severity } from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type RescueCardProps = {
  rescueId: string;
  tipo: string;
  gravidade: Severity;
  status: RescueStatus;
  descricao: string;
  bairroNome?: string | null;
  dogNome?: string;
  criadoEm: number;
};

export function RescueCard({
  rescueId,
  tipo,
  gravidade,
  status,
  descricao,
  bairroNome,
  dogNome,
  criadoEm,
}: RescueCardProps) {
  const meta = [formatDate(criadoEm), dogNome, bairroNome].filter(Boolean).join(" · ");

  return (
    <Link
      className={cn(
        "flex flex-col gap-1.5 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30",
        gravidade === "alta" && "border-destructive/50 bg-destructive/5",
      )}
      to={`/rescues/${rescueId}`}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className="font-semibold capitalize">{tipo.replace(/_/g, " ")}</p>
        <SeverityBadge severity={gravidade} />
        <RescueStatusBadge status={status} />
      </div>
      <p className="text-xs text-muted-foreground">{meta}</p>
      <p className="line-clamp-2 text-sm leading-6">{descricao}</p>
    </Link>
  );
}
