import {
  validateCep,
  validateCpf,
  validateEmail,
  validateMicrochip,
  validatePhone,
  VALIDATION_MESSAGES,
} from "@/lib/validations";

describe("validations", () => {
  it("valida microchip com 15 digitos", () => {
    expect(validateMicrochip("123456789012345")).toBeNull();
    expect(validateMicrochip("123")).toBe(VALIDATION_MESSAGES.microchip);
  });

  it("valida cpf, telefone, email e cep", () => {
    expect(validateCpf("529.982.247-25")).toBeNull();
    expect(validateCpf("111.111.111-11")).toBe(VALIDATION_MESSAGES.cpf);
    expect(validatePhone("(11) 98888-0001")).toBeNull();
    expect(validateEmail("admin@ong.local")).toBeNull();
    expect(validateEmail("invalido")).toBe(VALIDATION_MESSAGES.email);
    expect(validateCep("01001-000")).toBeNull();
  });
});
