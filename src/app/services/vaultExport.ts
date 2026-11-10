/**
 * A real export of the signed-in owner's vault, built in the browser.
 *
 * Replaces three fakes: the Legacy Vault ZIP ("DEMONSTRATION EXPORT — NOT A
 * BACKUP", manifests only), VaultClone's random progress bar, and Disaster
 * Recovery's made-up download link.
 *
 * The archive holds, for every section, the owner's records as JSON and
 * CSV, plus the stored files themselves: File Cabinet documents, record
 * photos, recordings, and the Secret Vault when it is unlocked in this
 * session. It is built client-side with utils/zip.ts, so it reads exactly
 * what this account's database rules allow, and no edge-function memory or
 * time limit applies.
 *
 * Password Manager and Auto Pay passwords stay encrypted (ciphertext); the
 * README says they need the vault passphrase.
 */
import { supabase } from "./supabase";
import { secretVault } from "./secretVault";
import { createZip, type ZipEntry } from "../utils/zip";

export interface ExportSection { id: string; label: string; tables: string[] }

/** Folders in the archive. Keep in step with server lib/accessSections.ts. */
export const EXPORT_SECTIONS: ExportSection[] = [
  { id: "legal",     label: "Wills, Trusts & Final Wishes", tables: ["wills_trusts", "final_wishes", "funeral_plans"] },
  { id: "financial", label: "Financial Records",             tables: ["financial_records", "receipts"] },
  { id: "medical",   label: "Medical",                       tables: ["medical_emergency_info", "medications", "allergies"] },
  { id: "assets",    label: "Personal Assets",               tables: ["real_estate", "vehicles", "digital_assets", "weapons", "weapons_locker", "collectibles", "warranties"] },
  { id: "home",      label: "Home & Bills",                  tables: ["utilities", "subscription_tracker"] },
  { id: "passwords", label: "Password Manager",              tables: ["password_vault"] },
  { id: "people",    label: "People & Contacts",             tables: ["contacts", "family_friends", "contact_groups"] },
  { id: "family",    label: "Family & Memories",             tables: ["memories", "occasions", "messages_to_loved_ones", "diary_entries", "kids_activities", "daycare_records", "pet_records"] },
  { id: "life",      label: "Life Records",                  tables: ["id_keeper_records", "job_history", "travel_trips", "favorite_places", "reminders"] },
];

const OWNER_COLUMN: Record<string, string> = { contacts: "owner_user_id", family_friends: "owner_user_id", contact_groups: "owner_user_id" };

/* Columns never worth exporting: hashes and internal tokens. */
const DROP_COLUMNS = new Set(["invite_token_hash", "invite_token_expires_at"]);

const ownerCol = (t: string) => OWNER_COLUMN[t] ?? "user_id";

/** How many records each table holds for this owner (missing tables → 0). */
export async function countRecords(uid: string, tables: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(tables.map(async (t) => {
    // "*" not "id": funeral_plans and medical_emergency_info are keyed by user_id and have no id column.
    const { count } = await supabase.from(t).select("*", { count: "exact", head: true }).eq(ownerCol(t), uid);
    out[t] = count ?? 0;
  }));
  return out;
}

const LABEL_FIELDS = ["title", "name", "item_name", "product", "full_name", "property_name", "asset_name", "merchant",
  "destination", "employer", "service", "doc_type", "id_type", "facility_name", "child_name", "allergen", "item", "category"];
const DATE_FIELDS = ["date", "memory_date", "receipt_date", "start_date", "purchase_date", "created_at"];

export interface PreviewRow { label: string; detail: string }

/** A readable list of an owner's records, for the Legacy Vault preview. */
export async function previewRecords(uid: string, tables: string[]): Promise<{ table: string; rows: PreviewRow[] }[]> {
  return Promise.all(tables.map(async (t) => {
    const { data } = await supabase.from(t).select("*").eq(ownerCol(t), uid).limit(100);
    const rows = (data ?? []).map((r: Record<string, unknown>) => {
      const label = LABEL_FIELDS.map((f) => r[f]).find((v) => typeof v === "string" && v.trim()) as string | undefined;
      const d = DATE_FIELDS.map((f) => r[f]).find((v) => typeof v === "string" && v) as string | undefined;
      return { label: label ?? "(untitled)", detail: d ? new Date(d).toLocaleDateString("en-US") : "" };
    });
    return { table: t, rows };
  }));
}

export interface ExportOptions {
  sections?: string[];           // EXPORT_SECTIONS ids; all when omitted
  /** Export only these tables, as one folder (overrides `sections`). */
  custom?: ExportSection;
  includeFiles?: boolean;        // stored documents, photos, recordings (default true)
  includeSecretVault?: boolean;  // only if it is unlocked in this session
  /** Only File Cabinet documents in these categories (folder ids); other
   *  stored files (photos, recordings) are then left out. */
  docCategories?: string[];
}

export interface ExportProgress { phase: string; done: number; total: number }

export interface ExportResult { blob: Blob; files: number; records: number; skipped: string[]; bytes: number }

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>()));
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n");
}

const safeName = (s: string) => s.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);

/** Recovers "original.pdf" from "<uid>/<uuid>-original.pdf". */
function fileNameOf(path: string): string {
  const last = path.split("/").pop() ?? path;
  return last.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, "");
}

async function download(bucket: string, path: string): Promise<Uint8Array | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return null;
  return new Uint8Array(await data.arrayBuffer());
}

/** Every object under "<uid>/" (one level) and "<uid>/media/". */
async function listOwnFiles(bucket: string, uid: string): Promise<string[]> {
  const out: string[] = [];
  for (const dir of [uid, `${uid}/media`]) {
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(dir, { limit: 1000, offset });
      if (error || !data?.length) break;
      for (const o of data) if (o.id) out.push(`${dir}/${o.name}`); // folders have no id
      if (data.length < 1000) break;
      offset += 1000;
    }
  }
  return out;
}

