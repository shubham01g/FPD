import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import { isLivemode } from "../lib/stripe.ts";
import { EMAIL_CONFIGURED, linkOrigin, noticeEmail, sendEmail } from "../lib/email.ts";

const partnerships = new Hono();

// GET /admin/partnerships?status=
partnerships.get("/", async (c) => {
  const status = c.req.query("status");
  let q = adminClient()
    .from("partners")
    .select("*")
    .order("total_earned", { ascending: false });

  if (status) q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return c.json({ error: error.message }, 500);
  return c.json({ partners: data });
});

// POST /admin/partnerships — invite a prospective referral partner: creates
// an 'invited' partner record and emails the contact their onboarding link
// (/partner?ref=<code>) with the admin's note. If email isn't configured or
// fails, the record still stands and the response says emailed:false so the
// admin copies the link instead.
partnerships.post("/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { organizationName, organizationType, contactEmail, note } = body;

  if (!organizationName?.trim() || !contactEmail?.trim()) {
    return c.json({ error: "Organization name and contact email are required" }, 400);
  }

  const db = adminClient();
  const slug = organizationName.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "PARTNER";
  const partnerCode = `${slug}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { data, error } = await db
    .from("partners")
    .insert({
      organization_name: organizationName,
      organization_type: organizationType || "other",
      contact_name: organizationName,
      contact_email: contactEmail,
      partner_code: partnerCode,
      status: "invited",
      invite_note: note || null,
    })
    .select()
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  let emailed = false;
  if (EMAIL_CONFIGURED && data) {
    const link = `${linkOrigin(c.req.header("origin"))}/partner?ref=${encodeURIComponent(partnerCode)}`;
    const paragraphs = [
      `You're invited to join the Final Pass Down Partner Program on behalf of ${String(organizationName).trim()}.`,
      ...(note?.trim() ? [String(note).trim().slice(0, 2000)] : []),
      "Open the link below to see how the program works, sign in (or create a free sign-in), and pay the one-time setup fee. Your partner dashboard and referral link go live as soon as it's paid.",
    ];
    try {
      await sendEmail({
        to: String(contactEmail).trim(),
        ...noticeEmail({
          name: "", heading: "Your Partner Program invitation", paragraphs,
          button: { href: link, label: "Open my invitation" }, category: "partner_invite",
          replyTo: "partnerships@finalpassdown.com",
        }),
      });
      emailed = true;
    } catch (err) {
      console.error("partner invite email failed:", err);
    }
  }
  return c.json({ partner: data, emailed }, 201);
});

function monthKey(iso: string): string {
  return iso.slice(0, 7); // "YYYY-MM"
}

// GET /admin/partnerships/mrr-trend — last 6 months of succeeded subscription
// revenue from users who were referred through ANY partner (partner_accounts),
// for the Partnership MRR Growth chart. Real, derived from `payments` — there
// is no separate revenue-history table, but this doesn't need one.
partnerships.get("/mrr-trend", async (c) => {
  const db = adminClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const since = sixMonthsAgo.toISOString();

  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(monthKey(d.toISOString()));
  }
  const byMonth: Record<string, number> = {};
  for (const m of months) byMonth[m] = 0;

  const { data: accounts, error: accountsErr } = await db.from("partner_accounts").select("user_id");
  if (accountsErr) return c.json({ error: accountsErr.message }, 500);
  const referredUserIds = [...new Set((accounts ?? []).map((a) => a.user_id as string))];

  if (referredUserIds.length > 0) {
    const { data: payments, error: paymentsErr } = await db
      .from("payments")
      .select("amount_usd, type, status, created_at, user_id")
      .eq("status", "succeeded")
      .eq("livemode", isLivemode())
      .in("type", ["subscription", "upgrade"])
      .in("user_id", referredUserIds)
      .gte("created_at", since);

    if (paymentsErr) return c.json({ error: paymentsErr.message }, 500);
    for (const p of payments ?? []) {
      const m = monthKey(p.created_at);
      if (m in byMonth) byMonth[m] += Number(p.amount_usd);
    }
  }

  return c.json({ trend: months.map((m) => ({ month: m, mrr: Math.round(byMonth[m] * 100) / 100 })) });
});

// GET /admin/partnerships/:id/accounts
partnerships.get("/:id/accounts", async (c) => {
  const id = c.req.param("id");
  const { data, error } = await adminClient()
    .from("partner_accounts")
    .select("*, users(email, full_name)")
    .eq("partner_id", id)
    .order("referred_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ accounts: data });
});

// PATCH /admin/partnerships/:id — status/tier override
partnerships.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const allowed = ["status", "tier", "commission_rate"] as const;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) patch[key] = body[key];

  if (Object.keys(patch).length === 0) {
    return c.json({ error: "No updatable fields provided" }, 400);
  }

  const { data, error } = await adminClient().from("partners").update(patch).eq("id", id).select().maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!data) return c.json({ error: "Partner not found" }, 404);
  return c.json({ partner: data });
});

export default partnerships;
