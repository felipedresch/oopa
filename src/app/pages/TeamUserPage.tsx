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
    return <PermissionDenied message="Usuario nao encontrado." />;
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
      setError(getErrorMessage(saveError, "Nao foi possivel salvar as permissoes."));
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
      setError(getErrorMessage(deactivateError, "Nao foi possivel desativar o usuario."));
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
          <Badge variant={user.ativo ? "default" : "outline"}>
            {user.ativo ? "Ativo" : "Inativo"}
          </Badge>
        }
      />

      <div className="rounded-xl border bg-card p-4 text-sm">
        <p>
          <span className="font-medium">Organizacao:</span> {user.organizacao}
        </p>
      </div>

      {can("users.manage_permissions") && effectiveMap ? (
        <>
          <PermissionLevelSelector onChange={setModuleMap} value={effectiveMap} />
          <PermissionSummary moduleMap={effectiveMap} />
          <Button className="min-h-11" disabled={loading} onClick={() => void handleSave()} type="button">
            {loading ? "Salvando..." : "Salvar permissoes"}
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
          Desativar usuario
        </Button>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button asChild className="min-h-11" variant="outline">
        <Link to="/team">Voltar</Link>
      </Button>

      <ConfirmDialog
        description="O usuario nao podera mais acessar o sistema."
        onConfirm={() => void handleDeactivate()}
        onOpenChange={setConfirmDeactivate}
        open={confirmDeactivate}
        title="Desativar usuario"
      />
    </section>
  );
}
