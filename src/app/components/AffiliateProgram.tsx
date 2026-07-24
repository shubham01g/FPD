import React, { useState } from "react";
import { Copy, TrendingUp, DollarSign, CheckCircle, Share2, Link, Info } from "lucide-react";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#8C97B4";
const FAINT   = "#6B7690";
const ACCENT  = "#5B7BF5";
const ACCENT2 = "#8AA0FF";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";

const referrals = [
  { name: "Amanda Chen", email: "a.chen@email.com", joined: "Jun 8, 2026", plan: "Premium", status: "active", commission: 4.99, monthsLeft: 9, withinCap: true },
  { name: "Robert Kim", email: "r.kim@email.com", joined: "May 22, 2026", plan: "Essential", status: "active", commission: 2.00, monthsLeft: 10, withinCap: true },
  { name: "Patricia Wells", email: "p.wells@email.com", joined: "Apr 10, 2026", plan: "Legacy Pro", status: "active", commission: 9.99, monthsLeft: 11, withinCap: true },
  { name: "David Martinez", email: "d.martinez@email.com", joined: "Mar 1, 2026", plan: "Premium", status: "active", commission: 4.99, monthsLeft: 3, withinCap: true },
  { name: "Karen Scott", email: "k.scott@email.com", joined: "Feb 14, 2025", plan: "Premium", status: "expired", commission: 0, monthsLeft: 0, withinCap: false },
  { name: "James Thompson", email: "j.thompson@email.com", joined: "Jan 20, 2025", plan: "Essential", status: "expired", commission: 0, monthsLeft: 0, withinCap: false },
];

const monthlyEarnings = [
  { month: "Jan", earned: 28.50 }, { month: "Feb", earned: 42.00 }, { month: "Mar", earned: 65.00 },
  { month: "Apr", earned: 97.50 }, { month: "May", earned: 143.00 }, { month: "Jun", earned: 189.50 },
];

