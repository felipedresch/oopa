/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, ensureSeeds, seedAdmin, seedUser } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

test("availableForCreate filtra por permissao do usuario", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const limitedId = await seedUser(t, {
    nome: "Campo",
    email: "campo@ong.local",
    permissions: ["occurrences.read", "occurrences.create_rotina"],
  });

  const adminTypes = await asUser(t, adminId, async (client) =>
    client.query(api.occurrenceTypes.availableForCreate, {}),
  );
  const limitedTypes = await asUser(t, limitedId, async (client) =>
    client.query(api.occurrenceTypes.availableForCreate, {}),
  );

  expect(adminTypes.length).toBeGreaterThan(limitedTypes.length);
  expect(limitedTypes.every((type) => type.categoria === "rotina")).toBe(true);
});

test("desativar tipo usado em vez de excluir", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  const typeId = await asUser(t, adminId, async (client) =>
    client.mutation(api.occurrenceTypes.create, {
      nome: "Tipo Teste",
      categoria: "outro",
      requer_foto: false,
      gravidade_padrao: "info",
    }),
  );

  await asUser(t, adminId, async (client) => {
    await client.mutation(api.occurrenceTypes.setActive, {
      occurrenceTypeId: typeId,
      ativo: false,
    });
  });

  const list = await asUser(t, adminId, async (client) =>
    client.query(api.occurrenceTypes.list, {}),
  );

  expect(list.some((item) => item._id === typeId && !item.ativo)).toBe(true);
});
