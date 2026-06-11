import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDirtyFormGuard } from "@/hooks/useDirtyFormGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { maskCep, maskCpf, maskPhone } from "@/lib/masks";
import {
  validateCep,
  validateCpf,
  validateEmail,
  validatePhone,
  validateRequired,
} from "@/lib/validations";

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

function TutorFormContent({ tutorId, isEdit, initial }: TutorFormContentProps) {
  const navigate = useNavigate();
  const createTutor = useMutation(api.tutors.create);
  const updateTutor = useMutation(api.tutors.update);
  const sensitive = initial?.sensitive;

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

  const blocker = useDirtyFormGuard(isDirty);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const nomeError = validateRequired(nome);
    if (nomeError) {
      setError(nomeError);
      return;
    }

    if (cpf) {
      const cpfError = validateCpf(cpf);
      if (cpfError) {
        setError(cpfError);
        return;
      }
    }

    if (telefone) {
      const phoneError = validatePhone(telefone);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    }

    if (email) {
      const emailError = validateEmail(email);
      if (emailError) {
        setError(emailError);
        return;
      }
    }

    if (cep) {
      const cepError = validateCep(cep);
      if (cepError) {
        setError(cepError);
        return;
      }
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
        void navigate(`/tutors/${tutorId}`);
      } else {
        const createdId = await createTutor(payload);
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
        className="flex max-w-2xl flex-col gap-4"
        onChange={() => setIsDirty(true)}
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input
            id="nome"
            onChange={(event) => setNome(event.target.value)}
            required
            value={nome}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              onChange={(event) => setCpf(maskCpf(event.target.value))}
              value={cpf}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rg">RG</Label>
            <Input id="rg" onChange={(event) => setRg(event.target.value)} value={rg} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              onChange={(event) => setTelefone(maskPhone(event.target.value))}
              value={telefone}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input
              id="logradouro"
              onChange={(event) => setLogradouro(event.target.value)}
              value={logradouro}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="numero">Numero</Label>
            <Input id="numero" onChange={(event) => setNumero(event.target.value)} value={numero} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              onChange={(event) => setComplemento(event.target.value)}
              value={complemento}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cep">CEP</Label>
            <Input
              id="cep"
              onChange={(event) => setCep(maskCep(event.target.value))}
              value={cep}
            />
          </div>
        </div>

        <BairroAutocomplete
          initialLabel={bairroLabel}
          key={bairroLabel || "empty-bairro"}
          onChange={(id, label) => {
            setBairroId(id);
            setBairroLabel(label);
          }}
          value={bairroId}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="data-nascimento">Data de nascimento</Label>
          <Input
            id="data-nascimento"
            onChange={(event) => setDataNascimento(event.target.value)}
            type="date"
            value={dataNascimento}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="observacoes">Observações</Label>
          <textarea
            className="min-h-24 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="observacoes"
            onChange={(event) => setObservacoes(event.target.value)}
            value={observacoes}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11" disabled={submitting} type="submit">
            {submitting ? "Salvando..." : isEdit ? "Salvar alteracoes" : "Cadastrar tutor"}
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
