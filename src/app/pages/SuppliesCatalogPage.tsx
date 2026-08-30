import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  SUPPLY_CATEGORY_LABELS,
  type SupplyCategory,
} from "@/lib/domain-colors";
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
import { formatCurrency } from "@/lib/formatters";

const CATEGORY_OPTIONS = Object.keys(SUPPLY_CATEGORY_LABELS) as SupplyCategory[];

export function SuppliesCatalogPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<SupplyCategory>("medicamento");
  const [unidadeMedida, setUnidadeMedida] = useState("");
  const [valorPadrao, setValorPadrao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<Id<"supplies"> | null>(null);

  const supplies = useQuery(
    api.supplies.list,
    can("supplies.manage") ? { search: search || undefined } : "skip",
  );
  const createSupply = useMutation(api.supplies.create);
  const updateSupply = useMutation(api.supplies.update);
  const setActive = useMutation(api.supplies.setActive);

  if (!can("supplies.manage")) {
    return <PermissionDenied />;
  }

  const resetForm = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setCategoria("medicamento");
    setUnidadeMedida("");
    setValorPadrao("");
  };

  const startEdit = (supply: NonNullable<typeof supplies>[number]) => {
    setError(null);
    setEditingId(supply._id);
    setNome(supply.nome);
    setDescricao(supply.descricao ?? "");
    setCategoria(supply.categoria);
    setUnidadeMedida(supply.unidade_medida ?? "");
    setValorPadrao(String(supply.valor_padrao));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError("Informe o nome do insumo.");
      return;
    }

    const valor = Number(valorPadrao.replace(",", "."));
    if (!Number.isFinite(valor) || valor < 0) {
      setError("Informe um valor padrão válido.");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateSupply({
          supplyId: editingId,
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          categoria,
          unidade_medida: unidadeMedida.trim() || undefined,
          valor_padrao: valor,
        });
      } else {
        await createSupply({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          categoria,
          unidade_medida: unidadeMedida.trim() || undefined,
          valor_padrao: valor,
        });
      }
      resetForm();
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
          editingId ? "Não foi possível salvar o insumo." : "Não foi possível criar o insumo.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (supplyId: Id<"supplies">, ativo: boolean) => {
    setError(null);
    try {
      await setActive({ supplyId, ativo: !ativo });
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, "Não foi possível atualizar o insumo."));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Catálogo de medicamentos e materiais reutilizado nos atendimentos."
        title="Insumos"
      />

      <form className="flex max-w-xl flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
        <h3 className="font-semibold">{editingId ? "Editar insumo" : "Novo insumo"}</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="supply-nome">Nome</Label>
          <Input id="supply-nome" onChange={(event) => setNome(event.target.value)} value={nome} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="supply-descricao">Descrição (opcional)</Label>
          <Input
            id="supply-descricao"
            onChange={(event) => setDescricao(event.target.value)}
            value={descricao}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="supply-category">Categoria</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="supply-category"
              onChange={(event) =>
                setCategoria(event.target.value as SupplyCategory)
              }
              value={categoria}
            >
              {CATEGORY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {SUPPLY_CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="supply-unidade">Unidade de medida</Label>
            <Input
              id="supply-unidade"
              onChange={(event) => setUnidadeMedida(event.target.value)}
              placeholder="un., ml, comprimido..."
              value={unidadeMedida}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="supply-valor">Valor padrão (R$)</Label>
            <Input
              id="supply-valor"
              inputMode="decimal"
              onChange={(event) => setValorPadrao(event.target.value)}
              value={valorPadrao}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="min-h-11 w-fit" disabled={submitting} type="submit">
            {submitting ? "Salvando..." : editingId ? "Salvar alterações" : "Criar insumo"}
          </Button>
          {editingId ? (
            <Button
              className="min-h-11 w-fit"
              onClick={resetForm}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <FilterBar className="border-t pt-5">
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="supply-search">Buscar</Label>
          <Input
            id="supply-search"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </div>
      </FilterBar>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {supplies === undefined ? <LoadingSkeleton rows={4} /> : null}

      {supplies && supplies.length === 0 ? (
        <EmptyState description="Cadastre o primeiro insumo." title="Sem insumos" />
      ) : null}

      {supplies && supplies.length > 0 ? (
        <ul className="divide-y divide-border">
          {supplies.map((supply) => (
            <li
              className="flex flex-col gap-3 py-3.5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              key={supply._id}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{supply.nome}</p>
                  <Badge variant="secondary">{SUPPLY_CATEGORY_LABELS[supply.categoria]}</Badge>
                  {supply.unidade_medida ? (
                    <Badge variant="secondary">{supply.unidade_medida}</Badge>
                  ) : null}
                  <Badge variant="secondary">{formatCurrency(supply.valor_padrao)}</Badge>
                  <Badge
                    className={
                      supply.ativo
                        ? "bg-success/12 text-success"
                        : "bg-muted text-muted-foreground"
                    }
                    variant="secondary"
                  >
                    {supply.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {supply.descricao ? (
                  <p className="text-sm text-muted-foreground">{supply.descricao}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => startEdit(supply)} size="sm" type="button" variant="outline">
                  Editar
                </Button>
                <Button
                  onClick={() => void toggleActive(supply._id, supply.ativo)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {supply.ativo ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
