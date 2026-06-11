import { Link } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { PermissionGate } from "@/components/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

const settingsLinks = [
  {
    to: "/settings/permission-templates",
    title: "Templates de permissao",
    description: "Criar, editar e duplicar perfis de acesso.",
    permission: "templates.manage",
  },
  {
    to: "/settings/occurrence-types",
    title: "Tipos de ocorrencia",
    description: "Gerenciar catalogo de eventos do prontuario.",
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
          description="Escolha a area administrativa que deseja configurar."
          title="Configuracoes"
        />

        <div className="grid gap-4 md:grid-cols-2">
          {visibleLinks.map((link) => (
            <Link
              className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40"
              key={link.to}
              to={link.to}
            >
              <h2 className="text-base font-semibold">{link.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </PermissionGate>
  );
}
