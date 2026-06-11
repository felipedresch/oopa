import { useConvex, usePaginatedQuery, useQuery } from "convex/react";
import { useMemo, useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDateTime } from "@/lib/formatters";

const ENTITY_OPTIONS = [
  { value: "", label: "Todas as entidades" },
  { value: "user", label: "Usuário" },
  { value: "dog", label: "Cão" },
  { value: "tutor", label: "Tutor" },
  { value: "occurrence", label: "Ocorrência" },
  { value: "permission_template", label: "Template" },
  { value: "bairro", label: "Bairro" },
  { value: "occurrence_type", label: "Tipo de ocorrência" },
] as const;

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

  const actors = useQuery(api.audit.listActors, can("system.audit_log") ? {} : "skip");

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

  const handleExport = async () => {
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

  const handleOperationalExport = async (
    key: string,
    queryFn: () => Promise<string>,
    filename: string,
  ) => {
    setExportingOperational(key);
    try {
      const csv = await queryFn();
      downloadCsv(csv, filename);
    } finally {
      setExportingOperational(null);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button
            className="min-h-11"
            disabled={exporting}
            onClick={() => void handleExport()}
            type="button"
          >
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        }
        description="Consulte ações sensiveis com filtros e exportação para análise."
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
            <Label htmlFor="audit-action">Acao</Label>
            <Input
              id="audit-action"
              onChange={(event) => setAction(event.target.value)}
              placeholder="Ex.: occurrences.create"
              value={action}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-from">De</Label>
            <Input
              id="audit-from"
              onChange={(event) => setFrom(event.target.value)}
              type="date"
              value={from}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="audit-to">Até</Label>
            <Input
              id="audit-to"
              onChange={(event) => setTo(event.target.value)}
              type="date"
              value={to}
            />
          </div>
        </div>
      </FilterBar>

      <section className="border-t pt-5">
        <h2 className="mb-1 font-semibold">Exportacoes operacionais</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Baixe snapshots de cães, tutores, ocorrências e histórico tutor-cão para análise
          externa.
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: "dogs",
              label: "Cães",
              query: () => convex.query(api.exports.exportDogsCsv, { limit: 2000 }),
              file: "caes",
            },
            {
              key: "tutors",
              label: "Tutores",
              query: () => convex.query(api.exports.exportTutorsCsv, { limit: 2000 }),
              file: "tutores",
            },
            {
              key: "occurrences",
              label: "Ocorrências",
              query: () => convex.query(api.exports.exportOccurrencesCsv, { limit: 2000 }),
              file: "ocorrencias",
            },
            {
              key: "history",
              label: "Histórico tutor-cão",
              query: () => convex.query(api.exports.exportTutorDogHistoryCsv, { limit: 2000 }),
              file: "historico-tutor-cao",
            },
          ].map((item) => (
            <Button
              className="min-h-11"
              disabled={exportingOperational !== null}
              key={item.key}
              onClick={() =>
                void handleOperationalExport(
                  item.key,
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
        {results.map((entry) => (
          <li className="flex flex-col gap-1 py-3.5 first:pt-0" key={entry._id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-medium">{entry.summary}</p>
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {formatDateTime(entry.created_at)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {entry.actor_nome ?? "Sistema"} · {entry.action} · {entry.entity_type}
              {entry.entity_id ? ` · ${entry.entity_id}` : ""}
            </p>
          </li>
        ))}
      </ul>

      {status === "CanLoadMore" ? (
        <Button className="min-h-11" onClick={() => loadMore(25)} type="button" variant="outline">
          Carregar mais
        </Button>
      ) : null}
    </section>
  );
}
