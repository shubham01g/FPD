/**
 * calendarEvents — the aggregation layer behind the unified Calendar.
 *
 * The Calendar owns no data. Every entry is built from a row the signed-in
 * user created in a section that already exists (subscriptions, reminders,
 * occasions, warranties, IDs, travel, medical). This module normalises those
 * rows into one CalendarEvent shape and expands recurring ones across a range.
 *
 * Callers pass their rows in — nothing is declared here — so a brand-new
 * account opens an empty calendar rather than someone else's bills.
 */

export type EventSource =
  | "billing" | "reminder" | "occasion" | "warranty"
  | "document" | "travel" | "medical" | "concierge" | "custom";

export type Recurrence = "none" | "monthly" | "yearly";

export interface CalendarEvent {
  id: string;
  title: string;
  /** ISO yyyy-mm-dd for the specific occurrence */
  date: string;
  source: EventSource;
  detail?: string;
  amount?: number;
  /** Where the user should go to act on this */
  linkPage?: string;
  linkLabel?: string;
  recurrence: Recurrence;
  allDay?: boolean;
  time?: string;
}

export const SOURCE_META: Record<EventSource, { label: string; color: string; icon: string }> = {
  billing:   { label: "Auto Pay & Billing",  color: "#6E90C9", icon: "💳" },
  reminder:  { label: "Reminders",           color: "#F6AD55", icon: "🔔" },
  occasion:  { label: "Occasions",           color: "#FC8181", icon: "🎂" },
  warranty:  { label: "Warranties",          color: "#6FAE8B", icon: "🛡️" },
  document:  { label: "Document Expiry",     color: "#ED8936", icon: "🪪" },
  travel:    { label: "Travel",              color: "#D68FA8", icon: "✈️" },
  medical:   { label: "Medical",             color: "#D99A6B", icon: "💊" },
  concierge: { label: "White Glove Session", color: "#F6C453", icon: "⭐" },
  custom:    { label: "Personal",            color: "#6FAE8B", icon: "📌" },
};

/* ── Recurring rule ──────────────────────────────────────────────────
 * A source row becomes a Rule; expansion below turns rules into dated
 * CalendarEvents for a given month. */

export interface Rule extends Omit<CalendarEvent, "id" | "date"> {
  key: string;
  day: number;
  /** 0-indexed month the row's date falls in. */
  month?: number;
  year?: number;
}

/* ── Date helpers ───────────────────────────────────────────────────── */

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Clamp a day-of-month to a month that may be shorter (e.g. 30th in February). */
const clampDay = (y: number, m: number, day: number) => Math.min(day, daysInMonth(y, m));

/**
 * Parse a stored date. These columns are TEXT, not DATE, so the value can be
 * anything the user's screen wrote — tolerate junk and return null.
 */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  // "YYYY-MM-DD" must not be shifted by the local timezone, so build it by parts.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/* ── Source rows ─────────────────────────────────────────────────────
 * Structural shapes matching the columns each owning screen already reads,
 * so populating the calendar needs no new query. */

export interface SubscriptionRow {
  id: string; title: string; amount_usd: number | string | null;
  billing_frequency: string | null; next_billing_date: string | null;
  payment_type: string | null; last_four_digits: string | null;
  auto_pay: boolean | null; status: string | null; cancel_instructions: string | null;
}
export interface ReminderRow { id: string; title: string; dueDate: string; notes?: string; status?: string }
export interface OccasionRow { id: string; name: string; date: string; type?: string; recipient?: string; recurring?: boolean }
export interface WarrantyRow { id: string; product: string; expiry_date: string | null; provider?: string | null; warranty_type?: string | null }
export interface IdRow { id: string; id_type: string; expiry_date: string | null; holder_name?: string | null; issued_by?: string | null }
export interface TripRow { id: string; destination: string; start_date: string | null; end_date: string | null; status?: string | null; accommodation?: string | null }
export interface MedicationRow { id: string; name: string; refillDate: string; pharmacy?: string; prescriber?: string }

export interface CalendarSources {
  subscriptions?: SubscriptionRow[];
  reminders?: ReminderRow[];
  occasions?: OccasionRow[];
  warranties?: WarrantyRow[];
  ids?: IdRow[];
  trips?: TripRow[];
  medications?: MedicationRow[];
}

const MONTHLY_FREQUENCIES = new Set(["monthly", "weekly", "biweekly"]);

/**
 * Turn the user's own rows into calendar rules. A row with no usable date is
 * skipped rather than guessed at — an undated warranty is not an event.
 */
