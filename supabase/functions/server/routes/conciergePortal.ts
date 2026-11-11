// The Concierge Portal's data (migration 051). Mounted at /concierge.
//
// Every request needs a signed-in Supabase session that belongs to an
// active concierge_employees row (user_id), and that session must have
// passed the employee's own 2FA if they have it. A specialist only ever
// reaches clients assigned to them (wg_clients.specialist_id).
//
//   GET    /me
//   GET    /clients                       assigned clients + sessions + waiver
//   PATCH  /clients/:id                   { notes?, completionPct?, status? }
//   POST   /clients/:id/sessions          schedule; emails the client an .ics
//   PATCH  /sessions/:id                  { scheduledAt?, status: cancelled|no_show }
//   POST   /sessions/:id/complete         { startedAt, endedAt, notes, charge }
//   POST   /clients/:id/email             { subject, message } check-in email
//   POST   /clients/:id/waiver            email a signing link (14 days)
//   POST   /clients/:id/upload-url        { name } (waiver must be signed)
//   POST   /clients/:id/documents         { path, name, category, fileType }
//
// The waiver is signed on the public /waiver/:token page (routes/public.ts).
import { Hono, type Context, type Next } from "npm:hono";
import { adminClient, anonClient } from "../lib/supabaseAdmin.ts";
import { secondFactorState } from "../lib/twoFactorGate.ts";
import { readPlatformSection } from "../lib/platformSettings.ts";
import { EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, MAILBOX, noticeEmail, sendEmail } from "../lib/email.ts";
import { defaultOrigin } from "../lib/origins.ts";
import { chargeWgSession } from "../lib/wgBilling.ts";

type Employee = { id: string; user_id: string; name: string; email: string; role: string; status: string };

const portal = new Hono();

const WAIVER_DAYS = 14;
const EMAILS_PER_HOUR = 10;
export const WAIVER_SCOPE = [
  "Upload and organize documents in my Digital File Cabinet",
  "Enter and update records (assets, contacts, medical, financial) on my behalf",
  "Help set up my Legacy and Guardian Contacts",
];

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");

async function requireConcierge(c: Context, next: Next) {
  const token = (c.req.header("Authorization") ?? "").replace(/^Bearer /, "");
  if (!token) return c.json({ error: "Missing Authorization bearer token" }, 401);
  const { data, error } = await anonClient().auth.getUser(token);
  if (error || !data?.user) return c.json({ error: "Invalid or expired session" }, 401);
  const { data: emp } = await adminClient().from("concierge_employees")
    .select("id, user_id, name, email, role, status").eq("user_id", data.user.id).maybeSingle<Employee>();
  if (!emp) return c.json({ error: "This account is not a concierge specialist" }, 403);
  if (emp.status === "suspended" || emp.status === "inactive") return c.json({ error: "This staff account is not active" }, 403);
  // System → Settings → Feature Flags → White Glove Concierge also closes the
  // staff portal (it used to hide only the customer pages).
  let flags: Record<string, unknown>;
  try { flags = await readPlatformSection("flags"); }
  catch { return c.json({ error: "Could not read platform settings" }, 500); }
  if (flags.whiteGloveConcierge === false) {
    return c.json({ error: "The White Glove Concierge program is currently turned off.", code: "white_glove_off" }, 403);
  }
  const mfa = await secondFactorState(data.user.id, token);
  if (!mfa.passed) return c.json({ error: "Two-step verification required", code: "2fa_required" }, 403);
  c.set("employee" as never, emp as never);
  await next();
}
portal.use("*", requireConcierge);

const me = (c: Context) => c.get("employee" as never) as Employee;

/** The wg_clients row, only if it is assigned to this specialist. */
async function myClient(c: Context, id: string) {
  const { data } = await adminClient().from("wg_clients")
    .select("id, user_id, specialist_id, status, users(full_name, email, phone)")
    .eq("id", id).eq("specialist_id", me(c).id).maybeSingle();
  return data as null | { id: string; user_id: string; specialist_id: string; status: string; users: { full_name: string | null; email: string; phone: string | null } | null };
}

