import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { RescueDetailPage } from "@/app/pages/RescueDetailPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUpdateStatus = vi.fn();
const mockSetOngDescription = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (mutationRef: { toString: () => string }): ReturnType<typeof mockUseMutation> => {
    void mutationRef;
    return mockUseMutation();
  },
}));

const baseRescue = {
  _id: "rescue1",
  tipo: "atropelado",
  gravidade: "alta" as const,
  descricao_solicitante: "Cão atropelado na avenida principal.",
  status: "aberta" as const,
  bairro_id: undefined,
  bairro_nome: "Centro",
  dog_id: undefined,
  dog_nome: undefined,
  solicitante_id: undefined,
  solicitante_nome: undefined,
  criado_em: Date.UTC(2024, 5, 10),
  local_descricao: undefined,
  descricao_ong: undefined,
  fotos_urls: [],
  criado_por: "user1",
  atualizado_em: undefined,
};

function renderPage(id = "rescue1") {
  return render(
    <MemoryRouter initialEntries={[`/rescues/${id}`]}>
      <Routes>
        <Route element={<RescueDetailPage />} path="/rescues/:id" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RescueDetailPage", () => {
  beforeEach(() => {
    mockUpdateStatus.mockReset().mockResolvedValue(null);
    mockSetOngDescription.mockReset().mockResolvedValue(null);
    let call = 0;
    mockUseMutation.mockImplementation(() => {
      call += 1;
      return call % 2 === 1 ? mockUpdateStatus : mockSetOngDescription;
    });
  });

  it("mostra acesso negado sem rescues.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });
    mockUseQuery.mockReturnValue(undefined);

    renderPage();

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("mostra detalhe sem controles de gestão para quem não tem rescues.manage", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) => permission === "rescues.read",
    });
    mockUseQuery.mockReturnValue(baseRescue);

    renderPage();

    expect(screen.getByText("Cão atropelado na avenida principal.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
  });

  it("permite atualizar status para quem tem rescues.manage", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue(baseRescue);

    renderPage();

    await user.selectOptions(screen.getByLabelText("Status"), "em_atendimento");
    await user.click(screen.getByRole("button", { name: "Salvar status" }));

    expect(mockUpdateStatus).toHaveBeenCalledWith({
      rescueId: "rescue1",
      status: "em_atendimento",
    });
  });
});
