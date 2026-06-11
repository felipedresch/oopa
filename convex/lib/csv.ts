export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildCsv(rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}
