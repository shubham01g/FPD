// Reminder and storage-alert emails (migration 058).
//
// Run from the hourly messages-delivery cron (POST /internal/messages/deliver).
// Each account gets at most one reminder email per run, listing what is
// coming up; every item is recorded in reminder_deliveries so it is sent
// once per occurrence however often the job runs:
//
//   reminders             on the due date
//   occasions             up to 7 days before (yearly ones every year)
//   subscription renewals up to 3 days before (Auto Pay & Subs)
//   warranties            up to 30 days before they end
//   ID Keeper             up to 60 days before an ID expires
//
// Storage alerts: once per threshold per month when an account's storage
// crosses Admin → Subscription Config's alert levels (80/90/95 % by default).
//
// Settings honoured (Account Settings → Notifications):
//   Email off          → no reminder or storage emails at all
//   Storage Alerts off → no storage emails
// Deceased (frozen) accounts get nothing. Dates are calendar days in UTC.
import { adminClient } from "./supabaseAdmin.ts";
import { EMAIL_CONFIGURED, noticeEmail, sendEmail } from "./email.ts";
import { defaultOrigin } from "./origins.ts";

type DB = ReturnType<typeof adminClient>;
interface Item { userId: string; source: string; sourceId: string; dueOn: string; line: string }

const DAY = 86_400_000;
const LEAD: Record<string, number> = { reminder: 0, occasion: 7, subscription: 3, warranty: 30, id: 60 };
const MAX_USERS_PER_RUN = 200;

/** Same rules as the app's calendar (services/calendarEvents.ts parseDate),
 *  but in UTC: "YYYY-MM-DD" by its parts, anything else via Date. */
function parseDay(value: unknown): Date | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (ymd) {
    const d = new Date(Date.UTC(+ymd[1], +ymd[2] - 1, +ymd[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const p = new Date(s);
  return Number.isNaN(p.getTime()) ? null : new Date(Date.UTC(p.getFullYear(), p.getMonth(), p.getDate()));
}

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY);
const pretty = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/** The next time a yearly date comes round, today included. */
function nextYearly(d: Date, today: Date): Date {
  const n = new Date(Date.UTC(today.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  return n < today ? new Date(Date.UTC(today.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate())) : n;
}

/** Steps a billing date forward by its cycle until it isn't in the past. */
function nextBilling(d: Date, freq: string, today: Date): Date {
  const f = freq.toLowerCase();
  let n = new Date(d);
  for (let i = 0; i < 600 && n < today; i++) {
    if (f.startsWith("week")) n = new Date(n.getTime() + 7 * DAY);
    else if (f.startsWith("bi") && f.includes("week")) n = new Date(n.getTime() + 14 * DAY);
    else if (f.startsWith("quarter")) n = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 3, n.getUTCDate()));
    else if (f.startsWith("year") || f.startsWith("annual")) n = new Date(Date.UTC(n.getUTCFullYear() + 1, n.getUTCMonth(), n.getUTCDate()));
    else if (f.startsWith("month")) n = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()));
    else break; // one-off or unknown: leave it
  }
  return n;
}

/** Client-side encrypted values (vaultCrypto "v1." format) can't be read here. */
const readable = (v: unknown, fallback: string) => {
  const s = String(v ?? "").trim();
  return s && !s.startsWith("v1.") ? s : fallback;
};

function whenText(days: number) {
  return days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
}

