import { useCurrentUser } from "@/hooks/useCurrentUser";
import { hasAnyPermission, hasPermission } from "@/lib/permissions";

export function usePermissions() {
  const { user, isLoading, isAuthenticated } = useCurrentUser();

  const can = (permission: string) => {
    if (!user) {
      return false;
    }
    return hasPermission(user.permissions, permission);
  };

  const canAny = (permissions: readonly string[]) => {
    if (!user) {
      return false;
    }
    return hasAnyPermission(user.permissions, permissions);
  };

  return {
    user,
    isLoading,
    isAuthenticated,
    can,
    canAny,
    moduleMap: user?.moduleMap,
  };
}
