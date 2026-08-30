import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { CastrationDetailPage } from "@/app/pages/CastrationDetailPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUpdateDataSolicitacao = vi.fn();
const mockUpdateStatus = vi.fn();
const mockMarkRealizada = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

const baseRequest = {
  _id: "castration1",
  pessoa_id: "person1",
  pessoa_nome: "Solicitante Teste",
  dog_id: undefined,
  dog_nome: undefined,
  animal_descricao: {
    nome: "Bolinha",
    especie: "cao" as const,
    porte: "pequeno" as const,
    sexo: "femea" as const,
    cor: undefined,
  },
  data_solicitacao: Date.UTC(2024, 5, 10),
  data_agendada: undefined,
  status: "aguardando" as const,
  observacoes: undefined,
};

function renderPage(id = "castration1") {
  return render(
    <MemoryRouter initialEntries={[`/castration/${id}`]}>
      <Routes>
        <Route element={<CastrationDetailPage />} path="/castration/:id" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CastrationDetailPage", () => {
  beforeEach(() => {
    mockUpdateDataSolicitacao.mockReset().mockResolvedValue(null);
    mockUpdateStatus.mockReset().mockResolvedValue(null);
    mockMarkRealizada.mockReset().mockResolvedValue("dog1");
    let call = 0;
    mockUseMutation.mockImplementation(() => {
      call += 1;
      const index = call % 3;
      if (index === 1) return mockUpdateDataSolicitacao;
      if (index === 2) return mockUpdateStatus;
      return mockMarkRealizada;
    });
  });

  it("mostra acesso negado sem castration.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });
    mockUseQuery.mockReturnValue(undefined);

    renderPage();

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("mostra detalhe sem controles de gestão para quem não tem castration.manage", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) => permission === "castration.read",
    });
    mockUseQuery.mockReturnValue(baseRequest);

    renderPage();

    expect(screen.getByText("Solicitante Teste")).toBeInTheDocument();
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
  });

  it("permite atualizar status para quem tem castration.manage", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue(baseRequest);

    renderPage();

    await user.selectOptions(screen.getByLabelText("Status"), "cancelada");
    await user.click(screen.getByRole("button", { name: "Salvar status" }));

    expect(mockUpdateStatus).toHaveBeenCalledWith(
      expect.objectContaining({ castrationId: "castration1", status: "cancelada" }),
    );
  });

  it("bloqueia agendar sem data e mostra o campo antes do botão de salvar", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue(baseRequest);

    renderPage();

    await user.selectOptions(screen.getByLabelText("Status"), "agendada");

    expect(screen.getByLabelText("Data agendada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar status" })).toBeDisabled();
    expect(
      screen.getByText("Informe a data para a castração aparecer no calendário."),
    ).toBeInTheDocument();

    // A data precisa vir antes do botão, senão passa despercebida.
    const campoData = screen.getByLabelText("Data agendada");
    const salvar = screen.getByRole("button", { name: "Salvar status" });
    expect(campoData.compareDocumentPosition(salvar)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("permite reagendar mesmo sem trocar o status", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue({
      ...baseRequest,
      status: "agendada" as const,
      data_agendada: Date.UTC(2024, 5, 20, 15),
    });

    renderPage();

    // Sem alterar nada ainda, salvar continua desabilitado.
    expect(screen.getByRole("button", { name: "Salvar status" })).toBeDisabled();
    expect(screen.getByLabelText("Data agendada")).toBeInTheDocument();
  });

  it("marca como realizada sem vincular animal existente", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue(baseRequest);

    renderPage();

    await user.click(screen.getByRole("button", { name: "Marcar como realizada" }));
    await user.click(screen.getByRole("button", { name: "Concluir" }));

    expect(mockMarkRealizada).toHaveBeenCalledWith({
      castrationId: "castration1",
      dogId: undefined,
    });
  });
});
