import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { deleteUserCompletely } from "../lib/deleteUser.ts";
import type { AdminUser } from "../middleware/adminAuth.ts";

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
      "subscription_waived, waive_reason, white_glove, admin_notes, onboarded_by, deceased_at, " +
      // contacts references users twice (owner_user_id and id_verified_by),
      // so the embed must name the owner FK or PostgREST refuses to guess.
      "contacts!owner_user_id(count), storage_usage(used_bytes, billing_period)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  // The search text goes inside a PostgREST or=() filter, where , ( ) and "
  // are syntax and % _ \ are LIKE wildcards. Keep only characters a name or
  // email uses, so the text can't add filters of its own.
  const term = (search ?? "").replace(/[^\p{L}\p{N}@.+\-' ]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  if (term) q = q.or(`email.ilike.*${term}*,full_name.ilike.*${term}*`);
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

  // The signup trigger creates the public.users row (on Starter) from auth
  // metadata; fill in the fields it doesn't know about. A paid plan is only
  // given here as a waived (comped) plan, recorded as a comp_ subscription;
  // otherwise the account starts on Starter and buys a plan itself.
  const { error: profileError } = await db
    .from("users")
    .update({
      phone: phone || null,
      white_glove: !!whiteGlove,
      admin_notes: notes || null,
      onboarded_by: onboardedBy || null,
    })
    .eq("id", created.user.id);
  if (profileError) return c.json({ error: profileError.message }, 500);

  // "White Glove" at onboarding enrols the account for real, so it shows up in
  // White Glove admin (a users.white_glove flag alone never did).
  if (whiteGlove) {
    const { error: wgError } = await db.from("wg_clients").insert({
      user_id: created.user.id, reason: "Enrolled at onboarding", notes: notes || null,
    });
    if (wgError) return c.json({ error: `Account created, but White Glove enrolment failed: ${wgError.message}` }, 500);
  }

  if (subscriptionWaived && plan && plan !== "starter") {
    const { error: compError } = await db.rpc("provision_subscription", { p: {
      id: `comp_${created.user.id}`, user_id: created.user.id, product_line: "plan", plan_id: plan, status: "active",
      comp_reason: waiveReason || "Waived at onboarding", comp_granted_by: onboardedBy || null,
    } });
    if (compError) return c.json({ error: compError.message }, 500);
  }

  const { data: profile } = await db.from("users").select().eq("id", created.user.id).maybeSingle();
  return c.json({ user: profile }, 201);
});

// GET /admin/users/:id — profile + storage + recent payments + contacts +
// legacy fee status + affiliate referral count (if this user is an affiliate)
// + the plan subscription that currently gives access (paid or comped)
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
    { data: planSubs },
  ] = await Promise.all([
    db.from("users").select("*").eq("id", id).maybeSingle(),
    db.from("storage_usage").select("*").eq("user_id", id).order("billing_period", { ascending: false }).limit(1),
    db.from("payments").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
    db.from("contacts").select("*").eq("owner_user_id", id),
    db.from("legacy_continuation_fees").select("status").eq("user_id", id).eq("status", "paid").maybeSingle(),
    db.from("affiliates").select("id").eq("user_id", id).maybeSingle(),
    db.from("account_2fa_settings").select("enabled, method").eq("user_id", id).maybeSingle(),
    db.from("subscriptions").select("id, plan_id, status, interval, current_period_end, cancel_at_period_end")
      .eq("user_id", id).eq("product_line", "plan").in("status", ["active", "trialing", "past_due"])
      .order("updated_at", { ascending: false }).limit(1),
  ]);

  if (userErr) return c.json({ error: userErr.message }, 500);
  if (!user) return c.json({ error: "User not found" }, 404);

  let referralCount = 0;
  if (affiliate) {
    const { count } = await db.from("affiliate_referrals").select("id", { count: "exact", head: true }).eq("affiliate_id", affiliate.id);
    referralCount = count ?? 0;
  }
  // Last sign-in lives on the auth user, not in public.users.
  const { data: authUser } = await db.auth.admin.getUserById(id);

  return c.json({
    user, storage: storage?.[0] ?? null, payments, contacts,
    legacyFeePaid: !!legacyFee, referralCount,
    lastSignInAt: authUser?.user?.last_sign_in_at ?? null,
    twoFa: twoFa ?? { enabled: false, method: null },
    subscription: planSubs?.[0] ?? null,
  });
});

