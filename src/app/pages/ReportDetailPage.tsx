import { useConvex, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { dateInputToTimestamp } from "@/lib/dates";
import { findReport, reportCsvFileName } from "@/lib/reports";

const SELECT_CLASS =
  "h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ReportDetailPage() {
  const { reportId } = useParams();
  const { can } = usePermissions();
  const convex = useConvex();
  const report = findReport(reportId);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | undefined>();
  const [dogId, setDogId] = useState<Id<"dogs"> | "">("");
  const [personId, setPersonId] = useState<Id<"people"> | "">("");
  const [exporting, setExporting] = useState(false);

  const canRead = can("reports.read");
  const inicio = dateInputToTimestamp(from, "start");
  const fim = dateInputToTimestamp(to, "end");
  const periodoInvalido = inicio !== undefined && fim !== undefined && inicio > fim;

  const filters = useMemo(
    () => ({
      inicio,
      fim,
      bairroId: report?.filtros.includes("bairro") ? bairroId : undefined,
      dogId: report?.filtros.includes("animal") ? dogId || undefined : undefined,
      personId: report?.filtros.includes("pessoa") ? personId || undefined : undefined,
    }),
    [inicio, fim, bairroId, dogId, personId, report],
  );

  const canQuery = canRead && Boolean(report) && !periodoInvalido;

  const result = useQuery(
    api.reports.run,
    canQuery ? { relatorio: report!.id, ...filters } : "skip",
  );

  const dogOptions = useQuery(
    api.reports.searchEntities,
    canRead && report?.filtros.includes("animal") ? { tipo: "dogs" as const, limite: 50 } : "skip",
  );
  const personOptions = useQuery(
    api.reports.searchEntities,
    canRead && report?.filtros.includes("pessoa") ? { tipo: "people" as const, limite: 50 } : "skip",
  );

  if (!canRead) {
    return <PermissionDenied />;
  }

  if (!report) {
    return (
      <ErrorState
        description="Verifique o endereço ou volte para a lista de relatórios."
        title="Relatório não encontrado"
      />
    );
  }

  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await convex.query(api.reports.exportCsv, {
        relatorio: report.id,
        ...filters,
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = reportCsvFileName(report.id, Date.now());
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex gap-2">
            <Button asChild className="min-h-11" variant="outline">
              <Link to="/reports">Voltar</Link>
            </Button>
            <Button
              className="min-h-11"
              disabled={exporting || !result || result.linhas.length === 0}
              onClick={() => void exportCsv()}
            >
              {exporting ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>
        }
        description={report.descricao}
        title={report.titulo}
      />

      <FilterBar>
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-from">De</Label>
          <DatePicker id="report-from" onChange={setFrom} value={from} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="report-to">Até</Label>
          <DatePicker id="report-to" onChange={setTo} value={to} />
        </div>

        {report.filtros.includes("bairro") ? (
          <div className="flex min-w-56 flex-1 flex-col gap-2">
            <BairroAutocomplete onChange={(id) => setBairroId(id)} value={bairroId} />
          </div>
        ) : null}

        {report.filtros.includes("animal") ? (
          <div className="flex min-w-48 flex-col gap-2">
            <Label htmlFor="report-dog">Animal</Label>
            <select
              className={SELECT_CLASS}
              id="report-dog"
              onChange={(event) => setDogId(event.target.value as Id<"dogs"> | "")}
              value={dogId}
            >
              <option value="">Todos os animais</option>
              {(dogOptions ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {report.filtros.includes("pessoa") ? (
          <div className="flex min-w-48 flex-col gap-2">
            <Label htmlFor="report-person">Pessoa</Label>
            <select
              className={SELECT_CLASS}
              id="report-person"
              onChange={(event) => setPersonId(event.target.value as Id<"people"> | "")}
              value={personId}
            >
              <option value="">Todas as pessoas</option>
              {(personOptions ?? []).map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </FilterBar>

      {periodoInvalido ? (
        <p className="text-sm text-destructive">
          A data inicial precisa ser anterior à data final. Ajuste o período para ver o
          relatório.
        </p>
      ) : null}

      {!periodoInvalido && result === undefined ? <LoadingSkeleton rows={4} /> : null}

      {result ? (
        <>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.resumo.map((item) => (
              <div className="rounded-xl border bg-card p-4" key={item.label}>
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-xl font-semibold">{item.valor}</dd>
              </div>
            ))}
          </dl>

          {result.truncado ? (
            <p className="rounded-xl bg-warning/14 p-3 text-sm text-warning">
              O relatório atingiu o limite de linhas. Reduza o período para ver todos os
              registros.
            </p>
          ) : null}

          {result.linhas.length === 0 ? (
            <EmptyState
              description="Ajuste o período ou os filtros para ver outros registros."
              title="Nenhum registro no período"
            />
          ) : (
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b text-left">
                    {result.colunas.map((coluna) => (
                      <th className="px-4 py-3 font-semibold" key={coluna} scope="col">
                        {coluna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {result.linhas.map((linha) => (
                    <tr key={linha.id}>
                      {linha.celulas.map((celula, index) => (
                        <td className="px-4 py-3 align-top" key={index}>
                          {index === 0 && linha.rota ? (
                            <Link className="font-medium underline" to={linha.rota}>
                              {celula.texto}
                            </Link>
                          ) : celula.href ? (
                            <a
                              className="underline"
                              href={celula.href}
                              rel="noreferrer"
                              target="_blank"
                            >
                              {celula.texto}
                            </a>
                          ) : (
                            celula.texto
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
