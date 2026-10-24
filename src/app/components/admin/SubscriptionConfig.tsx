import React, { useEffect, useState } from "react";
import { Settings, Save, AlertTriangle, CheckCircle, DollarSign, HardDrive, Bell, RefreshCw, Loader2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";
import { StripeBillingPanel } from "./StripeBillingPanel";

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  billable: boolean;
  storage: number;
  overageRate: number;
  maxContacts: number; // UI sentinel 999 = unlimited; DB stores -1
  color: string;
}

interface DBPlan {
  id: string;
  name: string;
  price_monthly: number;
  price_annual: number;
  storage_gb: number;
  overage_rate: number;
  max_contacts: number;
  billable?: boolean;
}

/* Add-on and one-time prices (billing_products). */
interface DBProduct { slug: string; name: string; kind: "one_time" | "recurring"; interval: "month" | "year" | null; amount_cents: number; active: boolean; }

interface ThresholdSetting { key: string; value: string; updated_at: string; }

const PLAN_COLORS: Record<string, string> = {
  starter: "#D99A6B", foundation: "#6FAE8B", family_archive: "#6E90C9", legacy_pro: "#6FAE8B", legacy_vault: "#ED8936",
};

function toPlanConfig(p: DBPlan): PlanConfig {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price_monthly),
    annualPrice: Number(p.price_annual),
    billable: p.billable ?? p.id !== "starter",
    storage: p.storage_gb,
    overageRate: Number(p.overage_rate),
    maxContacts: p.max_contacts === -1 ? 999 : p.max_contacts,
    color: PLAN_COLORS[p.id] ?? "#6E90C9",
  };
}

interface AlertThresholds {
  warning: number;
  recommended: number;
  critical: number;
  overage: number;
}

const annualDiscountPct = (p: PlanConfig) => p.price > 0 ? Math.round((1 - p.annualPrice / (p.price * 12)) * 100) : 0;

