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
