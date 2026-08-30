import { Badge } from "@/components/ui/badge";
import type { RescueStatus } from "@/lib/domain-colors";
import { rescueStatusBadgeClass, RESCUE_STATUS_LABELS } from "@/lib/domain-colors";

type RescueStatusBadgeProps = {
  status: RescueStatus;
};

export function RescueStatusBadge({ status }: RescueStatusBadgeProps) {
  return (
    <Badge className={rescueStatusBadgeClass[status]} variant="secondary">
      {RESCUE_STATUS_LABELS[status]}
    </Badge>
  );
}
