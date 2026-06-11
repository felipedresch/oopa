import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PermissionLevelSelector } from "@/components/PermissionLevelSelector";
import { PermissionSummary } from "@/components/PermissionSummary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/auth-errors";
import { moduleMapToPermissions } from "@/lib/permission-map";
import type { ModulePermissionMap } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";

export function TeamUserPage() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();
  const { can, canAny, user: currentUser } = usePermissions();
  const updatePermissions = useMutation(api.users.updatePermissions);
  const deactivate = useMutation(api.users.deactivate);

  const user = useQuery(
    api.users.get,
    canAny(["users.invite", "users.manage_permissions"]) && userId
      ? { userId: userId as Id<"users"> }
      : "skip",
  );

  const [moduleMap, setModuleMap] = useState<ModulePermissionMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const effectiveMap = moduleMap ?? user?.moduleMap ?? null;
  const permissions = useMemo(
    () => (effectiveMap ? moduleMapToPermissions(effectiveMap) : []),
    [effectiveMap],
  );

  if (!canAny(["users.invite", "users.manage_permissions"])) {
    return <PermissionDenied />;
  }

  if (user === undefined) {
    return <LoadingSkeleton rows={4} />;
  }

  if (!user) {
    return <PermissionDenied message="Usuário não encontrado." />;
  }

  const handleSave = async () => {
    if (!can("users.manage_permissions") || !effectiveMap) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await updatePermissions({ userId: user._id, permissions });
      setModuleMap(null);
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Não foi possível salvar as permissões."));
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    setLoading(true);
    setError(null);
    try {
      await deactivate({ userId: user._id });
      setConfirmDeactivate(false);
      void navigate("/team");
    } catch (deactivateError) {
      setError(getErrorMessage(deactivateError, "Não foi possível desativar o usuário."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description={user.email}
        title={user.nome}
        actions={
          <Badge
            className={
              user.ativo ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"
            }
            variant="secondary"
          >
            {user.ativo ? "Ativo" : "Inativo"}
          </Badge>
        }
      />

      <p className="text-sm">
        <span className="text-muted-foreground">Organização:</span>{" "}
        <span className="font-medium">{user.organizacao}</span>
      </p>

      {can("users.manage_permissions") && effectiveMap ? (
        <>
          <PermissionLevelSelector onChange={setModuleMap} value={effectiveMap} />
          <section className="border-t pt-5">
            <h2 className="mb-3 font-semibold">Resumo</h2>
            <PermissionSummary moduleMap={effectiveMap} />
          </section>
          <Button className="min-h-11" disabled={loading} onClick={() => void handleSave()} type="button">
            {loading ? "Salvando..." : "Salvar permissões"}
          </Button>
        </>
      ) : (
        user.moduleMap && <PermissionSummary moduleMap={user.moduleMap} />
      )}

      {can("users.deactivate") && user.ativo && user._id !== currentUser?._id ? (
        <Button
          className="min-h-11"
          onClick={() => setConfirmDeactivate(true)}
          type="button"
          variant="destructive"
        >
          Desativar usuário
        </Button>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button asChild className="min-h-11" variant="outline">
        <Link to="/team">Voltar</Link>
      </Button>

      <ConfirmDialog
        description="O usuário não podera mais acessar o sistema."
        onConfirm={() => void handleDeactivate()}
        onOpenChange={setConfirmDeactivate}
        open={confirmDeactivate}
        title="Desativar usuário"
      />
    </section>
  );
}
