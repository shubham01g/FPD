/**
 * calendarEvents — the aggregation layer behind the unified Calendar.
 *
 * The Calendar does not own any data. Every entry comes from a section that
 * already exists in the app (subscriptions, reminders, occasions, warranties,
 * IDs, travel, medical, concierge). This module normalises those into one
 * CalendarEvent shape and expands the recurring ones across a date range.
 *
 * Sources are declared here rather than imported from each component because
 * those components hold their data in local useState. When the API lands,
 * replace the SOURCE_* arrays with fetches — the expansion logic is unchanged.
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
  billing:   { label: "Auto Pay & Billing",  color: "#5B6EE1", icon: "💳" },
  reminder:  { label: "Reminders",           color: "#F6AD55", icon: "🔔" },
  occasion:  { label: "Occasions",           color: "#FC8181", icon: "🎂" },
  warranty:  { label: "Warranties",          color: "#5BA7D6", icon: "🛡️" },
  document:  { label: "Document Expiry",     color: "#ED8936", icon: "🪪" },
  travel:    { label: "Travel",              color: "#5A8078", icon: "✈️" },
  medical:   { label: "Medical",             color: "#48BB78", icon: "💊" },
  concierge: { label: "White Glove Session", color: "#F6C453", icon: "⭐" },
  custom:    { label: "Personal",            color: "#5BA7D6", icon: "📌" },
};

/* ── Seed data, mirroring what each section already shows ───────────── */

type Seed = Omit<CalendarEvent, "id" | "date"> & { day: number; month?: number; year?: number };

/** Recurring monthly — only `day` matters; expanded into every month in range. */
const SOURCE_BILLING: Seed[] = [
  { day: 1,  title: "Netflix",                amount: 22.99,  source: "billing", recurrence: "monthly", detail: "Visa •••• 8821 · auto-pay on",       linkPage: "subscription-manager", linkLabel: "Auto Pay & Subs" },
  { day: 28, title: "Spotify Premium",        amount: 11.99,  source: "billing", recurrence: "monthly", detail: "Mastercard •••• 4492 · auto-pay on", linkPage: "subscription-manager", linkLabel: "Auto Pay & Subs" },
  { day: 5,  title: "Adobe Creative Cloud",   amount: 59.99,  source: "billing", recurrence: "monthly", detail: "Amex •••• 3321 · auto-pay on",       linkPage: "subscription-manager", linkLabel: "Auto Pay & Subs" },
  { day: 3,  title: "SMUD Electric",          amount: 142.00, source: "billing", recurrence: "monthly", detail: "Checking •••• 8821 · auto-pay on",   linkPage: "subscription-manager", linkLabel: "Auto Pay & Subs" },
  { day: 30, title: "Planet Fitness",         amount: 24.99,  source: "billing", recurrence: "monthly", detail: "Cancel in person only",              linkPage: "subscription-manager", linkLabel: "Auto Pay & Subs" },
  { day: 15, title: "Final Pass Down — Legacy Archive", amount: 24.99, source: "billing", recurrence: "monthly", detail: "Your FPD plan", linkPage: "storage-usage", linkLabel: "Usage & Billing" },
];

/** Recurring yearly — `day` + `month` (0-indexed). */
const SOURCE_OCCASION: Seed[] = [
  { day: 12, month: 6,  title: "Sarah's Birthday",           source: "occasion", recurrence: "yearly", detail: "Spouse · turning 64",           linkPage: "organize", linkLabel: "Folders & Reminders" },
  { day: 24, month: 6,  title: "Wedding Anniversary",        source: "occasion", recurrence: "yearly", detail: "38 years — Sarah & James",       linkPage: "organize", linkLabel: "Folders & Reminders" },
  { day: 8,  month: 7,  title: "Michael's Birthday",         source: "occasion", recurrence: "yearly", detail: "Son",                            linkPage: "organize", linkLabel: "Folders & Reminders" },
  { day: 19, month: 9,  title: "Emily's Birthday",           source: "occasion", recurrence: "yearly", detail: "Daughter",                       linkPage: "organize", linkLabel: "Folders & Reminders" },
  { day: 2,  month: 11, title: "Tyler's Birthday",           source: "occasion", recurrence: "yearly", detail: "Grandson",                       linkPage: "organize", linkLabel: "Folders & Reminders" },
];

