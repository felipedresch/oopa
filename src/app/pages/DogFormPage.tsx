import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PhotoUpload } from "@/components/PhotoUpload";
import { StepperForm } from "@/components/StepperForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyFormGuard } from "@/hooks/useDirtyFormGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { formatMicrochip } from "@/lib/formatters";
import { maskMicrochipInput } from "@/lib/masks";
import { validateMicrochip, validateRequired } from "@/lib/validations";

const STEPS = ["Identificação", "Características", "Saúde", "Foto", "Revisão"];

type Sexo = "macho" | "femea";
type Porte = "pequeno" | "medio" | "grande";

type DogFormInitial = {
  _id: Id<"dogs">;
  microchip: string;
  nome: string;
  sexo: Sexo;
  porte: Porte;
  raca_aparente?: string;
  cor_pelagem?: string;
  caracteristicas_visuais?: string;
  caracteristicas_comportamentais?: string;
  condicoes_saude?: string;
  castrado: boolean;
  vacinas_em_dia: boolean;
  foto_perfil_storage_id?: Id<"_storage">;
  foto_perfil_url: string | null;
  observacoes?: string;
};

export function DogFormPage() {
  const { dogId } = useParams();
  const isEdit = Boolean(dogId);
  const [searchParams] = useSearchParams();
  const { can } = usePermissions();
  const [now] = useState(() => Date.now());

  const existing = useQuery(
    api.dogs.get,
    isEdit && dogId && can("dogs.read") ? { dogId: dogId as Id<"dogs">, now } : "skip",
  );

  const allowed = isEdit ? can("dogs.edit") : can("dogs.create");
  if (!allowed) {
    return <PermissionDenied />;
  }

  if (isEdit && existing === undefined) {
    return <LoadingSkeleton rows={5} />;
  }

  if (isEdit && !existing) {
    return <PermissionDenied message="Cão não encontrado." />;
  }

  const formKey = isEdit && existing ? existing._id : `new-${searchParams.get("microchip") ?? ""}`;

  return (
    <DogFormContent
      dogId={dogId}
      initial={isEdit && existing ? existing : null}
      initialMicrochip={searchParams.get("microchip") ?? ""}
      isEdit={isEdit}
      key={formKey}
    />
  );
}

type DogFormContentProps = {
  isEdit: boolean;
  dogId?: string;
  initial: DogFormInitial | null;
  initialMicrochip: string;
};

