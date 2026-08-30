// Enforces the per-module View/Edit/Delete permissions set in AdminRoles.tsx
// server-side, so a restricted admin can't bypass a hidden UI button by
// calling the API directly. Must run after requireAdmin (reads c.get("admin")).
import type { Context, Next } from "npm:hono";
import type { AdminUser } from "./adminAuth.ts";

type Level = "canView" | "canEdit" | "canDelete";

function levelForMethod(method: string): Level {
  if (method === "DELETE") return "canDelete";
  if (method === "GET" || method === "HEAD") return "canView";
  return "canEdit"; // POST, PUT, PATCH
}

/**
 * `moduleKey` must match a `module` id in AdminRoles.tsx's MODULE_DEFS.
 * Accounts with `permissions: null` (legacy users.is_admin accounts with no
 * admin_accounts row) always pass — see adminAuth.ts.
 */
export function requireModulePermission(moduleKey: string) {
  return async (c: Context, next: Next) => {
    const admin = c.get("admin") as AdminUser | undefined;
    if (!admin) return c.json({ error: "Admin context missing — requireAdmin must run first" }, 500);

    if (admin.permissions === null) {
      await next();
      return;
    }

    const level = levelForMethod(c.req.method);
    const perm = admin.permissions.find((p) => p.module === moduleKey);

    if (!perm || !perm[level]) {
      return c.json({ error: `Your role does not have '${level.replace("can", "").toLowerCase()}' access to '${moduleKey}'` }, 403);
    }

    await next();
  };
}
