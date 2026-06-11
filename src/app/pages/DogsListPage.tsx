import { usePaginatedQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { DogCard } from "@/components/DogCard";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import type { DogStatus } from "@/lib/domain-colors";
import { DOG_STATUS_LABELS } from "@/lib/domain-colors";

const PORTE_OPTIONS = [
  { value: "", label: "Todos os portes" },
  { value: "pequeno", label: "Pequeno" },
  { value: "medio", label: "Medio" },
  { value: "grande", label: "Grande" },
] as const;

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  ...Object.entries(DOG_STATUS_LABELS).map(([value, label]) => ({ value, label })),
] as const;

export function DogsListPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DogStatus | "">("");
  const [porte, setPorte] = useState<"" | "pequeno" | "medio" | "grande">("");
  const [graveRecent, setGraveRecent] = useState(false);
  const [now] = useState(() => Date.now());

  const { results, status: paginationStatus, loadMore } = usePaginatedQuery(
    api.dogs.list,
    can("dogs.read")
      ? {
          search: search || undefined,
          status: status || undefined,
          porte: porte || undefined,
          graveRecent: graveRecent || undefined,
          now,
        }
      : "skip",
    { initialNumItems: 25 },
  );

  if (!can("dogs.read")) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("dogs.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/dogs/new">Novo cão</Link>
            </Button>
          ) : undefined
        }
        description="Filtre por status, porte e alertas recentes de ocorrências graves."
        title="Cães"
      />

      <FilterBar>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="dog-search">Busca</Label>
            <Input
              id="dog-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome ou microchip"
              value={search}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dog-status-filter">Status</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="dog-status-filter"
              onChange={(event) => setStatus(event.target.value as DogStatus | "")}
              value={status}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dog-porte-filter">Porte</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="dog-porte-filter"
              onChange={(event) =>
                setPorte(event.target.value as "" | "pequeno" | "medio" | "grande")
              }
              value={porte}
            >
              {PORTE_OPTIONS.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2.5 self-end rounded-lg border border-input bg-card px-3 text-sm font-medium transition-colors has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground">
            <input
              checked={graveRecent}
              className="accent-primary"
              onChange={(event) => setGraveRecent(event.target.checked)}
              type="checkbox"
            />
            Alerta grave (90 dias)
          </label>
        </div>
      </FilterBar>

      {results === undefined ? <LoadingSkeleton rows={4} /> : null}

      {results?.length === 0 ? (
        <EmptyState
          description="Ajuste os filtros ou cadastre um novo cão."
          title="Nenhum cão encontrado"
        />
      ) : null}

      <div className="grid gap-3">
        {results?.map((dog) => (
          <DogCard
            dogId={dog._id}
            fotoUrl={dog.foto_perfil_url}
            graveAlert={dog.grave_alert}
            key={dog._id}
            microchip={dog.microchip}
            nome={dog.nome}
            status={dog.status_atual}
          />
        ))}
      </div>

      {paginationStatus === "CanLoadMore" ? (
        <Button className="min-h-11 self-center" onClick={() => loadMore(12)} type="button">
          Carregar mais
        </Button>
      ) : null}
    </section>
  );
}
