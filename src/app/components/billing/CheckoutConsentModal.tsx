import React, { useEffect, useState } from "react";
import { CheckCircle, Lock, X } from "lucide-react";
import { toast } from "sonner";
import { billing, BillingError, formatUsd, notifyBillingChanged, type Consent, type Interval } from "../../services/billing";

/* One confirmation step for everything that charges a card.

   New purchases (a plan, the Disaster Recovery add-on, White Glove setup):
   the exact auto-renewal / card-on-file wording comes from the server, the
   button stays disabled until the box is ticked, and the server refuses a
   checkout whose wording doesn't match (it stores what was agreed). Then the
   browser goes to Stripe's hosted checkout.

   Plan changes for an existing subscriber: says what happens and when —
   upgrades now with a prorated charge, downgrades at the end of the period. */

export type Purchase =
  | { kind: "plan"; planId: string; planName: string; interval: Interval }
  | { kind: "change"; planId: string; planName: string; interval: Interval; direction: "up" | "down"; priceLabel: string; effectiveAt?: string | null }
  | { kind: "dr_addon"; interval: Interval }
  | { kind: "wg_setup" };

const TEXT = "#EFF2F9", SOFT = "#BCC5DA", MUTED = "#A3ADC9", ACCENT = "#5B6EE1", POS = "#5FBE91";

const CSS = `
.fpd-pay-backdrop{position:fixed;inset:0;z-index:1100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.82);backdrop-filter:blur(8px);font-family:var(--font-body);}
.fpd-pay{width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:#101728;border-radius:22px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 30px 80px -30px rgba(0,0,0,0.8);}
.fpd-pay-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:22px 24px 6px;}
.fpd-pay-title{font-family:var(--font-display);font-size:21px;color:${TEXT};font-weight:600;}
.fpd-pay-sub{color:${MUTED};font-size:14.5px;margin-top:3px;}
.fpd-pay-x{background:rgba(255,255,255,0.06);border:none;border-radius:10px;padding:7px;cursor:pointer;color:${MUTED};}
.fpd-pay-body{padding:16px 24px 24px;display:flex;flex-direction:column;gap:16px;}
.fpd-pay-amount{display:flex;align-items:baseline;justify-content:space-between;padding:14px 16px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.06);}
.fpd-pay-amount span{color:${SOFT};font-size:15px;}
.fpd-pay-amount strong{color:${TEXT};font-size:20px;font-family:var(--font-display);}
.fpd-pay-consent{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border-radius:14px;background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.22);cursor:pointer;}
.fpd-pay-consent input{margin-top:3px;width:18px;height:18px;flex-shrink:0;accent-color:${ACCENT};cursor:pointer;}
.fpd-pay-consent p{color:${SOFT};font-size:14.5px;line-height:1.55;margin:0;}
.fpd-pay-note{color:${MUTED};font-size:14.5px;line-height:1.55;}
.fpd-pay-btn{width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;font-weight:700;font-size:16px;font-family:var(--font-body);color:#fff;background:linear-gradient(180deg,#7E6BD8,${ACCENT});box-shadow:0 10px 24px -12px rgba(91,110,225,0.8);}
.fpd-pay-btn:disabled{opacity:.45;cursor:not-allowed;box-shadow:none;}
.fpd-pay-secure{display:flex;align-items:center;justify-content:center;gap:7px;color:${MUTED};font-size:13px;}
`;

function title(p: Purchase): { title: string; sub: string } {
  switch (p.kind) {
    case "plan": return { title: `${p.planName} plan`, sub: p.interval === "year" ? "Billed yearly" : "Billed monthly" };
    case "change": return { title: `Switch to ${p.planName}`, sub: p.interval === "year" ? "Billed yearly" : "Billed monthly" };
    case "dr_addon": return { title: "Disaster Recovery Protection", sub: p.interval === "year" ? "Yearly add-on" : "Monthly add-on" };
    case "wg_setup": return { title: "White Glove setup", sub: "One-time setup, card saved for sessions" };
  }
}

function longDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "the end of your current period";
}

