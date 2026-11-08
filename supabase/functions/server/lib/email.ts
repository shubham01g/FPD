// SendGrid v3 sender — the one place the edge function sends email from.
import { defaultOrigin, isOurOrigin, originOf } from "./origins.ts";
//
// The key is an Edge Function secret, never in the repo:
//   npx supabase secrets set SENDGRID_API_KEY=SG.... --project-ref <ref>
// Optional overrides: EMAIL_FROM (default noreply@finalpassdown.com) and
// EMAIL_FROM_NAME. EMAIL_FROM must be on the domain authenticated in SendGrid
// (Settings → Sender Authentication) or messages land in spam.
//
// Until the key is set EMAIL_CONFIGURED is false and callers return a clear
// 503 instead of throwing — same shape as PUSH_CONFIGURED in notifications.ts.

const SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send";
const API_KEY = Deno.env.get("SENDGRID_API_KEY");

export const APP_NAME = "Final Pass Down";
export const SITE_URL = "https://finalpassdown.com";
const FROM_EMAIL = Deno.env.get("EMAIL_FROM") || "noreply@finalpassdown.com";
const FROM_NAME = Deno.env.get("EMAIL_FROM_NAME") || APP_NAME;
// Royal Vault Blue (theme.css --primary).
const BRAND = "#5B6EE1";
const NAVY = "#0B1530";

export const EMAIL_CONFIGURED = Boolean(API_KEY);
/** The address mail is sent from (shown in System → Settings). */
export const EMAIL_FROM_ADDRESS = FROM_EMAIL;

/** The team mailboxes. Mail still goes out from FROM_EMAIL; these are where a
 *  reply lands, so each kind of email answers to the team that handles it.
 *  The app keeps the same list in src/app/utils/fpdEmails.ts. */
export const MAILBOX = {
  support: "support@finalpassdown.com",
  verify: "verify@finalpassdown.com",
  claims: "claims@finalpassdown.com",
  admin: "admin@finalpassdown.com",
} as const;

export const EMAIL_NOT_CONFIGURED_MESSAGE =
  "Email sending isn't set up on this deployment. Set SENDGRID_API_KEY as an Edge Function secret.";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** SendGrid category, for filtering in the Activity feed. */
  category?: string;
  /** Where a reply goes. Defaults to support. */
  replyTo?: string;
  /** Files to attach; `content` is base64. */
  attachments?: { filename: string; content: string; type: string }[];
}

/* Admin → Email Templates (migration 052). Cached for a minute per
   category so a burst of sends doesn't query the table each time. */
type TemplateRow = { subject: string; html: string; is_active: boolean } | null;
const templateCache = new Map<string, { at: number; row: TemplateRow }>();

async function templateFor(category: string): Promise<TemplateRow> {
  const hit = templateCache.get(category);
  if (hit && Date.now() - hit.at < 60_000) return hit.row;
  let row: TemplateRow = null;
  try {
    const { adminClient } = await import("./supabaseAdmin.ts");
    const { data } = await adminClient().from("email_templates")
      .select("subject, html, is_active").eq("trigger_event", category).eq("is_active", true).limit(1).maybeSingle();
    row = data ?? null;
  } catch { row = null; }
  templateCache.set(category, { at: Date.now(), row });
  return row;
}

/** Applies an admin-edited template, keeping the built-in email as the body. */
async function applyTemplate(msg: EmailMessage): Promise<EmailMessage> {
  if (!msg.category) return msg;
  const t = await templateFor(msg.category);
  if (!t) return msg;
  const fill = (s: string) => s.replaceAll("{{subject}}", msg.subject).replaceAll("{{app_name}}", APP_NAME);
  const subject = t.subject?.trim() ? fill(t.subject).slice(0, 250) : msg.subject;
  const html = t.html?.includes("{{content}}") ? fill(t.html).replace("{{content}}", msg.html) : msg.html;
  return { ...msg, subject, html };
}

