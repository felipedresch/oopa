import {
  calendarEventLink,
  groupEventsByDay,
  resolveCustomPeriod,
  resolvePeriodPreset,
  type CalendarEvent,
} from "@/lib/calendar";

function event(overrides: Partial<CalendarEvent>): CalendarEvent {
  return {
    data: new Date(2026, 3, 10, 9).getTime(),
    tipo: "consulta",
    titulo: "Consulta — Pipoca",
    entidade_tipo: "service_appointment",
    entidade_id: "appointment1",
    status: "agendado",
    ...overrides,
  };
}

describe("resolvePeriodPreset", () => {
  const now = new Date(2026, 3, 15, 10, 30).getTime();

  it("resolve este mês do primeiro ao último dia", () => {
    const { inicio, fim } = resolvePeriodPreset("este_mes", now);
    expect(new Date(inicio)).toEqual(new Date(2026, 3, 1, 0, 0, 0, 0));
    expect(new Date(fim)).toEqual(new Date(2026, 3, 30, 23, 59, 59, 999));
  });

  it("resolve mês passado", () => {
    const { inicio, fim } = resolvePeriodPreset("mes_passado", now);
    expect(new Date(inicio)).toEqual(new Date(2026, 2, 1, 0, 0, 0, 0));
    expect(new Date(fim)).toEqual(new Date(2026, 2, 31, 23, 59, 59, 999));
  });

  it("resolve últimos 30 dias incluindo hoje", () => {
    const { inicio, fim } = resolvePeriodPreset("ultimos_30", now);
    expect(new Date(inicio)).toEqual(new Date(2026, 2, 17, 0, 0, 0, 0));
    expect(new Date(fim)).toEqual(new Date(2026, 3, 15, 23, 59, 59, 999));
  });
});

describe("resolveCustomPeriod", () => {
  it("converte datas do date picker em início e fim do dia", () => {
    const periodo = resolveCustomPeriod("2026-04-01", "2026-04-10");
    expect(new Date(periodo.inicio!)).toEqual(new Date(2026, 3, 1, 0, 0, 0, 0));
    expect(new Date(periodo.fim!)).toEqual(new Date(2026, 3, 10, 23, 59, 59, 999));
  });

  it("ignora datas vazias", () => {
    expect(resolveCustomPeriod("", "")).toEqual({});
  });
});

describe("calendarEventLink", () => {
  it("aponta para a entidade de origem de cada fonte", () => {
    expect(calendarEventLink(event({}))).toBe("/appointments/appointment1");
    expect(
      calendarEventLink(
        event({ entidade_tipo: "castration_request", entidade_id: "castration1" }),
      ),
    ).toBe("/castration/castration1");
    expect(
      calendarEventLink(
        event({ entidade_tipo: "adoption_followup", entidade_id: "followup1" }),
      ),
    ).toBe("/adoptions/followups");
  });
});

describe("groupEventsByDay", () => {
  it("agrupa por dia em ordem cronológica", () => {
    const groups = groupEventsByDay([
      event({ data: new Date(2026, 3, 11, 8).getTime(), entidade_id: "b" }),
      event({ data: new Date(2026, 3, 10, 16).getTime(), entidade_id: "a" }),
      event({ data: new Date(2026, 3, 10, 9).getTime(), entidade_id: "c" }),
    ]);

    expect(groups).toHaveLength(2);
    expect(new Date(groups[0].dia)).toEqual(new Date(2026, 3, 10, 0, 0, 0, 0));
    expect(groups[0].eventos.map((item) => item.entidade_id)).toEqual(["c", "a"]);
    expect(groups[1].eventos.map((item) => item.entidade_id)).toEqual(["b"]);
  });
});
