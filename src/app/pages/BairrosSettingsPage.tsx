import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { FilterBar } from "@/components/FilterBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";

export function BairrosSettingsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const bairros = useQuery(
    api.bairros.list,
    can("bairros.manage") ? { search: search || undefined } : "skip",
  );
  const createBairro = useMutation(api.bairros.create);
  const setActive = useMutation(api.bairros.setActive);

  if (!can("bairros.manage")) {
    return <PermissionDenied />;
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError("Informe o nome do bairro.");
      return;
    }

    setSubmitting(true);
    try {
      await createBairro({ nome: nome.trim() });
      setNome("");
    } catch (createError) {
      setError(getErrorMessage(createError, "Nao foi possivel criar o bairro."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (bairroId: Id<"bairros">, ativo: boolean) => {
    setError(null);
    try {
      await setActive({ bairroId, ativo: !ativo });
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, "Nao foi possivel atualizar o bairro."));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Cadastre bairros para tutores e ocorrencias. Desative em vez de excluir."
        title="Bairros"
      />

      <form className="flex max-w-xl flex-col gap-3 rounded-xl border p-4" onSubmit={handleCreate}>
        <h3 className="font-medium">Novo bairro</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bairro-nome">Nome</Label>
          <Input
            id="bairro-nome"
            onChange={(event) => setNome(event.target.value)}
            placeholder="Ex.: Jardim Primavera"
            value={nome}
          />
        </div>
        <Button className="min-h-11 w-fit" disabled={submitting} type="submit">
          {submitting ? "Salvando..." : "Criar bairro"}
        </Button>
      </form>

      <FilterBar>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="bairro-search">Buscar</Label>
          <Input
            id="bairro-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar bairros"
            value={search}
          />
        </div>
      </FilterBar>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {bairros === undefined ? <LoadingSkeleton rows={4} /> : null}

      {bairros && bairros.length === 0 ? (
        <EmptyState
          description="Cadastre o primeiro bairro para usar nos formularios de tutor."
          title="Nenhum bairro"
        />
      ) : null}

      {bairros && bairros.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {bairros.map((bairro) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
              key={bairro._id}
            >
              <div className="flex items-center gap-2">
                <p className="font-medium">{bairro.nome}</p>
                <Badge variant="outline">{bairro.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
              <Button
                className="min-h-11"
                onClick={() => toggleActive(bairro._id, bairro.ativo)}
                type="button"
                variant="outline"
              >
                {bairro.ativo ? "Desativar" : "Ativar"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
