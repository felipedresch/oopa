export function maskMicrochip(value: string): string {
  return value.replace(/\D/g, "").slice(0, 15);
}

export function maskMicrochipInput(value: string): string {
  const digits = maskMicrochip(value);
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}

export function maskCpf(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/**
 * RG: mantém dígitos e um eventual dígito verificador "X" final, limitando a 9
 * caracteres e formatando no padrão XX.XXX.XXX-X.
 */
export function maskRg(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^0-9X]/g, "");
  const hasTrailingX = cleaned.endsWith("X");
  const digits = cleaned.replace(/X/g, "").slice(0, hasTrailingX ? 8 : 9);
  const raw = hasTrailingX ? `${digits}X` : digits;

  if (raw.length <= 2) return raw;
  if (raw.length <= 5) return `${raw.slice(0, 2)}.${raw.slice(2)}`;
  if (raw.length <= 8) return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}-${raw.slice(8)}`;
}