async function dueItems(db: DB, today: Date): Promise<Item[]> {
  const [rem, occ, war, ids, subs] = await Promise.all([
    db.from("reminders").select("id, user_id, title, due_date, status").neq("status", "completed").limit(5000),
    db.from("occasions").select("id, user_id, name, occasion_date, recurring, recipient").limit(5000),
    db.from("warranties").select("id, user_id, product, expiry_date").limit(5000),
    db.from("id_keeper_records").select("id, user_id, id_type, holder_name, expiry_date").limit(5000),
    db.from("subscription_tracker").select("id, user_id, title, next_billing_date, billing_frequency, amount_usd, status").limit(5000),
  ]);
  for (const r of [rem, occ, war, ids, subs]) if (r.error) throw new Error(r.error.message);

  const items: Item[] = [];
  const push = (userId: string, source: string, id: string, on: Date, text: string) => {
    const days = daysBetween(today, on);
    if (days < 0 || days > LEAD[source]) return;
    items.push({ userId, source, sourceId: id, dueOn: iso(on), line: `${pretty(on)} (${whenText(days)}): ${text}` });
  };

  for (const r of rem.data ?? []) {
    const d = parseDay(r.due_date);
    if (d) push(r.user_id, "reminder", r.id, d, readable(r.title, "A reminder"));
  }
  for (const o of occ.data ?? []) {
    const d = parseDay(o.occasion_date);
    if (!d) continue;
    const on = o.recurring === false ? d : nextYearly(d, today);
    push(o.user_id, "occasion", o.id, on, [readable(o.name, "An occasion"), o.recipient ? `for ${o.recipient}` : ""].filter(Boolean).join(" "));
  }
  for (const w of war.data ?? []) {
    const d = parseDay(w.expiry_date);
    if (d) push(w.user_id, "warranty", w.id, d, `${readable(w.product, "A product")} warranty ends`);
  }
  for (const r of ids.data ?? []) {
    const d = parseDay(r.expiry_date);
    if (d) push(r.user_id, "id", r.id, d, `${readable(r.id_type, "An ID")}${r.holder_name ? ` (${readable(r.holder_name, "")})` : ""} expires`.replace(" ()", ""));
  }
  for (const s of subs.data ?? []) {
    if (s.status && s.status !== "active") continue;
    const d = parseDay(s.next_billing_date);
    if (!d) continue;
    const amount = s.amount_usd == null ? "" : ` — $${Number(s.amount_usd).toFixed(2)}`;
    push(s.user_id, "subscription", s.id, nextBilling(d, String(s.billing_frequency ?? ""), today), `${readable(s.title, "A subscription")} renews${amount}`);
  }
  return items;
}

/** Accounts that get no email at all, or no storage alerts. */
async function optOuts(db: DB, userIds: string[]) {
  const noEmail = new Set<string>(), noStorage = new Set<string>(), frozen = new Set<string>();
  if (!userIds.length) return { noEmail, noStorage, frozen };
  const [{ data: prefs }, { data: dead }] = await Promise.all([
    db.from("notification_preferences").select("user_id, email, storage_alerts").in("user_id", userIds),
    db.from("users").select("id").in("id", userIds).not("deceased_at", "is", null),
  ]);
  for (const p of prefs ?? []) {
    if (p.email === false) noEmail.add(p.user_id);
    if (p.storage_alerts === false) noStorage.add(p.user_id);
  }
  for (const u of dead ?? []) frozen.add(u.id);
  return { noEmail, noStorage, frozen };
}

/** Claims the rows first (unique key), so two overlapping runs can't both
 *  send; returns the ones this run claimed. */
async function claim(db: DB, rows: Item[]): Promise<Item[]> {
  if (!rows.length) return [];
  const { data, error } = await db.from("reminder_deliveries")
    .upsert(rows.map((r) => ({ user_id: r.userId, source: r.source, source_id: r.sourceId, due_on: r.dueOn })),
      { onConflict: "source,source_id,due_on", ignoreDuplicates: true })
    .select("source, source_id, due_on");
  if (error) throw new Error(`reminder_deliveries claim failed: ${error.message}`);
  const got = new Set((data ?? []).map((d) => `${d.source}|${d.source_id}|${d.due_on}`));
  return rows.filter((r) => got.has(`${r.source}|${r.sourceId}|${r.dueOn}`));
}

/** A send that failed gives its claim back, so the next run retries. */
async function release(db: DB, rows: Item[]) {
  for (const r of rows) {
    await db.from("reminder_deliveries").delete()
      .eq("source", r.source).eq("source_id", r.sourceId).eq("due_on", r.dueOn);
  }
}