export function SubscriptionConfig() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  // What was loaded, so saving only touches plans that changed: each changed
  // price becomes a new Stripe price at the next catalog sync.
  const [original, setOriginal] = useState<Record<string, PlanConfig>>({});
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>({ warning: 80, recommended: 90, critical: 95, overage: 100 });
  /* Starter is the trial plan: how many days an account may stay on it
     (admin_settings "starter_trial_days", read by the app via /public/platform). */
  const [trialDays, setTrialDays] = useState(14);
  const [savedTrialDays, setSavedTrialDays] = useState(14);

  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<{ plans: DBPlan[]; thresholds: ThresholdSetting[]; products: DBProduct[] }>("/pricing"),
    [],
  );

  useEffect(() => {
    if (!data) return;
    const loaded = data.plans.map(toPlanConfig);
    setPlans(loaded);
    setOriginal(Object.fromEntries(loaded.map(p => [p.id, p])));
    setProducts(data.products ?? []);
    setOriginalProducts(Object.fromEntries((data.products ?? []).map(p => [p.slug, p.amount_cents])));
    const byKey = Object.fromEntries(data.thresholds.map(t => [t.key, t.value]));
    setThresholds({
      warning: byKey.storage_alert_80 ? Number(byKey.storage_alert_80) : 80,
      recommended: byKey.storage_alert_90 ? Number(byKey.storage_alert_90) : 90,
      critical: byKey.storage_alert_95 ? Number(byKey.storage_alert_95) : 95,
      overage: 100, // billing always begins at 100% — no configurable key backs this
    });
    const days = Number(byKey.starter_trial_days) > 0 ? Number(byKey.starter_trial_days) : 14;
    setTrialDays(days);
    setSavedTrialDays(days);
    setDirty(false);
  }, [data]);

  const updatePlan = (id: string, field: keyof PlanConfig, value: number | string) => {
    setPlans(plans.map((p) => p.id === id ? { ...p, [field]: value } : p));
    setDirty(true);
    setSaved(false);
  };

  const updateThreshold = (field: keyof AlertThresholds, value: number) => {
    setThresholds({ ...thresholds, [field]: value });
    setDirty(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = plans.filter(p => {
        const o = original[p.id];
        return !o || o.price !== p.price || o.annualPrice !== p.annualPrice || o.storage !== p.storage || o.overageRate !== p.overageRate || o.maxContacts !== p.maxContacts;
      });
      const priceChanged = changed.some(p => original[p.id]?.price !== p.price || original[p.id]?.annualPrice !== p.annualPrice)
        || products.some(p => originalProducts[p.slug] !== p.amount_cents);
      await Promise.all([
        ...changed.map((p) => adminApi.patch(`/pricing/plans/${p.id}`, {
          ...(p.billable ? { price_monthly: p.price, price_annual: Math.round(p.annualPrice * 100) / 100 } : {}),
          storage_gb: p.storage,
          overage_rate: p.overageRate,
          max_contacts: p.maxContacts === 999 ? -1 : p.maxContacts,
        })),
        ...products.filter(p => originalProducts[p.slug] !== p.amount_cents)
          .map(p => adminApi.patch(`/pricing/products/${p.slug}`, { amount_cents: p.amount_cents })),
        adminApi.patch("/pricing/settings/storage_alert_80", { value: String(thresholds.warning) }),
        adminApi.patch("/pricing/settings/storage_alert_90", { value: String(thresholds.recommended) }),
        adminApi.patch("/pricing/settings/storage_alert_95", { value: String(thresholds.critical) }),
        ...(trialDays !== savedTrialDays ? [adminApi.patch("/pricing/settings/starter_trial_days", { value: String(trialDays) })] : []),
      ]);
      setSavedTrialDays(trialDays);
      setSaved(true);
      setDirty(false);
      setOriginal(Object.fromEntries(plans.map(p => [p.id, p])));
      setOriginalProducts(Object.fromEntries(products.map(p => [p.slug, p.amount_cents])));
      toast.success(priceChanged
        ? "Saved. Run Sync catalog in the Stripe panel so checkout charges the new prices."
        : "Pricing configuration saved");
      refetch();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings size={16} color="var(--gold)" />
            <span style={{ color: "var(--gold)", fontSize: 15, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · CONFIG</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)" }}>Subscription Configuration</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginTop: 4 }}>
            Prices, storage and thresholds. A changed price reaches checkout after Sync catalog creates it in Stripe; current subscribers keep the price they bought.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <div className="flex items-center gap-2" style={{ color: "#F6AD55", fontSize: 16 }}>
              <AlertTriangle size={14} /> Unsaved changes
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl transition-all disabled:opacity-50"
            style={{
              background: saved ? "rgba(72,187,120,0.15)" : "linear-gradient(135deg, #5B6EE1, #5B6EE1)",
              color: saved ? "#D99A6B" : "#070D1A",
              border: saved ? "1px solid rgba(72,187,120,0.3)" : "none",
              fontWeight: 600, fontSize: 17.5,
            }}
          >
            {saved ? <CheckCircle size={15} /> : saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}

      <StripeBillingPanel onSynced={() => refetch()} />

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--muted-foreground)" }}>
          <Loader2 size={18} className="animate-spin" /> Loading plans…
        </div>
      ) : (
      <>
      {/* Plan pricing */}
      <div className="space-y-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)" }}>Subscription Plans</h2>
        {plans.map((plan) => (
          <div key={plan.id} className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: plan.id === "starter" ? "rgba(72,187,120,0.35)" : "var(--border)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl w-3 h-3 rounded-full" style={{ background: plan.color }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 21.5, color: "var(--foreground)" }}>{plan.name}</h3>
              {plan.id === "starter" && (
                <span className="px-2 py-0.5 rounded" style={{ background: "rgba(72,187,120,0.12)", color: "#5FBE91", border: "1px solid rgba(72,187,120,0.3)", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}>
                  TRIAL PLAN
                </span>
              )}
              <div className="ml-auto text-sm px-3 py-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                ID: {plan.id}
              </div>
            </div>
            {plan.id === "starter" && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border mb-6" style={{ background: "rgba(72,187,120,0.06)", borderColor: "rgba(72,187,120,0.25)" }}>
                <Clock size={14} color="#5FBE91" style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ color: "var(--muted-foreground)", fontSize: 16, lineHeight: 1.6 }}>
                  This is the <strong style={{ color: "#5FBE91" }}>free trial plan</strong>. New accounts get it for {trialDays} days with no card and are never billed for it.
                  After the trial ends the app asks the user to choose a paid plan. All vault data is kept.
                </span>
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Monthly price */}
              {plan.billable && <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>MONTHLY PRICE ($)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                  <DollarSign size={14} color="var(--gold)" />
                  <input
                    type="number"
                    step="0.01"
                    value={plan.price}
                    onChange={(e) => updatePlan(plan.id, "price", parseFloat(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>
                  {original[plan.id] && original[plan.id].price !== plan.price ? "Changed: needs Sync catalog" : "Billed monthly"}
                </div>
              </div>}

              {/* Annual price */}
              {plan.billable && <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>ANNUAL PRICE ($)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                  <DollarSign size={14} color="var(--gold)" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.annualPrice}
                    onChange={(e) => updatePlan(plan.id, "annualPrice", parseFloat(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>
                  {annualDiscountPct(plan)}% off twelve monthly payments
                </div>
              </div>}

              {/* Storage */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>STORAGE ALLOWANCE (GB)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                  <HardDrive size={14} color="var(--gold)" />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={plan.storage}
                    onChange={(e) => updatePlan(plan.id, "storage", parseInt(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>GB</span>
                </div>
              </div>

              {/* Overage rate */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>OVERAGE RATE ($/GB)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                  <DollarSign size={14} color="#FC8181" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.overageRate}
                    onChange={(e) => updatePlan(plan.id, "overageRate", parseFloat(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>/GB</span>
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Applied after storage limit is exceeded</div>
              </div>

              {/* Max contacts */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>MAX LEGACY CONTACTS</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={plan.maxContacts === 999 ? "Unlimited" : plan.maxContacts}
                    onChange={(e) => updatePlan(plan.id, "maxContacts", parseInt(e.target.value) || 999)}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                </div>
                {plan.maxContacts === 999 && <div style={{ color: "#D99A6B", fontSize: 14, marginTop: 4 }}>Unlimited contacts</div>}
              </div>

              {/* Trial period (Starter only) */}
              {plan.id === "starter" && (
                <div>
                  <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>TRIAL PERIOD (DAYS)</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                    <Clock size={14} color="#5FBE91" />
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="365"
                      value={trialDays}
                      onChange={(e) => { setTrialDays(Math.max(1, parseInt(e.target.value) || 1)); setDirty(true); setSaved(false); }}
                      style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                    />
                    <span style={{ color: "var(--muted-foreground)" }}>days</span>
                  </div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Account suspends automatically after this window</div>
                </div>
              )}

              {/* Preview */}
              <div className="flex items-center justify-center rounded-2xl border" style={{ borderColor: plan.color, background: `${plan.color}08`, minHeight: 84 }}>
                {plan.id === "starter" ? (
                  <div className="text-center">
                    <div style={{ color: plan.color, fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 700 }}>Free / {trialDays} days</div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Trial · {plan.storage} GB · no overage</div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div style={{ color: plan.color, fontFamily: "var(--font-display)", fontSize: 35.5, fontWeight: 700 }}>${plan.price}/mo</div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>{plan.storage} GB · ${plan.overageRate}/GB overage</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add-ons and one-time products */}
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)", marginBottom: 6 }}>Add-Ons &amp; One-Time Products</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: 16, marginBottom: 20 }}>
          Sold through Stripe Checkout. A changed price needs Sync catalog before checkout uses it.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.slug}>
              <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>
                {p.name.toUpperCase()}{p.interval ? ` (${p.interval === "year" ? "YEARLY" : "MONTHLY"})` : p.slug === "wg_session_block" ? " (PER 30 MIN)" : " (ONE-TIME)"}
              </label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                <DollarSign size={14} color="var(--gold)" />
                <input
                  type="number" step="0.01" min="0.5"
                  value={p.amount_cents / 100}
                  onChange={(e) => { const v = Math.round(parseFloat(e.target.value) * 100); setProducts(ps => ps.map(x => x.slug === p.slug ? { ...x, amount_cents: Number.isFinite(v) ? v : x.amount_cents } : x)); setDirty(true); setSaved(false); }}
                  style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                />
              </div>
              {originalProducts[p.slug] !== p.amount_cents && <div style={{ color: "#F6AD55", fontSize: 14, marginTop: 4 }}>Changed: needs Sync catalog</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Notification thresholds */}
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)", marginBottom: 6 }}>Storage Notification Thresholds</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: 16, marginBottom: 20 }}>
          Automatic email alerts are sent to users when their storage crosses these thresholds. All values are percentages of plan storage limit.
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { key: "warning", label: "Usage Warning", color: "#F6AD55", desc: "General usage warning email" },
            { key: "recommended", label: "Upgrade Recommended", color: "#ED8936", desc: "Upgrade recommended email" },
            { key: "critical", label: "Critical Alert", color: "#FC8181", desc: "Critical alert email sent" },
            { key: "overage", label: "Overage Begins", color: "#E53E3E", desc: "Fixed at 100% — not configurable" },
          ].map((t) => (
            <div key={t.key}>
              <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>{t.label.toUpperCase()}</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border mb-2" style={{ background: "rgba(255,255,255,0.08)", borderColor: `${t.color}40` }}>
                <Bell size={14} color={t.color} />
                <input
                  type="number"
                  min="1"
                  max="100"
                  disabled={t.key === "overage"}
                  value={(thresholds as any)[t.key]}
                  onChange={(e) => updateThreshold(t.key as keyof AlertThresholds, parseInt(e.target.value))}
                  style={{ background: "transparent", border: "none", outline: "none", color: t.color, fontSize: 25, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                />
                <span style={{ color: "var(--muted-foreground)" }}>%</span>
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 rounded-2xl disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #5B6EE1, #5B6EE1)", color: "#070D1A", fontWeight: 700, fontSize: 19 }}
        >
          <Save size={16} /> {saving ? "Saving…" : "Save All Configuration"}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
