import React, { useState } from "react";
import { HardDrive, AlertTriangle, TrendingUp, Bell, ArrowUp, Percent, Gauge } from "lucide-react";
import { toast } from "sonner";
import { CryptoPayment } from "./CryptoPayment";
import { STORAGE_BREAKDOWN, STORAGE_USED_GB, STORAGE_LIMIT_GB } from "../utils/storageBreakdown";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

const usageByMonth = [
  { month: "Jan", used: 4.2, limit: 25 }, { month: "Feb", used: 6.8, limit: 25 },
  { month: "Mar", used: 9.1, limit: 25 }, { month: "Apr", used: 11.5, limit: 25 },
  { month: "May", used: 14.3, limit: 25 }, { month: "Jun", used: 16.9, limit: 25 },
];

/* Shared with the Dashboard breakdown so the two views always agree. */
const usageByCategory = STORAGE_BREAKDOWN.map(c => ({ category: c.label, gb: c.gb, color: c.color }));

const plans = [
  { name: "Starter",       storage: 1,   price: 1.99,   overage: 0.50, current: false },
  { name: "Foundation",    storage: 50,  price: 9.99,   overage: 0.40, current: false },
  { name: "Legacy Archive",storage: 250, price: 24.99,  overage: 0.40, current: true  },
  { name: "Legacy Pro",    storage: 500, price: 49.99,  overage: 0.40, current: false },
  { name: "Legacy Vault",  storage: 1024,price: 129.99, overage: 0.40, current: false },
];

