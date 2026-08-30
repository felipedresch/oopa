import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ReportDetailPage } from "@/app/pages/ReportDetailPage";

const mockUsePermissions = vi.fn();
const mockUseQuery = vi.fn();
const mockConvexQuery = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]): ReturnType<typeof mockUseQuery> => mockUseQuery(...args),
  useConvex: () => ({ query: mockConvexQuery }),
}));

vi.mock("@/components/BairroAutocomplete", () => ({
  BairroAutocomplete: () => <div data-testid="bairro-autocomplete" />,
}));

const DOG_OPTIONS = [{ id: "dog1", label: "Mel" }];
const PERSON_OPTIONS = [{ id: "person1", label: "Marina" }];

const VET_RESULT = {
  colunas: [
    "Ordem",
    "Data do atendimento",
    "Animal",
    "Espécie",
    "Solicitante",
    "Histórico",
    "Valor",
    "Nota fiscal",
    "Data de emissão",
  ],
  linhas: [
    {
      id: "appointment1",
      rota: "/appointments/appointment1",
      celulas: [
        { texto: "1" },
        { texto: "2026-04-10" },
        { texto: "Mel" },
        { texto: "Cão" },
        { texto: "Marina" },
        { texto: "Consulta: rotina" },
        { texto: "80,00" },
        { texto: "NF 12345", href: "https://files.example/nf.xml" },
        { texto: "2026-04-11" },
      ],
    },
  ],
  resumo: [{ label: "Valor total", valor: "R$ 80,00" }],
  truncado: false,
};

function renderAt(reportId: string) {
  return render(
    <MemoryRouter initialEntries={[`/reports/${reportId}`]}>
      <Routes>
        <Route element={<ReportDetailPage />} path="/reports/:reportId" />
      </Routes>
    </MemoryRouter>,
  );
}

/** Roteia o mock de `useQuery` entre o relatório e os seletores de entidade. */
function respondWith(result: unknown) {
  mockUseQuery.mockImplementation((_ref: unknown, args: unknown) => {
    const parsed = args as { tipo?: "dogs" | "people" } | "skip";
    if (parsed === "skip") {
      return undefined;
    }
    if (parsed.tipo === "dogs") {
      return DOG_OPTIONS;
    }
    if (parsed.tipo === "people") {
      return PERSON_OPTIONS;
    }
    return result;
  });
}

/** Últimos argumentos passados para a query do relatório (não dos seletores). */
function lastReportArgs() {
  const call = [...mockUseQuery.mock.calls]
    .reverse()
    .find((entry) => {
      const args = entry[1] as { relatorio?: string };
      return typeof args === "object" && args !== null && "relatorio" in args;
    });
  return call?.[1] as { relatorio: string; inicio?: number; dogId?: string };
}

beforeEach(() => {
  mockUsePermissions.mockReset();
  mockUseQuery.mockReset();
  mockConvexQuery.mockReset();
});

describe("ReportDetailPage", () => {
  it("mostra permissão negada sem reports.read", () => {
    mockUsePermissions.mockReturnValue({ can: () => false });
    respondWith(undefined);

    renderAt("castracoes");

    expect(screen.getByText("Permissão negada")).toBeInTheDocument();
  });

  it("mostra erro para relatório inexistente", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    respondWith(undefined);

    renderAt("inexistente");

    expect(screen.getByText("Relatório não encontrado")).toBeInTheDocument();
  });

  it("renderiza colunas, resumo e links das linhas", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    respondWith(VET_RESULT);

    renderAt("atendimentos_veterinarios");

    expect(screen.getByRole("columnheader", { name: "Nota fiscal" })).toBeInTheDocument();
    expect(screen.getByText("R$ 80,00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/appointments/appointment1",
    );
    expect(screen.getByRole("link", { name: "NF 12345" })).toHaveAttribute(
      "href",
      "https://files.example/nf.xml",
    );
  });

  it("mostra estado vazio quando o relatório não tem linhas", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    respondWith({ ...VET_RESULT, linhas: [] });

    renderAt("castracoes");

    expect(screen.getByText("Nenhum registro no período")).toBeInTheDocument();
  });

  it("oferece apenas os filtros declarados pelo relatório", () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    respondWith({ ...VET_RESULT, linhas: [] });

    const { unmount } = renderAt("castracoes");
    expect(screen.queryByLabelText("Animal")).not.toBeInTheDocument();
    expect(screen.queryByTestId("bairro-autocomplete")).not.toBeInTheDocument();
    unmount();

    renderAt("denuncias");
    expect(screen.getByTestId("bairro-autocomplete")).toBeInTheDocument();
  });

  it("aplica o filtro de animal nos argumentos da query", async () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    respondWith(VET_RESULT);

    renderAt("atendimentos_veterinarios");

    expect(lastReportArgs()).toMatchObject({
      relatorio: "atendimentos_veterinarios",
      dogId: undefined,
    });

    await userEvent.selectOptions(screen.getByLabelText("Animal"), "dog1");

    expect(lastReportArgs()).toMatchObject({ dogId: "dog1" });
  });

  it("exporta CSV com os mesmos filtros", async () => {
    mockUsePermissions.mockReturnValue({ can: () => true });
    respondWith(VET_RESULT);
    mockConvexQuery.mockResolvedValue('"Ordem"\n"1"');

    const createObjectURL = vi.fn(() => "blob:report");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    renderAt("castracoes");
    await userEvent.click(screen.getByRole("button", { name: "Exportar CSV" }));

    expect(mockConvexQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ relatorio: "castracoes" }),
    );
    expect(click).toHaveBeenCalled();

    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
