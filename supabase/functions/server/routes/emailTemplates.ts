// Backs EmailTemplates.tsx. Requires the email_templates table added in
// database/migrations/002_admin_backend_gaps.sql — not part of 001_initial_schema.sql.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const emailTemplates = new Hono();

// GET /admin/email-templates?category=
emailTemplates.get("/", async (c) => {
  const category = c.req.query("category");
  let q = adminClient().from("email_templates").select("*").order("category").order("name");
  if (category && category !== "All") q = q.eq("category", category);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ templates: data });
});

// PUT /admin/email-templates/:id — full template edit (subject/html/variables)
emailTemplates.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["category", "name", "subject", "trigger_event", "variables", "html", "is_active"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  const admin = c.get("admin") as { id: string } | undefined;
  patch.updated_by = admin?.id;

  const { data, error } = await adminClient().from("email_templates").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Template not found" }, 404);
  return c.json({ template: data });
});

export default emailTemplates;
