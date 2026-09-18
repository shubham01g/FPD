import { copyToClipboard } from "../../utils/clipboard";
import React, { useMemo, useState } from "react";
import { Handshake, Building, Search, Eye, Edit, CheckCircle, XCircle, Send, X, Copy, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch, ADMIN_LIVE_POLL_MS } from "../../hooks/useAdminFetch";

interface PartnerRow {
  id: string;
  organization_name: string;
  organization_type: string;
  contact_email: string;
  tier: 1 | 2 | 3;
  commission_rate: number;
  total_accounts: number;
  monthly_recurring: number;
  total_earned: number;
  status: "active" | "inactive" | "suspended" | "invited";
  joined_at: string;
  partner_code?: string;
}

interface PartnerAccountRow {
  id: string;
  plan: string;
  commission: number;
  referred_at: string;
  users: { email: string; full_name: string } | null;
}

const tierColors = { 1: "#5BA7D6", 2: "#5B6EE1", 3: "#48BB78" };
const tierLabels = { 1: "Tier 1 · 20%", 2: "Tier 2 · 25%", 3: "Tier 3 · 30%" };

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };

function SendInviteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("law_firm");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<{ partner_code: string } | null>(null);

  const orgTypes = [
    { id:"law_firm", label:"Law Firm" }, { id:"financial", label:"Financial Advisor" },
    { id:"insurance", label:"Insurance Agency" }, { id:"funeral", label:"Funeral Home" },
    { id:"medical", label:"Medical / Healthcare" }, { id:"senior", label:"Senior Care" },
    { id:"bank", label:"Bank / Credit Union" }, { id:"other", label:"Other" },
  ];

  const onboardingLink = created ? `https://finalpassdown.com/partner/onboard?ref=${created.partner_code}` : null;

  const send = async () => {
    if (!email.trim()) { toast.error("Email address is required"); return; }
    if (!orgName.trim()) { toast.error("Organization name is required"); return; }
    setSending(true);
    try {
      const res = await adminApi.post<{ partner: { partner_code: string } }>("/partnerships", {
        organizationName: orgName, organizationType: orgType, contactEmail: email, note: note || undefined,
      });
      setCreated(res.partner);
      onCreated();
      toast.success(`${orgName} added as a pending partner`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create the partner");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background:"rgba(0,0,0,0.6)", backdropFilter:"blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-7" style={GLASS}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:22.5, color:"#E8EDF5" }}>{created ? "Partner Added" : "Add a Pending Partner"}</h3>
            <p style={{ color:"#8A9AB8", fontSize:15, marginTop:2 }}>
              {created
                ? "No email was sent — this app has no email delivery set up yet. Copy the link below and send it to them yourself."
                : "Creates a pending partner record with a real onboarding link. There is no email sending configured, so nothing is emailed automatically."}
            </p>
          </div>
          <button onClick={onClose} style={{ color:"#8A9AB8" }}><X size={16}/></button>
        </div>

        {created ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background:"rgba(91,110,225,0.05)", border:"1px solid rgba(91,110,225,0.12)" }}>
              <span style={{ color:"#8A9AB8", fontSize:12.5, ...MONO, flexShrink:0 }}>ONBOARDING LINK:</span>
              <span style={{ color:"#6E90C9", fontSize:12.5, flex:1 }} className="truncate">{onboardingLink}</span>
              <button onClick={() => { copyToClipboard(onboardingLink!); toast.success("Link copied!"); }}
                style={{ color:"#6E90C9", flexShrink:0 }}><Copy size={12}/></button>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA" }}>
              Done
            </button>
          </div>
        ) : (
        <div className="space-y-4">
          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>ORGANIZATION TYPE</label>
            <div className="flex flex-wrap gap-2">
              {orgTypes.map(t => (
                <button key={t.id} onClick={() => setOrgType(t.id)}
                  className="px-3 py-1.5 rounded-2xl text-xs font-bold transition-all"
                  style={{ background:orgType===t.id?"rgba(91,110,225,0.1)":"rgba(91,110,225,0.04)", border:`1px solid ${orgType===t.id?"#5B6EE1":"rgba(91,110,225,0.12)"}`, color:orgType===t.id?"#6E90C9":"#8A9AB8" }}>
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
              <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>{f.label}</label>
              <input type={f.type||"text"} value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-4 py-3 rounded-2xl"
                style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none" }}/>
            </div>
          ))}

          <div>
            <label style={{ color:"#8A9AB8", fontSize:14, ...MONO, display:"block", marginBottom:6 }}>PERSONAL NOTE (optional)</label>
            <textarea value={note} onChange={e=>setNote(e.target.value)} rows={2}
              placeholder="e.g. Hi Rebecca, we'd love to have your firm as a white label partner..."
              className="w-full px-4 py-3 rounded-2xl resize-none"
              style={{ background:"#141B2E", border:"1px solid rgba(91,110,225,0.3)", color:"#FFFFFF", fontSize:16, outline:"none" }}/>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={send} disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm"
              style={{ background:"linear-gradient(135deg,#5B6EE1,#5B6EE1)", color:"#F0F4FA", opacity:sending?0.7:1 }}>
              <Send size={14}/>{sending ? "Creating…" : "Add Partner"}
            </button>
            <button onClick={onClose} className="px-5 py-3 rounded-2xl text-sm" style={{ background:"rgba(91,110,225,0.06)", color:"#8A9AB8" }}>Cancel</button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export function PartnershipAdmin() {
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [detailPartner, setDetailPartner] = useState<PartnerRow | null>(null);
  const [accounts, setAccounts] = useState<PartnerAccountRow[] | null>(null);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [editTier, setEditTier] = useState<1 | 2 | 3>(1);
  const [editRate, setEditRate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const { data, loading, error, refetch } = useAdminFetch(
    () => adminApi.get<{ partners: PartnerRow[] }>("/partnerships"),
    [],
    ADMIN_LIVE_POLL_MS,
  );
  const { data: trendData } = useAdminFetch(
    () => adminApi.get<{ trend: { month: string; mrr: number }[] }>("/partnerships/mrr-trend"),
    [],
    ADMIN_LIVE_POLL_MS,
  );
  const mrrGrowth = trendData?.trend ?? [];

  const partners = data?.partners ?? [];

  async function openDetail(partner: PartnerRow) {
    setDetailPartner(partner);
    setEditTier(partner.tier);
    setEditRate(String(partner.commission_rate));
    setAccounts(null);
    setAccountsLoading(true);
    try {
      const res = await adminApi.get<{ accounts: PartnerAccountRow[] }>(`/partnerships/${partner.id}/accounts`);
      setAccounts(res.accounts);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load referred accounts");
    } finally {
      setAccountsLoading(false);
    }
  }

  async function saveEdit() {
    if (!detailPartner) return;
    const rate = Number(editRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
      toast.error("Commission rate must be a decimal between 0 and 1 (e.g. 0.20 for 20%)");
      return;
    }
    setSavingEdit(true);
    try {
      await adminApi.patch(`/partnerships/${detailPartner.id}`, { tier: editTier, commission_rate: rate });
      toast.success("Partner updated");
      setDetailPartner(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update partner");
    } finally {
      setSavingEdit(false);
    }
  }

  const filtered = partners.filter(
    (p) => p.organization_name.toLowerCase().includes(search.toLowerCase()) || p.contact_email.includes(search) || p.id.includes(search)
  );

  const totalAccounts = partners.filter(p => p.status === "active").reduce((s, p) => s + p.total_accounts, 0);
  const totalMRR = partners.filter(p => p.status === "active").reduce((s, p) => s + Number(p.monthly_recurring), 0);
  const activePartners = partners.filter(p => p.status === "active").length;

  async function toggleStatus(partner: PartnerRow) {
    const nextStatus = partner.status === "active" ? "suspended" : "active";
    setSavingId(partner.id);
    try {
      await adminApi.patch(`/partnerships/${partner.id}`, { status: nextStatus });
      toast.success(`Partner ${nextStatus === "active" ? "reactivated" : "suspended"}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update partner");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Handshake size={16} color="#FFFFFF" />
          <span style={{ color: "#6FAE8B", fontSize: 15, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>ADMIN · PARTNERSHIP PROGRAM</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "var(--foreground)" }}>Partnership Management</h1>
            <p style={{ color: "var(--muted-foreground)", fontSize: 17.5, marginTop: 4 }}>Monitor strategic partners, account growth, and lifetime recurring commissions.</p>
          </div>
          <button onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm flex-shrink-0"
            style={{ background:"linear-gradient(135deg,#5BA7D6,#7E6BD8)", color:"#04080F", boxShadow:"0 0 20px rgba(91,167,214,0.35)" }}>
            <Send size={14}/> Send Onboarding Invite
          </button>
        </div>
      </div>
      {showInvite && <SendInviteModal onClose={() => setShowInvite(false)} onCreated={refetch}/>}

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--muted-foreground)" }}>
          <Loader2 size={18} className="animate-spin" /> Loading partners…
        </div>
      )}

      {!loading && (
      <>
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Partners", value: activePartners, sub: "Organizations", color: "#6FAE8B" },
          { label: "Total Referred Accounts", value: totalAccounts.toLocaleString(), sub: "Lifetime active", color: "var(--gold)" },
          { label: "Monthly Recurring Revenue", value: `$${totalMRR.toFixed(2)}`, sub: "Commission payouts", color: "#D99A6B" },
          { label: "Avg Accounts/Partner", value: activePartners ? Math.round(totalAccounts / activePartners) : 0, sub: "Active partners only", color: "#6FAE8B" },
        ].map((stat) => (
          <div key={stat.label} className="p-5 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
            <div style={{ color: "var(--foreground)", fontSize: 16 }}>{stat.label}</div>
            <div style={{ color: "var(--muted-foreground)", fontSize: 14, marginTop: 2 }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* MRR chart — real subscription revenue from partner-referred users
          (see /admin/partnerships/mrr-trend), pure CSS, no recharts */}
      <div className="p-6 rounded-2xl border" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--foreground)" }}>Partnership MRR Growth</h3>
          {(() => {
            const first = mrrGrowth[0]?.mrr ?? 0;
            const last = mrrGrowth[mrrGrowth.length - 1]?.mrr ?? 0;
            const growth = first > 0 ? Math.round(((last - first) / first) * 100) : null;
            return <div style={{ color: "#D99A6B", fontSize: 16 }}>{growth === null ? "—" : `${growth >= 0 ? "+" : ""}${growth}% in 6 months`}</div>;
          })()}
        </div>
        {mrrGrowth.every(d => d.mrr === 0) ? (
          <div style={{ color: "#8A9AB8", fontSize: 15, textAlign: "center", padding: "40px 0" }}>No succeeded subscription payments from partner-referred users in the last 6 months.</div>
        ) : (
        <div style={{ display:"flex", alignItems:"flex-end", gap:10, height:160 }}>
          {mrrGrowth.map((d, i) => {
            const maxMrr = Math.max(1, ...mrrGrowth.map(x => x.mrr));
            const barH = Math.round((d.mrr / maxMrr) * 120);
            const isLast = i === mrrGrowth.length - 1;
            return (
              <div key={d.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>${(d.mrr/1000).toFixed(1)}k</span>
                <div style={{ width:"100%", height:120, display:"flex", alignItems:"flex-end" }}>
                  <div style={{
                    width:"100%", height:barH,
                    background: isLast ? "#5BA7D6" : "rgba(91,167,214,0.4)",
                    borderRadius:"4px 4px 0 0",
                    transition:"height 0.3s",
                  }}/>
                </div>
                <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>{d.month.slice(5)}</span>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <Search size={14} color="var(--muted-foreground)" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search partners by name, email, or ID..."
          style={{ background: "transparent", border: "none", outline: "none", color: "var(--foreground)", fontSize: 17.5, width: "100%" }}
        />
      </div>

      {/* Partners table */}
      <div className="rounded-2xl border overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        <div
          className="grid px-5 py-3"
          style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", background: "rgba(255,255,255,0.08)", borderBottom: "1px solid var(--border)", gap: 16, alignItems: "center" }}
        >
          {["ID", "Organization", "Tier", "Accounts", "Monthly Earn", "Total Earned", "Status", "Actions"].map((h) => (
            <div key={h} style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{h.toUpperCase()}</div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center" style={{ color: "var(--muted-foreground)" }}>No partners match this search.</div>
        )}
        {filtered.map((partner, i) => (
          <div
            key={partner.id}
            className="grid px-5 py-3 items-center border-b"
            style={{ gridTemplateColumns: "auto 1fr auto auto auto auto auto auto", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.025)", borderColor: "var(--border)", gap: 16 }}
          >
            <span style={{ color: "var(--muted-foreground)", fontSize: 14, fontFamily: "var(--font-mono)" }}>{partner.id.slice(0, 8)}</span>
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-1.5" style={{ background: "rgba(91,167,214,0.1)" }}>
                <Building size={13} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ color: "var(--foreground)", fontSize: 16 }}>{partner.organization_name}</div>
                <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>{partner.organization_type} · {partner.contact_email}</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="rounded-full" style={{ width: 8, height: 8, background: (tierColors as any)[partner.tier] }} />
              <span style={{ color: (tierColors as any)[partner.tier], fontSize: 15, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{(tierLabels as any)[partner.tier]}</span>
            </div>
            <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 16 }}>{partner.total_accounts}</span>
            <span style={{ color: "#6FAE8B", fontFamily: "var(--font-mono)", fontSize: 16 }}>${Number(partner.monthly_recurring).toFixed(2)}</span>
            <span style={{ color: "var(--foreground)", fontFamily: "var(--font-mono)", fontSize: 16 }}>${Number(partner.total_earned).toLocaleString()}</span>
            <div
              className="px-2 py-1 rounded"
              style={{
                background: partner.status === "active" ? "rgba(72,187,120,0.12)" : "rgba(107,114,128,0.12)",
                color: partner.status === "active" ? "#D99A6B" : "var(--muted-foreground)",
                fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600, width: "fit-content",
              }}
            >
              {partner.status.toUpperCase()}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openDetail(partner)} style={{ color: "#6FAE8B" }}><Eye size={14} /></button>
              <button onClick={() => openDetail(partner)} style={{ color: "var(--muted-foreground)" }}><Edit size={14} /></button>
              <button
                disabled={savingId === partner.id}
                onClick={() => toggleStatus(partner)}
                style={{ color: partner.status === "active" ? "#FC8181" : "#D99A6B", opacity: savingId === partner.id ? 0.5 : 1 }}
              >
                {partner.status === "active" ? <XCircle size={14} /> : <CheckCircle size={14} />}
              </button>
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {/* Partner detail / edit */}
      {detailPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
          <div className="w-full max-w-lg rounded-2xl border p-7 max-h-[90vh] overflow-y-auto" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22.5, color: "var(--foreground)" }}>{detailPartner.organization_name}</h3>
                <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>{detailPartner.contact_email} · {detailPartner.organization_type}</div>
              </div>
              <button onClick={() => setDetailPartner(null)} style={{ color: "var(--muted-foreground)" }}>✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 14, display: "block", marginBottom: 4 }}>Tier</label>
                <select value={editTier} onChange={(e) => setEditTier(Number(e.target.value) as 1 | 2 | 3)} className="w-full px-3 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 16 }}>
                  <option value={1}>Tier 1</option>
                  <option value={2}>Tier 2</option>
                  <option value={3}>Tier 3</option>
                </select>
              </div>
              <div>
                <label style={{ color: "var(--muted-foreground)", fontSize: 14, display: "block", marginBottom: 4 }}>Commission Rate</label>
                <input value={editRate} onChange={(e) => setEditRate(e.target.value)} placeholder="0.20" className="w-full px-3 py-2 rounded-xl" style={{ background: "var(--secondary)", color: "var(--foreground)", fontSize: 16 }} />
              </div>
            </div>
            <button onClick={saveEdit} disabled={savingEdit} className="w-full py-2.5 rounded-2xl font-semibold disabled:opacity-50 mb-6" style={{ background: "rgba(91,110,225,0.18)", color: "#AEB9F5", fontSize: 16 }}>
              {savingEdit ? "Saving…" : "Save Changes"}
            </button>

            <h4 style={{ color: "var(--foreground)", fontSize: 17, marginBottom: 10 }}>Referred Accounts</h4>
            {accountsLoading && <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>Loading…</div>}
            {!accountsLoading && (accounts?.length ?? 0) === 0 && (
              <div style={{ color: "var(--muted-foreground)", fontSize: 15 }}>No referred accounts yet.</div>
            )}
            {!accountsLoading && accounts && accounts.length > 0 && (
              <div className="space-y-2">
                {accounts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div>
                      <div style={{ color: "var(--foreground)", fontSize: 15 }}>{a.users?.full_name ?? "Referred member"}</div>
                      <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{a.plan} · {new Date(a.referred_at).toLocaleDateString()}</div>
                    </div>
                    <span style={{ color: "#D99A6B", fontSize: 14, fontFamily: "var(--font-mono)" }}>${Number(a.commission).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
