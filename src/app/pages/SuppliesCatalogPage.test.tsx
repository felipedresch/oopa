import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { SuppliesCatalogPage } from "@/app/pages/SuppliesCatalogPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockCreateSupply = vi.fn();
const mockUpdateSupply = vi.fn();
const mockSetActive = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("SuppliesCatalogPage", () => {
  beforeEach(() => {
    mockCreateSupply.mockReset().mockResolvedValue("supply1");
    mockUpdateSupply.mockReset().mockResolvedValue(null);
    mockSetActive.mockReset().mockResolvedValue(null);
    let call = 0;
    mockUseMutation.mockImplementation(() => {
      call += 1;
      const index = call % 3;
      if (index === 1) return mockCreateSupply;
      if (index === 2) return mockUpdateSupply;
      return mockSetActive;
    });
    mockUseQuery.mockReturnValue([
      {
        _id: "supply1",
        nome: "Antibiótico",
        descricao: undefined,
        categoria: "medicamento",
        unidade_medida: "comprimido",
        valor_padrao: 5,
        ativo: true,
        criado_em: Date.UTC(2024, 5, 10),
        atualizado_em: undefined,
      },
    ]);
  });

  it("mostra acesso negado sem supplies.manage", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <SuppliesCatalogPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista insumos e permite desativar", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <SuppliesCatalogPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Antibiótico")).toBeInTheDocument();
    expect(screen.getByText("comprimido")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Desativar" }));
    expect(mockSetActive).toHaveBeenCalledWith({ supplyId: "supply1", ativo: false });
  });

  it("bloqueia criação sem nome", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <SuppliesCatalogPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/valor padrão/i), "10");
    await user.click(screen.getByRole("button", { name: "Criar insumo" }));

    expect(screen.getByText("Informe o nome do insumo.")).toBeInTheDocument();
    expect(mockCreateSupply).not.toHaveBeenCalled();
  });

  it("cria insumo com nome e valor validos", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <SuppliesCatalogPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Nome"), "Soro fisiológico");
    await user.type(screen.getByLabelText(/valor padrão/i), "12");
    await user.click(screen.getByRole("button", { name: "Criar insumo" }));

    expect(mockCreateSupply).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Soro fisiológico", valor_padrao: 12 }),
    );
  });

  it("edita um insumo existente", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <SuppliesCatalogPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("heading", { name: "Editar insumo" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Antibiótico");

    await user.clear(screen.getByLabelText(/valor padrão/i));
    await user.type(screen.getByLabelText(/valor padrão/i), "7");
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(mockUpdateSupply).toHaveBeenCalledWith(
      expect.objectContaining({ supplyId: "supply1", nome: "Antibiótico", valor_padrao: 7 }),
    );
  });
});
