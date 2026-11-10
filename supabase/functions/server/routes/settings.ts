// Backs AdminSettings.tsx (System → Settings). Each tab's preferences are one
// JSON document stored in admin_settings under "platform.<section>", next to
// the pricing thresholds and crypto preferences that already live there.
//
// What reads them: maintenance mode, feature flags and the support email/phone
// are served to the app by GET /public/platform; the IP allowlist is enforced
// by middleware/ipAllowlist; "Enforce 2FA" by middleware/adminAuth; the session
// timeout by the admin portal itself. Notifications are stored preferences
// only (no alert sender reads them yet), and the screen says so. Mail, backups
// and payment preferences are set in SendGrid, Supabase and Stripe, not here.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";
import { clientIp, ipAllowed, readPlatformSection } from "../lib/platformSettings.ts";
import { clearIpAllowlistCache } from "../middleware/ipAllowlist.ts";
import { EMAIL_CONFIGURED, EMAIL_FROM_ADDRESS } from "../lib/email.ts";
import { hasSecondFactor } from "../lib/twoFactorGate.ts";
import danger from "./dangerZone.ts";

const settings = new Hono();

const SECTIONS = ["general", "flags", "security", "notifications"] as const;
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

// GET /admin/settings/email-status — whether the server can send mail, and
// from which address. Delivery figures live in SendGrid, not here.
settings.get("/email-status", (c) =>
  c.json({ configured: EMAIL_CONFIGURED, provider: EMAIL_CONFIGURED ? "SendGrid" : null, from: EMAIL_FROM_ADDRESS }));

// Everyone requireAdmin lets in: users.is_admin, minus suspended or
// not-yet-accepted admin_accounts rows. A legacy admin with no row counts too.
async function activeAdminsWithFactor() {
  const db = adminClient();
  const [{ data: users, error: uErr }, { data: accounts, error: aErr }] = await Promise.all([
    db.from("users").select("id, email, full_name").eq("is_admin", true),
    db.from("admin_accounts").select("email, name, role, status"),
  ]);
  if (uErr || aErr) throw new Error((uErr ?? aErr)!.message);
  const byEmail = new Map((accounts ?? []).map((a) => [String(a.email).toLowerCase(), a]));
  const active = (users ?? []).filter((u) => {
    const a = byEmail.get(String(u.email).toLowerCase());
    return !a || a.status === "active";
  });
  return Promise.all(active.map(async (u) => {
    const a = byEmail.get(String(u.email).toLowerCase());
    return {
      email: u.email as string,
      name: (a?.name ?? u.full_name ?? null) as string | null,
      role: (a?.role ?? "super_admin") as string,
      enrolled: await hasSecondFactor(u.id),
    };
  }));
}

// GET /admin/settings/2fa-status — each active admin and whether they have a
// second factor, for the "Enforce 2FA" switch on the Security tab.
settings.get("/2fa-status", async (c) => {
  try {
    return c.json({ admins: await activeAdminsWithFactor() });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Could not read admin 2FA status" }, 500);
  }
});

// PUT /admin/settings/:section { value }
settings.put("/:section", async (c) => {
  const section = c.req.param("section") as Section;
  if (!SECTIONS.includes(section)) return c.json({ error: `Unknown settings section '${section}'` }, 400);

  const { value } = await c.req.json().catch(() => ({ value: undefined }));
  if (value === null || typeof value !== "object") return c.json({ error: "'value' must be an object" }, 400);

  // An allowlist that leaves out the admin saving it would lock them (and
  // possibly everyone) out of the portal with no way back in from the UI.
  // Turning enforcement on while an admin has no second factor would lock
  // that admin out at once, so it is refused until everyone has enrolled.
  // Only the off → on change is checked: an admin added while it is already
  // on is simply asked to enrol, and other Security fields still save.
  const turningOn2fa = section === "security"
    && (value as { enforce2FA?: unknown }).enforce2FA === true
    && (await readPlatformSection("security")).enforce2FA !== true;
  if (turningOn2fa) {
    let admins;
    try {
      admins = await activeAdminsWithFactor();
    } catch (err) {
      return c.json({ error: err instanceof Error ? err.message : "Could not check admin 2FA status" }, 500);
    }
    const missing = admins.filter((a) => !a.enrolled).map((a) => a.email);
    if (missing.length > 0) {
      return c.json({ error: `These admins have not set up two-step verification yet: ${missing.join(", ")}. Enforcement stays off until they do.` }, 400);
    }
  }

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

// Danger Zone tools (super admin only) — routes/dangerZone.ts
settings.route("/danger", danger);

export default settings;
