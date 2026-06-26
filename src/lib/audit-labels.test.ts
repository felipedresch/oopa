import { describe, expect, it } from "vitest";

import {
  AUDIT_TONE_CLASS,
  getAuditActionInfo,
  getEntityIdLabel,
  getEntityLabel,
} from "@/lib/audit-labels";

describe("getAuditActionInfo", () => {
  it("mapeia acoes conhecidas para rotulo PT-BR, icone e tom", () => {
    const info = getAuditActionInfo("dogs.create");
    expect(info.label).toBe("Animal cadastrado");
    expect(info.tone).toBe("create");
    expect(typeof info.icon).toBe("object");
    expect(AUDIT_TONE_CLASS[info.tone]).toBeTruthy();
  });

  it("usa fallback neutro para acoes nao mapeadas", () => {
    const info = getAuditActionInfo("foo.bar");
    expect(info.label).toBe("foo.bar");
    expect(info.tone).toBe("neutral");
  });
});

describe("getEntityLabel / getEntityIdLabel", () => {
  it("traduz entidades conhecidas", () => {
    expect(getEntityLabel("dog")).toBe("Animal");
    expect(getEntityLabel("tutor")).toBe("Tutor");
    expect(getEntityIdLabel("dog")).toBe("ID do animal");
  });

  it("faz fallback para entidades desconhecidas", () => {
    expect(getEntityLabel("xpto")).toBe("xpto");
    expect(getEntityIdLabel("xpto")).toBe("Identificador");
  });
});