// POST /admin/users/:id/reset-mfa — disables 2FA so the user re-enrolls on next login.
//
// The enrolled Supabase factors have to go first. account_2fa_settings is only
// a mirror; the authenticator and SMS factors live in auth.mfa_factors, and
// while one of those survives the account still requires aal2 at sign-in — so
// clearing the mirror alone would leave the user locked out with a device they
// have already told us they lost. Email OTP has no factor, so its gate rows
// are what get cleared instead.
users.post("/:id/reset-mfa", async (c) => {
  const id = c.req.param("id");
  const db = adminClient();

  const { data: factorData, error: factorError } = await db.auth.admin.mfa.listFactors({ userId: id });
  if (factorError) return c.json({ error: factorError.message }, 500);

  for (const factor of factorData?.factors ?? []) {
    const { error } = await db.auth.admin.mfa.deleteFactor({ id: factor.id, userId: id });
    if (error) return c.json({ error: `Could not remove the enrolled factor: ${error.message}` }, 500);
  }

  await db.from("two_factor_sessions").delete().eq("user_id", id);

  const { error } = await db
    .from("account_2fa_settings")
    .upsert({
      user_id: id, enabled: false, method: null, totp_secret: null,
      phone: null, phone_verified: false, email_verified: false,
      backup_codes: null, enabled_at: null, updated_at: new Date().toISOString(),
    });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ ok: true });
});

// PATCH /admin/users/:id — admin edit: suspend/lift (plan_status),
// email_verified, and the account details from Edit Account (full_name,
// phone, admin_notes, email). An email change goes through Supabase Auth.
// is_admin is deliberately NOT editable here: an admin with only "users: edit"
// could otherwise promote an account they control to an unrestricted admin
// (no admin_accounts row = permissions null = everything). Admins are made
// only through Admin Team & Roles → Invite, which records their permissions.
users.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  if ("is_admin" in body) {
    return c.json({ error: "Admin access is granted from Admin Team & Roles, not here." }, 400);
  }
  const allowed = ["plan", "plan_status", "email_verified", "full_name", "phone", "admin_notes", "email"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }
  for (const key of ["full_name", "phone", "admin_notes", "email"] as const) {
    if (key in patch) {
      if (patch[key] !== null && typeof patch[key] !== "string") return c.json({ error: `${key} must be text` }, 400);
      patch[key] = typeof patch[key] === "string" ? (patch[key] as string).trim().slice(0, key === "admin_notes" ? 4000 : 200) || null : null;
    }
  }
  if ("full_name" in patch && !patch.full_name) return c.json({ error: "Name is required" }, 400);

  const db = adminClient();
  const { data: current, error: currentErr } = await db.from("users").select("plan, plan_status, email, is_admin").eq("id", id).maybeSingle();
  if (currentErr) return c.json({ error: currentErr.message }, 500);
  if (!current) return c.json({ error: "User not found" }, 404);

  // The sign-in email is owned by Supabase Auth; change it there first so the
  // login and the profile never disagree. The admin vouches for the address.
  if ("email" in patch) {
    const email = String(patch.email ?? "").toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.json({ error: "Enter a valid email address" }, 400);
    if (email === String(current.email).toLowerCase()) delete patch.email;
    else if (current.is_admin || id === (c.get("admin" as never) as AdminUser).id) {
      // Changing an admin's sign-in email from here would let a "users: edit"
      // admin take over another admin's login (or their own permissions row).
      return c.json({ error: "An admin's sign-in email can't be changed from the Users screen." }, 403);
    } else {
      const { error: authErr } = await db.auth.admin.updateUserById(id, { email, email_confirm: true });
      if (authErr) return c.json({ error: `Could not change the sign-in email: ${authErr.message}` }, 400);
      patch.email = email;
    }
  }

  // A plan is changed through billing (Users → Billing: change plan, comp,
  // refund & end), so what the account has always matches what it pays.
  if ("plan" in patch && patch.plan !== current.plan) {
    return c.json({ error: "Change the plan from the user's Billing tab (Change plan or Comp plan)." }, 409);
  }
  delete patch.plan;
  // Billing owns active / past_due / cancelled; an admin only suspends
  // ("paused") and lifts the suspension.
  if ("plan_status" in patch && !["paused", "active"].includes(String(patch.plan_status))) {
    return c.json({ error: "An admin can only suspend an account or lift the suspension." }, 400);
  }
  const lifting = patch.plan_status === "active" && current.plan_status === "paused";

  const { data, error } = await db.from("users").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "User not found" }, 404);
  if (lifting) {
    // Back to whatever billing says (active, past_due or cancelled).
    await db.rpc("apply_user_entitlements", { p_user: id });
    const { data: fresh } = await db.from("users").select().eq("id", id).maybeSingle();
    return c.json({ user: fresh ?? data });
  }
  return c.json({ user: data });
});

// DELETE /admin/users/:id?confirmEmail= — permanently removes the account:
// cancels any paid Stripe subscription, deletes the user's files, then the
// auth user and the profile (every owned table cascades from users).
// Payments/invoices stay in Stripe. Accounts with payout history are refused,
// since payouts must keep pointing at a recipient.
users.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const admin = c.get("admin") as AdminUser;
  const { data: target } = await adminClient().from("users").select("email").eq("id", id).maybeSingle();
  if (!target) return c.json({ error: "User not found" }, 404);
  if (String(c.req.query("confirmEmail") ?? "").trim().toLowerCase() !== String(target.email).toLowerCase()) {
    return c.json({ error: "Type the account's email address to confirm." }, 400);
  }
  const result = await deleteUserCompletely(id, admin.id);
  if (!result.ok) return c.json({ error: result.error }, result.status as 400);
  return c.json(result);
});

export default users;
