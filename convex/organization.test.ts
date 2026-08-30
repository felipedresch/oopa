/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import { asUser, ensureSeeds, seedAdmin, seedBairro, seedUser, storeTestImage } from "./testHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const VALID_CNPJ = "11444777000161";

test("get retorna null quando ainda nao configurado", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  const settings = await asUser(t, adminId, async (client) => client.query(api.organization.get, {}));
  expect(settings).toBeNull();
});

test("update exige organization.manage", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const readerId = await seedUser(t, {
    nome: "Sem permissao",
    email: "sem-organization@ong.local",
    permissions: ["dogs.read"],
  });

  await expect(
    asUser(t, readerId, async (client) =>
      client.mutation(api.organization.update, {
        razao_social: "ONG OOPA",
        cnpj: VALID_CNPJ,
      }),
    ),
  ).rejects.toThrow();
});

test("update valida CNPJ invalido", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);

  await expect(
    asUser(t, adminId, async (client) =>
      client.mutation(api.organization.update, {
        razao_social: "ONG OOPA",
        cnpj: "11111111111111",
      }),
    ),
  ).rejects.toThrow(/CNPJ/i);
});

test("update cria a linha unica e get retorna dados enriquecidos", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const bairroId = await seedBairro(t, "Centro");

  await asUser(t, adminId, async (client) =>
    client.mutation(api.organization.update, {
      razao_social: "ONG OOPA Proteção Animal",
      nome_fantasia: "OOPA",
      cnpj: VALID_CNPJ,
      bairro_id: bairroId,
      telefone: "5599999999",
      email: "contato@oopa.org",
    }),
  );

  const settings = await asUser(t, adminId, async (client) => client.query(api.organization.get, {}));
  expect(settings?.razao_social).toBe("ONG OOPA Proteção Animal");
  expect(settings?.cnpj).toBe(VALID_CNPJ);
  expect(settings?.bairro_nome).toBe("Centro");

  const rows = await t.run(async (ctx) => ctx.db.query("organization_settings").collect());
  expect(rows).toHaveLength(1);
});

test("update subsequente faz upsert (nao duplica linha) e aceita logo", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);
  const adminId = await seedAdmin(t);
  const storageId = await storeTestImage(t);

  await asUser(t, adminId, async (client) =>
    client.mutation(api.organization.update, {
      razao_social: "ONG OOPA",
      cnpj: VALID_CNPJ,
    }),
  );

  await asUser(t, adminId, async (client) =>
    client.mutation(api.organization.update, {
      razao_social: "ONG OOPA Atualizada",
      cnpj: VALID_CNPJ,
      logo_storage_id: storageId,
    }),
  );

  const rows = await t.run(async (ctx) => ctx.db.query("organization_settings").collect());
  expect(rows).toHaveLength(1);
  expect(rows[0]?.razao_social).toBe("ONG OOPA Atualizada");

  const settings = await asUser(t, adminId, async (client) => client.query(api.organization.get, {}));
  expect(settings?.logo_url).toBeTruthy();
});
