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
    return <PermissionDenied message="Retificacao nao permitida para esta ocorrencia." />;
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
      setError(getErrorMessage(submitError, "Nao foi possivel registrar a retificacao."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={`Corrigir registro de ${original.type_nome} sem editar o original.`}
        title="Registrar retificacao"
      />

      <form className="flex max-w-2xl flex-col gap-4" onSubmit={handleSubmit}>
        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
          <p className="font-medium">Ocorrencia original</p>
          <p className="text-muted-foreground">{original.descricao}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rectify-desc">Descricao da correcao</Label>
          <textarea
            className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
            id="rectify-desc"
            onChange={(event) => setDescricao(event.target.value)}
            required
            value={descricao}
          />
        </div>

        <MultiPhotoUpload label="Fotos de apoio (opcional)" onChange={setPhotos} photos={photos} />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" disabled={submitting} type="submit">
            {submitting ? "Salvando..." : "Registrar retificacao"}
          </Button>
          <Button asChild className="min-h-11" type="button" variant="outline">
            <Link to={`/dogs/${dogId}/occurrences/${occurrenceId}`}>Cancelar</Link>
          </Button>
        </div>
      </form>
    </section>
  );
}
