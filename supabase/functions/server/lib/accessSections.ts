// What a Legacy or Guardian Contact can open, section by section, and how a
// row is turned into read-only label/value pairs for the Access Portal
// (routes/contactAccess.ts, migration 046).
//
// A Guardian is granted File Cabinet folders (ContactsHub FOLDER_CATALOG ids).
// A folder grant opens the app sections listed with that folder below, plus
// the documents filed in it. A Legacy Contact with live access gets every
// section, including the ones no folder maps to (`folders: []`).
//
// Rows are formatted generically rather than per screen: every column the
// owner filled in is shown, encrypted_* columns become "Encrypted by the
// owner" (the vault is passphrase-only until the Legacy Recovery Code, phase
// L2), and storage paths are left out except record photos, which are signed.

export interface TableSpec {
  table: string;
  /** Heading for this table's rows inside the section. */
  label: string;
  /** Only rows whose column is one of these values. */
  only?: { column: string; values: string[] };
  /** Rows the portal never shows (e.g. diary entries marked private). */
  hide?: (row: Record<string, unknown>) => boolean;
}

export interface SectionSpec {
  key: string;
  label: string;
  /** Guardian folder ids that open this section. Empty = Legacy only. */
  folders: string[];
  tables: TableSpec[];
}

export const SECTIONS: SectionSpec[] = [
  { key: "legal", label: "Legal & Final Wishes", folders: ["legal"], tables: [
    { table: "wills_trusts", label: "Wills & Trusts" },
    { table: "final_wishes", label: "Final Wishes" },
    { table: "funeral_plans", label: "Funeral Plan" },
  ] },
  { key: "financial", label: "Financial Records", folders: ["financial"], tables: [
    { table: "financial_records", label: "Accounts", only: { column: "section", values: ["personal", "portfolios", "retirement"] } },
  ] },
  { key: "insurance", label: "Insurance", folders: ["insurance"], tables: [
    { table: "financial_records", label: "Policies", only: { column: "section", values: ["insurance"] } },
  ] },
  { key: "taxes", label: "Taxes & Receipts", folders: ["taxes"], tables: [
    { table: "financial_records", label: "Tax Records", only: { column: "section", values: ["taxes"] } },
    { table: "receipts", label: "Receipts" },
  ] },
  { key: "business", label: "Business", folders: ["business"], tables: [
    { table: "financial_records", label: "Business Records", only: { column: "section", values: ["business"] } },
  ] },
  { key: "medical", label: "Medical", folders: ["medical"], tables: [
    { table: "medical_emergency_info", label: "Emergency Medical Info" },
    { table: "medications", label: "Medications" },
    { table: "allergies", label: "Allergies" },
  ] },
  { key: "property", label: "Real Estate", folders: ["property"], tables: [
    { table: "real_estate", label: "Properties" },
  ] },
  { key: "vehicles", label: "Vehicles", folders: ["vehicles"], tables: [
    { table: "vehicles", label: "Vehicles" },
  ] },
  { key: "utilities", label: "Utilities & Auto Pay", folders: ["utilities"], tables: [
    { table: "utilities", label: "Utilities" },
    { table: "subscription_tracker", label: "Auto Pay & Subscriptions" },
  ] },
  { key: "pets", label: "Pet Records", folders: ["pets"], tables: [
    { table: "pet_records", label: "Pets" },
  ] },
  { key: "memories", label: "Family Memories", folders: ["personal", "photos", "videos"], tables: [
    { table: "memories", label: "Memories" },
  ] },
  { key: "digital", label: "Digital Assets & Passwords", folders: ["digital", "crypto"], tables: [
    { table: "digital_assets", label: "Digital Assets" },
    { table: "password_vault", label: "Password Manager" },
  ] },
  // Legacy only. Messages to Loved Ones stay sealed while the owner is alive,
  // so no folder opens them for a Guardian.
  { key: "messages", label: "Messages to Loved Ones", folders: [], tables: [
    { table: "messages_to_loved_ones", label: "Messages" },
  ] },
  { key: "family", label: "Family & Friends", folders: [], tables: [
    { table: "family_friends", label: "People" },
    { table: "kids_activities", label: "Kids' Activities" },
    { table: "daycare_records", label: "Daycare" },
  ] },
  { key: "ids", label: "IDs & Work History", folders: [], tables: [
    { table: "id_keeper_records", label: "IDs" },
    { table: "job_history", label: "Job History" },
  ] },
  { key: "possessions", label: "Possessions & Warranties", folders: [], tables: [
    { table: "collectibles", label: "Collectibles" },
    { table: "weapons", label: "Firearms" },
    { table: "weapons_locker", label: "Weapons Locker" },
    { table: "warranties", label: "Warranties" },
  ] },
  { key: "places", label: "Travel & Favorite Places", folders: [], tables: [
    { table: "travel_trips", label: "Trips" },
    { table: "favorite_places", label: "Favorite Places" },
  ] },
  { key: "diary", label: "Digital Diary", folders: [], tables: [
    { table: "diary_entries", label: "Entries", hide: (r) => r.is_private === true },
  ] },
];

