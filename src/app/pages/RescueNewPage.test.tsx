import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { RescueNewPage } from "@/app/pages/RescueNewPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockCreateRescue = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("RescueNewPage", () => {
  beforeEach(() => {
    mockCreateRescue.mockReset().mockResolvedValue("rescue1");
    mockUseQuery.mockReturnValue(undefined);
    mockUseMutation.mockReturnValue(mockCreateRescue);
  });

  it("mostra acesso negado sem rescues.create", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <RescueNewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("envia com tipo atropelado e gravidade alta por padrão", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <RescueNewPage />
      </MemoryRouter>,
    );

    await user.type(
      screen.getByLabelText(/o que foi relatado/i),
      "Cão atropelado, precisa de atendimento.",
    );
    await user.click(screen.getByRole("button", { name: /registrar solicitação/i }));

    expect(mockCreateRescue).toHaveBeenCalledWith(
      expect.objectContaining({
        tipo: "atropelado",
        gravidade: "alta",
        descricao_solicitante: "Cão atropelado, precisa de atendimento.",
      }),
    );
  });

  it("ajusta a gravidade padrão ao trocar o tipo", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <RescueNewPage />
      </MemoryRouter>,
    );

    await user.selectOptions(screen.getByLabelText("Tipo"), "filhotes_abandonados");

    expect(screen.getByLabelText("Gravidade")).toHaveValue("baixa");
  });
});
