import { useQuery } from "convex/react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DogPhotoGallery } from "@/components/DogPhotoGallery";
import { OccurrenceTimeline } from "@/components/OccurrenceTimeline";
import { TutorDogHistoryList } from "@/components/TutorDogHistoryList";
import { DogStatusBadge } from "@/components/DogStatusBadge";
import { DogStatusChangeDialog } from "@/components/DogStatusChangeDialog";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { formatMicrochip } from "@/lib/formatters";

const TABS = ["Dados", "Histórico de tutores", "Ocorrências", "Fotos"] as const;

export function DogDetailPage() {
  const { dogId } = useParams();
  const { can, canAny } = usePermissions();
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
    return <PlaceholderPage description="O cão solicitado não existe." title="Cão não encontrado" />;
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-5">
        <div className="flex items-start gap-4 sm:gap-5">
          {dog.foto_perfil_url ? (
            <img
              alt={`Foto de ${dog.nome}`}
              className="size-24 shrink-0 rounded-2xl border object-cover sm:size-32"
              src={dog.foto_perfil_url}
            />
          ) : (
            <div
              aria-hidden="true"
              className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-accent font-heading text-4xl font-bold text-accent-foreground sm:size-32"
            >
              {dog.nome.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-balance lg:text-3xl">
              {dog.nome}
            </h1>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatMicrochip(dog.microchip)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <DogStatusBadge status={dog.status_atual} />
              {dog.grave_alert ? (
                <span className="rounded-full bg-destructive/12 px-2.5 py-0.5 text-xs font-medium text-destructive">
                  Ocorrência grave nos últimos 90 dias
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {can("dogs.edit") ? (
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/dogs/${dog._id}/edit`}>Editar</Link>
            </Button>
          ) : null}
          {canAny([
            "occurrences.create_rotina",
            "occurrences.create_clinica",
            "occurrences.create_risco",
            "occurrences.create_legal",
            "occurrences.create_adocao",
            "occurrences.create_outro",
          ]) ? (
            <Button asChild className="min-h-11">
              <Link to={`/dogs/${dog._id}/occurrences/new`}>Nova ocorrência</Link>
            </Button>
          ) : null}
          {can("dogs.change_status") ? (
            <Button
              className="min-h-11"
              onClick={() => setStatusDialogOpen(true)}
              type="button"
              variant="outline"
            >
              Alterar status
            </Button>
          ) : null}
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Dados" ? (
        <dl className="grid gap-x-6 gap-y-4 text-sm md:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
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
            <dt className="text-muted-foreground">Características visuais</dt>
            <dd>{dog.caracteristicas_visuais ?? "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-muted-foreground">Características comportamentais</dt>
            <dd>{dog.caracteristicas_comportamentais ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Castrado</dt>
            <dd>{dog.castrado ? "Sim" : "Não"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vacinas em dia</dt>
            <dd>{dog.vacinas_em_dia ? "Sim" : "Não"}</dd>
          </div>
          {dog.condicoes_saude ? (
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Condicoes de saúde</dt>
              <dd>{dog.condicoes_saude}</dd>
            </div>
          ) : null}
          {dog.observacoes ? (
            <div className="md:col-span-2">
              <dt className="text-muted-foreground">Observações</dt>
              <dd>{dog.observacoes}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {activeTab === "Histórico de tutores" ? <TutorDogHistoryList dogId={dog._id} /> : null}

      {activeTab === "Ocorrências" ? <OccurrenceTimeline dogId={dog._id} /> : null}

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
