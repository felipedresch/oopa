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
import { TutorCard } from "@/components/TutorCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";

export function TutorsListPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [bairroId, setBairroId] = useState<Id<"bairros"> | "">("");

  const bairros = useQuery(api.bairros.search, can("tutors.read") ? { limit: 50 } : "skip");

  const { results, status, loadMore } = usePaginatedQuery(
    api.tutors.list,
    can("tutors.read")
      ? {
          search: search || undefined,
          bairro_id: bairroId || undefined,
        }
      : "skip",
    { initialNumItems: 25 },
  );

  if (!can("tutors.read")) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("tutors.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/tutors/new">Novo tutor</Link>
            </Button>
          ) : null
        }
        description="Consulte tutores, bairros e alertas derivados de ocorrências."
        title="Tutores"
      />

      <FilterBar>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="tutor-search">Buscar por nome{can("tutors.read_sensitive") ? " ou CPF" : ""}</Label>
          <Input
            id="tutor-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Digite para buscar"
            value={search}
          />
        </div>

        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="tutor-bairro">Bairro</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="tutor-bairro"
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
          description="Nenhum tutor encontrado com os filtros atuais."
          title="Sem tutores"
        >
          {can("tutors.create") ? (
            <Button asChild className="min-h-11">
              <Link to="/tutors/new">Cadastrar tutor</Link>
            </Button>
          ) : null}
        </EmptyState>
      ) : null}

      {results && results.length > 0 ? (
        <div className="flex flex-col gap-3">
          {results.map((tutor) => (
            <TutorCard
              alertLevel={tutor.alert_level}
              bairroNome={tutor.bairro_nome}
              key={tutor._id}
              nome={tutor.nome_completo}
              tutorId={tutor._id}
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
