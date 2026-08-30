import { XMLParser } from "fast-xml-parser";

export type NfeParseResult = {
  sucesso: boolean;
  numero: string | null;
  data_emissao: number | null;
  valor_total: number | null;
  mensagem: string | null;
};

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  removeNSPrefix: true,
  trimValues: true,
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function firstValue(value: unknown): unknown {
  return Array.isArray(value) ? value[0] : value;
}

function findFirstByKey(root: unknown, key: string): unknown {
  const value = firstValue(root);
  if (!isRecord(value)) {
    return undefined;
  }

  if (key in value) {
    return firstValue(value[key]);
  }

  for (const child of Object.values(value)) {
    const found = findFirstByKey(child, key);
    if (found !== undefined) {
      return found;
    }
  }

  return undefined;
}

function textValue(value: unknown): string | null {
  const normalized = firstValue(value);
  if (typeof normalized === "string" || typeof normalized === "number") {
    const text = String(normalized).trim();
    return text || null;
  }
  if (isRecord(normalized) && "#text" in normalized) {
    return textValue(normalized["#text"]);
  }
  return null;
}

function parseMoney(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes(",")
    ? value.replace(/\./g, "").replace(",", ".")
    : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseDate(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseNfeXml(xml: string): NfeParseResult {
  try {
    const document = parser.parse(xml) as unknown;
    const infNfe = findFirstByKey(document, "infNFe") ?? document;
    const ide = findFirstByKey(infNfe, "ide");
    const total = findFirstByKey(infNfe, "total");
    const icmsTotal = findFirstByKey(total, "ICMSTot");

    const numero = textValue(isRecord(ide) ? ide.nNF : undefined);
    const dataEmissao = parseDate(
      textValue(isRecord(ide) ? (ide.dhEmi ?? ide.dEmi) : undefined),
    );
    const valorTotal = parseMoney(
      textValue(isRecord(icmsTotal) ? icmsTotal.vNF : undefined),
    );

    if (!numero && dataEmissao === null && valorTotal === null) {
      return {
        sucesso: false,
        numero: null,
        data_emissao: null,
        valor_total: null,
        mensagem: "Não encontramos os dados esperados de uma NFe neste arquivo.",
      };
    }

    return {
      sucesso: true,
      numero,
      data_emissao: dataEmissao,
      valor_total: valorTotal,
      mensagem: null,
    };
  } catch {
    return {
      sucesso: false,
      numero: null,
      data_emissao: null,
      valor_total: null,
      mensagem: "Não foi possível ler este XML. Preencha os dados da nota manualmente.",
    };
  }
}