/** Sends one email. Throws on any non-2xx (SendGrid answers 202 on success). */
export async function sendEmail(original: EmailMessage): Promise<void> {
  if (!EMAIL_CONFIGURED) throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  const msg = await applyTemplate(original);

  const res = await fetch(SENDGRID_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: msg.to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      reply_to: { email: msg.replyTo ?? MAILBOX.support, name: FROM_NAME },
      subject: msg.subject,
      // SendGrid requires text/plain before text/html.
      content: [
        { type: "text/plain", value: msg.text },
        { type: "text/html", value: msg.html },
      ],
      categories: msg.category ? [msg.category] : undefined,
      attachments: msg.attachments?.map((a) => ({ filename: a.filename, content: a.content, type: a.type, disposition: "attachment" })),
      // Rewritten links in a security email look like phishing.
      tracking_settings: {
        click_tracking: { enable: false, enable_text: false },
        open_tracking: { enable: false },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`SendGrid send failed (${res.status}): ${await res.text()}`);
  }
}

function layout(title: string, bodyHtml: string, contact: string = MAILBOX.support): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e3e5e8;">
<tr><td style="background:${NAVY};padding:24px 36px;border-radius:12px 12px 0 0;border-bottom:3px solid ${BRAND};"><span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.3px;">${APP_NAME}</span></td></tr>
<tr><td style="padding:32px 36px;color:#1f2328;"><h1 style="margin:0 0 16px;font-size:22px;">${title}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:20px 36px;border-top:1px solid #e3e5e8;color:#6e7781;font-size:12px;">Questions? Reply to this email or write to <a href="mailto:${contact}" style="color:#6e7781;">${contact}</a>.<br>&copy; ${new Date().getFullYear()} ${APP_NAME} &middot; ${SITE_URL.replace("https://", "")}</td></tr>
</table></td></tr></table></body></html>`;
}

export function otpEmail(code: string, minutes: number): Omit<EmailMessage, "to"> {
  const lead = `Enter this code in ${APP_NAME} to confirm it's you.`;
  return {
    subject: `${code} is your ${APP_NAME} verification code`,
    category: "otp",
    replyTo: MAILBOX.verify,
    text:
      `${lead}\n\n${code}\n\nThis code expires in ${minutes} minutes and can only be used once.\n` +
      `If you didn't try to sign in, someone may know your password. Change it right away.`,
    html: layout("Your verification code", `
      <p style="margin:0 0 20px;line-height:1.6;">${lead}</p>
      <div style="margin:0 0 20px;padding:20px;background:#f4f5f7;border-radius:10px;text-align:center;">
        <span style="font-size:32px;font-weight:700;letter-spacing:10px;color:${BRAND};font-family:monospace;">${code}</span>
      </div>
      <p style="margin:0 0 12px;color:#6e7781;font-size:13px;">This code expires in ${minutes} minutes and can only be used once.</p>
      <p style="margin:0;color:#6e7781;font-size:13px;">If you didn't try to sign in, someone may know your password. Change it right away.</p>`, MAILBOX.verify),
  };
}

export function testEmail(): Omit<EmailMessage, "to"> {
  return {
    subject: `SendGrid test — ${APP_NAME}`,
    category: "test",
    text: "If you're reading this, SendGrid is configured correctly.",
    html: layout("It works", `<p style="margin:0;line-height:1.6;">If you're reading this, SendGrid is configured correctly.</p>`),
  };
}

/** Escapes text supplied by people (names, an admin's note) for the HTML part. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 20px;"><a href="${esc(href)}" style="display:inline-block;padding:12px 22px;background:${BRAND};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${label}</a></p>
      <p style="margin:0 0 20px;color:#6e7781;font-size:13px;word-break:break-all;">Or open this link: ${esc(href)}</p>`;
}

/** The secure Legacy Claim Portal link, sent to a legacy contact. `note` is
 *  the admin's own message; `moreDocs` marks a request for further documents. */