async function underEmailLimit(employeeUserId: string): Promise<boolean> {
  const { count } = await adminClient().from("audit_logs").select("id", { count: "exact", head: true })
    .eq("actor_id", employeeUserId).like("action", "concierge.email%")
    .gte("created_at", new Date(Date.now() - 3_600_000).toISOString());
  return (count ?? 0) < EMAILS_PER_HOUR;
}

async function log(c: Context, action: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const e = me(c);
  await adminClient().from("audit_logs").insert({
    actor_id: e.user_id, actor_email: e.email, action, target_type: "wg_client", target_id: targetId, severity: "info", metadata,
  });
}

/** A minimal iCalendar invite. */
function ics(o: { uid: string; start: Date; minutes: number; title: string; description: string; location: string }): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Final Pass Down//Concierge//EN", "METHOD:REQUEST", "BEGIN:VEVENT",
    `UID:${o.uid}@finalpassdown.com`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(o.start)}`,
    `DTEND:${f(new Date(o.start.getTime() + o.minutes * 60_000))}`, `SUMMARY:${esc(o.title)}`,
    `DESCRIPTION:${esc(o.description)}`, `LOCATION:${esc(o.location)}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}
const b64 = (s: string) => { let bin = ""; for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b); return btoa(bin); };

portal.get("/me", (c) => c.json({ employee: me(c) }));

portal.get("/clients", async (c) => {
  const db = adminClient();
  const { data: clients, error } = await db.from("wg_clients")
    .select("id, user_id, status, reason, notes, completion_pct, intake_date, completed_at, next_session_at, users(full_name, email, phone), wg_sessions(*)")
    .eq("specialist_id", me(c).id).order("intake_date", { ascending: false });
  if (error) return c.json({ error: error.message }, 500);
  const userIds = (clients ?? []).map((x) => x.user_id).filter(Boolean);
  const [{ data: waivers }, { data: cards }] = await Promise.all([
    userIds.length ? db.from("wg_waivers").select("id, client_user_id, status, sent_at, signed_at, signed_name, token_expires_at").in("client_user_id", userIds).order("sent_at", { ascending: false }) : Promise.resolve({ data: [] }),
    userIds.length ? db.from("wg_payment_methods").select("user_id, card_brand, card_last4").in("user_id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const latestWaiver = new Map<string, unknown>();
  for (const w of waivers ?? []) if (!latestWaiver.has(w.client_user_id)) latestWaiver.set(w.client_user_id, w);
  const cardOf = new Map((cards ?? []).map((k) => [k.user_id, k]));
  return c.json({
    clients: (clients ?? []).map((x) => ({ ...x, waiver: latestWaiver.get(x.user_id) ?? null, card: cardOf.get(x.user_id) ?? null })),
  });
});

portal.patch("/clients/:id", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client) return c.json({ error: "Client not found" }, 404);
  const body = await c.req.json().catch(() => ({})) as { notes?: string; completionPct?: number; status?: string };
  const patch: Record<string, unknown> = {};
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 20_000);
  if (body.completionPct !== undefined) patch.completion_pct = Math.max(0, Math.min(100, Math.round(Number(body.completionPct) || 0)));
  if (body.status && ["intake", "active", "completed", "paused"].includes(body.status)) {
    patch.status = body.status;
    patch.completed_at = body.status === "completed" ? new Date().toISOString() : null;
  }
  if (!Object.keys(patch).length) return c.json({ error: "Nothing to update" }, 400);
  const { data, error } = await adminClient().from("wg_clients").update(patch).eq("id", client.id).select().single();
  if (error) return c.json({ error: error.message }, 400);
  return c.json({ client: data });
});

async function refreshNextSession(clientId: string) {
  const db = adminClient();
  const { data } = await db.from("wg_sessions").select("scheduled_at").eq("client_id", clientId).eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(1);
  await db.from("wg_clients").update({ next_session_at: data?.[0]?.scheduled_at ?? null }).eq("id", clientId);
}

