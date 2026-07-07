import { copyToClipboard } from "../utils/clipboard";
import React, { useState } from "react";
import {
  Layers, Palette, Globe, Mail, Shield, Eye, Save, CheckCircle,
  RefreshCw, AlertTriangle, Monitor, Smartphone, Copy, ArrowRight,
  ToggleLeft, ToggleRight, Upload, ExternalLink
} from "lucide-react";
import { useWhiteLabel, type WhiteLabelConfig } from "../context/WhiteLabelContext";
import { toast } from "sonner";

const GLASS: React.CSSProperties = { background: "#FFFFFF", border: "1px solid rgba(108,92,231,0.1)", boxShadow: "0 2px 12px rgba(108,92,231,0.06)", borderRadius: 16 };
const GRID: React.CSSProperties = { backgroundImage: "linear-gradient(rgba(108,92,231,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(108,92,231,0.03) 1px,transparent 1px)", backgroundSize: "50px 50px" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const PRESET_COLORS = [
  { name: "Ocean Blue",    primary: "#6C5CE7", accent: "#8B7CF6" },
  { name: "Royal Purple",  primary: "#9F7AEA", accent: "#C4B5FD" },
  { name: "Emerald",       primary: "#48BB78", accent: "#68D391" },
  { name: "Amber",         primary: "#F6AD55", accent: "#FBD38D" },
  { name: "Rose",          primary: "#FC8181", accent: "#FEB2B2" },
  { name: "Indigo",        primary: "#5A67D8", accent: "#7F9CF5" },
  { name: "Teal",          primary: "#38B2AC", accent: "#4FD1C5" },
  { name: "Crimson",       primary: "#E53E3E", accent: "#FC8181" },
];

const PRESET_BRANDS = [
  { name: "Heritage Trust Co.",   tagline: "Protecting Family Legacies Since 1987", primary: "#9F7AEA", accent: "#C4B5FD", logo: "HT" },
  { name: "LegacyFirst",          tagline: "Your Life Story, Secured Forever",       primary: "#48BB78", accent: "#68D391", logo: "LF" },
  { name: "FutureLock",           tagline: "Lock In Your Legacy",                    primary: "#F6AD55", accent: "#FBD38D", logo: "FL" },
  { name: "EternalVault Pro",     tagline: "Enterprise Legacy Management",           primary: "#5A67D8", accent: "#7F9CF5", logo: "EV" },
];

type Tab = "brand" | "features" | "plans" | "domain" | "preview";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex-shrink-0 transition-all"
      style={{ width: 40, height: 22, borderRadius: 11, background: checked ? "#6C5CE7" : "rgba(108,92,231,0.1)", border: `1px solid ${checked ? "#6C5CE7" : "rgba(108,92,231,0.25)"}`, position: "relative", boxShadow: checked ? "0 0 12px rgba(108,92,231,0.3)" : "none" }}>
      <div style={{ position: "absolute", top: 2, borderRadius: "50%", width: 16, height: 16, background: "#fff", left: checked ? 20 : 2, transition: "left 0.15s" }} />
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label style={{ color: "#5A6A88", fontSize: 11, ...MONO, display: "block", marginBottom: 6 }}>{label.toUpperCase()}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)", color: "#0D1428", fontSize: 14, outline: "none" }} />
    </div>
  );
}

