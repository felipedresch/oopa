import {
  isValidMicrochip,
  MICROCHIP_LENGTH,
  normalizeMicrochip,
} from "../domainValidators";
import { ERROR_CODES } from "../errors";

export const MAX_OCR_IMAGE_BYTES = 1024 * 1024;

const ALLOWED_OCR_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png"]);

export const OCR_CONFIDENCE_THRESHOLD = 0.98;

export type OcrParseResult = {
  candidate: string | null;
  confidence: number;
  needsManualReview: boolean;
};

export function validateOcrImageInput(bytes: Uint8Array, contentType: string): void {
  if (bytes.byteLength === 0) {
    throw new Error("Imagem vazia.");
  }

  if (bytes.byteLength > MAX_OCR_IMAGE_BYTES) {
    throw new Error("A imagem para leitura deve ter no máximo 1 MB.");
  }

  if (!ALLOWED_OCR_IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new Error("Formato inválido para leitura. Use JPEG ou PNG.");
  }
}

export function needsManualReview(candidate: string | null, confidence: number): boolean {
  if (!candidate || !isValidMicrochip(candidate)) {
    return true;
  }

  return confidence < OCR_CONFIDENCE_THRESHOLD;
}

export function parseMicrochipFromOcrText(text: string): OcrParseResult {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { candidate: null, confidence: 0, needsManualReview: true };
  }

  const digitOnly = normalizeMicrochip(normalized);
  if (digitOnly.length === MICROCHIP_LENGTH && /^\d{15}$/.test(digitOnly)) {
    const hasNoise = normalized.replace(/[\d\s]/g, "").length > 0;
    const confidence = hasNoise ? 0.96 : 0.995;
    return {
      candidate: digitOnly,
      confidence,
      needsManualReview: needsManualReview(digitOnly, confidence),
    };
  }

  const matches = [...normalized.matchAll(/(?<!\d)(\d[\d\s]{13,28}\d)(?!\d)/g)];
  const candidates = matches
    .map((match) => normalizeMicrochip(match[1] ?? ""))
    .filter((value) => value.length === MICROCHIP_LENGTH);

  if (candidates.length === 1) {
    const candidate = candidates[0];
    const confidence = 0.94;
    return {
      candidate,
      confidence,
      needsManualReview: needsManualReview(candidate, confidence),
    };
  }

  if (candidates.length > 1) {
    const candidate = candidates[0];
    return {
      candidate,
      confidence: 0.82,
      needsManualReview: true,
    };
  }

  if (digitOnly.length > 0 && digitOnly.length < MICROCHIP_LENGTH) {
    return {
      candidate: digitOnly,
      confidence: 0.4,
      needsManualReview: true,
    };
  }

  return { candidate: null, confidence: 0, needsManualReview: true };
}

export function buildOcrFailureCode(message: string): string {
  if (message.includes("1 MB")) {
    return ERROR_CODES.UPLOAD_REJECTED;
  }
  if (message.includes("Formato inválido")) {
    return ERROR_CODES.UPLOAD_REJECTED;
  }
  return ERROR_CODES.OCR_FAILED;
}
