import {
  ActivityIcon,
  ArrowRightLeftIcon,
  BellIcon,
  CameraIcon,
  HeartIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  MapPinIcon,
  PawPrintIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  ShieldOffIcon,
  TagIcon,
  UserCheckIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";

export type AuditTone = "create" | "update" | "status" | "danger" | "security" | "neutral";

/** Classes de chip (fundo + texto) por tom, alinhadas à paleta do projeto. */
export const AUDIT_TONE_CLASS: Record<AuditTone, string> = {
  create: "bg-success/12 text-success",
  update: "bg-info/12 text-info",
  status: "bg-warning/14 text-warning",
  danger: "bg-destructive/12 text-destructive",
  security: "bg-alert/12 text-alert",
  neutral: "bg-muted text-muted-foreground",
};

export type AuditActionInfo = {
  label: string;
  icon: LucideIcon;
  tone: AuditTone;
};

const ACTION_LABELS: Record<string, AuditActionInfo> = {
  "dogs.create": { label: "Animal cadastrado", icon: PawPrintIcon, tone: "create" },
  "dogs.update": { label: "Animal atualizado", icon: PencilIcon, tone: "update" },
  "dogs.change_status": { label: "Status do animal alterado", icon: TagIcon, tone: "status" },
  "dog_photos.add": { label: "Foto de animal adicionada", icon: CameraIcon, tone: "create" },

  "people.create": { label: "Pessoa cadastrada", icon: UserPlusIcon, tone: "create" },
  "people.update": { label: "Pessoa atualizada", icon: PencilIcon, tone: "update" },

  "occurrences.create": { label: "Ocorrência registrada", icon: PlusIcon, tone: "create" },
  "occurrences.rectify": {
    label: "Ocorrência retificada",
    icon: RotateCcwIcon,
    tone: "update",
  },
  "occurrence_photos.add": {
    label: "Foto de ocorrência adicionada",
    icon: CameraIcon,
    tone: "create",
  },
  "occurrence_types.create": {
    label: "Tipo de ocorrência criado",
    icon: PlusIcon,
    tone: "create",
  },
  "occurrence_types.update": {
    label: "Tipo de ocorrência atualizado",
    icon: PencilIcon,
    tone: "update",
  },

  "adoptions.create": { label: "Adoção registrada", icon: HeartIcon, tone: "create" },
  "adoptions.returnToOng": {
    label: "Devolução à ONG",
    icon: RotateCcwIcon,
    tone: "status",
  },
  "adoptions.transferTutor": {
    label: "Transferência de tutor",
    icon: ArrowRightLeftIcon,
    tone: "status",
  },

  "bairros.create": { label: "Bairro criado", icon: MapPinIcon, tone: "create" },

  "templates.create": { label: "Template criado", icon: PlusIcon, tone: "create" },
  "templates.duplicate": { label: "Template duplicado", icon: PlusIcon, tone: "create" },
  "templates.update": { label: "Template atualizado", icon: PencilIcon, tone: "update" },

  "users.invite": { label: "Usuário convidado", icon: UserPlusIcon, tone: "create" },
  "users.accept_invite": { label: "Convite aceito", icon: UserCheckIcon, tone: "create" },
  "users.deactivate": { label: "Usuário desativado", icon: ShieldOffIcon, tone: "danger" },
  "users.reset_password": {
    label: "Senha redefinida",
    icon: KeyRoundIcon,
    tone: "security",
  },
  "users.update_permissions": {
    label: "Permissões atualizadas",
    icon: ShieldCheckIcon,
    tone: "security",
  },

  "notifications.reportDogNotFound": {
    label: "Animal reportado como não encontrado",
    icon: BellIcon,
    tone: "danger",
  },

  "public_reports.convert_to_occurrence": {
    label: "Denúncia convertida em ocorrência",
    icon: ArrowRightLeftIcon,
    tone: "update",
  },
  "public_reports.archive": {
    label: "Denúncia arquivada",
    icon: ShieldOffIcon,
    tone: "neutral",
  },

  "rescues.create": { label: "Resgate solicitado", icon: LifeBuoyIcon, tone: "create" },
  "rescues.update_status": {
    label: "Status do resgate alterado",
    icon: TagIcon,
    tone: "status",
  },
  "rescues.set_ong_description": {
    label: "Descrição da ONG registrada no resgate",
    icon: PencilIcon,
    tone: "update",
  },
};

/** Rótulo + ícone + tom para uma ação de auditoria; fallback neutro para ações não mapeadas. */
export function getAuditActionInfo(action: string): AuditActionInfo {
  return ACTION_LABELS[action] ?? { label: action, icon: ActivityIcon, tone: "neutral" };
}

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  dog: "Animal",
  person: "Pessoa",
  occurrence: "Ocorrência",
  permission_template: "Template de permissão",
  bairro: "Bairro",
  occurrence_type: "Tipo de ocorrência",
  public_report: "Denúncia externa",
  rescue_request: "Solicitação de resgate",
};

export function getEntityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

const ENTITY_ID_LABELS: Record<string, string> = {
  user: "ID do usuário",
  dog: "ID do animal",
  person: "ID da pessoa",
  occurrence: "ID da ocorrência",
  permission_template: "ID do template",
  bairro: "ID do bairro",
  occurrence_type: "ID do tipo de ocorrência",
  public_report: "ID da denúncia",
  rescue_request: "ID do resgate",
};

export function getEntityIdLabel(entityType: string): string {
  return ENTITY_ID_LABELS[entityType] ?? "Identificador";
}
