/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";
import {
  hasAllPermissions,
  hasPermission,
  moduleLevelToPermissions,
  moduleMapToPermissions,
  permissionsToModuleMap,
  PERMISSION_CATALOG,
  UI_MODULES,
} from "./permissions";

const modules = import.meta.glob("./**/*.ts");

test("catalogo granular contem todas as permissoes de dominio", () => {
  expect(PERMISSION_CATALOG).toHaveLength(23);
  expect(UI_MODULES).toHaveLength(7);
});

test("traduz modulo e nivel para permissoes granulares", () => {
  expect(moduleLevelToPermissions("dogs", "manage")).toEqual([
    "dogs.read",
    "dogs.create",
    "dogs.edit",
    "dogs.change_status",
  ]);

  expect(moduleLevelToPermissions("system", "manage")).toEqual(["system.audit_log"]);
  expect(moduleLevelToPermissions("team", "none")).toEqual([]);
});

test("mapa de modulos e permissoes faz round-trip para modulos independentes", () => {
  const map = {
    dogs: "none",
    tutors: "none",
    occurrences: "none",
    adoptions: "none",
    team: "manage",
    settings: "manage",
    system: "manage",
  } as const;

  const permissions = moduleMapToPermissions(map);
  const restored = permissionsToModuleMap(permissions);

  expect(restored).toEqual(map);
});

test("helpers de permissao avaliam conjuntos esperados", () => {
  const permissions = moduleMapToPermissions({
    dogs: "manage",
    tutors: "manage",
    occurrences: "manage",
    adoptions: "manage",
    team: "manage",
    settings: "manage",
    system: "manage",
  });

  expect(hasPermission(permissions, "dogs.change_status")).toBe(true);
  expect(hasPermission(permissions, "system.audit_log")).toBe(true);
  expect(
    hasAllPermissions(permissions, ["dogs.read", "templates.manage"]),
  ).toBe(true);
});

test("auditoria exige permissao system.audit_log", async () => {
  const t = convexTest(schema, modules);

  await expect(
    t.query(api.audit.list, {
      paginationOpts: { numItems: 10, cursor: null },
      callerPermissions: ["dogs.read"],
    }),
  ).rejects.toThrow(/permissao/i);

  const csv = await t.query(api.audit.exportCsv, {
    callerPermissions: ["system.audit_log"],
  });

  expect(csv.startsWith("created_at,")).toBe(true);
});
