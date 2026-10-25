// The signed-in member's own affiliate enrolment. Mounted at /account/affiliate
// behind requireUser.
//
// Since migration 038 the browser can't write affiliate rows, and nothing else
// created them, so no one could join. Joining goes through here: a new
// affiliate starts 'inactive' (awaiting approval) and an admin activates it in
// Affiliate Admin. Only an active affiliate's link attributes signups
// (handle_new_user, migration 041).
import { Hono } from "npm:hono";
import { adminClient } from "../lib/supabaseAdmin.ts";
import type { AuthedUser } from "../middleware/userAuth.ts";
import { alertAdmin } from "../lib/billing/notify.ts";

type Env = { Variables: { user: AuthedUser } };
const affiliateJoin = new Hono<Env>();

// POST /join — creates this account's affiliate row, or returns the one it has.
affiliateJoin.post("/join", async (c) => {
  const user = c.get("user");
  const db = adminClient();
  const { data: existing } = await db.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
  if (existing) return c.json({ affiliate: existing });

  const { data: created, error } = await db.from("affiliates").insert({ user_id: user.id, status: "inactive" }).select("*").single();
  if (error) {
    // Two clicks at once: the unique user_id lets only one insert through.
    const { data: again } = await db.from("affiliates").select("*").eq("user_id", user.id).maybeSingle();
    if (again) return c.json({ affiliate: again });
    return c.json({ error: error.message }, 500);
  }
  await alertAdmin(`affiliate_join:${created.id}`, "New affiliate application", [
    `${user.email} asked to join the affiliate programme (code ${created.referral_code}).`,
    "Approve it in Admin → Affiliate Admin (the tick on their row).",
  ]);
  return c.json({ affiliate: created }, 201);
});

export default affiliateJoin;
