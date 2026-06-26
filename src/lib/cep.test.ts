import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchAddressByCep, normalizeBairroName } from "@/lib/cep";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchAddressByCep", () => {
  it("retorna null para CEP com menos de 8 digitos sem chamar a rede", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await fetchAddressByCep("123");
    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("mapeia a resposta do ViaCEP", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          cep: "97540-000",
          logradouro: "Rua dos Andradas",
          complemento: "até 100",
          bairro: "Centro",
          localidade: "Alegrete",
          uf: "RS",
        }),
        { status: 200 },
      ),
    );

    const result = await fetchAddressByCep("97540-000");
    expect(result).toEqual({
      cep: "97540-000",
      logradouro: "Rua dos Andradas",
      complemento: "até 100",
      bairro: "Centro",
      localidade: "Alegrete",
      uf: "RS",
    });
  });

  it("retorna null quando o ViaCEP responde erro", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ erro: true }), { status: 200 }),
    );

    const result = await fetchAddressByCep("00000000");
    expect(result).toBeNull();
  });

  it("lanca erro em falha de rede", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("", { status: 500 }));
    await expect(fetchAddressByCep("97540000")).rejects.toThrow();
  });
});

describe("normalizeBairroName", () => {
  it("remove acentos, caixa e espacos extras", () => {
    expect(normalizeBairroName("  Ibirapuitã ")).toBe("ibirapuita");
    expect(normalizeBairroName("Getúlio  Vargas")).toBe("getulio vargas");
    expect(normalizeBairroName("CENTRO")).toBe("centro");
  });
});