export function claimLinkEmail(o: {
  claimantName: string; deceasedName: string; claimRef: string; link: string; expires: string;
  note?: string | null; moreDocs?: boolean;
}): Omit<EmailMessage, "to"> {
  const lead = o.moreDocs
    ? `Our team needs additional documents to continue reviewing your claim (${o.claimRef}) on ${o.deceasedName}'s ${APP_NAME} account.`
    : `We are sorry for your loss. You were named as a legacy contact on ${o.deceasedName}'s ${APP_NAME} account. Use the secure link below to submit the documents needed to claim access.`;
  const closing = `This link is unique to you and expires on ${o.expires}. Do not share it.`;
  return {
    subject: o.moreDocs ? `More documents needed for claim ${o.claimRef}` : `Your secure claim link — ${APP_NAME}`,
    category: "legacy_claim",
    replyTo: MAILBOX.claims,
    text: `Dear ${o.claimantName},\n\n${lead}\n\n${o.note ? `${o.note}\n\n` : ""}${o.link}\n\n${closing}\nClaim reference: ${o.claimRef}\n\nQuestions? Reply to this email or write to ${MAILBOX.claims}.`,
    html: layout(o.moreDocs ? "More documents needed" : "Legacy access claim", `
      <p style="margin:0 0 16px;line-height:1.6;">Dear ${esc(o.claimantName)},</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      ${o.note ? `<p style="margin:0 0 20px;padding:14px 16px;background:#f4f5f7;border-radius:8px;line-height:1.6;white-space:pre-wrap;">${esc(o.note)}</p>` : ""}
      ${button(o.link, o.moreDocs ? "Add documents" : "Open the claim portal")}
      <p style="margin:0 0 6px;color:#6e7781;font-size:13px;">${esc(closing)}</p>
      <p style="margin:0;color:#6e7781;font-size:13px;">Claim reference: ${esc(o.claimRef)}</p>`, MAILBOX.claims),
  };
}

/** Link to reset a forgotten vault passphrase (routes/vaultReset.ts). Says
 *  plainly that resetting erases the saved passwords — nobody can recover them. */
export function vaultResetEmail(o: { link: string; minutes: number }): Omit<EmailMessage, "to"> {
  const lead = `Someone — hopefully you — asked to reset the vault passphrase on your ${APP_NAME} account.`;
  const warn = "Resetting permanently erases the passwords saved in Password Manager and Auto Pay & Subs. Nobody can recover them, including us. Titles, usernames, amounts and dates are kept, and you will choose a new passphrase.";
  const closing = `This link works once, expires in ${o.minutes} minutes, and only works while you are signed in to ${APP_NAME}. If you didn't ask for this, ignore this email — nothing changes.`;
  return {
    subject: `Reset your vault passphrase — ${APP_NAME}`,
    category: "vault_reset",
    replyTo: MAILBOX.support,
    text: `${lead}\n\n${warn}\n\n${o.link}\n\n${closing}`,
    html: layout("Reset your vault passphrase", `
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      <p style="margin:0 0 20px;padding:14px 16px;background:#fdf1f1;border-radius:8px;line-height:1.6;color:#8a2c2c;">${esc(warn)}</p>
      ${button(o.link, "Reset vault passphrase")}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(closing)}</p>`),
  };
}

