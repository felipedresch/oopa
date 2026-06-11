import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { DogCard } from "@/components/DogCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MicrochipCameraCapture } from "@/components/MicrochipCameraCapture";
import { MicrochipConfirmPanel } from "@/components/MicrochipConfirmPanel";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import { fileToBase64, normalizeOcrContentType } from "@/lib/ocr-client";
import { maskMicrochipInput } from "@/lib/masks";

type IdentifyStep = "idle" | "processing" | "confirm" | "searching";

export function IdentifyPage() {
  const navigate = useNavigate();
  const { can } = usePermissions();
  const extractMicrochip = useAction(api.ocr.extractMicrochip);
  const reportDogNotFound = useMutation(api.notifications.reportDogNotFound);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialChip = searchParams.get("microchip") ?? "";
  const [manualChip, setManualChip] = useState(maskMicrochipInput(initialChip));
  const [confirmChip, setConfirmChip] = useState(maskMicrochipInput(initialChip));
  const [submittedChip, setSubmittedChip] = useState(initialChip.replace(/\D/g, ""));
  const [queryNow, setQueryNow] = useState(() => Date.now());
  const [step, setStep] = useState<IdentifyStep>(initialChip ? "searching" : "idle");
  const [ocrWarning, setOcrWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const result = useQuery(
    api.dogs.findByMicrochip,
    can("dogs.read") && submittedChip.length === 15
      ? { microchip: submittedChip, now: queryNow }
      : "skip",
  );

  if (!can("dogs.read")) {
    return <PermissionDenied />;
  }

  const beginSearch = (digits: string) => {
    setSubmittedChip(digits);
    setQueryNow(Date.now());
    setSearchParams(digits ? { microchip: digits } : {});
    setStep("searching");
    setError(null);
  };

  const handleManualSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = manualChip.replace(/\D/g, "");
    if (digits.length !== 15) {
      setError("Informe os 15 digitos do microchip.");
      return;
    }
    setConfirmChip(maskMicrochipInput(digits));
    setOcrWarning(null);
    setStep("confirm");
  };

  const handleCapture = async (file: File) => {
    setError(null);
    setOcrWarning(null);
    setStep("processing");

    try {
      const contentType = normalizeOcrContentType(file);
      const imageBase64 = await fileToBase64(file);
      const ocrResult = await extractMicrochip({ imageBase64, contentType });

      if (ocrResult.candidate) {
        setConfirmChip(maskMicrochipInput(ocrResult.candidate));
        setManualChip(maskMicrochipInput(ocrResult.candidate));
      }

      if (ocrResult.needsManualReview) {
        setOcrWarning(
          ocrResult.candidate
            ? "Nao consegui ler com seguranca. Confira o numero antes de buscar."
            : "Nao consegui ler com seguranca. Informe o microchip manualmente.",
        );
      }

      setStep("confirm");
    } catch (cause) {
      setOcrWarning("Nao consegui ler com seguranca. Confira o numero ou digite manualmente.");
      setStep("confirm");
      setError(getErrorMessage(cause, "Falha ao processar a foto."));
    }
  };

  const handleConfirmSearch = () => {
    const digits = confirmChip.replace(/\D/g, "");
    if (digits.length !== 15) {
      setError("Informe os 15 digitos do microchip.");
      return;
    }
    setManualChip(maskMicrochipInput(digits));
    beginSearch(digits);
  };

  const handleReport = async () => {
    if (submittedChip.length !== 15) {
      return;
    }

    setReporting(true);
    setError(null);
    try {
      await reportDogNotFound({ microchip: submittedChip });
      setReported(true);
    } catch (cause) {
      setError(getErrorMessage(cause, "Nao foi possivel avisar a ONG."));
    } finally {
      setReporting(false);
    }
  };

  const showNotFound = step === "searching" && submittedChip.length === 15 && result === null;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Use a camera do leitor RFID ou digite os 15 digitos. A busca so ocorre apos confirmacao."
        title="Identificar cao"
      />

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {step === "processing" ? (
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-lg font-medium">Processando foto...</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Aguarde enquanto lemos o numero do leitor.
          </p>
          <div className="mt-4">
            <LoadingSkeleton rows={2} />
          </div>
        </div>
      ) : null}

      {step === "confirm" ? (
        <MicrochipConfirmPanel
          onCancel={() => {
            setStep("idle");
            setOcrWarning(null);
          }}
          onChange={setConfirmChip}
          onConfirm={handleConfirmSearch}
          value={confirmChip}
          warning={ocrWarning}
        />
      ) : null}

      <MicrochipCameraCapture disabled={step === "processing"} onCapture={(file) => void handleCapture(file)} />

      <form className="rounded-xl border bg-card p-4" onSubmit={handleManualSubmit}>
        <Label htmlFor="identify-microchip">Microchip manual</Label>
        <p className="mb-2 text-sm text-muted-foreground">
          O campo manual fica sempre disponivel para uso na rua.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            className="min-h-12 text-lg"
            id="identify-microchip"
            inputMode="numeric"
            onChange={(event) => setManualChip(maskMicrochipInput(event.target.value))}
            placeholder="000 000 000 000 000"
            value={manualChip}
          />
          <Button className="min-h-12 px-6 text-base" type="submit">
            Revisar numero
          </Button>
        </div>
      </form>

      {step === "searching" && submittedChip.length === 15 && result === undefined ? (
        <LoadingSkeleton rows={2} />
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3">
          <DogCard
            dogId={result._id}
            fotoUrl={result.foto_perfil_url}
            graveAlert={result.grave_alert}
            microchip={result.microchip}
            nome={result.nome}
            status={result.status_atual}
          />
          <Button asChild className="min-h-12 text-base">
            <Link to={`/dogs/${result._id}`}>Abrir ficha do cao</Link>
          </Button>
        </div>
      ) : null}

      {showNotFound ? (
        <EmptyState
          description="Nenhum cao foi encontrado com este microchip."
          title="Microchip nao encontrado"
        >
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {can("dogs.create") ? (
              <Button asChild className="min-h-12 text-base">
                <Link to={`/dogs/new?microchip=${submittedChip}`}>Cadastrar novo cao</Link>
              </Button>
            ) : (
              <Button
                className="min-h-12 text-base"
                disabled={reporting || reported}
                onClick={() => void handleReport()}
                type="button"
                variant="outline"
              >
                {reported ? "ONG avisada" : reporting ? "Enviando aviso..." : "Avisar a ONG"}
              </Button>
            )}
            {!can("dogs.create") && reported ? (
              <Button
                className="min-h-12 text-base"
                onClick={() => navigate("/notifications")}
                type="button"
              >
                Ver notificacoes
              </Button>
            ) : null}
          </div>
        </EmptyState>
      ) : null}
    </section>
  );
}
