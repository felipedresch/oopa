import { expect, test } from "vitest";

import {
  hasAllPermissions,
  hasPermission,
  moduleLevelToPermissions,
  moduleMapToPermissions,
  permissionsToModuleMap,
  PERMISSION_CATALOG,
  UI_MODULES,
} from "./permissions";

test("catalogo granular contem todas as permissoes de dominio", () => {
  expect(PERMISSION_CATALOG).toHaveLength(40);
  expect(UI_MODULES).toHaveLength(13);
});

test("traduz modulo e nivel para permissoes granulares", () => {
  expect(moduleLevelToPermissions("dogs", "manage")).toEqual([
    "dogs.read",
    "dogs.create",
    "dogs.edit",
    "dogs.change_status",
  ]);

  expect(moduleLevelToPermissions("system", "manage")).toEqual(["system.audit_log"]);
  expect(moduleLevelToPermissions("public_reports", "manage")).toEqual([
    "public_reports.triage",
  ]);
  expect(moduleLevelToPermissions("rescues", "write")).toEqual([
    "rescues.read",
    "rescues.create",
  ]);
  expect(moduleLevelToPermissions("castration", "write")).toEqual([
    "castration.read",
    "castration.create",
  ]);
  expect(moduleLevelToPermissions("adoptions", "manage")).toEqual([
    "adoptions.read",
    "adoptions.create",
    "adoptions.manage",
    "dogs.read",
    "people.read",
    "people.read_sensitive",
    "occurrences.create_adocao",
    "occurrences.create_outro",
  ]);
  expect(moduleLevelToPermissions("organization", "manage")).toEqual([
    "organization.manage",
  ]);
  expect(moduleLevelToPermissions("settings", "write")).toEqual([
    "bairros.manage",
    "services.manage",
    "supplies.manage",
  ]);
  expect(moduleLevelToPermissions("appointments", "manage")).toEqual([
    "appointments.read",
    "appointments.create",
    "appointments.manage",
    "dogs.read",
    "people.read",
  ]);
  expect(moduleLevelToPermissions("team", "none")).toEqual([]);
});

test("mapa de modulos e permissoes faz round-trip para modulos independentes", () => {
  const map = {
    dogs: "none",
    people: "none",
    occurrences: "none",
    adoptions: "none",
    team: "manage",
    settings: "manage",
    system: "manage",
    public_reports: "manage",
    rescues: "manage",
    castration: "manage",
    organization: "manage",
    appointments: "none",
    reports: "manage",
  } as const;

  const permissions = moduleMapToPermissions(map);
  const restored = permissionsToModuleMap(permissions);

  expect(restored).toEqual(map);
});

test("helpers de permissao avaliam conjuntos esperados", () => {
  const permissions = moduleMapToPermissions({
    dogs: "manage",
    people: "manage",
    occurrences: "manage",
    adoptions: "manage",
    team: "manage",
    settings: "manage",
    system: "manage",
    public_reports: "manage",
    rescues: "manage",
    castration: "manage",
    organization: "manage",
    appointments: "manage",
    reports: "manage",
  });

  expect(hasPermission(permissions, "dogs.change_status")).toBe(true);
  expect(hasPermission(permissions, "system.audit_log")).toBe(true);
  expect(hasPermission(permissions, "public_reports.triage")).toBe(true);
  expect(hasPermission(permissions, "rescues.manage")).toBe(true);
  expect(hasPermission(permissions, "castration.manage")).toBe(true);
  expect(hasPermission(permissions, "organization.manage")).toBe(true);
  expect(hasPermission(permissions, "services.manage")).toBe(true);
  expect(hasPermission(permissions, "supplies.manage")).toBe(true);
  expect(
    hasAllPermissions(permissions, ["dogs.read", "templates.manage"]),
  ).toBe(true);
});
