import type {
  ModulePermissionMap,
  Permission,
  PermissionLevel,
  UiModule,
} from "@/lib/permissions";
import { UI_MODULES } from "@/lib/permissions";

const MODULE_LEVEL_PERMISSIONS: Record<
  UiModule,
  Record<PermissionLevel, readonly string[]>
> = {
  dogs: {
    none: [],
    read: ["dogs.read"],
    write: ["dogs.read", "dogs.create", "dogs.edit"],
    manage: ["dogs.read", "dogs.create", "dogs.edit", "dogs.change_status"],
  },
  people: {
    none: [],
    read: ["people.read"],
    write: ["people.read", "people.create", "people.edit"],
    manage: ["people.read", "people.read_sensitive", "people.create", "people.edit"],
  },
  occurrences: {
    none: [],
    read: ["occurrences.read"],
    write: [
      "occurrences.read",
      "occurrences.create_rotina",
      "occurrences.create_clinica",
      "occurrences.create_outro",
    ],
    manage: [
      "occurrences.read",
      "occurrences.read_legal",
      "occurrences.create_rotina",
      "occurrences.create_clinica",
      "occurrences.create_risco",
      "occurrences.create_legal",
      "occurrences.create_adocao",
      "occurrences.create_outro",
    ],
  },
  adoptions: {
    none: [],
    read: ["adoptions.read", "dogs.read", "people.read"],
    write: [
      "adoptions.read",
      "adoptions.create",
      "dogs.read",
      "people.read",
      "occurrences.create_adocao",
    ],
    manage: [
      "adoptions.read",
      "adoptions.create",
      "adoptions.manage",
      "dogs.read",
      "people.read",
      "people.read_sensitive",
      "occurrences.create_adocao",
      "occurrences.create_outro",
    ],
  },
  team: {
    none: [],
    read: ["users.invite"],
    write: ["users.invite"],
    manage: ["users.invite", "users.manage_permissions", "users.deactivate"],
  },
  settings: {
    none: [],
    read: [],
    write: ["bairros.manage", "services.manage", "supplies.manage"],
    manage: [
      "templates.manage",
      "occurrence_types.manage",
      "bairros.manage",
      "services.manage",
      "supplies.manage",
    ],
  },
  system: {
    none: [],
    read: [],
    write: [],
    manage: ["system.audit_log"],
  },
  public_reports: {
    none: [],
    read: [],
    write: [],
    manage: ["public_reports.triage"],
  },
  rescues: {
    none: [],
    read: ["rescues.read"],
    write: ["rescues.read", "rescues.create"],
    manage: ["rescues.read", "rescues.create", "rescues.manage"],
  },
  castration: {
    none: [],
    read: ["castration.read"],
    write: ["castration.read", "castration.create"],
    manage: ["castration.read", "castration.create", "castration.manage"],
  },
  organization: {
    none: [],
    read: [],
    write: [],
    manage: ["organization.manage"],
  },
  appointments: {
    none: [],
    read: ["appointments.read", "dogs.read", "people.read"],
    write: ["appointments.read", "appointments.create", "dogs.read", "people.read"],
    manage: [
      "appointments.read",
      "appointments.create",
      "appointments.manage",
      "dogs.read",
      "people.read",
    ],
  },
  // Modulo somente leitura: qualquer nivel diferente de "none" concede a
  // mesma permissao (espelha `convex/permissions.ts`).
  reports: {
    none: [],
    read: ["reports.read"],
    write: ["reports.read"],
    manage: ["reports.read"],
  },
};

export function moduleMapToPermissions(map: ModulePermissionMap): Permission[] {
  const permissions = new Set<Permission>();
  for (const module of UI_MODULES) {
    for (const permission of MODULE_LEVEL_PERMISSIONS[module][map[module]]) {
      permissions.add(permission as Permission);
    }
  }
  return [...permissions];
}
