import { usePaginatedQuery, useQuery } from "convex/react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
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

export function TeamPage() {
  const { canAny } = usePermissions();
  const [search, setSearch] = useState("");
  const [ativo, setAtivo] = useState<"all" | "active" | "inactive">("all");
  const [organizacao, setOrganizacao] = useState("");

  const canView = canAny(["users.invite", "users.manage_permissions"]);

  const organizations = useQuery(
    api.users.listOrganizations,
    canView ? {} : "skip",
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.users.list,
    canView
      ? {
          search: search || undefined,
          ativo: ativo === "all" ? undefined : ativo === "active",
          organizacao: organizacao || undefined,
        }
      : "skip",
    { initialNumItems: 25 },
  );

  if (!canView) {
    return <PermissionDenied />;
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          <Button asChild className="min-h-11">
            <Link to="/team/invite">Convidar usuário</Link>
          </Button>
        }
        description="Gerencie convites, permissões e status da equipe."
        title="Equipe"
      />

      <FilterBar>
        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="search">Buscar</Label>
          <Input
            id="search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou email"
            value={search}
          />
        </div>
        <div className="flex min-w-40 flex-col gap-2">
          <Label htmlFor="ativo">Status</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="ativo"
            onChange={(event) => setAtivo(event.target.value as typeof ativo)}
            value={ativo}
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
        <div className="flex min-w-48 flex-col gap-2">
          <Label htmlFor="organizacao">Organização</Label>
          <select
            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="organizacao"
            onChange={(event) => setOrganizacao(event.target.value)}
            value={organizacao}
          >
            <option value="">Todas</option>
            {(organizations ?? []).map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>
      </FilterBar>

      {results === undefined ? (
        <LoadingSkeleton rows={4} />
      ) : results.length === 0 ? (
        <EmptyState
          description="Ajuste os filtros ou convide o primeiro membro da equipe."
          title="Nenhum usuário encontrado"
        />
      ) : (
        <div className="grid gap-3">
          {results.map((user) => (
            <Link
              className="flex items-start gap-3.5 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:border-ring/40 hover:bg-accent/30"
              key={user._id}
              to={`/team/${user._id}`}
            >
              <span
                aria-hidden="true"
                className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary font-heading text-base font-bold text-secondary-foreground"
              >
                {user.nome.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{user.nome}</span>
                <span className="block truncate text-sm text-muted-foreground">{user.email}</span>
                <span className="block truncate text-sm text-muted-foreground">
                  {user.organizacao}
                </span>
              </span>
              <Badge
                className={
                  user.ativo ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"
                }
                variant="secondary"
              >
                {user.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </Link>
          ))}
          {status === "CanLoadMore" ? (
            <Button className="min-h-11 self-start" onClick={() => loadMore(25)} variant="outline">
              Carregar mais
            </Button>
          ) : null}
          {status === "LoadingMore" ? <LoadingSkeleton rows={2} /> : null}
        </div>
      )}
    </section>
  );
}
