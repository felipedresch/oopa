import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";

type DogPhotoGalleryProps = {
  dogId: Id<"dogs">;
  canEdit: boolean;
};

export function DogPhotoGallery({ dogId, canEdit }: DogPhotoGalleryProps) {
  const gallery = useQuery(api.dogPhotos.listByDog, { dogId });
  const addPhoto = useMutation(api.dogPhotos.add);
  const [storageId, setStorageId] = useState<Id<"_storage"> | undefined>();
  const [descricao, setDescricao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (gallery === undefined) {
    return <LoadingSkeleton rows={3} />;
  }

  const atLimit = gallery.count >= gallery.maxPhotos;

  const handleAdd = async () => {
    if (!storageId) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await addPhoto({
        dogId,
        storageId,
        descricao: descricao || undefined,
      });
      setStorageId(undefined);
      setDescricao("");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Nao foi possivel adicionar a foto."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        {gallery.count} de {gallery.maxPhotos} fotos adicionais
      </p>

      {gallery.photos.length === 0 ? (
        <EmptyState
          description="Adicione fotos complementares para enriquecer a ficha do cao."
          title="Galeria vazia"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.photos.map((photo) => (
            <figure className="rounded-lg border bg-card p-3" key={photo._id}>
              {photo.url ? (
                <img
                  alt={photo.descricao ?? "Foto adicional do cao"}
                  className="mb-2 aspect-square w-full rounded-md object-cover"
                  src={photo.url}
                />
              ) : (
                <div className="mb-2 flex aspect-square items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                  Foto indisponivel
                </div>
              )}
              {photo.descricao ? (
                <figcaption className="text-sm text-muted-foreground">{photo.descricao}</figcaption>
              ) : null}
            </figure>
          ))}
        </div>
      )}

      {canEdit && !atLimit ? (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-4 font-medium">Adicionar foto</h3>
          <div className="flex flex-col gap-4">
            <PhotoUpload
              label="Nova foto"
              onChange={(nextStorageId) => setStorageId(nextStorageId)}
              storageId={storageId}
            />
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao-foto">Descricao (opcional)</Label>
              <Input
                id="descricao-foto"
                onChange={(event) => setDescricao(event.target.value)}
                value={descricao}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              className="min-h-11 self-start"
              disabled={!storageId || loading}
              onClick={() => void handleAdd()}
              type="button"
            >
              {loading ? "Enviando..." : "Adicionar a galeria"}
            </Button>
          </div>
        </div>
      ) : null}

      {canEdit && atLimit ? (
        <p className="text-sm text-muted-foreground">
          Limite de {gallery.maxPhotos} fotos adicionais atingido.
        </p>
      ) : null}
    </div>
  );
}
