import { getAuthUserId } from "@convex-dev/auth/server";

import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { forbidden, unauthenticated, userInactive } from "../errors";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "../permissions";

type AuthCtx = QueryCtx | MutationCtx;

export async function getCurrentUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw unauthenticated();
  }

  const user = await ctx.db.get("users", userId);
  if (!user) {
    throw unauthenticated();
  }

  if (!user.ativo) {
    throw userInactive();
  }

  return user;
}

export async function requireActiveUser(ctx: AuthCtx): Promise<Doc<"users">> {
  return await getCurrentUser(ctx);
}

export function requirePermission(user: Doc<"users">, permission: Permission): void {
  if (!hasPermission(user.permissions, permission)) {
    throw forbidden();
  }
}

export function requireAnyPermission(
  user: Doc<"users">,
  permissions: readonly Permission[],
): void {
  if (!hasAnyPermission(user.permissions, permissions)) {
    throw forbidden();
  }
}

export function hasTeamAccess(user: Doc<"users">): boolean {
  return hasAnyPermission(user.permissions, [
    "users.invite",
    "users.manage_permissions",
    "users.deactivate",
  ]);
}

export async function countActiveTeamManagers(ctx: MutationCtx): Promise<number> {
  const users = await ctx.db
    .query("users")
    .withIndex("by_active", (q) => q.eq("ativo", true))
    .collect();

  return users.filter((user) => hasTeamAccess(user)).length;
}
