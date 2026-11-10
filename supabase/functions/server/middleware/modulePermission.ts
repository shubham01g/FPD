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
  return requireAnyModulePermission([moduleKey]);
}

/**
 * Passes when the admin has the needed level on ANY of `moduleKeys` (e.g. the
 * Overview dashboard needs "overview" or "analytics"). Super admins — legacy
 * accounts with no permission list, or role super_admin — always pass, so a
 * module added later can never lock them out.
 */
export function requireAnyModulePermission(moduleKeys: string[]) {
  return async (c: Context, next: Next) => {
    const admin = c.get("admin") as AdminUser | undefined;
    if (!admin) return c.json({ error: "Admin context missing — requireAdmin must run first" }, 500);

    if (admin.permissions === null || admin.role === "super_admin") {
      await next();
      return;
    }

    const level = levelForMethod(c.req.method);
    const ok = moduleKeys.some((key) => admin.permissions!.find((p) => p.module === key)?.[level]);
    if (!ok) {
      return c.json({ error: `Your role does not have '${level.replace("can", "").toLowerCase()}' access to '${moduleKeys[0]}'` }, 403);
    }

    await next();
  };
}
