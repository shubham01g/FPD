import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";
import { EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, sendEmail, testEmail } from "../lib/email.ts";
import { PUSH_CONFIGURED, TYPE_MAP, deliverCampaign, type CampaignRow } from "../lib/campaigns.ts";

const notifications = new Hono();

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

// POST /admin/notifications { title, body, type, target, channel, scheduled?, scheduledFor? }
// Saves the campaign, then either delivers it now (lib/campaigns.ts) or, when
// scheduled for a future time, leaves it for the hourly job to send.
notifications.post("/", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const body = await c.req.json().catch(() => ({}));
  const { title, body: message, type, target, scheduled, scheduledFor } = body;
  // "push" (in-app + device), "email", or "both".
  const channel: "push" | "email" | "both" = ["email", "both"].includes(body.channel) ? body.channel : "push";
  if (channel !== "push" && !EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);

  if (!title?.trim()) return c.json({ error: "Notification title is required" }, 400);
  if (!message?.trim()) return c.json({ error: "Message body is required" }, 400);
  if (!(type in TYPE_MAP)) return c.json({ error: "Invalid notification type" }, 400);

  let sendAt: Date | null = null;
  if (scheduled) {
    sendAt = scheduledFor ? new Date(scheduledFor) : null;
    if (!sendAt || Number.isNaN(sendAt.getTime())) return c.json({ error: "Pick a valid date and time to send" }, 400);
    if (sendAt.getTime() < Date.now() - 60_000) return c.json({ error: "The scheduled time is in the past" }, 400);
  }
  const isScheduled = !!sendAt && sendAt.getTime() > Date.now() + 60_000;

  const db = adminClient();
  const { data: campaign, error: campaignError } = await db
    .from("push_notifications")
    .insert({
      title: String(title).trim(), body: String(message).trim(), notification_type: type,
      target_segment: target || "all", channel, sent_by: admin.id,
      scheduled_for: isScheduled ? sendAt!.toISOString() : null,
      is_scheduled: isScheduled, status: isScheduled ? "scheduled" : "sending", delivered_count: 0,
    })
    .select("*, sender:sent_by(email, full_name)")
    .single();
  if (campaignError) return c.json({ error: campaignError.message }, 500);

  if (isScheduled) {
    return c.json({ notification: campaign, scheduled: true, pushConfigured: PUSH_CONFIGURED, channel }, 201);
  }
  try {
    const result = await deliverCampaign(campaign as CampaignRow);
    return c.json({ notification: { ...campaign, status: "sent", delivered_count: result.recipients }, pushConfigured: PUSH_CONFIGURED, channel, ...result }, 201);
  } catch (err) {
    await db.from("push_notifications").update({ status: "failed" }).eq("id", campaign.id);
    return c.json({ error: err instanceof Error ? err.message : "Delivery failed" }, 500);
  }
});

// POST /admin/notifications/:id/cancel — stop a scheduled campaign before it goes out.
notifications.post("/:id/cancel", async (c) => {
  const { data, error } = await adminClient().from("push_notifications")
    .update({ status: "cancelled" }).eq("id", c.req.param("id")).eq("status", "scheduled")
    .select("*, sender:sent_by(email, full_name)").maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Only a campaign that is still scheduled can be cancelled" }, 409);
  return c.json({ notification: data });
});

export default notifications;
