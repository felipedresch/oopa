import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { useDirtyFormGuard } from "@/hooks/useDirtyFormGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { fetchAddressByCep, normalizeBairroName } from "@/lib/cep";
import { maskCep, maskCpf, maskPhone, maskRg } from "@/lib/masks";
import {
  normalizeRg,
  validateCep,
  validateCpf,
  validateEmail,
  validatePhone,
  validateRequired,
  validateRg,
} from "@/lib/validations";

/** Aplica um validador apenas quando o campo está preenchido (campos opcionais). */
function optional(validate: (value: string) => string | null) {
  return (value: string) => (value.trim() ? validate(value) : null);
}

export function TutorFormPage() {
  const { tutorId } = useParams();
  const isEdit = Boolean(tutorId);
  const { can } = usePermissions();

  const existing = useQuery(
    api.tutors.get,
    isEdit && tutorId && can("tutors.read") ? { tutorId: tutorId as Id<"tutors"> } : "skip",
  );

  const allowed = isEdit ? can("tutors.edit") : can("tutors.create");
  if (!allowed) {
    return <PermissionDenied />;
  }

  if (isEdit && existing === undefined) {
    return <LoadingSkeleton rows={5} />;
  }

  if (isEdit && !existing) {
    return <PermissionDenied message="Tutor não encontrado." />;
  }

  return (
    <TutorFormContent
      initial={isEdit && existing ? existing : null}
      isEdit={isEdit}
      key={isEdit && existing ? existing._id : "new"}
      tutorId={tutorId}
    />
  );
}

