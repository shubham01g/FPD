import React, { useEffect, useState } from "react";
import { Settings, Save, AlertTriangle, CheckCircle, DollarSign, HardDrive, Bell, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  annualDiscount: number;
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
}

interface ThresholdSetting { key: string; value: string; updated_at: string; }

const PLAN_COLORS: Record<string, string> = {
  starter: "#D99A6B", foundation: "#6FAE8B", family_archive: "#6E90C9", legacy_pro: "#6FAE8B", legacy_vault: "#ED8936",
};

function toPlanConfig(p: DBPlan): PlanConfig {
  const annualDiscount = p.price_monthly > 0 ? Math.round((1 - Number(p.price_annual) / (Number(p.price_monthly) * 12)) * 100) : 0;
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price_monthly),
    annualDiscount,
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

export function SubscriptionConfig() {
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>({ warning: 80, recommended: 90, critical: 95, overage: 100 });

  const { data, loading, error } = useAdminFetch(
    () => adminApi.get<{ plans: DBPlan[]; thresholds: ThresholdSetting[] }>("/pricing"),
    [],
  );

  useEffect(() => {
    if (!data) return;
    setPlans(data.plans.map(toPlanConfig));
    const byKey = Object.fromEntries(data.thresholds.map(t => [t.key, t.value]));
    setThresholds({
      warning: byKey.storage_alert_80 ? Number(byKey.storage_alert_80) : 80,
      recommended: byKey.storage_alert_90 ? Number(byKey.storage_alert_90) : 90,
      critical: byKey.storage_alert_95 ? Number(byKey.storage_alert_95) : 95,
      overage: 100, // billing always begins at 100% — no configurable key backs this
    });
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
      await Promise.all([
        ...plans.map((p) => adminApi.patch(`/pricing/plans/${p.id}`, {
          price_monthly: p.price,
          price_annual: Math.round(p.price * 12 * (1 - p.annualDiscount / 100) * 100) / 100,
          storage_gb: p.storage,
          overage_rate: p.overageRate,
          max_contacts: p.maxContacts === 999 ? -1 : p.maxContacts,
        })),
        adminApi.patch("/pricing/settings/storage_alert_80", { value: String(thresholds.warning) }),
        adminApi.patch("/pricing/settings/storage_alert_90", { value: String(thresholds.recommended) }),
        adminApi.patch("/pricing/settings/storage_alert_95", { value: String(thresholds.critical) }),
      ]);
      setSaved(true);
      setDirty(false);
      toast.success("Pricing configuration saved");
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
            Changes here update pricing and thresholds in real time on the frontend. Changes take effect immediately for new subscribers.
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

      {/* Live preview notice */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border" style={{ background: "rgba(72,187,120,0.06)", borderColor: "rgba(72,187,120,0.25)" }}>
        <RefreshCw size={14} color="#FFFFFF" />
        <span style={{ color: "var(--muted-foreground)", fontSize: 16 }}>
          Pricing changes propagate to the public pricing page in real time via API. No deployment required.
        </span>
      </div>

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
          <div key={plan.id} className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl w-3 h-3 rounded-full" style={{ background: plan.color }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 21.5, color: "var(--foreground)" }}>{plan.name}</h3>
              <div className="ml-auto text-sm px-3 py-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                ID: {plan.id}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Monthly price */}
              <div>
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
                  Annual price: ${(plan.price * 12 * (1 - plan.annualDiscount / 100)).toFixed(2)}/yr
                </div>
              </div>

              {/* Annual discount */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 15, display: "block", marginBottom: 8 }}>ANNUAL DISCOUNT (%)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "rgba(255,255,255,0.08)", borderColor: "var(--border)" }}>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={plan.annualDiscount}
                    onChange={(e) => updatePlan(plan.id, "annualDiscount", parseInt(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>%</span>
                </div>
              </div>

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

              {/* Preview */}
              <div className="flex items-center justify-center rounded-2xl border" style={{ borderColor: plan.color, background: `${plan.color}08` }}>
                <div className="text-center">
                  <div style={{ color: plan.color, fontFamily: "var(--font-display)", fontSize: 35.5, fontWeight: 700 }}>${plan.price}/mo</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>{plan.storage} GB · ${plan.overageRate}/GB overage</div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
