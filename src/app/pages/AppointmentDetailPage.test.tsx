import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppointmentDetailPage } from "@/app/pages/AppointmentDetailPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockComplete = vi.fn();
const mockCancel = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

const appointment = {
  _id: "appointment1",
  data_atendimento: Date.UTC(2026, 7, 30, 13),
  tipo_atendimento: "consulta" as const,
  status: "agendado" as const,
  historico: "Avaliação inicial",
  valor_total: 80,
  nota_fiscal_url: null,
  dog: { _id: "dog1", nome: "Pipoca", especie: "cao" as const, microchip: undefined },
  solicitante: { _id: "person1", nome_completo: "Maria Silva" },
  veterinario: { _id: "vet1", nome: "Dra. Ana", email: "ana@ong.local" },
  servicos: [
    {
      service_id: "service1",
      nome: "Consulta clínica",
      categoria: "consulta" as const,
      quantidade: 1,
      valor_unitario: 80,
      subtotal: 80,
    },
  ],
  insumos: [],
  desconto_valor: 0,
  medical_record: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/appointments/appointment1"]}>
      <Routes>
        <Route element={<AppointmentDetailPage />} path="/appointments/:id" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppointmentDetailPage", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReset().mockReturnValue(appointment);
    mockComplete.mockReset().mockResolvedValue(null);
    mockCancel.mockReset().mockResolvedValue(null);
    mockUseMutation.mockReset();
    mockUseMutation.mockReturnValue(mockComplete);
  });

  it("mostra acesso negado sem appointments.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    renderPage();

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("permite concluir atendimento com dados do prontuário", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("Consulta clínica")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Diagnóstico"), "Dermatite leve");
    await user.click(screen.getByRole("button", { name: "Concluir atendimento" }));

    await waitFor(() => {
      expect(mockComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          appointmentId: "appointment1",
          medicalRecord: { diagnostico: "Dermatite leve" },
        }),
      );
    });
  });
});
