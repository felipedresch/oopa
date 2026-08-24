import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PersonCard } from "@/components/PersonCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";

export function PeopleListPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | "">("");

  const bairros = useQuery(api.bairros.search, can("people.read") ? { limit: 50 } : "skip");

  const { results, status, loadMore } = usePaginatedQuery(
    api.people.list,
    can("people.read")
      ? {
          search: search || undefined,
          bairro_id: bairroId || undefined,
        }
      : "skip",
    { initialNumItems: 25 },
  );

  if (!can("people.read")) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("people.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/people/new">Nova pessoa</Link>
            </Button>
          ) : null
        }
        description="Consulte pessoas, bairros e alertas derivados de ocorrências."
        title="Pessoas"
      />

      <FilterBar>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="person-search">Buscar por nome{can("people.read_sensitive") ? " ou CPF" : ""}</Label>
          <Input
            id="person-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite para buscar"
            value={search}
          />
        </div>

        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="person-bairro">Bairro</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="person-bairro"
            onChange={(event) => setBairroId(event.target.value as Id<"bairros"> | "")}
            value={bairroId}
          >
            <option value="">Todos os bairros</option>
            {bairros?.map((bairro) => (
              <option key={bairro._id} value={bairro._id}>
                {bairro.nome}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {results === undefined ? <LoadingSkeleton rows={4} /> : null}

      {results && results.length === 0 ? (
        <EmptyState
          description="Nenhuma pessoa encontrada com os filtros atuais."
          title="Sem pessoas"
        >
          {can("people.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/people/new">Cadastrar pessoa</Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : null}

      {results && results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.map((person) => (
            <PersonCard
              alertLevel={person.alert_level}
              bairroNome={person.bairro_nome}
              key={person._id}
              nome={person.nome_completo}
              personId={person._id}
            />
          ))}

          {status === "CanLoadMore" ? (
            <Button className="min-h-11" onClick={() => loadMore(20)} type="button" variant="outline">
              Carregar mais
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
