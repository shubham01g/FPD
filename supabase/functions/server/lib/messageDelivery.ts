// Delivers Messages to Loved Ones (migration 050).
//
// Run hourly by pg_cron through POST /internal/messages/deliver. Only
// SEALED messages with a recipient_email are sent:
//   on_date      once, when trigger_date has arrived
//   birthday,
//   anniversary  every year on trigger_date's month/day (from its year on)
//   on_passing   once, after the owner is marked deceased AND the $199
//                continuation fee is paid and activated (the same rule the
//                Legacy Access portal uses)
// Each delivery emails a private link to /message/<token>, valid 30 days;
// only the token's sha256 is stored.
import { adminClient } from "./supabaseAdmin.ts";
import { EMAIL_CONFIGURED, lovedOneMessageEmail, sendEmail } from "./email.ts";
import { defaultOrigin } from "./origins.ts";

const LINK_DAYS = 30;
const BATCH = 50;

export async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

type Msg = {
  id: string; user_id: string; title: string | null; recipient_name: string | null; recipient_email: string | null;
  medium: string | null; trigger_type: string | null; trigger_date: string | null; delivered_at: string | null;
};

function isDue(m: Msg, today: Date, passingReleased: Set<string>): boolean {
  const todayIso = today.toISOString().slice(0, 10);
  switch (m.trigger_type) {
    case "on_date":
      return !m.delivered_at && !!m.trigger_date && m.trigger_date <= todayIso;
    case "birthday":
    case "anniversary": {
      if (!m.trigger_date) return false;
      const [y, mo, d] = m.trigger_date.split("-").map(Number);
      if (today.getUTCFullYear() < y) return false;
      if (today.getUTCMonth() + 1 !== mo || today.getUTCDate() !== d) return false;
      return !m.delivered_at || new Date(m.delivered_at).getUTCFullYear() < today.getUTCFullYear();
    }
    case "on_passing":
      return !m.delivered_at && passingReleased.has(m.user_id);
    default:
      return false;
  }
}

export async function runMessageDelivery(): Promise<{ checked: number; sent: number; failed: number; skipped?: string }> {
  if (!EMAIL_CONFIGURED) return { checked: 0, sent: 0, failed: 0, skipped: "Email is not configured" };
  const db = adminClient();
  const { data: rows, error } = await db.from("messages_to_loved_ones")
    .select("id, user_id, title, recipient_name, recipient_email, medium, trigger_type, trigger_date, delivered_at")
    .eq("status", "sealed").not("recipient_email", "is", null).limit(2000);
  if (error) throw new Error(error.message);
  const msgs = (rows ?? []) as Msg[];

  // Owners whose "on passing" messages are released.
  const passingOwners = [...new Set(msgs.filter((m) => m.trigger_type === "on_passing" && !m.delivered_at).map((m) => m.user_id))];
  const released = new Set<string>();
  if (passingOwners.length) {
    const [{ data: dead }, { data: fees }] = await Promise.all([
      db.from("users").select("id").in("id", passingOwners).not("deceased_at", "is", null),
      db.from("legacy_continuation_fees").select("user_id").in("user_id", passingOwners).eq("status", "paid").not("activated_at", "is", null),
    ]);
    const paid = new Set((fees ?? []).map((f) => f.user_id as string));
    for (const u of dead ?? []) if (paid.has(u.id as string)) released.add(u.id as string);
  }

  const today = new Date();
  const due = msgs.filter((m) => isDue(m, today, released)).slice(0, BATCH);
  if (!due.length) return { checked: msgs.length, sent: 0, failed: 0 };

  const ownerIds = [...new Set(due.map((m) => m.user_id))];
  const { data: owners } = await db.from("users").select("id, full_name, email").in("id", ownerIds);
  const nameOf = new Map((owners ?? []).map((o) => [o.id as string, (o.full_name as string) || (o.email as string)]));

  let sent = 0, failed = 0;
  for (const m of due) {
    const token = newToken();
    const expires = new Date(Date.now() + LINK_DAYS * 86_400_000).toISOString();
    const yearly = m.trigger_type === "birthday" || m.trigger_type === "anniversary";
    // Claim first, send second. Marking the row delivered only after the
    // email meant a failed write re-sent the same message every hour; the
    // claim is also conditional on delivered_at being unchanged, so two runs
    // can't both send it.
    let claim = db.from("messages_to_loved_ones").update({
      delivered_at: new Date().toISOString(),
      delivery_token_hash: await sha256Hex(token), delivery_token_expires_at: expires, delivery_error: null,
      ...(yearly ? {} : { status: "delivered" }),
    }).eq("id", m.id).eq("status", "sealed");
    claim = m.delivered_at ? claim.eq("delivered_at", m.delivered_at) : claim.is("delivered_at", null);
    const { data: claimed, error: claimErr } = await claim.select("id");
    if (claimErr) { failed++; console.error(`message ${m.id}: claim failed`, claimErr.message); continue; }
    if (!claimed?.length) continue; // another run took it

    try {
      await sendEmail({
        to: m.recipient_email!,
        ...lovedOneMessageEmail({
          senderName: nameOf.get(m.user_id) ?? "Someone who cares about you",
          recipientName: m.recipient_name ?? "", title: m.title ?? "", medium: m.medium ?? "letter",
          link: `${defaultOrigin()}/message/${token}`, days: LINK_DAYS, afterPassing: m.trigger_type === "on_passing",
        }),
      });
      sent++;
    } catch (err) {
      failed++;
      // Not sent: put the row back so the next run tries again.
      const { error: undoErr } = await db.from("messages_to_loved_ones").update({
        delivered_at: m.delivered_at, status: "sealed",
        delivery_error: String((err as Error).message).slice(0, 300),
      }).eq("id", m.id);
      if (undoErr) console.error(`message ${m.id}: could not undo the claim after a failed send`, undoErr.message);
    }
  }
  return { checked: msgs.length, sent, failed };
}

/** What the public /message/:token page shows. */
export async function openDeliveredMessage(token: string) {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const db = adminClient();
  const { data: m } = await db.from("messages_to_loved_ones")
    .select("user_id, title, recipient_name, medium, body, media_url, duration_s, delivered_at, delivery_token_expires_at")
    .eq("delivery_token_hash", await sha256Hex(token)).maybeSingle();
  if (!m) return null;
  if (!m.delivery_token_expires_at || new Date(m.delivery_token_expires_at).getTime() < Date.now()) return { expired: true as const };
  const { data: owner } = await db.from("users").select("full_name").eq("id", m.user_id).maybeSingle();
  let mediaUrl: string | null = null;
  if (m.media_url && !/^(blob:|data:|https?:)/.test(m.media_url)) {
    const { data } = await db.storage.from("vault-documents").createSignedUrl(m.media_url, 3600);
    mediaUrl = data?.signedUrl ?? null;
  }
  return {
    expired: false as const,
    from: owner?.full_name ?? "", to: m.recipient_name ?? "", title: m.title ?? "", medium: m.medium ?? "letter",
    body: m.body ?? "", mediaUrl, deliveredAt: m.delivered_at,
  };
}