/** A plain notice with an optional button (Concierge Portal emails). */
export function noticeEmail(o: {
  name: string; heading: string; paragraphs: string[]; button?: { href: string; label: string } | null;
  replyTo?: string; category: string; footnote?: string;
}): Omit<EmailMessage, "to"> {
  return {
    subject: `${o.heading} — ${APP_NAME}`,
    category: o.category,
    replyTo: o.replyTo ?? MAILBOX.support,
    text: [`Dear ${o.name || "there"},`, ...o.paragraphs, o.button ? `${o.button.label}: ${o.button.href}` : "", o.footnote ?? ""].filter(Boolean).join("\n\n"),
    html: layout(esc(o.heading), `
      <p style="margin:0 0 16px;line-height:1.6;">Dear ${esc(o.name || "there")},</p>
      ${o.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6;white-space:pre-wrap;">${esc(p)}</p>`).join("")}
      ${o.button ? button(o.button.href, o.button.label) : ""}
      ${o.footnote ? `<p style="margin:0;color:#6e7781;font-size:13px;">${esc(o.footnote)}</p>` : ""}`),
  };
}

/** The outcome of a review (legacy claim or ID verification). */
export function reviewDecisionEmail(o: {
  name: string; heading: string; lead: string; detail?: string | null; next: string; mailbox: string; category: string;
}): Omit<EmailMessage, "to"> {
  return {
    subject: `${o.heading} — ${APP_NAME}`,
    category: o.category,
    replyTo: o.mailbox,
    text: [`Dear ${o.name || "there"},`, o.lead, o.detail ? `Reason: ${o.detail}` : "", o.next].filter(Boolean).join("\n\n"),
    html: layout(esc(o.heading), `
      <p style="margin:0 0 16px;line-height:1.6;">Dear ${esc(o.name || "there")},</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(o.lead)}</p>
      ${o.detail ? `<p style="margin:0 0 16px;padding:12px 14px;background:#f6f7f9;border-radius:8px;line-height:1.6;"><strong>Reason:</strong> ${esc(o.detail)}</p>` : ""}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(o.next)}</p>`, o.mailbox),
  };
}

/** A Message to Loved Ones reaching its recipient (lib/messageDelivery.ts). */
export function lovedOneMessageEmail(o: {
  senderName: string; recipientName: string; title: string; medium: string; link: string; days: number; afterPassing: boolean;
}): Omit<EmailMessage, "to"> {
  const kind = o.medium === "video" ? "a video message" : o.medium === "voice" ? "a voice message" : "a letter";
  const lead = o.afterPassing
    ? `${o.senderName} recorded ${kind} for you before they passed, and asked ${APP_NAME} to deliver it to you now.`
    : `${o.senderName} left ${kind} for you with ${APP_NAME}, to be delivered today.`;
  const closing = `This private link works for ${o.days} days. Please don't forward this email: anyone with the link can open the message.`;
  return {
    subject: `${o.recipientName ? `${o.recipientName}, ` : ""}a message from ${o.senderName}`,
    category: "loved_one_message",
    replyTo: MAILBOX.support,
    text: `${lead}\n\n"${o.title}"\n\n${o.link}\n\n${closing}`,
    html: layout(esc(o.title || "A message for you"), `
      <p style="margin:0 0 20px;line-height:1.6;">${esc(lead)}</p>
      ${button(o.link, "Open the message")}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(closing)}</p>`),
  };
}

/** A month of receipts sent to the owner's accountant (routes/receipts.ts). */
export function receiptPackageEmail(o: {
  ownerName: string; ownerEmail: string; period: string; count: number; total: string;
  images: { label: string; url: string }[]; linkDays: number; csvAttached: boolean;
}): Omit<EmailMessage, "to"> {
  const lead = `${o.ownerName || o.ownerEmail} shared their ${o.period} receipts with you through ${APP_NAME}: ${o.count} receipt${o.count === 1 ? "" : "s"}, ${o.total} in total.`;
  const csv = o.csvAttached ? "A spreadsheet (CSV) of every receipt is attached." : "";
  const linkNote = o.images.length ? `The receipt images below can be opened for ${o.linkDays} days.` : "";
  const closing = `Questions about these receipts? Reply to this email to reach ${o.ownerEmail}.`;
  return {
    subject: `${o.period} receipts from ${o.ownerName || o.ownerEmail}`,
    category: "receipt_package",
    replyTo: o.ownerEmail,
    text: [lead, csv, linkNote, ...o.images.map((i) => `${i.label}: ${i.url}`), closing].filter(Boolean).join("\n\n"),
    html: layout(`${esc(o.period)} receipts`, `
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      ${csv ? `<p style="margin:0 0 16px;line-height:1.6;">${esc(csv)}</p>` : ""}
      ${o.images.length ? `<p style="margin:0 0 8px;line-height:1.6;">${esc(linkNote)}</p><ul style="margin:0 0 16px;padding-left:18px;line-height:1.8;">${o.images.map((i) => `<li><a href="${esc(i.url)}" style="color:${BRAND};">${esc(i.label)}</a></li>`).join("")}</ul>` : ""}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(closing)}</p>`),
  };
}

/** Invitation to join the admin portal. */
export function adminInviteEmail(o: { name: string; roleLabel: string; link: string; invitedBy: string }): Omit<EmailMessage, "to"> {
  const lead = `${o.invitedBy} has invited you to the ${APP_NAME} admin portal as ${o.roleLabel}.`;
  const closing = "This invitation expires in 72 hours. If you were not expecting it, you can ignore this email.";
  return {
    subject: `You're invited to the ${APP_NAME} admin portal`,
    category: "admin_invite",
    replyTo: MAILBOX.admin,
    text: `Hi ${o.name},\n\n${lead}\n\nAccept the invitation and set your password:\n${o.link}\n\n${closing}`,
    html: layout("Admin portal invitation", `
      <p style="margin:0 0 16px;line-height:1.6;">Hi ${esc(o.name)},</p>
      <p style="margin:0 0 20px;line-height:1.6;">${esc(lead)}</p>
      ${button(o.link, "Accept invitation")}
      <p style="margin:0;color:#6e7781;font-size:13px;">${closing}</p>`, MAILBOX.admin),
  };
}

