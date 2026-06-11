import {
  BellIcon,
  ClipboardListIcon,
  DogIcon,
  HomeIcon,
  MenuIcon,
  ScanLineIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const desktopNavItems = [
  { to: "/", label: "Inicio", icon: HomeIcon },
  { to: "/identify", label: "Identificar", icon: ScanLineIcon },
  { to: "/dogs", label: "Caes", icon: DogIcon },
  { to: "/tutors", label: "Tutores", icon: UsersIcon },
  { to: "/team", label: "Equipe", icon: UsersIcon },
  { to: "/notifications", label: "Notificacoes", icon: BellIcon },
  { to: "/audit", label: "Auditoria", icon: ClipboardListIcon },
  { to: "/settings", label: "Configuracoes", icon: SettingsIcon },
] as const;

const mobileNavItems = [
  { to: "/", label: "Inicio", icon: HomeIcon },
  { to: "/identify", label: "Identificar", icon: ScanLineIcon },
  { to: "/dogs", label: "Caes", icon: DogIcon },
  { to: "/tutors", label: "Tutores", icon: UsersIcon },
  { to: "/settings", label: "Mais", icon: MenuIcon },
] as const;

function NavItem({
  to,
  label,
  icon: Icon,
  compact = false,
}: {
  to: string;
  label: string;
  icon: typeof HomeIcon;
  compact?: boolean;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          compact ? "min-h-11 min-w-11 flex-col justify-center px-2 text-xs" : "w-full",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
      end={to === "/"}
      to={to}
    >
      <Icon aria-hidden="true" className={compact ? "size-5" : "size-4"} />
      <span>{label}</span>
    </NavLink>
  );
}

export function AppLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <DogIcon aria-hidden="true" className="size-5" />
            <div>
              <p className="text-sm font-semibold">OOPA</p>
              <p className="text-xs text-muted-foreground">Gestao da ONG</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild className="min-h-11 min-w-11" size="icon" variant="ghost">
              <NavLink aria-label="Notificacoes" to="/notifications">
                <BellIcon aria-hidden="true" />
              </NavLink>
            </Button>
            <Button asChild className="min-h-11" size="sm" variant="outline">
              <NavLink to="/profile">Conta</NavLink>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl pt-14">
        <aside className="sticky top-14 hidden h-[calc(100svh-3.5rem)] w-60 shrink-0 border-r p-4 lg:block">
          <nav aria-label="Navegacao principal" className="flex flex-col gap-1">
            {desktopNavItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </aside>

        <main className="min-h-[calc(100svh-3.5rem)] flex-1 px-4 py-6 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Navegacao inferior"
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 px-2 py-2">
          {mobileNavItems.map((item) => (
            <NavItem compact key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  );
}
