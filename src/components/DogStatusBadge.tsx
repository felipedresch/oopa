import { StatusBadge } from "@/components/StatusBadge";
import type { DogStatus } from "@/lib/domain-colors";

type DogStatusBadgeProps = {
  status: DogStatus;
};

export function DogStatusBadge({ status }: DogStatusBadgeProps) {
  return <StatusBadge status={status} />;
}
