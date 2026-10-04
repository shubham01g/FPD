// Backs AdminSettings.tsx (System → Settings). Each tab's preferences are one
// JSON document stored in admin_settings under "platform.<section>", next to
// the pricing thresholds and crypto preferences that already live there.
//
// What reads them: maintenance mode and feature flags are served to the app by
// GET /public/platform; the IP allowlist is enforced by middleware/ipAllowlist;
// the session timeout is applied by the admin portal itself. The rest
// (notifications, SMTP, backup, 2FA enforcement) are stored preferences only —
// no mail sender or backup job exists to read them. The screen says so.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";
import { clientIp, ipAllowed } from "../lib/platformSettings.ts";
import { clearIpAllowlistCache } from "../middleware/ipAllowlist.ts";

const settings = new Hono();

// "payments" is the Settings tab of the Payment Processors screen.
const SECTIONS = ["general", "flags", "security", "notifications", "smtp", "backup", "payments"] as const;
type Section = typeof SECTIONS[number];
const keyFor = (section: Section) => `platform.${section}`;

// GET /admin/settings — every section that has been saved; unsaved ones are absent.
settings.get("/", async (c) => {
  const { data, error } = await adminClient()
    .from("admin_settings")
    .select("key, value, updated_at")
    .in("key", SECTIONS.map(keyFor));
  if (error) return c.json({ error: error.message }, 500);

  const out: Record<string, unknown> = {};
  for (const row of data ?? []) {
    try {
      out[row.key.slice("platform.".length)] = JSON.parse(row.value);
    } catch {
      // A hand-edited, non-JSON row is ignored rather than breaking the screen.
    }
  }
  return c.json({ settings: out });
});

// PUT /admin/settings/:section { value }
settings.put("/:section", async (c) => {
  const section = c.req.param("section") as Section;
  if (!SECTIONS.includes(section)) return c.json({ error: `Unknown settings section '${section}'` }, 400);

  const { value } = await c.req.json().catch(() => ({ value: undefined }));
  if (value === null || typeof value !== "object") return c.json({ error: "'value' must be an object" }, 400);

  // An allowlist that leaves out the admin saving it would lock them (and
  // possibly everyone) out of the portal with no way back in from the UI.
  if (section === "security") {
    const list = Array.isArray((value as { ipAllowlist?: unknown }).ipAllowlist)
      ? ((value as { ipAllowlist: unknown[] }).ipAllowlist).filter((x): x is string => typeof x === "string" && x.trim() !== "")
      : [];
    if (list.length > 0) {
      const ip = clientIp(c.req.header("x-forwarded-for"));
      if (!ip || !ipAllowed(ip, list)) {
        return c.json({ error: `That allowlist would block your own address${ip ? ` (${ip})` : ""}. Add it first.` }, 400);
      }
    }
  }

  const admin = c.get("admin") as AdminUser;
  const { error } = await adminClient()
    .from("admin_settings")
    .upsert(
      { key: keyFor(section), value: JSON.stringify(value), updated_by: admin.id, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) return c.json({ error: error.message }, 500);
  if (section === "security") clearIpAllowlistCache();
  return c.json({ section, value });
});

export default settings;
