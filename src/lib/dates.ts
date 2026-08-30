/**
 * Conversao entre o contrato `yyyy-MM-dd` do `DatePicker` e timestamps.
 *
 * `new Date("2026-08-30")` e interpretado como meia-noite **UTC**: em UTC-3 isso
 * volta como 29/08 21:00 e a data gravada/exibida fica um dia atras. Todas as
 * conversoes de data-sem-hora devem passar por aqui, que trabalha sempre no
 * fuso local.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Hoje no formato `yyyy-MM-dd`, no fuso local. */
export function todayAsDateInput(now: number = Date.now()): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Converte `yyyy-MM-dd` no inicio (`start`) ou no fim (`end`) daquele dia, no
 * fuso local. Retorna `undefined` para valor vazio ou invalido.
 */
export function dateInputToTimestamp(
  value: string,
  boundary: "start" | "end" = "start",
): number | undefined {
  const match = ISO_DATE.exec(value.trim());
  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  return boundary === "start"
    ? new Date(Number(year), Number(month) - 1, Number(day)).getTime()
    : new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999).getTime();
}

/**
 * Rotulo de agrupamento por dia em listas cronologicas: "Hoje"/"Ontem" para os
 * dias recentes e a data por extenso para o resto. Ancora a leitura da lista
 * sem obrigar o usuario a decodificar `30/08/2026` linha a linha.
 */
export function dayGroupLabel(timestamp: number, now: number = Date.now()): string {
  const startOfDay = (value: number) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };

  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(timestamp)) / (24 * 60 * 60 * 1000),
  );

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";

  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(new Date(timestamp));
}
