import React, { useState } from "react";
import { Copy, TrendingUp, Users, DollarSign, Clock, CheckCircle, Share2, Link, ChevronRight, Info } from "lucide-react";

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
  { tier: 2, label: "Tier 2", range: "25–74 accounts", rate: 25, color: "#2040C0" },
  { tier: 3, label: "Tier 3", range: "74+ accounts", rate: 30, color: "#48BB78" },
];

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

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4 }}>Affiliate Program</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
          Earn commissions by referring new users. Rates increase as you grow. 12-month cap per referral.
        </p>
      </div>

      {/* Current tier badge */}
      <div className="flex flex-wrap gap-4">
        {tiers.map((t) => (
          <div
            key={t.tier}
            className="flex items-center gap-3 px-5 py-4 rounded-xl border flex-1 min-w-40"
            style={{
              background: currentTier?.tier === t.tier ? `${t.color}10` : "var(--card)",
              borderColor: currentTier?.tier === t.tier ? t.color : "var(--border)",
              borderWidth: currentTier?.tier === t.tier ? 2 : 1,
            }}
          >
            <div className="rounded-xl p-2" style={{ background: `${t.color}18` }}>
              <TrendingUp size={16} color={t.color} />
            </div>
            <div>
              <div style={{ color: t.color, fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>{t.label.toUpperCase()}</div>
              <div style={{ color: "var(--foreground)", fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)" }}>{t.rate}%</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{t.range}</div>
            </div>
            {currentTier?.tier === t.tier && (
              <div className="ml-auto text-xs px-2 py-1 rounded-full" style={{ background: `${t.color}18`, color: t.color, fontFamily: "var(--font-mono)" }}>
                CURRENT
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ color: "var(--foreground)", fontSize: 14, fontWeight: 500 }}>Progress to {nextTier.label} ({nextTier.rate}%)</span>
            <span style={{ color: nextTier.color, fontFamily: "var(--font-mono)", fontSize: 13 }}>{activeReferrals} / {nextTier.tier === 2 ? 25 : 75} active referrals</span>
          </div>
          <div className="h-3 rounded-full" style={{ background: "var(--secondary)" }}>
            <div
              className="h-3 rounded-full"
              style={{
                width: `${Math.min(100, (activeReferrals / (nextTier.tier === 2 ? 25 : 75)) * 100)}%`,
                background: `linear-gradient(90deg, ${currentTier?.color ?? "#4A90D9"}, ${nextTier.color})`,
              }}
            />
          </div>
          <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 8 }}>
            {(nextTier.tier === 2 ? 25 : 75) - activeReferrals} more referrals needed to reach {nextTier.label} ({nextTier.rate}% commission)
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Referrals", value: activeReferrals, sub: "Earning commission", color: "#48BB78" },
          { label: "Total Referrals", value: referrals.length, sub: "All time", color: "#4A90D9" },
          { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, sub: "All time", color: "var(--gold)" },
          { label: "Pending Payout", value: `$${pendingPayout.toFixed(2)}`, sub: "Next payout: Jul 1", color: "#9F7AEA" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ color: "var(--foreground)", fontSize: 13, fontWeight: 500 }}>{stat.label}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Your Referral Link</h3>
        <div className="flex gap-3">
          <div
            className="flex items-center gap-3 flex-1 px-4 py-3 rounded-xl border"
            style={{ background: "#EAF0FC", borderColor: "var(--border)" }}
          >
            <Link size={14} color="var(--gold)" />
            <span style={{ color: "var(--foreground)", fontSize: 13, fontFamily: "var(--font-mono)" }}>{affiliateLink}</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-3 rounded-xl transition-all"
            style={{ background: copied ? "rgba(72, 187, 120, 0.15)" : "var(--gold)", color: copied ? "#48BB78" : "#070D1A", fontWeight: 600, fontSize: 14 }}
          >
            {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
        <div className="flex gap-3 mt-3">
          {[
            { label: "Share via Email", action: () => { window.open(`mailto:?subject=Join Final Pass Down&body=Use my referral link: ${affiliateLink}`); } },
            { label: "Share via SMS",   action: () => { window.open(`sms:?body=Join Final Pass Down with my link: ${affiliateLink}`); } },
            { label: "Download Materials", action: () => { const a=document.createElement("a"); a.href="#"; alert("Marketing kit download started (demo)"); } },
          ].map((btn) => (
            <button key={btn.label} onClick={btn.action} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--secondary)", color: "var(--foreground)" }}>
              <Share2 size={13} /> {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Earnings chart — pure CSS */}
      <div className="p-6 rounded-xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)", marginBottom: 16 }}>Monthly Earnings</h3>
        {(() => {
          const maxEarned = Math.max(...monthlyEarnings.map(d => d.earned));
          return (
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:160 }}>
              {monthlyEarnings.map((d, i) => {
                const h = Math.round((d.earned / maxEarned) * 120);
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ color:"var(--muted-foreground)", fontSize:9, fontFamily:"var(--font-mono)" }}>${d.earned.toFixed(0)}</span>
                    <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                      <div style={{ width:"100%", height:h, background:"#2040C0", borderRadius:"4px 4px 0 0", opacity: i === monthlyEarnings.length-1 ? 1 : 0.55 }}/>
                    </div>
                    <span style={{ color:"var(--muted-foreground)", fontSize:9, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Referral table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="px-5 py-3 border-b" style={{ background: "var(--muted)", borderColor: "var(--border)" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--foreground)" }}>My Referrals</h3>
        </div>
        <div>
          {/* Header */}
          <div
            className="grid px-5 py-3"
            style={{ gridTemplateColumns: "1fr auto auto auto auto", background: "#EAF0FC", borderBottom: "1px solid var(--border)", gap: 16 }}
          >
            {["User", "Plan", "Joined", "Commission/Mo", "Status"].map((h) => (
              <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
            ))}
          </div>
          {referrals.map((ref, i) => (
            <div
              key={i}
              className="grid px-5 py-3 items-center border-b"
              style={{ gridTemplateColumns: "1fr auto auto auto auto", background: i % 2 === 0 ? "#FFFFFF" : "#F5F8FE", borderColor: "var(--border)", gap: 16 }}
            >
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 13 }}>{ref.name}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{ref.email}</div>
              </div>
              <div style={{ color: "var(--foreground)", fontSize: 13 }}>{ref.plan}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>{ref.joined}</div>
              <div style={{ color: ref.withinCap ? "var(--gold)" : "var(--muted-foreground)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                {ref.withinCap ? `$${ref.commission.toFixed(2)}` : "—"}
                {ref.withinCap && ref.monthsLeft <= 3 && (
                  <span style={{ color: "#F6AD55", fontSize: 10, marginLeft: 4 }}>{ref.monthsLeft}mo left</span>
                )}
              </div>
              <div>
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: ref.status === "active" ? "rgba(72, 187, 120, 0.12)" : "rgba(107, 114, 128, 0.12)",
                    color: ref.status === "active" ? "#48BB78" : "var(--muted-foreground)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {ref.status === "active" ? "ACTIVE" : "CAP REACHED"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cap notice */}
      <div className="flex gap-3 px-5 py-4 rounded-xl border" style={{ background: "rgba(74, 144, 217, 0.05)", borderColor: "rgba(74, 144, 217, 0.2)" }}>
        <Info size={15} color="#4A90D9" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ color: "var(--muted-foreground)", fontSize: 13, lineHeight: 1.7 }}>
          <strong style={{ color: "var(--foreground)" }}>12-Month Commission Cap:</strong> Affiliate commissions are earned for 12 months from each user's join date. After 12 months, that referral no longer generates commission. There is no cap on the number of referrals you can make.
        </div>
      </div>
    </div>
  );
}
