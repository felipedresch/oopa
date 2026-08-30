import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AppointmentNewPage } from "@/app/pages/AppointmentNewPage";

const mockUsePermissions = vi.fn();
const mockUseMutation = vi.fn();
const mockUsePaginatedQuery = vi.fn();
const mockUseQuery = vi.fn();
const mockCreateAppointment = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
  usePaginatedQuery: (): ReturnType<typeof mockUsePaginatedQuery> => mockUsePaginatedQuery(),
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
}));

vi.mock("@/components/NotaFiscalUpload", () => ({
  NotaFiscalUpload: () => <div>Upload de nota fiscal</div>,
}));

describe("AppointmentNewPage", () => {
  beforeEach(() => {
    mockCreateAppointment.mockReset().mockResolvedValue("appointment1");
    mockUseMutation.mockReset().mockReturnValue(mockCreateAppointment);
    mockUsePaginatedQuery.mockReset();
    mockUsePaginatedQuery.mockReturnValue({
      results: [
        {
          _id: "dog1",
          nome: "Pipoca",
          microchip: undefined,
          especie: "cao",
          porte: "medio",
          status_atual: "na_ong",
          foto_perfil_url: null,
          grave_alert: false,
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    });
    mockUseQuery.mockReset().mockReturnValue([
      { _id: "vet1", nome: "Dra. Ana", email: "ana@ong.local" },
    ]);
  });

  it("mostra acesso negado sem appointments.create", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    render(
      <MemoryRouter>
        <AppointmentNewPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("seleciona animal e cria atendimento", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    render(
      <MemoryRouter>
        <AppointmentNewPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /Pipoca/ }));
    await user.selectOptions(screen.getByLabelText("Veterinário responsável"), "vet1");
    await user.type(screen.getByLabelText("Histórico do atendimento"), "Consulta de rotina");
    await user.click(screen.getByRole("button", { name: /Registrar atendimento/ }));

    expect(mockCreateAppointment).toHaveBeenCalledWith(
      expect.objectContaining({
        dogId: "dog1",
        veterinarioUserId: "vet1",
        historico: "Consulta de rotina",
        servicos: [],
        insumos: [],
      }),
    );
  });
});
