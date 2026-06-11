/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { hashToken, INVITE_TTL_MS, RESET_TTL_MS } from "./lib/tokens";
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
      permissions: moduleMapToPermissions(
        SEED_PERMISSION_TEMPLATES[0].moduleMap,
      ),
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
  const client = t.withIdentity({
    subject: `${userId}`,
  });
  return await run(client);
}

test("convite valido cria usuario inativo e token", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.users.invite, {
      nome: "Novo Usuario",
      email: "novo@ong.local",
      organizacao: "ONG OOPA",
      permissions: ["dogs.read"],
    });
  });

  const users = await t.run(async (ctx) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", "novo@ong.local"))
      .unique();
  });

  expect(users?.ativo).toBe(false);
  expect(users?.permissions).toEqual(["dogs.read"]);
});

test("convite rejeita email duplicado", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.users.invite, {
      nome: "Primeiro",
      email: "dup@ong.local",
      organizacao: "ONG OOPA",
      permissions: ["dogs.read"],
    });

    await expect(
      client.mutation(api.users.invite, {
        nome: "Segundo",
        email: "dup@ong.local",
        organizacao: "ONG OOPA",
        permissions: ["dogs.read"],
      }),
    ).rejects.toThrow(/email/i);
  });
});

test("token de convite expirado e reutilizado sao rejeitados", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();

  const { token, userId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      nome: "Convidado",
      name: "Convidado",
      email: "convidado@ong.local",
      organizacao: "ONG OOPA",
      ativo: false,
      permissions: ["dogs.read"],
      criado_em: now,
    });
    const token = "expired-token";
    await ctx.db.insert("user_invites", {
      user_id: userId,
      email: "convidado@ong.local",
      token_hash: await hashToken(token),
      expires_at: now - 1,
      criado_em: now,
      criado_por: userId,
    });
    return { token, userId };
  });

  await expect(
    t.mutation(internal.users.consumeInviteToken, { token }),
  ).rejects.toThrow();

  const usedToken = "used-token";
  await t.run(async (ctx) => {
    await ctx.db.insert("user_invites", {
      user_id: userId,
      email: "convidado2@ong.local",
      token_hash: await hashToken(usedToken),
      expires_at: now + INVITE_TTL_MS,
      used_at: now,
      criado_em: now,
      criado_por: userId,
    });
  });

  await expect(
    t.mutation(internal.users.consumeInviteToken, { token: usedToken }),
  ).rejects.toThrow();
});

test("usuario sem permissao nao pode convidar", async () => {
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
    asUser(t, readerId, async (client) => {
      await client.mutation(api.users.invite, {
        nome: "Tentativa",
        email: "tentativa@ong.local",
        organizacao: "ONG OOPA",
        permissions: ["dogs.read"],
      });
    }),
  ).rejects.toThrow();
});

test("nao permite remover a ultima conta com acesso a equipe", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  await expect(
    asUser(t, adminId, async (client) => {
      await client.mutation(api.users.updatePermissions, {
        userId: adminId,
        permissions: ["dogs.read"],
      });
    }),
  ).rejects.toThrow(/ultima conta/i);
});

test("reset de senha cria token com expiracao curta", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: "Reset User",
      name: "Reset User",
      email: "reset@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: ["dogs.read"],
      criado_em: now,
    });
  });

  await t.mutation(api.users.requestPasswordReset, { email: "reset@ong.local" });

  const tokenRow = await t.run(async (ctx) => {
    return await ctx.db.query("password_reset_tokens").first();
  });

  expect(tokenRow?.user_id).toBe(userId);
  expect(tokenRow!.expires_at - tokenRow!.criado_em).toBe(RESET_TTL_MS);
});

test("usuario nao pode desativar a propria conta", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const managerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: "Gestor",
      name: "Gestor",
      email: "gestor@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: ["users.invite", "users.manage_permissions", "users.deactivate"],
      criado_em: now,
    });
  });

  await seedAdmin(t);

  await expect(
    asUser(t, managerId, async (client) => {
      await client.mutation(api.users.deactivate, { userId: managerId });
    }),
  ).rejects.toThrow(/propria conta/i);
});

test("list exige permissao de equipe", async () => {
  const t = convexTest(schema, modules);
  const now = Date.now();
  const readerId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      nome: "Sem equipe",
      name: "Sem equipe",
      email: "sem@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: ["dogs.read"],
      criado_em: now,
    });
  });

  await expect(
    asUser(t, readerId, async (client) => client.query(api.users.list, {})),
  ).rejects.toThrow();

  const adminId = await seedAdmin(t);
  const list = await asUser(t, adminId, async (client) => client.query(api.users.list, {}));
  expect(list.length).toBeGreaterThan(0);
});
