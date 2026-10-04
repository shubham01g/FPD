// Legacy Management admin module (migration 027). Backs the Master Admin
// Legacy Claims tab and the Users tab's "Deceased" action:
//
//   mark an account holder deceased → one claim + link token per chosen legacy
//   contact → the contact submits through /public/legacy-claim/:token →
//   an admin approves, rejects or asks for more documents here.
//
// Approval does not open the vault by itself — it makes the account's paid
// $199 fee "ready to activate" (see subscriptions.ts), and activation stays a
// separate admin click.
//
// Routes that issue or re-open a link email it to the claimant (lib/email.ts)
// and report `emailed` back. The token is still returned, so the admin screen
// can show the link to copy when mail isn't configured or a send fails.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";
import { EMAIL_CONFIGURED, claimLinkEmail, linkOrigin, sendEmail } from "../lib/email.ts";

const legacy = new Hono();

const LINK_VALID_DAYS = 30;
const CLAIM_SELECT =
  "*, owner:owner_user_id(id, full_name, email, plan, country, created_at, deceased_at), " +
  "contact:contact_id(id, verification_status, id_verified_at), " +
  "documents:legacy_claim_documents(id, doc_type, file_name, uploaded_at), " +
  "events:legacy_claim_events(id, event, actor, type, created_at)";

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function linkExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + LINK_VALID_DAYS);
  return d.toISOString();
}

type DB = ReturnType<typeof adminClient>;

/** Emails the claimant their portal link. Never throws: a failed send must not
 *  undo the claim action, so the outcome is returned for the admin to see. */
async function emailClaimLink(origin: string | undefined, claim: {
  claim_ref: string; token: string; token_expires_at: string; claimant_name: string; claimant_email: string;
}, deceasedName: string, note?: string | null, moreDocs = false): Promise<{ emailed: boolean; emailError?: string }> {
  if (!EMAIL_CONFIGURED) return { emailed: false, emailError: "Email sending is not set up" };
  if (!claim.claimant_email) return { emailed: false, emailError: "The claimant has no email address" };
  try {
    await sendEmail({
      to: claim.claimant_email,
      ...claimLinkEmail({
        claimantName: claim.claimant_name,
        deceasedName,
        claimRef: claim.claim_ref,
        link: `${linkOrigin(origin)}/legacy-claim/${claim.token}`,
        expires: new Date(claim.token_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        note,
        moreDocs,
      }),
    });
    return { emailed: true };
  } catch (err) {
    console.error("claim link email failed:", err);
    return { emailed: false, emailError: "The email could not be sent" };
  }
}

async function addEvent(db: DB, claimId: string, event: string, actor: string, type: "system" | "claimant" | "admin" | "warn" = "admin") {
  await db.from("legacy_claim_events").insert({ claim_id: claimId, event, actor, type });
}

async function loadClaim(db: DB, id: string) {
  return db.from("legacy_claims").select(CLAIM_SELECT).eq("id", id).maybeSingle();
}

// GET /admin/legacy/claims — the review queue, newest first.
legacy.get("/claims", async (c) => {
  const { data, error } = await adminClient()
    .from("legacy_claims")
    .select(CLAIM_SELECT)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ claims: data });
});

// GET /admin/legacy/contacts/:userId — the account's legacy contacts, for the
// Mark Deceased window's recipient list.
legacy.get("/contacts/:userId", async (c) => {
  const { data, error } = await adminClient()
    .from("contacts")
    .select("id, full_name, email, phone, relationship, verification_status")
    .eq("owner_user_id", c.req.param("userId"))
    .eq("contact_type", "legacy")
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ contacts: data });
});

