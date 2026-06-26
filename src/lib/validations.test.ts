import {
  normalizeRg,
  validateCep,
  validateCpf,
  validateEmail,
  validateMicrochip,
  validatePhone,
  validateRg,
  VALIDATION_MESSAGES,
} from "@/lib/validations";

describe("validations", () => {
  it("válida microchip com 15 dígitos", () => {
    expect(validateMicrochip("123456789012345")).toBeNull();
    expect(validateMicrochip("123")).toBe(VALIDATION_MESSAGES.microchip);
  });

  it("válida cpf, telefone, email e cep", () => {
    expect(validateCpf("529.982.247-25")).toBeNull();
    expect(validateCpf("111.111.111-11")).toBe(VALIDATION_MESSAGES.cpf);
    expect(validatePhone("(11) 98888-0001")).toBeNull();
    expect(validateEmail("admin@ong.local")).toBeNull();
    expect(validateEmail("invalido")).toBe(VALIDATION_MESSAGES.email);
    expect(validateCep("01001-000")).toBeNull();
  });

  it("válida e normaliza RG", () => {
    expect(normalizeRg("12.345.678-x")).toBe("12345678X");
    expect(validateRg("12.345.67")).toBeNull();
    expect(validateRg("123")).toBe(VALIDATION_MESSAGES.rg);
    expect(validateRg("1234567890")).toBe(VALIDATION_MESSAGES.rg);
  });
});
