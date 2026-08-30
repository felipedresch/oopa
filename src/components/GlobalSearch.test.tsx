import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as ReactRouterDom from "react-router-dom";
import { MemoryRouter } from "react-router-dom";

import { GlobalSearch } from "@/components/GlobalSearch";

const mockUseQuery = vi.fn();
const mockNavigate = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]): ReturnType<typeof mockUseQuery> => mockUseQuery(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

const GROUPS = [
  {
    tipo: "dogs",
    label: "Animais",
    itens: [
      {
        id: "dog1",
        titulo: "Bolota",
        subtitulo: "Microchip 987654321098765",
        rota: "/dogs/dog1",
      },
    ],
  },
  {
    tipo: "people",
    label: "Pessoas",
    itens: [{ id: "person1", titulo: "Bolota da Silva", rota: "/people/person1" }],
  },
];

function renderSearch() {
  return render(
    <MemoryRouter>
      <GlobalSearch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseQuery.mockReset();
  mockNavigate.mockReset();
});

describe("GlobalSearch", () => {
  it("não consulta com termo abaixo do mínimo", async () => {
    mockUseQuery.mockReturnValue(undefined);
    const user = userEvent.setup();

    renderSearch();
    await user.type(screen.getByLabelText("Busca global"), "b");

    await waitFor(() => {
      expect(mockUseQuery.mock.calls.at(-1)?.[1]).toBe("skip");
    });
  });

  it("agrupa resultados por tipo quando o termo cruza vários", async () => {
    mockUseQuery.mockReturnValue(GROUPS);
    const user = userEvent.setup();

    renderSearch();
    await user.type(screen.getByLabelText("Busca global"), "bolota");

    expect(await screen.findByText("Animais")).toBeInTheDocument();
    expect(screen.getByText("Pessoas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bolota da Silva/ })).toBeInTheDocument();
  });

  it("navega para a entidade escolhida e limpa o campo", async () => {
    mockUseQuery.mockReturnValue(GROUPS);
    const user = userEvent.setup();

    renderSearch();
    const input = screen.getByLabelText("Busca global");
    await user.type(input, "bolota");

    await user.click(await screen.findByRole("button", { name: /Microchip/ }));

    expect(mockNavigate).toHaveBeenCalledWith("/dogs/dog1");
    expect(input).toHaveValue("");
  });

  it("mostra estado vazio quando nenhum tipo retorna resultado", async () => {
    mockUseQuery.mockReturnValue([]);
    const user = userEvent.setup();

    renderSearch();
    await user.type(screen.getByLabelText("Busca global"), "zzz");

    expect(await screen.findByText(/Nenhum resultado para/)).toBeInTheDocument();
  });

  it("mostra apenas os grupos permitidos ao usuário", async () => {
    mockUseQuery.mockReturnValue([GROUPS[0]]);
    const user = userEvent.setup();

    renderSearch();
    await user.type(screen.getByLabelText("Busca global"), "bolota");

    expect(await screen.findByText("Animais")).toBeInTheDocument();
    expect(screen.queryByText("Pessoas")).not.toBeInTheDocument();
  });

  it("fecha o painel com Escape", async () => {
    mockUseQuery.mockReturnValue(GROUPS);
    const user = userEvent.setup();

    renderSearch();
    await user.type(screen.getByLabelText("Busca global"), "bolota");
    expect(await screen.findByText("Animais")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Animais")).not.toBeInTheDocument();
  });
});
