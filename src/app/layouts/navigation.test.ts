import { appRoutes } from "@/app/routes";
import {
  mobileNavItems,
  navSections,
  sectionIdForPath,
  visibleNavSections,
  type NavAccess,
} from "@/app/layouts/navigation";

function access(permissions: string[]): NavAccess {
  return {
    can: (permission) => permissions.includes(permission),
    canAny: (required) => required.some((permission) => permissions.includes(permission)),
  };
}

const ALL: NavAccess = { can: () => true, canAny: () => true };

/** Rotas internas registradas no router, para conferir os destinos do menu. */
const registeredRoutes = new Set(
  appRoutes.flatMap((route) =>
    (route.children ?? []).map((child) =>
      child.index ? "/" : `/${child.path ?? ""}`.replace(/\/+/g, "/"),
    ),
  ),
);

describe("navSections", () => {
  it("agrupa o menu nos módulos do plano", () => {
    expect(navSections.map((section) => section.label)).toEqual([
      undefined,
      "Cadastros",
      "Ocorrências",
      "Adoções e devoluções",
      "Operação",
      "Gestão",
    ]);
  });

  it("cobre todos os módulos pedidos na Fase 26", () => {
    const labels = navSections.flatMap((section) => section.items.map((item) => item.label));
    expect(labels).toEqual(
      expect.arrayContaining([
        "Animais",
        "Pessoas",
        "Bairros",
        "Serviços",
        "Insumos",
        "Visão geral",
        "Nova adoção",
        "Acompanhamento",
        "Castração",
        "Resgates",
        "Atendimentos",
        "Relatórios",
        "Equipe",
        "Configurações",
      ]),
    );
  });

  it("aponta apenas para rotas registradas (exceto o portal público)", () => {
    for (const section of navSections) {
      for (const item of section.items) {
        if (item.external) {
          continue;
        }
        expect(registeredRoutes.has(item.to)).toBe(true);
      }
    }
  });

  it("marca o portal de denúncias como link externo", () => {
    const portal = navSections
      .flatMap((section) => section.items)
      .find((item) => item.to === "/denuncia");

    expect(portal?.external).toBe(true);
  });
});

describe("visibleNavSections", () => {
  it("mostra todas as seções para quem tem tudo", () => {
    expect(visibleNavSections(ALL)).toHaveLength(navSections.length);
  });

  it("esconde a seção inteira quando nenhum item é permitido", () => {
    const sections = visibleNavSections(access(["dogs.read"]));

    expect(sections.map((section) => section.label)).toEqual([undefined, "Cadastros", "Gestão"]);
    expect(sections[1]?.items.map((item) => item.label)).toEqual(["Animais"]);
    // "Gestão" sobrevive porque Notificações é visível a qualquer usuário.
    expect(sections[2]?.items.map((item) => item.label)).toEqual(["Notificações"]);
  });

  it("mostra o portal de denúncias apenas para quem faz triagem", () => {
    const semTriagem = visibleNavSections(access(["occurrences.read"]));
    const comTriagem = visibleNavSections(
      access(["occurrences.read", "public_reports.triage"]),
    );

    const rotas = (sections: ReturnType<typeof visibleNavSections>) =>
      sections.flatMap((section) => section.items.map((item) => item.to));

    expect(rotas(semTriagem)).not.toContain("/denuncia");
    expect(rotas(comTriagem)).toContain("/denuncia");
  });
});

describe("mobileNavItems", () => {
  it("mantém no máximo 5 itens, focados no uso em campo", () => {
    expect(mobileNavItems).toHaveLength(5);
    expect(mobileNavItems.map((item) => item.to)).toEqual([
      "/",
      "/identify",
      "/dogs",
      "/people",
      "/occurrences",
    ]);
  });

  it("filtra por permissão como o menu lateral", () => {
    const visible = mobileNavItems.filter((item) => item.canAccess(access(["dogs.read"])));

    expect(visible.map((item) => item.to)).toEqual(["/", "/identify", "/dogs"]);
  });
});

describe("sectionIdForPath", () => {
  it("encontra a seção da rota atual", () => {
    expect(sectionIdForPath("/dogs")).toBe("cadastros");
    expect(sectionIdForPath("/reports")).toBe("gestao");
    expect(sectionIdForPath("/castration")).toBe("operacao");
  });

  it("resolve rotas filhas pela rota mais específica", () => {
    expect(sectionIdForPath("/dogs/abc123")).toBe("cadastros");
    // /adoptions/followups não pode ser capturada por um prefixo mais curto.
    expect(sectionIdForPath("/adoptions/followups")).toBe("adocoes");
  });

  it("não casa a raiz com qualquer rota", () => {
    expect(sectionIdForPath("/qualquer-coisa")).toBeUndefined();
  });
});
