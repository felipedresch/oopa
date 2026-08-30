import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { PublicReportsTriagePanel } from "@/components/PublicReportsTriagePanel";

const mockUsePaginatedQuery = vi.fn();
const mockUseQuery = vi.fn();
const mockMutationFn = vi.fn();

vi.mock("convex/react", () => ({
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> => mockUsePaginatedQuery(),
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: () => mockMutationFn,
}));

const baseReport = {
  _id: "report1",
  nome_denunciante: undefined,
  contato: undefined,
  tipo_denuncia: "maus_tratos",
  descricao: "Cão amarrado sem água há dias.",
  bairro_id: undefined,
  bairro_nome: "Centro",
  local_descricao: undefined,
  status: "novo" as const,
  photo_urls: [],
  occurrence_id_gerada: undefined,
  criado_em: Date.UTC(2024, 5, 10),
};

describe("PublicReportsTriagePanel", () => {
  beforeEach(() => {
    mockMutationFn.mockReset().mockResolvedValue("occ1");
    mockUseQuery.mockReturnValue(undefined);
  });

  it("mostra estado vazio quando não há denúncias", () => {
    mockUsePaginatedQuery.mockReturnValue({ results: [], status: "Exhausted", loadMore: vi.fn() });

    render(
      <MemoryRouter>
        <PublicReportsTriagePanel />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sem denúncias")).toBeInTheDocument();
  });

  it("arquiva uma denúncia pendente", async () => {
    const user = userEvent.setup();
    mockUsePaginatedQuery.mockReturnValue({
      results: [baseReport],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PublicReportsTriagePanel />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Arquivar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(mockMutationFn).toHaveBeenCalledWith({ publicReportId: "report1" });
  });

  it("converte uma denúncia em ocorrência sem animal vinculado", async () => {
    const user = userEvent.setup();
    mockUsePaginatedQuery.mockReturnValue({
      results: [baseReport],
      status: "Exhausted",
      loadMore: vi.fn(),
    });

    render(
      <MemoryRouter>
        <PublicReportsTriagePanel />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Converter em ocorrência" }));
    await user.click(screen.getByRole("button", { name: "Converter" }));

    expect(mockMutationFn).toHaveBeenCalledWith({ publicReportId: "report1", dogId: undefined });
  });
});
