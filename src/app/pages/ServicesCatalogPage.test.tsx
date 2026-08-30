import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { ServicesCatalogPage } from "@/app/pages/ServicesCatalogPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockCreateService = vi.fn();
const mockUpdateService = vi.fn();
const mockSetActive = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("ServicesCatalogPage", () => {
  beforeEach(() => {
    mockCreateService.mockReset().mockResolvedValue("service1");
    mockUpdateService.mockReset().mockResolvedValue(null);
    mockSetActive.mockReset().mockResolvedValue(null);
    let call = 0;
    mockUseMutation.mockImplementation(() => {
      call += 1;
      const index = call % 3;
      if (index === 1) return mockCreateService;
      if (index === 2) return mockUpdateService;
      return mockSetActive;
    });
    mockUseQuery.mockReturnValue([
      {
        _id: "service1",
        nome: "Consulta",
        descricao: undefined,
        categoria: "consulta",
        valor_padrao: 80,
        ativo: true,
        criado_em: Date.UTC(2024, 5, 10),
        atualizado_em: undefined,
      },
    ]);
  });

  it("mostra acesso negado sem services.manage", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <ServicesCatalogPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista servicos e permite desativar", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <ServicesCatalogPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Consulta")).toBeInTheDocument();
    expect(screen.getByText("R$ 80,00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Desativar" }));
    expect(mockSetActive).toHaveBeenCalledWith({ serviceId: "service1", ativo: false });
  });

  it("bloqueia criação sem nome", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <ServicesCatalogPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/valor padrão/i), "50");
    await user.click(screen.getByRole("button", { name: "Criar serviço" }));

    expect(screen.getByText("Informe o nome do serviço.")).toBeInTheDocument();
    expect(mockCreateService).not.toHaveBeenCalled();
  });

  it("cria servico com nome e valor validos", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <ServicesCatalogPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Nome"), "Castração");
    await user.type(screen.getByLabelText(/valor padrão/i), "150");
    await user.click(screen.getByRole("button", { name: "Criar serviço" }));

    expect(mockCreateService).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Castração", valor_padrao: 150 }),
    );
  });

  it("edita um servico existente", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <ServicesCatalogPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: "Editar serviço" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Consulta");

    await user.clear(screen.getByLabelText(/valor padrão/i));
    await user.type(screen.getByLabelText(/valor padrão/i), "95");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(mockUpdateService).toHaveBeenCalledWith(
      expect.objectContaining({ serviceId: "service1", nome: "Consulta", valor_padrao: 95 }),
    );
  });
});
