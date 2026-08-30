import { PawPrintIcon } from "lucide-react";
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
import { PdfUpload } from "@/components/PdfUpload";
import { StepperForm } from "@/components/StepperForm";
import { PersonAssessmentPanel } from "@/components/PersonAssessmentPanel";
import { PersonCard } from "@/components/PersonCard";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { dateInputToTimestamp, todayAsDateInput } from "@/lib/dates";
import { getErrorMessage } from "@/lib/auth-errors";
import { formatDate, formatMicrochip } from "@/lib/formatters";
import { maskCpf } from "@/lib/masks";
import { validateCpf, validateRequired } from "@/lib/validations";
import { cn } from "@/lib/utils";

const STEPS = ["Animal", "Tutor", "Avaliação", "Dados", "Revisão"] as const;

export function AdoptionNewPage() {
  const { can, canAny, user } = usePermissions();
  const [step, setStep] = useState(0);
  const [now] = useState(() => Date.now());

  const [dogSearch, setDogSearch] = useState("");
  const [selectedDogId, setSelectedDogId] = useState<Id<"dogs"> | null>(null);

  const [personSearch, setPersonSearch] = useState("");
  const [selectedPersonId, setSelectedPersonId] = useState<Id<"people"> | null>(null);
  const [showMiniPersonForm, setShowMiniPersonForm] = useState(false);
  const [miniPersonNome, setMiniPersonNome] = useState("");
  const [miniPersonCpf, setMiniPersonCpf] = useState("");
  const [miniPersonBairroId, setMiniPersonBairroId] = useState<Id<"bairros"> | undefined>();
  const [miniPersonBairroLabel, setMiniPersonBairroLabel] = useState("");

  const [numeroTermo, setNumeroTermo] = useState("");
  const [termoStorageId, setTermoStorageId] = useState<Id<"_storage"> | undefined>();
  const [dataAdocao, setDataAdocao] = useState(() => todayAsDateInput(now));
  const [responsavelId, setResponsavelId] = useState<Id<"users"> | "">("");
  const [condicoes, setCondicoes] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [confirmouDocumentos, setConfirmouDocumentos] = useState(false);
  const [confirmouOrientacoes, setConfirmouOrientacoes] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ occurrenceId: Id<"occurrences"> } | null>(null);

  const createAdoption = useMutation(api.adoptions.create);
  const createPerson = useMutation(api.people.create);

  const dogResults = usePaginatedQuery(
    api.dogs.list,
    can("dogs.read") && step === 0
      ? { search: dogSearch || undefined, now }
      : "skip",
    { initialNumItems: 8 },
  );

  const personResults = usePaginatedQuery(
    api.people.list,
    can("people.read") && step === 1 && !showMiniPersonForm
      ? { search: personSearch || undefined }
      : "skip",
    { initialNumItems: 8 },
  );

  const selectedDog = useQuery(
    api.dogs.get,
    selectedDogId ? { dogId: selectedDogId, now } : "skip",
  );

  const evaluation = useQuery(
    api.adoptions.evaluatePerson,
    selectedDogId && selectedPersonId && step >= 2
      ? { dogId: selectedDogId, personId: selectedPersonId }
      : "skip",
  );

  const ongStaff = useQuery(
    api.adoptions.listOngStaff,
    canAny(["occurrences.create_adocao", "adoptions.create"]) ? {} : "skip",
  );

  const responsavelDefault = useMemo(() => {
    if (!user || responsavelId) {
      return responsavelId;
    }
    const match = ongStaff?.find((staff) => staff._id === user._id);
    return match?._id ?? "";
  }, [ongStaff, responsavelId, user]);

  if (!canAny(["occurrences.create_adocao", "adoptions.create"])) {
    return <PermissionDenied />;
  }

  if (success && selectedDogId && selectedPersonId) {
    return (
      <section className="flex flex-col gap-6">
        <PageHeader
          description="A adoção foi registrada e o histórico do animal foi atualizado."
          title="Adoção concluída"
        />
        <div className="flex flex-col gap-4 rounded-2xl bg-success/10 p-6">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <PawPrintIcon aria-hidden="true" className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            Ocorrência registrada
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="min-h-11">
              <Link to={`/dogs/${selectedDogId}`}>Ver ficha do animal</Link>
            </Button>
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/people/${selectedPersonId}`}>Ver ficha do tutor</Link>
            </Button>
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/dogs/${selectedDogId}/occurrences/${success.occurrenceId}`}>
                Ver ocorrência
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  const canAdvanceDog = Boolean(selectedDogId);
  const canAdvancePerson = Boolean(selectedPersonId);
  const canAdvanceDados =
    Boolean(numeroTermo.trim() && condicoes.trim() && dataAdocao) &&
    Boolean(responsavelDefault || responsavelId) &&
    confirmouDocumentos &&
    confirmouOrientacoes;

  const handleCreateMiniPerson = async () => {
    setError(null);
    const nomeError = validateRequired(miniPersonNome);
    if (nomeError) {
      setError(nomeError);
      return;
    }
    if (miniPersonCpf) {
      const cpfError = validateCpf(miniPersonCpf);
      if (cpfError) {
        setError(cpfError);
        return;
      }
    }

    setSubmitting(true);
    try {
      const personId = await createPerson({
        nome_completo: miniPersonNome.trim(),
        cpf: miniPersonCpf.replace(/\D/g, "") || undefined,
        bairro_id: miniPersonBairroId,
      });
      setSelectedPersonId(personId);
      setShowMiniPersonForm(false);
      setStep(2);
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível cadastrar o tutor."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDogId || !selectedPersonId) {
      return;
    }

    const staffId = (responsavelId || responsavelDefault) as Id<"users">;
    setError(null);
    setSubmitting(true);

    try {
      const occurrenceId = await createAdoption({
        dogId: selectedDogId,
        personId: selectedPersonId,
        data_adocao: dateInputToTimestamp(dataAdocao) ?? Date.now(),
        numero_termo_adocao: numeroTermo.trim(),
        responsavel_ong_user_id: staffId,
        condicoes_adocao: condicoes.trim(),
        observacoes_adocao: observacoes.trim() || undefined,
        confirmou_documentos: true,
        confirmou_orientacoes: true,
        termo_adocao_storage_id: termoStorageId,
      });
      setSuccess({ occurrenceId });
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível registrar a adoção."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Registre uma adoção com avaliação do tutor e confirmações obrigatórias."
        title="Nova adoção"
      />

      <StepperForm
        canContinue={
          step === 0
            ? canAdvanceDog
            : step === 1
              ? showMiniPersonForm
                ? Boolean(miniPersonNome.trim())
                : canAdvancePerson
              : step === 2
                ? true
                : step === 3
                  ? canAdvanceDados
                  : true
        }
        continueLabel={
          step === 1 && showMiniPersonForm
            ? "Cadastrar tutor"
            : step === 4
              ? submitting
                ? "Registrando..."
                : "Concluir adoção"
              : undefined
        }
        currentStep={step}
        onBack={
          step > 0
            ? () => {
                setError(null);
                if (step === 1 && showMiniPersonForm) {
                  setShowMiniPersonForm(false);
                  return;
                }
                setStep(step - 1);
              }
            : undefined
        }
        onContinue={
          step === 1 && showMiniPersonForm
            ? () => void handleCreateMiniPerson()
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
          <p className="mb-4 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {step === 0 ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dog-search-adoption">Buscar animal</Label>
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
                {selectedDog.microchip ? formatMicrochip(selectedDog.microchip) : "sem microchip"})
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-4">
            {!showMiniPersonForm ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-2">
                    <Label htmlFor="tutor-search-adoption">Buscar tutor</Label>
                    <Input
                      id="tutor-search-adoption"
                      onChange={(event) => setPersonSearch(event.target.value)}
                      placeholder="Nome do tutor"
                      value={personSearch}
                    />
                  </div>
                  {can("people.create") ? (
                    <Button
                      className="min-h-11"
                      onClick={() => setShowMiniPersonForm(true)}
                      type="button"
                      variant="outline"
                    >
                      Cadastrar novo tutor
                    </Button>
                  ) : null}
                </div>

                {personResults.status === "LoadingFirstPage" ? (
                  <LoadingSkeleton rows={3} />
                ) : (
                  <ul className="flex flex-col gap-2">
                    {personResults.results.map((person) => (
                      <li key={person._id}>
                        <button
                          className={cn(
                            "w-full rounded-xl text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            selectedPersonId === person._id && "ring-2 ring-primary",
                          )}
                          onClick={() => setSelectedPersonId(person._id)}
                          type="button"
                        >
                          <PersonCard
                            alertLevel={person.alert_level}
                            bairroNome={person.bairro_nome}
                            nome={person.nome_completo}
                            personId={person._id}
                            selectable
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
                  Cadastro rápido sem sair do fluxo de adoção.
                </p>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mini-tutor-nome">Nome completo</Label>
                  <Input
                    id="mini-tutor-nome"
                    onChange={(event) => setMiniPersonNome(event.target.value)}
                    value={miniPersonNome}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="mini-tutor-cpf">CPF</Label>
                  <Input
                    id="mini-tutor-cpf"
                    onChange={(event) => setMiniPersonCpf(maskCpf(event.target.value))}
                    placeholder="Opcional"
                    value={miniPersonCpf}
                  />
                </div>
                <BairroAutocomplete
                  initialLabel={miniPersonBairroLabel}
                  onChange={(id, label) => {
                    setMiniPersonBairroId(id);
                    setMiniPersonBairroLabel(label);
                  }}
                  value={miniPersonBairroId}
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
                <PersonAssessmentPanel
                  alert={evaluation.pessoa.alert}
                  bairroNome={evaluation.pessoa.bairro_nome}
                  pessoaNome={evaluation.pessoa.pessoa_nome}
                />
                {evaluation.bairro_warning.has_warning &&
                evaluation.bairro_warning.message ? (
                  <BairroWarningBanner message={evaluation.bairro_warning.message} />
                ) : null}
                <p className="text-sm text-muted-foreground">
                  Você pode continuar mesmo com alertas ou avisos de bairro.
                </p>
              </>
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="numero-termo">Número do termo de adoção</Label>
              <Input
                id="numero-termo"
                onChange={(event) => setNumeroTermo(event.target.value)}
                value={numeroTermo}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="data-adocao">Data da adoção</Label>
              <DatePicker
                id="data-adocao"
                onChange={setDataAdocao}
                value={dataAdocao}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="responsavel-ong">Responsável pela ONG</Label>
              <select
                className="flex h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
              <Label htmlFor="condicoes-adocao">Condições da adoção</Label>
              <textarea
                className="min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="condicoes-adocao"
                onChange={(event) => setCondicoes(event.target.value)}
                value={condicoes}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <PdfUpload
                label="Termo de adoção assinado (opcional)"
                onChange={(storageId) => setTermoStorageId(storageId)}
                storageId={termoStorageId}
              />
            </div>
            <div className="flex flex-col gap-2 md:col-span-2">
              <Label htmlFor="observacoes-adocao">Observações (opcional)</Label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                id="observacoes-adocao"
                onChange={(event) => setObservacoes(event.target.value)}
                value={observacoes}
              />
            </div>
            <label className="flex items-start gap-3 md:col-span-2">
              <input
                checked={confirmouDocumentos}
                className="mt-1 size-4 accent-primary"
                onChange={(event) => setConfirmouDocumentos(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm">Confirmo a entrega dos documentos ao tutor.</span>
            </label>
            <label className="flex items-start gap-3 md:col-span-2">
              <input
                checked={confirmouOrientacoes}
                className="mt-1 size-4 accent-primary"
                onChange={(event) => setConfirmouOrientacoes(event.target.checked)}
                type="checkbox"
              />
              <span className="text-sm">Confirmo as orientações de cuidado ao tutor.</span>
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-4 text-sm">
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h3 className="mb-2 font-semibold">Animal</h3>
              <p>{selectedDog?.nome}</p>
              <p className="text-muted-foreground">
                {selectedDog?.microchip ? formatMicrochip(selectedDog.microchip) : "Sem microchip"}
              </p>
            </div>
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h3 className="mb-2 font-semibold">Tutor</h3>
              <p>{evaluation?.pessoa.pessoa_nome}</p>
              {evaluation?.pessoa.bairro_nome ? (
                <p className="text-muted-foreground">{evaluation.pessoa.bairro_nome}</p>
              ) : null}
            </div>
            {evaluation?.bairro_warning.has_warning && evaluation.bairro_warning.message ? (
              <BairroWarningBanner message={evaluation.bairro_warning.message} />
            ) : null}
            {evaluation?.pessoa.alert ? (
              <PersonAssessmentPanel
                alert={evaluation.pessoa.alert}
                bairroNome={evaluation.pessoa.bairro_nome}
                pessoaNome={evaluation.pessoa.pessoa_nome}
              />
            ) : null}
            <div className="rounded-xl border bg-card p-4 shadow-xs">
              <h3 className="mb-2 font-semibold">Dados da adoção</h3>
              <p>Termo: {numeroTermo}</p>
              <p>Data: {formatDate(dateInputToTimestamp(dataAdocao) ?? now)}</p>
              <p>Condições: {condicoes}</p>
              {observacoes ? <p>Observações: {observacoes}</p> : null}
            </div>
          </div>
        ) : null}
      </StepperForm>
    </section>
  );
}
