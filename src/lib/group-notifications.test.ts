import { describe, expect, it } from "vitest";

import { getDateGroupLabel, groupByDate } from "@/lib/group-notifications";

describe("group-notifications", () => {
  it("agrupa notificacoes por dia", () => {
    const now = new Date("2026-06-10T12:00:00").getTime();
    const groups = groupByDate(
      [
        { criado_em: now, id: "a" },
        { criado_em: now - 86_400_000, id: "b" },
      ],
      now,
    );

    expect(groups).toHaveLength(2);
    expect(groups[0]?.label).toBe("Hoje");
    expect(groups[1]?.label).toBe("Ontem");
  });

  it("formata data antiga", () => {
    const label = getDateGroupLabel(new Date("2026-01-05T10:00:00").getTime(), Date.now());
    expect(label).toMatch(/janeiro de 2026/i);
  });
});
