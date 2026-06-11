import { Badge } from "@/components/ui/badge";
import type { DogStatus } from "@/lib/domain-colors";
import { dogStatusBadgeClass, DOG_STATUS_LABELS } from "@/lib/domain-colors";

type StatusBadgeProps = {
  status: DogStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={dogStatusBadgeClass[status]} variant="secondary">
      {DOG_STATUS_LABELS[status]}
    </Badge>
  );
}
