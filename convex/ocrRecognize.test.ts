import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recognizeTextFromImage } from "./ocrRecognize";

const originalProvider = process.env.OCR_PROVIDER;
const originalApiKey = process.env.OCR_SPACE_API_KEY;
const originalApiUrl = process.env.OCR_SPACE_API_URL;

beforeEach(() => {
  process.env.OCR_PROVIDER = "ocrspace";
  process.env.OCR_SPACE_API_KEY = "test-key";
  delete process.env.OCR_SPACE_API_URL;
});

afterEach(() => {
  process.env.OCR_PROVIDER = originalProvider;
  process.env.OCR_SPACE_API_KEY = originalApiKey;
  process.env.OCR_SPACE_API_URL = originalApiUrl;
  vi.restoreAllMocks();
});

function providerResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("recognizeTextFromImage com OCR.space", () => {
  it("envia multipart conforme a documentação e retorna o texto reconhecido", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse({
        OCRExitCode: 1,
        IsErroredOnProcessing: false,
        ParsedResults: [{ FileParseExitCode: 1, ParsedText: "956 000 013 141 707" }],
      }),
    );

    const result = await recognizeTextFromImage(Buffer.from([1, 2, 3]), "image/jpeg");

    expect(result).toBe("956 000 013 141 707");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.ocr.space/parse/image");

    const request = fetchSpy.mock.calls[0]?.[1];
    expect(request?.method).toBe("POST");
    expect(request?.headers).toEqual({ apikey: "test-key" });
    expect(request?.body).toBeInstanceOf(FormData);
    const formData = request?.body as FormData;
    expect(formData.get("OCREngine")).toBe("2");
    expect(formData.get("detectOrientation")).toBe("true");
    expect(formData.get("scale")).toBe("true");
    expect(formData.get("filetype")).toBe("JPG");
  });

  it("retorna erro específico sem repetir quando o limite foi atingido", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      providerResponse(
        {
          OCRExitCode: 4,
          IsErroredOnProcessing: true,
          ErrorMessage: ["Rate limit reached"],
        },
        429,
      ),
    );

    await expect(
      recognizeTextFromImage(Buffer.from([1]), "image/jpeg"),
    ).rejects.toMatchObject({ data: { code: "OCR_RATE_LIMITED" } });
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("repete uma vez em indisponibilidade transitória e preserva o fallback manual", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() =>
      Promise.resolve(
        providerResponse(
          {
            OCRExitCode: 4,
            IsErroredOnProcessing: true,
            ErrorMessage: ["Service unavailable"],
          },
          503,
        ),
      ),
    );

    await expect(
      recognizeTextFromImage(Buffer.from([1]), "image/jpeg"),
    ).rejects.toMatchObject({ data: { code: "OCR_UNAVAILABLE" } });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("falha sem chamar a rede quando a chave não está configurada", async () => {
    delete process.env.OCR_SPACE_API_KEY;
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(
      recognizeTextFromImage(Buffer.from([1]), "image/jpeg"),
    ).rejects.toMatchObject({ data: { code: "OCR_NOT_CONFIGURED" } });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
