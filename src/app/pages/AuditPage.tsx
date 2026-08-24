import { useConvex, usePaginatedQuery, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import {
  AUDIT_TONE_CLASS,
  getAuditActionInfo,
  getEntityIdLabel,
  getEntityLabel,
} from "@/lib/audit-labels";
import { formatDateTime } from "@/lib/formatters";

const ENTITY_OPTIONS = [
  { value: "", label: "Todas as entidades" },
  { value: "user", label: "Usuário" },
  { value: "dog", label: "Animal" },
  { value: "person", label: "Pessoa" },
  { value: "occurrence", label: "Ocorrência" },
  { value: "permission_template", label: "Template" },
  { value: "bairro", label: "Bairro" },
  { value: "occurrence_type", label: "Tipo de ocorrência" },
] as const;

type PendingExport = {
  title: string;
  description: string;
  run: () => Promise<void>;
};

export function AuditPage() {
  const { can } = usePermissions();
  const convex = useConvex();
  const [actorUserId, setActorUserId] = useState<Id<"users"> | "">("");
  const [entityType, setEntityType] = useState<(typeof ENTITY_OPTIONS)[number]["value"]>("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingOperational, setExportingOperational] = useState<string | null>(null);
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null);

  const actors = useQuery(api.audit.listActors, can("system.audit_log") ? {} : "skip");

  const hasActiveFilters = Boolean(
    actorUserId || entityType || action.trim() || from || to,
  );

  const filters = useMemo(
    () => ({
      actorUserId: actorUserId || undefined,
      entityType: entityType || undefined,
      action: action.trim() || undefined,
      from: from ? new Date(from).getTime() : undefined,
      to: to ? new Date(`${to}T23:59:59`).getTime() : undefined,
    }),
    [action, actorUserId, entityType, from, to],
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.audit.list,
    can("system.audit_log") ? filters : "skip",
    { initialNumItems: 25 },
  );

  if (!can("system.audit_log")) {
    return <PermissionDenied />;
  }

  const downloadCsv = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const runAuditExport = async () => {
    setExporting(true);
    try {
      const csv = await convex.query(api.audit.exportCsv, {
        ...filters,
        limit: 2000,
      });
      downloadCsv(csv, `auditoria-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  const requestAuditExport = () => {
    setPendingExport({
      title: "Exportar registros de auditoria",
      description: hasActiveFilters
        ? "Será exportado apenas o que corresponde aos filtros aplicados acima (até 2000 registros)."
        : "Nenhum filtro aplicado: isto exportará TODOS os registros de auditoria do sistema (até 2000).",
      run: runAuditExport,
    });
  };

  const requestOperationalExport = (
    key: string,
    label: string,
    queryFn: () => Promise<string>,
    filename: string,
  ) => {
    setPendingExport({
      title: `Exportar ${label.toLowerCase()}`,
      description: `Isto exporta TODOS os ${label.toLowerCase()} do sistema, independentemente dos filtros acima.`,
      run: async () => {
        setExportingOperational(key);
        try {
          const csv = await queryFn();
          downloadCsv(csv, filename);
        } finally {
          setExportingOperational(null);
        }
      },
    });
  };

  const confirmPendingExport = () => {
    const pending = pendingExport;
    setPendingExport(null);
    if (pending) {
      void pending.run();
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button
            className="min-h-11"
            disabled={exporting}
            onClick={requestAuditExport}
            type="button"
          >
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        }
        description="Consulte ações sensíveis com filtros e exportação para análise."
        title="Auditoria"
      />

      <FilterBar>
        <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-actor">Usuário</Label>
            <select
              className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="audit-actor"
              onChange={(event) => setActorUserId(event.target.value as Id<"users"> | "")}
              value={actorUserId}
            >
              <option value="">Todos</option>
              {actors?.map((actor) => (
                <option key={actor._id} value={actor._id}>
                  {actor.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-entity">Entidade</Label>
            <select
              className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="audit-entity"
              onChange={(event) =>
                setEntityType(event.target.value as (typeof ENTITY_OPTIONS)[number]["value"])
              }
              value={entityType}
            >
              {ENTITY_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-action">Ação</Label>
            <Input
              id="audit-action"
              onChange={(event) => setAction(event.target.value)}
              placeholder="Ex.: occurrences.create"
              value={action}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-from">De</Label>
            <DatePicker id="audit-from" onChange={setFrom} value={from} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-to">Até</Label>
            <DatePicker id="audit-to" onChange={setTo} value={to} />
          </div>
        </div>
      </FilterBar>

      <section className="border-t pt-5">
        <h2 className="mb-1 font-semibold">Exportações operacionais</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Baixe snapshots completos de animais, pessoas, ocorrências e histórico tutor-animal para
          análise externa. Estas exportações ignoram os filtros acima e incluem todo o sistema.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: "dogs",
              label: "Animais",
              query: () => convex.query(api.exports.exportDogsCsv, { limit: 2000 }),
              file: "animais",
            },
            {
              key: "people",
              label: "Pessoas",
              query: () => convex.query(api.exports.exportPeopleCsv, { limit: 2000 }),
              file: "pessoas",
            },
            {
              key: "occurrences",
              label: "Ocorrências",
              query: () => convex.query(api.exports.exportOccurrencesCsv, { limit: 2000 }),
              file: "ocorrencias",
            },
            {
              key: "history",
              label: "Histórico tutor-animal",
              query: () => convex.query(api.exports.exportPersonDogHistoryCsv, { limit: 2000 }),
              file: "historico-tutor-animal",
            },
          ].map((item) => (
            <Button
              className="min-h-11"
              disabled={exportingOperational !== null}
              key={item.key}
              onClick={() =>
                requestOperationalExport(
                  item.key,
                  item.label,
                  item.query,
                  `${item.file}-${new Date().toISOString().slice(0, 10)}.csv`,
                )
              }
              type="button"
              variant="outline"
            >
              {exportingOperational === item.key ? "Exportando..." : item.label}
            </Button>
          ))}
        </div>
      </section>

      {status === "LoadingFirstPage" ? <LoadingSkeleton rows={5} /> : null}

      {status !== "LoadingFirstPage" && results.length === 0 ? (
        <EmptyState
          description="Nenhum registro corresponde aos filtros selecionados."
          title="Sem registros de auditoria"
        />
      ) : null}

      <ul className="divide-y divide-border">
        {results.map((entry) => {
          const info = getAuditActionInfo(entry.action);
          const ActionIcon = info.icon;
          return (
            <li className="flex gap-3 py-3.5 first:pt-0" key={entry._id}>
              <span
                aria-hidden="true"
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${AUDIT_TONE_CLASS[info.tone]}`}
              >
                <ActionIcon className="size-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-medium">{entry.summary}</p>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${AUDIT_TONE_CLASS[info.tone]}`}
                  >
                    {info.label}
                  </span>
                  <span className="text-muted-foreground">
                    {entry.actor_nome ?? "Sistema"} · {getEntityLabel(entry.entity_type)}
                  </span>
                </div>
                {entry.entity_id ? (
                  <p className="text-xs text-muted-foreground">
                    {getEntityIdLabel(entry.entity_type)}:{" "}
                    <span className="font-mono">{entry.entity_id}</span>
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {status === "CanLoadMore" ? (
        <Button className="min-h-11" onClick={() => loadMore(25)} type="button" variant="outline">
          Carregar mais
        </Button>
      ) : null}

      <ConfirmDialog
        confirmLabel="Exportar"
        description={pendingExport?.description ?? ""}
        onConfirm={confirmPendingExport}
        onOpenChange={(open) => {
          if (!open) {
            setPendingExport(null);
          }
        }}
        open={pendingExport !== null}
        title={pendingExport?.title ?? ""}
      />
    </section>
  );
}
