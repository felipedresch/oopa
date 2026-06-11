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
  tutors: {
    none: [],
    read: ["tutors.read"],
    write: ["tutors.read", "tutors.create", "tutors.edit"],
    manage: ["tutors.read", "tutors.read_sensitive", "tutors.create", "tutors.edit"],
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
    read: ["dogs.read", "tutors.read"],
    write: ["dogs.read", "tutors.read", "occurrences.create_adocao"],
    manage: [
      "dogs.read",
      "tutors.read",
      "tutors.read_sensitive",
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
    write: ["bairros.manage"],
    manage: ["templates.manage", "occurrence_types.manage", "bairros.manage"],
  },
  system: {
    none: [],
    read: [],
    write: [],
    manage: ["system.audit_log"],
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
