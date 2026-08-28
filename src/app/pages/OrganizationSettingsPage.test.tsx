import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

import { OrganizationSettingsPage } from "@/app/pages/OrganizationSettingsPage";

function renderPage() {
  const router = createMemoryRouter([
    { path: "/", element: <OrganizationSettingsPage /> },
  ]);
  return render(<RouterProvider router={router} />);
}

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockUpdateOrganization = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("OrganizationSettingsPage", () => {
  beforeEach(() => {
    mockUpdateOrganization.mockReset().mockResolvedValue("org1");
    mockUseMutation.mockReturnValue(mockUpdateOrganization);
    mockUseQuery.mockReturnValue(null);
  });

  it("mostra acesso negado sem organization.manage", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });

    renderPage();

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("bloqueia envio com CNPJ inválido", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    renderPage();

    await user.type(screen.getByLabelText(/razão social/i), "ONG OOPA");
    await user.type(screen.getByLabelText(/^cnpj/i), "11111111111111");
    await user.click(screen.getByRole("button", { name: /salvar dados da ong/i }));

    expect(screen.getAllByText("CNPJ inválido.").length).toBeGreaterThan(0);
    expect(mockUpdateOrganization).not.toHaveBeenCalled();
  });

  it("salva com razão social e CNPJ válidos", async () => {
    const user = userEvent.setup();
    mockUsePermissions.mockReturnValue({ can: () => true });

    renderPage();

    await user.type(screen.getByLabelText(/razão social/i), "ONG OOPA Proteção Animal");
    await user.type(screen.getByLabelText(/^cnpj/i), "11444777000161");
    await user.click(screen.getByRole("button", { name: /salvar dados da ong/i }));

    expect(mockUpdateOrganization).toHaveBeenCalledWith(
      expect.objectContaining({
        razao_social: "ONG OOPA Proteção Animal",
        cnpj: "11.444.777/0001-61",
      }),
    );
    expect(await screen.findByText("Dados da ONG salvos.")).toBeInTheDocument();
  });
});
