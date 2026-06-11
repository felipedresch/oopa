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

export function forbidden(message = "Voce nao tem permissao para esta acao.") {
  return new DomainError(ERROR_CODES.FORBIDDEN, message);
}

export function notFound(resource: string) {
  return new DomainError(ERROR_CODES.NOT_FOUND, `${resource} nao encontrado.`);
}

export function conflict(message: string) {
  return new DomainError(ERROR_CODES.CONFLICT, message);
}

export function validationError(message: string) {
  return new DomainError(ERROR_CODES.VALIDATION_ERROR, message);
}

export function unauthenticated(message = "Faca login para continuar.") {
  return new DomainError(ERROR_CODES.UNAUTHENTICATED, message);
}

export function userInactive(message = "Sua conta esta inativa.") {
  return new DomainError(ERROR_CODES.USER_INACTIVE, message);
}

export function tokenExpired(message = "Este link expirou. Solicite um novo.") {
  return new DomainError(ERROR_CODES.TOKEN_EXPIRED, message);
}

export function tokenUsed(message = "Este link ja foi utilizado.") {
  return new DomainError(ERROR_CODES.TOKEN_USED, message);
}
