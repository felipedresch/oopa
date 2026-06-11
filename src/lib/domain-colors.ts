import type { PermissionLevel } from "@/lib/permissions";

export type Severity = "info" | "baixa" | "media" | "alta";

export type DogStatus =
  | "na_ong"
  | "adotado"
  | "desaparecido"
  | "falecido"
  | "transferido";

export type TutorAlertLevel = "none" | "yellow" | "red";

export const SEVERITY_LABELS: Record<Severity, string> = {
  info: "Informativa",
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
};

export const DOG_STATUS_LABELS: Record<DogStatus, string> = {
  na_ong: "Na ONG",
  adotado: "Adotado",
  desaparecido: "Desaparecido",
  falecido: "Falecido",
  transferido: "Transferido",
};

export const severityBadgeClass: Record<Severity, string> = {
  info: "bg-muted text-muted-foreground",
  baixa: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  media: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  alta: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

export const dogStatusBadgeClass: Record<DogStatus, string> = {
  na_ong: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  adotado: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  desaparecido:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  falecido: "bg-muted text-muted-foreground",
  transferido: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
};

export const tutorAlertBadgeClass: Record<Exclude<TutorAlertLevel, "none">, string> = {
  yellow: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  red: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100",
};

export const permissionLevelBadgeClass: Record<PermissionLevel, string> = {
  none: "bg-muted text-muted-foreground",
  read: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  write: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100",
  manage: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
};
