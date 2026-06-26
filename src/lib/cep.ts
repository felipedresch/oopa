export type CepAddress = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
};

type ViaCepResponse = Partial<CepAddress> & { erro?: boolean };

/**
 * Consulta um endereço pelo CEP usando a API pública do ViaCEP.
 * Retorna `null` quando o CEP é inválido (≠ 8 dígitos) ou não foi encontrado.
 * Lança erro apenas em falha de rede/resposta inesperada.
 */
export async function fetchAddressByCep(cep: string): Promise<CepAddress | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) {
    return null;
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) {
    throw new Error(`ViaCEP respondeu com status ${response.status}`);
  }

  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) {
    return null;
  }

  return {
    cep: data.cep ?? digits,
    logradouro: data.logradouro ?? "",
    complemento: data.complemento ?? "",
    bairro: data.bairro ?? "",
    localidade: data.localidade ?? "",
    uf: data.uf ?? "",
  };
}

/** Normaliza um nome de bairro para comparação (sem acento, minúsculo, sem espaços extras). */
export function normalizeBairroName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
