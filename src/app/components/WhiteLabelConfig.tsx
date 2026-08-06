import { copyToClipboard } from "../utils/clipboard";
import React, { useState } from "react";
import {
  Layers, Palette, Globe, Eye, Save, CheckCircle,
  RefreshCw, AlertTriangle, Monitor, Smartphone, Copy,
  ToggleRight, Upload, ExternalLink
} from "lucide-react";
import { useWhiteLabel, type WhiteLabelConfig } from "../context/WhiteLabelContext";
import { toast } from "sonner";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";

/* "Royal Purple" and "Heritage Trust Co." intentionally keep their violet values (#5BA7D6/#6F9E94) —
   these are user-selectable brand preset OPTIONS, not leftover app styling debt. Do not recolor them. */
const PRESET_COLORS = [
  { name: "Ocean Blue",    primary: "#5B6EE1", accent: "#5B6EE1" },
  { name: "Royal Purple",  primary: "#5BA7D6", accent: "#6F9E94" },
  { name: "Emerald",       primary: "#48BB78", accent: "#68D391" },
  { name: "Amber",         primary: "#F6AD55", accent: "#FBD38D" },
  { name: "Rose",          primary: "#FC8181", accent: "#FEB2B2" },
  { name: "Indigo",        primary: "#5B6EE1", accent: "#5BA7D6" },
  { name: "Teal",          primary: "#6F9E94", accent: "#6F9E94" },
  { name: "Crimson",       primary: "#E53E3E", accent: "#FC8181" },
];

const PRESET_BRANDS = [
  { name: "Heritage Trust Co.",   tagline: "Protecting Family Legacies Since 1987", primary: "#5BA7D6", accent: "#6F9E94", logo: "HT" },
  { name: "LegacyFirst",          tagline: "Your Life Story, Secured Forever",       primary: "#48BB78", accent: "#68D391", logo: "LF" },
  { name: "FutureLock",           tagline: "Lock In Your Legacy",                    primary: "#F6AD55", accent: "#FBD38D", logo: "FL" },
  { name: "EternalVault Pro",     tagline: "Enterprise Legacy Management",           primary: "#5B6EE1", accent: "#5BA7D6", logo: "EV" },
];

type Tab = "brand" | "features" | "plans" | "domain" | "preview";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="fpd-wl-toggle" style={{ background: checked ? ACCENT : "rgba(91,110,225,0.14)", borderColor: checked ? ACCENT : "rgba(91,110,225,0.3)", boxShadow: checked ? "0 0 12px rgba(91,110,225,0.35)" : "none" }}>
      <div className="fpd-wl-toggle-knob" style={{ left: checked ? 20 : 2 }} />
    </button>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>
    </div>
  );
}

/* This preview intentionally renders a LIGHT mockup browser frame — it simulates how the
   white-labeled platform will actually look to end users, independent of this admin page's own theme. */
