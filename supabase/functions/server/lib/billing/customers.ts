// One Stripe customer per account per mode (billing_customers). Test and live
// customers never mix: switching keys at cutover simply starts new rows.
import { adminClient } from "../supabaseAdmin.ts";
import { isLivemode, stripe, stripeMode } from "../stripe.ts";

/** The account's customer id in the current mode, or null if it has none. */
export async function findCustomer(userId: string): Promise<string | null> {
  const { data } = await adminClient()
    .from("billing_customers")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .eq("livemode", isLivemode())
    .maybeSingle();
  return data?.stripe_customer_id ?? null;
}

/** The account owner's user id for a customer in the current mode. */
export async function userForCustomer(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { data } = await adminClient()
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function getOrCreateCustomer(userId: string, email: string, name?: string | null): Promise<string> {
  const existing = await findCustomer(userId);
  if (existing) return existing;

  const mode = stripeMode();
  const customer = await stripe<{ id: string }>("POST", "/customers", {
    email,
    name: name || undefined,
    metadata: { userId },
  }, { idempotencyKey: `customer:${mode}:${userId}` });

  const db = adminClient();
  const { error } = await db.from("billing_customers").insert({
    user_id: userId, livemode: isLivemode(), stripe_customer_id: customer.id,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  // Kept for screens that still read it; billing_customers is authoritative.
  await db.from("users").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return (await findCustomer(userId)) ?? customer.id;
}