async function emailSession(c: Context, client: NonNullable<Awaited<ReturnType<typeof myClient>>>, s: { id: string; session_type: string; scheduled_at: string; duration_minutes: number | null; meeting_url: string | null }, kind: "scheduled" | "moved" | "cancelled") {
  if (!EMAIL_CONFIGURED || !client.users?.email) return false;
  const when = new Date(s.scheduled_at);
  const whenText = when.toUTCString().replace("GMT", "UTC");
  const how = s.session_type === "phone" ? "a phone call" : s.session_type === "in_person" ? "an in-person visit" : "a video call";
  const e = me(c);
  const heading = kind === "cancelled" ? "Your White Glove session was cancelled" : kind === "moved" ? "Your White Glove session was moved" : "Your White Glove session is booked";
  await sendEmail({
    to: client.users.email,
    ...noticeEmail({
      name: client.users.full_name ?? "", heading, category: "concierge_session", replyTo: e.email,
      paragraphs: kind === "cancelled"
        ? [`${e.name} cancelled ${how} that was planned for ${whenText}.`, "Reply to this email to pick a new time."]
        : [`${e.name}, your Final Pass Down specialist, has ${kind === "moved" ? "moved" : "booked"} ${how} with you for ${whenText} (${s.duration_minutes ?? 30} minutes).`,
           s.meeting_url ? `Join here: ${s.meeting_url}` : (s.session_type === "phone" ? "Your specialist will call the phone number on your account." : ""),
           "The calendar invite is attached."].filter(Boolean),
      button: kind !== "cancelled" && s.meeting_url ? { href: s.meeting_url, label: "Join the session" } : null,
      footnote: "Sessions are billed per 30 minutes to the card saved during White Glove setup.",
    }),
    attachments: kind === "cancelled" ? undefined : [{
      filename: "white-glove-session.ics", type: "text/calendar",
      content: b64(ics({ uid: s.id, start: when, minutes: s.duration_minutes ?? 30, title: "Final Pass Down — White Glove session",
        description: `With ${e.name}.${s.meeting_url ? ` Join: ${s.meeting_url}` : ""}`, location: s.meeting_url ?? (s.session_type === "phone" ? "Phone" : "") })),
    }],
  });
  return true;
}

portal.post("/clients/:id/sessions", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client) return c.json({ error: "Client not found" }, 404);
  const body = await c.req.json().catch(() => ({})) as { type?: string; scheduledAt?: string; durationMinutes?: number; meetingUrl?: string; notes?: string };
  const type = ["phone", "video", "in_person"].includes(String(body.type)) ? String(body.type) : "video";
  const at = new Date(String(body.scheduledAt));
  if (isNaN(at.getTime()) || at.getTime() < Date.now() - 5 * 60_000) return c.json({ error: "Pick a time in the future" }, 400);
  const meetingUrl = body.meetingUrl?.trim() || null;
  if (meetingUrl && !/^https:\/\//i.test(meetingUrl)) return c.json({ error: "The meeting link must start with https://" }, 400);
  const { data: s, error } = await adminClient().from("wg_sessions").insert({
    client_id: client.id, specialist_id: me(c).id, session_type: type, status: "scheduled", scheduled_at: at.toISOString(),
    duration_minutes: Math.max(15, Math.min(240, Math.round(Number(body.durationMinutes) || 30))),
    notes: body.notes?.slice(0, 2000) ?? null, meeting_url: meetingUrl,
  }).select().single();
  if (error || !s) return c.json({ error: error?.message ?? "Could not schedule" }, 400);
  await refreshNextSession(client.id);
  let emailed = false;
  try { emailed = await emailSession(c, client, s, "scheduled"); } catch (err) { console.error("session email failed:", err); }
  await log(c, "concierge.session_scheduled", client.id, { session: s.id, emailed });
  return c.json({ session: s, emailed });
});

