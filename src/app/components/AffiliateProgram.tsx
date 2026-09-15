import React, { useEffect, useState, useRef } from "react";
import { Copy, TrendingUp, DollarSign, CheckCircle, Share2, Link, Info } from "lucide-react";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import heroAffiliatePhoto from "../../imports/affiliateprogram_hero_photo.webp";

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

/* Referral rows for the signed-in affiliate, from affiliate_referrals. */
interface ReferralRow {
  id: string;
  plan: string;
  monthly_commission: number | string;
  months_remaining: number;
  status: "active" | "expired" | "cancelled";
  referred_at: string;
  referred: { full_name: string; email: string } | null;
}

const tiers = [
  { tier: 1, label: "Tier 1", range: "5–24 accounts", rate: 20, color: "#6FAE8B" },
  { tier: 2, label: "Tier 2", range: "25–74 accounts", rate: 25, color: "#6E90C9" },
  { tier: 3, label: "Tier 3", range: "74+ accounts", rate: 30, color: "#D99A6B" },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-aff so nothing else in the app is affected. */
const AFF_CSS = `
.fpd-aff{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-aff *{box-sizing:border-box;}
.fpd-aff-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-aff .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-aff .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-aff .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-aff .hbanner:hover .art{transform:scale(1.08);}
.fpd-aff .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-aff .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-aff .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-aff .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-aff .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-aff .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-aff .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-aff .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-aff .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-aff .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-aff .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-aff .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-aff .hbanner{min-height:auto;} .fpd-aff .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-aff .hbanner h1{font-size:29px;}}

.fpd-aff .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-aff .card.pad{padding:28px;}
.fpd-aff .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-aff .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-aff .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-aff .sec-title{font-size:19px;font-weight:600;color:${TEXT};display:flex;align-items:center;gap:10px;font-family:var(--font-display);letter-spacing:-0.01em;margin-bottom:16px;}
.fpd-aff .sec-title .tick{width:3px;height:15px;border-radius:2px;background:linear-gradient(180deg,${ACCENT2},${ACCENT});}

/* tier badges */
.fpd-aff .tier-row{display:flex;flex-wrap:wrap;gap:14px;}
.fpd-aff .tier-badge{display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:18px;flex:1;min-width:180px;border:1px solid rgba(255,255,255,0.08);background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);}
.fpd-aff .tier-badge.current{border:2px solid;}
.fpd-aff .tier-ico{border-radius:16px;padding:8px;display:flex;}
.fpd-aff .tier-lbl{font-family:var(--font-mono);font-size:14px;font-weight:700;}
.fpd-aff .tier-rate{font-size:22.5px;font-weight:700;font-family:var(--font-display);color:${TEXT};}
.fpd-aff .tier-range{color:${MUTED};font-size:14px;}
.fpd-aff .tier-current-tag{margin-left:auto;font-size:12.5px;padding:4px 9px;border-radius:99px;font-family:var(--font-mono);}

/* progress */
.fpd-aff .progress-track{height:12px;border-radius:99px;background:#0F1624;}
.fpd-aff .progress-fill{height:12px;border-radius:99px;}

/* KPI ledger */
.fpd-aff .kpi-stack{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;}
.fpd-aff .kpi-mini{display:flex;align-items:flex-start;gap:14px;padding:20px 18px;border-radius:18px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);transition:background .15s,border-color .15s,transform .15s;}
.fpd-aff .kpi-mini:hover{background:#101728;border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
.fpd-aff .kpi-mini-ico{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.08);}
.fpd-aff .kpi-mini-txt{flex:1;min-width:0;}
.fpd-aff .kpi-mini-val{font-family:var(--font-display);font-size:27.5px;font-weight:700;color:${TEXT};line-height:1.15;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;}
.fpd-aff .kpi-mini-lbl{font-size:14.5px;color:${MUTED};margin-top:4px;}
.fpd-aff .kpi-mini-sub{font-size:14px;color:${MUTED};margin-top:5px;display:flex;align-items:center;gap:6px;}
.fpd-aff .kpi-mini-sub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:640px){.fpd-aff .kpi-stack{grid-template-columns:1fr 1fr;}}
@media (max-width:430px){.fpd-aff .kpi-stack{grid-template-columns:1fr;}}

/* referral link */
.fpd-aff .link-row{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-aff .link-box{display:flex;align-items:center;gap:10px;flex:1;min-width:220px;padding:13px 16px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-aff .link-box span{color:${TEXT};font-size:16px;font-family:var(--font-mono);}
.fpd-aff .copy-btn{display:flex;align-items:center;gap:8px;padding:13px 20px;border-radius:16px;font-weight:600;font-size:16px;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-aff .share-row{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;}
.fpd-aff .share-btn{display:flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:15.5px;cursor:pointer;font-family:var(--font-body);}

/* earnings chart */
.fpd-aff .echart{display:flex;align-items:flex-end;gap:10px;height:160px;}
.fpd-aff .echart-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;}
.fpd-aff .echart-val{color:${MUTED};font-size:11px;font-family:var(--font-mono);}
.fpd-aff .echart-bar-wrap{width:100%;height:120px;display:flex;align-items:flex-end;}
.fpd-aff .echart-bar{width:100%;border-radius:4px 4px 0 0;background:${ACCENT};}

/* referral table */
.fpd-aff .table-hd{padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-aff .trow{display:grid;grid-template-columns:1fr auto auto auto auto;gap:16px;align-items:center;padding:14px 20px;}
.fpd-aff .trow.head{background:rgba(255,255,255,0.02);}
.fpd-aff .trow.head span{color:${MUTED};font-size:14px;font-family:var(--font-mono);}
.fpd-aff .trow.body{border-top:1px solid rgba(255,255,255,0.08);}
.fpd-aff .status-pill{padding:4px 10px;border-radius:99px;font-size:14px;font-family:var(--font-mono);}

/* cap notice */
.fpd-aff .tempty{padding:26px 20px;color:${MUTED};font-size:15px;line-height:1.6;text-align:center;}
.fpd-aff .earn-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;}
.fpd-aff .earn-cell{display:flex;flex-direction:column;gap:4px;padding:16px 18px;border-radius:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(91,110,225,0.14);}
.fpd-aff .earn-big{font-family:var(--font-display);font-size:27px;color:${TEXT};font-variant-numeric:tabular-nums;}
.fpd-aff .earn-lbl{color:${MUTED};font-size:14px;}
.fpd-aff .notice{display:flex;gap:12px;padding:16px 20px;border-radius:18px;background:rgba(91,110,225,0.05);border:1px solid rgba(91,110,225,0.18);}
.fpd-aff .notice p{color:${MUTED};font-size:16px;line-height:1.7;}
`;

export function AffiliateProgram() {
  const [copied, setCopied] = useState(false);
  const referralsRef = useRef<HTMLDivElement>(null);
  const { authUser } = useAuth();

  /* Everything below is this account's own affiliate row and its referrals.
     A member who has never joined the programme has no affiliates row, which
     is the enrolment state — not an error. */
  const [affiliate, setAffiliate] = useState<{
    referral_code: string; referral_url?: string; commission_rate: number;
    total_earned: number; pending_payout: number;
  } | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!authUser) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data: aff, error } = await db.getAffiliate(authUser.id);
      if (cancelled) return;
      // .single() 404s with PGRST116 when the member isn't enrolled yet.
      if (error && (error as { code?: string }).code !== "PGRST116") {
        setLoadError(error.message);
        setLoading(false);
        return;
      }
      if (!aff) { setLoading(false); return; }
      setAffiliate(aff);
      const { data: rows } = await db.listAffiliateReferrals(aff.id);
      if (cancelled) return;
      setReferrals((rows ?? []) as unknown as ReferralRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  const affiliateCode = affiliate?.referral_code ?? "";
  const affiliateLink = affiliate
    ? affiliate.referral_url || `https://finalpassdown.com/r/${affiliateCode}`
    : "";
  const activeReferrals = referrals.filter(r => r.status === "active").length;
  const currentTier = activeReferrals < 5 ? null : activeReferrals < 25 ? tiers[0] : activeReferrals < 75 ? tiers[1] : tiers[2];
  const nextTier = currentTier?.tier === 1 ? tiers[1] : currentTier?.tier === 2 ? tiers[2] : null;
  const currentRate = affiliate ? Math.round(Number(affiliate.commission_rate) * 100) : (currentTier?.rate ?? 20);
  const totalEarned = Number(affiliate?.total_earned ?? 0);
  const pendingPayout = Number(affiliate?.pending_payout ?? 0);

  const handleCopy = () => {
    if (!affiliateLink) return;
    navigator.clipboard?.writeText(affiliateLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const kpis = [
    { label: "Active Referrals", value: String(activeReferrals), sub: "Earning commission", icon: <TrendingUp size={14}/>, dot: POS },
    { label: "Total Referrals", value: String(referrals.length), sub: "All time", icon: <TrendingUp size={14}/>, dot: ACCENT2 },
    { label: "Total Earned", value: `$${totalEarned.toFixed(2)}`, sub: "All time", icon: <DollarSign size={14}/>, dot: WARN },
    { label: "Pending Payout", value: `$${pendingPayout.toFixed(2)}`, sub: "Paid at the next cycle", icon: <DollarSign size={14}/>, dot: ACCENT2 },
  ];

  return (
    <div className="fpd-aff">
      <style dangerouslySetInnerHTML={{ __html: AFF_CSS }} />
      <div className="fpd-aff-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroAffiliatePhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Earn &amp; Refer</span>
            <h1>Get paid for <span className="accent">sharing what works.</span></h1>
            <p>Share your referral link, earn recurring commission on every account that joins, and climb tiers as your network grows.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={handleCopy}><Copy size={15} /> Copy Referral Link</button>
              <button className="hbtn ghost" onClick={() => referralsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}><TrendingUp size={15} /> View My Referrals</button>
            </div>
          </div>
        </div>

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
          <div className="card pad">
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <span style={{ color: TEXT, fontSize: 17.5, fontWeight: 500 }}>Progress to {nextTier.label} ({nextTier.rate}%)</span>
              <span style={{ color: nextTier.color, fontFamily: "var(--font-mono)", fontSize: 16 }}>{activeReferrals} / {nextTier.tier === 2 ? 25 : 75} active referrals</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${Math.min(100, (activeReferrals / (nextTier.tier === 2 ? 25 : 75)) * 100)}%`, background: `linear-gradient(90deg, ${currentTier?.color ?? "#5BA7D6"}, ${nextTier.color})` }}/>
            </div>
            <div style={{ color: MUTED, fontSize: 15, marginTop: 8 }}>
              {(nextTier.tier === 2 ? 25 : 75) - activeReferrals} more referrals needed to reach {nextTier.label} ({nextTier.rate}% commission)
            </div>
          </div>
        )}

        {/* ── KPI ledger ── */}
        <div className="kpi-stack">
          {kpis.map(k => (
            <div key={k.label} className="kpi-mini">
              <span className="kpi-mini-ico" style={{ background:`linear-gradient(150deg,${k.dot}52,${k.dot}12)`, color: k.dot }}>{k.icon}</span>
              <div className="kpi-mini-txt">
                <div className="kpi-mini-val">{k.value}</div>
                <div className="kpi-mini-lbl">{k.label}</div>
                <div className="kpi-mini-sub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Referral link ── */}
        <div className="card pad">
          <h3 className="sec-title"><span className="tick"/>Your Referral Link</h3>
          <div className="link-row">
            <div className="link-box">
              <Link size={14} color="#FFFFFF" />
              <span>{affiliateLink}</span>
            </div>
            <button onClick={handleCopy} className="copy-btn"
              style={{ background: copied ? "rgba(95,190,145,0.16)" : "linear-gradient(180deg,#7E6BD8,#5B6EE1)", color: copied ? "#D99A6B" : "#fff" }}>
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

        {/* ── Earnings summary. A month-by-month chart would need a
            commission ledger; affiliates only stores running totals. ── */}
        <div className="card pad">
          <h3 className="sec-title"><span className="tick"/>Earnings</h3>
          <div className="earn-grid">
            <div className="earn-cell">
              <span className="earn-big">${totalEarned.toFixed(2)}</span>
              <span className="earn-lbl">Earned all time</span>
            </div>
            <div className="earn-cell">
              <span className="earn-big">${pendingPayout.toFixed(2)}</span>
              <span className="earn-lbl">Pending payout</span>
            </div>
            <div className="earn-cell">
              <span className="earn-big">{currentRate}%</span>
              <span className="earn-lbl">Your commission rate</span>
            </div>
          </div>
        </div>

        {/* ── Referral table ── */}
        <div className="card" style={{ overflow: "hidden" }} ref={referralsRef}>
          <div className="table-hd">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 19, color: TEXT }}>My Referrals</h3>
          </div>
          <div>
            <div className="trow head">
              {["User", "Plan", "Joined", "Commission/Mo", "Status"].map(h => <span key={h}>{h.toUpperCase()}</span>)}
            </div>
            {loading && <div className="tempty">Loading your referrals…</div>}
            {!loading && loadError && <div className="tempty" style={{ color: NEG }}>{loadError}</div>}
            {!loading && !loadError && referrals.length === 0 && (
              <div className="tempty">
                {affiliate
                  ? "No referrals yet. Share your link above — anyone who joins with it appears here."
                  : "You're not enrolled in the affiliate programme yet, so there's nothing to show."}
              </div>
            )}
            {referrals.map(ref => {
              const withinCap = ref.status === "active" && ref.months_remaining > 0;
              const commission = Number(ref.monthly_commission);
              return (
              <div key={ref.id} className="trow body">
                <div>
                  <div style={{ color: TEXT, fontSize: 16 }}>{ref.referred?.full_name ?? "Referred member"}</div>
                  <div style={{ color: MUTED, fontSize: 14 }}>{ref.referred?.email ?? "—"}</div>
                </div>
                <div style={{ color: TEXT, fontSize: 16 }}>{ref.plan}</div>
                <div style={{ color: MUTED, fontSize: 15 }}>
                  {new Date(ref.referred_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <div style={{ color: withinCap ? WARN : MUTED, fontFamily: "var(--font-mono)", fontSize: 16 }}>
                  {withinCap ? `$${commission.toFixed(2)}` : "—"}
                  {withinCap && ref.months_remaining <= 3 && (
                    <span style={{ color: WARN, fontSize: 12.5, marginLeft: 4 }}>{ref.months_remaining}mo left</span>
                  )}
                </div>
                <div>
                  <span className="status-pill" style={{ background: ref.status === "active" ? "rgba(95,190,145,0.16)" : "rgba(140,151,180,0.14)", color: ref.status === "active" ? "#D99A6B" : MUTED }}>
                    {ref.status === "active" ? "ACTIVE" : ref.status === "expired" ? "CAP REACHED" : "CANCELLED"}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        </div>

        {/* ── Cap notice ── */}
        <div className="notice">
          <Info size={15} color="#FFFFFF" style={{ flexShrink: 0, marginTop: 2 }} />
          <p><strong style={{ color: TEXT }}>12-Month Commission Cap:</strong> Affiliate commissions are earned for 12 months from each user's join date. After 12 months, that referral no longer generates commission. There is no cap on the number of referrals you can make.</p>
        </div>
      </div>
    </div>
  );
}
