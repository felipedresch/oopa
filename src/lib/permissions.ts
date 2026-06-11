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

export type ModulePermissionMap = Record<UiModule, PermissionLevel>;

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

export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  none: "Nao pode acessar este modulo.",
  read: "Pode consultar informacoes permitidas.",
  write: "Pode criar e editar registros do modulo.",
  manage: "Pode executar acoes administrativas do modulo.",
};

export function createEmptyModuleMap(): ModulePermissionMap {
  return {
    dogs: "none",
    tutors: "none",
    occurrences: "none",
    adoptions: "none",
    team: "none",
    settings: "none",
    system: "none",
  };
}

export function hasPermission(
  userPermissions: readonly string[],
  required: string,
): boolean {
  return userPermissions.includes(required);
}

export function hasAnyPermission(
  userPermissions: readonly string[],
  required: readonly string[],
): boolean {
  return required.some((permission) => userPermissions.includes(permission));
}

export function summarizeModuleMap(map: ModulePermissionMap): string {
  const activeModules = UI_MODULES.filter((module) => map[module] !== "none");
  if (activeModules.length === 0) {
    return "Sem acesso a modulos.";
  }

  return activeModules
    .map((module) => `${UI_MODULE_LABELS[module]}: ${PERMISSION_LEVEL_LABELS[map[module]]}`)
    .join(" · ");
}
