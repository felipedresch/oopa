"use node";

import { ocrFailed } from "./errors";

async function recognizeWithOpenAi(bytes: Buffer, contentType: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw ocrFailed("OCR não configurado. Informe o microchip manualmente.");
  }

  const base64 = bytes.toString("base64");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Leia apenas o número de 15 dígitos do microchip exibido na tela do leitor RFID. Responda somente com os 15 dígitos, sem espacos ou texto extra.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${contentType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw ocrFailed("Não foi possível processar a foto do leitor.");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) {
    throw ocrFailed("Não consegui ler o microchip na foto.");
  }

  return text;
}

export async function recognizeTextFromImage(
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const provider = process.env.OCR_PROVIDER ?? "openai";

  if (provider === "fixture") {
    const fixtureText = process.env.OCR_FIXTURE_TEXT;
    if (!fixtureText) {
      throw ocrFailed("OCR de teste sem texto configurado.");
    }
    return fixtureText;
  }

  if (provider === "openai") {
    return await recognizeWithOpenAi(bytes, contentType);
  }

  throw ocrFailed("Provedor OCR inválido.");
}
