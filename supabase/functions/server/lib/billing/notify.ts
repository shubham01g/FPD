// Billing emails and in-app notices, each sent once. The dedupe key (for
// example "payment_failed:in_…") is claimed in billing_notifications before
// anything is sent, so a redelivered webhook or a second rollover run never
// emails twice. Never throws: a missing SendGrid key or a send failure is
// recorded on the row and must not fail a webhook.
import { adminClient } from "../supabaseAdmin.ts";
import { billingAlertEmail, EMAIL_CONFIGURED, type EmailMessage, MAILBOX, sendEmail } from "../email.ts";
import { appOrigin } from "../billingConfig.ts";

export function manageBillingUrl(): string {
  return `${appOrigin() ?? "https://finalpassdown.com"}/dashboard?page=storage-usage`;
}

interface InApp {
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  actionUrl?: string;
}

export async function notifyOnce(o: {
  userId: string | null;
  kind: string;
  dedupeKey: string;
  email?: Omit<EmailMessage, "to"> & { to?: string };
  inApp?: InApp;
}): Promise<boolean> {
  const db = adminClient();
  const { error: claimErr } = await db.from("billing_notifications").insert({ user_id: o.userId, kind: o.kind, dedupe_key: o.dedupeKey });
  if (claimErr) {
    if (claimErr.code !== "23505") console.error("billing_notifications claim failed:", claimErr.message);
    return false;
  }

  if (o.inApp && o.userId) {
    const { error } = await db.from("notifications").insert({
      user_id: o.userId, title: o.inApp.title, message: o.inApp.message, type: o.inApp.type, action_url: o.inApp.actionUrl ?? null,
    });
    if (error) console.error("in-app notification failed:", error.message);
  }

  let sendError: string | null = null;
  if (o.email) {
    let to = o.email.to;
    if (!to && o.userId) {
      const { data } = await db.from("users").select("email").eq("id", o.userId).maybeSingle();
      to = data?.email;
    }
    if (!to) sendError = "No email address";
    else if (!EMAIL_CONFIGURED) sendError = "Email sending is not configured (SENDGRID_API_KEY)";
    else {
      try {
        await sendEmail({ ...o.email, to });
      } catch (err) {
        sendError = err instanceof Error ? err.message : String(err);
      }
    }
  }
  await db.from("billing_notifications")
    .update({ sent_at: sendError ? null : new Date().toISOString(), error: sendError })
    .eq("dedupe_key", o.dedupeKey);
  if (sendError) console.error(`billing email ${o.dedupeKey} not sent:`, sendError);
  return true;
}

/** Tells the admin mailbox about something that needs a person. */
export async function alertAdmin(dedupeKey: string, title: string, lines: string[]): Promise<void> {
  console.warn(`[billing alert] ${title}: ${lines.join(" | ")}`);
  await notifyOnce({ userId: null, kind: "admin_alert", dedupeKey: `admin:${dedupeKey}`, email: { ...billingAlertEmail({ title, lines }), to: MAILBOX.admin } });
}
