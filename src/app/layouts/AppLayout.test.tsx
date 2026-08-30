import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { AppLayout } from "@/app/layouts/AppLayout";

const mockUsePermissions = vi.fn();

vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: (): ReturnType<typeof mockUsePermissions> => mockUsePermissions(),
}));

vi.mock("convex/react", () => ({
  useQuery: () => 0,
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signOut: vi.fn() }),
}));

vi.mock("@/components/ProtectedRoute", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/GlobalSearch", () => ({
  GlobalSearch: () => <div data-testid="global-search" />,
}));

function renderLayout(permissions: string[]) {
  mockUsePermissions.mockReturnValue({
    user: { nome: "Ana" },
    isAuthenticated: true,
    can: (permission: string) => permissions.includes(permission),
    canAny: (required: readonly string[]) =>
      required.some((permission) => permissions.includes(permission)),
  });

  return render(
    <MemoryRouter>
      <AppLayout />
    </MemoryRouter>,
  );
}

const ALL = [
  "dogs.read",
  "people.read",
  "bairros.manage",
  "services.manage",
  "supplies.manage",
  "occurrences.read",
  "public_reports.triage",
  "occurrences.create_adocao",
  "adoptions.read",
  "castration.read",
  "rescues.read",
  "appointments.read",
  "reports.read",
  "users.invite",
  "system.audit_log",
];

beforeEach(() => {
  mockUsePermissions.mockReset();
});

describe("AppLayout", () => {
  it("mostra o menu agrupado por módulo", () => {
    renderLayout(ALL);

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(nav).getByText("Cadastros")).toBeInTheDocument();
    expect(within(nav).getByText("Adoções e devoluções")).toBeInTheDocument();
    expect(within(nav).getByText("Gestão")).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Animais" })).toHaveAttribute(
      "href",
      "/dogs",
    );
  });

  it("abre o portal público de denúncias fora do app", () => {
    renderLayout(ALL);

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    const portal = within(nav).getByRole("link", { name: "Portal de denúncias" });
    expect(portal).toHaveAttribute("href", "/denuncia");
    expect(portal).toHaveAttribute("target", "_blank");
  });

  it("esconde módulos sem permissão, incluindo o título da seção", () => {
    renderLayout(["dogs.read"]);

    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(within(nav).getByText("Cadastros")).toBeInTheDocument();
    expect(within(nav).queryByText("Operação")).not.toBeInTheDocument();
    expect(within(nav).queryByText("Adoções e devoluções")).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Insumos" })).not.toBeInTheDocument();
  });

  it("mantém a barra inferior com os itens de campo permitidos", () => {
    renderLayout(ALL);

    const bottom = screen.getByRole("navigation", { name: "Navegação inferior" });
    expect(within(bottom).getAllByRole("link")).toHaveLength(5);
    expect(within(bottom).getByRole("link", { name: "Ocorrências" })).toHaveAttribute(
      "href",
      "/occurrences",
    );
  });

  it("troca sidebar por barra inferior no breakpoint lg", () => {
    renderLayout(ALL);

    const sidebar = screen.getByRole("complementary");
    expect(sidebar.className).toContain("hidden");
    expect(sidebar.className).toContain("lg:flex");

    const bottom = screen.getByRole("navigation", { name: "Navegação inferior" });
    expect(bottom.className).toContain("lg:hidden");
    // Respeita a área segura do iOS em telas estreitas.
    expect(bottom.className).toContain("pb-[env(safe-area-inset-bottom)]");

    expect(screen.getByRole("banner").className).toContain("lg:hidden");
  });

  it("mantém alvos de toque de 44px na barra inferior", () => {
    renderLayout(ALL);

    const bottom = screen.getByRole("navigation", { name: "Navegação inferior" });
    for (const link of within(bottom).getAllByRole("link")) {
      expect(link.className).toContain("min-h-12");
      expect(link.className).toContain("min-w-11");
    }
  });

  it("reduz a barra inferior quando faltam permissões", () => {
    renderLayout(["dogs.read"]);

    const bottom = screen.getByRole("navigation", { name: "Navegação inferior" });
    expect(within(bottom).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Início",
      "Identificar",
      "Animais",
    ]);
  });
});
