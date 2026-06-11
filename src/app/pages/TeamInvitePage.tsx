import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import { PermissionLevelSelector } from "@/components/PermissionLevelSelector";
import { PermissionSummary } from "@/components/PermissionSummary";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/auth-errors";
import { createEmptyModuleMap, type ModulePermissionMap } from "@/lib/permissions";
import { moduleMapToPermissions } from "@/lib/permission-map";
import { usePermissions } from "@/hooks/usePermissions";

export function TeamInvitePage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const invite = useMutation(api.users.invite);
  const templates = useQuery(api.permissionTemplates.listForInvite, can("users.invite") ? {} : "skip");

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [organizacao, setOrganizacao] = useState("ONG OOPA");
  const [telefone, setTelefone] = useState("");
  const [moduleMap, setModuleMap] = useState<ModulePermissionMap>(createEmptyModuleMap());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const permissions = useMemo(() => moduleMapToPermissions(moduleMap), [moduleMap]);

  if (!can("users.invite")) {
    return <PermissionDenied />;
  }

  const handleTemplateChange = (templateId: string) => {
    const template = templates?.find((item) => item._id === templateId);
    if (template) {
      setModuleMap(template.moduleMap);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await invite({
        nome,
        email,
        organizacao,
        telefone: telefone || undefined,
        permissions,
      });
      void navigate("/team");
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível enviar o convite."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Escolha um template, ajuste os 7 módulos e revise antes de enviar."
        title="Convidar usuário"
      />

      <form className="flex flex-col gap-6" onSubmit={(event) => void handleSubmit(event)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" onChange={(e) => setNome(e.target.value)} required value={nome} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              onChange={(e) => setEmail(e.target.value)}
              required
              type="email"
              value={email}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organizacao">Organização</Label>
            <Input
              id="organizacao"
              onChange={(e) => setOrganizacao(e.target.value)}
              required
              value={organizacao}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" onChange={(e) => setTelefone(e.target.value)} value={telefone} />
          </div>
        </div>

        {templates && templates.length > 0 ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="template">Template de permissão</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="template"
              onChange={(event) => handleTemplateChange(event.target.value)}
              defaultValue=""
            >
              <option disabled value="">
                Selecione um template
              </option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.nome}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <PermissionLevelSelector onChange={setModuleMap} value={moduleMap} />

        <section className="border-t pt-5">
          <h2 className="mb-3 font-semibold">Resumo antes de enviar</h2>
          <PermissionSummary moduleMap={moduleMap} />
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button asChild className="min-h-11" type="button" variant="outline">
            <Link to="/team">Cancelar</Link>
          </Button>
          <Button className="min-h-11" disabled={loading} type="submit">
            {loading ? "Enviando..." : "Enviar convite"}
          </Button>
        </div>
      </form>
    </section>
  );
}
