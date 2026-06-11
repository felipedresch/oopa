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
            <Link to="/team/invite">Convidar usuario</Link>
          </Button>
        }
        description="Gerencie convites, permissoes e status da equipe."
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
            className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          <Label htmlFor="organizacao">Organizacao</Label>
          <select
            className="min-h-11 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          title="Nenhum usuario encontrado"
        />
      ) : (
        <div className="grid gap-3">
          {results.map((user) => (
            <Link
              className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              key={user._id}
              to={`/team/${user._id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{user.nome}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">{user.organizacao}</p>
                </div>
                <Badge variant={user.ativo ? "default" : "outline"}>
                  {user.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
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
