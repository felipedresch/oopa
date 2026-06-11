import { ChevronRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

const settingsLinks = [
  {
    to: "/settings/permission-templates",
    title: "Templates de permissão",
    description: "Criar, editar e duplicar perfis de acesso.",
    permission: "templates.manage",
  },
  {
    to: "/settings/occurrence-types",
    title: "Tipos de ocorrência",
    description: "Gerenciar catálogo de eventos do prontuário.",
    permission: "occurrence_types.manage",
  },
  {
    to: "/settings/bairros",
    title: "Bairros",
    description: "Manter a lista de bairros usada nos cadastros.",
    permission: "bairros.manage",
  },
] as const;

export function SettingsPage() {
  const { can } = usePermissions();
  const visibleLinks = settingsLinks.filter((link) => can(link.permission));

  return (
    <PermissionGate anyOf={settingsLinks.map((link) => link.permission)}>
      <section className="flex flex-col gap-6">
        <PageHeader
          description="Escolha a área administrativa que deseja configurar."
          title="Configurações"
        />

        <div className="grid gap-3 md:grid-cols-2">
          {visibleLinks.map((link) => (
            <Link
              className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
              key={link.to}
              to={link.to}
            >
              <span className="min-w-0">
                <h2 className="font-sans text-base font-semibold">{link.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          ))}
        </div>
      </section>
    </PermissionGate>
  );
}
