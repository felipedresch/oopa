import type { PermissionLevel } from "@/lib/permissions";

export type Severity = "info" | "baixa" | "media" | "alta";

export type DogEspecie = "cao" | "gato";

export const ESPECIE_LABELS: Record<DogEspecie, string> = {
  cao: "Cão",
  gato: "Gato",
};

export const ESPECIE_EMOJI: Record<DogEspecie, string> = {
  cao: "🐶",
  gato: "🐱",
};

export type DogSexo = "macho" | "femea";
export type DogPorte = "pequeno" | "medio" | "grande";

export const DOG_SEXO_LABELS: Record<DogSexo, string> = {
  macho: "Macho",
  femea: "Fêmea",
};

export const DOG_PORTE_LABELS: Record<DogPorte, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
};

export type DogStatus =
  | "na_ong"
  | "adotado"
  | "desaparecido"
  | "falecido"
  | "transferido"
  | "comunitario";

export type PersonAlertLevel = "none" | "yellow" | "red";

export const SEVERITY_LABELS: Record<Severity, string> = {
  info: "Informativa",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

export const DOG_STATUS_LABELS: Record<DogStatus, string> = {
  na_ong: "Na ONG",
  adotado: "Adotado",
  desaparecido: "Desaparecido",
  falecido: "Falecido",
  transferido: "Transferido",
  comunitario: "Comunitário",
};

export const severityBadgeClass: Record<Severity, string> = {
  info: "bg-muted text-muted-foreground",
  baixa: "bg-success/12 text-success",
  media: "bg-warning/14 text-warning",
  alta: "bg-destructive/12 text-destructive",
};

export const dogStatusBadgeClass: Record<DogStatus, string> = {
  na_ong: "bg-info/12 text-info",
  adotado: "bg-success/12 text-success",
  desaparecido: "bg-warning/14 text-warning",
  falecido: "bg-muted text-muted-foreground",
  transferido: "bg-alert/12 text-alert",
  comunitario: "bg-accent text-accent-foreground",
};

export type RescueStatus = "aberta" | "em_atendimento" | "concluida" | "cancelada";

export const RESCUE_STATUS_LABELS: Record<RescueStatus, string> = {
  aberta: "Aberta",
  em_atendimento: "Em atendimento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const rescueStatusBadgeClass: Record<RescueStatus, string> = {
  aberta: "bg-warning/14 text-warning",
  em_atendimento: "bg-info/12 text-info",
  concluida: "bg-success/12 text-success",
  cancelada: "bg-muted text-muted-foreground",
};

export type CastrationStatus =
  | "aguardando"
  | "agendada"
  | "realizada"
  | "cancelada"
  | "nao_compareceu";

export const CASTRATION_STATUS_LABELS: Record<CastrationStatus, string> = {
  aguardando: "Aguardando",
  agendada: "Agendada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
};

export const castrationStatusBadgeClass: Record<CastrationStatus, string> = {
  aguardando: "bg-warning/14 text-warning",
  agendada: "bg-info/12 text-info",
  realizada: "bg-success/12 text-success",
  cancelada: "bg-muted text-muted-foreground",
  nao_compareceu: "bg-destructive/12 text-destructive",
};

export type AppointmentType =
  | "consulta"
  | "vacina"
  | "cirurgia"
  | "exame"
  | "castracao"
  | "emergencia"
  | "outro";

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  consulta: "Consulta",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  castracao: "Castração",
  emergencia: "Emergência",
  outro: "Outro",
};

export type AppointmentStatus = "agendado" | "realizado" | "cancelado";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const appointmentStatusBadgeClass: Record<AppointmentStatus, string> = {
  agendado: "bg-info/12 text-info",
  realizado: "bg-success/12 text-success",
  cancelado: "bg-muted text-muted-foreground",
};

export const personAlertBadgeClass: Record<Exclude<PersonAlertLevel, "none">, string> = {
  yellow: "bg-warning/14 text-warning",
  red: "bg-destructive/12 text-destructive",
};

export const permissionLevelBadgeClass: Record<PermissionLevel, string> = {
  none: "bg-muted text-muted-foreground",
  read: "bg-info/12 text-info",
  write: "bg-success/12 text-success",
  manage: "bg-alert/12 text-alert",
};
