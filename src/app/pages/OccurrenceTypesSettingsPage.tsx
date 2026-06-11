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
import { SEVERITY_LABELS } from "@/lib/domain-colors";

const CATEGORY_OPTIONS = [
  "rotina",
  "clinica",
  "risco",
  "legal",
  "adocao",
  "outro",
] as const;

const SEVERITY_OPTIONS = ["info", "baixa", "media", "alta"] as const;

export function OccurrenceTypesSettingsPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORY_OPTIONS)[number]>("rotina");
  const [requerFoto, setRequerFoto] = useState(false);
  const [gravidadePadrao, setGravidadePadrao] =
    useState<(typeof SEVERITY_OPTIONS)[number]>("info");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const types = useQuery(
    api.occurrenceTypes.list,
    can("occurrence_types.manage") ? { search: search || undefined } : "skip",
  );
  const createType = useMutation(api.occurrenceTypes.create);
  const setActive = useMutation(api.occurrenceTypes.setActive);

  if (!can("occurrence_types.manage")) {
    return <PermissionDenied />;
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError("Informe o nome do tipo.");
      return;
    }

    setSubmitting(true);
    try {
      await createType({
        nome: nome.trim(),
        categoria,
        requer_foto: requerFoto,
        gravidade_padrao: gravidadePadrao,
      });
      setNome("");
    } catch (createError) {
      setError(getErrorMessage(createError, "Não foi possível criar o tipo."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (typeId: Id<"occurrence_types">, ativo: boolean) => {
    setError(null);
    try {
      await setActive({ occurrenceTypeId: typeId, ativo: !ativo });
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, "Não foi possível atualizar o tipo."));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Catálogo de eventos do prontuário com permissão necessaria para criação."
        title="Tipos de ocorrência"
      />

      <form className="flex max-w-xl flex-col gap-3" onSubmit={handleCreate}>
        <h3 className="font-semibold">Novo tipo</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="type-nome">Nome</Label>
          <Input id="type-nome" onChange={(event) => setNome(event.target.value)} value={nome} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="type-category">Categoria</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="type-category"
              onChange={(event) =>
                setCategoria(event.target.value as (typeof CATEGORY_OPTIONS)[number])
              }
              value={categoria}
            >
              {CATEGORY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="type-severity">Gravidade padrao</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="type-severity"
              onChange={(event) =>
                setGravidadePadrao(event.target.value as (typeof SEVERITY_OPTIONS)[number])
              }
              value={gravidadePadrao}
            >
              {SEVERITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {SEVERITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm font-medium">
          <input
            checked={requerFoto}
            className="accent-primary"
            onChange={(event) => setRequerFoto(event.target.checked)}
            type="checkbox"
          />
          Exige foto
        </label>
        <Button className="min-h-11 w-fit" disabled={submitting} type="submit">
          {submitting ? "Salvando..." : "Criar tipo"}
        </Button>
      </form>

      <FilterBar className="border-t pt-5">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="type-search">Buscar</Label>
          <Input
            id="type-search"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </div>
      </FilterBar>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {types === undefined ? <LoadingSkeleton rows={4} /> : null}

      {types && types.length === 0 ? (
        <EmptyState description="Cadastre o primeiro tipo de ocorrência." title="Sem tipos" />
      ) : null}

      {types && types.length > 0 ? (
        <ul className="divide-y divide-border">
          {types.map((type) => (
            <li
              className="flex flex-col gap-3 py-3.5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              key={type._id}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{type.nome}</p>
                  <Badge variant="secondary">{type.categoria}</Badge>
                  <Badge variant="secondary">
                    {SEVERITY_LABELS[type.gravidade_padrao]}
                  </Badge>
                  <Badge
                    className={
                      type.ativo ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"
                    }
                    variant="secondary"
                  >
                    {type.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  {type.requer_foto ? <Badge variant="secondary">Exige foto</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  Permissão de criação: {type.required_permission}
                </p>
              </div>
              <Button
                onClick={() => toggleActive(type._id, type.ativo)}
                size="sm"
                type="button"
                variant="outline"
              >
                {type.ativo ? "Desativar" : "Ativar"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
