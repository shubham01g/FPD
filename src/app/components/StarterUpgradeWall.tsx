import React, { useState } from "react";
import { Clock, LogOut, TrendingUp } from "lucide-react";
import { useDemo, type UserProfile } from "../context/DemoContext";
import { publicApi } from "../services/publicApi";
import { useAdminFetch } from "../hooks/useAdminFetch";
import { usePlatform } from "../services/platform";

const TEXT   = "#EFF2F9";
const MUTED  = "#A3ADC9";
const ACCENT = "#5B6EE1";
const WARN   = "#D9A55E";

interface DBPlan { id: string; name: string; price_monthly: number; storage_gb: number; overage_rate: number; }

/* Same numbers as subscription_plans, kept as a fallback so the wall can
   still offer a way out if /public/plans isn't reachable. */
const FALLBACK_PLANS = [
  { id: "foundation",     name: "Foundation",     storage: 50,   price: 9.99 },
  { id: "family_archive", name: "Legacy Archive", storage: 250,  price: 24.99 },
  { id: "legacy_pro",     name: "Legacy Pro",     storage: 500,  price: 49.99 },
  { id: "legacy_vault",   name: "Legacy Vault",   storage: 1024, price: 129.99 },
];

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
          Starter plan: <strong>{daysLeft} day{daysLeft === 1 ? "" : "s"} left</strong>. Starter is available for {starterTrialDays} days, then a bigger plan is required.
        </span>
      </div>
      <button onClick={onUpgrade} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
        style={{ background: "rgba(217,165,94,0.16)", color: WARN, fontSize: 14, fontWeight: 600, border: "1px solid rgba(217,165,94,0.3)" }}>
        <TrendingUp size={13}/> Upgrade
      </button>
    </div>
  );
}

/** Replaces the whole portal once the 14 Starter days are up: the only ways
 *  forward are choosing a bigger plan or signing out. */
export function StarterUpgradeWall({ onSignOut }: { onSignOut: () => void }) {
  const { user, changePlan } = useDemo();
  const { starterTrialDays } = usePlatform();
  const [choosing, setChoosing] = useState<string | null>(null);

  const { data } = useAdminFetch(() => publicApi.get<{ plans: DBPlan[] }>("/plans"), []);
  const plans = (data?.plans?.length
    ? data.plans.map(p => ({ id: p.id, name: p.name, storage: p.storage_gb, price: Number(p.price_monthly) }))
    : FALLBACK_PLANS
  ).filter(p => p.id !== "starter");

  const choose = async (id: string, name: string) => {
    setChoosing(id);
    await changePlan(id as UserProfile["plan"], name);
    setChoosing(null);
  };

  return (
    <div className="size-full overflow-y-auto" style={{ background: "#070A12", fontFamily: "var(--font-body)" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div className="flex items-center justify-center gap-2" style={{ color: WARN, fontSize: 14, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 12 }}>
            <Clock size={14}/> STARTER PLAN ENDED
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 34, color: TEXT, marginBottom: 10 }}>
            Your {starterTrialDays} days on Starter are up
          </h1>
          <p style={{ color: MUTED, fontSize: 17, lineHeight: 1.6, maxWidth: 620, margin: "0 auto" }}>
            {user.name ? `${user.name.split(" ")[0]}, everything` : "Everything"} you stored is safe. Choose a plan to keep using your vault.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map(plan => (
            <div key={plan.id} className="flex flex-col" style={{ padding: 22, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)", background: "#0F1624" }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 21.5, color: TEXT, marginBottom: 6 }}>{plan.name}</div>
              <div className="flex items-baseline gap-1" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 27.5, color: TEXT, fontWeight: 700 }}>${plan.price}</span>
                <span style={{ color: MUTED, fontSize: 15 }}>/mo</span>
              </div>
              <div style={{ color: MUTED, fontSize: 15.5, marginBottom: 18, flex: 1 }}>
                {plan.storage >= 1024 ? `${plan.storage / 1024} TB` : `${plan.storage} GB`} storage
              </div>
              <button onClick={() => void choose(plan.id, plan.name)} disabled={choosing !== null}
                className="disabled:opacity-50"
                style={{ width: "100%", padding: 11, borderRadius: 16, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer", color: "#fff", background: `linear-gradient(180deg,#7E6BD8,${ACCENT})` }}>
                {choosing === plan.id ? "Switching…" : `Choose ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 28 }}>
          <button onClick={onSignOut} className="inline-flex items-center gap-2" style={{ color: MUTED, fontSize: 15 }}>
            <LogOut size={14}/> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
