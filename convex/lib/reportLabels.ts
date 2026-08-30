/**
 * Rótulos PT-BR usados nos relatórios (Fase 24). Ficam no backend porque as
 * linhas do relatório já saem prontas para exibição e para o CSV.
 */

export const ESPECIE_LABELS = {
  cao: "Cão",
  gato: "Gato",
} as const;

export const SEVERITY_LABELS = {
  info: "Informativa",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
} as const;

export const CASTRATION_STATUS_LABELS = {
  aguardando: "Aguardando",
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
} as const;

export const RESCUE_STATUS_LABELS = {
  aberta: "Aberta",
  em_atendimento: "Em atendimento",
  concluida: "Concluída",
  cancelada: "Cancelada",
} as const;

export const PUBLIC_REPORT_STATUS_LABELS = {
  novo: "Novo",
  em_analise: "Em análise",
  convertido: "Convertido",
  arquivado: "Arquivado",
} as const;

export const APPOINTMENT_TYPE_LABELS = {
  consulta: "Consulta",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  castracao: "Castração",
  emergencia: "Emergência",
  outro: "Atendimento",
} as const;
