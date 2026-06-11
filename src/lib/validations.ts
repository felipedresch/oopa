export const VALIDATION_MESSAGES = {
  microchip: "Microchip deve ter exatamente 15 dígitos numericos.",
  cpf: "CPF inválido.",
  phone: "Telefone deve ter 10 ou 11 dígitos.",
  email: "Email inválido.",
  cep: "CEP deve ter 8 dígitos.",
  required: "Campo obrigatório.",
} as const;

export function validateMicrochip(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 15) {
    return VALIDATION_MESSAGES.microchip;
  }
  return null;
}

export function validateCpf(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return VALIDATION_MESSAGES.cpf;
  }

  const calculateDigit = (slice: string, factor: number) => {
    let total = 0;
    for (const char of slice) {
      total += Number(char) * factor--;
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 9), 10);
  const secondDigit = calculateDigit(digits.slice(0, 10), 11);
  if (firstDigit !== Number(digits[9]) || secondDigit !== Number(digits[10])) {
    return VALIDATION_MESSAGES.cpf;
  }

  return null;
}

export function validatePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) {
    return VALIDATION_MESSAGES.phone;
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return VALIDATION_MESSAGES.email;
  }
  return null;
}

export function validateCep(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) {
    return VALIDATION_MESSAGES.cep;
  }
  return null;
}

export function validateRequired(value: string): string | null {
  if (!value.trim()) {
    return VALIDATION_MESSAGES.required;
  }
  return null;
}
