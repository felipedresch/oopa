import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { RescueStatusBadge } from "@/components/RescueStatusBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import type { RescueStatus } from "@/lib/domain-colors";
import { RESCUE_STATUS_LABELS } from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";

const ALL_STATUSES = Object.keys(RESCUE_STATUS_LABELS) as RescueStatus[];

export function RescueDetailPage() {
  const { can } = usePermissions();
  const { id } = useParams();
  const canManage = can("rescues.manage");

  const rescue = useQuery(
    api.rescues.get,
    id ? { rescueId: id as Id<"rescue_requests"> } : "skip",
  );
  const updateStatus = useMutation(api.rescues.updateStatus);
  const setOngDescription = useMutation(api.rescues.setOngDescription);

  const [nextStatus, setNextStatus] = useState<RescueStatus | null>(null);
  const [descricaoOng, setDescricaoOng] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [descricaoError, setDescricaoError] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingDescricao, setSavingDescricao] = useState(false);

  if (!can("rescues.read")) {
    return <PermissionDenied />;
  }

  if (!id) {
    return <PermissionDenied message="Resgate não informado." />;
  }

  if (rescue === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!rescue) {
    return (
      <PlaceholderPage
        description="A solicitação de resgate não existe ou você não tem permissão."
        title="Resgate não encontrado"
      />
    );
  }

  const statusValue = nextStatus ?? rescue.status;
  const descricaoValue = descricaoOng ?? rescue.descricao_ong ?? "";

  const handleSaveStatus = async () => {
    setStatusError(null);
    setSavingStatus(true);
    try {
      await updateStatus({ rescueId: rescue._id, status: statusValue });
      setNextStatus(null);
    } catch (error) {
      setStatusError(getErrorMessage(error, "Não foi possível atualizar o status."));
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveDescricao = async () => {
    setDescricaoError(null);
    setSavingDescricao(true);
    try {
      await setOngDescription({ rescueId: rescue._id, descricao_ong: descricaoValue });
      setDescricaoOng(null);
    } catch (error) {
      setDescricaoError(getErrorMessage(error, "Não foi possível salvar a descrição."));
    } finally {
      setSavingDescricao(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader description={formatDate(rescue.criado_em)} title={rescue.tipo.replace(/_/g, " ")} />

      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={rescue.gravidade} />
        <RescueStatusBadge status={rescue.status} />
      </div>

      <section>
        <h3 className="mb-3 font-semibold">Solicitação</h3>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
          <div>
            <dt className="text-muted-foreground">Bairro</dt>
            <dd>{rescue.bairro_nome ?? "Não informado"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Animal vinculado</dt>
            <dd>{rescue.dog_nome ?? "Não identificado"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Local</dt>
            <dd>{rescue.local_descricao ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">O que foi relatado</dt>
            <dd>{rescue.descricao_solicitante}</dd>
          </div>
          {rescue.solicitante_nome ? (
            <div>
              <dt className="text-muted-foreground">Quem acionou</dt>
              <dd>{rescue.solicitante_nome}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {rescue.fotos_urls.length > 0 ? (
        <section className="flex flex-col gap-3 border-t pt-6">
          <h3 className="font-semibold">Fotos</h3>
          <div className="flex flex-wrap gap-3">
            {rescue.fotos_urls.map((url) => (
              <img
                alt="Foto do resgate"
                className="size-32 rounded-xl border object-cover"
                key={url}
                src={url}
              />
            ))}
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="flex flex-col gap-4 border-t pt-6">
          <h3 className="font-semibold">Gestão</h3>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rescue-status">Status</Label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-11 w-full max-w-60 appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="rescue-status"
                onChange={(event) => setNextStatus(event.target.value as RescueStatus)}
                value={statusValue}
              >
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {RESCUE_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
              <Button
                className="min-h-11"
                disabled={statusValue === rescue.status || savingStatus}
                onClick={() => void handleSaveStatus()}
                type="button"
              >
                {savingStatus ? "Salvando..." : "Salvar status"}
              </Button>
            </div>
            {statusError ? <p className="text-sm text-destructive">{statusError}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rescue-ong-desc">O que aconteceu</Label>
            <textarea
              className="min-h-24 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="rescue-ong-desc"
              onChange={(event) => setDescricaoOng(event.target.value)}
              placeholder="Descreva o atendimento realizado"
              value={descricaoValue}
            />
            <Button
              className="min-h-11 self-start"
              disabled={!descricaoValue.trim() || savingDescricao}
              onClick={() => void handleSaveDescricao()}
              type="button"
              variant="outline"
            >
              {savingDescricao ? "Salvando..." : "Salvar descrição"}
            </Button>
            {descricaoError ? <p className="text-sm text-destructive">{descricaoError}</p> : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}
