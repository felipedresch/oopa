import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { RescuesListPage } from "@/app/pages/RescuesListPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (): ReturnType<typeof mockUseQuery> => mockUseQuery(),
}));

describe("RescuesListPage", () => {
  it("mostra acesso negado sem rescues.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });
    mockUseQuery.mockReturnValue(undefined);

    render(
      <MemoryRouter>
        <RescuesListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("lista resgates ordenados e mostra botão de nova solicitação com permissão", () => {
    mockUsePermissions.mockReturnValue({
      can: (permission: string) =>
        permission === "rescues.read" || permission === "rescues.create",
    });
    mockUseQuery.mockReturnValue([
      {
        _id: "rescue1",
        tipo: "atropelado",
        gravidade: "alta",
        status: "aberta",
        descricao_solicitante: "Cão atropelado na avenida.",
        bairro_nome: "Centro",
        dog_nome: undefined,
        criado_em: Date.UTC(2024, 5, 10),
      },
    ]);

    render(
      <MemoryRouter>
        <RescuesListPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Resgates" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nova solicitação" })).toBeInTheDocument();
    expect(screen.getByText("atropelado")).toBeInTheDocument();
  });

  it("mostra estado vazio sem resgates", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    mockUseQuery.mockReturnValue([]);

    render(
      <MemoryRouter>
        <RescuesListPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nenhum resgate encontrado")).toBeInTheDocument();
  });
});
