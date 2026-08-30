import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AdoptionFollowupList } from "@/components/AdoptionFollowupList";

const mockUsePermissions = vi.fn();
const mockUsePaginatedQuery = vi.fn();
const mockMutationFn = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> =>
    mockUsePaginatedQuery(),
  useMutation: () => mockMutationFn,
}));

const followup = {
  _id: "followup1",
  dog_id: "dog1",
  pessoa_id: "person1",
  occurrence_id_adocao: "occ1",
  data_prevista: Date.UTC(2026, 5, 1),
  sequencia: 1,
  status: "pendente" as const,
  tentativas: 0,
  dog: {
    _id: "dog1",
    nome: "Luna",
    especie: "cao" as const,
    microchip: "123456789012345",
  },
  pessoa: {
    _id: "person1",
    nome_completo: "Marina Tutora",
    telefone: "51999990000",
    email: "marina@example.com",
  },
  atraso_dias: 3,
};

describe("AdoptionFollowupList", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) =>
        permission === "adoptions.read" || permission === "adoptions.manage",
    });
    mockUsePaginatedQuery.mockReturnValue({
      results: [followup],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    mockMutationFn.mockReset().mockResolvedValue(null);
  });

  it("mostra a fila e registra um contato", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdoptionFollowupList status="pendente" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Luna" })).toBeInTheDocument();
    expect(screen.getByText("Atrasado há 3 dias")).toBeInTheDocument();
    expect(screen.getByText("Pendente")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Registrar contato" }));
    await user.type(
      screen.getByLabelText("Observação"),
      "Tutor confirmou que está tudo bem.",
    );
    await user.click(screen.getByRole("button", { name: "Salvar contato" }));

    expect(mockMutationFn).toHaveBeenCalledWith({
      followupId: "followup1",
      status: "contatado",
      resultado: "Tutor confirmou que está tudo bem.",
    });
  });

  it("não exibe ações de contato para quem só tem leitura", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) => permission === "adoptions.read",
    });

    render(
      <MemoryRouter>
        <AdoptionFollowupList />
      </MemoryRouter>,
    );

    expect(screen.getByText("Luna")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Registrar contato" }),
    ).not.toBeInTheDocument();
  });
});
