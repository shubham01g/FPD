import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const audit = new Hono();

// GET /admin/audit?actorId=&severity=&targetType=&page=&pageSize=
// Populated automatically by the auditLog middleware on every mutating /admin/* request.
audit.get("/", async (c) => {
  const { actorId, severity, targetType } = c.req.query();
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const pageSize = Math.min(200, Number(c.req.query("pageSize") ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = adminClient()
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (actorId) q = q.eq("actor_id", actorId);
  if (severity) q = q.eq("severity", severity);
  if (targetType) q = q.eq("target_type", targetType);

  const { data, error, count } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ logs: data, total: count, page, pageSize });
});

export default audit;
