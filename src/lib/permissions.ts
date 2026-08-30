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
] as const;

export type UiModule = (typeof UI_MODULES)[number];

export const PERMISSION_LEVELS = ["none", "read", "write", "manage"] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

export type ModulePermissionMap = Record<UiModule, PermissionLevel>;

export const UI_MODULE_LABELS: Record<UiModule, string> = {
  dogs: "Cães",
  people: "Pessoas",
  occurrences: "Ocorrências",
  adoptions: "Adocoes e devoluções",
  team: "Equipe",
  settings: "Configurações",
  system: "Sistema",
  public_reports: "Denúncias externas",
  rescues: "Resgates",
  castration: "Castração",
};

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  none: "Sem acesso",
  read: "Leitura",
  write: "Escrita",
  manage: "Gestão",
};

export const PERMISSION_LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  none: "Não pode acessar este módulo.",
  read: "Pode consultar informações permitidas.",
  write: "Pode criar e editar registros do módulo.",
  manage: "Pode executar ações administrativas do módulo.",
};

export function createEmptyModuleMap(): ModulePermissionMap {
  return {
    dogs: "none",
    people: "none",
    occurrences: "none",
    adoptions: "none",
    team: "none",
    settings: "none",
    system: "none",
    public_reports: "none",
    rescues: "none",
    castration: "none",
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
    return "Sem acesso a módulos.";
  }

  return activeModules
    .map((module) => `${UI_MODULE_LABELS[module]}: ${PERMISSION_LEVEL_LABELS[map[module]]}`)
    .join(" · ");
}
