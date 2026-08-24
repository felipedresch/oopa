import { Badge } from "@/components/ui/badge";
import type { PersonAlertLevel } from "@/lib/domain-colors";
import { personAlertBadgeClass } from "@/lib/domain-colors";

const ALERT_LABELS: Record<Exclude<PersonAlertLevel, "none">, string> = {
  yellow: "Alerta médio",
  red: "Alerta alto",
};

type PersonAlertBadgeProps = {
  level: PersonAlertLevel;
};

export function PersonAlertBadge({ level }: PersonAlertBadgeProps) {
  if (level === "none") {
    return null;
  }

  return (
    <Badge className={personAlertBadgeClass[level]} variant="secondary">
      {ALERT_LABELS[level]}
    </Badge>
  );
}
