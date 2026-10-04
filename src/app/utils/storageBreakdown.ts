/**
 * Real per-user storage figures, shared by the Dashboard breakdown and the
 * Usage & Billing page so the two views can never drift apart.
 *
 * This module used to export flat constants — 16.9 GB used of 25 GB, split
 * across six invented categories — that every account saw regardless of what
 * it actually held.
 *
 * The split is now derived from the caller's own `docs` (vault_documents
 * rows), which is the same set DemoContext sums into `user.storageUsed`. That
 * keeps the meter segments adding up to the headline figure by construction.
 *
 * `storage_usage` is deliberately NOT the source: nothing in the app or the
 * Edge functions ever writes a row to it, so it reports 0 for everyone.
 *
 * Known gap: photos uploaded through PhotoPicker go to the `record-photos`
 * bucket and never create a vault_documents row, so they are outside both
 * this breakdown and `user.storageUsed`.
 */

export interface StorageCategory {
  key: string;
  label: string;
  gb: number;
  files: number;
  color: string;
}

/** Document row shape this module needs — matches DemoContext's `Doc`. */
export interface SizedDoc {
  category: string;
  size: number;
  sizeUnit: "MB" | "GB";
}

/* Labels and colours for the file-cabinet folder ids a document can carry.
   Anything unrecognised falls through to "Other Documents". */
const CATEGORY_META: Record<string, { label: string; color: string }> = {
  legal:     { label: "Legal Documents",       color: "#6E90C9" },
  financial: { label: "Financial Records",     color: "#D99A6B" },
  medical:   { label: "Medical Records",       color: "#FC8181" },
  taxes:     { label: "Tax Records",           color: "#F6AD55" },
  property:  { label: "Property & Real Estate",color: "#ED8936" },
  vehicles:  { label: "Vehicles",              color: "#6FAE8B" },
  utilities: { label: "Utilities & Services",  color: "#D68FA8" },
  insurance: { label: "Insurance Policies",    color: "#6E90C9" },
  pets:      { label: "Pet Records",           color: "#F6AD55" },
  personal:  { label: "Personal Letters",      color: "#E53E3E" },
  photos:    { label: "Photo Albums",          color: "#F6AD55" },
  videos:    { label: "Videos & Recordings",   color: "#6E90C9" },
  digital:   { label: "Digital Assets",        color: "#6E90C9" },
  business:  { label: "Business Records",      color: "#D99A6B" },
  crypto:    { label: "Crypto & NFTs",         color: "#F6AD55" },
  education: { label: "Education & Awards",    color: "#6FAE8B" },
  military:  { label: "Military Records",      color: "#ED8936" },
  other:     { label: "Other Documents",       color: "#929CBC" },
};

const toGb = (d: SizedDoc) => (d.sizeUnit === "GB" ? d.size : d.size / 1024);

/**
 * Group the user's documents into sized categories, largest first.
 * Returns [] for an account with no documents — the correct state for a new
 * user, and what the callers render their empty state from.
 */
export function deriveStorageBreakdown(docs: SizedDoc[]): StorageCategory[] {
  const totals = new Map<string, { gb: number; files: number }>();

  for (const doc of docs) {
    const key = CATEGORY_META[doc.category] ? doc.category : "other";
    const entry = totals.get(key) ?? { gb: 0, files: 0 };
    entry.gb += toGb(doc);
    entry.files += 1;
    totals.set(key, entry);
  }

  return [...totals.entries()]
    .map(([key, { gb, files }]) => ({
      key,
      label: CATEGORY_META[key].label,
      color: CATEGORY_META[key].color,
      gb: Math.round(gb * 100) / 100,
      files,
    }))
    .sort((a, b) => b.gb - a.gb);
}

/** A sized document that also carries when it was uploaded (ISO). */
export interface DatedDoc extends SizedDoc {
  uploadedAt: string;
}

export interface MonthlyUsage {
  month: string;
  used: number;
}

/**
 * Storage held at the end of each of the last `months` months (the current
 * month runs to today), built from each document's upload date.
 *
 * `storage_usage` has no rows to chart, so the history is reconstructed from
 * the documents themselves. Known limit: a file deleted since is gone from
 * every month, so past bars can read lower than they really were.
 */
export function deriveMonthlyUsage(docs: DatedDoc[], months = 6, now = new Date()): MonthlyUsage[] {
  const out: MonthlyUsage[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const gb = docs.reduce((sum, d) => (new Date(d.uploadedAt) < nextMonthStart ? sum + toGb(d) : sum), 0);
    out.push({
      month: monthStart.toLocaleDateString("en-US", { month: "short" }),
      used: Math.round(gb * 100) / 100,
    });
  }
  return out;
}

/**
 * Projected storage at the end of the current month: what is stored now plus
 * this month's upload pace carried through the days that remain.
 */
export function projectEndOfMonth(docs: DatedDoc[], usedGb: number, now = new Date()): number {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const addedThisMonth = docs.reduce((sum, d) => (new Date(d.uploadedAt) >= monthStart ? sum + toGb(d) : sum), 0);
  const perDay = addedThisMonth / now.getDate();
  return Math.round((usedGb + perDay * (daysInMonth - now.getDate())) * 100) / 100;
}