export async function buildVaultExport(
  owner: { id: string; name: string; email: string },
  opts: ExportOptions = {},
  onProgress?: (p: ExportProgress) => void,
): Promise<ExportResult> {
  const sections = opts.custom ? [opts.custom] : EXPORT_SECTIONS.filter((s) => !opts.sections || opts.sections.includes(s.id));
  const includeFiles = opts.includeFiles !== false;
  const entries: ZipEntry[] = [];
  const skipped: string[] = [];
  let records = 0;
  let files = 0;
  let bytes = 0;

  // 1. Records, one JSON + CSV per table.
  const tableCount = sections.reduce((n, s) => n + s.tables.length, 0);
  let doneTables = 0;
  const index: string[] = ["Section,Table,Records"];
  for (const s of sections) {
    for (const t of s.tables) {
      onProgress?.({ phase: `Collecting ${s.label}`, done: doneTables, total: tableCount });
      const { data, error } = await supabase.from(t).select("*").eq(ownerCol(t), owner.id);
      doneTables++;
      if (error) { skipped.push(`${t} (${error.message})`); continue; }
      const rows = (data ?? []).map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !DROP_COLUMNS.has(k))));
      records += rows.length;
      index.push(`${csvCell(s.label)},${t},${rows.length}`);
      if (!rows.length) continue;
      const base = `Records/${safeName(s.label)}/${t}`;
      entries.push({ name: `${base}.json`, content: JSON.stringify(rows, null, 2) });
      entries.push({ name: `${base}.csv`, content: toCsv(rows) });
    }
  }

  // 2. Stored files.
  if (includeFiles) {
    const { data: docs } = await supabase.from("vault_documents")
      .select("name, category, sub_category, file_path").eq("user_id", owner.id);
    const allDocs = (docs ?? []).filter((d) => d.file_path && !String(d.file_path).includes("/manual-"));
    const docPaths = new Set(allDocs.map((d) => d.file_path as string));
    const docRows = opts.docCategories ? allDocs.filter((d) => opts.docCategories!.includes(String(d.category))) : allDocs;
    const [vaultObjects, photoObjects] = opts.docCategories
      ? [[], []] as string[][]
      : await Promise.all([listOwnFiles("vault-documents", owner.id), listOwnFiles("record-photos", owner.id)]);
    const loose = vaultObjects.filter((p) => !docPaths.has(p)); // recordings and attachments
    let secretDocs: { name: string; file_path: string; downloadUrl: string | null }[] = [];
    if (opts.includeSecretVault) {
      try { secretDocs = (await secretVault.list()).docs; }
      catch { skipped.push("Secret Vault (locked — open it with your PIN, then export again)"); }
    }

    const jobs: { bucket: string; path: string; name: string; url?: string | null }[] = [
      ...docRows.map((d) => ({
        bucket: "vault-documents", path: d.file_path as string,
        name: `Files/File Cabinet/${safeName(String(d.category))}${d.sub_category ? `/${safeName(String(d.sub_category))}` : ""}/${safeName(String(d.name))}`,
      })),
      ...loose.map((p) => ({ bucket: "vault-documents", path: p, name: `Files/${p.includes("/media/") ? "Recordings & Media" : "Attachments"}/${safeName(fileNameOf(p))}` })),
      ...photoObjects.map((p) => ({ bucket: "record-photos", path: p, name: `Files/Photos/${safeName(fileNameOf(p))}` })),
      ...secretDocs.map((d) => ({ bucket: "", path: d.file_path, name: `Files/Secret Vault/${safeName(d.name)}`, url: d.downloadUrl })),
    ];

    const used = new Set<string>();
    for (let i = 0; i < jobs.length; i++) {
      const j = jobs[i];
      onProgress?.({ phase: `Downloading files (${i + 1} of ${jobs.length})`, done: i, total: jobs.length });
      let bytesOf: Uint8Array | null = null;
      if (j.url) {
        const res = await fetch(j.url).catch(() => null);
        bytesOf = res?.ok ? new Uint8Array(await res.arrayBuffer()) : null;
      } else {
        bytesOf = await download(j.bucket, j.path);
      }
      if (!bytesOf) { skipped.push(j.name); continue; }
      // Two files with the same name in one folder must not overwrite.
      let name = j.name; let n = 2;
      while (used.has(name)) name = j.name.replace(/(\.[^./]+)?$/, ` (${n++})$1`);
      used.add(name);
      entries.push({ name, content: bytesOf });
      files++;
      bytes += bytesOf.length;
    }
  }

  onProgress?.({ phase: "Packaging", done: 1, total: 1 });
  entries.unshift({
    name: "README.txt",
    content: [
      "FINAL PASS DOWN — VAULT EXPORT",
      `Account holder: ${owner.name || owner.email}`,
      `Exported: ${new Date().toLocaleString("en-US")}`,
      `Records: ${records} · Files: ${files}`,
      "",
      "Records/   every section's entries, as .json and as .csv (opens in Excel).",
      "Files/     the stored documents, photos and recordings themselves.",
      "",
      "Password Manager and Auto Pay passwords are exported still encrypted",
      "(the long \"v1.…\" values). Only the vault passphrase can decrypt them;",
      "open Password Manager in Final Pass Down to read them.",
      "",
      skipped.length ? `Could not be included (${skipped.length}):\n  - ${skipped.join("\n  - ")}` : "Everything requested was included.",
    ].join("\r\n"),
  });
  entries.push({ name: "Records/INDEX.csv", content: index.join("\r\n") });

  const blob = createZip(entries);
  return { blob, files, records, skipped, bytes };
}
