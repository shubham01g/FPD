import { copyToClipboard } from "../../utils/clipboard";
import React, { useEffect, useState } from "react";
import { Mail, Edit2, Save, CheckCircle, Eye, Search, Copy, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../../services/adminApi";
import { useAdminFetch } from "../../hooks/useAdminFetch";

const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const GRID: React.CSSProperties = { backgroundImage: "linear-gradient(rgba(91,110,225,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.03) 1px,transparent 1px)", backgroundSize: "50px 50px" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

interface EmailTemplate {
  id: string;
  category: string;
  name: string;
  subject: string;
  trigger_event: string;
  variables: string[];
  html: string;
}

const categories = ["All","Account","Storage","Contacts","Subscriptions","Affiliate","Partnership","Security","White Label"];

export function EmailTemplates() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const { data, loading, error } = useAdminFetch(
    () => adminApi.get<{ templates: EmailTemplate[] }>("/email-templates"),
    [],
  );

  const templates = data?.templates ?? [];

  // Select the first template once the list loads (or after the active
  // selection is edited/replaced) — mirrors the old templates[0] default.
  useEffect(() => {
    if (!selected && templates.length > 0) {
      handleSelect(templates[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates]);

  const handleSelect = (t: EmailTemplate) => {
    setSelected(t);
    setEditSubject(t.subject);
    setEditBody(t.html);
    setEditing(false);
    setPreviewMode(false);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminApi.put(`/email-templates/${selected.id}`, { subject: editSubject, html: editBody });
      setSelected({ ...selected, subject: editSubject, html: editBody });
      setSaved(true);
      setEditing(false);
      toast.success(`Template "${selected.name}" saved successfully`);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!selected) return;
    setEditSubject(selected.subject);
    setEditBody(selected.html);
    setEditing(false);
    toast.info("Template reset to default");
  };

  const filtered = templates.filter(t =>
    (activeCategory === "All" || t.category === activeCategory) &&
    (t.name.toLowerCase().includes(search.toLowerCase()) || t.trigger_event.toLowerCase().includes(search.toLowerCase()))
  );

  const previewHtml = editBody
    .replace(/\{\{user_name\}\}/g, "James Doe")
    .replace(/\{\{plan_name\}\}/g, "Premium")
    .replace(/\{\{used_gb\}\}/g, "16.9")
    .replace(/\{\{limit_gb\}\}/g, "25")
    .replace(/\{\{otp_code\}\}/g, "482910")
    .replace(/\{\{expires_in\}\}/g, "10")
    .replace(/\{\{commission_amount\}\}/g, "$189.50")
    .replace(/\{\{referrals_count\}\}/g, "6")
    .replace(/\{\{tier\}\}/g, "Tier 1 · 20%")
    .replace(/\{\{new_tier\}\}/g, "Tier 2")
    .replace(/\{\{new_rate\}\}/g, "25")
    .replace(/\{\{amount\}\}/g, "$24.99")
    .replace(/\{\{billing_date\}\}/g, "Jun 1, 2026")
    .replace(/\{\{next_billing\}\}/g, "Jul 1, 2026")
    .replace(/\{\{payout_date\}\}/g, "Jul 1, 2026")
    .replace(/\{\{contact_name\}\}/g, "Sarah Johnson")
    .replace(/\{\{owner_name\}\}/g, "James Doe")
    .replace(/\{\{access_level\}\}/g, "Full vault access upon death confirmed by executor")
    .replace(/\{\{partner_name\}\}/g, "Dr. Rebecca Hayes")
    .replace(/\{\{organization\}\}/g, "Greenfield Law Offices")
    .replace(/\{\{initial_tier\}\}/g, "Tier 1 · 20%")
    .replace(/\{\{new_rate\}\}/g, "25")
    .replace(/\{\{device\}\}/g, "Chrome on Windows 11")
    .replace(/\{\{location\}\}/g, "Sacramento, CA · 192.168.1.1")
    .replace(/\{\{time\}\}/g, "Jun 12, 2026 at 2:41 PM PST")
    .replace(/\{\{account_manager\}\}/g, "Alex Rivera")
    .replace(/\{\{launch_date\}\}/g, "Jul 15, 2026")
    .replace(/\{\{login_url\}\}/g, "#")
    .replace(/\{\{reset_url\}\}/g, "#")
    .replace(/\{\{verify_url\}\}/g, "#")
    .replace(/\{\{upgrade_url\}\}/g, "#")
    .replace(/\{\{dashboard_url\}\}/g, "#")
    .replace(/\{\{invoice_url\}\}/g, "#")
    .replace(/\{\{partner_link\}\}/g, "https://finalpassdown.com/partner/abc123")
    .replace(/\{\{affiliate_link\}\}/g, "https://finalpassdown.com/r/FPD-JD-2024-XKTZ")
    .replace(/\{\{affiliate_code\}\}/g, "FPD-JD-2024-XKTZ")
    .replace(/\{\{setup_url\}\}/g, "#")
    .replace(/\{\{billing_month\}\}/g, "June 2026")
    .replace(/\{\{overage_gb\}\}/g, "4.2")
    .replace(/\{\{overage_charge\}\}/g, "$0.42")
    .replace(/\{\{secure_url\}\}/g, "#");

  return (
    <div className="p-6 space-y-5 relative" style={{ ...GRID }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Mail size={15} color="#FFFFFF" />
            <span style={{ color: "#6E90C9", fontSize: 14, ...MONO, letterSpacing: "0.12em" }}>ADMIN · EMAIL TEMPLATES</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32.5, color: "#E8EDF5" }}>Email Template Manager</h1>
          <p style={{ color: "#8A9AB8", fontSize: 16, marginTop: 4 }}>{templates.length} templates across {categories.length - 1} categories — all editable and live-previewed</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={GLASS}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#48BB78", boxShadow: "0 0 8px #48BB78" }} />
          <span style={{ color: "#D99A6B", fontSize: 14, ...MONO }}>SENDGRID CONNECTED</span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: "rgba(252,129,129,0.1)", border: "1px solid rgba(252,129,129,0.25)" }}>
          <AlertCircle size={15} color="#FC8181" />
          <span style={{ color: "#FC8181", fontSize: 16 }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "#8A9AB8" }}>
          <Loader2 size={18} className="animate-spin" /> Loading templates…
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:[grid-template-columns:300px_1fr]" style={{ gap: 16, minHeight: 700 }}>
        {/* Template list */}
        <div className="rounded-2xl overflow-hidden flex flex-col" style={GLASS}>
          {/* Search + filter */}
          <div className="p-3 border-b space-y-2" style={{ borderColor: "rgba(91,110,225,0.1)" }}>
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl" style={{ background: "#141B2E", border: "1px solid rgba(91,110,225,0.3)" }}>
              <Search size={12} color="#8A9AB8" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates..."
                style={{ background: "transparent", border: "none", outline: "none", color: "#FFFFFF", fontSize: 15, width: "100%" }} />
            </div>
            <div className="flex flex-wrap gap-1">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className="px-2.5 py-1 rounded-xl text-xs transition-all"
                  style={{ background: activeCategory === cat ? "#5B6EE1" : "rgba(91,110,225,0.06)", color: activeCategory === cat ? "#F0F4FA" : "#8A9AB8", fontWeight: activeCategory === cat ? 700 : 400 }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center" style={{ color: "#8A9AB8", fontSize: 14 }}>No templates match this search.</div>
            )}
            {filtered.map(t => (
              <button key={t.id} onClick={() => handleSelect(t)}
                className="w-full text-left px-4 py-3 border-b transition-all"
                style={{ borderColor: "rgba(91,110,225,0.06)", background: selected?.id === t.id ? "rgba(91,110,225,0.1)" : "transparent", borderLeft: selected?.id === t.id ? "2px solid #5B6EE1" : "2px solid transparent" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(91,110,225,0.08)", color: "#6E90C9", fontSize: 11, ...MONO }}>{t.category.toUpperCase()}</span>
                </div>
                <div style={{ color: selected?.id === t.id ? "#E8EDF5" : "#8A9AB8", fontSize: 16, fontWeight: 500 }}>{t.name}</div>
                <div style={{ color: "#8A9AB8", fontSize: 14, marginTop: 2 }}>{t.trigger_event}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Editor + Preview */}
        {selected && (
          <div className="rounded-2xl overflow-hidden flex flex-col" style={GLASS}>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(91,110,225,0.1)", background: "rgba(3,7,16,0.6)" }}>
              <div>
                <div style={{ color: "#E8EDF5", fontSize: 19, fontWeight: 600 }}>{selected.name}</div>
                <div style={{ color: "#8A9AB8", fontSize: 14, marginTop: 2 }}>Trigger: {selected.trigger_event}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewMode(!previewMode)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm"
                  style={{ background: previewMode ? "rgba(91,110,225,0.15)" : "rgba(91,110,225,0.06)", color: previewMode ? "#6E90C9" : "#8A9AB8", border: `1px solid ${previewMode ? "rgba(91,110,225,0.4)" : "rgba(91,110,225,0.15)"}` }}>
                  <Eye size={13} /> {previewMode ? "Edit" : "Preview"}
                </button>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm"
                    style={{ background: "rgba(91,110,225,0.08)", color: "#6E90C9", border: "1px solid rgba(91,110,225,0.25)" }}>
                    <Edit2 size={13} /> Edit
                  </button>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm disabled:opacity-50"
                      style={{ background: saved ? "rgba(72,187,120,0.15)" : "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: saved ? "#D99A6B" : "#F0F4FA", fontWeight: 700 }}>
                      {saved ? <CheckCircle size={13} /> : saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {saved ? "Saved!" : saving ? "Saving…" : "Save"}
                    </button>
                    <button onClick={handleReset} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm disabled:opacity-50"
                      style={{ background: "rgba(246,173,85,0.08)", color: "#F6AD55", border: "1px solid rgba(246,173,85,0.2)" }}>
                      <RefreshCw size={12} /> Reset
                    </button>
                  </>
                )}
                <button onClick={() => { copyToClipboard(editBody); toast.success("HTML copied to clipboard") }}
                  style={{ color: "#8A9AB8" }}><Copy size={14} /></button>
              </div>
            </div>

            {/* Variables */}
            <div className="px-5 py-2 border-b flex flex-wrap gap-2" style={{ borderColor: "rgba(91,110,225,0.06)", background: "rgba(91,110,225,0.04)" }}>
              <span style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO, alignSelf: "center" }}>VARIABLES:</span>
              {selected.variables.map(v => (
                <span key={v} className="px-2 py-0.5 rounded cursor-pointer" onClick={() => toast.info(`Variable: ${v}`)}
                  style={{ background: "rgba(91,110,225,0.08)", color: "#6E90C9", fontSize: 12.5, ...MONO }}>
                  {v}
                </span>
              ))}
            </div>

            {/* Subject line */}
            <div className="px-5 py-3 border-b" style={{ borderColor: "rgba(91,110,225,0.08)" }}>
              <div style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO, marginBottom: 6 }}>SUBJECT LINE</div>
              {editing ? (
                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl" style={{ background: "#141B2E", border: "1px solid rgba(91,110,225,0.3)", color: "#FFFFFF", fontSize: 17.5, outline: "none" }} />
              ) : (
                <div style={{ color: "#E8EDF5", fontSize: 17.5 }}>{editSubject}</div>
              )}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden">
              {previewMode ? (
                <div className="overflow-y-auto h-full p-4" style={{ background: "#f0f0f0" }}>
                  <iframe
                    srcDoc={previewHtml}
                    style={{ width: "100%", height: "100%", border: "none", borderRadius: 8, minHeight: 500 }}
                    title="Email Preview"
                    sandbox="allow-same-origin"
                  />
                </div>
              ) : editing ? (
                <textarea
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                  className="w-full h-full p-5"
                  style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#68D391", fontSize: 15, ...MONO, outline: "none", resize: "none", lineHeight: 1.7 }}
                />
              ) : (
                <div className="overflow-y-auto h-full p-5">
                  <pre style={{ color: "#68D391", fontSize: 15, ...MONO, whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
                    {editBody}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