portal.patch("/sessions/:id", async (c) => {
  const db = adminClient();
  const { data: s } = await db.from("wg_sessions").select("*").eq("id", c.req.param("id")).eq("specialist_id", me(c).id).maybeSingle();
  if (!s) return c.json({ error: "Session not found" }, 404);
  const client = await myClient(c, s.client_id);
  if (!client) return c.json({ error: "Client not found" }, 404);
  const body = await c.req.json().catch(() => ({})) as { scheduledAt?: string; status?: string; meetingUrl?: string };
  const patch: Record<string, unknown> = {};
  let kind: "moved" | "cancelled" | null = null;
  if (body.scheduledAt) {
    const at = new Date(body.scheduledAt);
    if (isNaN(at.getTime())) return c.json({ error: "Invalid time" }, 400);
    patch.scheduled_at = at.toISOString(); patch.status = "scheduled"; kind = "moved";
  }
  if (body.meetingUrl !== undefined) patch.meeting_url = body.meetingUrl?.trim() || null;
  if (body.status === "cancelled" || body.status === "no_show") { patch.status = body.status; kind = body.status === "cancelled" ? "cancelled" : null; }
  const { data: updated, error } = await db.from("wg_sessions").update(patch).eq("id", s.id).select().single();
  if (error || !updated) return c.json({ error: error?.message ?? "Could not update" }, 400);
  await refreshNextSession(client.id);
  let emailed = false;
  if (kind) { try { emailed = await emailSession(c, client, updated, kind); } catch (err) { console.error("session email failed:", err); } }
  return c.json({ session: updated, emailed });
});

/** Longest single session a specialist can bill in one go. */
const MAX_SESSION_HOURS = 8;

portal.post("/sessions/:id/complete", async (c) => {
  const db = adminClient();
  const { data: s } = await db.from("wg_sessions").select("*").eq("id", c.req.param("id")).eq("specialist_id", me(c).id).maybeSingle();
  if (!s) return c.json({ error: "Session not found" }, 404);
  const body = await c.req.json().catch(() => ({})) as { startedAt?: string; endedAt?: string; notes?: string; charge?: boolean };
  if (s.status === "completed" || s.status === "cancelled") {
    return c.json({ error: `This session is already ${s.status}.` }, 409);
  }
  const started = new Date(String(body.startedAt)), ended = new Date(String(body.endedAt));
  if (isNaN(started.getTime()) || isNaN(ended.getTime()) || ended <= started) return c.json({ error: "Enter when the session started and ended" }, 400);
  // The duration is what the client's saved card is charged for, and the
  // specialist types both times, so keep them to something a real session
  // can be: already over, at most MAX_SESSION_HOURS long, and recent.
  const now = Date.now();
  if (ended.getTime() > now + 5 * 60_000) return c.json({ error: "The session can't end in the future" }, 400);
  if (ended.getTime() - started.getTime() > MAX_SESSION_HOURS * 3600_000) {
    return c.json({ error: `A session can be at most ${MAX_SESSION_HOURS} hours. Split longer work into separate sessions.` }, 400);
  }
  if (now - started.getTime() > 30 * 86400_000) return c.json({ error: "That start time is more than 30 days ago" }, 400);
  const minutes = Math.ceil((ended.getTime() - started.getTime()) / 60000);
  let billing: Record<string, unknown> | null = null;
  if (body.charge !== false) {
    const r = await chargeWgSession({
      wgClientId: s.client_id, sessionKey: s.id, startedAt: started.toISOString(), endedAt: ended.toISOString(),
      sessionType: s.session_type, notes: body.notes ?? null, chargedBy: me(c).email,
    });
    if (r.status >= 400) return c.json({ error: r.body.error ?? "The session could not be charged" }, r.status as 400);
    billing = r.body;
  }
  const { data: updated, error: updErr } = await db.from("wg_sessions").update({
    status: "completed", duration_minutes: minutes, notes: body.notes?.slice(0, 2000) ?? s.notes,
  }).eq("id", s.id).select().single();
  if (updErr || !updated) {
    // The charge (if any) already went through; say so rather than reporting
    // a plain failure that invites a second charge attempt.
    console.error("wg session complete: status update failed", updErr);
    return c.json({ error: `The session was ${billing ? "charged" : "recorded"} but could not be marked completed. Refresh before trying again.`, billing }, 500);
  }
  await refreshNextSession(s.client_id);
  await db.from("wg_clients").update({ status: "active" }).eq("id", s.client_id).eq("status", "intake");
  return c.json({ session: updated, billing });
});

