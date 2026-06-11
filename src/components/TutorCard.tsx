import { Link } from "react-router-dom";

import { TutorAlertBadge } from "@/components/TutorAlertBadge";
import type { TutorAlertLevel } from "@/lib/domain-colors";

type TutorCardProps = {
  tutorId: string;
  nome: string;
  bairroNome?: string | null;
  alertLevel?: TutorAlertLevel | "none";
};

export function TutorCard({ tutorId, nome, bairroNome, alertLevel }: TutorCardProps) {
  return (
    <Link
      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
      to={`/tutors/${tutorId}`}
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{nome}</p>
        <p className="text-sm text-muted-foreground">{bairroNome ?? "Bairro nao informado"}</p>
      </div>
      {alertLevel && alertLevel !== "none" ? <TutorAlertBadge level={alertLevel} /> : null}
    </Link>
  );
}
