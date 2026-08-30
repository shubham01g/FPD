import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";

const users = new Hono();

// GET /admin/users?search=&plan=&status=&page=&pageSize=
users.get("/", async (c) => {
  const { search, plan, status } = c.req.query();
  const page = Math.max(1, Number(c.req.query("page") ?? 1));
  const pageSize = Math.min(100, Number(c.req.query("pageSize") ?? 25));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = adminClient()
    .from("users")
    .select(
      "id, email, full_name, phone, avatar_url, plan, plan_status, is_admin, email_verified, created_at, " +
      "contacts(count), storage_usage(used_bytes, billing_period)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  if (plan) q = q.eq("plan", plan);
  if (status) q = q.eq("plan_status", status);

  const { data, error, count } = await q;
  if (error) return c.json({ error: error.message }, 500);

  // Shape the embedded relations down to what the list view actually needs —
  // contacts(count) comes back as [{count:N}], storage_usage as one row per
  // billing period (we only want the most recent).
  type Row = Record<string, unknown> & {
    contacts?: { count: number }[];
    storage_usage?: { used_bytes: number; billing_period: string }[];
  };
  const shaped = (data as Row[] | null)?.map(({ contacts, storage_usage, ...rest }) => {
    const latestStorage = [...(storage_usage ?? [])].sort((a, b) => b.billing_period.localeCompare(a.billing_period))[0];
    return { ...rest, contact_count: contacts?.[0]?.count ?? 0, used_bytes: latestStorage?.used_bytes ?? 0 };
  });

  return c.json({ users: shaped, total: count, page, pageSize });
});

// GET /admin/users/:id — profile + storage + recent payments + contacts +
// legacy fee status + affiliate referral count (if this user is an affiliate)
users.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();

  const [
    { data: user, error: userErr },
    { data: storage },
    { data: payments },
    { data: contacts },
    { data: legacyFee },
    { data: affiliate },
    { data: twoFa },
  ] = await Promise.all([
    db.from("users").select("*").eq("id", id).maybeSingle(),
    db.from("storage_usage").select("*").eq("user_id", id).order("billing_period", { ascending: false }).limit(1),
    db.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("contacts").select("*").eq("owner_user_id", id),
    db.from("legacy_continuation_fees").select("status").eq("user_id", id).eq("status", "paid").maybeSingle(),
    db.from("affiliates").select("id").eq("user_id", id).maybeSingle(),
    db.from("account_2fa_settings").select("enabled, method").eq("user_id", id).maybeSingle(),
  ]);

  if (userErr) return c.json({ error: userErr.message }, 500);
  if (!user) return c.json({ error: "User not found" }, 404);

  let referralCount = 0;
  if (affiliate) {
    const { count } = await db.from("affiliate_referrals").select("id", { count: "exact", head: true }).eq("affiliate_id", affiliate.id);
    referralCount = count ?? 0;
  }

  return c.json({
    user, storage: storage?.[0] ?? null, payments, contacts,
    legacyFeePaid: !!legacyFee, referralCount,
    twoFa: twoFa ?? { enabled: false, method: null },
  });
});

// POST /admin/users/:id/reset-mfa — disables 2FA so the user re-enrolls on next login
users.post("/:id/reset-mfa", async (c) => {
  const id = c.req.param("id");
  const { error } = await adminClient()
    .from("account_2fa_settings")
    .upsert({ user_id: id, enabled: false, method: null, totp_secret: null, backup_codes: null, updated_at: new Date().toISOString() });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// PATCH /admin/users/:id — admin edit (plan, plan_status, is_admin)
users.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["plan", "plan_status", "is_admin", "email_verified"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("users").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "User not found" }, 404);
  return c.json({ user: data });
});

export default users;
