// Enforces System → Settings → Security → IP Allowlist on every /admin/*
// request. An empty list means no restriction. Must run after requireAdmin.
//
// The list is cached briefly so each admin request doesn't cost an extra
// query; a change therefore takes up to CACHE_MS to apply everywhere.
// routes/settings.ts refuses to save a list that excludes the admin saving
// it, so the portal cannot be locked from the inside.
import type { Context, Next } from "npm:hono";
import { clientIp, ipAllowed, readPlatformSection } from "../lib/platformSettings.ts";

const CACHE_MS = 30_000;
let cached: { security: Record<string, unknown>; at: number } | null = null;

/** The platform.security document, cached for CACHE_MS. requireAdmin reads
 *  enforce2FA from it too, so one cache serves both checks. */
export async function securitySettings(): Promise<Record<string, unknown>> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.security;
  const security = await readPlatformSection("security");
  cached = { security, at: Date.now() };
  return security;
}

async function allowlist(): Promise<string[]> {
  const security = await securitySettings();
  return Array.isArray(security.ipAllowlist)
    ? security.ipAllowlist.filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : [];
}

/** Called by routes/settings.ts after a save so the new list (and the 2FA
 *  enforcement switch) apply at once in this instance. */
export function clearIpAllowlistCache() {
  cached = null;
}

export async function ipAllowlist(c: Context, next: Next) {
  let list: string[];
  try {
    list = await allowlist();
  } catch (err) {
    // Fail closed: an unreadable allowlist must not mean "no restriction".
    console.error("ipAllowlist: security settings unreadable", err);
    return c.json({ error: "Failed to read admin access settings" }, 500);
  }
  if (list.length > 0) {
    const ip = clientIp(c.req.header("x-forwarded-for"));
    if (!ip || !ipAllowed(ip, list)) {
      return c.json({ error: `Admin access is restricted to allowed IP addresses${ip ? ` (yours is ${ip})` : ""}` }, 403);
    }
  }
  await next();
}
