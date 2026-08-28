import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { CastrationNewPage } from "@/app/pages/CastrationNewPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockCreateCastration = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("CastrationNewPage", () => {
  beforeEach(() => {
    mockCreateCastration.mockReset().mockResolvedValue("castration1");
    mockUseMutation.mockReturnValue(mockCreateCastration);
    mockUseQuery.mockReturnValue({
      page: [{ _id: "person1", nome_completo: "Solicitante Teste" }],
      isDone: true,
      continueCursor: "",
    });
  });

  it("mostra acesso negado sem castration.create", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <CastrationNewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("exige selecionar a pessoa solicitante antes de enviar", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue(undefined);

    render(
      <MemoryRouter>
        <CastrationNewPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /registrar solicitação/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/pessoa solicitante/i), "Solicitante");
    expect(mockCreateCastration).not.toHaveBeenCalled();
  });

  it("envia com pessoa selecionada e descrição leve do animal", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <CastrationNewPage />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/pessoa solicitante/i), "Solicitante");
    await user.click(screen.getByRole("button", { name: "Solicitante Teste" }));
    await user.click(screen.getByRole("button", { name: /registrar solicitação/i }));

    expect(mockCreateCastration).toHaveBeenCalledWith(
      expect.objectContaining({
        pessoa_id: "person1",
        animal_descricao: {
          nome: undefined,
          especie: "cao",
          porte: "pequeno",
          sexo: "macho",
          cor: undefined,
        },
      }),
    );
  });
});
