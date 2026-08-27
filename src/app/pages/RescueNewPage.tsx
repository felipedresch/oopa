import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import type { Severity } from "@/lib/domain-colors";
import { SEVERITY_LABELS } from "@/lib/domain-colors";
import { validateRequired } from "@/lib/validations";

const TIPO_OPTIONS: { value: string; label: string; defaultGravidade: Severity }[] = [
  { value: "atropelado", label: "Atropelado", defaultGravidade: "alta" },
  { value: "preso", label: "Preso", defaultGravidade: "media" },
  { value: "agressivo", label: "Agressivo / oferece risco", defaultGravidade: "media" },
  { value: "ferido", label: "Ferido", defaultGravidade: "media" },
  { value: "filhotes_abandonados", label: "Filhotes abandonados", defaultGravidade: "baixa" },
  { value: "outro", label: "Outro", defaultGravidade: "baixa" },
];

const GRAVIDADE_OPTIONS: Severity[] = ["baixa", "media", "alta"];

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

export function RescueNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const createRescue = useMutation(api.rescues.create);

  const [tipo, setTipo] = useState(TIPO_OPTIONS[0]?.value ?? "");
  const [gravidade, setGravidade] = useState<Severity>(TIPO_OPTIONS[0]?.defaultGravidade ?? "media");
  const [descricao, setDescricao] = useState("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | undefined>();
  const [bairroLabel, setBairroLabel] = useState("");
  const [localDescricao, setLocalDescricao] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [solicitanteId, setSolicitanteId] = useState<Id<"people"> | undefined>();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const personOptions = useQuery(
    api.people.list,
    personSearch
      ? { paginationOpts: { numItems: 5, cursor: null }, search: personSearch }
      : "skip",
  );

  if (!can("rescues.create")) {
    return <PermissionDenied />;
  }

  const canSubmit = Boolean(tipo && descricao.trim());

  const handleTipoChange = (nextTipo: string) => {
    setTipo(nextTipo);
    const option = TIPO_OPTIONS.find((item) => item.value === nextTipo);
    if (option) {
      setGravidade(option.defaultGravidade);
    }
  };

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
      const rescueId = await createRescue({
        tipo,
        gravidade,
        descricao_solicitante: descricao.trim(),
        bairro_id: bairroId,
        local_descricao: localDescricao.trim() || undefined,
        solicitante_id: solicitanteId,
        photo_storage_ids: photos.map((photo) => photo.storageId),
      });
      void navigate(`/rescues/${rescueId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível registrar a solicitação."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader description="Registre uma solicitação de resgate." title="Nova solicitação de resgate" />

      <form
        className="flex max-w-2xl flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="rescue-tipo">Tipo</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="rescue-tipo"
            onChange={(event) => handleTipoChange(event.target.value)}
            required
            value={tipo}
          >
            {TIPO_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rescue-gravidade">Gravidade</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="rescue-gravidade"
            onChange={(event) => setGravidade(event.target.value as Severity)}
            value={gravidade}
          >
            {GRAVIDADE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {SEVERITY_LABELS[value]}
              </option>
            ))}
          </select>
          {gravidade === "alta" ? (
            <p className="text-xs text-warning">
              Gravidade alta dispara um alerta imediato para a equipe.
            </p>
          ) : null}
        </div>

        <BairroAutocomplete
          initialLabel={bairroLabel}
          key={bairroLabel || "rescue-bairro"}
          onChange={(id, label) => {
            setBairroId(id);
            setBairroLabel(label);
          }}
          value={bairroId}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="rescue-local">Local</Label>
          <Input
            id="rescue-local"
            onChange={(event) => setLocalDescricao(event.target.value)}
            placeholder="Referência livre do local"
            value={localDescricao}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rescue-desc">O que foi relatado</Label>
          <textarea
            className="min-h-28 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="rescue-desc"
            onChange={(event) => setDescricao(event.target.value)}
            required
            value={descricao}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="rescue-solicitante">Quem acionou (opcional)</Label>
          <Input
            id="rescue-solicitante"
            onChange={(event) => {
              setPersonSearch(event.target.value);
              setSolicitanteId(undefined);
            }}
            placeholder="Buscar pessoa por nome"
            value={personSearch}
          />
          {personOptions?.page && personOptions.page.length > 0 && !solicitanteId ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-input bg-card">
              {personOptions.page.map((person) => (
                <li key={person._id}>
                  <button
                    className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40"
                    onClick={() => {
                      setSolicitanteId(person._id);
                      setPersonSearch(person.nome_completo);
                    }}
                    type="button"
                  >
                    {person.nome_completo}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <MultiPhotoUpload label="Fotos (opcional)" onChange={setPhotos} photos={photos} />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button className="min-h-11" disabled={!canSubmit || submitting} type="submit">
          {submitting ? "Salvando..." : "Registrar solicitação"}
        </Button>
      </form>
    </section>
  );
}
