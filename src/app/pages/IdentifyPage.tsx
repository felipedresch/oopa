import { useQuery } from "convex/react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { DogCard } from "@/components/DogCard";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { maskMicrochipInput } from "@/lib/masks";

export function IdentifyPage() {
  const { can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialChip = searchParams.get("microchip") ?? "";
  const [microchip, setMicrochip] = useState(maskMicrochipInput(initialChip));
  const [submittedChip, setSubmittedChip] = useState(initialChip.replace(/\D/g, ""));
  const [queryNow, setQueryNow] = useState(() => Date.now());

  const result = useQuery(
    api.dogs.findByMicrochip,
    can("dogs.read") && submittedChip.length === 15
      ? { microchip: submittedChip, now: queryNow }
      : "skip",
  );

  if (!can("dogs.read")) {
    return <PermissionDenied />;
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const digits = microchip.replace(/\D/g, "");
    setSubmittedChip(digits);
    setQueryNow(Date.now());
    setSearchParams(digits ? { microchip: digits } : {});
  };

  const showNotFound = submittedChip.length === 15 && result === null;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Informe os 15 digitos do microchip para localizar a ficha do cao."
        title="Identificar cao"
      />

      <form className="rounded-xl border bg-card p-4" onSubmit={handleSubmit}>
        <Label htmlFor="identify-microchip">Microchip</Label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            id="identify-microchip"
            inputMode="numeric"
            onChange={(event) => setMicrochip(maskMicrochipInput(event.target.value))}
            placeholder="000 000 000 000 000"
            value={microchip}
          />
          <Button className="min-h-11" type="submit">
            Buscar
          </Button>
        </div>
      </form>

      {submittedChip.length > 0 && submittedChip.length < 15 ? (
        <p className="text-sm text-destructive">Informe os 15 digitos do microchip.</p>
      ) : null}

      {submittedChip.length === 15 && result === undefined ? <LoadingSkeleton rows={2} /> : null}

      {result ? (
        <DogCard
          dogId={result._id}
          fotoUrl={result.foto_perfil_url}
          graveAlert={result.grave_alert}
          microchip={result.microchip}
          nome={result.nome}
          status={result.status_atual}
        />
      ) : null}

      {showNotFound ? (
        <EmptyState
          description="Nenhum cao foi encontrado com este microchip."
          title="Microchip nao encontrado"
        >
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            {can("dogs.create") ? (
              <Button asChild className="min-h-11">
                <Link to={`/dogs/new?microchip=${submittedChip}`}>Cadastrar novo cao</Link>
              </Button>
            ) : (
              <Button asChild className="min-h-11" variant="outline">
                <Link to="/notifications">Avisar a ONG</Link>
              </Button>
            )}
          </div>
        </EmptyState>
      ) : null}
    </section>
  );
}
