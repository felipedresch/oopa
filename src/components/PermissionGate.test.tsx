import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { PermissionGate } from "@/components/PermissionGate";
import * as permissionsHook from "@/hooks/usePermissions";

describe("PermissionGate", () => {
  it("mostra conteudo quando a permissão e concedida", () => {
    vi.spyOn(permissionsHook, "usePermissions").mockReturnValue({
      user: null,
      can: () => true,
      canAny: () => true,
      isLoading: false,
      isAuthenticated: false,
      moduleMap: undefined,
    });

    render(
      <PermissionGate permission="templates.manage">
        <p>Área administrativa</p>
      </PermissionGate>,
    );

    expect(screen.getByText("Área administrativa")).toBeInTheDocument();
  });

  it("mostra permissão negada quando a permissão falta", () => {
    vi.spyOn(permissionsHook, "usePermissions").mockReturnValue({
      user: null,
      can: () => false,
      canAny: () => false,
      isLoading: false,
      isAuthenticated: false,
      moduleMap: undefined,
    });

    render(
      <PermissionGate permission="templates.manage">
        <p>Área administrativa</p>
      </PermissionGate>,
    );

    expect(screen.getByRole("heading", { name: /permissão negada/i })).toBeInTheDocument();
    expect(screen.queryByText("Área administrativa")).not.toBeInTheDocument();
  });
});
