import { Hono } from "npm:hono";
import webpush from "npm:web-push@3.6.7";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";
import { EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, sendEmail, testEmail } from "../lib/email.ts";

const notifications = new Hono();

// Real device push. Keys are generated once and held as Edge Function
// secrets (never in the repo) — set with:
//   npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com --project-ref <ref>
// Until those are set, PUSH_CONFIGURED is false and sends fall back to
// in-app-only exactly like before, no error.
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:support@finalpassdown.com";
const PUSH_CONFIGURED = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (PUSH_CONFIGURED) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!);
}

// push_notifications.notification_type -> the personal notifications.type
// CHECK constraint (info/warning/success/error) so a campaign also lands in
// each recipient's own Notification tab, not just the admin's send log.
const TYPE_MAP: Record<string, "info" | "warning" | "success" | "error"> = {
  marketing: "info", feature: "success", update: "info", alert: "error", reminder: "warning",
};

// GET /admin/notifications — sent campaign history
// POST /admin/notifications/test-email { to? }
// Confirms SendGrid delivery end to end (key, sender domain, inbox placement).
// Defaults to the calling admin's own address.
notifications.post("/test-email", async (c) => {
  const admin = c.get("admin") as AdminUser;
  if (!EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);
  const body = await c.req.json().catch(() => ({}));
  const to = typeof body.to === "string" && body.to.includes("@") ? body.to.trim() : admin.email;
  try {
    await sendEmail({ to, ...testEmail() });
  } catch (err) {
    console.error("test email failed", err);
    return c.json({ error: String(err instanceof Error ? err.message : err) }, 502);
  }
  return c.json({ sent: true, to });
});

notifications.get("/", async (c) => {
  const { data, error } = await adminClient()
    .from("push_notifications")
    .select("*, sender:sent_by(email, full_name)")
    .order("sent_at", { ascending: false })
    .limit(50);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ notifications: data });
});

// POST /admin/notifications { title, body, type, target, scheduled?, scheduledFor? }
// Resolves the target segment to real user ids and writes three things:
// the campaign row (push_notifications), a per-recipient delivery receipt
// (push_notification_receipts), and a row in each recipient's own
// `notifications` table so it shows up in their Notification tab. If VAPID
// secrets are configured it also fans out a real device push to every
// subscribed browser among those recipients (see PUSH_CONFIGURED above).
// Email is still unwired — there is no provider integrated anywhere.
notifications.post("/", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const body = await c.req.json().catch(() => ({}));
  const { title, body: message, type, target, scheduled, scheduledFor } = body;

  if (!title?.trim()) return c.json({ error: "Notification title is required" }, 400);
  if (!message?.trim()) return c.json({ error: "Message body is required" }, 400);
  if (!(type in TYPE_MAP)) return c.json({ error: "Invalid notification type" }, 400);

  const db = adminClient();
  const segment = target || "all";

  let userQuery = db.from("users").select("id");
  if (segment === "white_glove") userQuery = userQuery.eq("white_glove", true);
  else if (segment !== "all") userQuery = userQuery.eq("plan", segment);

  const { data: targetUsers, error: usersError } = await userQuery;
  if (usersError) return c.json({ error: usersError.message }, 500);
  const userIds = (targetUsers ?? []).map((u: { id: string }) => u.id as string);

  const { data: campaign, error: campaignError } = await db
    .from("push_notifications")
    .insert({
      title, body: message, notification_type: type, target_segment: segment,
      sent_by: admin.id, scheduled_for: scheduled ? (scheduledFor || null) : null,
      is_scheduled: !!scheduled, delivered_count: userIds.length,
    })
    .select("*, sender:sent_by(email, full_name)")
    .single();

  if (campaignError) return c.json({ error: campaignError.message }, 500);

  // There's no scheduler/cron worker yet to fire a future-dated send later,
  // so delivery always happens now regardless of `scheduled` — is_scheduled
  // and scheduled_for are recorded for the log but don't delay anything.
  if (userIds.length > 0) {
    const now = new Date().toISOString();
    const notifType = TYPE_MAP[type];

    const [receipts, personal] = await Promise.all([
      db.from("push_notification_receipts").insert(
        userIds.map((uid) => ({ notification_id: campaign.id, user_id: uid, delivered_at: now })),
      ),
      db.from("notifications").insert(
        userIds.map((uid) => ({ user_id: uid, title, message, type: notifType })),
      ),
    ]);

    if (receipts.error) return c.json({ error: receipts.error.message }, 500);
    if (personal.error) return c.json({ error: personal.error.message }, 500);
  }

  // Real device push, best-effort: the in-app row above already landed, so a
  // push failure here must never fail the request. A 404/410 means the
  // browser dropped the subscription (uninstalled, cleared data, expired) —
  // that row is deleted so it stops being retried on every future send.
  let pushSent = 0;
  if (PUSH_CONFIGURED && userIds.length > 0) {
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", userIds);

    const payload = JSON.stringify({ title, body: message, type, url: "/" });
    const stale: string[] = [];

    await Promise.all((subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        pushSent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(s.id);
      }
    }));

    if (stale.length > 0) {
      await db.from("push_subscriptions").delete().in("id", stale);
    }
  }

  return c.json({ notification: campaign, pushConfigured: PUSH_CONFIGURED, pushSent }, 201);
});

export default notifications;
