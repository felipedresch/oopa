import {
  boundaryFromDateInput,
  findReport,
  REPORTS,
  reportCsvFileName,
} from "@/lib/reports";

describe("catálogo de relatórios", () => {
  it("cobre os cinco relatórios pedidos pela ONG", () => {
    expect(REPORTS.map((report) => report.id)).toEqual([
      "castracoes",
      "denuncias",
      "atendimentos_urgentes",
      "atendimentos_veterinarios",
      "adocoes",
    ]);
  });

  it("declara os filtros de cada relatório", () => {
    expect(findReport("castracoes")?.filtros).toEqual(["periodo"]);
    expect(findReport("denuncias")?.filtros).toEqual(["periodo", "bairro"]);
    expect(findReport("atendimentos_veterinarios")?.filtros).toEqual([
      "periodo",
      "animal",
      "pessoa",
    ]);
  });

  it("retorna undefined para id desconhecido", () => {
    expect(findReport("inexistente")).toBeUndefined();
    expect(findReport(undefined)).toBeUndefined();
  });
});

describe("boundaryFromDateInput", () => {
  it("converte para início e fim do dia local", () => {
    expect(new Date(boundaryFromDateInput("2026-04-01", "start")!)).toEqual(
      new Date(2026, 3, 1, 0, 0, 0, 0),
    );
    expect(new Date(boundaryFromDateInput("2026-04-10", "end")!)).toEqual(
      new Date(2026, 3, 10, 23, 59, 59, 999),
    );
  });

  it("ignora valor vazio ou inválido", () => {
    expect(boundaryFromDateInput("", "start")).toBeUndefined();
    expect(boundaryFromDateInput("abc", "end")).toBeUndefined();
  });
});

describe("reportCsvFileName", () => {
  it("usa o id do relatório e a data", () => {
    expect(reportCsvFileName("castracoes", Date.UTC(2026, 3, 10, 12))).toBe(
      "relatorio-castracoes-2026-04-10.csv",
    );
  });
});
