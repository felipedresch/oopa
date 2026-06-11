/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, seedAdmin, seedBairro } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("search retorna bairros ativos por prefixo", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);
  await seedBairro(t, "Centro");
  await seedBairro(t, "Zona Rural");

  const results = await asUser(t, adminId, async (client) =>
    client.query(api.bairros.search, { prefix: "cen" }),
  );

  expect(results).toHaveLength(1);
  expect(results[0]?.nome).toBe("Centro");
});

test("create e desativar bairro exige bairros.manage", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  const bairroId = await asUser(t, adminId, async (client) =>
    client.mutation(api.bairros.create, { nome: "Jardim" }),
  );

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.bairros.setActive, { bairroId, ativo: false });
  });

  const search = await asUser(t, adminId, async (client) =>
    client.query(api.bairros.search, { prefix: "jar" }),
  );
  expect(search).toHaveLength(0);

  const list = await asUser(t, adminId, async (client) =>
    client.query(api.bairros.list, {}),
  );
  expect(list.some((item) => item._id === bairroId && !item.ativo)).toBe(true);
});
