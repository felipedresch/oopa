import { Badge } from "@/components/ui/badge";
import type { CastrationStatus } from "@/lib/domain-colors";
import { castrationStatusBadgeClass, CASTRATION_STATUS_LABELS } from "@/lib/domain-colors";

type CastrationStatusBadgeProps = {
  status: CastrationStatus;
};

export function CastrationStatusBadge({ status }: CastrationStatusBadgeProps) {
  return (
    <Badge className={castrationStatusBadgeClass[status]} variant="secondary">
      {CASTRATION_STATUS_LABELS[status]}
    </Badge>
  );
}
