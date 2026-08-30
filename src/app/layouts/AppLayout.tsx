import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { BellIcon, ChevronDownIcon, DogIcon, LogOutIcon, UserIcon } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import {
  mobileNavItems,
  sectionIdForPath,
  visibleNavSections,
  type NavIcon,
  type NavSection,
} from "@/app/layouts/navigation";
import { GlobalSearch } from "@/components/GlobalSearch";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";

function UnreadDot({ count, className }: { count: number; className?: string }) {
  if (count <= 0) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary-foreground",
        className,
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

const SIDEBAR_ITEM_CLASS =
  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors";
const SIDEBAR_ITEM_IDLE_CLASS =
  "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";

function SidebarNavItem({
  to,
  label,
  icon: Icon,
  external = false,
  unreadCount = 0,
}: {
  to: string;
  label: string;
  icon: NavIcon;
  external?: boolean;
  unreadCount?: number;
}) {
  if (external) {
    return (
      <a
        className={cn(SIDEBAR_ITEM_CLASS, SIDEBAR_ITEM_IDLE_CLASS)}
        href={to}
        rel="noreferrer"
        target="_blank"
      >
        <Icon aria-hidden="true" className="size-4.5 shrink-0" />
        <span className="flex-1">{label}</span>
      </a>
    );
  }

  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          SIDEBAR_ITEM_CLASS,
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : SIDEBAR_ITEM_IDLE_CLASS,
        )
      }
      end={to === "/"}
      to={to}
    >
      <Icon aria-hidden="true" className="size-4.5 shrink-0" />
      <span className="flex-1">{label}</span>
      <UnreadDot count={unreadCount} />
    </NavLink>
  );
}

function MobileNavItem({
  to,
  label,
  mobileLabel,
  icon: Icon,
}: {
  to: string;
  label: string;
  mobileLabel?: string;
  icon: NavIcon;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          "flex min-h-12 min-w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-medium transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )
      }
      end={to === "/"}
      to={to}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
              isActive && "bg-accent",
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span>{mobileLabel ?? label}</span>
        </>
      )}
    </NavLink>
  );
}

/**
 * Seção do menu lateral. Com 21 itens o menu completo nao cabe numa tela de
 * 900px, entao as seções sao recolhiveis e apenas a do modulo atual abre por
 * padrao; o estado escolhido pelo usuario sobrevive a navegacao.
 */
function SidebarSection({
  section,
  expanded,
  onToggle,
  unreadCount,
}: {
  section: NavSection;
  expanded: boolean;
  onToggle: () => void;
  unreadCount: number;
}) {
  const listId = `nav-section-${section.id}`;

  if (!section.label) {
    return (
      <ul className="flex flex-col gap-1">
        {section.items.map((item) => (
          <li key={item.to}>
            <SidebarNavItem {...item} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        aria-controls={listId}
        aria-expanded={expanded}
        className="mt-3 flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase transition-colors hover:text-sidebar-foreground/80"
        onClick={onToggle}
        type="button"
      >
        <ChevronDownIcon
          aria-hidden="true"
          className={cn("size-3.5 transition-transform", !expanded && "-rotate-90")}
        />
        {section.label}
      </button>
      {expanded ? (
        <ul className="flex flex-col gap-1" id={listId}>
          {section.items.map((item) => (
            <li key={item.to}>
              <SidebarNavItem
                unreadCount={item.to === "/notifications" ? unreadCount : 0}
                {...item}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function BrandMark({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <DogIcon aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="font-heading text-lg font-bold tracking-tight">oopa</p>
        {subtitle ? <p className="truncate text-xs opacity-70">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function AppLayout() {
  const { can, canAny, user, isAuthenticated } = usePermissions();
  const { signOut } = useAuthActions();
  const unreadCount =
    useQuery(api.notifications.unreadCount, isAuthenticated ? {} : "skip") ?? 0;
  const { pathname } = useLocation();
  const access = { can, canAny };
  const sections = visibleNavSections(access);
  const activeSectionId = sectionIdForPath(pathname);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (id: string) =>
    setCollapsedSections((current) => ({
      ...current,
      [id]: !(current[id] ?? id !== activeSectionId),
    }));
  const visibleMobile = mobileNavItems.filter((item) => item.canAccess(access));

  return (
    <ProtectedRoute>
      <div className="min-h-svh bg-background text-foreground lg:flex">
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
          <div className="flex flex-col gap-4 px-5 pt-6 pb-4">
            <NavLink className="inline-block rounded-lg" to="/">
              <BrandMark subtitle="Gestão da ONG" />
            </NavLink>
            <GlobalSearch variant="sidebar" />
          </div>

          <nav
            aria-label="Navegação principal"
            className="scrollbar-slim flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 pb-4"
          >
            {sections.map((section) => (
              <SidebarSection
                expanded={!(collapsedSections[section.id] ?? section.id !== activeSectionId)}
                key={section.id}
                onToggle={() => toggleSection(section.id)}
                section={section}
                unreadCount={unreadCount}
              />
            ))}
          </nav>

          <div className="border-t border-sidebar-border px-3 py-4">
            <div className="flex items-center gap-2 px-2 pb-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold uppercase">
                {user?.nome?.charAt(0) ?? "?"}
              </span>
              <p className="truncate text-sm font-medium">{user?.nome ?? "Conta"}</p>
            </div>
            <div className="flex gap-1">
              <NavLink
                className="flex min-h-10 flex-1 items-center gap-2 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                to="/profile"
              >
                <UserIcon aria-hidden="true" className="size-4" />
                Conta
              </NavLink>
              <button
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => void signOut()}
                type="button"
              >
                <LogOutIcon aria-hidden="true" className="size-4" />
                Sair
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-svh min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <NavLink className="rounded-lg" to="/">
                <BrandMark />
              </NavLink>
              <div className="flex items-center gap-1">
                <Button asChild className="relative size-11" size="icon" variant="ghost">
                  <NavLink aria-label="Notificações" to="/notifications">
                    <BellIcon aria-hidden="true" className="size-5" />
                    <UnreadDot className="absolute top-1 right-1" count={unreadCount} />
                  </NavLink>
                </Button>
                <Button asChild className="size-11" size="icon" variant="ghost">
                  <NavLink aria-label="Conta" to="/profile">
                    <UserIcon aria-hidden="true" className="size-5" />
                  </NavLink>
                </Button>
              </div>
            </div>
            <div className="px-4 pb-3">
              <GlobalSearch />
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 pb-28 sm:px-6 lg:px-10 lg:py-10 lg:pb-10">
            <Outlet />
          </main>
        </div>

        <nav
          aria-label="Navegação inferior"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto flex max-w-lg justify-around gap-1 px-2 py-1.5">
            {visibleMobile.map((item) => (
              <MobileNavItem key={item.to} {...item} />
            ))}
          </div>
        </nav>
      </div>
    </ProtectedRoute>
  );
}
