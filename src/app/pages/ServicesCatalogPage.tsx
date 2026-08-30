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
import { formatCurrency } from "@/lib/formatters";

const CATEGORY_OPTIONS = ["consulta", "vacina", "cirurgia", "castracao", "exame", "outro"] as const;

export function ServicesCatalogPage() {
  const { can } = usePermissions();
  const [search, setSearch] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<(typeof CATEGORY_OPTIONS)[number]>("consulta");
  const [valorPadrao, setValorPadrao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<Id<"services"> | null>(null);

  const services = useQuery(
    api.services.list,
    can("services.manage") ? { search: search || undefined } : "skip",
  );
  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const setActive = useMutation(api.services.setActive);

  if (!can("services.manage")) {
    return <PermissionDenied />;
  }

  const resetForm = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setCategoria("consulta");
    setValorPadrao("");
  };

  const startEdit = (service: NonNullable<typeof services>[number]) => {
    setError(null);
    setEditingId(service._id);
    setNome(service.nome);
    setDescricao(service.descricao ?? "");
    setCategoria(service.categoria);
    setValorPadrao(String(service.valor_padrao));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!nome.trim()) {
      setError("Informe o nome do serviço.");
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
        await updateService({
          serviceId: editingId,
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          categoria,
          valor_padrao: valor,
        });
      } else {
        await createService({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          categoria,
          valor_padrao: valor,
        });
      }
      resetForm();
    } catch (submitError) {
      setError(
        getErrorMessage(
          submitError,
          editingId ? "Não foi possível salvar o serviço." : "Não foi possível criar o serviço.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (serviceId: Id<"services">, ativo: boolean) => {
    setError(null);
    try {
      await setActive({ serviceId, ativo: !ativo });
    } catch (toggleError) {
      setError(getErrorMessage(toggleError, "Não foi possível atualizar o serviço."));
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Catálogo de serviços reutilizado nos atendimentos."
        title="Serviços"
      />

      <form className="flex max-w-xl flex-col gap-3" onSubmit={(event) => void handleSubmit(event)}>
        <h3 className="font-semibold">{editingId ? "Editar serviço" : "Novo serviço"}</h3>
        <div className="flex flex-col gap-2">
          <Label htmlFor="service-nome">Nome</Label>
          <Input id="service-nome" onChange={(event) => setNome(event.target.value)} value={nome} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="service-descricao">Descrição (opcional)</Label>
          <Input
            id="service-descricao"
            onChange={(event) => setDescricao(event.target.value)}
            value={descricao}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="service-category">Categoria</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="service-category"
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
            <Label htmlFor="service-valor">Valor padrão (R$)</Label>
            <Input
              id="service-valor"
              inputMode="decimal"
              onChange={(event) => setValorPadrao(event.target.value)}
              value={valorPadrao}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="min-h-11 w-fit" disabled={submitting} type="submit">
            {submitting ? "Salvando..." : editingId ? "Salvar alterações" : "Criar serviço"}
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
          <Label htmlFor="service-search">Buscar</Label>
          <Input
            id="service-search"
            onChange={(event) => setSearch(event.target.value)}
            value={search}
          />
        </div>
      </FilterBar>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {services === undefined ? <LoadingSkeleton rows={4} /> : null}

      {services && services.length === 0 ? (
        <EmptyState description="Cadastre o primeiro serviço." title="Sem serviços" />
      ) : null}

      {services && services.length > 0 ? (
        <ul className="divide-y divide-border">
          {services.map((service) => (
            <li
              className="flex flex-col gap-3 py-3.5 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
              key={service._id}
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{service.nome}</p>
                  <Badge variant="secondary">{service.categoria}</Badge>
                  <Badge variant="secondary">{formatCurrency(service.valor_padrao)}</Badge>
                  <Badge
                    className={
                      service.ativo
                        ? "bg-success/12 text-success"
                        : "bg-muted text-muted-foreground"
                    }
                    variant="secondary"
                  >
                    {service.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {service.descricao ? (
                  <p className="text-sm text-muted-foreground">{service.descricao}</p>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => startEdit(service)} size="sm" type="button" variant="outline">
                  Editar
                </Button>
                <Button
                  onClick={() => void toggleActive(service._id, service.ativo)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {service.ativo ? "Desativar" : "Ativar"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
