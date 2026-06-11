/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import { moduleMapToPermissions, SEED_PERMISSION_TEMPLATES } from "./permissions";

const modules = import.meta.glob("./**/*.ts");

test("seeds occurrence types, bairros and permission templates", async () => {
  const t = convexTest(schema, modules);

  const firstRun = await t.mutation(api.seeds.seedAll, {});
  expect(firstRun).toEqual({
    occurrenceTypes: 14,
    bairros: 3,
    permissionTemplates: 5,
  });

  const secondRun = await t.mutation(api.seeds.seedAll, {});
  expect(secondRun).toEqual({
    occurrenceTypes: 0,
    bairros: 0,
    permissionTemplates: 0,
  });

  const summary = await t.query(api.seeds.getSeedSummary, {});
  expect(summary).toMatchObject({
    occurrenceTypeCount: 14,
    bairroCount: 3,
    permissionTemplateCount: 5,
    uiModuleCount: 7,
  });
});

test("permission templates round-trip through module maps", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.seeds.seedAll, {});

  const templateMaps = await t.query(api.seeds.getPermissionTemplateMaps, {});
  const admin = templateMaps.find((template) => template.nome === "Administrador ONG");

  expect(admin?.moduleMap).toMatchObject({
    dogs: "manage",
    tutors: "manage",
    occurrences: "manage",
    team: "manage",
    settings: "manage",
    system: "manage",
  });

  for (const template of SEED_PERMISSION_TEMPLATES) {
    const permissions = moduleMapToPermissions(template.moduleMap);
    expect(permissions.length).toBeGreaterThan(0);
  }
});

test("schema indexes support lookups used by the domain", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(api.seeds.seedAll, {});

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
      email: "seed-admin@ong.local",
      organizacao: "ONG OOPA",
      ativo: true,
      permissions: moduleMapToPermissions(
        SEED_PERMISSION_TEMPLATES[0].moduleMap,
      ),
      criado_em: now,
    });

    const tutorId = await ctx.db.insert("tutors", {
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
      tutor_atual_id: tutorId,
      criado_em: now,
      criado_por: adminId,
    });

    const occurrenceType = await ctx.db.query("occurrence_types").first();
    if (!occurrenceType) {
      throw new Error("Tipo de ocorrencia nao encontrado");
    }

    await ctx.db.insert("occurrences", {
      dog_id: dogId,
      tutor_id: tutorId,
      atribuivel_ao_tutor: false,
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
  expect(summary.occurrenceTypeCount).toBe(14);
  expect(bairroId).toBeDefined();
});
