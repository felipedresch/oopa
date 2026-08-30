import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";
import { validateRequired } from "@/lib/validations";

const TIPO_DENUNCIA_OPTIONS = [
  { value: "maus_tratos", label: "Maus-tratos" },
  { value: "animal_ferido", label: "Animal ferido" },
  { value: "abandono", label: "Abandono" },
  { value: "acumulo_animais", label: "Acúmulo de animais" },
  { value: "outro", label: "Outro" },
];

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

export function PublicReportPage() {
  const navigate = useNavigate();
  const bairros = useQuery(api.bairros.listPublicOptions, {});
  const createReport = useMutation(api.publicReports.create);

  const [nomeDenunciante, setNomeDenunciante] = useState("");
  const [contato, setContato] = useState("");
  const [tipoDenuncia, setTipoDenuncia] = useState(TIPO_DENUNCIA_OPTIONS[0]?.value ?? "");
  const [descricao, setDescricao] = useState("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | "">("");
  const [localDescricao, setLocalDescricao] = useState("");
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(tipoDenuncia && descricao.trim());

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const descricaoError = validateRequired(descricao);
    if (descricaoError) {
      setError(descricaoError);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const reportId = await createReport({
        nome_denunciante: nomeDenunciante.trim() || undefined,
        contato: contato.trim() || undefined,
        tipo_denuncia: tipoDenuncia,
        descricao: descricao.trim(),
        bairro_id: bairroId || undefined,
        local_descricao: localDescricao.trim() || undefined,
        photo_storage_ids: photos.map((photo) => photo.storageId),
      });
      void navigate(`/denuncia/${reportId}/confirmacao`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível enviar a denúncia."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Denúncia de maus-tratos ou abandono</CardTitle>
        <CardDescription>
          Conte o que você viu. Nome e contato são opcionais — a denúncia pode ser anônima.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="report-nome">Seu nome (opcional)</Label>
            <Input
              id="report-nome"
              onChange={(event) => setNomeDenunciante(event.target.value)}
              value={nomeDenunciante}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-contato">Telefone ou email (opcional)</Label>
            <Input
              id="report-contato"
              onChange={(event) => setContato(event.target.value)}
              value={contato}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-tipo">Tipo de denúncia</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="report-tipo"
              onChange={(event) => setTipoDenuncia(event.target.value)}
              required
              value={tipoDenuncia}
            >
              {TIPO_DENUNCIA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-descricao">O que você viu</Label>
            <textarea
              className="min-h-28 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="report-descricao"
              onChange={(event) => setDescricao(event.target.value)}
              required
              value={descricao}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-bairro">Bairro (opcional)</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="report-bairro"
              onChange={(event) => setBairroId(event.target.value as Id<"bairros"> | "")}
              value={bairroId}
            >
              <option value="">Não sei / prefiro não informar</option>
              {bairros?.map((bairro) => (
                <option key={bairro._id} value={bairro._id}>
                  {bairro.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-local">Ponto de referência (opcional)</Label>
            <Input
              id="report-local"
              onChange={(event) => setLocalDescricao(event.target.value)}
              placeholder="Ex.: em frente ao mercado da esquina"
              value={localDescricao}
            />
          </div>

          <MultiPhotoUpload
            label="Fotos (opcional)"
            onChange={setPhotos}
            photos={photos}
            uploadUrlMutation={api.publicReports.createUploadUrl}
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button className="min-h-11" disabled={!canSubmit || submitting} type="submit">
            {submitting ? "Enviando..." : "Enviar denúncia"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
