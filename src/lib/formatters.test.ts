import {
  formatCep,
  formatCpf,
  formatDate,
  formatDogStatus,
  formatMicrochip,
  formatPhone,
  formatSeverity,
} from "@/lib/formatters";

describe("formatters", () => {
  it("formata microchip, cpf, telefone e cep", () => {
    expect(formatMicrochip("123456789012345")).toBe("123 456 789 012 345");
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatPhone("11988880001")).toBe("(11) 98888-0001");
    expect(formatCep("01001000")).toBe("01001-000");
  });

  it("formata status e gravidade", () => {
    expect(formatDogStatus("na_ong")).toBe("Na ONG");
    expect(formatSeverity("alta")).toBe("Alta");
    expect(formatDate(new Date(2026, 5, 10).getTime())).toMatch(/10\/06\/2026/);
  });
});
