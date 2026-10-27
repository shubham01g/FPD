// SendGrid v3 sender — the one place the edge function sends email from.
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
}

/** Sends one email. Throws on any non-2xx (SendGrid answers 202 on success). */
export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (!EMAIL_CONFIGURED) throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);

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

/** Tells someone they were named a Legacy or Guardian Contact. There is no
 *  contact sign-in, so this explains the role rather than asking for a click. */
export function contactInviteEmail(o: {
  contactName: string; ownerName: string; type: "legacy" | "guardian"; link: string;
}): Omit<EmailMessage, "to"> {
  const role = o.type === "legacy" ? "Legacy Contact" : "Guardian Contact";
  const lead = `${o.ownerName} has named you as their ${role} on ${APP_NAME}.`;
  const meaning = o.type === "legacy"
    ? `A Legacy Contact is the person trusted to receive access to their vault after their passing. Nothing is shared with you today.`
    : `A Guardian Contact is someone trusted with view-only access to the folders they choose to share, such as medical or household records.`;
  const next = o.type === "legacy"
    ? `You don't need to do anything right now. ${o.ownerName} may ask you for a government-issued photo ID so our team can verify your identity ahead of time. If the time comes, we will email you a secure link to claim access.`
    : `You don't need to do anything right now. ${o.ownerName} can tell you more about what they have shared with you.`;
  const closing = `If you don't know ${o.ownerName}, you can ignore this email.`;
  return {
    subject: `${o.ownerName} named you as their ${role} — ${APP_NAME}`,
    category: "contact_invite",
    replyTo: MAILBOX.verify,
    text: `Hi ${o.contactName},\n\n${lead}\n\n${meaning}\n\n${next}\n\nAbout ${APP_NAME}: ${o.link}\n\n${closing}\nQuestions? Reply to this email or write to ${MAILBOX.verify}.`,
    html: layout(`You've been named a ${role}`, `
      <p style="margin:0 0 16px;line-height:1.6;">Hi ${esc(o.contactName)},</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(lead)}</p>
      <p style="margin:0 0 16px;line-height:1.6;">${esc(meaning)}</p>
      <p style="margin:0 0 20px;line-height:1.6;">${esc(next)}</p>
      ${button(o.link, `About ${APP_NAME}`)}
      <p style="margin:0;color:#6e7781;font-size:13px;">${esc(closing)}</p>`, MAILBOX.verify),
  };
}

/** Where links in outgoing mail point: the page the admin sent it from, so a
 *  link issued on a staging or preview site leads back to that same site. */
export function linkOrigin(originHeader: string | undefined): string {
  return originHeader && /^https?:\/\/[^/]+$/.test(originHeader) ? originHeader : SITE_URL;
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
