/**
 * Minimal CSV serialization — Roadmap VM-P2-01 (CLAUDE.md). Deliberately
 * not a library dependency: two export endpoints, flat rows, no nested
 * structures to worry about. If a third export needs this, that's still
 * fine to hand-roll; a fourth would be the signal to pull in a real csv
 * package instead.
 */
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: { key: keyof T; label: string }[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",")
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(row[c.key])).join(","))
  return [header, ...lines].join("\r\n")
}
