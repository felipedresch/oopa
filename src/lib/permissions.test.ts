import {
  createEmptyModuleMap,
  summarizeModuleMap,
  UI_MODULES,
} from "@/lib/permissions";
import { fixtureModuleMap } from "@/test/fixtures";

describe("permissions ui map", () => {
  it("cria mapa vazio com 7 módulos", () => {
    const map = createEmptyModuleMap();
    expect(UI_MODULES).toHaveLength(7);
    expect(Object.values(map).every((level) => level === "none")).toBe(true);
  });

  it("resume módulos ativos", () => {
    expect(summarizeModuleMap(fixtureModuleMap)).toContain("Cães: Gestão");
    expect(summarizeModuleMap(createEmptyModuleMap())).toBe("Sem acesso a módulos.");
  });
});
