import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DogCard } from "@/components/DogCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { formatMicrochip } from "@/lib/formatters";
import { validateRequired } from "@/lib/validations";
import { cn } from "@/lib/utils";

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

export function ReturnNewPage() {
  const { can } = usePermissions();
  const [now] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<Id<"dogs"> | null>(null);
  const [motivo, setMotivo] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successOccurrenceId, setSuccessOccurrenceId] = useState<Id<"occurrences"> | null>(
    null,
  );

  const returnToOng = useMutation(api.adoptions.returnToOng);

  const dogResults = usePaginatedQuery(
    api.dogs.list,
    can("dogs.read") ? { search: search || undefined, now } : "skip",
    { initialNumItems: 10 },
  );

  const selectedDog = useQuery(
    api.dogs.get,
    selectedDogId ? { dogId: selectedDogId, now } : "skip",
  );

  const currentTutor = useQuery(
    api.tutors.get,
    selectedDog?.tutor_atual_id && can("tutors.read")
      ? { tutorId: selectedDog.tutor_atual_id }
      : "skip",
  );

  if (!can("occurrences.create_adocao")) {
    return <PermissionDenied />;
  }

  if (successOccurrenceId && selectedDogId) {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader
          description="O cao voltou para a ONG e o historico de tutoria foi encerrado."
          title="Devolucao registrada"
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild className="min-h-11">
            <Link to={`/dogs/${selectedDogId}`}>Ver ficha do cao</Link>
          </Button>
          <Button asChild className="min-h-11" variant="outline">
            <Link to={`/dogs/${selectedDogId}/occurrences/${successOccurrenceId}`}>
              Ver ocorrencia
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const canSubmit =
    Boolean(selectedDogId && selectedDog?.tutor_atual_id && motivo.trim()) &&
    photos.length > 0;

  const handleSubmit = async () => {
    if (!selectedDogId) {
      return;
    }

    const motivoError = validateRequired(motivo);
    if (motivoError) {
      setError(motivoError);
      return;
    }

    if (photos.length === 0) {
      setError("Adicione pelo menos uma foto da devolucao.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const occurrenceId = await returnToOng({
        dogId: selectedDogId,
        descricao: motivo.trim(),
        photo_storage_ids: photos.map((photo) => photo.storageId),
      });
      setSuccessOccurrenceId(occurrenceId);
      setConfirmOpen(false);
    } catch (cause) {
      setError(getErrorMessage(cause, "Nao foi possivel registrar a devolucao."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Registre a devolucao de um cao adotado. Fotos sao obrigatorias."
        title="Nova devolucao"
      />

      <div className="flex flex-col gap-6 rounded-xl border bg-card p-4 sm:p-6">
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="return-dog-search">Buscar cao</Label>
          <Input
            id="return-dog-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou microchip"
            value={search}
          />
        </div>

        {dogResults.status === "LoadingFirstPage" ? (
          <LoadingSkeleton rows={3} />
        ) : (
          <ul className="flex flex-col gap-2">
            {dogResults.results.map((dog) => (
              <li key={dog._id}>
                <button
                  className={cn(
                    "w-full rounded-xl text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedDogId === dog._id && "ring-2 ring-primary",
                  )}
                  onClick={() => setSelectedDogId(dog._id)}
                  type="button"
                >
                  <DogCard
                    dogId={dog._id}
                    fotoUrl={dog.foto_perfil_url}
                    graveAlert={dog.grave_alert}
                    microchip={dog.microchip}
                    nome={dog.nome}
                    selectable
                    status={dog.status_atual}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {selectedDog ? (
          <div className="rounded-lg border p-4">
            <p className="font-medium">{selectedDog.nome}</p>
            <p className="text-sm text-muted-foreground">
              {formatMicrochip(selectedDog.microchip)}
            </p>
            {!selectedDog.tutor_atual_id ? (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                Este cao nao possui tutor atual. Selecione outro cao para devolucao.
              </p>
            ) : currentTutor === undefined ? (
              <LoadingSkeleton rows={1} />
            ) : (
              <div className="mt-3 flex flex-col gap-1">
                <Label>Tutor atual (bloqueado)</Label>
                <Input
                  disabled
                  readOnly
                  value={currentTutor?.nome_completo ?? "Tutor nao encontrado"}
                />
                {currentTutor?.bairro?.nome ? (
                  <p className="text-sm text-muted-foreground">{currentTutor.bairro.nome}</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="return-motivo">Motivo da devolucao</Label>
          <textarea
            className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            id="return-motivo"
            onChange={(event) => setMotivo(event.target.value)}
            value={motivo}
          />
        </div>

        <MultiPhotoUpload
          label="Fotos da devolucao"
          onChange={setPhotos}
          photos={photos}
          required
        />

        <div className="flex justify-end">
          <Button
            className="min-h-11"
            disabled={!canSubmit || submitting}
            onClick={() => setConfirmOpen(true)}
            type="button"
          >
            Registrar devolucao
          </Button>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-lg font-medium">Confirmar devolucao</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              O tutor atual sera removido e o cao voltara para a ONG. Esta acao gera uma
              ocorrencia de devolucao.
            </p>
            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                className="min-h-11"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                className="min-h-11"
                disabled={submitting}
                onClick={() => void handleSubmit()}
                type="button"
              >
                {submitting ? "Registrando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
