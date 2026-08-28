/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, ensureSeeds, seedAdmin, seedUser } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("create exige supplies.manage", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const readerId = await seedUser(t, {
    nome: "Sem permissao",
    email: "sem-supplies@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.supplies.create, {
        nome: "Soro fisiológico",
        categoria: "material",
        valor_padrao: 10,
      }),
    ),
  ).rejects.toThrow();
});

test("create bloqueia nome duplicado e valor negativo", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  await asUser(t, adminId, async (client) =>
    client.mutation(api.supplies.create, {
      nome: "Antibiótico",
      categoria: "medicamento",
      unidade_medida: "comprimido",
      valor_padrao: 5,
    }),
  );

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.supplies.create, {
        nome: "antibiótico",
        categoria: "medicamento",
        valor_padrao: 6,
      }),
    ),
  ).rejects.toThrow();

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.supplies.create, {
        nome: "Curativo",
        categoria: "material",
        valor_padrao: -1,
      }),
    ),
  ).rejects.toThrow();
});

test("update e setActive desativam em vez de excluir", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  const supplyId = await asUser(t, adminId, async (client) =>
    client.mutation(api.supplies.create, {
      nome: "Vacina V10",
      categoria: "vacina",
      unidade_medida: "dose",
      valor_padrao: 35,
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.supplies.update, {
      supplyId,
      nome: "Vacina V10 Reforço",
      categoria: "vacina",
      unidade_medida: "dose",
      valor_padrao: 40,
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.supplies.setActive, { supplyId, ativo: false }),
  );

  const list = await asUser(t, adminId, async (client) => client.query(api.supplies.list, {}));
  const updated = list.find((item) => item._id === supplyId);
  expect(updated?.nome).toBe("Vacina V10 Reforço");
  expect(updated?.valor_padrao).toBe(40);
  expect(updated?.ativo).toBe(false);

  const onlyActive = await asUser(t, adminId, async (client) =>
    client.query(api.supplies.list, { ativo: true }),
  );
  expect(onlyActive.some((item) => item._id === supplyId)).toBe(false);
});