export function CheckoutConsentModal({ purchase, page, onClose, onChanged }: {
  purchase: Purchase;
  /** The portal page Stripe returns to (defaults per product on the server). */
  page?: string;
  onClose: () => void;
  /** Called after an in-place plan change succeeds. */
  onChanged?: () => void;
}) {
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const head = title(purchase);
  const needsConsent = purchase.kind !== "change";

  const loadConsent = () => {
    if (!needsConsent) return;
    setConsent(null); setLoadError(null); setAgreed(false);
    const req = purchase.kind === "plan" ? billing.consentText("plan", { planId: purchase.planId, interval: purchase.interval })
      : purchase.kind === "dr_addon" ? billing.consentText("dr_addon", { interval: purchase.interval })
      : billing.consentText("wg_card_on_file");
    req.then(setConsent).catch(err => setLoadError(err instanceof Error ? err.message : "Could not load the terms"));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadConsent, []);

  const confirm = async () => {
    setBusy(true);
    try {
      if (purchase.kind === "change") {
        const result = await billing.changePlan(purchase.planId, purchase.interval);
        notifyBillingChanged();
        toast.success(result.applied === "period_end"
          ? `${purchase.planName} starts on ${longDate(result.effectiveAt)}. Nothing is charged today.`
          : result.applied === "pending_payment"
          ? "Your card needs attention before the upgrade can finish. Check Manage billing."
          : `You're now on ${purchase.planName}.`);
        onChanged?.();
        onClose();
        return;
      }
      const { url } = purchase.kind === "plan" ? await billing.checkoutPlan(purchase.planId, purchase.interval, consent, page)
        : purchase.kind === "dr_addon" ? await billing.checkoutAddon(purchase.interval, consent, page)
        : await billing.checkoutOneTime("wg_setup", consent, page);
      window.location.assign(url);
    } catch (err) {
      // The wording changed since it was shown: show the new wording.
      if (err instanceof BillingError && err.status === 400 && needsConsent) loadConsent();
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="fpd-pay-backdrop" role="dialog" aria-modal="true" aria-label={head.title}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="fpd-pay">
        <div className="fpd-pay-head">
          <div>
            <div className="fpd-pay-title">{head.title}</div>
            <div className="fpd-pay-sub">{head.sub}</div>
          </div>
          <button className="fpd-pay-x" onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>

        <div className="fpd-pay-body">
          {purchase.kind === "change" ? (<>
            <div className="fpd-pay-amount"><span>New price</span><strong>{purchase.priceLabel}</strong></div>
            <p className="fpd-pay-note">
              {purchase.direction === "up"
                ? "Your plan changes right away. You'll be charged today for the rest of this billing period (minus what's left of your current plan), then the new price on each renewal. Storage overage so far is settled at your current plan's rate."
                : `Your plan changes on ${longDate(purchase.effectiveAt)}, when your current period ends. Nothing is charged today, and you keep everything in your current plan until then.`}
            </p>
            <button className="fpd-pay-btn" disabled={busy} onClick={() => void confirm()}>
              {busy ? "Updating…" : purchase.direction === "up" ? `Upgrade to ${purchase.planName}` : `Switch at period end`}
            </button>
          </>) : (<>
            {loadError && <p className="fpd-pay-note" style={{ color: "#F08A8A" }}>{loadError}</p>}
            {!consent && !loadError && <p className="fpd-pay-note">Loading the terms…</p>}
            {consent && (<>
              <div className="fpd-pay-amount">
                <span>{purchase.kind === "wg_setup" ? "Due today" : "Due today, then each renewal"}</span>
                <strong>{formatUsd(consent.amountCents)}</strong>
              </div>
              <label className="fpd-pay-consent">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <p>{consent.text}</p>
              </label>
              <button className="fpd-pay-btn" disabled={!agreed || busy} onClick={() => void confirm()}>
                {busy ? "Opening secure checkout…" : "Continue to secure checkout"}
              </button>
              <div className="fpd-pay-secure"><Lock size={12}/> Card details are entered on Stripe's secure page, never stored by Final Pass Down.</div>
            </>)}
          </>)}
          {purchase.kind === "wg_setup" && consent && (
            <div className="fpd-pay-secure" style={{ color: POS }}><CheckCircle size={12}/> Sessions are billed after they happen, never in advance.</div>
          )}
        </div>
      </div>
    </div>
  );
}
