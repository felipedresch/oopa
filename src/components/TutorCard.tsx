import { Link } from "react-router-dom";

import { TutorAlertBadge } from "@/components/TutorAlertBadge";
import type { TutorAlertLevel } from "@/lib/domain-colors";

type TutorCardProps = {
  tutorId: string;
  nome: string;
  bairroNome?: string | null;
  alertLevel?: TutorAlertLevel | "none";
  selectable?: boolean;
};

export function TutorCard({
  tutorId,
  nome,
  bairroNome,
  alertLevel,
  selectable = false,
}: TutorCardProps) {
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
      {alertLevel && alertLevel !== "none" ? <TutorAlertBadge level={alertLevel} /> : null}
    </>
  );

  if (selectable) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link className={className} to={`/tutors/${tutorId}`}>
      {content}
    </Link>
  );
}
