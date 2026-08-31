"use node";

import {
  ocrFailed,
  ocrNotConfigured,
  ocrRateLimited,
  ocrUnavailable,
} from "./errors";

const DEFAULT_OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
const OCR_SPACE_ENGINE = "2";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REQUEST_ATTEMPTS = 2;
const TRANSIENT_HTTP_STATUSES = new Set([408, 425, 500, 502, 503, 504]);

type OcrSpaceResult = {
  parsedText: string;
  fileParseExitCode: number | null;
};

type OcrSpacePayload = {
  exitCode: number | null;
  isErrored: boolean;
  messages: string[];
  results: OcrSpaceResult[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function collectMessages(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectMessages);
  }
  return [];
}

function parseOcrSpacePayload(value: unknown): OcrSpacePayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const messages = [
    ...collectMessages(value.ErrorMessage),
    ...collectMessages(value.ErrorDetails),
  ];
  const results: OcrSpaceResult[] = [];

  if (Array.isArray(value.ParsedResults)) {
    for (const item of value.ParsedResults) {
      if (!isRecord(item)) {
        continue;
      }
      const parsedText = typeof item.ParsedText === "string" ? item.ParsedText.trim() : "";
      results.push({
        parsedText,
        fileParseExitCode: toNumber(item.FileParseExitCode),
      });
      messages.push(...collectMessages(item.ErrorMessage), ...collectMessages(item.ErrorDetails));
    }
  }

  return {
    exitCode: toNumber(value.OCRExitCode),
    isErrored: value.IsErroredOnProcessing === true,
    messages,
    results,
  };
}

function looksRateLimited(messages: string[]): boolean {
  return messages.some((message) =>
    /rate.?limit|quota|too many requests|daily limit|monthly limit|maximum.*requests/i.test(
      message,
    ),
  );
}

function looksLikeInvalidKey(messages: string[]): boolean {
  return messages.some((message) =>
    /api.?key|apikey|unauthori[sz]ed|invalid key|not authorized/i.test(message),
  );
}

function createRequestBody(bytes: Buffer, contentType: string): FormData {
  const fileType = contentType === "image/png" ? "PNG" : "JPG";
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([Uint8Array.from(bytes)], { type: contentType }),
    `microchip.${fileType.toLowerCase()}`,
  );
  formData.append("language", "auto");
  formData.append("isOverlayRequired", "false");
  formData.append("detectOrientation", "true");
  formData.append("scale", "true");
  formData.append("filetype", fileType);
  formData.append("OCREngine", OCR_SPACE_ENGINE);
  return formData;
}

async function requestOcrSpace(
  endpoint: string,
  apiKey: string,
  bytes: Buffer,
  contentType: string,
): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { apikey: apiKey },
        body: createRequestBody(bytes, contentType),
        signal: controller.signal,
      });

      if (
        TRANSIENT_HTTP_STATUSES.has(response.status) &&
        attempt < MAX_REQUEST_ATTEMPTS
      ) {
        await response.body?.cancel();
        continue;
      }
      return response;
    } catch {
      if (attempt === MAX_REQUEST_ATTEMPTS) {
        break;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw ocrUnavailable();
}

function throwProviderFailure(status: number, payload: OcrSpacePayload | null): never {
  const messages = payload?.messages ?? [];

  if (status === 429 || looksRateLimited(messages)) {
    throw ocrRateLimited();
  }
  if (status === 401 || status === 403 || looksLikeInvalidKey(messages)) {
    throw ocrNotConfigured();
  }
  if (TRANSIENT_HTTP_STATUSES.has(status)) {
    throw ocrUnavailable();
  }
  throw ocrFailed(
    "Não foi possível processar a foto do leitor. Confira a imagem ou digite o número manualmente.",
  );
}

async function recognizeWithOcrSpace(bytes: Buffer, contentType: string): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY?.trim();
  if (!apiKey) {
    throw ocrNotConfigured();
  }

  const endpoint = process.env.OCR_SPACE_API_URL?.trim() || DEFAULT_OCR_SPACE_ENDPOINT;
  const response = await requestOcrSpace(endpoint, apiKey, bytes, contentType);

  let payload: OcrSpacePayload | null = null;
  try {
    payload = parseOcrSpacePayload(await response.json());
  } catch {
    if (response.ok) {
      throw ocrUnavailable();
    }
  }

  if (!response.ok) {
    throwProviderFailure(response.status, payload);
  }
  if (!payload) {
    throw ocrUnavailable();
  }

  const text = payload.results
    .map((result) => result.parsedText)
    .filter(Boolean)
    .join("\n")
    .trim();
  const timedOut = payload.results.some((result) => result.fileParseExitCode === -20);

  if (looksRateLimited(payload.messages)) {
    throw ocrRateLimited();
  }
  if (looksLikeInvalidKey(payload.messages)) {
    throw ocrNotConfigured();
  }
  if (timedOut) {
    throw ocrUnavailable();
  }
  if (payload.isErrored || (payload.exitCode !== null && payload.exitCode >= 3)) {
    throw ocrFailed(
      "Não consegui ler o microchip na foto. Confira a imagem ou digite o número manualmente.",
    );
  }
  if (!text) {
    throw ocrFailed(
      "Não consegui ler o microchip na foto. Confira a imagem ou digite o número manualmente.",
    );
  }

  return text;
}

export async function recognizeTextFromImage(
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const provider = process.env.OCR_PROVIDER ?? "ocrspace";

  if (provider === "fixture") {
    const fixtureText = process.env.OCR_FIXTURE_TEXT;
    if (!fixtureText) {
      throw ocrFailed("OCR de teste sem texto configurado.");
    }
    return fixtureText;
  }

  if (provider === "ocrspace") {
    return await recognizeWithOcrSpace(bytes, contentType);
  }

  throw ocrNotConfigured("Provedor OCR inválido. Informe o microchip manualmente.");
}
