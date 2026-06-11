import {
  createEmptyModuleMap,
  summarizeModuleMap,
  UI_MODULES,
} from "@/lib/permissions";
import { fixtureModuleMap } from "@/test/fixtures";

describe("permissions ui map", () => {
  it("cria mapa vazio com 7 modulos", () => {
    const map = createEmptyModuleMap();
    expect(UI_MODULES).toHaveLength(7);
    expect(Object.values(map).every((level) => level === "none")).toBe(true);
  });

  it("resume modulos ativos", () => {
    expect(summarizeModuleMap(fixtureModuleMap)).toContain("Caes: Gestao");
    expect(summarizeModuleMap(createEmptyModuleMap())).toBe("Sem acesso a modulos.");
  });
});
