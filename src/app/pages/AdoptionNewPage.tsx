import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import { BairroWarningBanner } from "@/components/BairroWarningBanner";
import { DogCard } from "@/components/DogCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { StepperForm } from "@/components/StepperForm";
import { TutorAssessmentPanel } from "@/components/TutorAssessmentPanel";
import { TutorCard } from "@/components/TutorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { formatDate, formatMicrochip } from "@/lib/formatters";
import { maskCpf } from "@/lib/masks";
import { validateCpf, validateRequired } from "@/lib/validations";
import { cn } from "@/lib/utils";

const STEPS = ["Cao", "Tutor", "Avaliacao", "Dados", "Revisao"] as const;

export function AdoptionNewPage() {
  const { can, user } = usePermissions();
  const [step, setStep] = useState(0);
  const [now] = useState(() => Date.now());

  const [dogSearch, setDogSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<Id<"dogs"> | null>(null);

  const [tutorSearch, setTutorSearch] = useState("");
  const [selectedTutorId, setSelectedTutorId] = useState<Id<"tutors"> | null>(null);
  const [showMiniTutorForm, setShowMiniTutorForm] = useState(false);
  const [miniTutorNome, setMiniTutorNome] = useState("");
  const [miniTutorCpf, setMiniTutorCpf] = useState("");
  const [miniTutorBairroId, setMiniTutorBairroId] = useState<Id<"bairros"> | undefined>();
  const [miniTutorBairroLabel, setMiniTutorBairroLabel] = useState("");

  const [numeroTermo, setNumeroTermo] = useState("");
  const [dataAdocao, setDataAdocao] = useState(new Date(now).toISOString().slice(0, 10));
  const [responsavelId, setResponsavelId] = useState<Id<"users"> | "">("");
  const [condicoes, setCondicoes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [confirmouDocumentos, setConfirmouDocumentos] = useState(false);
  const [confirmouOrientacoes, setConfirmouOrientacoes] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ occurrenceId: Id<"occurrences"> } | null>(null);

  const createAdoption = useMutation(api.adoptions.create);
  const createTutor = useMutation(api.tutors.create);

  const dogResults = usePaginatedQuery(
    api.dogs.list,
    can("dogs.read") && step === 0
      ? { search: dogSearch || undefined, now }
      : "skip",
    { initialNumItems: 8 },
  );

  const tutorResults = usePaginatedQuery(
    api.tutors.list,
    can("tutors.read") && step === 1 && !showMiniTutorForm
      ? { search: tutorSearch || undefined }
      : "skip",
    { initialNumItems: 8 },
  );

  const selectedDog = useQuery(
    api.dogs.get,
    selectedDogId ? { dogId: selectedDogId, now } : "skip",
  );

  const evaluation = useQuery(
    api.adoptions.evaluateTutor,
    selectedDogId && selectedTutorId && step >= 2
      ? { dogId: selectedDogId, tutorId: selectedTutorId }
      : "skip",
  );

  const ongStaff = useQuery(
    api.adoptions.listOngStaff,
    can("occurrences.create_adocao") ? {} : "skip",
  );

  const responsavelDefault = useMemo(() => {
    if (!user || responsavelId) {
      return responsavelId;
    }
    const match = ongStaff?.find((staff) => staff._id === user._id);
    return match?._id ?? "";
  }, [ongStaff, responsavelId, user]);

  if (!can("occurrences.create_adocao")) {
    return <PermissionDenied />;
  }

  if (success && selectedDogId && selectedTutorId) {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader
          description="A adocao foi registrada e o historico do cao foi atualizado."
          title="Adocao concluida"
        />
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Ocorrencia #{success.occurrenceId}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11">
              <Link to={`/dogs/${selectedDogId}`}>Ver ficha do cao</Link>
            </Button>
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/tutors/${selectedTutorId}`}>Ver ficha do tutor</Link>
            </Button>
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/dogs/${selectedDogId}/occurrences/${success.occurrenceId}`}>
                Ver ocorrencia
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const canAdvanceDog = Boolean(selectedDogId);
  const canAdvanceTutor = Boolean(selectedTutorId);
  const canAdvanceDados =
    Boolean(numeroTermo.trim() && condicoes.trim() && dataAdocao) &&
    Boolean(responsavelDefault || responsavelId) &&
    confirmouDocumentos &&
    confirmouOrientacoes;

  const handleCreateMiniTutor = async () => {
    setError(null);
    const nomeError = validateRequired(miniTutorNome);
    if (nomeError) {
      setError(nomeError);
      return;
    }
    if (miniTutorCpf) {
      const cpfError = validateCpf(miniTutorCpf);
      if (cpfError) {
        setError(cpfError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const tutorId = await createTutor({
        nome_completo: miniTutorNome.trim(),
        cpf: miniTutorCpf.replace(/\D/g, "") || undefined,
        bairro_id: miniTutorBairroId,
      });
      setSelectedTutorId(tutorId);
      setShowMiniTutorForm(false);
      setStep(2);
    } catch (cause) {
      setError(getErrorMessage(cause, "Nao foi possivel cadastrar o tutor."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDogId || !selectedTutorId) {
      return;
    }

    const staffId = (responsavelId || responsavelDefault) as Id<"users">;
    setError(null);
    setSubmitting(true);

    try {
      const occurrenceId = await createAdoption({
        dogId: selectedDogId,
        tutorId: selectedTutorId,
        data_adocao: new Date(dataAdocao).getTime(),
        numero_termo_adocao: numeroTermo.trim(),
        responsavel_ong_user_id: staffId,
        condicoes_adocao: condicoes.trim(),
        observacoes_adocao: observacoes.trim() || undefined,
        confirmou_documentos: true,
        confirmou_orientacoes: true,
      });
      setSuccess({ occurrenceId });
    } catch (cause) {
      setError(getErrorMessage(cause, "Nao foi possivel registrar a adocao."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Registre uma adocao com avaliacao do tutor e confirmacoes obrigatorias."
        title="Nova adocao"
      />

      <StepperForm
        canContinue={
          step === 0
            ? canAdvanceDog
            : step === 1
              ? showMiniTutorForm
                ? Boolean(miniTutorNome.trim())
                : canAdvanceTutor
              : step === 2
                ? true
                : step === 3
                  ? canAdvanceDados
                  : true
        }
        continueLabel={
          step === 1 && showMiniTutorForm
            ? "Cadastrar tutor"
            : step === 4
              ? submitting
                ? "Registrando..."
                : "Concluir adocao"
              : undefined
        }
        currentStep={step}
        onBack={
          step > 0
            ? () => {
                setError(null);
                if (step === 1 && showMiniTutorForm) {
                  setShowMiniTutorForm(false);
                  return;
                }
                setStep(step - 1);
              }
            : undefined
        }
        onContinue={
          step === 1 && showMiniTutorForm
            ? () => void handleCreateMiniTutor()
            : step < 4
              ? () => {
                  setError(null);
                  setStep(step + 1);
                  if (step === 3 && !responsavelId && responsavelDefault) {
                    setResponsavelId(responsavelDefault);
                  }
                }
              : () => void handleSubmit()
        }
        steps={[...STEPS]}
      >
        {error ? (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dog-search-adoption">Buscar cao</Label>
              <Input
                id="dog-search-adoption"
                onChange={(event) => setDogSearch(event.target.value)}
                placeholder="Nome ou microchip"
                value={dogSearch}
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
              <p className="text-sm text-muted-foreground">
                Selecionado: <strong>{selectedDog.nome}</strong> (
                {formatMicrochip(selectedDog.microchip)})
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            {!showMiniTutorForm ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="tutor-search-adoption">Buscar tutor</Label>
                    <Input
                      id="tutor-search-adoption"
                      onChange={(event) => setTutorSearch(event.target.value)}
                      placeholder="Nome do tutor"
                      value={tutorSearch}
                    />
                  </div>
                  {can("tutors.create") ? (
                    <Button
                      className="min-h-11"
                      onClick={() => setShowMiniTutorForm(true)}
                      type="button"
                      variant="outline"
                    >
                      Cadastrar novo tutor
                    </Button>
                  ) : null}
                </div>

                {tutorResults.status === "LoadingFirstPage" ? (
                  <LoadingSkeleton rows={3} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {tutorResults.results.map((tutor) => (
                      <li key={tutor._id}>
                        <button
                          className={cn(
                            "w-full rounded-xl text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selectedTutorId === tutor._id && "ring-2 ring-primary",
                          )}
                          onClick={() => setSelectedTutorId(tutor._id)}
                          type="button"
                        >
                          <TutorCard
                            alertLevel={tutor.alert_level}
                            bairroNome={tutor.bairro_nome}
                            nome={tutor.nome_completo}
                            selectable
                            tutorId={tutor._id}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Cadastro rapido sem sair do fluxo de adocao.
                </p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mini-tutor-nome">Nome completo</Label>
                  <Input
                    id="mini-tutor-nome"
                    onChange={(event) => setMiniTutorNome(event.target.value)}
                    value={miniTutorNome}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mini-tutor-cpf">CPF</Label>
                  <Input
                    id="mini-tutor-cpf"
                    onChange={(event) => setMiniTutorCpf(maskCpf(event.target.value))}
                    placeholder="Opcional"
                    value={miniTutorCpf}
                  />
                </div>
                <BairroAutocomplete
                  initialLabel={miniTutorBairroLabel}
                  onChange={(id, label) => {
                    setMiniTutorBairroId(id);
                    setMiniTutorBairroLabel(label);
                  }}
                  value={miniTutorBairroId}
                />
              </div>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            {evaluation === undefined ? (
              <LoadingSkeleton rows={4} />
            ) : (
              <>
                <TutorAssessmentPanel
                  alert={evaluation.tutor.alert}
                  bairroNome={evaluation.tutor.bairro_nome}
                  tutorNome={evaluation.tutor.tutor_nome}
                />
                {evaluation.bairro_warning.has_warning &&
                evaluation.bairro_warning.message ? (
                  <BairroWarningBanner message={evaluation.bairro_warning.message} />
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Voce pode continuar mesmo com alertas ou warnings de bairro.
                </p>
              </>
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="numero-termo">Numero do termo de adocao</Label>
              <Input
                id="numero-termo"
                onChange={(event) => setNumeroTermo(event.target.value)}
                value={numeroTermo}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-adocao">Data da adocao</Label>
              <Input
                id="data-adocao"
                onChange={(event) => setDataAdocao(event.target.value)}
                type="date"
                value={dataAdocao}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsavel-ong">Responsavel ONG</Label>
              <select
                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="responsavel-ong"
                onChange={(event) => setResponsavelId(event.target.value as Id<"users">)}
                value={responsavelId || responsavelDefault || ""}
              >
                <option value="">Selecione</option>
                {ongStaff?.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="condicoes-adocao">Condicoes de adocao</Label>
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="condicoes-adocao"
                onChange={(event) => setCondicoes(event.target.value)}
                value={condicoes}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="observacoes-adocao">Observacoes (opcional)</Label>
              <textarea
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                id="observacoes-adocao"
                onChange={(event) => setObservacoes(event.target.value)}
                value={observacoes}
              />
            </div>
            <label className="flex items-start gap-3 md:col-span-2">
              <input
                checked={confirmouDocumentos}
                className="mt-1 size-4"
                onChange={(event) => setConfirmouDocumentos(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm">Confirmo a entrega dos documentos ao tutor.</span>
            </label>
            <label className="flex items-start gap-3 md:col-span-2">
              <input
                checked={confirmouOrientacoes}
                className="mt-1 size-4"
                onChange={(event) => setConfirmouOrientacoes(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm">Confirmo as orientacoes de cuidado ao tutor.</span>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-4 text-sm">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Cao</h3>
              <p>{selectedDog?.nome}</p>
              <p className="text-muted-foreground">
                {selectedDog ? formatMicrochip(selectedDog.microchip) : ""}
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Tutor</h3>
              <p>{evaluation?.tutor.tutor_nome}</p>
              {evaluation?.tutor.bairro_nome ? (
                <p className="text-muted-foreground">{evaluation.tutor.bairro_nome}</p>
              ) : null}
            </div>
            {evaluation?.bairro_warning.has_warning && evaluation.bairro_warning.message ? (
              <BairroWarningBanner message={evaluation.bairro_warning.message} />
            ) : null}
            {evaluation?.tutor.alert ? (
              <TutorAssessmentPanel
                alert={evaluation.tutor.alert}
                bairroNome={evaluation.tutor.bairro_nome}
                tutorNome={evaluation.tutor.tutor_nome}
              />
            ) : null}
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 font-medium">Dados da adocao</h3>
              <p>Termo: {numeroTermo}</p>
              <p>Data: {formatDate(new Date(dataAdocao).getTime())}</p>
              <p>Condicoes: {condicoes}</p>
              {observacoes ? <p>Observacoes: {observacoes}</p> : null}
            </div>
          </div>
        ) : null}
      </StepperForm>
    </section>
  );
}
