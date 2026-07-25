import React, { useState } from "react";
import { Settings, Save, AlertTriangle, CheckCircle, DollarSign, HardDrive, Bell, RefreshCw } from "lucide-react";

interface PlanConfig {
  id: string;
  name: string;
  price: number;
  annualDiscount: number;
  storage: number;
  overageRate: number;
  maxContacts: number;
  color: string;
}

const initialPlans: PlanConfig[] = [
  { id: "starter",        name: "Starter",        price: 1.99,   annualDiscount: 15, storage: 1,    overageRate: 0.50, maxContacts: 1,   color: "#48BB78" },
  { id: "foundation",     name: "Foundation",     price: 9.99,   annualDiscount: 20, storage: 50,   overageRate: 0.40, maxContacts: 3,   color: "#5BA7D6" },
  { id: "family_archive", name: "Legacy Archive", price: 24.99,  annualDiscount: 20, storage: 250,  overageRate: 0.40, maxContacts: 999, color: "#5B6EE1" },
  { id: "legacy_pro",     name: "Legacy Pro",     price: 49.99,  annualDiscount: 20, storage: 500,  overageRate: 0.40, maxContacts: 999, color: "#5BA7D6" },
  { id: "legacy_vault",   name: "Legacy Vault",   price: 129.99, annualDiscount: 20, storage: 1024, overageRate: 0.40, maxContacts: 999, color: "#ED8936" },
];

interface AlertThresholds {
  warning: number;
  recommended: number;
  critical: number;
  overage: number;
}

