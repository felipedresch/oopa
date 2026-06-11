import type { ReactNode } from "react";

import { PermissionDenied } from "@/components/PermissionDenied";
import { usePermissions } from "@/hooks/usePermissions";

type PermissionGateProps = {
  children: ReactNode;
  permission?: string;
  anyOf?: readonly string[];
};

export function PermissionGate({ children, permission, anyOf }: PermissionGateProps) {
  const { can, canAny } = usePermissions();

  const allowed = permission ? can(permission) : anyOf ? canAny(anyOf) : true;

  if (!allowed) {
    return <PermissionDenied />;
  }

  return children;
}