// POST /admin/legacy/deceased { userId, dateOfDeath, contactIds, message }
// Marks the account holder deceased and opens one claim per chosen contact.
legacy.post("/deceased", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const { userId, dateOfDeath, contactIds, message } = await c.req.json().catch(() => ({}));

  if (!userId || !dateOfDeath) return c.json({ error: "'userId' and 'dateOfDeath' are required" }, 400);
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return c.json({ error: "Choose at least one legacy contact to receive a claim link" }, 400);
  }

  const db = adminClient();
  const { data: owner, error: ownerErr } = await db.from("users").select("id, full_name").eq("id", userId).maybeSingle();
  if (ownerErr) return c.json({ error: ownerErr.message }, 500);
  if (!owner) return c.json({ error: "User not found" }, 404);

  const { data: contacts, error: contactsErr } = await db
    .from("contacts")
    .select("id, full_name, email, phone, relationship")
    .eq("owner_user_id", userId)
    .eq("contact_type", "legacy")
    .in("id", contactIds);
  if (contactsErr) return c.json({ error: contactsErr.message }, 500);
  if (!contacts?.length) return c.json({ error: "None of the chosen contacts are legacy contacts of this account" }, 400);

  const { error: markErr } = await db
    .from("users")
    .update({ deceased_at: new Date().toISOString(), date_of_death: dateOfDeath })
    .eq("id", userId);
  if (markErr) return c.json({ error: markErr.message }, 500);

  const { count } = await db.from("legacy_claims").select("id", { count: "exact", head: true });
  const year = new Date().getFullYear();
  const created = [];

  for (const [i, contact] of contacts.entries()) {
    const { data: claim, error } = await db
      .from("legacy_claims")
      .insert({
        claim_ref: `CLM-${year}-${String((count ?? 0) + i + 1).padStart(4, "0")}`,
        owner_user_id: userId,
        contact_id: contact.id,
        token: newToken(),
        token_expires_at: linkExpiry(),
        date_of_death: dateOfDeath,
        claimant_name: contact.full_name,
        claimant_email: contact.email,
        claimant_phone: contact.phone,
        claimant_relationship: contact.relationship,
        link_message: message || null,
      })
      .select("id, claim_ref, token, token_expires_at, claimant_name, claimant_email")
      .single();
    if (error) return c.json({ error: error.message }, 500);

    await addEvent(db, claim.id, `Account holder ${owner.full_name} marked as deceased (date of death ${dateOfDeath})`, admin.email);
    const mail = await emailClaimLink(c.req.header("origin"), claim, owner.full_name, message);
    await addEvent(db, claim.id, mail.emailed
      ? `Claim link emailed to legacy contact ${contact.full_name} (${claim.claimant_email})`
      : `Claim link issued for legacy contact ${contact.full_name}`, admin.email);
    created.push({ ...claim, ...mail });
  }

  return c.json({ claims: created }, 201);
});

// GET /admin/legacy/claims/:id/documents — short-lived signed URLs, same
// arrangement as /admin/verification/:id/documents.
legacy.get("/claims/:id/documents", async (c) => {
  const db = adminClient();
  const { data: docs, error } = await db
    .from("legacy_claim_documents")
    .select("doc_type, file_path, file_name")
    .eq("claim_id", c.req.param("id"));
  if (error) return c.json({ error: error.message }, 500);

  const bucket = db.storage.from("legacy-claims");
  const documents = await Promise.all((docs ?? []).map(async (d) => {
    const { data } = await bucket.createSignedUrl(d.file_path, 300);
    return { doc_type: d.doc_type, file_name: d.file_name, url: data?.signedUrl ?? null };
  }));

  return c.json({ documents });
});

// POST /admin/legacy/claims/:id/approve
legacy.post("/claims/:id/approve", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const id = c.req.param("id");
  const db = adminClient();

  const { data: updated, error } = await db
    .from("legacy_claims")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", id)
    .in("status", ["pending_review", "awaiting_docs"])
    .select("id, requested_access")
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!updated) return c.json({ error: "Claim not found, or it is not waiting on review" }, 400);

  await addEvent(db, id, `Admin approved claim — ${updated.requested_access} granted`, admin.email);
  const { data } = await loadClaim(db, id);
  return c.json({ claim: data });
});