/** Tells someone they were named a Legacy or Guardian Contact, with the link
 *  that connects the role to their own Final Pass Down sign-in (046). */
export function contactInviteEmail(o: {
  contactName: string; ownerName: string; type: "legacy" | "guardian"; link: string; days: number;
}): Omit<EmailMessage, "to"> {
  const role = o.type === "legacy" ? "Legacy Contact" : "Guardian Contact";
  const lead = `${o.ownerName} has named you as their ${role} on ${APP_NAME}.`;
  const meaning = o.type === "legacy"
    ? `A Legacy Contact is the person trusted to receive access to their vault after their passing. Nothing is shared with you today.`
    : `A Guardian Contact is someone trusted with view-only access to the folders they choose to share, such as medical or household records.`;
  const next = o.type === "legacy"
    ? `Accept the invitation by signing in to ${APP_NAME}, or creating a free sign-in. ${o.ownerName} may also ask you for a government-issued photo ID so our team can verify your identity ahead of time. If the time comes, your access opens on that same sign-in.`
    : `Accept the invitation by signing in to ${APP_NAME}, or creating a free sign-in. Once our team has verified you, what ${o.ownerName} shared appears under "Shared with me".`;
  const closing = `This link is unique to you and works for ${o.days} days. If you don't know ${o.ownerName}, you can ignore this email.`;
  return {
    subject: `${o.ownerName} named you as their ${role} — ${APP_NAME}`,
    category: "contact_invite",
    replyTo: MAILBOX.verify,
    text: `Hi ${o.contactName},\n\n${lead}\n\n${meaning}\n\n${next}\n\nAccept the invitation: ${o.link}\n\n${closing}\nQuestions? Reply to this email or write to ${MAILBOX.verify}.`,
    html: layout(`You've been named a ${role}`, `
      <p style="margin:0 0 16px;line-height:1.6;">Hi ${esc(o.contactName)},</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(meaning)}</p>
      <p style="margin:0 0 20px;line-height:1.6;">${esc(next)}</p>
      ${button(o.link, "Accept invitation")}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(closing)}</p>`, MAILBOX.verify),
  };
}

/** Sent to each approved claimant when an admin activates the continuation
 *  fee: the Legacy Vault is open. `link` is the Access Portal for a contact
 *  already linked to a sign-in, or a fresh accept link for one who isn't. */
export function accessLiveEmail(o: {
  contactName: string; ownerName: string; link: string; needsAccept: boolean; until: string;
}): Omit<EmailMessage, "to"> {
  const lead = `Your Legacy Contact access to ${o.ownerName}'s ${APP_NAME} vault is now open. You can view what they left for you until ${o.until}.`;
  const how = o.needsAccept
    ? `Open the link below, then sign in to ${APP_NAME} or create a free sign-in. That connects your access to your sign-in, and from then on it is under "Shared with me".`
    : `Sign in to ${APP_NAME} with your usual sign-in and open "Shared with me".`;
  const closing = "Saved passwords stay encrypted with the owner's own passphrase and can't be shown yet. Everything else is view-only.";
  return {
    subject: `Your Legacy Vault access is open — ${APP_NAME}`,
    category: "legacy_access_live",
    replyTo: MAILBOX.claims,
    text: `Dear ${o.contactName},\n\n${lead}\n\n${how}\n\n${o.link}\n\n${closing}\n\nQuestions? Reply to this email or write to ${MAILBOX.claims}.`,
    html: layout("Your Legacy Vault access is open", `
      <p style="margin:0 0 16px;line-height:1.6;">Dear ${esc(o.contactName)},</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      <p style="margin:0 0 20px;line-height:1.6;">${esc(how)}</p>
      ${button(o.link, "Open the Legacy Vault")}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(closing)}</p>`, MAILBOX.claims),
  };
}

