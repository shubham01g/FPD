import { useState } from "react";
import { AlertTriangle, CreditCard, LogOut, RotateCcw, Shield, Users } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "../context/DemoContext";
import { billing, type Interval } from "../services/billing";
import { annualSavingPct, formatPrice, formatStorage, usePlans } from "../utils/planCatalog";
import { CheckoutConsentModal, type Purchase } from "./billing/CheckoutConsentModal";

const TEXT   = "#EFF2F9";
const MUTED  = "#A3ADC9";
const ACCENT = "#5B6EE1";
const NEG    = "#D06B6B";
const POS    = "#5FBE91";

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

/** Replaces the whole portal when the account has no plan to use: it hasn't
 *  bought one yet ("choose"), or a paid plan ended — cancelled, or the card
 *  kept failing ("cancelled"). There is no free plan (migration 059), so the
 *  vault opens only once Stripe confirms a payment or an admin comps a plan.
 *  Everything stored is kept. Someone who is also a Legacy/Guardian Contact
 *  can still open "Shared with me", which never needs a plan. */
export function PlanWall({ onSignOut, reason = "choose", onOpenShared }: {
  onSignOut: () => void;
  reason?: "choose" | "cancelled";
  onOpenShared?: () => void;
}) {
  const { user } = useDemo();
  const [interval, setBillingInterval] = useState<Interval>("month");
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const plans = usePlans().filter(p => p.billable);
  const firstName = user.name ? user.name.split(" ")[0] : "";
  const bestSaving = Math.max(0, ...plans.map(annualSavingPct));
  const choosing = reason === "choose";

  return (
    <div className="size-full overflow-y-auto" style={{ background: "#070A12", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="flex items-center justify-center gap-2" style={{ color: choosing ? ACCENT : NEG, fontSize: 14, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 12 }}>
            {choosing ? <><Shield size={14}/> CHOOSE YOUR PLAN</> : <><RotateCcw size={14}/> PLAN ENDED</>}
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, color: TEXT, marginBottom: 10 }}>
            {choosing ? `${firstName ? `Welcome, ${firstName}. ` : ""}Choose a plan to open your vault` : "Reactivate your vault"}
          </h1>
          <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 620, margin: "0 auto" }}>
            {choosing
              ? "Every plan includes the full vault. Pay by card; you can change or cancel any time in Usage & Billing."
              : `${firstName ? `${firstName}, everything` : "Everything"} you stored is safe. Choose a plan to keep using your vault.`}
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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

        <div className="flex items-center justify-center gap-6 flex-wrap" style={{ marginTop: 28 }}>
          {onOpenShared && (
            <button onClick={onOpenShared} className="inline-flex items-center gap-2" style={{ color: TEXT, fontSize: 15 }}>
              <Users size={14}/> Open what's shared with me
            </button>
          )}
          <button onClick={onSignOut} className="inline-flex items-center gap-2" style={{ color: MUTED, fontSize: 15 }}>
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </div>
      {purchase && <CheckoutConsentModal purchase={purchase} page="dashboard" onClose={() => setPurchase(null)}/>}
    </div>
  );
}