/** family_friends and contact_groups key off owner_user_id; the rest user_id. */
export function ownerColumn(table: string): "user_id" | "owner_user_id" {
  return table === "family_friends" ? "owner_user_id" : "user_id";
}

export function sectionsFor(kind: "legacy" | "guardian", folders: string[]): SectionSpec[] {
  if (kind === "legacy") return SECTIONS;
  return SECTIONS.filter((s) => s.folders.some((f) => folders.includes(f)));
}

// ── Row formatting ──────────────────────────────────────────────────────

export interface Field { label: string; value: string | null; encrypted?: boolean }
export interface PortalRow { id: string; title: string; fields: Field[]; photoPaths: string[] }

const SKIP = new Set(["id", "user_id", "owner_user_id", "created_at", "updated_at", "source_memory_id", "is_private"]);
const TITLE_KEYS = ["name", "title", "asset_name", "full_name", "item", "provider", "provider_name", "service_name",
  "allergen", "institution", "pet_name", "doc_type", "company", "employer", "address", "category"];

function humanize(key: string): string {
  const s = key.replace(/^encrypted_/, "").replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v.trim() ? v : null;
  if (Array.isArray(v)) {
    const parts = v.map((x) => (x && typeof x === "object" ? Object.values(x).map(text).filter(Boolean).join(" · ") : text(x)))
      .filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  if (typeof v === "object") {
    const parts = Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => { const t = text(x); return t ? `${humanize(k)}: ${t}` : null; })
      .filter(Boolean);
    return parts.length ? parts.join("\n") : null;
  }
  return String(v);
}

export function formatRow(row: Record<string, unknown>, ownerId: string, fallbackTitle: string): PortalRow {
  const fields: Field[] = [];
  const photoPaths: string[] = [];
  let title = "";
  for (const k of TITLE_KEYS) {
    const t = text(row[k]);
    if (t && !t.includes("\n")) { title = t; break; }
  }

  for (const [key, raw] of Object.entries(row)) {
    if (SKIP.has(key)) continue;
    if (key.startsWith("encrypted_")) {
      if (text(raw)) fields.push({ label: humanize(key), value: null, encrypted: true });
      continue;
    }
    // Storage paths: record photos are signed for display, anything else is
    // a file reference the generic viewer can't open, so it is left out.
    if (/(photo|image|avatar)/.test(key)) {
      const paths = (Array.isArray(raw) ? raw : [raw]).filter((p): p is string => typeof p === "string" && p.startsWith(`${ownerId}/`));
      photoPaths.push(...paths);
      if (paths.length) continue;
    }
    if (/(_url|_urls|_path|_paths)$/.test(key)) continue;
    // JSONB details: one field per inner key, so the layout matches the rest.
    if (key === "details" && raw && typeof raw === "object" && !Array.isArray(raw)) {
      for (const [dk, dv] of Object.entries(raw as Record<string, unknown>)) {
        const t = text(dv);
        if (t) fields.push({ label: humanize(dk), value: t });
      }
      continue;
    }
    const t = text(raw);
    if (t && t !== title) fields.push({ label: humanize(key), value: t });
  }
  return { id: String(row.id ?? row.user_id ?? crypto.randomUUID()), title: title || fallbackTitle, fields, photoPaths };
}
