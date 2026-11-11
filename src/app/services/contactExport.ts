/**
 * The Legacy Vault archive for an activated Legacy Contact ("Download
 * everything" in the Access Portal). The server (GET /account/access/
 * :ownerId/export) checks the grant — approved claim + activated fee, not
 * expired — and returns every section's records plus a one-hour download link
 * for each document. This builds the ZIP in the browser, the same way the
 * owner's own export does (services/vaultExport.ts). The Secret Vault is never
 * part of it, and fields the owner encrypted stay marked as encrypted.
 */
import { createZip, type ZipEntry } from "../utils/zip";
import { getOwnerExport, type PortalRow } from "./contactAccess";

export interface ContactExportResult { blob: Blob; fileName: string; records: number; files: number; skipped: string[] }

const safe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "untitled";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** One CSV per group: a column per field label, a line per record. */
function rowsToCsv(rows: PortalRow[]): string {
  const cols: string[] = [];
  for (const r of rows) for (const f of r.fields) if (!cols.includes(f.label)) cols.push(f.label);
  const lines = [["Title", ...cols].map(csvCell).join(",")];
  for (const r of rows) {
    const byLabel = new Map(r.fields.map((f) => [f.label, f.encrypted ? "(encrypted by the owner)" : f.value]));
    lines.push([r.title, ...cols.map((c) => byLabel.get(c) ?? "")].map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

export async function buildContactExport(
  ownerId: string,
  onProgress?: (text: string, pct: number) => void,
): Promise<ContactExportResult> {
  onProgress?.("Collecting records", 0);
  const data = await getOwnerExport(ownerId);
  const entries: ZipEntry[] = [];
  const skipped: string[] = [];
  let records = 0;
  const index = ["Section,Group,Records"];

  for (const s of data.sections) {
    for (const g of s.groups) {
      records += g.rows.length;
      index.push(`${csvCell(s.section.label)},${csvCell(g.label)},${g.rows.length}`);
      const base = `Records/${safe(s.section.label)}/${safe(g.label)}`;
      entries.push({ name: `${base}.csv`, content: rowsToCsv(g.rows) });
      entries.push({ name: `${base}.json`, content: JSON.stringify(g.rows.map(({ photos: _p, ...r }) => r), null, 2) });
      // Record photos (pets, places, property…) next to their records.
      let n = 0;
      for (const r of g.rows) {
        for (const url of r.photos) {
          const res = await fetch(url).catch(() => null);
          if (!res?.ok) { skipped.push(`Photo for "${r.title}"`); continue; }
          const ext = (res.headers.get("content-type")?.split("/")[1] ?? "jpg").split(";")[0];
          entries.push({ name: `Files/Photos/${safe(s.section.label)}/${safe(r.title)} ${++n}.${ext}`, content: new Uint8Array(await res.arrayBuffer()) });
        }
      }
    }
  }

  let files = 0;
  const used = new Set<string>();
  for (let i = 0; i < data.documents.length; i++) {
    const d = data.documents[i];
    onProgress?.(`Downloading documents (${i + 1} of ${data.documents.length})`, Math.round((i / Math.max(1, data.documents.length)) * 100));
    const res = d.url ? await fetch(d.url).catch(() => null) : null;
    if (!res?.ok) { skipped.push(d.name); continue; }
    const base = `Files/Documents/${safe(d.folder)}/${safe(d.name)}`;
    let name = base; let n = 2;
    while (used.has(name)) name = base.replace(/(\.[^./]+)?$/, ` (${n++})$1`);
    used.add(name);
    entries.push({ name, content: new Uint8Array(await res.arrayBuffer()) });
    files++;
  }

  onProgress?.("Packaging", 100);
  entries.unshift({
    name: "README.txt",
    content: [
      "FINAL PASS DOWN — LEGACY VAULT",
      `Vault of: ${data.owner.name}`,
      `Downloaded: ${new Date(data.exportedAt).toLocaleString("en-US")}`,
      `Records: ${records} · Documents: ${files}`,
      "",
      "Records/   every section's entries, as .csv (opens in Excel) and .json.",
      "Files/     the stored documents and record photos.",
      "",
      "Fields the account holder encrypted (for example saved passwords) are",
      "marked \"encrypted by the owner\" and cannot be read here.",
      "This archive is a plain ZIP file, not encrypted: keep it somewhere safe.",
      "",
      skipped.length ? `Could not be included (${skipped.length}):\r\n  - ${skipped.join("\r\n  - ")}` : "Everything was included.",
    ].join("\r\n"),
  });
  entries.push({ name: "Records/INDEX.csv", content: index.join("\r\n") });

  const day = new Date().toISOString().slice(0, 10);
  return { blob: createZip(entries), fileName: `Legacy Vault - ${safe(data.owner.name)} - ${day}.zip`, records, files, skipped };
}
