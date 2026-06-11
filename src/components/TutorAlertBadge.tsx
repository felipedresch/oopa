import { Badge } from "@/components/ui/badge";
import type { TutorAlertLevel } from "@/lib/domain-colors";
import { tutorAlertBadgeClass } from "@/lib/domain-colors";

const ALERT_LABELS: Record<Exclude<TutorAlertLevel, "none">, string> = {
  yellow: "Alerta medio",
  red: "Alerta alto",
};

type TutorAlertBadgeProps = {
  level: TutorAlertLevel;
};

export function TutorAlertBadge({ level }: TutorAlertBadgeProps) {
  if (level === "none") {
    return null;
  }

  return (
    <Badge className={tutorAlertBadgeClass[level]} variant="secondary">
      {ALERT_LABELS[level]}
    </Badge>
  );
}