export function buildRules(src: CalendarSources): Rule[] {
  const rules: Rule[] = [];

  for (const sub of src.subscriptions ?? []) {
    if (sub.status && sub.status !== "active") continue;
    const due = parseDate(sub.next_billing_date);
    if (!due) continue;
    const freq = (sub.billing_frequency ?? "").toLowerCase();
    const amount = sub.amount_usd == null ? undefined : Number(sub.amount_usd);
    const card = sub.last_four_digits
      ? `${sub.payment_type ?? "Card"} •••• ${sub.last_four_digits}`
      : sub.payment_type ?? undefined;
    const detail = [card, sub.auto_pay ? "auto-pay on" : sub.cancel_instructions || undefined]
      .filter(Boolean).join(" · ") || undefined;
    rules.push({
      key: `bill-${sub.id}`, title: sub.title, source: "billing",
      recurrence: MONTHLY_FREQUENCIES.has(freq) ? "monthly" : freq === "yearly" ? "yearly" : "none",
      amount: Number.isFinite(amount) ? amount : undefined, detail, allDay: true,
      linkPage: "subscription-manager", linkLabel: "Auto Pay & Subs",
      day: due.getDate(), month: due.getMonth(), year: due.getFullYear(),
    });
  }

  for (const r of src.reminders ?? []) {
    if (r.status === "completed") continue;
    const due = parseDate(r.dueDate);
    if (!due) continue;
    rules.push({
      key: `rem-${r.id}`, title: r.title, source: "reminder", recurrence: "none",
      detail: r.notes || undefined, linkPage: "organize", linkLabel: "Folders & Reminders",
      day: due.getDate(), month: due.getMonth(), year: due.getFullYear(),
    });
  }

  for (const o of src.occasions ?? []) {
    const when = parseDate(o.date);
    if (!when) continue;
    rules.push({
      key: `occ-${o.id}`, title: o.name, source: "occasion",
      recurrence: o.recurring === false ? "none" : "yearly",
      detail: [o.recipient, o.type].filter(Boolean).join(" · ") || undefined,
      allDay: true, linkPage: "organize", linkLabel: "Folders & Reminders",
      day: when.getDate(), month: when.getMonth(), year: when.getFullYear(),
    });
  }

  for (const w of src.warranties ?? []) {
    const end = parseDate(w.expiry_date);
    if (!end) continue;
    rules.push({
      key: `war-${w.id}`, title: `${w.product} warranty ends`, source: "warranty", recurrence: "none",
      detail: [w.warranty_type, w.provider].filter(Boolean).join(" · ") || undefined,
      linkPage: "warranties", linkLabel: "Warranties",
      day: end.getDate(), month: end.getMonth(), year: end.getFullYear(),
    });
  }

  for (const d of src.ids ?? []) {
    const end = parseDate(d.expiry_date);
    if (!end) continue;
    rules.push({
      key: `id-${d.id}`, title: `${d.id_type} expires`, source: "document", recurrence: "none",
      detail: [d.holder_name, d.issued_by].filter(Boolean).join(" · ") || undefined,
      linkPage: "id-keeper", linkLabel: "ID Keeper",
      day: end.getDate(), month: end.getMonth(), year: end.getFullYear(),
    });
  }

  for (const t of src.trips ?? []) {
    if (t.status === "cancelled") continue;
    const start = parseDate(t.start_date);
    const end = parseDate(t.end_date);
    if (start) {
      rules.push({
        key: `trip-${t.id}-out`, title: `${t.destination} — departs`, source: "travel", recurrence: "none",
        detail: t.accommodation || undefined, linkPage: "travel-planner", linkLabel: "Travel Planner",
        day: start.getDate(), month: start.getMonth(), year: start.getFullYear(),
      });
    }
    if (end) {
      rules.push({
        key: `trip-${t.id}-back`, title: `${t.destination} — returns`, source: "travel", recurrence: "none",
        linkPage: "travel-planner", linkLabel: "Travel Planner",
        day: end.getDate(), month: end.getMonth(), year: end.getFullYear(),
      });
    }
  }

  for (const m of src.medications ?? []) {
    const refill = parseDate(m.refillDate);
    if (!refill) continue;
    rules.push({
      key: `med-${m.id}`, title: `${m.name} refill due`, source: "medical", recurrence: "none",
      detail: [m.pharmacy, m.prescriber].filter(Boolean).join(" · ") || undefined,
      linkPage: "medical-info", linkLabel: "Medical Info",
      day: refill.getDate(), month: refill.getMonth(), year: refill.getFullYear(),
    });
  }

  return rules;
}

/**
 * Expand rules into concrete events for [year, month].
 * Monthly rules repeat from their first date onward; yearly rules land in
 * their own month; one-off rules only in their exact month and year.
 */
export function eventsForMonth(year: number, month: number, rules: Rule[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const monthIndex = year * 12 + month;

  for (const rule of rules) {
    if (rule.recurrence === "monthly") {
      // Never project a subscription backwards before its first billing date.
      if (rule.year !== undefined && rule.month !== undefined && monthIndex < rule.year * 12 + rule.month) continue;
    } else if (rule.recurrence === "yearly") {
      if (rule.month !== month) continue;
      if (rule.year !== undefined && year < rule.year) continue;
    } else {
      if (rule.month !== month) continue;
      if ((rule.year ?? year) !== year) continue;
    }

    const { key, day, month: _ruleMonth, year: _ruleYear, ...rest } = rule;
    out.push({ ...rest, id: `${key}-${monthIndex}`, date: iso(year, month, clampDay(year, month, day)) });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Every event between two dates, walking month by month. */
export function eventsInRange(from: Date, to: Date, rules: Rule[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    out.push(...eventsForMonth(cursor.getFullYear(), cursor.getMonth(), rules));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const fromIso = iso(from.getFullYear(), from.getMonth(), from.getDate());
  const toIso = iso(to.getFullYear(), to.getMonth(), to.getDate());
  return out
    .filter(e => e.date >= fromIso && e.date <= toIso)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Next N events from today forward — powers the "Upcoming" rail. */
export function upcomingEvents(rules: Rule[], count = 8, from = new Date()): CalendarEvent[] {
  const to = new Date(from);
  to.setMonth(to.getMonth() + 6);
  return eventsInRange(from, to, rules).slice(0, count);
}

/** Total auto-pay dollars scheduled in a given month. */
export function monthlyBillingTotal(year: number, month: number, rules: Rule[]): number {
  return eventsForMonth(year, month, rules)
    .filter(e => e.source === "billing")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
}
