import type { convexTest } from "convex-test";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";

export type ConvexTestClient = ReturnType<typeof convexTest>;
export type AuthenticatedTestClient = ReturnType<ConvexTestClient["withIdentity"]>;

export async function ensureSeeds(t: ConvexTestClient) {
  const adminId = await seedAdmin(t);
  await asUser(t, adminId, async (client) => {
    await client.mutation(api.seeds.seedAll, {});
  });
}

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

export async function seedBairro(
  t: ConvexTestClient,
  nome = "Centro",
): Promise<Id<"bairros">> {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("bairros", {
      nome,
      ativo: true,
      criado_em: Date.now(),
    });
  });
}

export async function seedUser(
  t: ConvexTestClient,
  args: {
    nome: string;
    email: string;
    permissions: string[];
  },
): Promise<Id<"users">> {
  const now = Date.now();
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: args.nome,
      name: args.nome,
      email: args.email,
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: args.permissions,
      criado_em: now,
    });
  });
}