function DogFormContent({ isEdit, dogId, initial, initialMicrochip }: DogFormContentProps) {
  const navigate = useNavigate();
  const createDog = useMutation(api.dogs.create);
  const updateDog = useMutation(api.dogs.update);

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [microchip, setMicrochip] = useState(
    initial ? formatMicrochip(initial.microchip) : maskMicrochipInput(initialMicrochip),
  );
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [sexo, setSexo] = useState<Sexo>(initial?.sexo ?? "macho");
  const [porte, setPorte] = useState<Porte>(initial?.porte ?? "medio");
  const [racaAparente, setRacaAparente] = useState(initial?.raca_aparente ?? "");
  const [corPelagem, setCorPelagem] = useState(initial?.cor_pelagem ?? "");
  const [caracteristicasVisuais, setCaracteristicasVisuais] = useState(
    initial?.caracteristicas_visuais ?? "",
  );
  const [caracteristicasComportamentais, setCaracteristicasComportamentais] = useState(
    initial?.caracteristicas_comportamentais ?? "",
  );
  const [condicoesSaude, setCondicoesSaude] = useState(initial?.condicoes_saude ?? "");
  const [castrado, setCastrado] = useState(initial?.castrado ?? false);
  const [vacinasEmDia, setVacinasEmDia] = useState(initial?.vacinas_em_dia ?? false);
  const [observacoes, setObservacoes] = useState(initial?.observacoes ?? "");
  const [fotoStorageId, setFotoStorageId] = useState(initial?.foto_perfil_storage_id);
  const [fotoPreview, setFotoPreview] = useState<string | null>(initial?.foto_perfil_url ?? null);
  const [isDirty, setIsDirty] = useState(false);

  const blocker = useDirtyFormGuard(isDirty);
  const markDirty = () => setIsDirty(true);

  const canContinue = (() => {
    if (step === 0) {
      return !validateRequired(nome) && (isEdit || !validateMicrochip(microchip));
    }
    if (step === 3) {
      return Boolean(fotoStorageId);
    }
    return true;
  })();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (isEdit && dogId) {
        await updateDog({
          dogId: dogId as Id<"dogs">,
          nome,
          sexo,
          porte,
          raca_aparente: racaAparente || undefined,
          cor_pelagem: corPelagem || undefined,
          caracteristicas_visuais: caracteristicasVisuais || undefined,
          caracteristicas_comportamentais: caracteristicasComportamentais || undefined,
          condicoes_saude: condicoesSaude || undefined,
          castrado,
          vacinas_em_dia: vacinasEmDia,
          foto_perfil_storage_id: fotoStorageId,
          observacoes: observacoes || undefined,
        });
        void navigate(`/dogs/${dogId}`);
        return;
      }

      if (!fotoStorageId) {
        throw new Error("Foto de perfil obrigatória.");
      }

      const createdId = await createDog({
        microchip: microchip.replace(/\D/g, ""),
        nome,
        sexo,
        porte,
        raca_aparente: racaAparente || undefined,
        cor_pelagem: corPelagem || undefined,
        caracteristicas_visuais: caracteristicasVisuais || undefined,
        caracteristicas_comportamentais: caracteristicasComportamentais || undefined,
        condicoes_saude: condicoesSaude || undefined,
        castrado,
        vacinas_em_dia: vacinasEmDia,
        foto_perfil_storage_id: fotoStorageId,
        observacoes: observacoes || undefined,
      });

      void navigate(`/dogs/${createdId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar o cão."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={
          isEdit
            ? "Atualize os dados do cão mantendo o microchip original."
            : "Cadastre o cão em etapas com foto de perfil obrigatória."
        }
        title={isEdit ? "Editar cão" : "Novo cão"}
      />

      <div onChange={markDirty}>
      <StepperForm
        canContinue={canContinue}
        continueLabel={step === STEPS.length - 1 ? (loading ? "Salvando..." : "Salvar") : undefined}
        currentStep={step}
        onBack={step > 0 ? () => setStep((value) => value - 1) : undefined}
        onContinue={
          step < STEPS.length - 1 ? () => setStep((value) => value + 1) : () => void handleSubmit()
        }
        steps={STEPS}
      >
        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="microchip">Microchip</Label>
              <Input
                disabled={isEdit}
                id="microchip"
                inputMode="numeric"
                onChange={(event) => setMicrochip(maskMicrochipInput(event.target.value))}
                value={microchip}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" onChange={(event) => setNome(event.target.value)} required value={nome} />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sexo">Sexo</Label>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="sexo"
                onChange={(event) => setSexo(event.target.value as Sexo)}
                value={sexo}
              >
                <option value="macho">Macho</option>
                <option value="femea">Femea</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="porte">Porte</Label>
              <select
                className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="porte"
                onChange={(event) => setPorte(event.target.value as Porte)}
                value={porte}
              >
                <option value="pequeno">Pequeno</option>
                <option value="medio">Medio</option>
                <option value="grande">Grande</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="raca">Raca aparente</Label>
              <Input id="raca" onChange={(event) => setRacaAparente(event.target.value)} value={racaAparente} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="cor">Cor da pelagem</Label>
              <Input id="cor" onChange={(event) => setCorPelagem(event.target.value)} value={corPelagem} />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="visuais">Caracteristicas visuais</Label>
              <Input
                id="visuais"
                onChange={(event) => setCaracteristicasVisuais(event.target.value)}
                value={caracteristicasVisuais}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="comportamentais">Caracteristicas comportamentais</Label>
              <Input
                id="comportamentais"
                onChange={(event) => setCaracteristicasComportamentais(event.target.value)}
                value={caracteristicasComportamentais}
              />
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4">
            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                checked={castrado}
                className="accent-primary"
                onChange={(event) => setCastrado(event.target.checked)}
                type="checkbox"
              />
              Castrado
            </label>
            <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input
                checked={vacinasEmDia}
                className="accent-primary"
                onChange={(event) => setVacinasEmDia(event.target.checked)}
                type="checkbox"
              />
              Vacinas em dia
            </label>
            <div className="flex flex-col gap-2">
              <Label htmlFor="saude">Condicoes de saude</Label>
              <Input
                id="saude"
                onChange={(event) => setCondicoesSaude(event.target.value)}
                value={condicoesSaude}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                onChange={(event) => setObservacoes(event.target.value)}
                value={observacoes}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <PhotoUpload
            label="Foto de perfil"
            onChange={(storageId, preview) => {
              setFotoStorageId(storageId);
              setFotoPreview(preview);
            }}
            previewUrl={fotoPreview}
            required
            storageId={fotoStorageId}
          />
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-3 text-sm">
            <p>
              <strong>Nome:</strong> {nome}
            </p>
            <p>
              <strong>Microchip:</strong> {microchip}
            </p>
            <p>
              <strong>Sexo / Porte:</strong> {sexo} / {porte}
            </p>
            <p>
              <strong>Saude:</strong> {castrado ? "Castrado" : "Não castrado"} ·{" "}
              {vacinasEmDia ? "Vacinas em dia" : "Vacinas pendentes"}
            </p>
            {fotoPreview ? (
              <img
                alt="Preview final"
                className="size-40 min-h-40 min-w-40 rounded-xl border object-cover"
                src={fotoPreview}
              />
            ) : null}
          </div>
        ) : null}
      </StepperForm>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button asChild className="min-h-11 self-start" variant="ghost">
        <Link to={isEdit && dogId ? `/dogs/${dogId}` : "/dogs"}>Cancelar</Link>
      </Button>
      <UnsavedChangesDialog blocker={blocker} />
    </section>
  );
}
