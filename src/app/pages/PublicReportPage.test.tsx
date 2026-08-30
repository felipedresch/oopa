import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { PublicReportPage } from "@/app/pages/PublicReportPage";

const mockUseQuery = vi.fn();
const mockUseMutation = vi.fn();
const mockCreateReport = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
  useMutation: (): ReturnType<typeof mockUseMutation> => mockUseMutation(),
}));

describe("PublicReportPage", () => {
  beforeEach(() => {
    mockCreateReport.mockReset().mockResolvedValue("report1");
    mockUseQuery.mockReturnValue([{ _id: "bairro1", nome: "Centro" }]);
    mockUseMutation.mockReturnValue(mockCreateReport);
  });

  it("permite denúncia anônima com apenas tipo e descrição", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PublicReportPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /denúncia de maus-tratos ou abandono/i }),
    ).toBeInTheDocument();

    await user.type(
      screen.getByLabelText(/o que você viu/i),
      "Cão amarrado sem água há dias.",
    );
    await user.click(screen.getByRole("button", { name: /enviar denúncia/i }));

    expect(mockCreateReport).toHaveBeenCalledWith(
      expect.objectContaining({
        descricao: "Cão amarrado sem água há dias.",
        nome_denunciante: undefined,
        contato: undefined,
        photo_storage_ids: [],
      }),
    );
  });

  it("bloqueia envio sem descrição", () => {
    render(
      <MemoryRouter>
        <PublicReportPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: /enviar denúncia/i })).toBeDisabled();
    expect(mockCreateReport).not.toHaveBeenCalled();
  });
  it("envia o tipo escolhido nos cartões de tipo de denúncia", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <PublicReportPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("radio", { name: /abandono/i }));
    await user.type(screen.getByLabelText(/o que você viu/i), "Cadela abandonada na praça.");
    await user.click(screen.getByRole("button", { name: /enviar denúncia/i }));

    expect(mockCreateReport).toHaveBeenCalledWith(
      expect.objectContaining({ tipo_denuncia: "abandono" }),
    );
  });
});
