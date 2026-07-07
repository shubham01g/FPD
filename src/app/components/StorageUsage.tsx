import React, { useState } from "react";
import { HardDrive, AlertTriangle, TrendingUp, Calendar, Bell, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { CryptoPayment } from "./CryptoPayment";

const usageByMonth = [
  { month: "Jan", used: 4.2, limit: 25 }, { month: "Feb", used: 6.8, limit: 25 },
  { month: "Mar", used: 9.1, limit: 25 }, { month: "Apr", used: 11.5, limit: 25 },
  { month: "May", used: 14.3, limit: 25 }, { month: "Jun", used: 16.9, limit: 25 },
];

const usageByCategory = [
  { category: "Legal Docs", gb: 4.2, color: "#4A90D9" },
  { category: "Financial", gb: 4.7, color: "#48BB78" },
  { category: "Video Messages", gb: 5.5, color: "#9F7AEA" },
  { category: "Personal", gb: 0.8, color: "#6C5CE7" },
  { category: "Digital Assets", gb: 0.4, color: "#ED8936" },
  { category: "Photos", gb: 1.3, color: "#FC8181" },
];

const plans = [
  { name: "Starter",       storage: 1,   price: 1.99,   overage: 0.50, current: false },
  { name: "Foundation",    storage: 50,  price: 9.99,   overage: 0.40, current: false },
  { name: "Legacy Archive",storage: 250, price: 24.99,  overage: 0.40, current: true  },
  { name: "Legacy Pro",    storage: 500, price: 49.99,  overage: 0.40, current: false },
  { name: "Legacy Vault",  storage: 1024,price: 129.99, overage: 0.40, current: false },
];

const alertHistory = [
  { date: "Jun 10, 2026", type: "80%", message: "Storage at 80% — usage warning sent", color: "#F6AD55" },
  { date: "May 28, 2026", type: "Reset", message: "Monthly billing cycle reset — storage cleared to 0", color: "#48BB78" },
  { date: "Apr 29, 2026", type: "90%", message: "Storage at 90% — upgrade recommended", color: "#FC8181" },
];

export function StorageUsage() {
  const [overageBilling] = useState(true);
  const [cryptoPlan, setCryptoPlan] = useState<{ name: string; price: number } | null>(null);
  const used = 16.9;
  const total = 25;
  const percent = Math.round((used / total) * 100);
  const overageRate = 0.40; // $0.40/GB on Legacy Archive (Starter is $0.50/GB)
  const projectedEOM = 21.4;
  const projectedOverage = Math.max(0, projectedEOM - total);

  const getBarColor = (pct: number) => {
    if (pct >= 95) return "#E53E3E";
    if (pct >= 90) return "#FC8181";
    if (pct >= 80) return "#F6AD55";
    return "#6C5CE7";
  };

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4 }}>Storage & Usage</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
          Storage is metered in gigabytes. Unused monthly allowance expires at billing cycle reset. Overage is billed at ${overageRate}/GB.
        </p>
      </div>

      {/* Alert Banner */}
      {percent >= 80 && (
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-xl border"
          style={{
            background: percent >= 95 ? "rgba(229, 62, 62, 0.08)" : percent >= 90 ? "rgba(252, 129, 129, 0.08)" : "rgba(246, 173, 85, 0.08)",
            borderColor: percent >= 95 ? "rgba(229, 62, 62, 0.3)" : percent >= 90 ? "rgba(252, 129, 129, 0.3)" : "rgba(246, 173, 85, 0.3)",
          }}
        >
          <AlertTriangle size={16} color={percent >= 95 ? "#E53E3E" : percent >= 90 ? "#FC8181" : "#F6AD55"} />
          <div>
            <span style={{ color: percent >= 95 ? "#E53E3E" : percent >= 90 ? "#FC8181" : "#F6AD55", fontWeight: 600, fontSize: 14 }}>
              {percent}% Storage Used
            </span>
            <span style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
              {percent >= 95 ? " — Overage billing begins when limit is reached." :
               percent >= 90 ? " — We recommend upgrading your plan." :
               " — Consider managing your storage."}
            </span>
          </div>
        </div>
      )}

      {/* Main stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Storage Used", value: `${used} GB`, sub: `of ${total} GB`, color: getBarColor(percent) },
          { label: "Usage %", value: `${percent}%`, sub: "Current billing cycle", color: getBarColor(percent) },
          { label: "Projected EOM", value: `${projectedEOM} GB`, sub: "End-of-month estimate", color: projectedEOM > total ? "#FC8181" : "#48BB78" },
          { label: "Est. Overage", value: projectedOverage > 0 ? `$${(projectedOverage * overageRate).toFixed(2)}` : "$0.00", sub: projectedOverage > 0 ? `${projectedOverage.toFixed(1)} GB @ $${overageRate}/GB` : "No overage projected", color: projectedOverage > 0 ? "#FC8181" : "#48BB78" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>{stat.label}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Storage meter */}
      <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>Current Billing Cycle</h3>
          <div style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            Resets Jul 1, 2026
          </div>
        </div>
        <div className="relative h-8 rounded-full mb-3" style={{ background: "var(--secondary)" }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${Math.min(percent, 100)}%`, background: `linear-gradient(90deg, ${getBarColor(40)}, ${getBarColor(percent)})` }}
          />
          {/* threshold markers */}
          {[80, 90, 95].map((threshold) => (
            <div
              key={threshold}
              className="absolute top-0 bottom-0 w-px"
              style={{ left: `${threshold}%`, background: "rgba(255,255,255,0.15)" }}
            >
              <div style={{ position: "absolute", top: "100%", marginTop: 4, left: "50%", transform: "translateX(-50%)", fontSize: 9, color: "var(--muted-foreground)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{threshold}%</div>
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#070D1A", fontSize: 12, fontWeight: 700 }}>
            {used} GB / {total} GB
          </div>
        </div>
        <div className="flex items-center justify-between mt-6">
          {[
            { label: "80% Threshold", pct: 80, msg: "Usage warning email", color: "#F6AD55" },
            { label: "90% Threshold", pct: 90, msg: "Upgrade recommended email", color: "#FC8181" },
            { label: "95% Threshold", pct: 95, msg: "Critical alert email", color: "#E53E3E" },
            { label: "100% Limit", pct: 100, msg: "Overage billing begins", color: "#9F7AEA" },
          ].map((t) => (
            <div key={t.pct} className="text-center flex-1">
              <div style={{ color: t.color, fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700 }}>{t.pct}%</div>
              <div style={{ color: "var(--foreground)", fontSize: 12 }}>{t.label}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{t.msg}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Usage by month — pure CSS bar chart */}
        <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>6-Month Usage History</h3>
          <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:160, position:"relative" }}>
            {/* 25 GB limit line */}
            <div style={{ position:"absolute", left:0, right:0, bottom: Math.round((total/total)*120), borderTop:"2px dashed rgba(252,129,129,0.5)", pointerEvents:"none" }}>
              <span style={{ position:"absolute", right:0, top:-14, color:"#FC8181", fontSize:9, fontFamily:"var(--font-mono)" }}>{total} GB limit</span>
            </div>
            {usageByMonth.map((d, i) => {
              const barH = Math.round((d.used / total) * 120);
              const barColor = d.used >= total * 0.95 ? "#E53E3E" : d.used >= total * 0.9 ? "#FC8181" : d.used >= total * 0.8 ? "#F6AD55" : "#6C5CE7";
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                  <span style={{ color:"var(--muted-foreground)", fontSize:9, fontFamily:"var(--font-mono)" }}>{d.used}GB</span>
                  <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                    <div style={{ width:"100%", height:barH, background:barColor, borderRadius:"4px 4px 0 0", opacity: i === usageByMonth.length-1 ? 1 : 0.65 }}/>
                  </div>
                  <span style={{ color:"var(--muted-foreground)", fontSize:9, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                </div>
              );
            })}
          </div>
          <p style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 8 }}>Unused monthly GB expire at billing cycle reset. No carry-forward.</p>
        </div>

        {/* Usage by category */}
        <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Usage by Category</h3>
          <div className="space-y-3">
            {usageByCategory.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span style={{ color: "var(--foreground)", fontSize: 13 }}>{cat.category}</span>
                  <span style={{ color: "var(--muted-foreground)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{cat.gb} GB</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: "var(--secondary)" }}>
                  <div className="h-2 rounded-full" style={{ width: `${(cat.gb / used) * 100}%`, background: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan comparison + upgrade */}
      <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Your Plan & Upgrade Options</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="p-5 rounded-xl border"
              style={{
                background: plan.current ? "rgba(32, 64, 192, 0.06)" : "#1C1C28",
                borderColor: plan.current ? "var(--gold)" : "var(--border)",
                borderWidth: plan.current ? 2 : 1,
              }}
            >
              {plan.current && (
                <div className="text-xs mb-2 font-mono" style={{ color: "var(--gold)" }}>CURRENT PLAN</div>
              )}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--foreground)", marginBottom: 4 }}>{plan.name}</div>
              <div className="flex items-baseline gap-1 mb-3">
                <span style={{ fontSize: 22, color: "var(--foreground)", fontWeight: 700 }}>${plan.price}</span>
                <span style={{ color: "var(--muted-foreground)", fontSize: 12 }}>/mo</span>
              </div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 4 }}>{plan.storage >= 1024 ? `${plan.storage / 1024} TB` : `${plan.storage} GB`} storage</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginBottom: 12 }}>Overage: ${plan.overage}/GB</div>
              {!plan.current && (
                <div className="space-y-2">
                  <button
                    onClick={() => toast.success(plan.storage > total ? `Upgrading to ${plan.name} — $${plan.price}/mo` : `Downgrading to ${plan.name} — $${plan.price}/mo`)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: plan.storage > total ? "var(--gold)" : "var(--secondary)", color: plan.storage > total ? "#070D1A" : "var(--muted-foreground)" }}
                  >
                    {plan.storage > total ? "Upgrade" : "Downgrade"} (Card)
                  </button>
                  {plan.storage > total && (
                    <button
                      onClick={() => setCryptoPlan({ name: plan.name, price: plan.price })}
                      className="w-full py-2 rounded-xl text-xs font-semibold"
                      style={{ background:"rgba(247,147,26,0.1)", color:"#F7931A", border:"1px solid rgba(247,147,26,0.3)" }}
                    >
                      <span style={{ marginRight:4 }}>₿</span>Pay with Crypto
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 px-4 py-3 rounded-lg" style={{ background: "#1C1C28" }}>
          <div className="flex items-center gap-2">
            <ArrowUp size={13} color="#FC8181" />
            <span style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
              Overage rate: <strong style={{ color: "var(--foreground)" }}>${overageRate}/GB</strong> above your plan limit (Legacy Archive). Starter plan is $0.50/GB. Billed automatically at end of billing cycle.
            </span>
          </div>
        </div>
      </div>

      {/* Alert history */}
      <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Notification History</h3>
        <div className="space-y-3">
          {alertHistory.map((alert, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 rounded-lg" style={{ background: "#1C1C28" }}>
              <div className="rounded-lg px-2 py-1" style={{ background: `${alert.color}18`, color: alert.color, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {alert.type}
              </div>
              <div style={{ color: "var(--foreground)", fontSize: 13, flex: 1 }}>{alert.message}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 12, flexShrink: 0 }}>{alert.date}</div>
            </div>
          ))}
        </div>
      </div>

      {cryptoPlan && (
        <CryptoPayment
          open={true}
          amountUSD={cryptoPlan.price}
          label={`${cryptoPlan.name} Plan — $${cryptoPlan.price}/mo`}
          onSuccess={() => { setCryptoPlan(null); toast.success(`Upgraded to ${cryptoPlan.name} via crypto!`); }}
          onClose={() => setCryptoPlan(null)}
        />
      )}
    </div>
  );
}