function LivePreview({ config }: { config: WhiteLabelConfig }) {
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");
  const pc = config.primaryColor;
  const ac = config.accentColor;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div style={{ color: "#5A6A88", fontSize: 11, ...MONO }}>LIVE PLATFORM PREVIEW</div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(108,92,231,0.06)" }}>
          {[["desktop", <Monitor size={13}/>], ["mobile", <Smartphone size={13}/>]].map(([id, icon]) => (
            <button key={id as string} onClick={() => setPreviewTab(id as any)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: previewTab === id ? pc : "transparent", color: previewTab === id ? "#F0F4FA" : "#5A6A88", fontWeight: previewTab === id ? 700 : 400 }}>
              {icon} {(id as string).charAt(0).toUpperCase() + (id as string).slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${pc}30`, boxShadow: `0 0 40px ${pc}10`, width: previewTab === "mobile" ? 380 : "100%", margin: "0 auto" }}>
        {/* Preview Nav */}
        <div style={{ background: "#EAF0FC", borderBottom: `1px solid ${pc}20`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${pc},${ac})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#F0F4FA" }}>{config.logoText}</div>
            {previewTab === "desktop" && (
              <div>
                <div style={{ color: pc, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em" }}>{config.companyName.toUpperCase()}</div>
                <div style={{ color: "#8A9AB8", fontSize: 8, letterSpacing: "0.1em" }}>{config.tagline}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {previewTab === "desktop" && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#48BB78", boxShadow: `0 0 6px #48BB78` }} />}
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${pc}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: pc, fontWeight: 700 }}>JD</div>
          </div>
        </div>

        {/* Preview Body */}
        <div style={{ background: "#F0F4FA", padding: 16, minHeight: 280, display: "grid", gridTemplateColumns: previewTab === "mobile" ? "1fr" : "180px 1fr", gap: 12 }}>
          {/* Sidebar preview */}
          {previewTab === "desktop" && (
            <div style={{ background: "#EAF0FC", borderRadius: 12, padding: 10, border: `1px solid ${pc}15` }}>
              {[
                { label: "Dashboard", active: true },
                { label: "Document Vault" },
                { label: "Final Wishes" },
                { label: "Medical Info" },
                ...(config.features.medicalInfo ? [] : []),
                { label: config.planNames.essential + " Plan" },
              ].map((item, i) => (
                <div key={i} style={{ padding: "6px 8px", borderRadius: 8, marginBottom: 2, background: item.active ? `${pc}18` : "transparent", borderLeft: item.active ? `2px solid ${pc}` : "2px solid transparent", color: item.active ? "#0D1428" : "#8A9AB8", fontSize: 11 }}>
                  {item.label}
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "8px", borderRadius: 8, background: `${pc}10`, border: `1px solid ${pc}25`, fontSize: 10, color: pc, fontWeight: 700, letterSpacing: "0.06em" }}>⚙ ADMIN PORTAL</div>
            </div>
          )}

          {/* Main content preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: `linear-gradient(135deg,${pc}18,${ac}08)`, borderRadius: 12, padding: 14, border: `1px solid ${pc}20` }}>
              <div style={{ fontSize: 10, color: "#5A6A88", marginBottom: 4 }}>WELCOME BACK</div>
              <div style={{ color: "#0D1428", fontSize: 15, fontWeight: 700 }}>James Doe</div>
              <div style={{ color: pc, fontSize: 9, marginTop: 2 }}>{config.companyName} · {config.planNames.premium}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["14 Documents", "3 Contacts", "16.9 GB Used", "$284 Earned"].map((stat, i) => (
                <div key={i} style={{ background: "#FFFFFF", borderRadius: 10, padding: 10, border: `1px solid ${pc}12` }}>
                  <div style={{ color: [pc, "#48BB78", "#F6AD55", "#9F7AEA"][i], fontSize: 14, fontWeight: 700 }}>{stat.split(" ")[0]}</div>
                  <div style={{ color: "#5A6A88", fontSize: 10 }}>{stat.split(" ").slice(1).join(" ")}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 12, border: `1px solid ${pc}12` }}>
              <div style={{ color: "#5A6A88", fontSize: 9, marginBottom: 8 }}>STORAGE USAGE</div>
              <div style={{ height: 6, borderRadius: 3, background: `${pc}15`, overflow: "hidden" }}>
                <div style={{ width: "68%", height: "100%", background: `linear-gradient(90deg,${pc},${ac})`, borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "10px", borderRadius: 10, background: `linear-gradient(135deg,${pc},${ac})`, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#F0F4FA" }}>
              Upload Document →
            </div>
          </div>
        </div>

        {/* Preview Footer */}
        <div style={{ background: "#EAF0FC", borderTop: `1px solid ${pc}12`, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#8A9AB8", fontSize: 9 }}>{config.footerText}</div>
          <div style={{ color: pc, fontSize: 9, ...MONO }}>Powered by {config.companyName}</div>
        </div>
      </div>
    </div>
  );
}

export function WhiteLabelConfig() {
  const { config, update, updateFeature, updatePlanName, reset } = useWhiteLabel();
  const [tab, setTab] = useState<Tab>("brand");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    toast.success(`White label configuration saved for "${config.companyName}"`);
    setTimeout(() => setSaved(false), 3000);
  };

  const applyPreset = (preset: typeof PRESET_BRANDS[0]) => {
    update({ companyName: preset.name, tagline: preset.tagline, primaryColor: preset.primary, accentColor: preset.accent, logoText: preset.logo, enabled: true });
    toast.success(`Applied "${preset.name}" brand preset`);
  };

  const featureList: { key: keyof WhiteLabelConfig["features"]; label: string; desc: string }[] = [
    { key: "vault", label: "Document Vault", desc: "Encrypted document storage" },
    { key: "finalWishes", label: "Final Wishes & Wills", desc: "Funeral planning, wills, questionnaire" },
    { key: "medicalInfo", label: "Medical Info", desc: "Emergency info, allergies, medications" },
    { key: "financialRecords", label: "Financial Records", desc: "Insurance, real estate, portfolios" },
    { key: "personalAssets", label: "Assets & Property", desc: "Vehicles, utilities, digital assets" },
    { key: "familyMemories", label: "Family & Memories", desc: "Photos, video messages, keepsakes" },
    { key: "contacts", label: "Contacts Hub", desc: "Legacy, guardian & emergency contacts" },
    { key: "videoMessages", label: "Video Messages", desc: "Personal recorded messages" },
    { key: "affiliate", label: "Affiliate Program", desc: "Referral commission system" },
    { key: "partnership", label: "Partnership Program", desc: "B2B recurring commissions" },
    { key: "secretVault", label: "Secret Vault", desc: "Ultra-sensitive encrypted folder" },
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "brand", label: "Brand Identity", icon: <Palette size={13} /> },
    { id: "features", label: "Feature Toggles", icon: <ToggleRight size={13} /> },
    { id: "plans", label: "Plan Names", icon: <Layers size={13} /> },
    { id: "domain", label: "Domain & Email", icon: <Globe size={13} /> },
    { id: "preview", label: "Live Preview", icon: <Eye size={13} /> },
  ];

  return (
    <div className="p-6 space-y-5 relative" style={{ maxWidth: 1200, ...GRID }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Layers size={15} color="#9F7AEA" />
            <span style={{ color: "#9F7AEA", fontSize: 11, ...MONO, letterSpacing: "0.12em" }}>ADMIN · WHITE LABEL SOLUTIONS</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "#0D1428" }}>White Label Configuration</h1>
          <p style={{ color: "#5A6A88", fontSize: 13, marginTop: 4 }}>Customize the platform under your brand. Changes preview live before publishing.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Enable toggle */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl glow-surface" style={GLASS}>
            <span style={{ color: "#5A6A88", fontSize: 12 }}>White Label {config.enabled ? "ON" : "OFF"}</span>
            <Toggle checked={config.enabled} onChange={v => update({ enabled: v })} />
          </div>
          <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm"
            style={{ background: "rgba(246,173,85,0.08)", color: "#F6AD55", border: "1px solid rgba(246,173,85,0.2)" }}>
            <RefreshCw size={13} /> Reset
          </button>
          <button onClick={handleSave} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: saved ? "rgba(72,187,120,0.15)" : "linear-gradient(135deg,#9F7AEA,#C4B5FD)", color: saved ? "#48BB78" : "#F0F4FA", boxShadow: saved ? "none" : "0 0 20px rgba(159,122,234,0.3)", border: saved ? "1px solid rgba(72,187,120,0.3)" : "none" }}>
            {saved ? <CheckCircle size={13} /> : <Save size={13} />}
            {saved ? "Saved!" : "Publish Config"}
          </button>
        </div>
      </div>

      {/* Status banner */}
      {config.enabled && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl border" style={{ background: "rgba(159,122,234,0.08)", borderColor: "rgba(159,122,234,0.3)" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#9F7AEA", boxShadow: "0 0 8px #9F7AEA" }} />
          <span style={{ color: "#C4B5FD", fontSize: 13 }}>White label mode is <strong>ACTIVE</strong> — platform displaying as "<strong>{config.companyName}</strong>" on {config.domain}</span>
          <button className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: "rgba(159,122,234,0.15)", color: "#9F7AEA" }}>
            <ExternalLink size={11} /> Visit Site
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.95)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
            style={{ background: tab === t.id ? "#9F7AEA" : "transparent", color: tab === t.id ? "#F0F4FA" : "#5A6A88", fontWeight: tab === t.id ? 700 : 400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* BRAND TAB */}
      {tab === "brand" && (
        <div className="space-y-5">
          {/* Quick presets */}
          <div className="p-5 rounded-2xl glow-surface" style={GLASS}>
            <div style={{ color: "#5A6A88", fontSize: 11, ...MONO, marginBottom: 12 }}>QUICK-APPLY BRAND PRESETS</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_BRANDS.map(preset => (
                <button key={preset.name} onClick={() => applyPreset(preset)}
                  className="p-4 rounded-xl text-left transition-all"
                  style={{ background: `linear-gradient(135deg,${preset.primary}18,${preset.accent}08)`, border: `1px solid ${preset.primary}30` }}>
                  <div className="flex items-center gap-2 mb-3">
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${preset.primary},${preset.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#F0F4FA" }}>{preset.logo}</div>
                    <span style={{ color: "#0D1428", fontSize: 12, fontWeight: 600 }}>{preset.name}</span>
                  </div>
                  <div style={{ color: "#5A6A88", fontSize: 11 }}>{preset.tagline}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Brand identity */}
            <div className="p-6 rounded-2xl space-y-4 glow-surface" style={GLASS}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#0D1428", marginBottom: 4 }}>Brand Identity</h3>
              <Field label="Company Name" value={config.companyName} onChange={v => update({ companyName: v })} placeholder="Your Company Name" />
              <Field label="Tagline" value={config.tagline} onChange={v => update({ tagline: v })} placeholder="Your brand tagline" />
              <Field label="Logo Text / Abbreviation" value={config.logoText} onChange={v => update({ logoText: v.slice(0, 3) })} placeholder="FPD" />
              <div>
                <label style={{ color: "#5A6A88", fontSize: 11, ...MONO, display: "block", marginBottom: 6 }}>LOGO UPLOAD</label>
                <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer glow-surface"
                  style={{ borderColor: "rgba(159,122,234,0.3)", background: "rgba(159,122,234,0.04)" }}
                  onClick={() => toast.info("File upload available in production build")}>
                  <Upload size={16} color="#9F7AEA" />
                  <span style={{ color: "#9F7AEA", fontSize: 13 }}>Upload logo (PNG, SVG) — Demo mode uses text</span>
                </div>
              </div>
              <Field label="Footer Text" value={config.footerText} onChange={v => update({ footerText: v })} />
            </div>

            {/* Colors */}
            <div className="p-6 rounded-2xl space-y-4 glow-surface" style={GLASS}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#0D1428", marginBottom: 4 }}>Brand Colors</h3>
              <div>
                <label style={{ color: "#5A6A88", fontSize: 11, ...MONO, display: "block", marginBottom: 8 }}>PRIMARY COLOR</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.primaryColor} onChange={e => update({ primaryColor: e.target.value })}
                    style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent" }} />
                  <input value={config.primaryColor} onChange={e => update({ primaryColor: e.target.value })}
                    className="flex-1 px-4 py-2.5 rounded-xl uppercase" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)", color: "#0D1428", fontSize: 14, outline: "none", ...MONO }} />
                </div>
              </div>
              <div>
                <label style={{ color: "#5A6A88", fontSize: 11, ...MONO, display: "block", marginBottom: 8 }}>ACCENT COLOR</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={config.accentColor} onChange={e => update({ accentColor: e.target.value })}
                    style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent" }} />
                  <input value={config.accentColor} onChange={e => update({ accentColor: e.target.value })}
                    className="flex-1 px-4 py-2.5 rounded-xl uppercase" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)", color: "#0D1428", fontSize: 14, outline: "none", ...MONO }} />
                </div>
              </div>
              <div>
                <div style={{ color: "#5A6A88", fontSize: 11, ...MONO, marginBottom: 10 }}>COLOR PRESETS</div>
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_COLORS.map(p => (
                    <button key={p.name} onClick={() => { update({ primaryColor: p.primary, accentColor: p.accent }); toast.success(`Applied ${p.name} colors`); }}
                      title={p.name}
                      className="flex items-center justify-center rounded-xl py-2.5 transition-all"
                      style={{ background: `linear-gradient(135deg,${p.primary},${p.accent})`, border: config.primaryColor === p.primary ? "2px solid white" : "2px solid transparent" }}>
                      <span style={{ color: "#F0F4FA", fontSize: 9, fontWeight: 700 }}>{p.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Live preview swatch */}
              <div className="p-4 rounded-xl" style={{ background: "#EAF0FC", border: `1px solid ${config.primaryColor}30` }}>
                <div style={{ color: "#5A6A88", fontSize: 10, ...MONO, marginBottom: 10 }}>PREVIEW</div>
                <div className="flex gap-2 flex-wrap">
                  <div style={{ width: 48, height: 32, borderRadius: 8, background: config.primaryColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#F0F4FA", fontWeight: 700 }}>Primary</div>
                  <div style={{ width: 48, height: 32, borderRadius: 8, background: config.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#F0F4FA", fontWeight: 700 }}>Accent</div>
                  <button style={{ padding: "6px 14px", borderRadius: 8, background: `linear-gradient(135deg,${config.primaryColor},${config.accentColor})`, color: "#F0F4FA", fontSize: 11, fontWeight: 700 }}>CTA Button</button>
                  <div style={{ padding: "6px 14px", borderRadius: 8, background: `${config.primaryColor}18`, color: config.primaryColor, fontSize: 11, border: `1px solid ${config.primaryColor}40` }}>Badge</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FEATURES TAB */}
      {tab === "features" && (
        <div className="space-y-3">
          <div className="px-5 py-3 rounded-2xl border" style={{ background: "rgba(108,92,231,0.06)", borderColor: "rgba(108,92,231,0.2)" }}>
            <p style={{ color: "#8AA3C8", fontSize: 13 }}>Toggle features on/off for this white label instance. Disabled features are completely hidden from end users. Changes take effect immediately.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {featureList.map(f => (
              <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl glow-surface" style={GLASS}>
                <div>
                  <div style={{ color: "#0D1428", fontSize: 14, fontWeight: 500 }}>{f.label}</div>
                  <div style={{ color: "#5A6A88", fontSize: 12, marginTop: 2 }}>{f.desc}</div>
                </div>
                <Toggle checked={config.features[f.key]} onChange={v => { updateFeature(f.key, v); toast(v ? `✓ ${f.label} enabled` : `✗ ${f.label} disabled`); }} />
              </div>
            ))}
          </div>
          <div className="p-4 rounded-2xl glow-surface" style={GLASS}>
            <div style={{ color: "#5A6A88", fontSize: 12 }}>
              <strong style={{ color: "#0D1428" }}>{Object.values(config.features).filter(Boolean).length}</strong> of {featureList.length} features enabled for this white label instance
            </div>
          </div>
        </div>
      )}

      {/* PLANS TAB */}
      {tab === "plans" && (
        <div className="space-y-4">
          <div className="px-5 py-3 rounded-2xl border" style={{ background: "rgba(108,92,231,0.06)", borderColor: "rgba(108,92,231,0.2)" }}>
            <p style={{ color: "#8AA3C8", fontSize: 13 }}>Customize plan names to match your brand. Pricing and features are managed separately in Subscription Config.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {([["starter","#48BB78"],["essential","#4A90D9"],["premium","#6C5CE7"],["legacyPro","#9F7AEA"],["enterprise","#ED8936"]] as const).map(([key, color], planIdx) => (
              <div key={key} className="p-6 rounded-2xl" style={{ ...GLASS, borderColor: `${color}30` }}>
                <div style={{ color, fontSize: 10, ...MONO, marginBottom: 8 }}>PLAN {planIdx+1} — {key.toUpperCase()}</div>
                <input value={config.planNames[key]} onChange={e => updatePlanName(key, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl mb-3"
                  style={{ background: `${color}10`, border: `1px solid ${color}30`, color: "#0D1428", fontSize: 18, fontWeight: 700, outline: "none", fontFamily: "var(--font-display)" }} />
                <div style={{ color, fontSize: 11, ...MONO }}>Displayed as: {config.planNames[key]}</div>
                <div style={{ color: "#8A9AB8", fontSize: 11, marginTop: 4 }}>Example: "Starter", "Professional", "Enterprise"</div>
              </div>
            ))}
          </div>
          <div className="p-5 rounded-2xl glow-surface" style={GLASS}>
            <div style={{ color: "#5A6A88", fontSize: 11, ...MONO, marginBottom: 10 }}>HOW PLAN NAMES APPEAR</div>
            <div className="flex gap-4">
              {(["essential", "premium", "legacyPro"] as const).map((k, i) => (
                <div key={k} className="px-4 py-2 rounded-xl text-sm" style={{ background: ["rgba(74,144,217,0.12)","rgba(108,92,231,0.12)","rgba(159,122,234,0.12)"][i], color: ["#4A90D9","#6C5CE7","#9F7AEA"][i] }}>
                  {config.planNames[k]}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DOMAIN TAB */}
      {tab === "domain" && (
        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl space-y-4 glow-surface" style={GLASS}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#0D1428" }}>Domain Configuration</h3>
            <Field label="Custom Domain" value={config.domain} onChange={v => update({ domain: v })} placeholder="app.yourcompany.com" />
            <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(72,187,120,0.06)", border: "1px solid rgba(72,187,120,0.2)" }}>
              <div style={{ color: "#5A6A88", fontSize: 11, ...MONO, marginBottom: 4 }}>DNS RECORD REQUIRED</div>
              <div style={{ color: "#48BB78", fontSize: 12, ...MONO }}>CNAME {config.domain} → proxy.finalpassdown.com</div>
            </div>
            <Field label="Terms of Service URL" value={config.termsUrl} onChange={v => update({ termsUrl: v })} placeholder="https://yourcompany.com/terms" />
            <Field label="Privacy Policy URL" value={config.privacyUrl} onChange={v => update({ privacyUrl: v })} placeholder="https://yourcompany.com/privacy" />
          </div>
          <div className="p-6 rounded-2xl space-y-4 glow-surface" style={GLASS}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "#0D1428" }}>Email Configuration</h3>
            <Field label="From Name" value={config.senderName} onChange={v => update({ senderName: v })} placeholder="Your Company Name" />
            <Field label="Support Email" value={config.supportEmail} onChange={v => update({ supportEmail: v })} placeholder="support@yourcompany.com" />
            <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.15)" }}>
              <div style={{ color: "#5A6A88", fontSize: 11, ...MONO, marginBottom: 6 }}>EMAIL PREVIEW</div>
              <div style={{ color: "#0D1428", fontSize: 13 }}>From: <strong>{config.senderName}</strong> &lt;{config.supportEmail}&gt;</div>
              <div style={{ color: "#5A6A88", fontSize: 12, marginTop: 4 }}>Subject: Welcome to {config.companyName} — Your Legacy Begins Today</div>
            </div>
            <div className="px-4 py-3 rounded-xl" style={{ background: "rgba(246,173,85,0.06)", border: "1px solid rgba(246,173,85,0.2)" }}>
              <AlertTriangle size={13} color="#F6AD55" style={{ display: "inline", marginRight: 8 }} />
              <span style={{ color: "#F6AD55", fontSize: 12 }}>Custom sending domain requires SPF/DKIM verification in production. Demo mode uses SendGrid shared domain.</span>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW TAB */}
      {tab === "preview" && (
        <div className="space-y-5">
          <LivePreview config={config} />
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "Brand Name", value: config.companyName, color: "#9F7AEA" },
              { label: "Primary Color", value: config.primaryColor, color: config.primaryColor },
              { label: "Domain", value: config.domain, color: "#6C5CE7" },
              { label: "Features Active", value: `${Object.values(config.features).filter(Boolean).length}/${featureList.length}`, color: "#48BB78" },
              { label: "Plan Names", value: `${config.planNames.starter} → ${config.planNames.essential} → ${config.planNames.premium} → ${config.planNames.legacyPro} → ${config.planNames.enterprise}`, color: "#F6AD55" },
              { label: "Status", value: config.enabled ? "LIVE" : "DRAFT", color: config.enabled ? "#48BB78" : "#F6AD55" },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-2xl glow-surface" style={GLASS}>
                <div style={{ color: "#5A6A88", fontSize: 11, ...MONO, marginBottom: 4 }}>{item.label.toUpperCase()}</div>
                <div style={{ color: item.color, fontSize: 13, fontWeight: 600, wordBreak: "break-all" }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg,#9F7AEA,#C4B5FD)", color: "#F0F4FA", boxShadow: "0 0 24px rgba(159,122,234,0.3)" }}>
              <Save size={14} /> Publish White Label Config
            </button>
            <button onClick={() => toast.info("Staging preview URL: https://preview-wl.finalpassdown.com")}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm"
              style={{ background: "rgba(159,122,234,0.1)", color: "#9F7AEA", border: "1px solid rgba(159,122,234,0.3)" }}>
              <ExternalLink size={14} /> Open Staging Preview
            </button>
            <button onClick={() => { copyToClipboard(JSON.stringify(config, null, 2)); toast.success("Config JSON copied") }}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl text-sm"
              style={{ background: "rgba(108,92,231,0.06)", color: "#5A6A88" }}>
              <Copy size={13} /> Export Config JSON
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
