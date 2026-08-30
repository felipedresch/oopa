import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangleIcon,
  ClockIcon,
  EyeOffIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MultiPhotoUpload } from "@/components/MultiPhotoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/auth-errors";
import { PUBLIC_REPORT_TIPO_LABELS } from "@/lib/domain-colors";
import { cn } from "@/lib/utils";
import { validateRequired } from "@/lib/validations";

/** Fonte unica com a triagem interna, para os rotulos nao divergirem. */
const TIPO_DENUNCIA_OPTIONS = Object.entries(PUBLIC_REPORT_TIPO_LABELS).map(
  ([value, label]) => ({ value, label }),
);

/** Ajuda o denunciante a escolher sem precisar adivinhar o que cada tipo cobre. */
const TIPO_DENUNCIA_HINTS: Record<string, string> = {
  maus_tratos: "Agressão, corrente curta, sem água, sem comida",
  animal_ferido: "Precisa de socorro agora",
  abandono: "Deixado na rua ou em imóvel vazio",
  acumulo_animais: "Muitos animais sem condições",
  outro: "Não se encaixa nos anteriores",
};

const DESCRICAO_MIN = 20;

type UploadedPhoto = {
  storageId: Id<"_storage">;
  previewUrl: string;
};

function TrustItem({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <li className="flex items-start gap-2">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function FormSection({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary"
        >
          {step}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

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

  const descricaoLength = descricao.trim().length;
  const canSubmit = Boolean(tipoDenuncia && descricaoLength > 0);
  const descricaoCurta = descricaoLength > 0 && descricaoLength < DESCRICAO_MIN;

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
          Denúncia de maus-tratos ou abandono
        </h1>
        <p className="max-w-prose leading-6 text-muted-foreground">
          Conte o que você viu. Quanto mais detalhes sobre o animal e o local, mais rápido
          a equipe consegue chegar até ele.
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-3">
          <TrustItem icon={EyeOffIcon}>Pode ser anônima</TrustItem>
          <TrustItem icon={ClockIcon}>Leva cerca de 2 minutos</TrustItem>
          <TrustItem icon={ShieldCheckIcon}>Seus dados não são publicados</TrustItem>
        </ul>
      </div>

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <FormSection
          description="Escolha o que mais se aproxima e descreva a situação."
          step={1}
          title="O que está acontecendo"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Tipo de denúncia</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPO_DENUNCIA_OPTIONS.map((option) => {
                const selected = tipoDenuncia === option.value;
                return (
                  <label
                    className={cn(
                      "grid cursor-pointer grid-cols-[auto_1fr] items-start gap-x-3 rounded-lg border p-3 transition-colors",
                      selected
                        ? "border-primary bg-primary/8"
                        : "border-input bg-card hover:border-ring/40 hover:bg-accent/30",
                    )}
                    key={option.value}
                  >
                    <input
                      checked={selected}
                      className="row-span-2 mt-1 size-4 shrink-0 accent-[var(--primary)]"
                      name="tipo-denuncia"
                      onChange={() => setTipoDenuncia(option.value)}
                      type="radio"
                      value={option.value}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="col-start-2 text-xs leading-5 text-muted-foreground">
                      {TIPO_DENUNCIA_HINTS[option.value]}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <Label htmlFor="report-descricao">O que você viu</Label>
            <textarea
              aria-describedby="report-descricao-hint"
              className="min-h-32 rounded-lg border border-input bg-card px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="report-descricao"
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Ex.: cachorro caramelo preso em corrente curta no quintal, sem água nem sombra, latindo há três dias."
              required
              value={descricao}
            />
            <p
              className={cn(
                "text-xs leading-5",
                descricaoCurta ? "text-warning" : "text-muted-foreground",
              )}
              id="report-descricao-hint"
            >
              {descricaoCurta
                ? "Tente descrever também o animal, o estado dele e há quanto tempo."
                : "Descreva o animal, o estado dele e há quanto tempo a situação acontece."}
            </p>
          </div>

          <MultiPhotoUpload
            label="Fotos (opcional)"
            onChange={setPhotos}
            photos={photos}
            uploadUrlMutation={api.publicReports.createUploadUrl}
          />
        </FormSection>

        <FormSection
          description="Sem endereço fica difícil encontrar o animal. Qualquer referência ajuda."
          step={2}
          title="Onde foi"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-bairro">Bairro</Label>
              <Select
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
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="report-local">Endereço ou ponto de referência</Label>
              <Input
                id="report-local"
                onChange={(event) => setLocalDescricao(event.target.value)}
                placeholder="Ex.: Rua das Flores, casa amarela ao lado do mercado"
                value={localDescricao}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          description="Só usamos para tirar dúvidas sobre a denúncia. Pode deixar em branco."
          step={3}
          title="Como falar com você (opcional)"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="report-nome">Seu nome</Label>
              <Input
                autoComplete="name"
                id="report-nome"
                onChange={(event) => setNomeDenunciante(event.target.value)}
                placeholder="Opcional"
                value={nomeDenunciante}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="report-contato">Telefone ou email</Label>
              <Input
                id="report-contato"
                onChange={(event) => setContato(event.target.value)}
                placeholder="Opcional"
                value={contato}
              />
            </div>
          </div>
        </FormSection>

        {error ? (
          <p
            className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            role="alert"
          >
            <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <Button className="min-h-12 w-full text-base" disabled={!canSubmit || submitting} type="submit">
            {submitting ? "Enviando..." : "Enviar denúncia"}
          </Button>
          <p aria-live="polite" className="text-center text-xs text-muted-foreground">
            {canSubmit
              ? "Você recebe um número de protocolo ao enviar."
              : "Descreva o que você viu para enviar a denúncia."}
          </p>
        </div>
      </form>
    </div>
  );
}
