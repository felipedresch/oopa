import { useMemo, useState } from "react";

import { SeverityBadge } from "@/components/SeverityBadge";
import { TutorAlertBadge } from "@/components/TutorAlertBadge";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/formatters";
import type { Severity, TutorAlertLevel } from "@/lib/domain-colors";

type AlertOccurrence = {
  _id: string;
  gravidade: Severity;
  data_ocorrencia: number;
  descricao: string;
  dog_id: string;
  dog_nome: string;
};

type TutorAlertPanelProps = {
  level: TutorAlertLevel;
  altaCount: number;
  mediaCount: number;
  occurrences: AlertOccurrence[];
};

const FILTER_OPTIONS = [
  { value: "all", label: "Todas" },
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
] as const;

export function TutorAlertPanel({
  level,
  altaCount,
  mediaCount,
  occurrences,
}: TutorAlertPanelProps) {
  const [filter, setFilter] = useState<(typeof FILTER_OPTIONS)[number]["value"]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") {
      return occurrences;
    }
    return occurrences.filter((occurrence) => occurrence.gravidade === filter);
  }, [filter, occurrences]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">Alertas do tutor</h3>
          <TutorAlertBadge level={level} />
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>Alta: {altaCount}</span>
          <span>Média: {mediaCount}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="alert-filter">Filtrar por gravidade</Label>
        <select
          className="min-h-11 rounded-lg border border-input bg-card px-3 text-sm"
          id="alert-filter"
          onChange={(event) =>
            setFilter(event.target.value as (typeof FILTER_OPTIONS)[number]["value"])
          }
          value={filter}
        >
          {FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma ocorrência neste filtro.</p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((occurrence) => (
            <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0" key={occurrence._id}>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={occurrence.gravidade} />
                <span className="text-xs text-muted-foreground">
                  {formatDate(occurrence.data_ocorrencia)}
                </span>
              </div>
              <p className="text-sm font-medium">{occurrence.dog_nome}</p>
              <p className="text-sm text-muted-foreground">{occurrence.descricao}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