const tiers = [
  { tier: 1, label: "Tier 1", range: "5–24 accounts", rate: 20, color: "#4A90D9" },
  { tier: 2, label: "Tier 2", range: "25–74 accounts", rate: 25, color: ACCENT },
  { tier: 3, label: "Tier 3", range: "74+ accounts", rate: 30, color: POS },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-aff so nothing else in the app is affected. */
const AFF_CSS = `
.fpd-aff{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,123,245,0.10),transparent 70%);}
.fpd-aff *{box-sizing:border-box;}
.fpd-aff-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-aff .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-aff .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-aff .card.pad{padding:22px;}
.fpd-aff .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-aff .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-aff .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-aff .sec-title{font-size:15px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-aff .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* tier badges */
.fpd-aff .tier-row{display:flex;flex-wrap:wrap;gap:14px;}
.fpd-aff .tier-badge{display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:14px;flex:1;min-width:180px;border:1px solid rgba(255,255,255,0.22);background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);}
.fpd-aff .tier-badge.current{border:2px solid;}
.fpd-aff .tier-ico{border-radius:11px;padding:8px;display:flex;}
.fpd-aff .tier-lbl{font-family:var(--font-mono);font-size:11px;font-weight:700;}
.fpd-aff .tier-rate{font-size:18px;font-weight:700;font-family:var(--font-display);color:${TEXT};}
.fpd-aff .tier-range{color:${MUTED};font-size:11px;}
.fpd-aff .tier-current-tag{margin-left:auto;font-size:10px;padding:4px 9px;border-radius:99px;font-family:var(--font-mono);}

/* progress */
.fpd-aff .progress-track{height:12px;border-radius:99px;background:#0F1624;}
.fpd-aff .progress-fill{height:12px;border-radius:99px;}

/* KPI ledger */
.fpd-aff .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-aff .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-aff .kcell:first-child{border-left:none;}
.fpd-aff .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-aff .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-aff .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-aff .kcell .kval{font-family:var(--font-display);font-size:24px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-aff .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-aff .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-aff .kstrip{grid-template-columns:1fr 1fr;}.fpd-aff .kcell:nth-child(3){border-left:none;}.fpd-aff .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* referral link */
.fpd-aff .link-row{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-aff .link-box{display:flex;align-items:center;gap:10px;flex:1;min-width:220px;padding:13px 16px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);}
.fpd-aff .link-box span{color:${TEXT};font-size:13px;font-family:var(--font-mono);}
.fpd-aff .copy-btn{display:flex;align-items:center;gap:8px;padding:13px 20px;border-radius:12px;font-weight:600;font-size:13px;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-aff .share-row{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
.fpd-aff .share-btn{display:flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:12.5px;cursor:pointer;font-family:var(--font-body);}

/* earnings chart */
.fpd-aff .echart{display:flex;align-items:flex-end;gap:10px;height:160px;}
.fpd-aff .echart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;}
.fpd-aff .echart-val{color:${MUTED};font-size:9px;font-family:var(--font-mono);}
.fpd-aff .echart-bar-wrap{width:100%;height:120px;display:flex;align-items:flex-end;}
.fpd-aff .echart-bar{width:100%;border-radius:4px 4px 0 0;background:${ACCENT};}

/* referral table */
.fpd-aff .table-hd{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-aff .trow{display:grid;grid-template-columns:1fr auto auto auto auto;gap:16px;align-items:center;padding:14px 20px;}
.fpd-aff .trow.head{background:rgba(255,255,255,0.02);}
.fpd-aff .trow.head span{color:${MUTED};font-size:11px;font-family:var(--font-mono);}
.fpd-aff .trow.body{border-top:1px solid rgba(255,255,255,0.22);}
.fpd-aff .status-pill{padding:4px 10px;border-radius:99px;font-size:11px;font-family:var(--font-mono);}

/* cap notice */
.fpd-aff .notice{display:flex;gap:12px;padding:16px 20px;border-radius:14px;background:rgba(91,123,245,0.05);border:1px solid rgba(91,123,245,0.18);}
.fpd-aff .notice p{color:${MUTED};font-size:13px;line-height:1.7;}
`;

export function AffiliateProgram() {
  const [copied, setCopied] = useState(false);
  const affiliateCode = "FPD-JD-2024-XKTZ";
  const affiliateLink = `https://finalpassdown.com/r/${affiliateCode}`;
  const activeReferrals = referrals.filter(r => r.status === "active").length;
  const currentTier = activeReferrals < 5 ? null : activeReferrals < 25 ? tiers[0] : activeReferrals < 75 ? tiers[1] : tiers[2];
  const nextTier = currentTier?.tier === 1 ? tiers[1] : currentTier?.tier === 2 ? tiers[2] : null;
  const currentRate = currentTier?.rate ?? 20;
  const totalEarned = 565.50;
  const pendingPayout = 189.50;

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kpis = [
    { label: "Active Referrals", value: String(activeReferrals), sub: "Earning commission", icon: <TrendingUp size={14}/>, dot: POS },
    { label: "Total Referrals", value: String(referrals.length), sub: "All time", icon: <TrendingUp size={14}/>, dot: ACCENT2 },
    { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, sub: "All time", icon: <DollarSign size={14}/>, dot: WARN },
    { label: "Pending Payout", value: `$${pendingPayout.toFixed(2)}`, sub: "Next payout: Jul 1", icon: <DollarSign size={14}/>, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-aff">
      <style dangerouslySetInnerHTML={{ __html: AFF_CSS }} />
      <div className="fpd-aff-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><TrendingUp size={12} /> EARN & REFER</div>
          <h1 className="pg-h1">Affiliate Program</h1>
          <div className="pg-sub">Earn commissions by referring new users. Rates increase as you grow. 12-month cap per referral.</div>
        </div>

        {/* ── Tier badges ── */}
        <div className="tier-row">
          {tiers.map(t => (
            <div key={t.tier} className={`tier-badge ${currentTier?.tier === t.tier ? "current" : ""}`}
              style={{ borderColor: currentTier?.tier === t.tier ? t.color : undefined }}>
              <div className="tier-ico" style={{ background: `${t.color}20` }}>
                <TrendingUp size={16} color={t.color} />
              </div>
              <div>
                <div className="tier-lbl" style={{ color: t.color }}>{t.label.toUpperCase()}</div>
                <div className="tier-rate">{t.rate}%</div>
                <div className="tier-range">{t.range}</div>
              </div>
              {currentTier?.tier === t.tier && (
                <div className="tier-current-tag" style={{ background: `${t.color}20`, color: t.color }}>CURRENT</div>
              )}
            </div>
          ))}
        </div>

        {/* ── Progress to next tier ── */}
        {nextTier && (
          <div className="card pad glow-surface">
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span style={{ color: TEXT, fontSize: 14, fontWeight: 500 }}>Progress to {nextTier.label} ({nextTier.rate}%)</span>
              <span style={{ color: nextTier.color, fontFamily: "var(--font-mono)", fontSize: 13 }}>{activeReferrals} / {nextTier.tier === 2 ? 25 : 75} active referrals</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(100, (activeReferrals / (nextTier.tier === 2 ? 25 : 75)) * 100)}%`, background: `linear-gradient(90deg, ${currentTier?.color ?? "#4A90D9"}, ${nextTier.color})` }}/>
            </div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 8 }}>
              {(nextTier.tier === 2 ? 25 : 75) - activeReferrals} more referrals needed to reach {nextTier.label} ({nextTier.rate}% commission)
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

        {/* ── Referral link ── */}
        <div className="card pad glow-surface">
          <h3 className="sec-title"><span className="tick"/>Your Referral Link</h3>
          <div className="link-row">
            <div className="link-box">
              <Link size={14} color={ACCENT2} />
              <span>{affiliateLink}</span>
            </div>
            <button onClick={handleCopy} className="copy-btn"
              style={{ background: copied ? "rgba(95,190,145,0.16)" : "linear-gradient(180deg,#647FF7,#4A63DE)", color: copied ? POS : "#fff" }}>
              {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <div className="share-row">
            {[
              { label: "Share via Email", action: () => { window.open(`mailto:?subject=Join Final Pass Down&body=Use my referral link: ${affiliateLink}`); } },
              { label: "Share via SMS",   action: () => { window.open(`sms:?body=Join Final Pass Down with my link: ${affiliateLink}`); } },
              { label: "Download Materials", action: () => { const a=document.createElement("a"); a.href="#"; alert("Marketing kit download started (demo)"); } },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action} className="share-btn">
                <Share2 size={13} /> {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Earnings chart ── */}
        <div className="card pad glow-surface">
          <h3 className="sec-title"><span className="tick"/>Monthly Earnings</h3>
          {(() => {
            const maxEarned = Math.max(...monthlyEarnings.map(d => d.earned));
            return (
              <div className="echart">
                {monthlyEarnings.map((d, i) => {
                  const h = Math.round((d.earned / maxEarned) * 120);
                  return (
                    <div key={i} className="echart-col">
                      <span className="echart-val">${d.earned.toFixed(0)}</span>
                      <div className="echart-bar-wrap">
                        <div className="echart-bar" style={{ height: h, opacity: i === monthlyEarnings.length-1 ? 1 : 0.55 }}/>
                      </div>
                      <span className="echart-val">{d.month}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* ── Referral table ── */}
        <div className="card glow-surface" style={{ overflow: "hidden" }}>
          <div className="table-hd">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: TEXT }}>My Referrals</h3>
          </div>
          <div>
            <div className="trow head">
              {["User", "Plan", "Joined", "Commission/Mo", "Status"].map(h => <span key={h}>{h.toUpperCase()}</span>)}
            </div>
            {referrals.map((ref, i) => (
              <div key={i} className="trow body">
                <div>
                  <div style={{ color: TEXT, fontSize: 13 }}>{ref.name}</div>
                  <div style={{ color: MUTED, fontSize: 11 }}>{ref.email}</div>
                </div>
                <div style={{ color: TEXT, fontSize: 13 }}>{ref.plan}</div>
                <div style={{ color: MUTED, fontSize: 12 }}>{ref.joined}</div>
                <div style={{ color: ref.withinCap ? WARN : MUTED, fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {ref.withinCap ? `$${ref.commission.toFixed(2)}` : "—"}
                  {ref.withinCap && ref.monthsLeft <= 3 && (
                    <span style={{ color: WARN, fontSize: 10, marginLeft: 4 }}>{ref.monthsLeft}mo left</span>
                  )}
                </div>
                <div>
                  <span className="status-pill" style={{ background: ref.status === "active" ? "rgba(95,190,145,0.16)" : "rgba(140,151,180,0.14)", color: ref.status === "active" ? POS : MUTED }}>
                    {ref.status === "active" ? "ACTIVE" : "CAP REACHED"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cap notice ── */}
        <div className="notice">
          <Info size={15} color={ACCENT2} style={{ flexShrink: 0, marginTop: 2 }} />
          <p><strong style={{ color: TEXT }}>12-Month Commission Cap:</strong> Affiliate commissions are earned for 12 months from each user's join date. After 12 months, that referral no longer generates commission. There is no cap on the number of referrals you can make.</p>
        </div>
      </div>
    </div>
  );
}
