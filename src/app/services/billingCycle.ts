/**
 * billingCycle — "bill due on day X" for Auto Pay & Subscriptions.
 *
 * A subscription stores two things (migration 037):
 *   - next_billing_date  the cycle anchor, always a real yyyy-mm-dd. Weekly
 *                        and Biweekly bills take their weekday from it.
 *   - due_day            the day of the month a Monthly / Quarterly / Yearly
 *                        bill is due. Kept separately because a bill due on
 *                        the 31st lands on Nov 30, and the anchor alone would
 *                        then forget the 31st.
 *
 * Shared by the Auto Pay screen and the Calendar so both say the same thing.
 * Dates are always built from their parts — `new Date("yyyy-mm-dd")` is read
 * as UTC midnight and slips back a day in US time zones.
 */

export type Frequency = "Weekly" | "Biweekly" | "Monthly" | "Quarterly" | "Yearly";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Day-step cycles; everything else steps by whole months. */
export const CYCLE_DAYS: Partial<Record<Frequency, number>> = { Weekly: 7, Biweekly: 14 };
export const CYCLE_MONTHS: Partial<Record<Frequency, number>> = { Monthly: 1, Quarterly: 3, Yearly: 12 };

export const AMOUNT_LABEL: Record<Frequency, string> = {
  Weekly: "WEEKLY AMOUNT ($)",
  Biweekly: "AMOUNT EVERY 2 WEEKS ($)",
  Monthly: "MONTHLY AMOUNT ($)",
  Quarterly: "AMOUNT PER QUARTER ($)",
  Yearly: "YEARLY AMOUNT ($)",
};

const pad = (n: number) => String(n).padStart(2, "0");
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** yyyy-mm-dd → local Date, or null for anything else. */
export function parseIso(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? "").trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
/** The due day in a given month, pulled back for short months (31st → Nov 30). */
const onDay = (y: number, m: number, day: number) => new Date(y, m, Math.min(day, daysInMonth(y, m)));
/** Whole days from a to b, immune to DST shifts. */
const dayDiff = (a: Date, b: Date) =>
  Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);

export function ordinal(n: number): string {
  const v = n % 100;
  const suffix = v >= 11 && v <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

export const fmtDue = (d: Date) => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

/** What the form collects, depending on the cycle. */
export interface DueInput {
  /** Monthly: 1-31 */
  dueDay?: number;
  /** Weekly / Biweekly: 0 = Sunday */
  weekday?: number;
  /** Quarterly / Yearly: yyyy-mm-dd */
  firstDue?: string;
}

/**
 * The anchor date to store in next_billing_date for what the form collected,
 * or null when the cycle's field is still empty.
 */
export function anchorFor(freq: Frequency, input: DueInput, today = new Date()): string | null {
  const t = startOfDay(today);
  if (CYCLE_DAYS[freq]) {
    if (input.weekday == null) return null;
    const ahead = (input.weekday - t.getDay() + 7) % 7;
    return toIso(new Date(t.getFullYear(), t.getMonth(), t.getDate() + ahead));
  }
  if (freq === "Monthly") {
    if (!input.dueDay) return null;
    const thisMonth = onDay(t.getFullYear(), t.getMonth(), input.dueDay);
    return toIso(thisMonth >= t ? thisMonth : onDay(t.getFullYear(), t.getMonth() + 1, input.dueDay));
  }
  return parseIso(input.firstDue) ? input.firstDue!.slice(0, 10) : null;
}

/** The first payment on or after today, stepping forward from the anchor. */
export function nextDue(anchorIso: string | null | undefined, freq: Frequency, dueDay?: number | null, today = new Date()): Date | null {
  const a = parseIso(anchorIso);
  if (!a) return null;
  const t = startOfDay(today);
  const stepDays = CYCLE_DAYS[freq];
  if (stepDays) {
    if (a >= t) return a;
    const n = Math.ceil(dayDiff(a, t) / stepDays);
    return new Date(a.getFullYear(), a.getMonth(), a.getDate() + n * stepDays);
  }
  const step = CYCLE_MONTHS[freq] ?? 1;
  const day = dueDay || a.getDate();
  if (a >= t) return onDay(a.getFullYear(), a.getMonth(), day);
  const months = (t.getFullYear() - a.getFullYear()) * 12 + (t.getMonth() - a.getMonth());
  let i = Math.floor(months / step) * step;
  let candidate = onDay(a.getFullYear(), a.getMonth() + i, day);
  if (candidate < t) { i += step; candidate = onDay(a.getFullYear(), a.getMonth() + i, day); }
  return candidate;
}

/** "Due on the 15th of every month", "Due every other Friday", … */
export function dueSentence(freq: Frequency, anchorIso: string | null | undefined, dueDay?: number | null): string | null {
  const a = parseIso(anchorIso);
  if (!a) return null;
  const day = dueDay || a.getDate();
  switch (freq) {
    case "Weekly":    return `Due every ${WEEKDAYS[a.getDay()]}`;
    case "Biweekly":  return `Due every other ${WEEKDAYS[a.getDay()]}`;
    case "Monthly":   return `Due on the ${ordinal(day)} of every month`;
    case "Quarterly": return `Due every 3 months on the ${ordinal(day)}`;
    case "Yearly":    return `Due every year on ${MONTHS_SHORT[a.getMonth()]} ${day}`;
  }
}

/** Pre-fill the form's cycle field from a stored record. */
export function dueInputFrom(anchorIso: string | null | undefined, dueDay?: number | null): DueInput {
  const a = parseIso(anchorIso);
  return {
    dueDay: dueDay || a?.getDate(),
    weekday: a?.getDay(),
    firstDue: a ? toIso(a) : undefined,
  };
}
