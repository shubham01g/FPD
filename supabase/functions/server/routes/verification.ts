import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

const verification = new Hono();

// GET /admin/verification?status=pending
verification.get("/", async (c) => {
  const status = c.req.query("status") ?? "pending";
  let q = adminClient()
    .from("id_verifications")
    .select("*, contacts(id, full_name, email, phone, relationship, owner_user_id, contact_type, access_level, invite_sent_at, owner:owner_user_id(full_name, email, plan, created_at))")
    .order("submitted_at", { ascending: true });

  if (status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ verifications: data });
});

// GET /admin/verification/:id/documents — short-lived signed URLs for the
// scanned ID(s). The `id-verifications` bucket is private with an owner-only
// RLS policy, so the admin's own browser session can't read another user's
// object directly; this route signs it with the service-role client instead.
verification.get("/:id/documents", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();

  const { data: record, error } = await db
    .from("id_verifications")
    .select("document_url, document_back_url")
    .eq("id", id)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!record) return c.json({ error: "Verification not found" }, 404);

  const bucket = db.storage.from("id-verifications");
  const [front, back] = await Promise.all([
    bucket.createSignedUrl(record.document_url, 300),
    record.document_back_url ? bucket.createSignedUrl(record.document_back_url, 300) : Promise.resolve(null),
  ]);

  if (front?.error) return c.json({ error: front.error.message }, 500);
  if (back?.error) return c.json({ error: back.error.message }, 500);

  return c.json({ front: front?.data?.signedUrl ?? null, back: back?.data?.signedUrl ?? null });
});

// GET /admin/verification/:id/record — what the full-record view shows beyond
// the list row: the account's other contacts, the admin actions taken on this
// verification (from the audit log), and the reviewers' internal notes.
verification.get("/:id/record", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();

  const { data: record, error } = await db
    .from("id_verifications")
    .select("contact_id, contacts(owner_user_id)")
    .eq("id", id)
    .maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!record) return c.json({ error: "Verification not found" }, 404);

  const ownerId = (record.contacts as { owner_user_id?: string } | null)?.owner_user_id;
  const [others, trail, notes] = await Promise.all([
    ownerId
      ? db.from("contacts").select("id, full_name, relationship, contact_type, verification_status")
          .eq("owner_user_id", ownerId).neq("id", record.contact_id).order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    db.from("audit_logs").select("id, actor_email, action, created_at")
      .eq("target_type", "verification").eq("target_id", id).order("created_at", { ascending: true }),
    db.from("id_verification_notes").select("notes, updated_at").eq("verification_id", id).maybeSingle(),
  ]);
  if (others.error) return c.json({ error: others.error.message }, 500);
  if (trail.error) return c.json({ error: trail.error.message }, 500);
  if (notes.error) return c.json({ error: notes.error.message }, 500);

  return c.json({
    otherContacts: others.data ?? [],
    trail: trail.data ?? [],
    notes: notes.data?.notes ?? "",
    notesUpdatedAt: notes.data?.updated_at ?? null,
  });
});

// PUT /admin/verification/:id/notes { notes } — internal reviewer notes.
verification.put("/:id/notes", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("admin") as AdminUser;
  const { notes } = await c.req.json().catch(() => ({ notes: undefined }));
  if (typeof notes !== "string") return c.json({ error: "'notes' must be a string" }, 400);

  const { error } = await adminClient()
    .from("id_verification_notes")
    .upsert({ verification_id: id, notes, updated_by: admin.id, updated_at: new Date().toISOString() }, { onConflict: "verification_id" });
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ notes });
});

// POST /admin/verification/:id/approve
verification.post("/:id/approve", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("admin") as AdminUser;

  const { data, error } = await adminClient()
    .from("id_verifications")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Verification not found" }, 404);

  // Approving an ID verification also marks the underlying contact verified.
  await adminClient().from("contacts").update({ verification_status: "verified", id_verified_at: new Date().toISOString(), id_verified_by: admin.id }).eq("id", data.contact_id);

  return c.json({ verification: data });
});

// POST /admin/verification/:id/reject { reason }
verification.post("/:id/reject", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("admin") as AdminUser;
  const { reason } = await c.req.json().catch(() => ({ reason: undefined }));

  const { data, error } = await adminClient()
    .from("id_verifications")
    .update({ status: "rejected", reviewed_by: admin.id, reviewed_at: new Date().toISOString(), rejection_reason: reason ?? null })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Verification not found" }, 404);

  await adminClient().from("contacts").update({ verification_status: "rejected" }).eq("id", data.contact_id);

  return c.json({ verification: data });
});

export default verification;
