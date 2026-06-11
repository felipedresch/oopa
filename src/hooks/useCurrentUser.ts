import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";

export function useCurrentUser() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const user = useQuery(api.users.me, isAuthenticated ? {} : "skip");

  return {
    user,
    isLoading: authLoading || (isAuthenticated && user === undefined),
    isAuthenticated: Boolean(isAuthenticated && user),
  };
}
