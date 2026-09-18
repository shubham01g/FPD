import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

const notifications = new Hono();

// push_notifications.notification_type -> the personal notifications.type
// CHECK constraint (info/warning/success/error) so a campaign also lands in
// each recipient's own Notification tab, not just the admin's send log.
const TYPE_MAP: Record<string, "info" | "warning" | "success" | "error"> = {
  marketing: "info", feature: "success", update: "info", alert: "error", reminder: "warning",
};

// GET /admin/notifications — sent campaign history
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
// (push_notification_receipts), and — the part that was missing entirely —
// a row in each recipient's own `notifications` table so it actually shows
// up in their Notification tab.
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

  return c.json({ notification: campaign }, 201);
});

export default notifications;
