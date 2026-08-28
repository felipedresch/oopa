import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/lib/auth-errors";
import type { DogEspecie, DogPorte, DogSexo } from "@/lib/domain-colors";
import { DOG_PORTE_LABELS, DOG_SEXO_LABELS, ESPECIE_LABELS } from "@/lib/domain-colors";

export function CastrationNewPage() {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const createCastration = useMutation(api.castration.create);

  const [personSearch, setPersonSearch] = useState("");
  const [pessoaId, setPessoaId] = useState<Id<"people"> | undefined>();
  const [nome, setNome] = useState("");
  const [especie, setEspecie] = useState<DogEspecie>("cao");
  const [porte, setPorte] = useState<DogPorte>("pequeno");
  const [sexo, setSexo] = useState<DogSexo>("macho");
  const [cor, setCor] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const personOptions = useQuery(
    api.people.list,
    personSearch && !pessoaId
      ? { paginationOpts: { numItems: 5, cursor: null }, search: personSearch }
      : "skip",
  );

  if (!can("castration.create")) {
    return <PermissionDenied />;
  }

  const canSubmit = Boolean(pessoaId);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pessoaId) {
      setError("Selecione a pessoa solicitante.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const castrationId = await createCastration({
        pessoa_id: pessoaId,
        animal_descricao: {
          nome: nome.trim() || undefined,
          especie,
          porte,
          sexo,
          cor: cor.trim() || undefined,
        },
        observacoes: observacoes.trim() || undefined,
      });
      void navigate(`/castration/${castrationId}`);
    } catch (submitError) {
      setError(getErrorMessage(submitError, "Não foi possível registrar a solicitação."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        description="Descrição leve do animal, sem exigir cadastro completo."
        title="Nova solicitação de castração"
      />

      <form
        className="flex max-w-2xl flex-col gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="castration-pessoa">Pessoa solicitante</Label>
          <Input
            id="castration-pessoa"
            onChange={(event) => {
              setPersonSearch(event.target.value);
              setPessoaId(undefined);
            }}
            placeholder="Buscar pessoa por nome"
            required
            value={personSearch}
          />
          {personOptions?.page && personOptions.page.length > 0 ? (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-input bg-card">
              {personOptions.page.map((person) => (
                <li key={person._id}>
                  <button
                    className="w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/40"
                    onClick={() => {
                      setPessoaId(person._id);
                      setPersonSearch(person.nome_completo);
                    }}
                    type="button"
                  >
                    {person.nome_completo}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {pessoaId ? (
            <p className="text-xs text-muted-foreground">Pessoa selecionada.</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="castration-animal-nome">Nome do animal (opcional)</Label>
          <Input
            id="castration-animal-nome"
            onChange={(event) => setNome(event.target.value)}
            placeholder="Se ainda não tiver nome, deixe em branco"
            value={nome}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="castration-especie">Espécie</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="castration-especie"
              onChange={(event) => setEspecie(event.target.value as DogEspecie)}
              value={especie}
            >
              {(Object.entries(ESPECIE_LABELS) as [DogEspecie, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="castration-sexo">Sexo</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="castration-sexo"
              onChange={(event) => setSexo(event.target.value as DogSexo)}
              value={sexo}
            >
              {(Object.entries(DOG_SEXO_LABELS) as [DogSexo, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="castration-porte">Porte</Label>
            <select
              className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              id="castration-porte"
              onChange={(event) => setPorte(event.target.value as DogPorte)}
              value={porte}
            >
              {(Object.entries(DOG_PORTE_LABELS) as [DogPorte, string][]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="castration-cor">Cor (opcional)</Label>
            <Input
              id="castration-cor"
              onChange={(event) => setCor(event.target.value)}
              value={cor}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="castration-observacoes">Observações (opcional)</Label>
          <textarea
            className="min-h-24 rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            id="castration-observacoes"
            onChange={(event) => setObservacoes(event.target.value)}
            value={observacoes}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button className="min-h-11" disabled={!canSubmit || submitting} type="submit">
          {submitting ? "Salvando..." : "Registrar solicitação"}
        </Button>
      </form>
    </section>
  );
}
