import { ConvexError } from "convex/values";

export const ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  USER_INACTIVE: "USER_INACTIVE",
  FORBIDDEN: "FORBIDDEN",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_USED: "TOKEN_USED",
  UPLOAD_REJECTED: "UPLOAD_REJECTED",
  OCR_FAILED: "OCR_FAILED",
  OCR_NOT_CONFIGURED: "OCR_NOT_CONFIGURED",
  OCR_RATE_LIMITED: "OCR_RATE_LIMITED",
  OCR_UNAVAILABLE: "OCR_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

type DomainErrorData = {
  code: ErrorCode;
  message: string;
};

export class DomainError extends ConvexError<DomainErrorData> {
  constructor(code: ErrorCode, message: string) {
    super({ code, message });
  }
}

export function forbidden(message = "Você não tem permissão para está ação.") {
  return new DomainError(ERROR_CODES.FORBIDDEN, message);
}

export function notFound(resource: string) {
  return new DomainError(ERROR_CODES.NOT_FOUND, `${resource} não encontrado.`);
}

export function conflict(message: string) {
  return new DomainError(ERROR_CODES.CONFLICT, message);
}

export function validationError(message: string) {
  return new DomainError(ERROR_CODES.VALIDATION_ERROR, message);
}

export function unauthenticated(message = "Faça login para continuar.") {
  return new DomainError(ERROR_CODES.UNAUTHENTICATED, message);
}

export function userInactive(message = "Sua conta está inativa.") {
  return new DomainError(ERROR_CODES.USER_INACTIVE, message);
}

export function tokenExpired(message = "Este link expirou. Solicite um novo.") {
  return new DomainError(ERROR_CODES.TOKEN_EXPIRED, message);
}

export function tokenUsed(message = "Este link já foi utilizado.") {
  return new DomainError(ERROR_CODES.TOKEN_USED, message);
}

export function uploadRejected(message: string) {
  return new DomainError(ERROR_CODES.UPLOAD_REJECTED, message);
}

export function ocrFailed(message = "Não foi possível ler o microchip na foto.") {
  return new DomainError(ERROR_CODES.OCR_FAILED, message);
}

export function ocrNotConfigured(
  message = "Leitura por foto não configurada. Informe o microchip manualmente.",
) {
  return new DomainError(ERROR_CODES.OCR_NOT_CONFIGURED, message);
}

export function ocrRateLimited(
  message = "O limite de leituras por foto foi atingido. Informe o microchip manualmente e tente novamente mais tarde.",
) {
  return new DomainError(ERROR_CODES.OCR_RATE_LIMITED, message);
}

export function ocrUnavailable(
  message = "A leitura por foto está temporariamente indisponível. Informe o microchip manualmente.",
) {
  return new DomainError(ERROR_CODES.OCR_UNAVAILABLE, message);
}
