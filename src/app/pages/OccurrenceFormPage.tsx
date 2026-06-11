import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyFormGuard } from "@/hooks/useDirtyFormGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { getErrorMessage } from "@/lib/auth-errors";
import { SEVERITY_LABELS } from "@/lib/domain-colors";
import { validateRequired } from "@/lib/validations";

const ADJUSTABLE_SEVERITIES = ["baixa", "media", "alta"] as const;
const TYPES_REQUIRING_NEW_TUTOR = new Set(["Adoção", "Transferência de Tutor"]);

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

export function OccurrenceFormPage() {
  const { dogId } = useParams();
  const navigate = useNavigate();
  const [now] = useState(() => Date.now());

  const dog = useQuery(
    api.dogs.get,
    dogId ? { dogId: dogId as Id<"dogs">, now } : "skip",
  );
  const types = useQuery(api.occurrenceTypes.availableForCreate, dogId ? {} : "skip");
  const createOccurrence = useMutation(api.occurrences.create);

  const [typeId, setTypeId] = useState<Id<"occurrence_types"> | "">("");
  const [descricao, setDescricao] = useState("");
  const [dataOcorrencia, setDataOcorrencia] = useState(
    new Date(now).toISOString().slice(0, 16),
  );
  const [bairroId, setBairroId] = useState<Id<"bairros"> | undefined>();
  const [bairroLabel, setBairroLabel] = useState("");
  const [localDescricao, setLocalDescricao] = useState("");
  const [gravidade, setGravidade] = useState<(typeof ADJUSTABLE_SEVERITIES)[number] | "">("");
  const [atribuivel, setAtribuivel] = useState(true);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [newTutorId, setNewTutorId] = useState<Id<"tutors"> | "">("");
  const [tutorSearch, setTutorSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useDirtyFormGuard(isDirty);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedType = useMemo(
    () => types?.find((type) => type._id === typeId),
    [typeId, types],
  );

  const isSensitive = useQuery(
    api.occurrences.isSensitiveType,
    typeId ? { occurrenceTypeId: typeId } : "skip",
  );

  const tutorOptions = useQuery(
    api.tutors.list,
    TYPES_REQUIRING_NEW_TUTOR.has(selectedType?.nome ?? "") && tutorSearch
      ? {
          paginationOpts: { numItems: 10, cursor: null },
          search: tutorSearch,
        }
      : "skip",
  );

  const requiresPhoto = selectedType?.requer_foto ?? false;
  const requiresNewTutor = TYPES_REQUIRING_NEW_TUTOR.has(selectedType?.nome ?? "");
  const canSubmit =
    Boolean(typeId && descricao.trim()) &&
    (!requiresPhoto || photos.length > 0) &&
    (!requiresNewTutor || Boolean(newTutorId));

  if (!dogId) {
    return <PermissionDenied message="Cão não informado." />;
  }

  if (dog === undefined || types === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!dog) {
    return <PermissionDenied message="Cão não encontrado." />;
  }

  if (!types || types.length === 0) {
    return <PermissionDenied message="Você não tem permissão para criar ocorrências." />;
  }

  const handleTypeChange = (nextTypeId: string) => {
    setTypeId(nextTypeId as Id<"occurrence_types">);
    const nextType = types.find((type) => type._id === nextTypeId);
    if (!nextType) {
      return;
    }
    const defaultAtribuivel =
      nextType.categoria !== "rotina" && nextType.categoria !== "clinica";
    setAtribuivel(defaultAtribuivel);
    setGravidade("");
  };

  const buildPayload = (resolvedTypeId: Id<"occurrence_types">) => ({
    dogId: dog._id,
    occurrenceTypeId: resolvedTypeId,
    descricao: descricao.trim(),
    data_ocorrencia: new Date(dataOcorrencia).getTime(),
    bairro_id: bairroId,
    local_descricao: localDescricao || undefined,
    gravidade: gravidade || undefined,
    atribuivel_ao_tutor: atribuivel,
    photo_storage_ids: photos.map((photo) => photo.storageId),
    new_tutor_id: newTutorId || undefined,
  });

  const submit = async () => {
    setError(null);
    const descricaoError = validateRequired(descricao);
    if (descricaoError || !typeId) {
      setError(descricaoError ?? "Selecione o tipo de ocorrência.");
      return;
    }

    setSubmitting(true);
    try {
      const occurrenceId = await createOccurrence(buildPayload(typeId));
      void navigate(`/dogs/${dog._id}/occurrences/${occurrenceId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível registrar a ocorrência."));
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    if (isSensitive) {
      setConfirmOpen(true);
      return;
    }
    void submit();
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={`Registrar evento para ${dog.nome}`}
        title="Nova ocorrência"
      />

      <form
        className="flex max-w-2xl flex-col gap-4"
        onChange={() => setIsDirty(true)}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="occ-type">Tipo</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="occ-type"
            onChange={(event) => handleTypeChange(event.target.value)}
            required
            value={typeId}
          >
            <option value="">Selecione</option>
            {types.map((type) => (
              <option key={type._id} value={type._id}>
                {type.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="occ-date">Data da ocorrência</Label>
          <Input
            id="occ-date"
            onChange={(event) => setDataOcorrencia(event.target.value)}
            required
            type="datetime-local"
            value={dataOcorrencia}
          />
        </div>

        <BairroAutocomplete
          initialLabel={bairroLabel}
          key={bairroLabel || "occ-bairro"}
          onChange={(id, label) => {
            setBairroId(id);
            setBairroLabel(label);
          }}
          value={bairroId}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="occ-local">Local</Label>
          <Input
            id="occ-local"
            onChange={(event) => setLocalDescricao(event.target.value)}
            placeholder="Referencia livre do local"
            value={localDescricao}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="occ-desc">Descrição</Label>
          <textarea
            className="min-h-24 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="occ-desc"
            onChange={(event) => setDescricao(event.target.value)}
            required
            value={descricao}
          />
        </div>

        {selectedType && selectedType.gravidade_padrao !== "info" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="occ-severity">Gravidade</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="occ-severity"
              onChange={(event) =>
                setGravidade(event.target.value as (typeof ADJUSTABLE_SEVERITIES)[number] | "")
              }
              value={gravidade}
            >
              <option value="">
                Padrao ({SEVERITY_LABELS[selectedType.gravidade_padrao]})
              </option>
              {ADJUSTABLE_SEVERITIES.map((value) => (
                <option key={value} value={value}>
                  {SEVERITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-card px-3 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground">
          <input
            checked={atribuivel}
            className="accent-primary"
            onChange={(event) => setAtribuivel(event.target.checked)}
            type="checkbox"
          />
          Conta para o alerta deste tutor
        </label>

        {requiresNewTutor ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="tutor-search">Tutor de destino</Label>
            <Input
              id="tutor-search"
              onChange={(event) => setTutorSearch(event.target.value)}
              placeholder="Buscar tutor por nome"
              value={tutorSearch}
            />
            {tutorOptions?.page && tutorOptions.page.length > 0 ? (
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-input bg-card">
                {tutorOptions.page.map((tutor) => (
                  <li key={tutor._id}>
                    <button
                      className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40 ${
                        newTutorId === tutor._id ? "bg-accent font-medium text-accent-foreground" : ""
                      }`}
                      onClick={() => setNewTutorId(tutor._id)}
                      type="button"
                    >
                      {tutor.nome_completo}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <MultiPhotoUpload
          label="Fotos da ocorrência"
          onChange={setPhotos}
          photos={photos}
          required={requiresPhoto}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" disabled={!canSubmit || submitting} type="submit">
            {submitting ? "Salvando..." : "Registrar ocorrência"}
          </Button>
          <Button asChild className="min-h-11" type="button" variant="outline">
            <Link to={`/dogs/${dog._id}`}>Cancelar</Link>
          </Button>
        </div>
      </form>

      <Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar ocorrência sensível</DialogTitle>
            <DialogDescription>
              Revise os dados antes de registrar uma ocorrência de risco ou legal.
            </DialogDescription>
          </DialogHeader>

          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Cão</dt>
              <dd>{dog.nome}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd>{selectedType?.nome}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Gravidade</dt>
              <dd>
                {gravidade
                  ? SEVERITY_LABELS[gravidade]
                  : selectedType
                    ? SEVERITY_LABELS[selectedType.gravidade_padrao]
                    : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Atribuicao ao tutor</dt>
              <dd>{atribuivel ? "Sim" : "Não"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fotos</dt>
              <dd>{photos.length}</dd>
            </div>
          </dl>

          <DialogFooter>
            <Button onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              Voltar
            </Button>
            <Button disabled={submitting} onClick={() => void submit()} type="button">
              Confirmar e registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesDialog blocker={blocker} />
    </section>
  );
}
