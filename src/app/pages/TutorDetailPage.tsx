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
import { TutorAlertPanel } from "@/components/TutorAlertPanel";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCep, formatCpf, formatDate, formatPhone } from "@/lib/formatters";

const TABS = ["Dados", "Cães atuais", "Histórico", "Ocorrências"] as const;

export function TutorDetailPage() {
  const { tutorId } = useParams();
  const { can } = usePermissions();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Dados");

  const tutor = useQuery(
    api.tutors.get,
    tutorId && can("tutors.read") ? { tutorId: tutorId as Id<"tutors"> } : "skip",
  );

  if (!can("tutors.read")) {
    return <PermissionDenied />;
  }

  if (tutor === undefined) {
    return <LoadingSkeleton rows={6} />;
  }

  if (!tutor) {
    return (
      <PlaceholderPage description="O tutor solicitado não existe." title="Tutor não encontrado" />
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        actions={
          can("tutors.edit") ? (
            <Button asChild className="min-h-11" variant="outline">
              <Link to={`/tutors/${tutor._id}/edit`}>Editar</Link>
            </Button>
          ) : null
        }
        description={tutor.bairro?.nome ?? "Bairro não informado"}
        title={tutor.nome_completo}
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
                <dd>{tutor.nome_completo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bairro</dt>
                <dd>{tutor.bairro?.nome ?? "Não informado"}</dd>
              </div>
            </dl>
          </section>

          {tutor.sensitive_hidden ? (
            <SensitiveDataHidden />
          ) : tutor.sensitive ? (
            <section className="border-t pt-6">
              <h3 className="mb-3 font-semibold">Dados sensiveis</h3>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 [&_dd]:mt-0.5 [&_dd]:leading-6 [&_dt]:text-xs [&_dt]:font-medium [&_dt]:tracking-wide [&_dt]:text-muted-foreground [&_dt]:uppercase">
                <div>
                  <dt className="text-muted-foreground">CPF</dt>
                  <dd>{tutor.sensitive.cpf ? formatCpf(tutor.sensitive.cpf) : "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">RG</dt>
                  <dd>{tutor.sensitive.rg ?? "-"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Telefone</dt>
                  <dd>
                    {tutor.sensitive.telefone ? formatPhone(tutor.sensitive.telefone) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd>{tutor.sensitive.email ?? "-"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Endereco</dt>
                  <dd>
                    {[
                      tutor.sensitive.endereco_logradouro,
                      tutor.sensitive.endereco_numero,
                      tutor.sensitive.endereco_complemento,
                    ]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">CEP</dt>
                  <dd>
                    {tutor.sensitive.endereco_cep ? formatCep(tutor.sensitive.endereco_cep) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Data de nascimento</dt>
                  <dd>
                    {tutor.sensitive.data_nascimento
                      ? formatDate(tutor.sensitive.data_nascimento)
                      : "-"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Observações</dt>
                  <dd>{tutor.sensitive.observacoes ?? "-"}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          {tutor.alert ? (
            <div className="border-t pt-6">
              <TutorAlertPanel
              altaCount={tutor.alert.alta_count}
              level={tutor.alert.level}
              mediaCount={tutor.alert.media_count}
              occurrences={tutor.alert.occurrences}
            />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "Cães atuais" ? (
        tutor.current_dogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cão vinculado atualmente.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tutor.current_dogs.map((dog) => (
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
        tutor.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico tutor-cão registrado.</p>
        ) : (
          <ul className="divide-y divide-border">
            {tutor.history.map((entry) => (
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
        tutor.sensitive_hidden ? (
          <SensitiveDataHidden />
        ) : tutor.alert && tutor.alert.occurrences.length > 0 ? (
          <TutorAlertPanel
            altaCount={tutor.alert.alta_count}
            level={tutor.alert.level}
            mediaCount={tutor.alert.media_count}
            occurrences={tutor.alert.occurrences}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma ocorrência atribuível registrada para este tutor.
          </p>
        )
      ) : null}
    </section>
  );
}
