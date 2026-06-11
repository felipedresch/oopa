import { useQuery } from "convex/react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DogPhotoGallery } from "@/components/DogPhotoGallery";
import { DogStatusBadge } from "@/components/DogStatusBadge";
import { DogStatusChangeDialog } from "@/components/DogStatusChangeDialog";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { formatMicrochip } from "@/lib/formatters";

const TABS = ["Dados", "Historico de tutores", "Ocorrencias", "Fotos"] as const;

export function DogDetailPage() {
  const { dogId } = useParams();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Dados");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [now] = useState(() => Date.now());

  const dog = useQuery(
    api.dogs.get,
    dogId && can("dogs.read") ? { dogId: dogId as Id<"dogs">, now } : "skip",
  );

  if (!can("dogs.read")) {
    return <PermissionDenied />;
  }

  if (dog === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!dog) {
    return <PlaceholderPage description="O cao solicitado nao existe." title="Cao nao encontrado" />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap gap-2">
            {can("dogs.edit") ? (
              <Button asChild className="min-h-11" variant="outline">
                <Link to={`/dogs/${dog._id}/edit`}>Editar</Link>
              </Button>
            ) : null}
            {can("dogs.change_status") ? (
              <Button className="min-h-11" onClick={() => setStatusDialogOpen(true)} type="button">
                Alterar status
              </Button>
            ) : null}
          </div>
        }
        description={formatMicrochip(dog.microchip)}
        title={dog.nome}
      />

      <div className="flex flex-col gap-4 sm:flex-row">
        {dog.foto_perfil_url ? (
          <img
            alt={`Foto de ${dog.nome}`}
            className="size-40 min-h-40 min-w-40 rounded-xl border object-cover sm:size-48"
            src={dog.foto_perfil_url}
          />
        ) : (
          <div className="flex size-40 min-h-40 min-w-40 items-center justify-center rounded-xl border bg-muted text-sm text-muted-foreground sm:size-48">
            Sem foto
          </div>
        )}
        <div className="flex flex-col gap-2">
          <DogStatusBadge status={dog.status_atual} />
          {dog.grave_alert ? (
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Alerta: ocorrencia grave nos ultimos 90 dias
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((tab) => (
          <button
            className={`min-h-11 rounded-md px-3 text-sm font-medium ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Dados" ? (
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Sexo</dt>
            <dd>{dog.sexo}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Porte</dt>
            <dd>{dog.porte}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Raca aparente</dt>
            <dd>{dog.raca_aparente ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Cor da pelagem</dt>
            <dd>{dog.cor_pelagem ?? "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">Caracteristicas visuais</dt>
            <dd>{dog.caracteristicas_visuais ?? "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">Caracteristicas comportamentais</dt>
            <dd>{dog.caracteristicas_comportamentais ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Castrado</dt>
            <dd>{dog.castrado ? "Sim" : "Nao"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vacinas em dia</dt>
            <dd>{dog.vacinas_em_dia ? "Sim" : "Nao"}</dd>
          </div>
          {dog.condicoes_saude ? (
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Condicoes de saude</dt>
              <dd>{dog.condicoes_saude}</dd>
            </div>
          ) : null}
          {dog.observacoes ? (
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Observacoes</dt>
              <dd>{dog.observacoes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {activeTab === "Historico de tutores" ? (
        <PlaceholderPage
          description="O historico de tutores sera preenchido na fase de ocorrencias e adocoes."
          title="Historico de tutores"
        />
      ) : null}

      {activeTab === "Ocorrencias" ? (
        <PlaceholderPage
          description="A listagem de ocorrencias chega na proxima fase do produto."
          title="Ocorrencias"
        />
      ) : null}

      {activeTab === "Fotos" ? (
        <DogPhotoGallery canEdit={can("dogs.edit")} dogId={dog._id} />
      ) : null}

      {can("dogs.change_status") ? (
        <DogStatusChangeDialog
          currentStatus={dog.status_atual}
          dogId={dog._id}
          onOpenChange={setStatusDialogOpen}
          open={statusDialogOpen}
        />
      ) : null}
    </section>
  );
}