export async function runReminderDelivery(): Promise<{ due: number; emailed: number; failed: number; skipped?: string }> {
  if (!EMAIL_CONFIGURED) return { due: 0, emailed: 0, failed: 0, skipped: "Email is not configured" };
  const db = adminClient();
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const all = await dueItems(db, today);
  if (!all.length) return { due: 0, emailed: 0, failed: 0 };

  // Drop what has already gone out, then group by account.
  const userIds = [...new Set(all.map((i) => i.userId))];
  const { data: sent } = await db.from("reminder_deliveries").select("source, source_id, due_on")
    .in("user_id", userIds).gte("due_on", iso(today));
  const done = new Set((sent ?? []).map((d) => `${d.source}|${d.source_id}|${d.due_on}`));
  const { noEmail, frozen } = await optOuts(db, userIds);
  const pending = all.filter((i) => !done.has(`${i.source}|${i.sourceId}|${i.dueOn}`) && !noEmail.has(i.userId) && !frozen.has(i.userId));

  const byUser = new Map<string, Item[]>();
  for (const i of pending) byUser.set(i.userId, [...(byUser.get(i.userId) ?? []), i]);
  const targets = [...byUser.keys()].slice(0, MAX_USERS_PER_RUN);
  if (!targets.length) return { due: all.length, emailed: 0, failed: 0 };

  const { data: people } = await db.from("users").select("id, email, full_name").in("id", targets);
  const origin = defaultOrigin();
  let emailed = 0, failed = 0;
  for (const p of people ?? []) {
    if (!p.email) continue;
    const mine = await claim(db, byUser.get(p.id) ?? []);
    if (!mine.length) continue;
    mine.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
    try {
      await sendEmail({
        to: p.email,
        ...noticeEmail({
          name: p.full_name ?? "", category: "reminder_digest",
          heading: mine.length === 1 ? "A reminder from your vault" : `${mine.length} reminders from your vault`,
          paragraphs: ["Here's what's coming up:", mine.map((i) => `• ${i.line}`).join("\n")],
          button: { href: `${origin}/dashboard?page=calendar`, label: "Open your calendar" },
          footnote: "You get these because Email notifications are on. Turn them off in Account Settings → Notifications.",
        }),
      });
      emailed++;
    } catch (err) {
      failed++;
      console.error(`reminder email for ${p.id} failed:`, err);
      await release(db, mine);
    }
  }
  return { due: all.length, emailed, failed };
}

export async function runStorageAlerts(): Promise<{ checked: number; emailed: number; failed: number; skipped?: string }> {
  if (!EMAIL_CONFIGURED) return { checked: 0, emailed: 0, failed: 0, skipped: "Email is not configured" };
  const db = adminClient();
  const [{ data: snap, error }, { data: settings }] = await Promise.all([
    db.rpc("storage_usage_snapshot"),
    db.from("admin_settings").select("key, value").in("key", ["storage_alert_80", "storage_alert_90", "storage_alert_95"]),
  ]);
  if (error) throw new Error(`storage_usage_snapshot failed: ${error.message}`);
  const levels = [...new Set((settings ?? []).map((s) => Number(s.value)).filter((n) => n > 0 && n <= 100))].sort((a, b) => b - a);
  const thresholds = levels.length ? levels : [95, 90, 80];

  const rows = ((snap ?? []) as { user_id: string; used_bytes: number; limit_bytes: number }[])
    .map((r) => ({ ...r, pct: r.limit_bytes > 0 ? (Number(r.used_bytes) / Number(r.limit_bytes)) * 100 : 0 }))
    .map((r) => ({ ...r, level: thresholds.find((t) => r.pct >= t) }))
    .filter((r): r is typeof r & { level: number } => r.level !== undefined);
  if (!rows.length) return { checked: snap?.length ?? 0, emailed: 0, failed: 0 };

  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const { noEmail, noStorage, frozen } = await optOuts(db, rows.map((r) => r.user_id));
  const eligible = rows.filter((r) => !noEmail.has(r.user_id) && !noStorage.has(r.user_id) && !frozen.has(r.user_id)).slice(0, MAX_USERS_PER_RUN);
  if (!eligible.length) return { checked: snap?.length ?? 0, emailed: 0, failed: 0 };

  const { data: people } = await db.from("users").select("id, email, full_name").in("id", eligible.map((r) => r.user_id));
  const byId = new Map((people ?? []).map((p) => [p.id, p]));
  const origin = defaultOrigin();
  const gb = (b: number) => (b / 1073741824).toFixed(b >= 10 * 1073741824 ? 0 : 1);
  let emailed = 0, failed = 0;
  for (const r of eligible) {
    const p = byId.get(r.user_id);
    if (!p?.email) continue;
    const mine = await claim(db, [{ userId: r.user_id, source: `storage_${r.level}`, sourceId: r.user_id, dueOn: month, line: "" }]);
    if (!mine.length) continue;
    try {
      await sendEmail({
        to: p.email,
        ...noticeEmail({
          name: p.full_name ?? "", category: "storage_alert",
          heading: `Your vault storage is ${Math.floor(r.pct)}% full`,
          paragraphs: [
            `You're using ${gb(Number(r.used_bytes))} GB of the ${gb(Number(r.limit_bytes))} GB your plan includes.`,
            "You can free space by removing files you no longer need, or move to a plan with more storage.",
          ],
          button: { href: `${origin}/dashboard?page=storage-usage`, label: "See your storage" },
          footnote: "You get these because Storage Alerts are on. Turn them off in Account Settings → Notifications.",
        }),
      });
      emailed++;
    } catch (err) {
      failed++;
      console.error(`storage alert for ${r.user_id} failed:`, err);
      await release(db, mine);
    }
  }
  return { checked: snap?.length ?? 0, emailed, failed };
}
