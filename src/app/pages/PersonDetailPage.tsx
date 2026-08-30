import { useQuery } from "convex/react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { DogCard } from "@/components/DogCard";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PageHeader } from "@/components/PageHeader";
import { PermissionDenied } from "@/components/PermissionDenied";
import { PlaceholderPage } from "@/app/pages/PlaceholderPage";
import { SensitiveDataHidden } from "@/components/SensitiveDataHidden";
import { PersonAlertPanel } from "@/components/PersonAlertPanel";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCep, formatCpf, formatDate, formatPhone } from "@/lib/formatters";

const TABS = ["Dados", "Animais atuais", "Histórico", "Ocorrências"] as const;

const PAPEL_LABELS: Record<string, string> = {
  tutor: "Tutor",
  denunciante: "Denunciante",
  solicitante_castracao: "Solicitante de castração",
  solicitante_resgate: "Solicitante de resgate",
};

export function PersonDetailPage() {
  const { personId } = useParams();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Dados");

  const person = useQuery(
    api.people.get,
    personId && can("people.read") ? { personId: personId as Id<"people"> } : "skip",
  );

  if (!can("people.read")) {
    return <PermissionDenied />;
  }

  if (person === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!person) {
    return (
      <PlaceholderPage description="A pessoa solicitada não existe." title="Pessoa não encontrada" />
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("people.edit") ? (
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/people/${person._id}/edit`}>Editar</Link>
            </Button>
          ) : null
        }
        description={person.bairro?.nome ?? "Bairro não informado"}
        title={person.nome_completo}
      />

      <div className="flex gap-1 overflow-x-auto border-b" role="tablist">
        {TABS.map((tab) => (
          <button
            aria-selected={activeTab === tab}
            className={`min-h-11 shrink-0 border-b-2 px-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            role="tab"
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Dados" ? (
        <div className="flex flex-col gap-8">
          <section>
            <h3 className="mb-3 font-semibold">Informacoes basicas</h3>
            <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd>{person.nome_completo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bairro</dt>
                <dd>{person.bairro?.nome ?? "Não informado"}</dd>
              </div>
            </dl>
            {person.papeis.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {person.papeis.map((papel: string) => (
                  <span
                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    key={papel}
                  >
                    {PAPEL_LABELS[papel]}
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          {person.sensitive_hidden ? (
            <SensitiveDataHidden />
          ) : person.sensitive ? (
            <section className="border-t pt-6">
              <h3 className="mb-3 font-semibold">Dados sensíveis</h3>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
                <div>
                  <dt className="text-muted-foreground">CPF</dt>
                  <dd>{person.sensitive.cpf ? formatCpf(person.sensitive.cpf) : "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">RG</dt>
                  <dd>{person.sensitive.rg ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd>
                    {person.sensitive.telefone ? formatPhone(person.sensitive.telefone) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{person.sensitive.email ?? "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Endereco</dt>
                  <dd>
                    {[
                      person.sensitive.endereco_logradouro,
                      person.sensitive.endereco_numero,
                      person.sensitive.endereco_complemento,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">CEP</dt>
                  <dd>
                    {person.sensitive.endereco_cep ? formatCep(person.sensitive.endereco_cep) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Data de cadastro no CadÚnico</dt>
                  <dd>
                    {person.sensitive.data_cadastro_cadunico
                      ? formatDate(person.sensitive.data_cadastro_cadunico)
                      : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Data de nascimento</dt>
                  <dd>
                    {person.sensitive.data_nascimento
                      ? formatDate(person.sensitive.data_nascimento)
                      : "-"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Observações</dt>
                  <dd>{person.sensitive.observacoes ?? "-"}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {person.alert ? (
            <div className="border-t pt-6">
              <PersonAlertPanel
              altaCount={person.alert.alta_count}
              level={person.alert.level}
              mediaCount={person.alert.media_count}
              occurrences={person.alert.occurrences}
            />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Animais atuais" ? (
        person.current_dogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum animal vinculado atualmente.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {person.current_dogs.map((dog: (typeof person.current_dogs)[number]) => (
              <DogCard
                dogId={dog._id}
                key={dog._id}
                microchip={dog.microchip}
                nome={dog.nome}
                status={dog.status_atual}
              />
            ))}
          </div>
        )
      ) : null}

      {activeTab === "Histórico" ? (
        person.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico de tutoria registrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {person.history.map((entry: (typeof person.history)[number]) => (
              <li className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0" key={entry._id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <p className="font-medium">{entry.dog_nome}</p>
                  {entry.fim ? null : (
                    <span className="rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-medium text-success">
                      Atual
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDate(entry.inicio)}
                  {entry.fim ? ` ate ${formatDate(entry.fim)}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">
                  {entry.tipo_inicio}
                  {entry.tipo_fim ? ` / ${entry.tipo_fim}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === "Ocorrências" ? (
        person.sensitive_hidden ? (
          <SensitiveDataHidden />
        ) : person.alert && person.alert.occurrences.length > 0 ? (
          <PersonAlertPanel
            altaCount={person.alert.alta_count}
            level={person.alert.level}
            mediaCount={person.alert.media_count}
            occurrences={person.alert.occurrences}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma ocorrência atribuível registrada para esta pessoa.
          </p>
        )
      ) : null}
    </section>
  );
}