const alertHistory = [
  { date: "Jun 10, 2026", type: "80%", message: "Storage at 80% — usage warning sent", color: WARN },
  { date: "May 28, 2026", type: "Reset", message: "Monthly billing cycle reset — storage cleared to 0", color: POS },
  { date: "Apr 29, 2026", type: "90%", message: "Storage at 90% — upgrade recommended", color: NEG },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-storage so nothing else in the app is affected. */
const STORAGE_CSS = `
.fpd-storage{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-storage *{box-sizing:border-box;}
.fpd-storage-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-storage .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-storage .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-storage .card.pad{padding:22px;}
.fpd-storage .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

.fpd-storage .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-storage .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-storage .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}

.fpd-storage .sec-title{font-size:15px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-storage .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* alert banner */
.fpd-storage .alert-banner{display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:14px;border:1px solid;}

/* KPI ledger */
.fpd-storage .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-storage .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-storage .kcell:first-child{border-left:none;}
.fpd-storage .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-storage .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-storage .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-storage .kcell .kval{font-family:var(--font-display);font-size:24px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-storage .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-storage .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-storage .kstrip{grid-template-columns:1fr 1fr;}.fpd-storage .kcell:nth-child(3){border-left:none;}.fpd-storage .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* meter */
.fpd-storage .meter-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.fpd-storage .meter-track{position:relative;height:32px;border-radius:99px;background:#0F1624;margin-bottom:6px;}
.fpd-storage .meter-fill{position:absolute;inset:0 auto 0 0;border-radius:99px;transition:width .4s;}
.fpd-storage .meter-label{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#04070E;font-size:12px;font-weight:700;}
.fpd-storage .meter-mark{position:absolute;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.16);}
.fpd-storage .meter-mark span{position:absolute;top:100%;margin-top:6px;left:50%;transform:translateX(-50%);font-size:9px;color:${MUTED};font-family:var(--font-mono);white-space:nowrap;}
.fpd-storage .thresh-row{display:flex;align-items:center;justify-content:space-between;margin-top:28px;}
.fpd-storage .thresh{text-align:center;flex:1;}
.fpd-storage .thresh-pct{font-family:var(--font-mono);font-size:13px;font-weight:700;}
.fpd-storage .thresh-lbl{color:${TEXT};font-size:12px;}
.fpd-storage .thresh-msg{color:${MUTED};font-size:11px;}

/* bar chart */
.fpd-storage .chart-wrap{display:flex;align-items:flex-end;gap:8px;height:160px;position:relative;}
.fpd-storage .chart-limit{position:absolute;left:0;right:0;border-top:2px dashed rgba(208,107,107,0.5);pointer-events:none;}
.fpd-storage .chart-limit span{position:absolute;right:0;top:-14px;color:${NEG};font-size:9px;font-family:var(--font-mono);}
.fpd-storage .chart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;}
.fpd-storage .chart-val{color:${MUTED};font-size:9px;font-family:var(--font-mono);}
.fpd-storage .chart-bar-wrap{width:100%;height:120px;display:flex;align-items:flex-end;}
.fpd-storage .chart-bar{width:100%;border-radius:4px 4px 0 0;}
.fpd-storage .chart-foot{color:${MUTED};font-size:11px;margin-top:8px;}

/* category */
.fpd-storage .cat-row + .cat-row{margin-top:12px;}
.fpd-storage .cat-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
.fpd-storage .cat-track{height:8px;border-radius:99px;background:#0F1624;}
.fpd-storage .cat-fill{height:8px;border-radius:99px;}

/* plans */
.fpd-storage .plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media (max-width:900px){.fpd-storage .plan-grid{grid-template-columns:1fr;}}
.fpd-storage .plan-card{padding:20px;border-radius:13px;border:1px solid rgba(255,255,255,0.22);background:#0F1624;}
.fpd-storage .plan-card.current{background:rgba(91,110,225,0.08);border:2px solid ${ACCENT};}
.fpd-storage .plan-tag{font-size:10px;font-family:var(--font-mono);color:${ACCENT2};margin-bottom:6px;}
.fpd-storage .plan-name{font-family:var(--font-display);font-size:17px;color:${TEXT};margin-bottom:6px;}
.fpd-storage .plan-price{font-size:22px;color:${TEXT};font-weight:700;}
.fpd-storage .plan-price-sub{color:${MUTED};font-size:12px;}
.fpd-storage .plan-detail{color:${MUTED};font-size:12.5px;}
.fpd-storage .plan-btn{width:100%;padding:11px;border-radius:11px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-storage .plan-btn.up{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.7);}
.fpd-storage .plan-btn.down{background:#141B2E;color:${MUTED};}
.fpd-storage .plan-btn.crypto{padding:9px;font-size:12px;background:rgba(247,147,26,0.1);color:#F7931A;border:1px solid rgba(247,147,26,0.3);}
.fpd-storage .overage-note{margin-top:16px;padding:12px 16px;border-radius:11px;background:#0F1624;display:flex;align-items:center;gap:10px;}
.fpd-storage .overage-note span{color:${MUTED};font-size:13px;}

/* alert history */
.fpd-storage .alert-row{display:flex;align-items:center;gap:14px;padding:12px 16px;border-radius:11px;background:#0F1624;}
.fpd-storage .alert-row + .alert-row{margin-top:10px;}
.fpd-storage .alert-tag{border-radius:8px;padding:4px 9px;font-family:var(--font-mono);font-size:11px;font-weight:700;flex-shrink:0;}
`;

export function StorageUsage() {
  const [overageBilling] = useState(true);
  const [cryptoPlan, setCryptoPlan] = useState<{ name: string; price: number } | null>(null);
  const used = STORAGE_USED_GB;
  const total = STORAGE_LIMIT_GB;
  const percent = Math.round((used / total) * 100);
  const overageRate = 0.40; // $0.40/GB on Legacy Archive (Starter is $0.50/GB)
  const projectedEOM = 21.4;
  const projectedOverage = Math.max(0, projectedEOM - total);

  const getBarColor = (pct: number) => {
    if (pct >= 95) return "#E53E3E";
    if (pct >= 90) return NEG;
    if (pct >= 80) return WARN;
    return ACCENT;
  };

  const bannerColor = percent >= 95 ? "#E53E3E" : percent >= 90 ? NEG : WARN;

  const kpis = [
    { label: "Storage Used", value: `${used} GB`, sub: `of ${total} GB`, icon: <HardDrive size={14}/>, dot: getBarColor(percent) },
    { label: "Usage %", value: `${percent}%`, sub: "Current billing cycle", icon: <Percent size={14}/>, dot: getBarColor(percent) },
    { label: "Projected EOM", value: `${projectedEOM} GB`, sub: "End-of-month estimate", icon: <TrendingUp size={14}/>, dot: projectedEOM > total ? NEG : POS },
    { label: "Est. Overage", value: projectedOverage > 0 ? `$${(projectedOverage * overageRate).toFixed(2)}` : "$0.00", sub: projectedOverage > 0 ? `${projectedOverage.toFixed(1)} GB @ $${overageRate}/GB` : "No overage projected", icon: <Gauge size={14}/>, dot: projectedOverage > 0 ? NEG : POS },
  ];

  return (
    <div className="fpd-storage">
      <style dangerouslySetInnerHTML={{ __html: STORAGE_CSS }} />
      <div className="fpd-storage-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><HardDrive size={12} /> STORAGE & BILLING</div>
            <h1 className="pg-h1">Storage & Usage</h1>
            <div className="pg-sub">
              Storage is metered in gigabytes. Unused monthly allowance expires at billing cycle reset. Overage is billed at ${overageRate}/GB.
            </div>
          </div>
        </div>

        {/* ── Alert banner ── */}
        {percent >= 80 && (
          <div className="alert-banner" style={{ background: `${bannerColor}14`, borderColor: `${bannerColor}4D` }}>
            <AlertTriangle size={16} color={bannerColor}/>
            <div>
              <span style={{ color: bannerColor, fontWeight: 600, fontSize: 14 }}>{percent}% Storage Used</span>
              <span style={{ color: MUTED, fontSize: 14 }}>
                {percent >= 95 ? " — Overage billing begins when limit is reached." :
                 percent >= 90 ? " — We recommend upgrading your plan." :
                 " — Consider managing your storage."}
              </span>
            </div>
          </div>
        )}

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Storage meter ── */}
        <div className="card pad glow-surface">
          <div className="meter-hd">
            <h3 className="sec-title" style={{ marginBottom: 0 }}><span className="tick"/>Current Billing Cycle</h3>
            <div style={{ color: MUTED, fontSize: 12, fontFamily: "var(--font-mono)" }}>Resets Jul 1, 2026</div>
          </div>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${Math.min(percent, 100)}%`, background: `linear-gradient(90deg, ${getBarColor(40)}, ${getBarColor(percent)})` }}/>
            {[80, 90, 95].map(threshold => (
              <div key={threshold} className="meter-mark" style={{ left: `${threshold}%` }}>
                <span>{threshold}%</span>
              </div>
            ))}
            <div className="meter-label">{used} GB / {total} GB</div>
          </div>
          <div className="thresh-row">
            {[
              { label: "80% Threshold", pct: 80, msg: "Usage warning email", color: WARN },
              { label: "90% Threshold", pct: 90, msg: "Upgrade recommended email", color: NEG },
              { label: "95% Threshold", pct: 95, msg: "Critical alert email", color: "#E53E3E" },
              { label: "100% Limit", pct: 100, msg: "Overage billing begins", color: ACCENT2 },
            ].map(t => (
              <div key={t.pct} className="thresh">
                <div className="thresh-pct" style={{ color: t.color }}>{t.pct}%</div>
                <div className="thresh-lbl">{t.label}</div>
                <div className="thresh-msg">{t.msg}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Usage by month — pure CSS bar chart */}
          <div className="card pad glow-surface">
            <h3 className="sec-title"><span className="tick"/>6-Month Usage History</h3>
            <div className="chart-wrap">
              <div className="chart-limit" style={{ bottom: Math.round((total/total)*120) }}>
                <span>{total} GB limit</span>
              </div>
              {usageByMonth.map((d, i) => {
                const barH = Math.round((d.used / total) * 120);
                const barColor = d.used >= total * 0.95 ? "#E53E3E" : d.used >= total * 0.9 ? NEG : d.used >= total * 0.8 ? WARN : ACCENT;
                return (
                  <div key={i} className="chart-col">
                    <span className="chart-val">{d.used}GB</span>
                    <div className="chart-bar-wrap">
                      <div className="chart-bar" style={{ height: barH, background: barColor, opacity: i === usageByMonth.length-1 ? 1 : 0.88 }}/>
                    </div>
                    <span className="chart-val">{d.month}</span>
                  </div>
                );
              })}
            </div>
            <p className="chart-foot">Unused monthly GB expire at billing cycle reset. No carry-forward.</p>
          </div>

          {/* Usage by category */}
          <div className="card pad glow-surface">
            <h3 className="sec-title"><span className="tick"/>Usage by Category</h3>
            <div>
              {usageByCategory.map(cat => (
                <div key={cat.category} className="cat-row">
                  <div className="cat-hd">
                    <span style={{ color: TEXT, fontSize: 13 }}>{cat.category}</span>
                    <span style={{ color: MUTED, fontSize: 12, fontFamily: "var(--font-mono)" }}>{cat.gb} GB</span>
                  </div>
                  <div className="cat-track">
                    <div className="cat-fill" style={{ width: `${(cat.gb / used) * 100}%`, background: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Plan comparison + upgrade ── */}
        <div className="card pad glow-surface">
          <h3 className="sec-title"><span className="tick"/>Your Plan & Upgrade Options</h3>
          <div className="plan-grid">
            {plans.map(plan => (
              <div key={plan.name} className={`plan-card ${plan.current ? "current" : ""}`}>
                {plan.current && <div className="plan-tag">CURRENT PLAN</div>}
                <div className="plan-name">{plan.name}</div>
                <div className="flex items-baseline gap-1" style={{ marginBottom: 12 }}>
                  <span className="plan-price">${plan.price}</span>
                  <span className="plan-price-sub">/mo</span>
                </div>
                <div className="plan-detail" style={{ marginBottom: 4 }}>{plan.storage >= 1024 ? `${plan.storage / 1024} TB` : `${plan.storage} GB`} storage</div>
                <div className="plan-detail" style={{ marginBottom: 12, fontSize: 11 }}>Overage: ${plan.overage}/GB</div>
                {!plan.current && (
                  <div className="space-y-2">
                    <button
                      onClick={() => toast.success(plan.storage > total ? `Upgrading to ${plan.name} — $${plan.price}/mo` : `Downgrading to ${plan.name} — $${plan.price}/mo`)}
                      className={`plan-btn ${plan.storage > total ? "up" : "down"}`}
                    >
                      {plan.storage > total ? "Upgrade" : "Downgrade"} (Card)
                    </button>
                    {plan.storage > total && (
                      <button onClick={() => setCryptoPlan({ name: plan.name, price: plan.price })} className="plan-btn crypto">
                        <span style={{ marginRight:4 }}>₿</span>Pay with Crypto
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="overage-note">
            <ArrowUp size={13} color={NEG} />
            <span>
              Overage rate: <strong style={{ color: TEXT }}>${overageRate}/GB</strong> above your plan limit (Legacy Archive). Starter plan is $0.50/GB. Billed automatically at end of billing cycle.
            </span>
          </div>
        </div>

        {/* ── Alert history ── */}
        <div className="card pad glow-surface">
          <h3 className="sec-title"><span className="tick"/>Notification History</h3>
          <div>
            {alertHistory.map((alert, i) => (
              <div key={i} className="alert-row">
                <div className="alert-tag" style={{ background: `${alert.color}20`, color: alert.color }}>{alert.type}</div>
                <div style={{ color: TEXT, fontSize: 13, flex: 1 }}>{alert.message}</div>
                <div style={{ color: MUTED, fontSize: 12, flexShrink: 0 }}>{alert.date}</div>
              </div>
            ))}
          </div>
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