export function SubscriptionConfig() {
  const [plans, setPlans] = useState<PlanConfig[]>(initialPlans);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [thresholds, setThresholds] = useState<AlertThresholds>({ warning: 80, recommended: 90, critical: 95, overage: 100 });

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

  const handleSave = () => {
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1000 }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings size={16} color="var(--gold)" />
            <span style={{ color: "var(--gold)", fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · CONFIG</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)" }}>Subscription Configuration</h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>
            Changes here update pricing and thresholds in real time on the frontend. Changes take effect immediately for new subscribers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <div className="flex items-center gap-2" style={{ color: "#F6AD55", fontSize: 13 }}>
              <AlertTriangle size={14} /> Unsaved changes
            </div>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all"
            style={{
              background: saved ? "rgba(72,187,120,0.15)" : "linear-gradient(135deg, #5B6EE1, #5B6EE1)",
              color: saved ? "#48BB78" : "#070D1A",
              border: saved ? "1px solid rgba(72,187,120,0.3)" : "none",
              fontWeight: 600, fontSize: 14,
            }}
          >
            {saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Live preview notice */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl border" style={{ background: "rgba(72,187,120,0.06)", borderColor: "rgba(72,187,120,0.25)" }}>
        <RefreshCw size={14} color="#48BB78" />
        <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          Pricing changes propagate to the public pricing page in real time via API. No deployment required.
        </span>
      </div>

      {/* Plan pricing */}
      <div className="space-y-4">
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--foreground)" }}>Subscription Plans</h2>
        {plans.map((plan) => (
          <div key={plan.id} className="p-6 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-lg w-3 h-3 rounded-full" style={{ background: plan.color }} />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--foreground)" }}>{plan.name}</h3>
              <div className="ml-auto text-sm px-3 py-1 rounded-lg" style={{ background: "#EAF0FC", color: "var(--muted-foreground)", fontFamily: "var(--font-mono)" }}>
                ID: {plan.id}
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Monthly price */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 12, display: "block", marginBottom: 8 }}>MONTHLY PRICE ($)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: "#EAF0FC", borderColor: "var(--border)" }}>
                  <DollarSign size={14} color="var(--gold)" />
                  <input
                    type="number"
                    step="0.01"
                    value={plan.price}
                    onChange={(e) => updatePlan(plan.id, "price", parseFloat(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 4 }}>
                  Annual price: ${(plan.price * 12 * (1 - plan.annualDiscount / 100)).toFixed(2)}/yr
                </div>
              </div>

              {/* Annual discount */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 12, display: "block", marginBottom: 8 }}>ANNUAL DISCOUNT (%)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: "#EAF0FC", borderColor: "var(--border)" }}>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="50"
                    value={plan.annualDiscount}
                    onChange={(e) => updatePlan(plan.id, "annualDiscount", parseInt(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>%</span>
                </div>
              </div>

              {/* Storage */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 12, display: "block", marginBottom: 8 }}>STORAGE ALLOWANCE (GB)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: "#EAF0FC", borderColor: "var(--border)" }}>
                  <HardDrive size={14} color="var(--gold)" />
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={plan.storage}
                    onChange={(e) => updatePlan(plan.id, "storage", parseInt(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>GB</span>
                </div>
              </div>

              {/* Overage rate */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 12, display: "block", marginBottom: 8 }}>OVERAGE RATE ($/GB)</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: "#EAF0FC", borderColor: "var(--border)" }}>
                  <DollarSign size={14} color="#FC8181" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={plan.overageRate}
                    onChange={(e) => updatePlan(plan.id, "overageRate", parseFloat(e.target.value))}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                  <span style={{ color: "var(--muted-foreground)" }}>/GB</span>
                </div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 4 }}>Applied after storage limit is exceeded</div>
              </div>

              {/* Max contacts */}
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 12, display: "block", marginBottom: 8 }}>MAX LEGACY CONTACTS</label>
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ background: "#EAF0FC", borderColor: "var(--border)" }}>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={plan.maxContacts === 999 ? "Unlimited" : plan.maxContacts}
                    onChange={(e) => updatePlan(plan.id, "maxContacts", parseInt(e.target.value) || 999)}
                    style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 16, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                  />
                </div>
                {plan.maxContacts === 999 && <div style={{ color: "#48BB78", fontSize: 11, marginTop: 4 }}>Unlimited contacts</div>}
              </div>

              {/* Preview */}
              <div className="flex items-center justify-center rounded-xl border" style={{ borderColor: plan.color, background: `${plan.color}08` }}>
                <div className="text-center">
                  <div style={{ color: plan.color, fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700 }}>${plan.price}/mo</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{plan.storage} GB · ${plan.overageRate}/GB overage</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notification thresholds */}
      <div className="p-6 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--foreground)", marginBottom: 6 }}>Storage Notification Thresholds</h2>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 20 }}>
          Automatic email alerts are sent to users when their storage crosses these thresholds. All values are percentages of plan storage limit.
        </p>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { key: "warning", label: "Usage Warning", color: "#F6AD55", desc: "General usage warning email" },
            { key: "recommended", label: "Upgrade Recommended", color: "#ED8936", desc: "Upgrade recommended email" },
            { key: "critical", label: "Critical Alert", color: "#FC8181", desc: "Critical alert email sent" },
            { key: "overage", label: "Overage Begins", color: "#E53E3E", desc: "Overage billing triggered" },
          ].map((t) => (
            <div key={t.key}>
              <label style={{ color: "var(--muted-foreground)", fontSize: 12, display: "block", marginBottom: 8 }}>{t.label.toUpperCase()}</label>
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl border mb-2" style={{ background: "#EAF0FC", borderColor: `${t.color}40` }}>
                <Bell size={14} color={t.color} />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={(thresholds as any)[t.key]}
                  onChange={(e) => updateThreshold(t.key as keyof AlertThresholds, parseInt(e.target.value))}
                  style={{ background: "transparent", border: "none", outline: "none", color: t.color, fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, width: "100%" }}
                />
                <span style={{ color: "var(--muted-foreground)" }}>%</span>
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Save button bottom */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-8 py-3 rounded-xl"
          style={{ background: "linear-gradient(135deg, #5B6EE1, #5B6EE1)", color: "#070D1A", fontWeight: 700, fontSize: 15 }}
        >
          <Save size={16} /> Save All Configuration
        </button>
      </div>
    </div>
  );
}
