import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { CastrationsListPage } from "@/app/pages/CastrationsListPage";

const mockUsePermissions = vi.fn();
const mockUsePaginatedQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> => mockUsePaginatedQuery(),
}));

describe("CastrationsListPage", () => {
  it("mostra acesso negado sem castration.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });
    mockUsePaginatedQuery.mockReturnValue({
      results: undefined,
      status: "LoadingFirstPage",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CastrationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista fila ordenada com posicao e botao de nova solicitacao", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) =>
        permission === "castration.read" || permission === "castration.create",
    });
    mockUsePaginatedQuery.mockReturnValue({
      results: [
        {
          _id: "castration1",
          pessoa_id: "person1",
          pessoa_nome: "Solicitante",
          dog_id: undefined,
          dog_nome: undefined,
          animal_descricao: { nome: "Bolinha", especie: "cao", porte: "pequeno", sexo: "femea" },
          data_solicitacao: Date.UTC(2024, 5, 10),
          data_agendada: undefined,
          status: "aguardando",
          observacoes: undefined,
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CastrationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Castração" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nova solicitação" })).toBeInTheDocument();
    expect(screen.getByText("Bolinha · Cão")).toBeInTheDocument();
  });

  it("mostra estado vazio sem solicitacoes", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUsePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <CastrationsListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nenhuma solicitação encontrada")).toBeInTheDocument();
  });
});
