import { moduleMapToPermissions } from "@/lib/permission-map";
import { createEmptyModuleMap } from "@/lib/permissions";

describe("permission-map", () => {
  it("converte mapa de módulos em permissões granulares", () => {
    const permissions = moduleMapToPermissions({
      ...createEmptyModuleMap(),
      dogs: "read",
      team: "manage",
    });

    expect(permissions).toContain("dogs.read");
    expect(permissions).toContain("users.invite");
    expect(permissions).toContain("users.deactivate");
  });
});
