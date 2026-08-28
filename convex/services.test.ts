/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, ensureSeeds, seedAdmin, seedUser } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("create exige services.manage", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const readerId = await seedUser(t, {
    nome: "Sem permissao",
    email: "sem-services@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.services.create, {
        nome: "Consulta",
        categoria: "consulta",
        valor_padrao: 80,
      }),
    ),
  ).rejects.toThrow();
});

test("create bloqueia nome duplicado e valor negativo", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  await asUser(t, adminId, async (client) =>
    client.mutation(api.services.create, {
      nome: "Consulta",
      categoria: "consulta",
      valor_padrao: 80,
    }),
  );

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.services.create, {
        nome: "consulta",
        categoria: "consulta",
        valor_padrao: 100,
      }),
    ),
  ).rejects.toThrow();

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.services.create, {
        nome: "Cirurgia",
        categoria: "cirurgia",
        valor_padrao: -10,
      }),
    ),
  ).rejects.toThrow();
});

test("update e setActive desativam em vez de excluir", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  const serviceId = await asUser(t, adminId, async (client) =>
    client.mutation(api.services.create, {
      nome: "Vacinação",
      descricao: "Vacina antirrábica",
      categoria: "vacina",
      valor_padrao: 50,
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.services.update, {
      serviceId,
      nome: "Vacinação Antirrábica",
      categoria: "vacina",
      valor_padrao: 60,
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.services.setActive, { serviceId, ativo: false }),
  );

  const list = await asUser(t, adminId, async (client) => client.query(api.services.list, {}));
  const updated = list.find((item) => item._id === serviceId);
  expect(updated?.nome).toBe("Vacinação Antirrábica");
  expect(updated?.valor_padrao).toBe(60);
  expect(updated?.ativo).toBe(false);

  const onlyActive = await asUser(t, adminId, async (client) =>
    client.query(api.services.list, { ativo: true }),
  );
  expect(onlyActive.some((item) => item._id === serviceId)).toBe(false);
});
