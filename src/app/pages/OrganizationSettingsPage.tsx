import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BairroAutocomplete } from "@/components/BairroAutocomplete";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useDirtyFormGuard } from "@/hooks/useDirtyFormGuard";
import { UnsavedChangesDialog } from "@/components/UnsavedChangesDialog";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { fetchAddressByCep, normalizeBairroName } from "@/lib/cep";
import { maskCep, maskCnpj, maskPhone } from "@/lib/masks";
import {
  validateCep,
  validateCnpj,
  validateEmail,
  validatePhone,
  validateRequired,
} from "@/lib/validations";

/** Aplica um validador apenas quando o campo está preenchido (campos opcionais). */
function optional(validate: (value: string) => string | null) {
  return (value: string) => (value.trim() ? validate(value) : null);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function OrganizationSettingsPage() {
  const { can } = usePermissions();
  const canManage = can("organization.manage");

  const settings = useQuery(api.organization.get, canManage ? {} : "skip");

  if (!canManage) {
    return <PermissionDenied />;
  }

  if (settings === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  return <OrganizationSettingsForm initial={settings} key={settings?._id ?? "new"} />;
}

type OrganizationSettingsFormProps = {
  initial: {
    _id: Id<"organization_settings">;
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    inscricao_estadual?: string;
    endereco_logradouro?: string;
    endereco_numero?: string;
    endereco_complemento?: string;
    endereco_cep?: string;
    bairro_id?: Id<"bairros">;
    bairro_nome: string | null;
    telefone?: string;
    email?: string;
    logo_url: string | null;
  } | null;
};

function OrganizationSettingsForm({ initial }: OrganizationSettingsFormProps) {
  const updateOrganization = useMutation(api.organization.update);
  const bairroOptions = useQuery(api.bairros.search, { limit: 50 });

  const [razaoSocial, setRazaoSocial] = useState(initial?.razao_social ?? "");
  const [nomeFantasia, setNomeFantasia] = useState(initial?.nome_fantasia ?? "");
  const [cnpj, setCnpj] = useState(initial?.cnpj ? maskCnpj(initial.cnpj) : "");
  const [inscricaoEstadual, setInscricaoEstadual] = useState(initial?.inscricao_estadual ?? "");
  const [telefone, setTelefone] = useState(
    initial?.telefone ? maskPhone(initial.telefone) : "",
  );
  const [email, setEmail] = useState(initial?.email ?? "");
  const [logradouro, setLogradouro] = useState(initial?.endereco_logradouro ?? "");
  const [numero, setNumero] = useState(initial?.endereco_numero ?? "");
  const [complemento, setComplemento] = useState(initial?.endereco_complemento ?? "");
  const [cep, setCep] = useState(initial?.endereco_cep ? maskCep(initial.endereco_cep) : "");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | undefined>(initial?.bairro_id);
  const [bairroLabel, setBairroLabel] = useState(initial?.bairro_nome ?? "");
  const [logoStorageId, setLogoStorageId] = useState<Id<"_storage"> | undefined>();
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(initial?.logo_url ?? null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const lastLookedUpCep = useRef<string | null>(null);

  const { blocker, allowNavigation } = useDirtyFormGuard(isDirty);

  const cepDigits = cep.replace(/\D/g, "");

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
    setSaved(false);

    const checks = [
      validateRequired(razaoSocial),
      validateCnpj(cnpj),
      telefone ? validatePhone(telefone) : null,
      email ? validateEmail(email) : null,
      cep ? validateCep(cep) : null,
    ];
    const firstError = checks.find((message) => message);
    if (firstError) {
      setError(firstError);
      return;
    }

    setSubmitting(true);
    try {
      await updateOrganization({
        razao_social: razaoSocial.trim(),
        nome_fantasia: nomeFantasia || undefined,
        cnpj,
        inscricao_estadual: inscricaoEstadual || undefined,
        endereco_logradouro: logradouro || undefined,
        endereco_numero: numero || undefined,
        endereco_complemento: complemento || undefined,
        endereco_cep: cep || undefined,
        bairro_id: bairroId,
        telefone: telefone || undefined,
        email: email || undefined,
        logo_storage_id: logoStorageId ?? undefined,
      });
      setIsDirty(false);
      allowNavigation();
      setSaved(true);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar os dados da ONG."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Dados institucionais usados em comprovantes e documentos da ONG."
        title="Dados da ONG"
      />

      <form
        className="flex max-w-2xl flex-col gap-5"
        onChange={() => setIsDirty(true)}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <Section title="Identificação">
          <Field
            id="razao-social"
            label="Razão social"
            onChange={setRazaoSocial}
            required
            validate={validateRequired}
            value={razaoSocial}
          />
          <Field
            id="nome-fantasia"
            label="Nome fantasia"
            onChange={setNomeFantasia}
            value={nomeFantasia}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="cnpj"
              inputMode="numeric"
              label="CNPJ"
              mask={maskCnpj}
              onChange={setCnpj}
              required
              validate={validateCnpj}
              value={cnpj}
            />
            <Field
              id="inscricao-estadual"
              label="Inscrição estadual"
              onChange={setInscricaoEstadual}
              value={inscricaoEstadual}
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

        <Section title="Logo">
          <PhotoUpload
            label="Logo da ONG"
            onChange={(storageId, previewUrl) => {
              setLogoStorageId(storageId);
              setLogoPreviewUrl(previewUrl);
              setIsDirty(true);
            }}
            previewUrl={logoPreviewUrl}
            storageId={logoStorageId}
          />
        </Section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {saved ? <p className="text-sm text-success">Dados da ONG salvos.</p> : null}

        <Button className="min-h-11 self-start" disabled={submitting} type="submit">
          {submitting ? "Salvando..." : "Salvar dados da ONG"}
        </Button>
      </form>
      <UnsavedChangesDialog blocker={blocker} />
    </section>
  );
}