type TutorFormContentProps = {
  tutorId?: string;
  isEdit: boolean;
  initial: {
    _id: Id<"tutors">;
    nome_completo: string;
    bairro: { _id: Id<"bairros">; nome: string } | null;
    sensitive?: {
      cpf?: string;
      rg?: string;
      telefone?: string;
      email?: string;
      endereco_logradouro?: string;
      endereco_numero?: string;
      endereco_complemento?: string;
      endereco_cep?: string;
      data_nascimento?: number;
      observacoes?: string;
    };
  } | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

function TutorFormContent({ tutorId, isEdit, initial }: TutorFormContentProps) {
  const navigate = useNavigate();
  const createTutor = useMutation(api.tutors.create);
  const updateTutor = useMutation(api.tutors.update);
  const sensitive = initial?.sensitive;

  // Lista de bairros para casar o retorno do ViaCEP (Alegrete tem ~48).
  const bairroOptions = useQuery(api.bairros.search, { limit: 50 });

  const [nome, setNome] = useState(initial?.nome_completo ?? "");
  const [cpf, setCpf] = useState(sensitive?.cpf ? maskCpf(sensitive.cpf) : "");
  const [rg, setRg] = useState(sensitive?.rg ?? "");
  const [telefone, setTelefone] = useState(
    sensitive?.telefone ? maskPhone(sensitive.telefone) : "",
  );
  const [email, setEmail] = useState(sensitive?.email ?? "");
  const [logradouro, setLogradouro] = useState(sensitive?.endereco_logradouro ?? "");
  const [numero, setNumero] = useState(sensitive?.endereco_numero ?? "");
  const [complemento, setComplemento] = useState(sensitive?.endereco_complemento ?? "");
  const [cep, setCep] = useState(sensitive?.endereco_cep ? maskCep(sensitive.endereco_cep) : "");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | undefined>(initial?.bairro?._id);
  const [bairroLabel, setBairroLabel] = useState(initial?.bairro?.nome ?? "");
  const [dataNascimento, setDataNascimento] = useState(
    sensitive?.data_nascimento
      ? new Date(sensitive.data_nascimento).toISOString().slice(0, 10)
      : "",
  );
  const [observacoes, setObservacoes] = useState(sensitive?.observacoes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const lastLookedUpCep = useRef<string | null>(null);

  const { blocker, allowNavigation } = useDirtyFormGuard(isDirty);

  // Checagem ao vivo de CPF/RG já cadastrados enquanto o usuário digita.
  const cpfDigits = cpf.replace(/\D/g, "");
  const rgNormalized = normalizeRg(rg);
  const cpfReady = cpfDigits.length === 11 && !validateCpf(cpf);
  const rgReady = rgNormalized.length >= 5 && rgNormalized.length <= 9;
  const duplicateCheck = useQuery(
    api.tutors.checkDuplicate,
    cpfReady || rgReady
      ? {
          cpf: cpfReady ? cpfDigits : undefined,
          rg: rgReady ? rgNormalized : undefined,
          excludeTutorId: isEdit && tutorId ? (tutorId as Id<"tutors">) : undefined,
        }
      : "skip",
  );
  const cpfTaken = cpfReady && (duplicateCheck?.cpf.exists ?? false);
  const rgTaken = rgReady && (duplicateCheck?.rg.exists ?? false);

  const cepDigits = cep.replace(/\D/g, "");

  // Busca ViaCEP ao completar 8 dígitos e autopreenche o endereço.
  useEffect(() => {
    if (cepDigits.length !== 8) {
      lastLookedUpCep.current = null;
      return;
    }
    if (lastLookedUpCep.current === cepDigits) {
      return;
    }
    lastLookedUpCep.current = cepDigits;

    let cancelled = false;
    setCepLoading(true);
    setCepError(null);

    fetchAddressByCep(cepDigits)
      .then((address) => {
        if (cancelled) {
          return;
        }
        if (!address) {
          setCepError("CEP não encontrado.");
          return;
        }
        if (address.logradouro) {
          setLogradouro(address.logradouro);
        }
        if (address.complemento) {
          setComplemento(address.complemento);
        }
        if (address.bairro && bairroOptions) {
          const target = normalizeBairroName(address.bairro);
          const match = bairroOptions.find(
            (option) => normalizeBairroName(option.nome) === target,
          );
          if (match) {
            setBairroId(match._id);
            setBairroLabel(match.nome);
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCepError("Não foi possível consultar o CEP agora.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCepLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cepDigits, bairroOptions]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const checks = [
      validateRequired(nome),
      cpf ? validateCpf(cpf) : null,
      telefone ? validatePhone(telefone) : null,
      email ? validateEmail(email) : null,
      cep ? validateCep(cep) : null,
    ];
    const firstError = checks.find((message) => message);
    if (firstError) {
      setError(firstError);
      return;
    }

    if (cpfTaken) {
      setError("Já existe um tutor com este CPF.");
      return;
    }
    if (rgTaken) {
      setError("Já existe um tutor com este RG.");
      return;
    }

    const payload = {
      nome_completo: nome.trim(),
      cpf: cpf || undefined,
      rg: rg || undefined,
      telefone: telefone || undefined,
      email: email || undefined,
      endereco_logradouro: logradouro || undefined,
      endereco_numero: numero || undefined,
      endereco_complemento: complemento || undefined,
      endereco_cep: cep || undefined,
      bairro_id: bairroId,
      data_nascimento: dataNascimento
        ? Date.parse(`${dataNascimento}T12:00:00.000Z`)
        : undefined,
      observacoes: observacoes || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit && tutorId) {
        await updateTutor({
          tutorId: tutorId as Id<"tutors">,
          ...payload,
        });
        setIsDirty(false);
        allowNavigation();
        void navigate(`/tutors/${tutorId}`);
      } else {
        const createdId = await createTutor(payload);
        setIsDirty(false);
        allowNavigation();
        void navigate(`/tutors/${createdId}`);
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar o tutor."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={isEdit ? "Atualize os dados do tutor." : "Cadastre um novo tutor."}
        title={isEdit ? "Editar tutor" : "Novo tutor"}
      />

      <form
        className="flex max-w-2xl flex-col gap-5"
        onChange={() => setIsDirty(true)}
        onSubmit={handleSubmit}
      >
        <Section title="Identificação">
          <Field
            id="nome"
            label="Nome completo"
            onChange={setNome}
            required
            validate={validateRequired}
            value={nome}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Field
                hint={cpfTaken && duplicateCheck?.cpf.nome ? undefined : "Somente números."}
                id="cpf"
                inputMode="numeric"
                label="CPF"
                mask={maskCpf}
                onChange={setCpf}
                validate={optional(validateCpf)}
                value={cpf}
              />
              {cpfTaken ? (
                <p className="text-sm text-destructive">
                  Já existe um tutor com este CPF
                  {duplicateCheck?.cpf.nome ? `: ${duplicateCheck.cpf.nome}` : ""}.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Field
                id="rg"
                inputMode="numeric"
                label="RG"
                mask={maskRg}
                onChange={setRg}
                validate={optional(validateRg)}
                value={rg}
              />
              {rgTaken ? (
                <p className="text-sm text-destructive">
                  Já existe um tutor com este RG
                  {duplicateCheck?.rg.nome ? `: ${duplicateCheck.rg.nome}` : ""}.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="data-nascimento">Data de nascimento</Label>
            <DatePicker
              id="data-nascimento"
              onChange={(value) => {
                setDataNascimento(value);
                setIsDirty(true);
              }}
              toDate={new Date()}
              value={dataNascimento}
            />
          </div>
        </Section>

        <Section title="Contato">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="telefone"
              inputMode="tel"
              label="Telefone"
              mask={maskPhone}
              onChange={setTelefone}
              validate={optional(validatePhone)}
              value={telefone}
            />
            <Field
              id="email"
              label="Email"
              onChange={setEmail}
              type="email"
              validate={optional(validateEmail)}
              value={email}
            />
          </div>
        </Section>

        <Section title="Endereço">
          <div className="flex flex-col gap-2">
            <Field
              hint={cepLoading ? "Buscando endereço…" : "Digite o CEP para preencher o endereço."}
              id="cep"
              inputMode="numeric"
              label="CEP"
              mask={maskCep}
              onChange={(value) => {
                setCep(value);
                setCepError(null);
              }}
              validate={optional(validateCep)}
              value={cep}
            />
            {cepError ? <p className="text-sm text-destructive">{cepError}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field
              id="logradouro"
              label="Logradouro"
              onChange={setLogradouro}
              value={logradouro}
            />
            <Field id="numero" label="Número" onChange={setNumero} value={numero} />
          </div>

          <Field
            id="complemento"
            label="Complemento"
            onChange={setComplemento}
            value={complemento}
          />

          <BairroAutocomplete
            initialLabel={bairroLabel}
            key={bairroLabel || "empty-bairro"}
            onChange={(id, label) => {
              setBairroId(id);
              setBairroLabel(label);
            }}
            value={bairroId}
          />
        </Section>

        <Section title="Observações">
          <div className="flex flex-col gap-2">
            <Label htmlFor="observacoes">Anotações livres</Label>
            <textarea
              className="min-h-24 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="observacoes"
              onChange={(event) => setObservacoes(event.target.value)}
              value={observacoes}
            />
          </div>
        </Section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11"
            disabled={submitting || cpfTaken || rgTaken}
            type="submit"
          >
            {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar tutor"}
          </Button>
          <Button asChild className="min-h-11" type="button" variant="outline">
            <Link to={isEdit && tutorId ? `/tutors/${tutorId}` : "/tutors"}>Cancelar</Link>
          </Button>
        </div>
      </form>
      <UnsavedChangesDialog blocker={blocker} />
    </section>
  );
}
