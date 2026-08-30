import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { AppointmentReceiptPage } from "@/app/pages/AppointmentReceiptPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
}));

const appointment = {
  _id: "appointment1",
  data_atendimento: Date.UTC(2026, 7, 30, 13),
  tipo_atendimento: "consulta" as const,
  status: "realizado" as const,
  historico: "Avaliação inicial",
  valor_total: 80,
  nota_fiscal_url: null,
  dog: { _id: "dog1", nome: "Pipoca", especie: "cao" as const, microchip: undefined },
  solicitante: null,
  veterinario: { _id: "vet1", nome: "Dra. Ana", email: undefined },
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

const organization = {
  _id: "organization1",
  razao_social: "OOPA Associação",
  nome_fantasia: "OOPA",
  cnpj: "11222333000181",
  bairro_nome: "Centro",
  endereco_logradouro: "Rua Principal",
  endereco_numero: "100",
  endereco_complemento: undefined,
  endereco_cep: "97542000",
  telefone: undefined,
  email: undefined,
  logo_url: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/appointments/appointment1/receipt"]}>
      <Routes>
        <Route element={<AppointmentReceiptPage />} path="/appointments/:id/receipt" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AppointmentReceiptPage", () => {
  beforeEach(() => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReset().mockReturnValueOnce(appointment).mockReturnValueOnce(organization);
  });

  it("renderiza o documento com dados da ONG e total", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Comprovante de venda" })).toBeInTheDocument();
    expect(screen.getByText("OOPA")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 80,00").length).toBeGreaterThanOrEqual(1);
  });

  it("aciona a impressão do navegador", async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    renderPage();

    await user.click(screen.getByRole("button", { name: /Imprimir/ }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });
});
