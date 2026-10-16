// Contact invitations for the signed-in account. Mounted at /account/contacts
// behind requireUser.
//
// Adding a Legacy or Guardian Contact has always shown "Verification invite
// sent", but nothing was ever sent — the browser only stamped invite_sent_at on
// the row. This is the send: the contact gets an email telling them who named
// them and what the role means.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";
import {
  EMAIL_CONFIGURED, EMAIL_NOT_CONFIGURED_MESSAGE, contactInviteEmail, linkOrigin, sendEmail,
} from "../lib/email.ts";

const contacts = new Hono();

type InvitableType = "legacy" | "guardian";
const INVITABLE: InvitableType[] = ["legacy", "guardian"];

// The recipient address is whatever the account holder typed, so this endpoint
// can mail anyone. One send per contact per minute keeps it from being a loop.
const RESEND_COOLDOWN_SECONDS = 60;

// POST /:id/invite — emails the contact and marks the invite as sent.
contacts.post("/:id/invite", async (c) => {
  const user = c.get("user") as AuthedUser;
  const db = adminClient();

  // The service-role client bypasses RLS, so ownership is checked here.
  const { data: contact, error } = await db
    .from("contacts")
    .select("id, full_name, email, contact_type, verification_status, invite_sent_at")
    .eq("id", c.req.param("id"))
    .eq("owner_user_id", user.id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!contact) return c.json({ error: "Contact not found." }, 404);
  if (!INVITABLE.includes(contact.contact_type)) {
    return c.json({ error: "Invites are only sent to Legacy and Guardian Contacts." }, 400);
  }
  if (!contact.email) return c.json({ error: "This contact has no email address." }, 400);
  if (!EMAIL_CONFIGURED) return c.json({ error: EMAIL_NOT_CONFIGURED_MESSAGE }, 503);

  if (contact.invite_sent_at) {
    const elapsed = (Date.now() - new Date(contact.invite_sent_at).getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return c.json({ error: "An invite was just sent to this contact. Try again in a minute." }, 429);
    }
  }

  const { data: owner } = await db.from("users").select("full_name").eq("id", user.id).maybeSingle();

  try {
    await sendEmail({
      to: contact.email,
      ...contactInviteEmail({
        contactName: contact.full_name,
        ownerName: owner?.full_name || user.email,
        type: contact.contact_type,
        link: linkOrigin(c.req.header("Origin")),
      }),
    });
  } catch (err) {
    console.error("contact invite email failed:", err);
    return c.json({ error: "The invite email could not be sent." }, 502);
  }

  // Only a never-invited contact moves to pending; a resend must not knock a
  // verified or rejected contact back.
  const sentAt = new Date().toISOString();
  const verificationStatus = contact.verification_status === "not_sent" ? "pending" : contact.verification_status;
  const { error: updateError } = await db
    .from("contacts")
    .update({ invite_sent_at: sentAt, verification_status: verificationStatus })
    .eq("id", contact.id);
  if (updateError) console.error("contact invite: could not record invite_sent_at", updateError);

  return c.json({ sent: true, to: contact.email, verificationStatus });
});

export default contacts;
