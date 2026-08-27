/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api, internal } from "./_generated/api";
import schema from "./schema";
import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";
import { asUser, ensureSeeds, seedAdmin } from "./testHelpers";

const modules = import.meta.glob("./**/*.ts");

test("seeds occurrence types, bairros and permission templates", async () => {
  const t = convexTest(schema, modules);
  const adminId = await seedAdmin(t);

  const firstRun = await asUser(t, adminId, async (client) =>
    client.mutation(api.seeds.seedAll, {}),
  );
  expect(firstRun).toEqual({
    occurrenceTypes: 15,
    bairros: 48,
    permissionTemplates: 5,
  });

  const secondRun = await asUser(t, adminId, async (client) =>
    client.mutation(api.seeds.seedAll, {}),
  );
  expect(secondRun).toEqual({
    occurrenceTypes: 0,
    bairros: 0,
    permissionTemplates: 0,
  });

  const summary = await t.query(api.seeds.getSeedSummary, {});
  expect(summary).toMatchObject({
    occurrenceTypeCount: 15,
    bairroCount: 48,
    permissionTemplateCount: 5,
    uiModuleCount: 8,
  });
});

test("syncBairros insere apenas bairros faltantes", async () => {
  const t = convexTest(schema, modules);

  await t.run(async (ctx) => {
    await ctx.db.insert("bairros", { nome: "Centro", ativo: true, criado_em: Date.now() });
  });

  const first = await t.run(async (ctx) => (await ctx.db.query("bairros").collect()).length);
  expect(first).toBe(1);

  const result = await t.mutation(internal.seeds.syncBairros, {});
  expect(result.inserted).toBe(47);

  const again = await t.mutation(internal.seeds.syncBairros, {});
  expect(again.inserted).toBe(0);

  const total = await t.run(async (ctx) => (await ctx.db.query("bairros").collect()).length);
  expect(total).toBe(48);
});

test("seedAll exige templates.manage", async () => {
  const t = convexTest(schema, modules);

  await expect(t.mutation(api.seeds.seedAll, {})).rejects.toThrow();
});

test("permission templates round-trip through module maps", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);

  const templateMaps = await t.query(api.seeds.getPermissionTemplateMaps, {});
  const admin = templateMaps.find((template) => template.nome === "Administrador ONG");

  expect(admin?.moduleMap).toMatchObject({
    dogs: "manage",
    people: "manage",
    occurrences: "manage",
    team: "manage",
    settings: "manage",
    system: "manage",
    public_reports: "manage",
  });

  for (const template of SEED_PERMISSION_TEMPLATES) {
    const permissions = moduleMapToPermissions(template.moduleMap);
    expect(permissions.length).toBeGreaterThan(0);
  }
});

test("schema indexes support lookups used by the domain", async () => {
  const t = convexTest(schema, modules);
  await ensureSeeds(t);

  const now = Date.now();
  const bairroId = await t.run(async (ctx) => {
    const bairro = await ctx.db
      .query("bairros")
      .withIndex("by_nome", (q) => q.eq("nome", "Centro"))
      .unique();
    if (!bairro) {
      throw new Error("Bairro Centro nao encontrado");
    }

    const adminId = await ctx.db.insert("users", {
      nome: "Admin Seed",
      name: "Admin Seed",
      email: "seed-admin@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: moduleMapToPermissions(SEED_PERMISSION_TEMPLATES[0].moduleMap),
      criado_em: now,
    });

    const personId = await ctx.db.insert("people", {
      nome_completo: "Tutor Seed",
      cpf: "52998224725",
      bairro_id: bairro._id,
      criado_em: now,
      criado_por: adminId,
    });

    const dogId = await ctx.db.insert("dogs", {
      microchip: "123456789012345",
      nome: "Seed Dog",
      sexo: "macho",
      porte: "medio",
      castrado: true,
      vacinas_em_dia: true,
      status_atual: "na_ong",
      pessoa_atual_id: personId,
      criado_em: now,
      criado_por: adminId,
    });

    const occurrenceType = await ctx.db.query("occurrence_types").first();
    if (!occurrenceType) {
      throw new Error("Tipo de ocorrencia nao encontrado");
    }

    await ctx.db.insert("occurrences", {
      dog_id: dogId,
      pessoa_id: personId,
      atribuivel_a_pessoa: false,
      occurrence_type_id: occurrenceType._id,
      gravidade: "baixa",
      data_ocorrencia: now,
      bairro_id: bairro._id,
      descricao: "Consulta inicial",
      registrado_por: adminId,
      criado_em: now,
    });

    return bairro._id;
  });

  const summary = await t.query(api.seeds.getSeedSummary, {});
  expect(summary.occurrenceTypeCount).toBe(15);
  expect(bairroId).toBeDefined();
});
