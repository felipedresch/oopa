import { ChevronRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { usePermissions } from "@/hooks/usePermissions";
import { REPORTS } from "@/lib/reports";

export function ReportsPage() {
  const { can } = usePermissions();

  if (!can("reports.read")) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Escolha um relatório para filtrar por período e exportar em CSV."
        title="Relatórios"
      />

      <div className="grid gap-3 md:grid-cols-2">
        {REPORTS.map((report) => (
          <Link
            className="group flex items-center justify-between gap-3 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
            key={report.id}
            to={`/reports/${report.id}`}
          >
            <span className="min-w-0">
              <h2 className="font-sans text-base font-semibold">{report.titulo}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{report.descricao}</p>
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
