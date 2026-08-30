import { useMutation, usePaginatedQuery } from "convex/react";
import {
  CheckCircle2Icon,
  HeartHandshakeIcon,
  MessageCircleMoreIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { EmptyState } from "@/components/EmptyState";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import {
  adoptionFollowupStatusBadgeClass,
  ADOPTION_FOLLOWUP_STATUS_LABELS,
  type AdoptionFollowupStatus,
} from "@/lib/domain-colors";
import { formatDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/auth-errors";

type AdoptionFollowupListProps = {
  dogId?: Id<"dogs">;
  status?: AdoptionFollowupStatus;
};

export function AdoptionFollowupList({ dogId, status }: AdoptionFollowupListProps) {
  const { can } = usePermissions();
  const [now] = useState(() => Date.now());
  const [expandedId, setExpandedId] = useState<Id<"adoption_followups"> | null>(null);
  const [contactStatus, setContactStatus] = useState<"contatado" | "sem_resposta">(
    "contatado",
  );
  const [observation, setObservation] = useState("");
  const [savingId, setSavingId] = useState<Id<"adoption_followups"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    results,
    status: paginationStatus,
    loadMore,
  } = usePaginatedQuery(
    api.adoptionFollowups.list,
    can("adoptions.read") ? { dogId, status, agora: now } : "skip",
    { initialNumItems: 20 },
  );
  const registerContact = useMutation(api.adoptionFollowups.registerContact);

  if (!can("adoptions.read")) {
    return (
      <EmptyState
        description="Você não tem acesso aos acompanhamentos pós-adoção."
        title="Acesso restrito"
      />
    );
  }
  if (results === undefined) {
    return <LoadingSkeleton rows={3} />;
  }
  if (results.length === 0) {
    return (
      <EmptyState
        description={
          dogId
            ? "Os acompanhamentos deste animal aparecerão aqui após uma adoção registrada."
            : "Novos acompanhamentos aparecerão aqui quando as adoções atingirem a data prevista."
        }
        icon={<HeartHandshakeIcon aria-hidden="true" className="size-6" />}
        title={
          status === "pendente"
            ? "Nenhum contato pendente"
            : "Nenhum acompanhamento encontrado"
        }
      />
    );
  }

  const openContactForm = (followupId: Id<"adoption_followups">) => {
    setExpandedId(followupId);
    setContactStatus("contatado");
    setObservation("");
    setError(null);
  };

  const handleSubmit = async (followupId: Id<"adoption_followups">) => {
    if (!observation.trim()) {
      setError("Registre uma observação sobre o contato.");
      return;
    }

    setSavingId(followupId);
    setError(null);
    try {
      await registerContact({
        followupId,
        status: contactStatus,
        resultado: observation.trim(),
      });
      setExpandedId(null);
      setObservation("");
    } catch (cause) {
      setError(getErrorMessage(cause, "Não foi possível registrar o contato."));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {results.map((followup) => {
        const isPending = followup.status === "pendente";
        const isExpanded = expandedId === followup._id;
        const dueDescription = isPending
          ? followup.atraso_dias > 0
            ? `Atrasado há ${followup.atraso_dias} ${followup.atraso_dias === 1 ? "dia" : "dias"}`
            : `Previsto para ${formatDate(followup.data_prevista)}`
          : followup.ultima_tentativa_em
            ? `Último contato em ${formatDate(followup.ultima_tentativa_em)}`
            : `Previsto para ${formatDate(followup.data_prevista)}`;

        return (
          <article
            className="rounded-2xl border bg-card p-4 shadow-xs"
            key={followup._id}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                {isPending ? (
                  <HeartHandshakeIcon aria-hidden="true" className="size-4.5" />
                ) : (
                  <CheckCircle2Icon aria-hidden="true" className="size-4.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {followup.dog ? (
                        <Link
                          className="hover:underline"
                          to={`/dogs/${followup.dog_id}`}
                        >
                          {followup.dog.nome}
                        </Link>
                      ) : (
                        "Animal removido"
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {followup.pessoa?.nome_completo ?? "Tutor removido"} ·{" "}
                      {followup.sequencia}º acompanhamento
                    </p>
                  </div>
                  <Badge
                    className={adoptionFollowupStatusBadgeClass[followup.status]}
                    variant="secondary"
                  >
                    {ADOPTION_FOLLOWUP_STATUS_LABELS[followup.status]}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>{dueDescription}</span>
                  {followup.tentativas > 0 ? (
                    <span>{followup.tentativas} tentativa(s)</span>
                  ) : null}
                </div>

                {followup.pessoa &&
                (followup.pessoa.telefone || followup.pessoa.email) ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {[followup.pessoa.telefone, followup.pessoa.email]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
                {followup.resultado ? (
                  <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm leading-6">
                    <strong>Observação:</strong> {followup.resultado}
                  </p>
                ) : null}

                {isPending && can("adoptions.manage") ? (
                  <div className="mt-4">
                    {!isExpanded ? (
                      <Button
                        className="min-h-11"
                        onClick={() => openContactForm(followup._id)}
                        type="button"
                      >
                        <MessageCircleMoreIcon aria-hidden="true" />
                        Registrar contato
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-xl border bg-background p-3">
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`followup-status-${followup._id}`}>
                            Resultado do contato
                          </Label>
                          <select
                            className="h-11 w-full appearance-none rounded-lg border border-input bg-card px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            id={`followup-status-${followup._id}`}
                            onChange={(event) =>
                              setContactStatus(
                                event.target.value as "contatado" | "sem_resposta",
                              )
                            }
                            value={contactStatus}
                          >
                            <option value="contatado">Tutor contatado</option>
                            <option value="sem_resposta">Sem resposta</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label htmlFor={`followup-observation-${followup._id}`}>
                            Observação
                          </Label>
                          <textarea
                            className="min-h-24 w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                            id={`followup-observation-${followup._id}`}
                            onChange={(event) => setObservation(event.target.value)}
                            placeholder="Como foi o contato?"
                            value={observation}
                          />
                        </div>
                        {error ? (
                          <p className="text-sm text-destructive">{error}</p>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            className="min-h-11"
                            disabled={savingId === followup._id}
                            onClick={() => void handleSubmit(followup._id)}
                            type="button"
                          >
                            {savingId === followup._id
                              ? "Salvando..."
                              : "Salvar contato"}
                          </Button>
                          <Button
                            className="min-h-11"
                            onClick={() => setExpandedId(null)}
                            type="button"
                            variant="outline"
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
      {paginationStatus === "CanLoadMore" ? (
        <Button
          className="min-h-11 self-center"
          onClick={() => loadMore(20)}
          type="button"
          variant="outline"
        >
          Carregar mais acompanhamentos
        </Button>
      ) : null}
    </div>
  );
}
