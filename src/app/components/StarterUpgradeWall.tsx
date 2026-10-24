import React, { useState } from "react";
import { AlertTriangle, Clock, CreditCard, LogOut, RotateCcw, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";
import { usePlatform } from "../services/platform";
import { billing, type Interval } from "../services/billing";
import { annualSavingPct, formatPrice, formatStorage, usePlans } from "../utils/planCatalog";
import { CheckoutConsentModal, type Purchase } from "./billing/CheckoutConsentModal";

const TEXT   = "#EFF2F9";
const MUTED  = "#A3ADC9";
const ACCENT = "#5B6EE1";
const WARN   = "#D9A55E";
const NEG    = "#D06B6B";
const POS    = "#5FBE91";

/** Thin strip shown above every page while an account is still inside its
 *  14 Starter days. */
export function StarterCountdownBanner({ daysLeft, onUpgrade }: { daysLeft: number; onUpgrade: () => void }) {
  const { starterTrialDays } = usePlatform();
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-2.5"
      style={{ background: "rgba(217,165,94,0.1)", borderBottom: "1px solid rgba(217,165,94,0.25)" }}>
      <div className="flex items-center gap-2" style={{ color: WARN, fontSize: 15 }}>
        <Clock size={14}/>
        <span>
          Starter plan: <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"} left</strong>. Starter is free for {starterTrialDays} days, then a paid plan is required.
        </span>
      </div>
      <button onClick={onUpgrade} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(217,165,94,0.16)", color: WARN, fontSize: 14, fontWeight: 600, border: "1px solid rgba(217,165,94,0.3)" }}>
        <TrendingUp size={13}/> Choose a plan
      </button>
    </div>
  );
}

/** Strip shown while a renewal payment is failing and Stripe is retrying. */
export function PastDueBanner() {
  const [busy, setBusy] = useState(false);
  const openPortal = async () => {
    setBusy(true);
    try { window.location.assign((await billing.portal()).url); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not open billing"); setBusy(false); }
  };
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-2.5"
      style={{ background: "rgba(208,107,107,0.1)", borderBottom: "1px solid rgba(208,107,107,0.3)" }}>
      <div className="flex items-center gap-2" style={{ color: "#F08A8A", fontSize: 15 }}>
        <AlertTriangle size={14}/>
        <span>Your last payment didn't go through. Please update your card to keep your plan.</span>
      </div>
      <button onClick={() => void openPortal()} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl disabled:opacity-60"
        style={{ background: "rgba(208,107,107,0.16)", color: "#F08A8A", fontSize: 14, fontWeight: 600, border: "1px solid rgba(208,107,107,0.35)" }}>
        <CreditCard size={13}/> {busy ? "Opening…" : "Update card"}
      </button>
    </div>
  );
}

/** Replaces the whole portal when the account has no plan to use: the 14
 *  Starter days are up ("starter"), or a paid plan ended — cancelled, or the
 *  card kept failing ("cancelled"). Everything stored is kept either way. */
export function StarterUpgradeWall({ onSignOut, reason = "starter" }: { onSignOut: () => void; reason?: "starter" | "cancelled" }) {
  const { user } = useDemo();
  const { starterTrialDays } = usePlatform();
  const [interval, setBillingInterval] = useState<Interval>("month");
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const plans = usePlans().filter(p => p.billable);
  const first = user.name ? `${user.name.split(" ")[0]}, everything` : "Everything";
  const bestSaving = Math.max(0, ...plans.map(annualSavingPct));

  return (
    <div className="size-full overflow-y-auto" style={{ background: "#070A12", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="flex items-center justify-center gap-2" style={{ color: reason === "starter" ? WARN : NEG, fontSize: 14, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 12 }}>
            {reason === "starter" ? <><Clock size={14}/> STARTER PLAN ENDED</> : <><RotateCcw size={14}/> PLAN ENDED</>}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, color: TEXT, marginBottom: 10 }}>
            {reason === "starter" ? `Your ${starterTrialDays} free days on Starter are up` : "Reactivate your vault"}
          </h1>
          <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 620, margin: "0 auto" }}>
            {first} you stored is safe. Choose a plan to keep using your vault.
          </p>
        </div>

        <div className="flex justify-center" style={{ marginBottom: 24 }}>
          <div className="inline-flex" role="group" aria-label="Billing period"
            style={{ padding: 4, borderRadius: 99, background: "#0F1624", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["month", "year"] as const).map(iv => (
              <button key={iv} onClick={() => setBillingInterval(iv)} aria-pressed={interval === iv}
                style={{ padding: "8px 18px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 15, fontWeight: 600,
                  background: interval === iv ? ACCENT : "transparent", color: interval === iv ? "#fff" : MUTED }}>
                {iv === "month" ? "Monthly" : "Yearly"}
                {iv === "year" && bestSaving > 0 && <span style={{ marginLeft: 6, color: interval === iv ? "#fff" : POS, fontSize: 13 }}>save {bestSaving}%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => {
            const price = interval === "year" ? plan.priceAnnual : plan.priceMonthly;
            return (
              <div key={plan.id} className="flex flex-col" style={{ padding: 22, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "#0F1624" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 21.5, color: TEXT, marginBottom: 6 }}>{plan.name}</div>
                <div className="flex items-baseline gap-1" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 27.5, color: TEXT, fontWeight: 700 }}>{formatPrice(price)}</span>
                  <span style={{ color: MUTED, fontSize: 15 }}>/{interval === "year" ? "yr" : "mo"}</span>
                </div>
                <div style={{ color: MUTED, fontSize: 14, marginBottom: 10, minHeight: 20 }}>
                  {interval === "year" ? `${formatPrice(+(plan.priceAnnual / 12).toFixed(2))}/mo billed yearly` : ""}
                </div>
                <div style={{ color: MUTED, fontSize: 15.5, marginBottom: 18, flex: 1 }}>{formatStorage(plan.storageGb)} storage</div>
                <button onClick={() => setPurchase({ kind: "plan", planId: plan.id, planName: plan.name, interval })}
                  style={{ width: "100%", padding: 11, borderRadius: 16, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", color: "#fff", background: `linear-gradient(180deg,#7E6BD8,${ACCENT})` }}>
                  Choose {plan.name}
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button onClick={onSignOut} className="inline-flex items-center gap-2" style={{ color: MUTED, fontSize: 15 }}>
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </div>
      {purchase && <CheckoutConsentModal purchase={purchase} page="dashboard" onClose={() => setPurchase(null)}/>}
    </div>
  );
}
