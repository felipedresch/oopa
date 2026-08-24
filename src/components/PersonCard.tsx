import { Link } from "react-router-dom";

import { PersonAlertBadge } from "@/components/PersonAlertBadge";
import type { PersonAlertLevel } from "@/lib/domain-colors";

type PersonCardProps = {
  personId: string;
  nome: string;
  bairroNome?: string | null;
  alertLevel?: PersonAlertLevel | "none";
  selectable?: boolean;
};

export function PersonCard({
  personId,
  nome,
  bairroNome,
  alertLevel,
  selectable = false,
}: PersonCardProps) {
  const className =
    "flex items-center gap-3.5 rounded-xl border bg-card p-3.5 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30";

  const content = (
    <>
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-base font-bold text-secondary-foreground"
      >
        {nome.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{nome}</p>
        <p className="truncate text-sm text-muted-foreground">
          {bairroNome ?? "Bairro não informado"}
        </p>
      </div>
      {alertLevel && alertLevel !== "none" ? <PersonAlertBadge level={alertLevel} /> : null}
    </>
  );

  if (selectable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link className={className} to={`/people/${personId}`}>
      {content}
    </Link>
  );
}
