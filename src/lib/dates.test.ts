import { dateInputToTimestamp, dayGroupLabel, todayAsDateInput } from "@/lib/dates";

describe("todayAsDateInput", () => {
  it("usa o dia local, não o dia UTC", () => {
    // 30/08/2026 21:30 em UTC-3 já é 31/08 em UTC.
    const localNight = new Date(2026, 7, 30, 21, 30).getTime();
    expect(todayAsDateInput(localNight)).toBe("2026-08-30");
  });
});

describe("dateInputToTimestamp", () => {
  it("converte para o início do dia local, não para meia-noite UTC", () => {
    const start = dateInputToTimestamp("2026-08-30", "start")!;
    expect(new Date(start)).toEqual(new Date(2026, 7, 30, 0, 0, 0, 0));
    // A regressão original: new Date("2026-08-30") caía no dia anterior local.
    expect(new Date(start).getDate()).toBe(30);
  });

  it("converte para o fim do dia local", () => {
    expect(new Date(dateInputToTimestamp("2026-08-30", "end")!)).toEqual(
      new Date(2026, 7, 30, 23, 59, 59, 999),
    );
  });

  it("usa o início do dia por padrão", () => {
    expect(dateInputToTimestamp("2026-08-30")).toBe(
      dateInputToTimestamp("2026-08-30", "start"),
    );
  });

  it("ignora valor vazio ou inválido", () => {
    expect(dateInputToTimestamp("")).toBeUndefined();
    expect(dateInputToTimestamp("30/08/2026")).toBeUndefined();
    expect(dateInputToTimestamp("abc")).toBeUndefined();
  });
});

describe("dayGroupLabel", () => {
  const now = new Date(2026, 7, 30, 10, 0).getTime();

  it("usa Hoje e Ontem para os dias recentes", () => {
    expect(dayGroupLabel(new Date(2026, 7, 30, 23, 0).getTime(), now)).toBe("Hoje");
    expect(dayGroupLabel(new Date(2026, 7, 29, 1, 0).getTime(), now)).toBe("Ontem");
  });

  it("usa a data por extenso sem o ano quando é do ano corrente", () => {
    expect(dayGroupLabel(new Date(2026, 7, 12).getTime(), now)).toBe("12 de agosto");
  });

  it("inclui o ano quando a data é de outro ano", () => {
    expect(dayGroupLabel(new Date(2025, 11, 24).getTime(), now)).toContain("2025");
  });
});
