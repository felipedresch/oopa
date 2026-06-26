import { maskCep, maskCpf, maskMicrochip, maskMicrochipInput, maskPhone, maskRg } from "@/lib/masks";

describe("masks", () => {
  it("limita e formata entradas de dominio", () => {
    expect(maskMicrochip("12a34b56789012345extra")).toBe("123456789012345");
    expect(maskMicrochipInput("123456789012345")).toBe("123 456 789 012 345");
    expect(maskCpf("52998224725")).toBe("529.982.247-25");
    expect(maskPhone("11988880001")).toBe("(11) 98888-0001");
    expect(maskCep("01001000")).toBe("01001-000");
  });

  it("formata RG mantendo verificador X e limitando o tamanho", () => {
    expect(maskRg("1234567")).toBe("12.345.67");
    expect(maskRg("123456789")).toBe("12.345.678-9");
    expect(maskRg("12.345.678-x")).toBe("12.345.678-X");
    expect(maskRg("1234567890123")).toBe("12.345.678-9");
    expect(maskRg("ab12.34cd")).toBe("12.34");
  });
});
