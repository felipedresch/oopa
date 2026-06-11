import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";
import { validateRequired } from "@/lib/validations";

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

export function OccurrenceRectifyPage() {
  const { dogId, occurrenceId } = useParams();
  const navigate = useNavigate();

  const original = useQuery(
    api.occurrences.get,
    occurrenceId ? { occurrenceId: occurrenceId as Id<"occurrences"> } : "skip",
  );
  const rectify = useMutation(api.occurrences.rectify);

  const [descricao, setDescricao] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!occurrenceId || !dogId) {
    return <PermissionDenied />;
  }

  if (original === undefined) {
    return <LoadingSkeleton rows={4} />;
  }

  if (!original || !original.can_rectify) {
    return <PermissionDenied message="Retificação não permitida para está ocorrência." />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const descricaoError = validateRequired(descricao);
    if (descricaoError) {
      setError(descricaoError);
      return;
    }

    setSubmitting(true);
    try {
      const rectificationId = await rectify({
        originalId: occurrenceId as Id<"occurrences">,
        descricao: descricao.trim(),
        photo_storage_ids: photos.map((photo) => photo.storageId),
      });
      void navigate(`/dogs/${dogId}/occurrences/${rectificationId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível registrar a retificação."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={`Corrigir registro de ${original.type_nome} sem editar o original.`}
        title="Registrar retificação"
      />

      <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit}>
        <div className="rounded-xl bg-info/10 p-4 text-sm">
          <p className="font-medium text-info">Ocorrência original</p>
          <p className="mt-0.5 leading-6 text-muted-foreground">{original.descricao}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rectify-desc">Descrição da correcao</Label>
          <textarea
            className="min-h-24 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="rectify-desc"
            onChange={(event) => setDescricao(event.target.value)}
            required
            value={descricao}
          />
        </div>

        <MultiPhotoUpload label="Fotos de apoio (opcional)" onChange={setPhotos} photos={photos} />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" disabled={submitting} type="submit">
            {submitting ? "Salvando..." : "Registrar retificação"}
          </Button>
          <Button asChild className="min-h-11" type="button" variant="outline">
            <Link to={`/dogs/${dogId}/occurrences/${occurrenceId}`}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
