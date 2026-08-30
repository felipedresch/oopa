import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { ClockIcon, MapPinIcon, UserIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatPublicReportTipo } from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/auth-errors";

type PublicReportStatus = "novo" | "em_analise" | "convertido" | "arquivado";

const STATUS_OPTIONS: { value: PublicReportStatus | ""; label: string }[] = [
  { value: "novo", label: "Novas" },
  { value: "em_analise", label: "Em análise" },
  { value: "convertido", label: "Convertidas" },
  { value: "arquivado", label: "Arquivadas" },
  { value: "", label: "Todas" },
];

const STATUS_BADGE_CLASS: Record<PublicReportStatus, string> = {
  novo: "bg-warning/14 text-warning",
  em_analise: "bg-info/12 text-info",
  convertido: "bg-success/12 text-success",
  arquivado: "bg-muted text-muted-foreground",
};

const STATUS_LABELS: Record<PublicReportStatus, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  convertido: "Convertida",
  arquivado: "Arquivada",
};

export function PublicReportsTriagePanel() {
  const [now] = useState(() => Date.now());
  const [status, setStatus] = useState<PublicReportStatus | "">("novo");
  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.publicReports.list,
    { status: status || undefined },
    { initialNumItems: 25 },
  );

  const [convertTarget, setConvertTarget] = useState<Id<"public_reports"> | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Id<"public_reports"> | null>(null);
  const [dogSearch, setDogSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<Id<"dogs"> | undefined>();
  const [convertError, setConvertError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);

  const dogOptions = useQuery(
    api.dogs.list,
    convertTarget && dogSearch.trim()
      ? {
          paginationOpts: { numItems: 5, cursor: null },
          search: dogSearch.trim(),
          now,
        }
      : "skip",
  );

  const convertToOccurrence = useMutation(api.publicReports.convertToOccurrence);
  const archiveReport = useMutation(api.publicReports.archive);

  const closeConvertDialog = () => {
    setConvertTarget(null);
    setDogSearch("");
    setSelectedDogId(undefined);
    setConvertError(null);
  };

  const handleConvert = async () => {
    if (!convertTarget) {
      return;
    }
    setConvertError(null);
    try {
      await convertToOccurrence({ publicReportId: convertTarget, dogId: selectedDogId });
      closeConvertDialog();
    } catch (error) {
      setConvertError(getErrorMessage(error, "Não foi possível converter a denúncia."));
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) {
      return;
    }
    setArchiveError(null);
    try {
      await archiveReport({ publicReportId: archiveTarget });
      setArchiveTarget(null);
    } catch (error) {
      setArchiveError(getErrorMessage(error, "Não foi possível arquivar a denúncia."));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group">
        {STATUS_OPTIONS.map((option) => (
          <button
            aria-pressed={status === option.value}
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
              status === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground",
            )}
            key={option.value || "all"}
            onClick={() => setStatus(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>

      {results === undefined ? <LoadingSkeleton rows={4} /> : null}

      {results && results.length === 0 ? (
        <EmptyState
          description="Nenhuma denúncia pública com os filtros atuais."
          title="Sem denúncias"
        />
      ) : null}

      {results && results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.map((report) => (
            <div
              className="flex flex-col gap-2.5 rounded-xl border bg-card p-4 shadow-xs"
              key={report._id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">{formatPublicReportTipo(report.tipo_denuncia)}</p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    STATUS_BADGE_CLASS[report.status],
                  )}
                >
                  {STATUS_LABELS[report.status]}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <ClockIcon aria-hidden="true" className="size-3.5" />
                  {formatDate(report.criado_em)}
                </span>
                {report.bairro_nome || report.local_descricao ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon aria-hidden="true" className="size-3.5" />
                    {[report.bairro_nome, report.local_descricao].filter(Boolean).join(" · ")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning">
                    <MapPinIcon aria-hidden="true" className="size-3.5" />
                    Sem localização informada
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <UserIcon aria-hidden="true" className="size-3.5" />
                  {[report.nome_denunciante, report.contato].filter(Boolean).join(" · ") ||
                    "Denúncia anônima"}
                </span>
              </div>
              <p className="text-sm leading-6">{report.descricao}</p>
              {report.photo_urls.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {report.photo_urls.map((url) => (
                    <img
                      alt="Foto enviada na denúncia"
                      className="size-20 rounded-lg border object-cover"
                      key={url}
                      src={url}
                    />
                  ))}
                </div>
              ) : null}

              {report.status === "novo" || report.status === "em_analise" ? (
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    className="min-h-11"
                    onClick={() => setConvertTarget(report._id)}
                    type="button"
                  >
                    Converter em ocorrência
                  </Button>
                  <Button
                    className="min-h-11"
                    onClick={() => setArchiveTarget(report._id)}
                    type="button"
                    variant="outline"
                  >
                    Arquivar
                  </Button>
                </div>
              ) : null}

              {report.status === "convertido" && report.occurrence_id_gerada ? (
                <Link
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  to={`/occurrences/${report.occurrence_id_gerada}`}
                >
                  Ver ocorrência gerada
                </Link>
              ) : null}
            </div>
          ))}

          {paginationStatus === "CanLoadMore" ? (
            <Button className="min-h-11 self-start" onClick={() => loadMore(25)} variant="outline">
              Carregar mais
            </Button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        description="A denúncia deixa de aparecer na fila de triagem. Essa ação não pode ser desfeita."
        onConfirm={() => void handleArchive()}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
            setArchiveError(null);
          }
        }}
        open={archiveTarget !== null}
        title="Arquivar denúncia?"
      >
        {archiveError ? <p className="text-sm text-destructive">{archiveError}</p> : null}
      </ConfirmDialog>

      <ConfirmDialog
        confirmLabel="Converter"
        description="Cria uma ocorrência a partir desta denúncia. Vincular um animal é opcional."
        onConfirm={() => void handleConvert()}
        onOpenChange={(open) => {
          if (!open) {
            closeConvertDialog();
          }
        }}
        open={convertTarget !== null}
        title="Converter em ocorrência"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="convert-dog-search">Vincular a um animal (opcional)</Label>
          <Input
            id="convert-dog-search"
            onChange={(event) => {
              setDogSearch(event.target.value);
              setSelectedDogId(undefined);
            }}
            placeholder="Buscar por nome ou microchip"
            value={dogSearch}
          />
          {dogOptions?.page && dogOptions.page.length > 0 && !selectedDogId ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-input bg-card">
              {dogOptions.page.map((dog) => (
                <li key={dog._id}>
                  <button
                    className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40"
                    onClick={() => {
                      setSelectedDogId(dog._id);
                      setDogSearch(dog.nome);
                    }}
                    type="button"
                  >
                    {dog.nome}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {selectedDogId ? (
            <p className="text-xs text-muted-foreground">
              Animal selecionado.{" "}
              <button
                className="underline underline-offset-4"
                onClick={() => {
                  setSelectedDogId(undefined);
                  setDogSearch("");
                }}
                type="button"
              >
                Remover
              </button>
            </p>
          ) : null}
        </div>
        {convertError ? <p className="text-sm text-destructive">{convertError}</p> : null}
      </ConfirmDialog>
    </div>
  );
}