portal.post("/clients/:id/email", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client?.users?.email) return c.json({ error: "Client not found" }, 404);
  if (!EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);
  if (!(await underEmailLimit(me(c).user_id))) return c.json({ error: "You've sent a lot of emails this hour. Try again later." }, 429);
  const body = await c.req.json().catch(() => ({})) as { subject?: string; message?: string };
  const message = String(body.message ?? "").trim();
  if (!message) return c.json({ error: "Write a message" }, 400);
  const e = me(c);
  try {
    await sendEmail({
      to: client.users.email,
      ...noticeEmail({
        name: client.users.full_name ?? "", heading: String(body.subject ?? "").trim().slice(0, 120) || `A note from ${e.name}`,
        category: "concierge_message", replyTo: e.email, paragraphs: [message.slice(0, 5000)],
        footnote: `Sent by ${e.name}, your Final Pass Down White Glove specialist. Reply to this email to reach them.`,
      }),
    });
  } catch (err) {
    console.error("concierge email failed:", err);
    return c.json({ error: "The email could not be sent. Try again in a few minutes." }, 502);
  }
  await log(c, "concierge.email_sent", client.id);
  return c.json({ sent: true });
});

portal.post("/clients/:id/waiver", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client?.users?.email) return c.json({ error: "Client not found" }, 404);
  if (!EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);
  if (!(await underEmailLimit(me(c).user_id))) return c.json({ error: "You've sent a lot of emails this hour. Try again later." }, 429);
  const db = adminClient();
  const { data: signed } = await db.from("wg_waivers").select("id").eq("client_user_id", client.user_id).eq("status", "signed")
    .gt("expires_at", new Date().toISOString()).limit(1);
  if (signed?.length) return c.json({ error: "This client already has a signed waiver." }, 409);
  // Only the newest link works.
  await db.from("wg_waivers").update({ status: "expired" }).eq("client_user_id", client.user_id).eq("status", "pending");
  const token = newToken();
  const e = me(c);
  const { data: w, error } = await db.from("wg_waivers").insert({
    client_user_id: client.user_id, specialist_id: e.id, specialist_name: e.name, authorized_scope: WAIVER_SCOPE,
    status: "pending", token_hash: await sha256Hex(token),
    token_expires_at: new Date(Date.now() + WAIVER_DAYS * 86_400_000).toISOString(),
    expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString(),
  }).select("id, status, sent_at, token_expires_at").single();
  if (error || !w) return c.json({ error: error?.message ?? "Could not create the waiver" }, 400);
  try {
    await sendEmail({
      to: client.users.email,
      ...noticeEmail({
        name: client.users.full_name ?? "", heading: "Please review your White Glove authorization", category: "concierge_waiver",
        replyTo: MAILBOX.support,
        paragraphs: [`Before ${e.name} can upload documents or update records in your Final Pass Down vault, we need your written permission.`,
          `It covers: ${WAIVER_SCOPE.join("; ")}. You can withdraw it at any time by contacting us.`],
        button: { href: `${defaultOrigin()}/waiver/${token}`, label: "Review and sign" },
        footnote: `This link works for ${WAIVER_DAYS} days.`,
      }),
    });
  } catch (err) {
    console.error("waiver email failed:", err);
    return c.json({ error: "The waiver email could not be sent. Try again." }, 502);
  }
  await log(c, "concierge.email_waiver", client.id, { waiver: w.id });
  return c.json({ waiver: w });
});

async function hasSignedWaiver(userId: string): Promise<boolean> {
  const { data } = await adminClient().from("wg_waivers").select("id").eq("client_user_id", userId).eq("status", "signed")
    .gt("expires_at", new Date().toISOString()).limit(1);
  return Boolean(data?.length);
}

/* Documents the client sent from the White Glove page (DocumentScanner with
   sectionLabel "White Glove"). Only those — the rest of the vault stays
   private. Each comes with a short-lived download link. */
