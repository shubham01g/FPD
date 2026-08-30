import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

const verification = new Hono();

// GET /admin/verification?status=pending
verification.get("/", async (c) => {
  const status = c.req.query("status") ?? "pending";
  let q = adminClient()
    .from("id_verifications")
    .select("*, contacts(id, full_name, email, relationship, owner_user_id, contact_type, owner:owner_user_id(full_name, email))")
    .order("submitted_at", { ascending: true });

  if (status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ verifications: data });
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
