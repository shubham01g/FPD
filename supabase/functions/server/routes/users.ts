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
      "subscription_waived, waive_reason, white_glove, admin_notes, onboarded_by, " +
      // contacts references users twice (owner_user_id and id_verified_by),
      // so the embed must name the owner FK or PostgREST refuses to guess.
      "contacts!owner_user_id(count), storage_usage(used_bytes, billing_period)",
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

// POST /admin/users — manually onboard a real account (e.g. phone signup,
// white-glove intake). Creates a real Supabase Auth user, not just a row —
// the previous frontend flow faked this with a setTimeout and created nothing.
users.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { name, email, phone, plan, subscriptionWaived, waiveReason, whiteGlove, notes, sendWelcome, onboardedBy } = body;

  if (!name?.trim() || !email?.trim()) {
    return c.json({ error: "Name and email are required" }, 400);
  }

  const db = adminClient();

  const { data: existing } = await db.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) return c.json({ error: "A user with this email already exists" }, 409);

  // sendWelcome: email them a real magic-link invite. Otherwise create the
  // account with a random password only an admin-initiated reset can recover
  // (there's no other flow yet to hand a caller-created password to the user).
  const { data: created, error: authError } = sendWelcome
    ? await db.auth.admin.inviteUserByEmail(email, { data: { full_name: name } })
    : await db.auth.admin.createUser({
        email, email_confirm: true, password: crypto.randomUUID(),
        user_metadata: { full_name: name },
      });

  if (authError || !created?.user) {
    return c.json({ error: authError?.message ?? "Failed to create the account" }, 500);
  }

  // The signup trigger creates the public.users row from auth metadata;
  // fill in the fields it doesn't know about.
  const { data: profile, error: profileError } = await db
    .from("users")
    .update({
      phone: phone || null,
      plan: plan || "foundation",
      subscription_waived: !!subscriptionWaived,
      waive_reason: subscriptionWaived ? (waiveReason || null) : null,
      white_glove: !!whiteGlove,
      admin_notes: notes || null,
      onboarded_by: onboardedBy || null,
    })
    .eq("id", created.user.id)
    .select()
    .maybeSingle();

  if (profileError) return c.json({ error: profileError.message }, 500);
  return c.json({ user: profile }, 201);
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
