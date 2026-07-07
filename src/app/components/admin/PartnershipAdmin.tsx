import { copyToClipboard } from "../../utils/clipboard";
import React, { useState } from "react";
import { Handshake, Building, TrendingUp, Search, Eye, Edit, CheckCircle, XCircle, DollarSign, Send, Mail, X, Copy } from "lucide-react";
import { toast } from "sonner";

const partners = [
  { id: "PAR-0018", name: "First National Bank", type: "Banking Partner", email: "banking@fnb.com", joined: "Nov 1, 2024", accounts: 112, tier: 3, rate: 30, monthlyEarn: 3359.88, totalEarned: 38241.60, status: "active" },
  { id: "PAR-0015", name: "Summit Financial Group", type: "Financial Advisor", email: "ap@summitfg.com", joined: "Mar 3, 2025", accounts: 34, tier: 1, rate: 20, monthlyEarn: 1049.74, totalEarned: 14821.40, status: "active" },
  { id: "PAR-0012", name: "Sunrise Senior Living", type: "Senior Care", email: "admin@sunrise.com", joined: "Feb 28, 2025", accounts: 52, tier: 2, rate: 25, monthlyEarn: 1299.48, totalEarned: 18421.20, status: "active" },
  { id: "PAR-0009", name: "Greenfield Law Offices", type: "Estate Attorney", email: "billing@greenfieldlaw.com", joined: "Jan 15, 2025", accounts: 18, tier: 1, rate: 20, monthlyEarn: 449.82, totalEarned: 6284.80, status: "active" },
  { id: "PAR-0006", name: "Heritage Planning LLC", type: "Estate Planner", email: "contact@heritageplanning.com", joined: "Apr 20, 2026", accounts: 7, tier: 1, rate: 20, monthlyEarn: 174.93, totalEarned: 524.79, status: "active" },
  { id: "PAR-0003", name: "Coastal Wealth Mgmt", type: "Financial Advisor", email: "ops@coastalwealth.com", joined: "Aug 8, 2024", accounts: 0, tier: 1, rate: 0, monthlyEarn: 0, totalEarned: 3210.50, status: "inactive" },
];

const mrrGrowth = [
  { month: "Jan", mrr: 2840 }, { month: "Feb", mrr: 3920 }, { month: "Mar", mrr: 5140 },
  { month: "Apr", mrr: 6870 }, { month: "May", mrr: 8920 }, { month: "Jun", mrr: 10333 },
];

const tierColors = { 1: "#4A90D9", 2: "#6C5CE7", 3: "#48BB78" };
const tierLabels = { 1: "Tier 1 · 20%", 2: "Tier 2 · 25%", 3: "Tier 3 · 30%" };

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const GLASS: React.CSSProperties = { background:"#FFFFFF", border:"1px solid rgba(108,92,231,0.1)", borderRadius:16 };

function SendInviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("law_firm");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const orgTypes = [
    { id:"law_firm", label:"Law Firm" }, { id:"financial", label:"Financial Advisor" },
    { id:"insurance", label:"Insurance Agency" }, { id:"funeral", label:"Funeral Home" },
    { id:"medical", label:"Medical / Healthcare" }, { id:"senior", label:"Senior Care" },
    { id:"bank", label:"Bank / Credit Union" }, { id:"other", label:"Other" },
  ];

  const onboardingLink = `https://finalpassdown.com/partner/onboard?token=${Date.now().toString(36).toUpperCase()}&ref=admin`;

  const send = () => {
    if (!email.trim()) { toast.error("Email address is required"); return; }
    if (!orgName.trim()) { toast.error("Organization name is required"); return; }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success(`White Label onboarding invite sent to ${email}`);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-7 glow-surface" style={GLASS}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"#0D1428" }}>Send Onboarding Invite</h3>
            <p style={{ color:"#5A6A88", fontSize:12, marginTop:2 }}>Client receives a unique link to start their white label partner application.</p>
          </div>
          <button onClick={onClose} style={{ color:"#5A6A88" }}><X size={16}/></button>
        </div>

        <div className="space-y-4">
          <div>
            <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>ORGANIZATION TYPE</label>
            <div className="flex flex-wrap gap-2">
              {orgTypes.map(t => (
                <button key={t.id} onClick={() => setOrgType(t.id)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background:orgType===t.id?"rgba(108,92,231,0.1)":"rgba(108,92,231,0.04)", border:`1px solid ${orgType===t.id?"#6C5CE7":"rgba(108,92,231,0.12)"}`, color:orgType===t.id?"#6C5CE7":"#5A6A88" }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {[
            { label:"ORGANIZATION NAME", value:orgName, set:setOrgName, ph:"e.g. Carter & Associates Law" },
            { label:"RECIPIENT EMAIL",   value:email,   set:setEmail,   ph:"contact@organization.com", type:"email" },
          ].map(f => (
            <div key={f.label}>
              <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>{f.label}</label>
              <input type={f.type||"text"} value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-xl"
                style={{ background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", color:"#0D1428", fontSize:13, outline:"none" }}/>
            </div>
          ))}

          <div>
            <label style={{ color:"#5A6A88", fontSize:11, ...MONO, display:"block", marginBottom:6 }}>PERSONAL NOTE (optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
              placeholder="e.g. Hi Rebecca, we'd love to have your firm as a white label partner..."
              className="w-full px-4 py-3 rounded-xl resize-none"
              style={{ background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", color:"#0D1428", fontSize:13, outline:"none" }}/>
          </div>

          {/* Preview link */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.12)" }}>
            <span style={{ color:"#8A9AB8", fontSize:10, ...MONO, flexShrink:0 }}>INVITE LINK:</span>
            <span style={{ color:"#6C5CE7", fontSize:10, flex:1 }} className="truncate">{onboardingLink}</span>
            <button onClick={() => { copyToClipboard(onboardingLink); toast.success("Link copied!"); }}
              style={{ color:"#6C5CE7", flexShrink:0 }}><Copy size={12}/></button>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={send} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#6C5CE7,#8B7CF6)", color:"#F0F4FA", opacity:sending?0.7:1 }}>
              <Send size={14}/>{sending ? "Sending…" : "Send Invite Email"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-xl text-sm" style={{ background:"rgba(108,92,231,0.06)", color:"#5A6A88" }}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PartnershipAdmin() {
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);

  const filtered = partners.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.email.includes(search) || p.id.includes(search)
  );

  const totalAccounts = partners.filter(p => p.status === "active").reduce((s, p) => s + p.accounts, 0);
  const totalMRR = partners.filter(p => p.status === "active").reduce((s, p) => s + p.monthlyEarn, 0);
  const activePartners = partners.filter(p => p.status === "active").length;

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1200 }}>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Handshake size={16} color="#9F7AEA" />
          <span style={{ color: "#9F7AEA", fontSize: 12, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · PARTNERSHIP PROGRAM</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)" }}>Partnership Management</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 4 }}>Monitor strategic partners, account growth, and lifetime recurring commissions.</p>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#9F7AEA,#B794F4)", color:"#04080F", boxShadow:"0 0 20px rgba(159,122,234,0.35)" }}>
            <Send size={14}/> Send Onboarding Invite
          </button>
        </div>
      </div>
      {showInvite && <SendInviteModal onClose={() => setShowInvite(false)}/>}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Partners", value: activePartners, sub: "Organizations", color: "#9F7AEA" },
          { label: "Total Referred Accounts", value: totalAccounts.toLocaleString(), sub: "Lifetime active", color: "var(--gold)" },
          { label: "Monthly Recurring Revenue", value: `$${totalMRR.toFixed(2)}`, sub: "Commission payouts", color: "#48BB78" },
          { label: "Avg Accounts/Partner", value: Math.round(totalAccounts / activePartners), sub: "Active partners only", color: "#4A90D9" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ color: "var(--foreground)", fontSize: 13 }}>{stat.label}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 11, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR chart — pure CSS, no recharts */}
      <div className="p-6 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>Partnership MRR Growth</h3>
          <div style={{ color: "#48BB78", fontSize: 13 }}>+264% in 6 months</div>
        </div>
        {(() => {
          const maxMrr = Math.max(...mrrGrowth.map(d => d.mrr));
          return (
            <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:160 }}>
              {mrrGrowth.map((d, i) => {
                const barH = Math.round((d.mrr / maxMrr) * 120);
                const isLast = i === mrrGrowth.length - 1;
                return (
                  <div key={d.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <span style={{ color:"#8A9AB8", fontSize:9, fontFamily:"var(--font-mono)" }}>${(d.mrr/1000).toFixed(1)}k</span>
                    <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                      <div style={{
                        width:"100%", height:barH,
                        background: isLast ? "#9F7AEA" : "rgba(159,122,234,0.4)",
                        borderRadius:"4px 4px 0 0",
                        transition:"height 0.3s",
                      }}/>
                    </div>
                    <span style={{ color:"#8A9AB8", fontSize:9, fontFamily:"var(--font-mono)" }}>{d.month}</span>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Search size={14} color="var(--muted-foreground)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners by name, email, or ID..."
          style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 14, width: "100%" }}
        />
      </div>

      {/* Partners table */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div
          className="grid px-5 py-3"
          style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", background: "#EAF0FC", borderBottom: "1px solid var(--border)", gap: 16, alignItems: "center" }}
        >
          {["ID", "Organization", "Tier", "Accounts", "Monthly Earn", "Total Earned", "Status", "Actions"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {filtered.map((partner, i) => (
          <div
            key={partner.id}
            className="grid px-5 py-3 items-center border-b"
            style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", background: i % 2 === 0 ? "#FFFFFF" : "#F5F8FE", borderColor: "var(--border)", gap: 16 }}
          >
            <span style={{ color: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{partner.id}</span>
            <div className="flex items-center gap-3">
              <div className="rounded-lg p-1.5" style={{ background: "rgba(159,122,234,0.1)" }}>
                <Building size={13} color="#9F7AEA" />
              </div>
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 13 }}>{partner.name}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 11 }}>{partner.type} · {partner.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="rounded-full" style={{ width: 8, height: 8, background: (tierColors as any)[partner.tier] }} />
              <span style={{ color: (tierColors as any)[partner.tier], fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{(tierLabels as any)[partner.tier]}</span>
            </div>
            <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 13 }}>{partner.accounts}</span>
            <span style={{ color: "#9F7AEA", fontFamily: "var(--font-mono)", fontSize: 13 }}>${partner.monthlyEarn.toFixed(2)}</span>
            <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 13 }}>${partner.totalEarned.toLocaleString()}</span>
            <div
              className="px-2 py-1 rounded"
              style={{
                background: partner.status === "active" ? "rgba(72,187,120,0.12)" : "rgba(107,114,128,0.12)",
                color: partner.status === "active" ? "#48BB78" : "var(--muted-foreground)",
                fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600, width: "fit-content",
              }}
            >
              {partner.status.toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <button style={{ color: "#9F7AEA" }}><Eye size={14} /></button>
              <button style={{ color: "var(--muted-foreground)" }}><Edit size={14} /></button>
              {partner.status === "active"
                ? <button style={{ color: "#FC8181" }}><XCircle size={14} /></button>
                : <button style={{ color: "#48BB78" }}><CheckCircle size={14} /></button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