function LivePreview({ config }: { config: WhiteLabelConfig }) {
  const [previewTab, setPreviewTab] = useState<"desktop" | "mobile">("desktop");
  const pc = config.primaryColor;
  const ac = config.accentColor;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div style={{ color: MUTED, fontSize: 14, fontFamily: "var(--font-mono)" }}>LIVE PLATFORM PREVIEW</div>
        <div className="fpd-wl-seg">
          {[["desktop", <Monitor size={13}/>], ["mobile", <Smartphone size={13}/>]].map(([id, icon]) => (
            <button key={id as string} onClick={() => setPreviewTab(id as any)} className={previewTab === id ? "on" : ""}>
              {icon} {(id as string).charAt(0).toUpperCase() + (id as string).slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${pc}30`, boxShadow: `0 0 40px ${pc}10`, width: previewTab === "mobile" ? 380 : "100%", margin: "0 auto" }}>
        {/* Preview Nav */}
        <div style={{ background: "#EAF0FC", borderBottom: `1px solid ${pc}20`, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${pc},${ac})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#F0F4FA" }}>{config.logoText}</div>
            {previewTab === "desktop" && (
              <div>
                <div style={{ color: pc, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em" }}>{config.companyName.toUpperCase()}</div>
                <div style={{ color: "#8A9AB8", fontSize: 10, letterSpacing: "0.1em" }}>{config.tagline}</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {previewTab === "desktop" && <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#48BB78", boxShadow: `0 0 6px #48BB78` }} />}
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${pc}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: pc, fontWeight: 700 }}>JD</div>
          </div>
        </div>

        {/* Preview Body */}
        <div style={{ background: "#F0F4FA", padding: 16, minHeight: 280, display: "grid", gridTemplateColumns: previewTab === "mobile" ? "1fr" : "180px 1fr", gap: 12 }}>
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
                <div key={i} style={{ padding: "6px 8px", borderRadius: 8, marginBottom: 2, background: item.active ? `${pc}18` : "transparent", borderLeft: item.active ? `2px solid ${pc}` : "2px solid transparent", color: item.active ? "#0D1428" : "#8A9AB8", fontSize: 14 }}>
                  {item.label}
                </div>
              ))}
              <div style={{ marginTop: 16, padding: "8px", borderRadius: 8, background: `${pc}10`, border: `1px solid ${pc}25`, fontSize: 12.5, color: pc, fontWeight: 700, letterSpacing: "0.06em" }}>⚙ ADMIN PORTAL</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: `linear-gradient(135deg,${pc}18,${ac}08)`, borderRadius: 12, padding: 14, border: `1px solid ${pc}20` }}>
              <div style={{ fontSize: 12.5, color: "#5A6A88", marginBottom: 4 }}>WELCOME BACK</div>
              <div style={{ color: "#0D1428", fontSize: 19, fontWeight: 700 }}>James Doe</div>
              <div style={{ color: pc, fontSize: 11, marginTop: 2 }}>{config.companyName} · {config.planNames.premium}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {["14 Documents", "3 Contacts", "16.9 GB Used", "$284 Earned"].map((stat, i) => (
                <div key={i} style={{ background: "#FFFFFF", borderRadius: 10, padding: 10, border: `1px solid ${pc}12` }}>
                  <div style={{ color: [pc, "#D99A6B", "#F6AD55", "#6FAE8B"][i], fontSize: 17.5, fontWeight: 700 }}>{stat.split(" ")[0]}</div>
                  <div style={{ color: "#5A6A88", fontSize: 12.5 }}>{stat.split(" ").slice(1).join(" ")}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#FFFFFF", borderRadius: 10, padding: 12, border: `1px solid ${pc}12` }}>
              <div style={{ color: "#5A6A88", fontSize: 11, marginBottom: 8 }}>STORAGE USAGE</div>
              <div style={{ height: 6, borderRadius: 3, background: `${pc}15`, overflow: "hidden" }}>
                <div style={{ width: "68%", height: "100%", background: `linear-gradient(90deg,${pc},${ac})`, borderRadius: 3 }} />
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "10px", borderRadius: 10, background: `linear-gradient(135deg,${pc},${ac})`, cursor: "pointer", fontSize: 15, fontWeight: 700, color: "#F0F4FA" }}>
              Upload Document →
            </div>
          </div>
        </div>

        {/* Preview Footer */}
        <div style={{ background: "#EAF0FC", borderTop: `1px solid ${pc}12`, padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ color: "#8A9AB8", fontSize: 11 }}>{config.footerText}</div>
          <div style={{ color: pc, fontSize: 11, fontFamily: "var(--font-mono)" }}>Powered by {config.companyName}</div>
        </div>
      </div>
    </div>
  );
}

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-wl so nothing else in the app is affected. */
const WL_CSS = `
.fpd-wl{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-wl *{box-sizing:border-box;}
.fpd-wl-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-wl .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-wl .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-wl .card.pad{padding:28px;}
.fpd-wl .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-wl .pg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-wl .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin-bottom:4px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-wl .pg-sub{color:${MUTED};font-size:16px;}
.fpd-wl .head-acts{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.fpd-wl .enable-pill{display:flex;align-items:center;gap:10px;padding:9px 16px;}
.fpd-wl .enable-pill span{color:${MUTED};font-size:15px;}
.fpd-wl .btn-ghost{display:inline-flex;align-items:center;gap:6px;padding:9px 15px;border-radius:16px;font-size:16px;cursor:pointer;font-family:var(--font-body);border:1px solid;background:none;}
.fpd-wl .btn-primary{display:inline-flex;align-items:center;gap:6px;padding:9px 20px;border-radius:16px;font-size:16px;font-weight:700;color:#fff;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);box-shadow:0 6px 18px -8px rgba(91,110,225,0.7);font-family:var(--font-body);}

.fpd-wl-toggle{flex-shrink:0;width:40px;height:22px;border-radius:16px;position:relative;border:1px solid;cursor:pointer;transition:all .18s;}
.fpd-wl-toggle-knob{position:absolute;top:2px;border-radius:50%;width:16px;height:16px;background:#fff;transition:left .15s;}

/* status banner */
.fpd-wl .status-banner{display:flex;align-items:center;gap:12px;padding:13px 20px;border-radius:18px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.28);}
.fpd-wl .status-dot{width:7px;height:7px;border-radius:50%;background:${ACCENT};box-shadow:0 0 8px ${ACCENT};}
.fpd-wl .status-banner span{color:${SOFT};font-size:16px;}

/* tabs */
.fpd-wl-seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-wl-seg button{display:inline-flex;align-items:center;gap:6px;padding:9px 15px;border-radius:99px;font-size:16px;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);}
.fpd-wl-seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* fields */
.fpd-wl .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-wl .field input{width:100%;padding:11px 14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:17.5px;outline:none;font-family:var(--font-body);}
.fpd-wl .field input::placeholder{color:${FAINT};}
.fpd-wl .field input:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-wl .sec-title{font-family:var(--font-display);font-size:19px;color:${TEXT};margin-bottom:4px;}

/* presets */
.fpd-wl .preset-lbl{color:${MUTED};font-size:14px;font-family:var(--font-mono);margin-bottom:12px;}
.fpd-wl .brand-preset{padding:16px;border-radius:18px;text-align:left;cursor:pointer;font-family:var(--font-body);}
.fpd-wl .brand-preset-logo{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:700;color:#fff;}
.fpd-wl .brand-preset-name{color:${TEXT};font-size:15px;font-weight:600;}
.fpd-wl .brand-preset-tag{color:${MUTED};font-size:14px;}
.fpd-wl .color-preset{display:flex;align-items:center;justify-content:center;border-radius:16px;padding:10px 0;cursor:pointer;border:2px solid transparent;}
.fpd-wl .color-preset span{color:#F0F4FA;font-size:11px;font-weight:700;}
.fpd-wl .swatch-preview{padding:14px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-wl .upload-box{display:flex;align-items:center;gap:10px;padding:12px;border-radius:16px;border:2px dashed rgba(91,110,225,0.3);background:rgba(91,110,225,0.04);cursor:pointer;}
.fpd-wl .upload-box span{color:#6FAE8B;font-size:16px;}

/* feature toggles */
.fpd-wl .info-strip{padding:12px 20px;border-radius:18px;background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.2);}
.fpd-wl .info-strip p{color:${SOFT};font-size:16px;}
.fpd-wl .feature-row{display:flex;align-items:center;justify-content:space-between;padding:16px;}
.fpd-wl .feature-row-label{color:${TEXT};font-size:17.5px;font-weight:500;}
.fpd-wl .feature-row-desc{color:${MUTED};font-size:15px;margin-top:2px;}
.fpd-wl .feature-count{color:${MUTED};font-size:15px;}

/* plan cards */
.fpd-wl .plan-card{padding:22px;border-radius:22px;border:1px solid;background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);}
.fpd-wl .plan-badge{font-size:12.5px;font-family:var(--font-mono);margin-bottom:8px;}
.fpd-wl .plan-input{width:100%;padding:11px 14px;border-radius:16px;margin-bottom:10px;outline:none;font-family:var(--font-display);font-size:21.5px;font-weight:700;color:${TEXT};}
.fpd-wl .plan-displayed{font-size:14px;font-family:var(--font-mono);}
.fpd-wl .plan-example{color:${MUTED};font-size:14px;margin-top:4px;}
.fpd-wl .plan-tag{padding:8px 14px;border-radius:16px;font-size:16px;}

/* domain */
.fpd-wl .dns-box{padding:12px 14px;border-radius:16px;background:rgba(95,190,145,0.08);border:1px solid rgba(95,190,145,0.24);}
.fpd-wl .dns-box .dl{color:${MUTED};font-size:14px;font-family:var(--font-mono);margin-bottom:4px;}
.fpd-wl .dns-box .dv{color:#D99A6B;font-size:15px;font-family:var(--font-mono);}
.fpd-wl .email-preview-box{padding:12px 14px;border-radius:16px;background:rgba(91,110,225,0.06);border:1px solid rgba(91,110,225,0.18);}
.fpd-wl .warn-box{padding:12px 14px;border-radius:16px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.24);color:${WARN};font-size:15px;}

/* preview tab summary */
.fpd-wl .summary-tile{padding:16px;}
.fpd-wl .summary-lbl{color:${MUTED};font-size:14px;font-family:var(--font-mono);margin-bottom:4px;}
.fpd-wl .summary-val{font-size:16px;font-weight:600;word-break:break-all;}
`;

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
    <div className="fpd-wl">
      <style dangerouslySetInnerHTML={{ __html: WL_CSS }} />
      <div className="fpd-wl-grain" />

      <div className="wrap fpd-fade-in-up">
        {/* ── Header ── */}
        <div className="pg-head">
          <div>
            <div className="eyebrow"><Layers size={12} /> ADMIN · WHITE LABEL SOLUTIONS</div>
            <h1 className="pg-h1">White Label Configuration</h1>
            <div className="pg-sub">Customize the platform under your brand. Changes preview live before publishing.</div>
          </div>
          <div className="head-acts">
            <div className="card enable-pill">
              <span>White Label {config.enabled ? "ON" : "OFF"}</span>
              <Toggle checked={config.enabled} onChange={v => update({ enabled: v })} />
            </div>
            <button onClick={reset} className="btn-ghost" style={{ color: WARN, background: "rgba(217,165,94,0.08)", borderColor: "rgba(217,165,94,0.24)" }}>
              <RefreshCw size={13} /> Reset
            </button>
            <button onClick={handleSave} className="btn-primary" style={{ background: saved ? "rgba(95,190,145,0.16)" : undefined, color: saved ? "#D99A6B" : "#fff", boxShadow: saved ? "none" : undefined }}>
              {saved ? <CheckCircle size={13} /> : <Save size={13} />}
              {saved ? "Saved!" : "Publish Config"}
            </button>
          </div>
        </div>

        {/* ── Status banner ── */}
        {config.enabled && (
          <div className="status-banner">
            <div className="status-dot" />
            <span>White label mode is <strong>ACTIVE</strong> — platform displaying as "<strong>{config.companyName}</strong>" on {config.domain}</span>
            <button className="btn-ghost" style={{ marginLeft: "auto", color: "#6FAE8B", background: "rgba(91,110,225,0.14)", borderColor: "rgba(91,110,225,0.3)", padding: "6px 12px", fontSize: 14 }}>
              <ExternalLink size={11} /> Visit Site
            </button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="fpd-wl-seg">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── BRAND TAB ── */}
        {tab === "brand" && (
          <div className="space-y-5">
            <div className="card pad">
              <div className="preset-lbl">QUICK-APPLY BRAND PRESETS</div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PRESET_BRANDS.map(preset => (
                  <button key={preset.name} onClick={() => applyPreset(preset)} className="brand-preset"
                    style={{ background: `linear-gradient(135deg,${preset.primary}18,${preset.accent}08)`, border: `1px solid ${preset.primary}40` }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
                      <div className="brand-preset-logo" style={{ background: `linear-gradient(135deg,${preset.primary},${preset.accent})` }}>{preset.logo}</div>
                      <span className="brand-preset-name">{preset.name}</span>
                    </div>
                    <div className="brand-preset-tag">{preset.tagline}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div className="card pad space-y-4">
                <h3 className="sec-title">Brand Identity</h3>
                <Field label="Company Name" value={config.companyName} onChange={v => update({ companyName: v })} placeholder="Your Company Name" />
                <Field label="Tagline" value={config.tagline} onChange={v => update({ tagline: v })} placeholder="Your brand tagline" />
                <Field label="Logo Text / Abbreviation" value={config.logoText} onChange={v => update({ logoText: v.slice(0, 3) })} placeholder="FPD" />
                <div className="field">
                  <label>LOGO UPLOAD</label>
                  <div className="upload-box" onClick={() => toast.info("File upload available in production build")}>
                    <Upload size={16} color="#FFFFFF" />
                    <span>Upload logo (PNG, SVG) — Demo mode uses text</span>
                  </div>
                </div>
                <Field label="Footer Text" value={config.footerText} onChange={v => update({ footerText: v })} />
              </div>

              <div className="card pad space-y-4">
                <h3 className="sec-title">Brand Colors</h3>
                <div className="field">
                  <label>PRIMARY COLOR</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.primaryColor} onChange={e => update({ primaryColor: e.target.value })}
                      style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent" }} />
                    <input value={config.primaryColor} onChange={e => update({ primaryColor: e.target.value })} className="uppercase" style={{ flex: 1, fontFamily: "var(--font-mono)" }} />
                  </div>
                </div>
                <div className="field">
                  <label>ACCENT COLOR</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={config.accentColor} onChange={e => update({ accentColor: e.target.value })}
                      style={{ width: 48, height: 40, borderRadius: 8, border: "none", cursor: "pointer", background: "transparent" }} />
                    <input value={config.accentColor} onChange={e => update({ accentColor: e.target.value })} className="uppercase" style={{ flex: 1, fontFamily: "var(--font-mono)" }} />
                  </div>
                </div>
                <div>
                  <div className="preset-lbl">COLOR PRESETS</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PRESET_COLORS.map(p => (
                      <button key={p.name} onClick={() => { update({ primaryColor: p.primary, accentColor: p.accent }); toast.success(`Applied ${p.name} colors`); }}
                        title={p.name} className="color-preset"
                        style={{ background: `linear-gradient(135deg,${p.primary},${p.accent})`, borderColor: config.primaryColor === p.primary ? "white" : "transparent" }}>
                        <span>{p.name.split(" ")[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="swatch-preview">
                  <div className="preset-lbl">PREVIEW</div>
                  <div className="flex gap-2 flex-wrap">
                    <div style={{ width: 48, height: 32, borderRadius: 8, background: config.primaryColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#F0F4FA", fontWeight: 700 }}>Primary</div>
                    <div style={{ width: 48, height: 32, borderRadius: 8, background: config.accentColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#F0F4FA", fontWeight: 700 }}>Accent</div>
                    <button style={{ padding: "6px 14px", borderRadius: 8, background: `linear-gradient(135deg,${config.primaryColor},${config.accentColor})`, color: "#F0F4FA", fontSize: 14, fontWeight: 700, border: "none" }}>CTA Button</button>
                    <div style={{ padding: "6px 14px", borderRadius: 8, background: `${config.primaryColor}22`, color: config.primaryColor, fontSize: 14, border: `1px solid ${config.primaryColor}55` }}>Badge</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── FEATURES TAB ── */}
        {tab === "features" && (
          <div className="space-y-3">
            <div className="info-strip">
              <p>Toggle features on/off for this white label instance. Disabled features are completely hidden from end users. Changes take effect immediately.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {featureList.map(f => (
                <div key={f.key} className="card feature-row">
                  <div>
                    <div className="feature-row-label">{f.label}</div>
                    <div className="feature-row-desc">{f.desc}</div>
                  </div>
                  <Toggle checked={config.features[f.key]} onChange={v => { updateFeature(f.key, v); toast(v ? `✓ ${f.label} enabled` : `✗ ${f.label} disabled`); }} />
                </div>
              ))}
            </div>
            <div className="card pad">
              <div className="feature-count">
                <strong style={{ color: TEXT }}>{Object.values(config.features).filter(Boolean).length}</strong> of {featureList.length} features enabled for this white label instance
              </div>
            </div>
          </div>
        )}

        {/* ── PLANS TAB ── */}
        {tab === "plans" && (
          <div className="space-y-4">
            <div className="info-strip">
              <p>Customize plan names to match your brand. Pricing and features are managed separately in Subscription Config.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {([["starter",POS],["essential","#5BA7D6"],["premium",ACCENT],["legacyPro",ACCENT2],["enterprise","#ED8936"]] as const).map(([key, color], planIdx) => (
                <div key={key} className="plan-card" style={{ borderColor: `${color}40` }}>
                  <div className="plan-badge" style={{ color }}>PLAN {planIdx+1} — {key.toUpperCase()}</div>
                  <input value={config.planNames[key]} onChange={e => updatePlanName(key, e.target.value)}
                    className="plan-input" style={{ background: `${color}14`, border: `1px solid ${color}40` }} />
                  <div className="plan-displayed" style={{ color }}>Displayed as: {config.planNames[key]}</div>
                  <div className="plan-example">Example: "Starter", "Professional", "Enterprise"</div>
                </div>
              ))}
            </div>
            <div className="card pad">
              <div className="preset-lbl">HOW PLAN NAMES APPEAR</div>
              <div className="flex gap-4 flex-wrap">
                {(["essential", "premium", "legacyPro"] as const).map((k, i) => (
                  <div key={k} className="plan-tag" style={{ background: ["rgba(91,167,214,0.16)","rgba(91,110,225,0.16)","rgba(91,167,214,0.16)"][i], color: ["#6FAE8B","#6E90C9","#6FAE8B"][i] }}>
                    {config.planNames[k]}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DOMAIN TAB ── */}
        {tab === "domain" && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="card pad space-y-4">
              <h3 className="sec-title">Domain Configuration</h3>
              <Field label="Custom Domain" value={config.domain} onChange={v => update({ domain: v })} placeholder="app.yourcompany.com" />
              <div className="dns-box">
                <div className="dl">DNS RECORD REQUIRED</div>
                <div className="dv">CNAME {config.domain} → proxy.finalpassdown.com</div>
              </div>
              <Field label="Terms of Service URL" value={config.termsUrl} onChange={v => update({ termsUrl: v })} placeholder="https://yourcompany.com/terms" />
              <Field label="Privacy Policy URL" value={config.privacyUrl} onChange={v => update({ privacyUrl: v })} placeholder="https://yourcompany.com/privacy" />
            </div>
            <div className="card pad space-y-4">
              <h3 className="sec-title">Email Configuration</h3>
              <Field label="From Name" value={config.senderName} onChange={v => update({ senderName: v })} placeholder="Your Company Name" />
              <Field label="Support Email" value={config.supportEmail} onChange={v => update({ supportEmail: v })} placeholder="support@yourcompany.com" />
              <div className="email-preview-box">
                <div className="preset-lbl">EMAIL PREVIEW</div>
                <div style={{ color: TEXT, fontSize: 16 }}>From: <strong>{config.senderName}</strong> &lt;{config.supportEmail}&gt;</div>
                <div style={{ color: MUTED, fontSize: 15, marginTop: 4 }}>Subject: Welcome to {config.companyName} — Your Legacy Begins Today</div>
              </div>
              <div className="warn-box">
                <AlertTriangle size={13} color={WARN} style={{ display: "inline", marginRight: 8 }} />
                Custom sending domain requires SPF/DKIM verification in production. Demo mode uses SendGrid shared domain.
              </div>
            </div>
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {tab === "preview" && (
          <div className="space-y-5">
            <div className="card pad">
              <LivePreview config={config} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: "Brand Name", value: config.companyName, color: "#6FAE8B" },
                { label: "Primary Color", value: config.primaryColor, color: config.primaryColor },
                { label: "Domain", value: config.domain, color: "#6E90C9" },
                { label: "Features Active", value: `${Object.values(config.features).filter(Boolean).length}/${featureList.length}`, color: "#D99A6B" },
                { label: "Plan Names", value: `${config.planNames.starter} → ${config.planNames.essential} → ${config.planNames.premium} → ${config.planNames.legacyPro} → ${config.planNames.enterprise}`, color: WARN },
                { label: "Status", value: config.enabled ? "LIVE" : "DRAFT", color: config.enabled ? "#D99A6B" : WARN },
              ].map(item => (
                <div key={item.label} className="card summary-tile">
                  <div className="summary-lbl">{item.label.toUpperCase()}</div>
                  <div className="summary-val" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={handleSave} className="btn-primary">
                <Save size={14} /> Publish White Label Config
              </button>
              <button onClick={() => toast.info("Staging preview URL: https://preview-wl.finalpassdown.com")} className="btn-ghost" style={{ color: "#6FAE8B", background: "rgba(91,110,225,0.10)", borderColor: "rgba(91,110,225,0.3)" }}>
                <ExternalLink size={14} /> Open Staging Preview
              </button>
              <button onClick={() => { copyToClipboard(JSON.stringify(config, null, 2)); toast.success("Config JSON copied") }} className="btn-ghost" style={{ color: MUTED, background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}>
                <Copy size={13} /> Export Config JSON
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
