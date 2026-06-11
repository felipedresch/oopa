import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { PermissionGate } from "@/components/PermissionGate";
import * as permissionsHook from "@/hooks/usePermissions";

describe("PermissionGate", () => {
  it("mostra conteudo quando a permissao e concedida", () => {
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
        <p>Area administrativa</p>
      </PermissionGate>,
    );

    expect(screen.getByText("Area administrativa")).toBeInTheDocument();
  });

  it("mostra permissao negada quando a permissao falta", () => {
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
        <p>Area administrativa</p>
      </PermissionGate>,
    );

    expect(screen.getByRole("heading", { name: /permissao negada/i })).toBeInTheDocument();
    expect(screen.queryByText("Area administrativa")).not.toBeInTheDocument();
  });
});
