export function getDateGroupLabel(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();

  if (sameDay(date, today)) {
    return "Hoje";
  }
  if (sameDay(date, yesterday)) {
    return "Ontem";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function groupByDate<T extends { criado_em: number }>(
  items: T[],
  now = Date.now(),
): Array<{ label: string; items: T[] }> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const label = getDateGroupLabel(item.criado_em, now);
    const bucket = groups.get(label) ?? [];
    bucket.push(item);
    groups.set(label, bucket);
  }

  return [...groups.entries()].map(([label, groupedItems]) => ({
    label,
    items: groupedItems,
  }));
}
