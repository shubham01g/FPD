// Delivering an admin announcement (Push Notification Center).
//
// A campaign row (push_notifications) is delivered either straight away or,
// when it was scheduled, by the hourly job (routes/internal.ts, the
// messages-delivery cron) once scheduled_for has passed. Delivery writes a
// receipt and an in-app notification per recipient, sends device push when
// VAPID is configured, and email for the "email"/"both" channels — skipping
// anyone who turned email off in Account Settings (migration 050).
import webpush from "npm:web-push@3.6.7";
import { adminClient } from "./supabaseAdmin.ts";
import { MAILBOX, noticeEmail, sendEmail } from "./email.ts";

// Keys are Edge Function secrets (never in the repo). Without them device
// push is skipped and campaigns are in-app (+ email) only.
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || `mailto:${MAILBOX.support}`;
export const PUSH_CONFIGURED = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
if (PUSH_CONFIGURED) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC!, VAPID_PRIVATE!);

// push_notifications.notification_type -> notifications.type (CHECK:
// info/warning/success/error), so a campaign lands in each recipient's own tab.
export const TYPE_MAP: Record<string, "info" | "warning" | "success" | "error"> = {
  marketing: "info", feature: "success", update: "info", alert: "error", reminder: "warning",
};

export type Channel = "push" | "email" | "both";

export interface CampaignRow {
  id: string; title: string; body: string; notification_type: string;
  target_segment: string; channel: Channel | null;
}

export interface DeliveryResult { recipients: number; pushSent: number; emailSent: number; emailSkipped: number }

/** Sends one campaign now and marks it sent. */
export async function deliverCampaign(campaign: CampaignRow): Promise<DeliveryResult> {
  const db = adminClient();
  const channel: Channel = campaign.channel ?? "push";
  const segment = campaign.target_segment || "all";

  let userQuery = db.from("users").select("id").is("deceased_at", null);
  if (segment === "white_glove") userQuery = userQuery.eq("white_glove", true);
  else if (segment !== "all") userQuery = userQuery.eq("plan", segment);
  const { data: targetUsers, error: usersError } = await userQuery;
  if (usersError) throw new Error(usersError.message);
  const userIds = (targetUsers ?? []).map((u: { id: string }) => u.id);

  const title = campaign.title;
  const message = campaign.body;

  if (userIds.length > 0) {
    const now = new Date().toISOString();
    const [receipts, personal] = await Promise.all([
      db.from("push_notification_receipts").insert(
        userIds.map((uid) => ({ notification_id: campaign.id, user_id: uid, delivered_at: now })),
      ),
      db.from("notifications").insert(
        userIds.map((uid) => ({ user_id: uid, title, message, type: TYPE_MAP[campaign.notification_type] ?? "info" })),
      ),
    ]);
    if (receipts.error) throw new Error(receipts.error.message);
    if (personal.error) throw new Error(personal.error.message);
  }

  // Device push, best effort: the in-app row already landed. A 404/410 means
  // the browser dropped the subscription, so it is deleted.
  let pushSent = 0;
  if (PUSH_CONFIGURED && userIds.length > 0) {
    const { data: subs } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
    const payload = JSON.stringify({ title, body: message, type: campaign.notification_type, url: "/" });
    const stale: string[] = [];
    await Promise.all((subs ?? []).map(async (s: { id: string; endpoint: string; p256dh: string; auth: string }) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        pushSent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(s.id);
      }
    }));
    if (stale.length > 0) await db.from("push_subscriptions").delete().in("id", stale);
  }

  let emailSent = 0, emailSkipped = 0;
  if (channel !== "push" && userIds.length > 0) {
    const [{ data: people }, { data: prefs }] = await Promise.all([
      db.from("users").select("id, email, full_name").in("id", userIds),
      db.from("notification_preferences").select("user_id, email, marketing").in("user_id", userIds),
    ]);
    // Announcements are what Account Settings calls "Marketing & Product
    // Updates", so either switch off means no email.
    const optedOut = new Set((prefs ?? [])
      .filter((p: { email: boolean; marketing: boolean }) => p.email === false || p.marketing === false)
      .map((p: { user_id: string }) => p.user_id));
    for (const p of (people ?? []).slice(0, 2000) as { id: string; email: string | null; full_name: string | null }[]) {
      if (!p.email || optedOut.has(p.id)) { emailSkipped++; continue; }
      try {
        await sendEmail({
          to: p.email,
          ...noticeEmail({
            name: p.full_name ?? "", heading: String(title).slice(0, 120), category: "announcement",
            paragraphs: [String(message).slice(0, 5000)],
            footnote: "You can turn these emails off in Account Settings → Notifications → Marketing & Product Updates.",
          }),
        });
        emailSent++;
      } catch (err) {
        console.error("announcement email failed:", err);
      }
    }
  }

  await db.from("push_notifications")
    .update({ status: "sent", sent_at: new Date().toISOString(), delivered_count: userIds.length })
    .eq("id", campaign.id);

  return { recipients: userIds.length, pushSent, emailSent, emailSkipped };
}

/** Hourly: send every scheduled campaign whose time has come. */
export async function runScheduledCampaigns(): Promise<{ sent: number; failed: number }> {
  const db = adminClient();
  const { data, error } = await db.from("push_notifications")
    .select("id, title, body, notification_type, target_segment, channel")
    .eq("status", "scheduled")
    .lte("scheduled_for", new Date().toISOString())
    .limit(20);
  if (error) throw new Error(error.message);
  let sent = 0, failed = 0;
  for (const row of (data ?? []) as CampaignRow[]) {
    // Claim it first so an overlapping run can't send it twice.
    const { data: claimed } = await db.from("push_notifications")
      .update({ status: "sending" }).eq("id", row.id).eq("status", "scheduled").select("id").maybeSingle();
    if (!claimed) continue;
    try { await deliverCampaign(row); sent++; }
    catch (err) {
      failed++;
      console.error("scheduled campaign failed:", row.id, err);
      await db.from("push_notifications").update({ status: "failed" }).eq("id", row.id);
    }
  }
  return { sent, failed };
}
