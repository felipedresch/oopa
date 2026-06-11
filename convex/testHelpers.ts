import type { convexTest } from "convex-test";
import type { Id } from "./_generated/dataModel";
import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";

export type ConvexTestClient = ReturnType<typeof convexTest>;
export type AuthenticatedTestClient = ReturnType<ConvexTestClient["withIdentity"]>;

export async function seedAdmin(t: ConvexTestClient) {
  const now = Date.now();
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: "Admin",
      name: "Admin",
      email: "admin@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: moduleMapToPermissions(SEED_PERMISSION_TEMPLATES[0].moduleMap),
      criado_em: now,
    });
  });
}

export async function asUser<TReturn>(
  t: ConvexTestClient,
  userId: Id<"users">,
  run: (apiClient: AuthenticatedTestClient) => Promise<TReturn>,
) {
  const client = t.withIdentity({ subject: `${userId}` });
  return await run(client);
}

export async function storeTestImage(t: ConvexTestClient): Promise<Id<"_storage">> {
  return await t.run(async (ctx) => {
    const file = new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "test.png", {
      type: "image/png",
    });
    return await ctx.storage.store(file);
  });
}
