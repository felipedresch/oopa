import { v } from "convex/values";

export const PERMISSION_CATALOG = [
  "dogs.read",
  "dogs.create",
  "dogs.edit",
  "dogs.change_status",
  "people.read",
  "people.read_sensitive",
  "people.create",
  "people.edit",
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
  "public_reports.triage",
  "rescues.read",
  "rescues.create",
  "rescues.manage",
  "castration.read",
  "castration.create",
  "castration.manage",
  "adoptions.read",
  "adoptions.create",
  "adoptions.manage",
  "organization.manage",
  "services.manage",
  "supplies.manage",
  "appointments.read",
  "appointments.create",
  "appointments.manage",
] as const;

export type Permission = (typeof PERMISSION_CATALOG)[number];

export const UI_MODULES = [
  "dogs",
  "people",
  "occurrences",
  "adoptions",
  "team",
  "settings",
  "system",
  "public_reports",
  "rescues",
  "castration",
  "organization",
  "appointments",
] as const;

export type UiModule = (typeof UI_MODULES)[number];

export const PERMISSION_LEVELS = ["none", "read", "write", "manage"] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export const uiModuleValidator = v.union(
  v.literal("dogs"),
  v.literal("people"),
  v.literal("occurrences"),
  v.literal("adoptions"),
  v.literal("team"),
  v.literal("settings"),
  v.literal("system"),
  v.literal("public_reports"),
  v.literal("rescues"),
  v.literal("castration"),
  v.literal("organization"),
  v.literal("appointments"),
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
  v.literal("people.read"),
  v.literal("people.read_sensitive"),
  v.literal("people.create"),
  v.literal("people.edit"),
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
  v.literal("public_reports.triage"),
  v.literal("rescues.read"),
  v.literal("rescues.create"),
  v.literal("rescues.manage"),
  v.literal("castration.read"),
  v.literal("castration.create"),
  v.literal("castration.manage"),
  v.literal("adoptions.read"),
  v.literal("adoptions.create"),
  v.literal("adoptions.manage"),
  v.literal("organization.manage"),
  v.literal("services.manage"),
  v.literal("supplies.manage"),
  v.literal("appointments.read"),
  v.literal("appointments.create"),
  v.literal("appointments.manage"),
);

export const UI_MODULE_LABELS: Record<UiModule, string> = {
  dogs: "Caes",
  people: "Pessoas",
  occurrences: "Ocorrencias",
  adoptions: "Adocoes e devolucoes",
  team: "Equipe",
  settings: "Configuracoes",
  system: "Sistema",
  public_reports: "Denuncias externas",
  rescues: "Resgates",
  castration: "Castracao",
  organization: "Dados da ONG",
  appointments: "Atendimentos",
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
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Agente Prefeitura",
    descricao: "Leitura de caes e pessoas com registro de ocorrencias de campo.",
    moduleMap: {
      dogs: "read",
      people: "read",
      occurrences: "write",
      adoptions: "none",
      team: "none",
      settings: "none",
      system: "none",
      public_reports: "none",
      rescues: "write",
      castration: "write",
      organization: "none",
      appointments: "read",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Voluntario de Campo",
    descricao: "Cadastro e acompanhamento operacional em campo.",
    moduleMap: {
      dogs: "write",
      people: "write",
      occurrences: "write",
      adoptions: "write",
      team: "none",
      settings: "none",
      system: "none",
      public_reports: "none",
      rescues: "write",
      castration: "write",
      organization: "none",
      appointments: "none",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Pet Shop Parceiro",
    descricao: "Consulta basica e registro de rotina.",
    moduleMap: {
      dogs: "read",
      people: "read",
      occurrences: "write",
      adoptions: "none",
      team: "none",
      settings: "none",
      system: "none",
      public_reports: "none",
      rescues: "none",
      castration: "none",
      organization: "none",
      appointments: "write",
    } satisfies ModulePermissionMap,
  },
  {
    nome: "Leitura Restrita",
    descricao: "Somente consulta sem alteracao de dados.",
    moduleMap: {
      dogs: "read",
      people: "read",
      occurrences: "read",
      adoptions: "read",
      team: "none",
      settings: "none",
      system: "none",
      public_reports: "none",
      rescues: "read",
      castration: "read",
      organization: "none",
      appointments: "read",
    } satisfies ModulePermissionMap,
  },
] as const;
