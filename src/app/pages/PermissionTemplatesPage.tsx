import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PermissionLevelSelector } from "@/components/PermissionLevelSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";
import { moduleMapToPermissions } from "@/lib/permission-map";
import { createEmptyModuleMap, type ModulePermissionMap } from "@/lib/permissions";
import { usePermissions } from "@/hooks/usePermissions";

export function PermissionTemplatesPage() {
  const { can } = usePermissions();
  const templates = useQuery(api.permissionTemplates.list, can("templates.manage") ? {} : "skip");
  const createTemplate = useMutation(api.permissionTemplates.create);
  const updateTemplate = useMutation(api.permissionTemplates.update);
  const duplicateTemplate = useMutation(api.permissionTemplates.duplicate);
  const setActive = useMutation(api.permissionTemplates.setActive);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [moduleMap, setModuleMap] = useState<ModulePermissionMap>(createEmptyModuleMap());
  const [editingId, setEditingId] = useState<Id<"permission_templates"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!can("templates.manage")) {
    return <PermissionDenied />;
  }

  const resetForm = () => {
    setNome("");
    setDescricao("");
    setModuleMap(createEmptyModuleMap());
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const permissions = moduleMapToPermissions(moduleMap);
      if (editingId) {
        await updateTemplate({
          templateId: editingId,
          nome,
          descricao,
          permissions,
        });
      } else {
        await createTemplate({ nome, descricao, permissions });
      }
      resetForm();
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível salvar o template."));
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (template: NonNullable<typeof templates>[number]) => {
    setEditingId(template._id);
    setNome(template.nome);
    setDescricao(template.descricao);
    setModuleMap(template.moduleMap);
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Crie, edite, duplique e ative templates reutilizaveis nos convites."
        title="Templates de permissão"
      />

      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <h2 className="font-semibold">{editingId ? "Editar template" : "Novo template"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" onChange={(e) => setNome(e.target.value)} required value={nome} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              onChange={(e) => setDescricao(e.target.value)}
              required
              value={descricao}
            />
          </div>
        </div>
        <PermissionLevelSelector onChange={setModuleMap} value={moduleMap} />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button className="min-h-11" disabled={loading} type="submit">
            {loading ? "Salvando..." : editingId ? "Atualizar template" : "Criar template"}
          </Button>
          {editingId ? (
            <Button className="min-h-11" onClick={resetForm} type="button" variant="outline">
              Cancelar edicao
            </Button>
          ) : null}
        </div>
      </form>

      <h2 className="border-t pt-5 font-semibold">Templates existentes</h2>

      {templates === undefined ? (
        <LoadingSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          description="Crie o primeiro template para acelerar convites da equipe."
          title="Nenhum template cadastrado"
        />
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <article className="rounded-xl border bg-card p-4 shadow-xs" key={template._id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{template.nome}</h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        template.ativo
                          ? "bg-success/12 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {template.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{template.descricao}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => startEdit(template)} size="sm" type="button" variant="outline">
                    Editar
                  </Button>
                  <Button
                    onClick={() => void duplicateTemplate({ templateId: template._id })}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Duplicar
                  </Button>
                  <Button
                    onClick={() =>
                      void setActive({ templateId: template._id, ativo: !template.ativo })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {template.ativo ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
