import type { LucideIcon } from "lucide-react";
import {
  BellIcon,
  BoxesIcon,
  CalendarDaysIcon,
  CalendarHeartIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  DogIcon,
  HeartHandshakeIcon,
  HomeIcon,
  LifeBuoyIcon,
  ListChecksIcon,
  MapPinnedIcon,
  MegaphoneIcon,
  ScanLineIcon,
  ScissorsIcon,
  SettingsIcon,
  StethoscopeIcon,
  Undo2Icon,
  UsersIcon,
} from "lucide-react";

export type NavIcon = LucideIcon;

export type NavAccess = {
  can: (permission: string) => boolean;
  canAny: (permissions: readonly string[]) => boolean;
};

export type NavItemConfig = {
  to: string;
  label: string;
  icon: NavIcon;
  /** Rótulo curto usado na barra inferior, quando o do menu é longo demais. */
  mobileLabel?: string;
  /** Abre fora do app (portal público de denúncia). */
  external?: boolean;
  canAccess: (access: NavAccess) => boolean;
};

/**
 * Menu agrupado por módulo (Fase 26). O primeiro bloco fica sem título por
 * ser o acesso rápido do dia a dia; os demais levam o nome do módulo.
 */
export type NavSection = {
  id: string;
  label?: string;
  items: NavItemConfig[];
};

export const navSections: NavSection[] = [
  {
    id: "inicio",
    items: [
      { to: "/", label: "Início", icon: HomeIcon, canAccess: () => true },
      {
        to: "/identify",
        label: "Identificar",
        icon: ScanLineIcon,
        canAccess: ({ can }) => can("dogs.read"),
      },
      {
        to: "/calendar",
        label: "Calendário",
        icon: CalendarDaysIcon,
        canAccess: ({ canAny }) =>
          canAny(["adoptions.read", "castration.read", "appointments.read"]),
      },
    ],
  },
  {
    id: "cadastros",
    label: "Cadastros",
    items: [
      {
        to: "/dogs",
        label: "Animais",
        icon: DogIcon,
        canAccess: ({ can }) => can("dogs.read"),
      },
      {
        to: "/people",
        label: "Pessoas",
        icon: UsersIcon,
        canAccess: ({ can }) => can("people.read"),
      },
      {
        to: "/settings/bairros",
        label: "Bairros",
        icon: MapPinnedIcon,
        canAccess: ({ can }) => can("bairros.manage"),
      },
      {
        to: "/catalog/services",
        label: "Serviços",
        icon: StethoscopeIcon,
        canAccess: ({ can }) => can("services.manage"),
      },
      {
        to: "/catalog/supplies",
        label: "Insumos",
        icon: BoxesIcon,
        canAccess: ({ can }) => can("supplies.manage"),
      },
    ],
  },
  {
    id: "ocorrencias",
    label: "Ocorrências",
    items: [
      {
        to: "/occurrences",
        label: "Visão geral",
        mobileLabel: "Ocorrências",
        icon: ListChecksIcon,
        canAccess: ({ canAny }) => canAny(["occurrences.read", "occurrences.read_legal"]),
      },
      {
        to: "/denuncia",
        label: "Portal de denúncias",
        icon: MegaphoneIcon,
        external: true,
        canAccess: ({ can }) => can("public_reports.triage"),
      },
    ],
  },
  {
    id: "adocoes",
    label: "Adoções e devoluções",
    items: [
      {
        to: "/adoptions/new",
        label: "Nova adoção",
        icon: HeartHandshakeIcon,
        canAccess: ({ canAny }) => canAny(["occurrences.create_adocao", "adoptions.create"]),
      },
      {
        to: "/returns/new",
        label: "Devolução à ONG",
        icon: Undo2Icon,
        canAccess: ({ can }) => can("occurrences.create_adocao"),
      },
      {
        to: "/adoptions/followups",
        label: "Acompanhamento",
        icon: CalendarHeartIcon,
        canAccess: ({ can }) => can("adoptions.read"),
      },
    ],
  },
  {
    id: "operacao",
    label: "Operação",
    items: [
      {
        to: "/castration",
        label: "Castração",
        icon: ScissorsIcon,
        canAccess: ({ can }) => can("castration.read"),
      },
      {
        to: "/rescues",
        label: "Resgates",
        icon: LifeBuoyIcon,
        canAccess: ({ can }) => can("rescues.read"),
      },
      {
        to: "/appointments",
        label: "Atendimentos",
        icon: StethoscopeIcon,
        canAccess: ({ can }) => can("appointments.read"),
      },
    ],
  },
  {
    id: "gestao",
    label: "Gestão",
    items: [
      {
        to: "/reports",
        label: "Relatórios",
        icon: ChartColumnIcon,
        canAccess: ({ can }) => can("reports.read"),
      },
      {
        to: "/team",
        label: "Equipe",
        icon: UsersIcon,
        canAccess: ({ canAny }) => canAny(["users.invite", "users.manage_permissions"]),
      },
      {
        to: "/notifications",
        label: "Notificações",
        icon: BellIcon,
        canAccess: () => true,
      },
      {
        to: "/audit",
        label: "Auditoria",
        icon: ClipboardListIcon,
        canAccess: ({ can }) => can("system.audit_log"),
      },
      {
        to: "/settings",
        label: "Configurações",
        icon: SettingsIcon,
        canAccess: ({ canAny }) =>
          canAny([
            "templates.manage",
            "occurrence_types.manage",
            "bairros.manage",
            "organization.manage",
            "services.manage",
            "supplies.manage",
          ]),
      },
    ],
  },
];

/** Rotas da barra inferior (mobile), na ordem de uso em campo. */
const MOBILE_NAV_ROUTES = ["/", "/identify", "/dogs", "/people", "/occurrences"];

const allNavItems = navSections.flatMap((section) => section.items);

export const mobileNavItems = MOBILE_NAV_ROUTES.map((route) =>
  allNavItems.find((item) => item.to === route),
).filter((item): item is NavItemConfig => item !== undefined);

export function visibleNavSections(access: NavAccess): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.canAccess(access)),
    }))
    .filter((section) => section.items.length > 0);
}

