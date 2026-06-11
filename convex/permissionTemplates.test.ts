/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function seedAdmin(t: ReturnType<typeof convexTest>) {
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

type ConvexTestClient = ReturnType<typeof convexTest>;
type AuthenticatedTestClient = ReturnType<ConvexTestClient["withIdentity"]>;

async function asUser<TReturn>(
  t: ConvexTestClient,
  userId: Id<"users">,
  run: (apiClient: AuthenticatedTestClient) => Promise<TReturn>,
) {
  return await run(t.withIdentity({ subject: `${userId}` }));
}

test("templates exige templates.manage", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const readerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: "Leitor",
      name: "Leitor",
      email: "leitor@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: ["dogs.read"],
      criado_em: now,
    });
  });

  await expect(
    asUser(t, readerId, async (client) => client.query(api.permissionTemplates.list, {})),
  ).rejects.toThrow();
});

test("admin pode criar e duplicar template", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  const templateId = await asUser(t, adminId, async (client) => {
    return await client.mutation(api.permissionTemplates.create, {
      nome: "Template Teste",
      descricao: "Perfil temporario",
      permissions: ["dogs.read", "tutors.read"],
    });
  });

  const duplicatedId = await asUser(t, adminId, async (client) => {
    return await client.mutation(api.permissionTemplates.duplicate, {
      templateId,
    });
  });

  const templates = await asUser(t, adminId, async (client) =>
    client.query(api.permissionTemplates.list, {}),
  );

  expect(templates.some((item) => item._id === templateId)).toBe(true);
  expect(templates.some((item) => item._id === duplicatedId)).toBe(true);
});