portal.get("/clients/:id/documents", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client) return c.json({ error: "Client not found" }, 404);
  if (!(await hasSignedWaiver(client.user_id))) return c.json({ error: "The client hasn't signed the authorization waiver yet." }, 403);
  const db = adminClient();
  const { data, error } = await db.from("vault_documents")
    .select("id, name, category, file_type, uploaded_at, file_path")
    .eq("user_id", client.user_id).eq("metadata->>source_section", "White Glove")
    .order("uploaded_at", { ascending: false }).limit(100);
  if (error) return c.json({ error: error.message }, 500);
  const rows = data ?? [];
  const paths = rows.map((d) => d.file_path).filter((p): p is string => Boolean(p));
  const { data: signed } = paths.length
    ? await db.storage.from("vault-documents").createSignedUrls(paths, 600)
    : { data: [] as { path: string | null; signedUrl: string }[] };
  const urlOf = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  await log(c, "concierge.documents_viewed", client.id, { count: rows.length });
  return c.json({
    documents: rows.map(({ file_path, ...d }) => ({ ...d, url: file_path ? urlOf.get(file_path) ?? null : null })),
  });
});

portal.post("/clients/:id/upload-url", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client) return c.json({ error: "Client not found" }, 404);
  if (!(await hasSignedWaiver(client.user_id))) return c.json({ error: "The client hasn't signed the authorization waiver yet." }, 403);
  const body = await c.req.json().catch(() => ({})) as { name?: string };
  const name = String(body.name ?? "").trim().replace(/[^\w.\- ()]+/g, "_").slice(0, 120);
  if (!name) return c.json({ error: "File name missing" }, 400);
  const path = `${client.user_id}/${crypto.randomUUID()}-${name}`;
  const { data, error } = await adminClient().storage.from("vault-documents").createSignedUploadUrl(path);
  if (error || !data) return c.json({ error: error?.message ?? "Could not start the upload" }, 500);
  return c.json({ path, token: data.token });
});

portal.post("/clients/:id/documents", async (c) => {
  const client = await myClient(c, c.req.param("id"));
  if (!client) return c.json({ error: "Client not found" }, 404);
  if (!(await hasSignedWaiver(client.user_id))) return c.json({ error: "The client hasn't signed the authorization waiver yet." }, 403);
  const body = await c.req.json().catch(() => ({})) as { path?: string; name?: string; category?: string; fileType?: string };
  const path = String(body.path ?? "");
  const dir = `${client.user_id}`;
  if (!path.startsWith(`${dir}/`) || path.includes("..") || path.split("/").length !== 2) return c.json({ error: "Invalid file path" }, 400);
  const db = adminClient();
  const fileName = path.slice(dir.length + 1);
  const { data: listed } = await db.storage.from("vault-documents").list(dir, { search: fileName, limit: 1 });
  const obj = listed?.find((o) => o.name === fileName);
  if (!obj) return c.json({ error: "The upload didn't arrive. Try again." }, 400);
  const category = /^[a-z_]{2,40}$/.test(String(body.category)) && body.category !== "secret" ? String(body.category) : "legal";
  const e = me(c);
  const { data: doc, error } = await db.from("vault_documents").insert({
    user_id: client.user_id, name: String(body.name ?? fileName).slice(0, 200), category, file_path: path,
    file_size_bytes: Number((obj.metadata as { size?: number } | null)?.size ?? 0), file_type: String(body.fileType ?? "other"),
    is_encrypted: false, status: "pending", starred: false, locked: false, tags: [],
    metadata: { uploaded_by: "concierge", specialist: e.name, specialist_id: e.id },
  }).select("id, name, category, uploaded_at").single();
  if (error || !doc) {
    await db.storage.from("vault-documents").remove([path]).catch(() => {});
    return c.json({ error: error?.message ?? "Could not save the document" }, 400);
  }
  await log(c, "concierge.document_uploaded", client.id, { doc: doc.id, name: doc.name });
  return c.json({ doc });
});

export default portal;
