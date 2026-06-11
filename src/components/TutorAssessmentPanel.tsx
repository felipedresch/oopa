import { TutorAlertBadge } from "@/components/TutorAlertBadge";
import { SeverityBadge } from "@/components/SeverityBadge";
import { formatDate } from "@/lib/formatters";
import type { Severity, TutorAlertLevel } from "@/lib/domain-colors";

type AssessmentOccurrence = {
  _id: string;
  gravidade: Severity;
  data_ocorrencia: number;
  descricao: string;
  dog_nome: string;
};

type TutorAssessmentPanelProps = {
  tutorNome: string;
  bairroNome?: string | null;
  alert?: {
    level: TutorAlertLevel;
    alta_count: number;
    media_count: number;
    occurrences: AssessmentOccurrence[];
  };
};

export function TutorAssessmentPanel({
  tutorNome,
  bairroNome,
  alert,
}: TutorAssessmentPanelProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs">
      <div>
        <h3 className="font-semibold">Avaliação do tutor</h3>
        <p className="text-sm text-muted-foreground">
          {tutorNome}
          {bairroNome ? ` — ${bairroNome}` : ""}
        </p>
      </div>

      {!alert ? (
        <p className="text-sm text-muted-foreground">
          Alertas detalhados disponiveis apenas com permissão sensível de tutores.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <TutorAlertBadge level={alert.level} />
            <span className="text-sm text-muted-foreground">Alta: {alert.alta_count}</span>
            <span className="text-sm text-muted-foreground">Média: {alert.media_count}</span>
          </div>

          {alert.level === "red" ? (
            <p className="text-sm font-medium text-destructive">
              Alerta vermelho: ocorrências altas atribuidas ao tutor.
            </p>
          ) : null}
          {alert.level === "yellow" ? (
            <p className="text-sm font-medium text-warning">
              Alerta amarelo: ocorrências medias atribuidas ao tutor.
            </p>
          ) : null}

          {alert.occurrences.length > 0 ? (
            <ul className="divide-y divide-border">
              {alert.occurrences.map((occurrence) => (
                <li className="flex flex-col gap-1 py-3 text-sm first:pt-0 last:pb-0" key={occurrence._id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={occurrence.gravidade} />
                    <span className="text-muted-foreground">
                      {formatDate(occurrence.data_ocorrencia)}
                    </span>
                  </div>
                  <p className="font-medium">{occurrence.dog_nome}</p>
                  <p className="text-muted-foreground">{occurrence.descricao}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma ocorrência media ou alta atribuida.</p>
          )}
        </>
      )}
    </div>
  );
}
