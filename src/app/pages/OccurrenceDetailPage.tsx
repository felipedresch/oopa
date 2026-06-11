import { useQuery } from "convex/react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { SensitiveDataHidden } from "@/components/SensitiveDataHidden";
import { usePermissions } from "@/hooks/usePermissions";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { SeverityBadge } from "@/components/SeverityBadge";
import { Button } from "@/components/ui/button";
import { formatCep, formatCpf, formatDate, formatPhone } from "@/lib/formatters";

export function OccurrenceDetailPage() {
  const { can } = usePermissions();
  const canReadSensitive = can("tutors.read_sensitive");
  const { dogId, occurrenceId } = useParams();

  const occurrence = useQuery(
    api.occurrences.get,
    occurrenceId ? { occurrenceId: occurrenceId as Id<"occurrences"> } : "skip",
  );

  if (!occurrenceId || !dogId) {
    return <PermissionDenied message="Ocorrência não informada." />;
  }

  if (occurrence === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!occurrence) {
    return (
      <PlaceholderPage
        description="A ocorrência solicitada não existe ou você não tem permissão."
        title="Ocorrência não encontrada"
      />
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {occurrence.can_rectify ? (
              <Button asChild className="min-h-11" variant="outline">
                <Link to={`/dogs/${dogId}/occurrences/${occurrenceId}/rectify`}>
                  Registrar retificação
                </Link>
              </Button>
            ) : null}
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/dogs/${dogId}`}>Voltar ao cão</Link>
            </Button>
          </div>
        }
        description={formatDate(occurrence.data_ocorrencia)}
        title={occurrence.type_nome}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={occurrence.gravidade} />
        <span className="text-sm text-muted-foreground">{occurrence.categoria}</span>
        {occurrence.atribuivel_ao_tutor ? (
          <span className="text-sm text-warning">
            Conta para alerta do tutor
          </span>
        ) : null}
      </div>

      <section>
        <h3 className="mb-3 font-semibold">Registro</h3>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
          <div>
            <dt className="text-muted-foreground">Cão</dt>
            <dd>{occurrence.dog_nome}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Bairro</dt>
            <dd>{occurrence.bairro_nome ?? "Não informado"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Local</dt>
            <dd>{occurrence.local_descricao ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Descrição</dt>
            <dd>{occurrence.descricao}</dd>
          </div>
        </dl>
      </section>

      {occurrence.original_id ? (
        <div className="rounded-xl bg-info/10 p-4 text-sm">
          <p className="font-medium text-info">Retificação de ocorrência anterior</p>
          <p className="mt-0.5 text-muted-foreground">{occurrence.original_summary ?? occurrence.original_id}</p>
        </div>
      ) : null}

      {occurrence.tutor_snapshot ? (
        <section className="border-t pt-6">
          <h3 className="mb-3 font-semibold">Snapshot do tutor no momento do registro</h3>
          <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd>{occurrence.tutor_snapshot.nome_completo}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bairro</dt>
              <dd>{occurrence.tutor_snapshot.bairro_nome ?? "Não informado"}</dd>
            </div>
            {canReadSensitive && occurrence.tutor_snapshot.cpf ? (
              <div>
                <dt className="text-muted-foreground">CPF</dt>
                <dd>{formatCpf(occurrence.tutor_snapshot.cpf)}</dd>
              </div>
            ) : null}
            {canReadSensitive && occurrence.tutor_snapshot.telefone ? (
              <div>
                <dt className="text-muted-foreground">Telefone</dt>
                <dd>{formatPhone(occurrence.tutor_snapshot.telefone)}</dd>
              </div>
            ) : null}
            {canReadSensitive && occurrence.tutor_snapshot.endereco_logradouro ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Endereco</dt>
                <dd>
                  {[
                    occurrence.tutor_snapshot.endereco_logradouro,
                    occurrence.tutor_snapshot.endereco_numero,
                    occurrence.tutor_snapshot.endereco_complemento,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            ) : null}
            {canReadSensitive && occurrence.tutor_snapshot.endereco_cep ? (
              <div>
                <dt className="text-muted-foreground">CEP</dt>
                <dd>{formatCep(occurrence.tutor_snapshot.endereco_cep)}</dd>
              </div>
            ) : null}
          </dl>
          {!canReadSensitive ? (
            <div className="mt-4">
              <SensitiveDataHidden />
            </div>
          ) : null}
        </section>
      ) : null}

      {occurrence.photos.length > 0 ? (
        <section className="flex flex-col gap-3 border-t pt-6">
          <h3 className="font-semibold">Fotos</h3>
          <div className="flex flex-wrap gap-3">
            {occurrence.photos.map((photo) =>
              photo.url ? (
                <img
                  alt="Foto da ocorrência"
                  className="size-32 rounded-xl border object-cover"
                  key={photo._id}
                  src={photo.url}
                />
              ) : null,
            )}
          </div>
        </section>
      ) : null}
    </section>
  );
}
