import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/domain-colors";
import { severityBadgeClass, SEVERITY_LABELS } from "@/lib/domain-colors";

type SeverityBadgeProps = {
  severity: Severity;
};

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  return (
    <Badge className={severityBadgeClass[severity]} variant="outline">
      {SEVERITY_LABELS[severity]}
    </Badge>
  );
}
