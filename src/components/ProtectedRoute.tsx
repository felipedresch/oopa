import { useConvexAuth } from "@convex-dev/auth/react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PermissionDenied } from "@/components/PermissionDenied";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type ProtectedRouteProps = {
  children: ReactNode;
  require?: (permissions: string[]) => boolean;
};

export function ProtectedRoute({ children, require }: ProtectedRouteProps) {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { user, isLoading: userLoading } = useCurrentUser();
  const location = useLocation();

  if (authLoading || userLoading) {
    return <LoadingSkeleton rows={4} />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (require && !require(user.permissions)) {
    return <PermissionDenied />;
  }

  return children;
}