/** Where links in outgoing mail point: the page it was sent from, so a link
 *  issued on a staging or preview site leads back to that same site, but
 *  only when that page is one of ours (lib/origins.ts). The Origin header is
 *  set by the caller, so trusting any value let anyone make our mail server
 *  send invite links that point at their own domain. */
export function linkOrigin(originHeader: string | undefined): string {
  return isOurOrigin(originHeader) ? originOf(originHeader)! : defaultOrigin();
}
// ── Billing ─────────────────────────────────────────────────────────────
// Stripe sends receipts. These are the few billing emails the app sends
// itself, each once per event (lib/billing/notify.ts).

/** A renewal payment failed. Stripe retries the card on its own schedule. */
export function paymentFailedEmail(o: { productName: string; amount: string; manageUrl: string }): Omit<EmailMessage, "to"> {
  const lead = `We couldn't take the ${o.amount} payment for ${o.productName}. Your account stays open while we retry the card over the next few days.`;
  const ask = "Please update your card so nothing is interrupted.";
  return {
    subject: `Payment failed for ${o.productName}`,
    category: "billing_payment_failed",
    text: `${lead}\n\n${ask}\n\nManage billing: ${o.manageUrl}`,
    html: layout("Your payment didn't go through", `
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      <p style="margin:0 0 20px;line-height:1.6;">${ask}</p>
      ${button(o.manageUrl, "Update payment method")}`),
  };
}

/** A storage overage invoice was declined; uploads beyond the plan stop. */
export function overageDeclinedEmail(o: { amount: string; manageUrl: string }): Omit<EmailMessage, "to"> {
  const lead = `We couldn't take the ${o.amount} storage overage payment. Until it's paid, new uploads are limited to your plan's included storage. Everything already stored is safe.`;
  return {
    subject: "Storage overage payment failed",
    category: "billing_overage_declined",
    text: `${lead}\n\nPay the open invoice or update your card: ${o.manageUrl}`,
    html: layout("Storage overage payment failed", `
      <p style="margin:0 0 20px;line-height:1.6;">${esc(lead)}</p>
      ${button(o.manageUrl, "Pay or update card")}`),
  };
}

/** Sent ahead of an annual renewal (invoice.upcoming). */
export function renewalReminderEmail(o: { productName: string; amount: string; date: string; manageUrl: string }): Omit<EmailMessage, "to"> {
  const lead = `${o.productName} renews on ${o.date}, and your card will be charged ${o.amount}.`;
  const how = "If you'd like to cancel, you can do it any time before then in Usage & Billing → Manage billing. Cancelling stops the renewal; your plan stays active until the end of the current year.";
  return {
    subject: `Your ${o.productName} renews on ${o.date}`,
    category: "billing_renewal_reminder",
    text: `${lead}\n\n${how}\n\nManage billing: ${o.manageUrl}`,
    html: layout("Upcoming renewal", `
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      <p style="margin:0 0 20px;line-height:1.6;">${esc(how)}</p>
      ${button(o.manageUrl, "Manage billing")}`),
  };
}

/** A legacy claim needs a person (a claimant locked out of the security
 *  check). Goes to the claims mailbox. */
export function claimAlertEmail(o: { title: string; lines: string[] }): Omit<EmailMessage, "to"> {
  return {
    subject: `[Claims] ${o.title}`,
    category: "legacy_claim_alert",
    replyTo: MAILBOX.claims,
    text: o.lines.join("\n"),
    html: layout(esc(o.title), o.lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5;">${esc(l)}</p>`).join(""), MAILBOX.claims),
  };
}

/** Something in billing needs a person (duplicate subscription, dispute,
 *  failed White Glove charge). Goes to the admin mailbox. */
export function billingAlertEmail(o: { title: string; lines: string[] }): Omit<EmailMessage, "to"> {
  return {
    subject: `[Billing] ${o.title}`,
    category: "billing_admin_alert",
    replyTo: MAILBOX.admin,
    text: o.lines.join("\n"),
    html: layout(esc(o.title), o.lines.map((l) => `<p style="margin:0 0 10px;line-height:1.5;">${esc(l)}</p>`).join(""), MAILBOX.admin),
  };
}
