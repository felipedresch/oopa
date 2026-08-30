import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { CastrationStatusBadge } from "@/components/CastrationStatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import type { CastrationStatus } from "@/lib/domain-colors";
import { CASTRATION_STATUS_LABELS, DOG_PORTE_LABELS, DOG_SEXO_LABELS, ESPECIE_LABELS } from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";

const REORDERABLE_STATUSES: CastrationStatus[] = [
  "aguardando",
  "agendada",
  "cancelada",
  "nao_compareceu",
];

function toDateTimeInputValue(timestamp: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CastrationDetailPage() {
  const { can } = usePermissions();
  const { id } = useParams();
  const navigate = useNavigate();
  const canManage = can("castration.manage");
  const [now] = useState(() => Date.now());

  const request = useQuery(
    api.castration.get,
    id ? { castrationId: id as Id<"castration_requests"> } : "skip",
  );
  const updateDataSolicitacao = useMutation(api.castration.updateDataSolicitacao);
  const updateStatus = useMutation(api.castration.updateStatus);
  const markRealizada = useMutation(api.castration.markRealizada);

  const [dataSolicitacaoValue, setDataSolicitacaoValue] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<CastrationStatus | null>(null);
  const [dataAgendadaOverride, setDataAgendadaOverride] = useState<string | null>(null);
  const [realizadaOpen, setRealizadaOpen] = useState(false);
  const [dogSearch, setDogSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<Id<"dogs"> | undefined>();
  const [dataError, setDataError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [realizadaError, setRealizadaError] = useState<string | null>(null);
  const [savingData, setSavingData] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingRealizada, setSavingRealizada] = useState(false);

  const dogOptions = useQuery(
    api.dogs.list,
    realizadaOpen && dogSearch.trim()
      ? {
          paginationOpts: { numItems: 5, cursor: null },
          search: dogSearch.trim(),
          now,
        }
      : "skip",
  );

  if (!can("castration.read")) {
    return <PermissionDenied />;
  }

  if (!id) {
    return <PermissionDenied message="Solicitação não informada." />;
  }

  if (request === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!request) {
    return (
      <PlaceholderPage
        description="A solicitação de castração não existe ou você não tem permissão."
        title="Solicitação não encontrada"
      />
    );
  }

  const dataSolicitacaoInput = dataSolicitacaoValue ?? toDateTimeInputValue(request.data_solicitacao);
  // Reflete a data ja agendada, para reeditar sem reescrever tudo.
  const dataAgendadaSalva = request.data_agendada
    ? toDateTimeInputValue(request.data_agendada)
    : "";
  const dataAgendadaValue = dataAgendadaOverride ?? dataAgendadaSalva;
  const statusValue = nextStatus ?? request.status;

  const handleSaveDataSolicitacao = async () => {
    setDataError(null);
    setSavingData(true);
    try {
      await updateDataSolicitacao({
        castrationId: request._id,
        data_solicitacao: new Date(dataSolicitacaoInput).getTime(),
      });
      setDataSolicitacaoValue(null);
    } catch (error) {
      setDataError(getErrorMessage(error, "Não foi possível reordenar a fila."));
    } finally {
      setSavingData(false);
    }
  };

  const handleSaveStatus = async () => {
    setStatusError(null);
    setSavingStatus(true);
    try {
      await updateStatus({
        castrationId: request._id,
        status: statusValue,
        data_agendada: dataAgendadaValue ? new Date(dataAgendadaValue).getTime() : undefined,
      });
      setNextStatus(null);
    } catch (error) {
      setStatusError(getErrorMessage(error, "Não foi possível atualizar o status."));
    } finally {
      setSavingStatus(false);
    }
  };

  const closeRealizadaDialog = () => {
    setRealizadaOpen(false);
    setDogSearch("");
    setSelectedDogId(undefined);
    setRealizadaError(null);
  };

  const handleMarkRealizada = async () => {
    setRealizadaError(null);
    setSavingRealizada(true);
    try {
      const dogId = await markRealizada({
        castrationId: request._id,
        dogId: selectedDogId,
      });
      closeRealizadaDialog();
      void navigate(`/dogs/${dogId}`);
    } catch (error) {
      setRealizadaError(getErrorMessage(error, "Não foi possível concluir a castração."));
    } finally {
      setSavingRealizada(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={formatDate(request.data_solicitacao)}
        title={request.animal_descricao.nome ?? "Animal sem nome"}
      />

      <div className="flex flex-wrap items-center gap-2">
        <CastrationStatusBadge status={request.status} />
      </div>

      <section>
        <h3 className="mb-3 font-semibold">Solicitação</h3>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
          <div>
            <dt className="text-muted-foreground">Pessoa solicitante</dt>
            <dd>{request.pessoa_nome ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Animal vinculado</dt>
            <dd>{request.dog_nome ?? "Ainda não cadastrado"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Espécie</dt>
            <dd>{ESPECIE_LABELS[request.animal_descricao.especie]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Porte</dt>
            <dd>{DOG_PORTE_LABELS[request.animal_descricao.porte]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sexo</dt>
            <dd>{DOG_SEXO_LABELS[request.animal_descricao.sexo]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cor</dt>
            <dd>{request.animal_descricao.cor ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data agendada</dt>
            <dd>{request.data_agendada ? formatDate(request.data_agendada) : "—"}</dd>
          </div>
          {request.observacoes ? (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Observações</dt>
              <dd>{request.observacoes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {canManage ? (
        <section className="flex flex-col gap-6 border-t pt-6">
          <h3 className="font-semibold">Gestão</h3>

          <div className="flex flex-col gap-2">
            <Label htmlFor="castration-data-solicitacao">Posição na fila (data da solicitação)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                id="castration-data-solicitacao"
                onChange={setDataSolicitacaoValue}
                value={dataSolicitacaoInput}
                withTime
              />
              <Button
                className="min-h-11"
                disabled={savingData || dataSolicitacaoValue === null}
                onClick={() => void handleSaveDataSolicitacao()}
                type="button"
                variant="outline"
              >
                {savingData ? "Salvando..." : "Reordenar"}
              </Button>
            </div>
            {dataError ? <p className="text-sm text-destructive">{dataError}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="castration-status">Status</Label>
            <select
              className="h-11 w-full max-w-60 appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="castration-status"
              onChange={(event) => setNextStatus(event.target.value as CastrationStatus)}
              value={statusValue}
            >
              {REORDERABLE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {CASTRATION_STATUS_LABELS[value]}
                </option>
              ))}
            </select>

            {statusValue === "agendada" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="castration-data-agendada">Data agendada</Label>
                <DatePicker
                  id="castration-data-agendada"
                  onChange={setDataAgendadaOverride}
                  value={dataAgendadaValue}
                  withTime
                />
                {!dataAgendadaValue ? (
                  <p className="text-sm text-muted-foreground">
                    Informe a data para a castração aparecer no calendário.
                  </p>
                ) : null}
              </div>
            ) : null}

            <Button
              className="min-h-11 self-start"
              disabled={
                savingStatus ||
                // Reagendar (so a data muda) tambem precisa poder salvar.
                (statusValue === request.status &&
                  dataAgendadaValue === dataAgendadaSalva) ||
                (statusValue === "agendada" && !dataAgendadaValue)
              }
              onClick={() => void handleSaveStatus()}
              type="button"
            >
              {savingStatus ? "Salvando..." : "Salvar status"}
            </Button>
            {statusError ? <p className="text-sm text-destructive">{statusError}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Conclusão</Label>
            <Button
              className="min-h-11 self-start"
              disabled={request.status === "realizada"}
              onClick={() => setRealizadaOpen(true)}
              type="button"
            >
              Marcar como realizada
            </Button>
          </div>
        </section>
      ) : null}

      <ConfirmDialog
        confirmLabel={savingRealizada ? "Salvando..." : "Concluir"}
        description="Se nenhum animal for selecionado, um novo cadastro é criado automaticamente a partir da descrição informada, sem microchip."
        onConfirm={() => void handleMarkRealizada()}
        onOpenChange={(open) => {
          if (!open) {
            closeRealizadaDialog();
          } else {
            setRealizadaOpen(true);
          }
        }}
        open={realizadaOpen}
        title="Marcar castração como realizada"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="castration-dog-search">Vincular a um animal já cadastrado (opcional)</Label>
          <Input
            id="castration-dog-search"
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
        </div>
        {realizadaError ? <p className="text-sm text-destructive">{realizadaError}</p> : null}
      </ConfirmDialog>
    </section>
  );
}
