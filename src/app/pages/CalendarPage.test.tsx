import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { CalendarPage } from "@/app/pages/CalendarPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]): ReturnType<typeof mockUseQuery> => mockUseQuery(...args),
}));

const EVENTS = [
  {
    data: new Date(2026, 3, 10, 9).getTime(),
    tipo: "lembrete_adocao",
    titulo: "Acompanhamento pós-adoção — Luna",
    entidade_tipo: "adoption_followup",
    entidade_id: "followup1",
    status: "pendente",
  },
  {
    data: new Date(2026, 3, 12, 14).getTime(),
    tipo: "castracao",
    titulo: "Castração — Bolinha",
    entidade_tipo: "castration_request",
    entidade_id: "castration1",
    status: "agendada",
  },
];

function allowAll() {
  return { can: () => true, canAny: () => true };
}

beforeEach(() => {
  mockUsePermissions.mockReset();
  mockUseQuery.mockReset();
});

describe("CalendarPage", () => {
  it("mostra permissão negada sem nenhuma fonte legível", () => {
    mockUsePermissions.mockReturnValue({ can: () => false, canAny: () => false });
    mockUseQuery.mockReturnValue(undefined);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("agrupa eventos por dia e liga cada um à entidade de origem", () => {
    mockUsePermissions.mockReturnValue(allowAll());
    mockUseQuery.mockReturnValue(EVENTS);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("link", { name: /Acompanhamento pós-adoção — Luna/ }),
    ).toHaveAttribute("href", "/adoptions/followups");
    expect(screen.getByRole("link", { name: /Castração — Bolinha/ })).toHaveAttribute(
      "href",
      "/castration/castration1",
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("mostra estado vazio quando não há eventos no período", () => {
    mockUsePermissions.mockReturnValue(allowAll());
    mockUseQuery.mockReturnValue([]);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nenhum evento no período")).toBeInTheDocument();
  });

  it("aplica o preset de período nos argumentos da query", async () => {
    mockUsePermissions.mockReturnValue(allowAll());
    mockUseQuery.mockReturnValue(EVENTS);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Mês passado" }));

    const lastArgs = mockUseQuery.mock.calls.at(-1)?.[1] as {
      inicio: number;
      fim: number;
    };
    const reference = new Date();
    expect(new Date(lastArgs.inicio).getMonth()).toBe(
      new Date(reference.getFullYear(), reference.getMonth() - 1, 1).getMonth(),
    );
    expect(lastArgs.inicio).toBeLessThan(lastArgs.fim);
  });

  it("mostra os campos de data ao escolher período personalizado", async () => {
    mockUsePermissions.mockReturnValue(allowAll());
    mockUseQuery.mockReturnValue(EVENTS);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Personalizado" }));

    expect(screen.getByLabelText("De")).toBeInTheDocument();
    expect(screen.getByLabelText("Até")).toBeInTheDocument();
  });

  it("envia os tipos selecionados nos chips de filtro", async () => {
    mockUsePermissions.mockReturnValue(allowAll());
    mockUseQuery.mockReturnValue(EVENTS);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Castração" }));
    expect(
      (mockUseQuery.mock.calls.at(-1)?.[1] as { tipos?: string[] }).tipos,
    ).toEqual(["castracao"]);

    await userEvent.click(screen.getByRole("button", { name: "Consulta" }));
    expect(
      (mockUseQuery.mock.calls.at(-1)?.[1] as { tipos?: string[] }).tipos,
    ).toEqual(["castracao", "consulta"]);

    await userEvent.click(screen.getByRole("button", { name: "Castração" }));
    expect(
      (mockUseQuery.mock.calls.at(-1)?.[1] as { tipos?: string[] }).tipos,
    ).toEqual(["consulta"]);
  });

  it("oferece apenas os tipos das fontes que o usuário pode ler", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) => permission === "castration.read",
      canAny: () => true,
    });
    mockUseQuery.mockReturnValue([]);

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>,
    );

    const chips = screen.getByRole("group", { name: "Tipo de lembrete" });
    expect(within(chips).getByRole("button", { name: "Castração" })).toBeInTheDocument();
    expect(
      within(chips).queryByRole("button", { name: "Lembrete de adoção" }),
    ).not.toBeInTheDocument();
    expect(within(chips).queryByRole("button", { name: "Consulta" })).not.toBeInTheDocument();
  });
});