/** One-off, dated events. `month` is 0-indexed, `year` defaults to current. */
const SOURCE_FIXED: Seed[] = [
  // Reminders
  { day: 22, month: 6, title: "Review Living Trust with attorney", source: "reminder", recurrence: "none", detail: "Annual review — Linda Torres, Esq.", linkPage: "wills-trusts", linkLabel: "Wills & Trusts", time: "10:00 AM" },
  { day: 29, month: 6, title: "Update legacy contact permissions", source: "reminder", recurrence: "none", detail: "Robert Doe verification still pending", linkPage: "contacts-legacy", linkLabel: "Legacy Contacts" },
  { day: 14, month: 7, title: "Quarterly vault review",            source: "reminder", recurrence: "none", detail: "Check every folder is current", linkPage: "file-cabinet", linkLabel: "File Cabinet" },
  { day: 6,  month: 8, title: "Renew homeowners insurance",        source: "reminder", recurrence: "none", detail: "State Farm — policy HO-4482910", linkPage: "financial-records", linkLabel: "Financial Records" },

  // Warranties
  { day: 26, month: 6, title: "Samsung Refrigerator warranty ends", source: "warranty", recurrence: "none", detail: "5-year extended · claim before expiry", linkPage: "warranties", linkLabel: "Warranties" },
  { day: 11, month: 7, title: "Trane HVAC warranty ends",           source: "warranty", recurrence: "none", detail: "10-year parts warranty",              linkPage: "warranties", linkLabel: "Warranties" },
  { day: 3,  month: 9, title: "MacBook Pro AppleCare ends",         source: "warranty", recurrence: "none", detail: "Extend or let lapse",                 linkPage: "warranties", linkLabel: "Warranties" },

  // Document / ID expiry
  { day: 30, month: 7,  title: "Passport expires",              source: "document", recurrence: "none", detail: "Renew 6 months early for travel", linkPage: "id-keeper", linkLabel: "ID Keeper" },
  { day: 17, month: 8,  title: "Driver's license expires",      source: "document", recurrence: "none", detail: "CA DL · renewal notice received",  linkPage: "id-keeper", linkLabel: "ID Keeper" },
  { day: 9,  month: 10, title: "Vehicle registration — Mustang", source: "document", recurrence: "none", detail: "1967 Ford Mustang · plate 4XYZ123", linkPage: "personal-assets", linkLabel: "Assets & Property" },

  // Travel
  { day: 24, month: 7, title: "Big Sur trip — departs",  source: "travel", recurrence: "none", detail: "4 nights · Post Ranch Inn", linkPage: "travel-planner", linkLabel: "Travel Planner" },
  { day: 28, month: 7, title: "Big Sur trip — returns",  source: "travel", recurrence: "none", detail: "Family of 5",               linkPage: "travel-planner", linkLabel: "Travel Planner" },

  // Medical
  { day: 21, month: 6, title: "Lisinopril refill due",       source: "medical", recurrence: "none", detail: "CVS Pharmacy · Dr. Karen Fields",  linkPage: "medical-info", linkLabel: "Medical Info", time: "Any time" },
  { day: 15, month: 7, title: "Annual physical — Dr. Fields", source: "medical", recurrence: "none", detail: "Sacramento Medical Group",         linkPage: "medical-info", linkLabel: "Medical Info", time: "8:30 AM" },
  { day: 2,  month: 8, title: "Cardiology follow-up",         source: "medical", recurrence: "none", detail: "Bring current medication list",     linkPage: "medical-info", linkLabel: "Medical Info", time: "2:15 PM" },

  // Concierge
  { day: 23, month: 6, title: "White Glove session — document review", source: "concierge", recurrence: "none", detail: "Specialist: Marcus Williams · 60 min", linkPage: "white-glove", linkLabel: "White Glove Service", time: "11:00 AM" },
];

/* ── Date helpers ───────────────────────────────────────────────────── */

export const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

export const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Clamp a day-of-month to a month that may be shorter (e.g. 30th in February). */
const clampDay = (y: number, m: number, day: number) => Math.min(day, daysInMonth(y, m));

/**
 * Expand all seeds into concrete events for [year, month].
 * Monthly seeds appear every month; yearly seeds only in their own month.
 */
export function eventsForMonth(year: number, month: number): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  SOURCE_BILLING.forEach((s, i) => {
    const d = clampDay(year, month, s.day);
    out.push({ ...s, id: `bill-${i}-${year}-${month}`, date: iso(year, month, d), allDay: true });
  });

  SOURCE_OCCASION.forEach((s, i) => {
    if (s.month !== month) return;
    const d = clampDay(year, month, s.day);
    out.push({ ...s, id: `occ-${i}-${year}`, date: iso(year, month, d), allDay: true });
  });

  SOURCE_FIXED.forEach((s, i) => {
    const y = s.year ?? year;
    if (s.month !== month || y !== year) return;
    const d = clampDay(year, month, s.day);
    out.push({ ...s, id: `fix-${i}`, date: iso(year, month, d) });
  });

  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Every event between two dates, walking month by month. */
export function eventsInRange(from: Date, to: Date): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    out.push(...eventsForMonth(cursor.getFullYear(), cursor.getMonth()));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const fromIso = iso(from.getFullYear(), from.getMonth(), from.getDate());
  const toIso = iso(to.getFullYear(), to.getMonth(), to.getDate());
  return out
    .filter(e => e.date >= fromIso && e.date <= toIso)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Next N events from today forward — powers the "Upcoming" rail. */
export function upcomingEvents(count = 8, from = new Date()): CalendarEvent[] {
  const to = new Date(from);
  to.setMonth(to.getMonth() + 6);
  return eventsInRange(from, to).slice(0, count);
}

/** Total auto-pay dollars scheduled in a given month. */
export function monthlyBillingTotal(year: number, month: number): number {
  return eventsForMonth(year, month)
    .filter(e => e.source === "billing")
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
}
