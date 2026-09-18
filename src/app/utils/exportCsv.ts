// Shared CSV-download helper for admin list screens.
type Row = Record<string, unknown>;

function cell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCSV(rows: Row[]): string {
  if (rows.length === 0) return "";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
}

export function downloadCSV(fileName: string, rows: Row[]): number {
  const content = toCSV(rows);
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return rows.length;
}
