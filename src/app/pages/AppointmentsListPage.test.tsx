import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppointmentsListPage } from "@/app/pages/AppointmentsListPage";

const mockUsePermissions = vi.fn();
const mockUsePaginatedQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> => mockUsePaginatedQuery(),
}));

describe("AppointmentsListPage", () => {
  beforeEach(() => {
    mockUsePaginatedQuery.mockReset();
    mockUsePaginatedQuery
      .mockReturnValueOnce({ results: [], status: "Exhausted", loadMore: vi.fn() })
      .mockReturnValueOnce({
        results: [
          {
            _id: "appointment1",
            data_atendimento: Date.UTC(2026, 7, 30, 13),
            tipo_atendimento: "consulta",
            status: "agendado",
            historico: "Avaliação inicial",
            valor_total: 80,
            nota_fiscal_url: null,
            dog: { _id: "dog1", nome: "Pipoca", especie: "cao", microchip: undefined },
            solicitante: null,
            veterinario: { _id: "user1", nome: "Dra. Ana", email: undefined },
          },
        ],
        status: "Exhausted",
        loadMore: vi.fn(),
      });
  });

  it("mostra acesso negado sem appointments.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <AppointmentsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista atendimento, status e ação de novo atendimento", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) => permission === "appointments.read" || permission === "appointments.create",
    });

    render(
      <MemoryRouter>
        <AppointmentsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Atendimentos" })).toBeInTheDocument();
    expect(screen.getByText("Pipoca")).toBeInTheDocument();
    expect(screen.getAllByText("Agendado").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: "Novo atendimento" })).toHaveAttribute(
      "href",
      "/appointments/new",
    );
  });
});
