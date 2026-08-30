/**
 * Catálogo dos relatórios (Fase 24). Espelha os ids aceitos por
 * `convex/reports.ts` e descreve quais filtros cada tela oferece.
 */

export type ReportId =
  | "castracoes"
  | "denuncias"
  | "atendimentos_urgentes"
  | "atendimentos_veterinarios"
  | "adocoes";

export type ReportFilterKind = "periodo" | "bairro" | "animal" | "pessoa";

export type ReportDefinition = {
  id: ReportId;
  titulo: string;
  descricao: string;
  filtros: ReportFilterKind[];
};

export const REPORTS: ReportDefinition[] = [
  {
    id: "castracoes",
    titulo: "Castrações",
    descricao:
      "Fila atual, castrações realizadas no período e taxa de não comparecimento.",
    filtros: ["periodo"],
  },
  {
    id: "denuncias",
    titulo: "Denúncias",
    descricao:
      "Denúncias do portal público e ocorrências de denúncia externa, por bairro e período.",
    filtros: ["periodo", "bairro"],
  },
  {
    id: "atendimentos_urgentes",
    titulo: "Atendimentos urgentes",
    descricao:
      "Resgates de gravidade alta e ocorrências de risco ou legais registradas no período.",
    filtros: ["periodo", "bairro"],
  },
  {
    id: "atendimentos_veterinarios",
    titulo: "Atendimentos veterinários",
    descricao:
      "Atendimentos com valor, nota fiscal e data de emissão, filtráveis por animal ou solicitante.",
    filtros: ["periodo", "animal", "pessoa"],
  },
  {
    id: "adocoes",
    titulo: "Adoções e acompanhamento",
    descricao:
      "Adoções concluídas e acompanhamentos pós-adoção pendentes ou atrasados.",
    filtros: ["periodo", "animal", "pessoa"],
  },
];

export function findReport(id: string | undefined): ReportDefinition | undefined {
  return REPORTS.find((report) => report.id === id);
}

/** Converte uma data `yyyy-MM-dd` no início ou no fim do dia local, em ms. */
export function boundaryFromDateInput(
  value: string,
  boundary: "start" | "end",
): number | undefined {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }
  return boundary === "start"
    ? new Date(year, month - 1, day).getTime()
    : new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

/** Nome de arquivo estável para o CSV baixado. */
export function reportCsvFileName(id: ReportId, agora: number): string {
  return `relatorio-${id}-${new Date(agora).toISOString().slice(0, 10)}.csv`;
}