// POST /admin/legacy/claims/:id/reject { reason }
legacy.post("/claims/:id/reject", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const id = c.req.param("id");
  const { reason } = await c.req.json().catch(() => ({ reason: undefined }));
  const db = adminClient();

  const { data: updated, error } = await db
    .from("legacy_claims")
    .update({ status: "rejected", reviewed_by: admin.id, reviewed_at: new Date().toISOString(), rejection_reason: reason ?? null })
    .eq("id", id)
    .in("status", ["pending_review", "awaiting_docs"])
    .select("id")
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!updated) return c.json({ error: "Claim not found, or it is not waiting on review" }, 400);

  await addEvent(db, id, `Admin rejected claim${reason ? ` — ${reason}` : ""}`, admin.email);
  const { data } = await loadClaim(db, id);
  return c.json({ claim: data });
});

// POST /admin/legacy/claims/:id/request-docs { message }
// Re-opens the portal link so the claimant can add what is missing.
legacy.post("/claims/:id/request-docs", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const id = c.req.param("id");
  const { message } = await c.req.json().catch(() => ({ message: undefined }));
  const db = adminClient();

  const { data: updated, error } = await db
    .from("legacy_claims")
    .update({ status: "awaiting_docs", token_expires_at: linkExpiry() })
    .eq("id", id)
    .in("status", ["pending_review", "awaiting_docs"])
    .select("id, claim_ref, token, token_expires_at, claimant_name, claimant_email, owner:owner_user_id(full_name)")
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!updated) return c.json({ error: "Claim not found, or it is not waiting on review" }, 400);

  const ownerName = (updated.owner as { full_name?: string } | null)?.full_name ?? "the account holder";
  const mail = await emailClaimLink(c.req.header("origin"), updated, ownerName, message, true);
  await addEvent(db, id, `Admin requested additional documentation${message ? ` — ${message}` : ""}${mail.emailed ? " (emailed to the claimant)" : ""}`, admin.email);
  const { data } = await loadClaim(db, id);
  return c.json({ claim: data, ...mail });
});

// PATCH /admin/legacy/claims/:id/notes { notes }
legacy.patch("/claims/:id/notes", async (c) => {
  const { notes } = await c.req.json().catch(() => ({ notes: "" }));
  const { data, error } = await adminClient()
    .from("legacy_claims")
    .update({ admin_notes: notes || null })
    .eq("id", c.req.param("id"))
    .select("id, admin_notes")
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Claim not found" }, 404);
  return c.json({ claim: data });
});

// POST /admin/legacy/claims/:id/escalate — flags the claim in its timeline
// for a senior reviewer. Status is unchanged.
legacy.post("/claims/:id/escalate", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const id = c.req.param("id");
  const db = adminClient();

  const { data } = await db.from("legacy_claims").select("id").eq("id", id).maybeSingle();
  if (!data) return c.json({ error: "Claim not found" }, 404);

  await addEvent(db, id, "Claim flagged for escalation", admin.email, "warn");
  return c.json({ ok: true });
});

// POST /admin/legacy/claims/:id/link { email, message }
// Issues a fresh link (the old one stops working) — for a lost link, or to
// send it to a corrected address.
legacy.post("/claims/:id/link", async (c) => {
  const admin = c.get("admin") as AdminUser;
  const id = c.req.param("id");
  const { email, message } = await c.req.json().catch(() => ({}));
  const db = adminClient();

  const update: Record<string, unknown> = { token: newToken(), token_expires_at: linkExpiry() };
  if (email) update.claimant_email = email;
  if (message !== undefined) update.link_message = message || null;

  const { data, error } = await db
    .from("legacy_claims")
    .update(update)
    .eq("id", id)
    .select("id, claim_ref, token, token_expires_at, claimant_name, claimant_email, link_message, owner:owner_user_id(full_name)")
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Claim not found" }, 404);

  const ownerName = (data.owner as { full_name?: string } | null)?.full_name ?? "the account holder";
  const mail = await emailClaimLink(c.req.header("origin"), data, ownerName, data.link_message);
  await addEvent(db, id, mail.emailed ? `New claim link emailed to ${data.claimant_email}` : `New claim link issued for ${data.claimant_email}`, admin.email);
  return c.json({ claim: data, ...mail });
});

export default legacy;
