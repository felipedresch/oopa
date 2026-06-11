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
    "flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40";

  const content = (
    <>
      <div className="min-w-0">
        <p className="truncate font-medium">{nome}</p>
        <p className="text-sm text-muted-foreground">{bairroNome ?? "Bairro nao informado"}</p>
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
