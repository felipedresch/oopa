import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { ReportsPage } from "@/app/pages/ReportsPage";

const mockUsePermissions = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

describe("ReportsPage", () => {
  it("mostra permissão negada sem reports.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista um card por relatório com link para a tela", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Castrações/ })).toHaveAttribute(
      "href",
      "/reports/castracoes",
    );
    expect(
      screen.getByRole("link", { name: /Atendimentos veterinários/ }),
    ).toHaveAttribute("href", "/reports/atendimentos_veterinarios");
    expect(screen.getAllByRole("link")).toHaveLength(5);
  });
});
