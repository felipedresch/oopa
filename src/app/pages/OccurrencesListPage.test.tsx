import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { OccurrencesListPage } from "@/app/pages/OccurrencesListPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUsePaginatedQuery = vi.fn();
const mockUseMutation = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> => mockUsePaginatedQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("OccurrencesListPage", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue([{ _id: "bairro1", nome: "Centro" }]);
    mockUseMutation.mockReturnValue(vi.fn());
  });

  it("mostra acesso negado sem permissao de leitura", () => {
    mockUsePermissions.mockReturnValue({ can: () => false, canAny: () => false });
    mockUsePaginatedQuery.mockReturnValue({
      results: undefined,
      status: "LoadingFirstPage",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <OccurrencesListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista ocorrências com nome do animal e da pessoa", () => {
    mockUsePermissions.mockReturnValue({ can: () => false, canAny: () => true });
    mockUsePaginatedQuery.mockReturnValue({
      results: [
        {
          _id: "occ1",
          dog_id: "dog1",
          dog_nome: "Luna",
          pessoa_id: "pessoa1",
          pessoa_nome: "Paula Tutora",
          type_nome: "Consulta/Visualização",
          categoria: "rotina",
          gravidade: "info",
          data_ocorrencia: Date.UTC(2024, 5, 10),
          descricao: "Consulta de rotina",
          bairro_nome: "Centro",
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <OccurrencesListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Ocorrências" })).toBeInTheDocument();
    expect(screen.getByText("Consulta/Visualização")).toBeInTheDocument();
  });

  it("mostra aba de denúncias pendentes para quem tem public_reports.triage", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({
      can: (permission: string) => permission === "public_reports.triage",
      canAny: () => true,
    });
    mockUsePaginatedQuery.mockReturnValue({
      results: [],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <OccurrencesListPage />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Sem denúncias")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Denúncias pendentes" }));
    expect(screen.getByText("Sem denúncias")).toBeInTheDocument();
  });
});
