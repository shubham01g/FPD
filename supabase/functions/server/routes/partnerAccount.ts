// GET /account/partner — the signed-in partner's own program data (053).
//
// Replaces the Partner dashboard's DEMO_STATS / DEMO_REFERRALS /
// DEMO_PAYOUTS ($67,234, "Carter & Associates Law"...). Referred accounts are
// counted from partner_accounts (filled at signup by handle_new_user when a
// ?ref=<partner code> link was used); names are shown as initials only,
// since partners are not entitled to their referrals' personal details.
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";

const partnerAccount = new Hono();

const initials = (name: string | null | undefined) =>
  (name ?? "").split(/\s+/).filter(Boolean).map((p) => p[0]!.toUpperCase() + ".").join(" ") || "Member";

partnerAccount.get("/", async (c) => {
  const user = c.get("user" as never) as AuthedUser;
  const db = adminClient();
  const { data: partner, error } = await db.from("partners")
    .select("id, organization_name, organization_type, contact_name, contact_email, partner_code, tier, commission_rate, total_accounts, monthly_recurring, total_earned, status, joined_at")
    .eq("user_id", user.id).order("joined_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return c.json({ error: error.message }, 500);
  if (!partner) return c.json({ partner: null });

  const { data: accounts } = await db.from("partner_accounts")
    .select("plan, commission, referred_at, users:user_id(full_name, plan, plan_status)")
    .eq("partner_id", partner.id).order("referred_at", { ascending: false }).limit(500);
  const { data: payouts } = await db.from("payouts")
    .select("amount, status, payout_type, processed_at, created_at")
    .eq("recipient_user_id", user.id).order("created_at", { ascending: false }).limit(50);

  const referrals = (accounts ?? []).map((a) => {
    const u = a.users as { full_name?: string; plan?: string; plan_status?: string } | null;
    return { name: initials(u?.full_name), plan: u?.plan ?? a.plan, status: u?.plan_status ?? "active", referredAt: a.referred_at, commission: Number(a.commission ?? 0) };
  });
  return c.json({
    partner,
    referrals,
    payouts: payouts ?? [],
    stats: {
      totalAccounts: referrals.length,
      activePaid: referrals.filter((r) => r.plan !== "starter" && r.status === "active").length,
      totalEarned: Number(partner.total_earned ?? 0),
    },
  });
});

export default partnerAccount;
