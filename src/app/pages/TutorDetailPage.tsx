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

const TABS = ["Dados", "Caes atuais", "Historico", "Ocorrencias"] as const;

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
      <PlaceholderPage description="O tutor solicitado nao existe." title="Tutor nao encontrado" />
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
        description={tutor.bairro?.nome ?? "Bairro nao informado"}
        title={tutor.nome_completo}
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            className="min-h-11"
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
            variant={activeTab === tab ? "default" : "outline"}
          >
            {tab}
          </Button>
        ))}
      </div>

      {activeTab === "Dados" ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4">
            <h3 className="mb-3 font-medium">Informacoes basicas</h3>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Nome</dt>
                <dd>{tutor.nome_completo}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bairro</dt>
                <dd>{tutor.bairro?.nome ?? "Nao informado"}</dd>
              </div>
            </dl>
          </div>

          {tutor.sensitive_hidden ? (
            <SensitiveDataHidden />
          ) : tutor.sensitive ? (
            <div className="rounded-xl border p-4">
              <h3 className="mb-3 font-medium">Dados sensiveis</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
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
                  <dt className="text-muted-foreground">Observacoes</dt>
                  <dd>{tutor.sensitive.observacoes ?? "-"}</dd>
                </div>
              </dl>
            </div>
          ) : null}

          {tutor.alert ? (
            <TutorAlertPanel
              altaCount={tutor.alert.alta_count}
              level={tutor.alert.level}
              mediaCount={tutor.alert.media_count}
              occurrences={tutor.alert.occurrences}
            />
          ) : null}
        </div>
      ) : null}

      {activeTab === "Caes atuais" ? (
        tutor.current_dogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cao vinculado atualmente.</p>
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

      {activeTab === "Historico" ? (
        tutor.history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem historico tutor-cao registrado.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {tutor.history.map((entry) => (
              <li className="rounded-xl border p-4" key={entry._id}>
                <p className="font-medium">{entry.dog_nome}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(entry.inicio)}
                  {entry.fim ? ` ate ${formatDate(entry.fim)}` : " (atual)"}
                </p>
                <p className="text-sm">
                  {entry.tipo_inicio}
                  {entry.tipo_fim ? ` / ${entry.tipo_fim}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {activeTab === "Ocorrencias" ? (
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
            Nenhuma ocorrencia atribuivel registrada para este tutor.
          </p>
        )
      ) : null}
    </section>
  );
}
