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
let cached: { list: string[]; at: number } | null = null;

async function allowlist(): Promise<string[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.list;
  const security = await readPlatformSection("security");
  const list = Array.isArray(security.ipAllowlist)
    ? security.ipAllowlist.filter((x): x is string => typeof x === "string" && x.trim() !== "")
    : [];
  cached = { list, at: Date.now() };
  return list;
}

/** Called by routes/settings.ts after a save so the new list applies at once
 *  in this instance. */
export function clearIpAllowlistCache() {
  cached = null;
}

export async function ipAllowlist(c: Context, next: Next) {
  const list = await allowlist();
  if (list.length > 0) {
    const ip = clientIp(c.req.header("x-forwarded-for"));
    if (!ip || !ipAllowed(ip, list)) {
      return c.json({ error: `Admin access is restricted to allowed IP addresses${ip ? ` (yours is ${ip})` : ""}` }, 403);
    }
  }
  await next();
}
