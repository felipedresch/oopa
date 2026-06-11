import { v } from "convex/values";

export const PERMISSION_CATALOG = [
  "dogs.read",
  "dogs.create",
  "dogs.edit",
  "dogs.change_status",
  "tutors.read",
  "tutors.read_sensitive",
  "tutors.create",
  "tutors.edit",
  "occurrences.read",
  "occurrences.read_legal",
  "occurrences.create_rotina",
  "occurrences.create_clinica",
  "occurrences.create_risco",
  "occurrences.create_legal",
  "occurrences.create_adocao",
  "occurrences.create_outro",
  "users.invite",
  "users.manage_permissions",
  "users.deactivate",
  "templates.manage",
  "occurrence_types.manage",
  "bairros.manage",
  "system.audit_log",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export const UI_MODULES = [
  "dogs",
  "tutors",
  "occurrences",
  "adoptions",
  "team",
  "settings",
  "system",
] as const;

export type UiModule = (typeof UI_MODULES)[number];

export const PERMISSION_LEVELS = ["none", "read", "write", "manage"] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const uiModuleValidator = v.union(
  v.literal("dogs"),
  v.literal("tutors"),
  v.literal("occurrences"),
  v.literal("adoptions"),
  v.literal("team"),
  v.literal("settings"),
  v.literal("system"),
);

export const permissionLevelValidator = v.union(
  v.literal("none"),
  v.literal("read"),
  v.literal("write"),
  v.literal("manage"),
);

export const permissionValidator = v.union(
  v.literal("dogs.read"),
  v.literal("dogs.create"),
  v.literal("dogs.edit"),
  v.literal("dogs.change_status"),
  v.literal("tutors.read"),
  v.literal("tutors.read_sensitive"),
  v.literal("tutors.create"),
  v.literal("tutors.edit"),
  v.literal("occurrences.read"),
  v.literal("occurrences.read_legal"),
  v.literal("occurrences.create_rotina"),
  v.literal("occurrences.create_clinica"),
  v.literal("occurrences.create_risco"),
  v.literal("occurrences.create_legal"),
  v.literal("occurrences.create_adocao"),
  v.literal("occurrences.create_outro"),
  v.literal("users.invite"),
  v.literal("users.manage_permissions"),
  v.literal("users.deactivate"),
  v.literal("templates.manage"),
  v.literal("occurrence_types.manage"),
  v.literal("bairros.manage"),
  v.literal("system.audit_log"),
);

export const UI_MODULE_LABELS: Record<UiModule, string> = {
  dogs: "Caes",
  tutors: "Tutores",
  occurrences: "Ocorrencias",
  adoptions: "Adocoes e devolucoes",
  team: "Equipe",
  settings: "Configuracoes",
  system: "Sistema",
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "Sem acesso",
  read: "Leitura",
  write: "Escrita",
  manage: "Gestao",
};

const MODULE_LEVEL_PERMISSIONS: Record<UiModule, Record<PermissionLevel, readonly Permission[]>> = {
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

export type ModulePermissionMap = Record<UiModule, PermissionLevel>;

export function moduleLevelToPermissions(
  module: UiModule,
  level: PermissionLevel,
): Permission[] {
  return [...MODULE_LEVEL_PERMISSIONS[module][level]];
}

export function moduleMapToPermissions(map: ModulePermissionMap): Permission[] {
  const permissions = new Set<Permission>();
  for (const module of UI_MODULES) {
    for (const permission of moduleLevelToPermissions(module, map[module])) {
      permissions.add(permission);
    }
  }
  return [...permissions];
}

export function permissionsToModuleMap(permissions: readonly string[]): ModulePermissionMap {
  const permissionSet = new Set(permissions);
  const map = {} as ModulePermissionMap;

  for (const module of UI_MODULES) {
    let bestLevel: PermissionLevel = "none";
    for (const level of PERMISSION_LEVELS) {
      const levelPermissions = MODULE_LEVEL_PERMISSIONS[module][level];
      if (
        levelPermissions.length > 0 &&
        levelPermissions.every((permission) => permissionSet.has(permission))
      ) {
        bestLevel = level;
      }
    }
    map[module] = bestLevel;
  }

  return map;
}

export function hasPermission(
  userPermissions: readonly string[],
  required: Permission,
): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(
  userPermissions: readonly string[],
  required: readonly Permission[],
): boolean {
  return required.some((permission) => userPermissions.includes(permission));
}

export function hasAllPermissions(
  userPermissions: readonly string[],
  required: readonly Permission[],
): boolean {
  return required.every((permission) => userPermissions.includes(permission));
}

export const SEED_PERMISSION_TEMPLATES = [
  {
    nome: "Administrador ONG",
    descricao: "Acesso completo a todos os modulos do sistema.",
    moduleMap: {
      dogs: "manage",
      tutors: "manage",
      occurrences: "manage",
      adoptions: "manage",
      team: "manage",
      settings: "manage",
      system: "manage",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Agente Prefeitura",
    descricao: "Leitura de caes e tutores com registro de ocorrencias de campo.",
    moduleMap: {
      dogs: "read",
      tutors: "read",
      occurrences: "write",
      adoptions: "none",
      team: "none",
      settings: "none",
      system: "none",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Voluntario de Campo",
    descricao: "Cadastro e acompanhamento operacional em campo.",
    moduleMap: {
      dogs: "write",
      tutors: "write",
      occurrences: "write",
      adoptions: "write",
      team: "none",
      settings: "none",
      system: "none",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Pet Shop Parceiro",
    descricao: "Consulta basica e registro de rotina.",
    moduleMap: {
      dogs: "read",
      tutors: "read",
      occurrences: "write",
      adoptions: "none",
      team: "none",
      settings: "none",
      system: "none",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Leitura Restrita",
    descricao: "Somente consulta sem alteracao de dados.",
    moduleMap: {
      dogs: "read",
      tutors: "read",
      occurrences: "read",
      adoptions: "read",
      team: "none",
      settings: "none",
      system: "none",
    } satisfies ModulePermissionMap,
  },
] as const;
