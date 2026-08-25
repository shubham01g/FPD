// Writes an audit_logs row for every mutating admin request, so the Audit Log
// screen is populated automatically instead of each route hand-rolling it.
// Must run after requireAdmin (reads c.get("admin")).
import type { Context, Next } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "./adminAuth.ts";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Infers { targetType, targetId } from a route like /admin/users/:id -> ("users", id)
function inferTarget(path: string): { targetType?: string; targetId?: string } {
  const parts = path.split("/").filter(Boolean); // ["admin","users",":id"]
  const domainIdx = parts.indexOf("admin");
  const domain = domainIdx >= 0 ? parts[domainIdx + 1] : undefined;
  const id = domainIdx >= 0 ? parts[domainIdx + 2] : undefined;
  return { targetType: domain, targetId: id };
}

export async function auditLog(c: Context, next: Next) {
  await next();

  const method = c.req.method;
  if (!MUTATING_METHODS.has(method)) return;

  // Only log requests that actually succeeded — failed writes aren't audit-worthy actions.
  if (c.res.status >= 400) return;

  const admin = c.get("admin") as AdminUser | undefined;
  if (!admin) return;

  const path = new URL(c.req.url).pathname;
  const { targetType, targetId } = inferTarget(path);

  try {
    await adminClient().from("audit_logs").insert({
      actor_id: admin.id,
      actor_email: admin.email,
      action: `${method} ${path}`,
      target_type: targetType,
      target_id: targetId,
      severity: "info",
      ip_address: c.req.header("x-forwarded-for") ?? undefined,
    });
  } catch (err) {
    // Never fail the request because audit logging failed — just surface it server-side.
    console.error("audit log write failed:", err);
  }
}
