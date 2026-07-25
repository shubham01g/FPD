import React, { useMemo, useState } from "react";
import {
  Layers, Palette, Globe, Mail, Eye, Save, CheckCircle, Check,
  Monitor, Smartphone, Sparkles, Crown, Building2, ArrowRight,
  ShieldCheck, RefreshCw, Type, AtSign, Rocket, Star, Lock,
} from "lucide-react";
import { useWhiteLabel } from "../context/WhiteLabelContext";
import { useWLPackages } from "../context/WLPackagesContext";
import { useWLEntitlement } from "../context/WLEntitlementContext";
import { type WLPackage, type BillingModel } from "../services/wlPackages";
import { toast } from "sonner";

/* ── Dark dashboard palette (matches the rest of the user portal) ── */
const GLASS: React.CSSProperties = { background: "#101728", border: "1px solid rgba(91,167,214,0.15)", boxShadow: "0 4px 24px rgba(91,167,214,0.08)", borderRadius: 20 };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };
const INPUT: React.CSSProperties = { background: "rgba(91,167,214,0.05)", border: "1px solid rgba(91,167,214,0.2)", color: "#FFFFFF", fontSize: 14, outline: "none", borderRadius: 12, padding: "11px 14px", width: "100%" };

const TEXT = "#FFFFFF";
const SOFT = "rgba(255,255,255,0.72)";
const MUTED = "rgba(255,255,255,0.55)";
const HILITE = "#5BA7D6";
const ACCENT = "#5B6EE1";
const ACCENT2 = "#7E6BD8";
const SUCCESS = "#48BB78";

const PRESET_COLORS = [
  { name: "Royal Blue", primary: "#5B6EE1", accent: "#5B6EE1" },
  { name: "Indigo", primary: "#5B6EE1", accent: "#5BA7D6" },
  { name: "Emerald", primary: "#2F9E6E", accent: "#48BB78" },
  { name: "Amber", primary: "#D98A2B", accent: "#F6AD55" },
  { name: "Rose", primary: "#D9536B", accent: "#FC8181" },
  { name: "Teal", primary: "#5A8078", accent: "#5A8078" },
  { name: "Violet", primary: "#7E6BD8", accent: "#7E6BD8" },
  { name: "Slate", primary: "#48566E", accent: "#7688A8" },
];

const TIER_ICON: Record<string, React.ReactNode> = {
  AGENCY: <Sparkles size={16} />,
  ENTERPRISE: <Crown size={16} />,
  INSTITUTIONAL: <Building2 size={16} />,
};

/* Human-readable price line for each billing model */
function billingLabel(b: BillingModel): { price: string; unit: string; setup: string } {
  switch (b.type) {
    case "flat_monthly":
      return { price: `$${b.flatMonthly.toLocaleString()}`, unit: "/mo flat", setup: `$${b.setupFee.toLocaleString()} setup` };
    case "per_user_flat":
      return { price: `$${b.perUserAmount.toFixed(2)}`, unit: "/user · mo", setup: `$${b.setupFee.toLocaleString()} setup · $${b.minMonthly.toLocaleString()}/mo min` };
    case "per_user_percentage":
      return { price: `${b.percentOfRevenue}%`, unit: "of user revenue", setup: `$${b.setupFee.toLocaleString()} setup · $${b.minMonthly.toLocaleString()}/mo min` };
  }
}

/* ── Small building blocks ─────────────────────────────────────────── */
function SectionCard({ icon, title, sub, children, step }: { icon: React.ReactNode; title: string; sub: string; children: React.ReactNode; step: number }) {
  return (
    <div className="p-6 sm:p-7 glow-surface" style={GLASS}>
      <div className="flex items-start gap-3.5 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(91,110,225,0.15)", color: HILITE }}>{icon}</div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ ...MONO, color: HILITE, fontSize: 11 }}>STEP {step}</span>
          </div>
          <h3 style={{ ...DISPLAY, fontSize: 18, color: TEXT, fontWeight: 600, marginTop: 2 }}>{title}</h3>
          <p style={{ color: MUTED, fontSize: 13, marginTop: 3, lineHeight: 1.6 }}>{sub}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, icon, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <div>
      <label style={{ color: MUTED, fontSize: 11, ...MONO, display: "block", marginBottom: 7 }}>{label.toUpperCase()}</label>
      <div className="relative">
        {icon && <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: MUTED }}>{icon}</span>}
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
          style={{ ...INPUT, paddingLeft: icon ? 40 : 14, opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "text" }} />
        {disabled && <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: MUTED }}><Lock size={13} /></span>}
      </div>
    </div>
  );
}

/* Paywall banner — shown in place of the config controls until payment clears */
function UnlockBanner({ onPurchase }: { onPurchase?: () => void }) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
      style={{ background: "linear-gradient(135deg,rgba(91,110,225,0.14),rgba(91,110,225,0.06))", border: "1px solid rgba(91,167,214,0.32)" }}>
      <div className="flex items-start gap-3.5 min-w-0">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(91,110,225,0.2)", color: HILITE }}><Lock size={18} /></div>
        <div className="min-w-0">
          <div style={{ ...DISPLAY, color: TEXT, fontSize: 16, fontWeight: 700 }}>White Label is locked</div>
          <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6, marginTop: 3 }}>
            Pick the partner package you want below, then activate to unlock branding, colors, and your custom domain.
          </p>
        </div>
      </div>
      {onPurchase && (
        <button onClick={onPurchase} className="flex-shrink-0 px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 fpd-btn-lift"
          style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", boxShadow: "0 8px 26px rgba(91,110,225,0.4)" }}>
          <Rocket size={15} /> Unlock White Label
        </button>
      )}
    </div>
  );
}

/* ── Live preview (mini branded platform) ──────────────────────────── */
function LivePreview({ name, logo, tagline, primary, accent }: { name: string; logo: string; tagline: string; primary: string; accent: string }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const navItems = ["Dashboard", "File Cabinet", "Legacy Vault", "Contacts"];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: MUTED, fontSize: 11, ...MONO }}>LIVE PLATFORM PREVIEW</span>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(91,167,214,0.06)" }}>
          {([["desktop", <Monitor size={13} key="d" />], ["mobile", <Smartphone size={13} key="m" />]] as const).map(([id, ic]) => (
            <button key={id} onClick={() => setDevice(id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: device === id ? primary : "transparent", color: device === id ? "#fff" : MUTED, fontWeight: device === id ? 700 : 500 }}>
              {ic} {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden mx-auto transition-all" style={{ border: `1px solid ${primary}40`, boxShadow: `0 0 40px ${primary}18`, width: device === "mobile" ? 300 : "100%", background: "#070A12" }}>
        {/* branded top bar */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "linear-gradient(90deg,rgba(91,110,225,0.10),transparent)", borderBottom: `1px solid ${primary}22` }}>
          <div className="flex items-center gap-2.5">
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${primary},${accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff", ...DISPLAY }}>{(logo || "WL").slice(0, 3)}</div>
            <div className="min-w-0">
              <div style={{ color: TEXT, fontSize: 13, fontWeight: 700, ...DISPLAY, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name || "Your Brand"}</div>
              {device === "desktop" && <div style={{ color: MUTED, fontSize: 9.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>{tagline || "Your tagline here"}</div>}
            </div>
          </div>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${accent}33`, border: `1px solid ${accent}55` }} />
        </div>
        {/* body */}
        <div className="flex" style={{ minHeight: 168 }}>
          {device === "desktop" && (
            <div className="py-3 px-2 flex flex-col gap-1" style={{ width: 132, borderRight: `1px solid ${primary}18` }}>
              {navItems.map((n, i) => (
                <div key={n} className="px-2.5 py-2 rounded-lg" style={{ background: i === 0 ? `${primary}22` : "transparent", color: i === 0 ? "#fff" : MUTED, fontSize: 11, fontWeight: i === 0 ? 600 : 400 }}>{n}</div>
              ))}
            </div>
          )}
          <div className="flex-1 p-4">
            <div style={{ color: TEXT, fontSize: 14, fontWeight: 700, ...DISPLAY, marginBottom: 3 }}>Welcome back</div>
            <div style={{ color: MUTED, fontSize: 10.5, marginBottom: 12 }}>Here's your legacy at a glance.</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {["Documents", "Contacts", "Storage"].map((k, i) => (
                <div key={k} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${primary}18` }}>
                  <div style={{ color: i === 0 ? primary : accent, fontSize: 15, fontWeight: 800, ...DISPLAY }}>{["128", "6", "62%"][i]}</div>
                  <div style={{ color: MUTED, fontSize: 8.5 }}>{k}</div>
                </div>
              ))}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg" style={{ background: `linear-gradient(135deg,${primary},${accent})`, color: "#fff", fontSize: 11, fontWeight: 700 }}>
              Add to Vault <ArrowRight size={12} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────── */
export function WhiteLabelStudio({ onPurchase }: { onPurchase?: () => void } = {}) {
  const { config, update } = useWhiteLabel();
  const { isEntitled } = useWLEntitlement();
  const { packages } = useWLPackages();
  const activePackages = useMemo(() => packages.filter(p => p.active), [packages]);

  /* The section is always visible; every branding control stays inert until paid. */
  const locked = !isEntitled;

  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const publish = () => {
    // Final paywall check. Publishing provisions branding + domain, so it is
    // gated here too rather than trusting the disabled state of the controls.
    if (locked) { onPurchase?.(); return; }
    if (!config.companyName.trim()) { toast.error("Add your brand name first."); return; }
    if (!selectedTier && activePackages.length) { toast.error("Choose a partner package to publish."); return; }
    update({ enabled: true });
    toast.success(`${config.companyName} is live — your white-label portal is published (demo).`);
  };

  const resetBrand = () => {
    update({ primaryColor: "#5B6EE1", accentColor: "#5B6EE1" });
    toast.success("Colors reset to Royal Blue.");
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" style={{ fontFamily: "var(--font-body)" }}>
      {/* ── Hero ── */}
      <div className="relative overflow-hidden p-7 sm:p-9" style={{ ...GLASS, background: "linear-gradient(135deg,#0E1830,#101728 60%)" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(91,110,225,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.06) 1px,transparent 1px)", backgroundSize: "42px 42px", opacity: 0.5, pointerEvents: "none" }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4" style={{ background: "rgba(91,110,225,0.12)", border: "1px solid rgba(91,110,225,0.3)" }}>
            <Layers size={13} color={HILITE} />
            <span style={{ color: HILITE, fontSize: 11, letterSpacing: "0.12em", ...MONO }}>WHITE LABEL STUDIO</span>
          </div>
          <h1 style={{ ...DISPLAY, fontSize: "clamp(1.7rem,3.4vw,2.5rem)", fontWeight: 800, color: TEXT, lineHeight: 1.1, letterSpacing: "-0.02em", maxWidth: 640 }}>
            Offer Final Pass Down under <span style={{ background: `linear-gradient(120deg,${ACCENT2},${HILITE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>your own brand</span>
          </h1>
          <p style={{ color: SOFT, fontSize: 15.5, lineHeight: 1.7, maxWidth: 560, marginTop: 12 }}>
            Turn the entire platform into your product. Add your logo, colors, and domain, pick a partner package, and give your clients a fully-branded legacy vault — powered by us, badged as you.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6">
            {["Your domain & branding", "Lifetime recurring commission", "Dedicated onboarding"].map(t => (
              <span key={t} className="flex items-center gap-2" style={{ color: MUTED, fontSize: 13 }}><CheckCircle size={14} color={SUCCESS} /> {t}</span>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl" style={{ background: config.enabled ? "rgba(72,187,120,0.12)" : "rgba(91,167,214,0.08)", border: `1px solid ${config.enabled ? "rgba(72,187,120,0.35)" : "rgba(91,167,214,0.2)"}` }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: config.enabled ? SUCCESS : MUTED, boxShadow: config.enabled ? `0 0 10px ${SUCCESS}` : "none" }} />
            <span style={{ color: config.enabled ? SUCCESS : MUTED, fontSize: 12.5, fontWeight: 600 }}>{config.enabled ? "White-label portal is LIVE" : "Draft — not published yet"}</span>
          </div>
        </div>
      </div>

      {locked && <UnlockBanner onPurchase={onPurchase} />}

      <div className="grid lg:grid-cols-5 gap-6 items-start">
        {/* ── Left: config ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Brand identity */}
          <SectionCard step={1} icon={<Type size={18} />} title="Brand identity" sub="This is what your clients see across the whole platform and every email.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Brand name" value={config.companyName} onChange={v => update({ companyName: v })} placeholder="Heritage Trust Co." icon={<Building2 size={15} />} disabled={locked} />
              <Field label="Logo initials" value={config.logoText} onChange={v => update({ logoText: v.slice(0, 3).toUpperCase() })} placeholder="HT" icon={<Sparkles size={15} />} disabled={locked} />
            </div>
            <div className="mt-4">
              <Field label="Tagline" value={config.tagline} onChange={v => update({ tagline: v })} placeholder="Protecting family legacies since 1987" disabled={locked} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <Field label="Support email" value={config.supportEmail} onChange={v => update({ supportEmail: v })} placeholder="support@yourbrand.com" icon={<Mail size={15} />} disabled={locked} />
              <Field label="Email sender name" value={config.senderName} onChange={v => update({ senderName: v })} placeholder="Heritage Trust" icon={<AtSign size={15} />} disabled={locked} />
            </div>
          </SectionCard>

          {/* Colors */}
          <SectionCard step={2} icon={<Palette size={18} />} title="Brand colors" sub="Pick a preset or set exact hex values — they theme buttons, highlights, and accents everywhere.">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5 mb-5">
              {PRESET_COLORS.map(c => {
                const on = config.primaryColor.toLowerCase() === c.primary.toLowerCase();
                return (
                  <button key={c.name} title={locked ? "Unlock White Label to change colors" : c.name} disabled={locked}
                    onClick={() => update({ primaryColor: c.primary, accentColor: c.accent })}
                    className="aspect-square rounded-xl flex items-center justify-center transition-all"
                    style={{ background: `linear-gradient(135deg,${c.primary},${c.accent})`, border: on ? "2px solid #fff" : "2px solid transparent", boxShadow: on ? `0 0 16px ${c.primary}88` : "none", transform: on ? "scale(1.05)" : "none", opacity: locked ? 0.45 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
                    {on && <Check size={16} color="#fff" />}
                  </button>
                );
              })}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {([["Primary", "primaryColor"], ["Accent", "accentColor"]] as const).map(([lbl, key]) => (
                <div key={key}>
                  <label style={{ color: MUTED, fontSize: 11, ...MONO, display: "block", marginBottom: 7 }}>{lbl.toUpperCase()} COLOR</label>
                  <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-2" style={{ background: "rgba(91,167,214,0.05)", border: "1px solid rgba(91,167,214,0.2)", opacity: locked ? 0.5 : 1 }}>
                    <input type="color" value={(config as any)[key]} onChange={e => update({ [key]: e.target.value } as any)} disabled={locked}
                      style={{ width: 34, height: 34, border: "none", borderRadius: 8, background: "transparent", cursor: locked ? "not-allowed" : "pointer", padding: 0 }} />
                    <input value={(config as any)[key]} onChange={e => update({ [key]: e.target.value } as any)} disabled={locked}
                      style={{ ...INPUT, ...MONO, border: "none", background: "transparent", padding: 0, textTransform: "uppercase", cursor: locked ? "not-allowed" : "text" }} />
                    {locked && <Lock size={13} color={MUTED} style={{ flexShrink: 0 }} />}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={resetBrand} disabled={locked} className="inline-flex items-center gap-1.5 mt-4 text-xs" style={{ color: MUTED, opacity: locked ? 0.45 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
              <RefreshCw size={12} /> Reset colors
            </button>
          </SectionCard>

          {/* Domain */}
          <SectionCard step={3} icon={<Globe size={18} />} title="Custom domain" sub="Run the platform on your own web address. We'll issue the SSL certificate automatically.">
            <Field label="Portal domain" value={config.domain} onChange={v => update({ domain: v })} placeholder="app.yourbrand.com" icon={<Globe size={15} />} disabled={locked} />
            <div className="flex items-start gap-2.5 mt-4 p-3.5 rounded-xl" style={{ background: "rgba(91,110,225,0.06)", border: "1px solid rgba(91,110,225,0.15)" }}>
              <ShieldCheck size={15} color={HILITE} style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.65 }}>
                Point a <span style={{ color: SOFT, ...MONO }}>CNAME</span> record at <span style={{ color: HILITE, ...MONO }}>portals.finalpassdown.com</span> and we handle the rest — HTTPS, renewals, and routing. Your clients never see our name in the URL.
              </p>
            </div>
          </SectionCard>

          {/* Packages */}
          <SectionCard step={4} icon={<Crown size={18} />} title="Choose your partner package" sub="Your billing model and the commission you earn on every subscription your clients pay.">
            <div className="space-y-3">
              {activePackages.map(pkg => {
                const bl = billingLabel(pkg.billing);
                const on = selectedTier === pkg.id;
                return (
                  <button key={pkg.id} onClick={() => setSelectedTier(pkg.id)} className="w-full text-left rounded-2xl p-4 transition-all"
                    style={{ background: on ? "rgba(91,110,225,0.1)" : "rgba(255,255,255,0.02)", border: `1.5px solid ${on ? pkg.color : "rgba(91,167,214,0.15)"}`, boxShadow: on ? `0 0 26px ${pkg.color}30` : "none" }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${pkg.color}22`, color: pkg.color }}>{TIER_ICON[pkg.tier] ?? <Star size={16} />}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span style={{ ...DISPLAY, color: TEXT, fontSize: 15.5, fontWeight: 700 }}>{pkg.name}</span>
                            {pkg.badge && <span className="px-2 py-0.5 rounded-full" style={{ background: `${pkg.color}22`, color: pkg.color, fontSize: 10, fontWeight: 700, ...MONO }}>{pkg.badge}</span>}
                          </div>
                          <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{pkg.userLimitLabel} · <span style={{ color: SUCCESS }}>{pkg.commission}% lifetime commission</span></div>
                          <div style={{ color: MUTED, fontSize: 11, marginTop: 3, ...MONO }}>{bl.setup}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div style={{ ...DISPLAY, color: on ? pkg.color : TEXT, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{bl.price}</div>
                        <div style={{ color: MUTED, fontSize: 10.5, marginTop: 2 }}>{bl.unit}</div>
                        <div className="mt-2 flex justify-end">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ border: `1.5px solid ${on ? pkg.color : "rgba(255,255,255,0.25)"}`, background: on ? pkg.color : "transparent" }}>
                            {on && <Check size={12} color="#fff" />}
                          </span>
                        </div>
                      </div>
                    </div>
                    {on && (
                      <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-4 pt-4" style={{ borderTop: `1px solid ${pkg.color}22` }}>
                        {pkg.features.map(f => (
                          <div key={f} className="flex items-start gap-2">
                            <CheckCircle size={13} color={pkg.color} style={{ marginTop: 2, flexShrink: 0 }} />
                            <span style={{ color: SOFT, fontSize: 12.5, lineHeight: 1.5 }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
              {!activePackages.length && (
                <div className="p-5 rounded-2xl text-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(91,167,214,0.25)" }}>
                  <p style={{ color: MUTED, fontSize: 13 }}>No partner packages are available right now. Contact our team to build a custom plan.</p>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── Right: sticky preview + publish ── */}
        <div className="lg:col-span-2 space-y-6 lg:sticky lg:top-6">
          <div className="p-5 sm:p-6 glow-surface" style={GLASS}>
            <div className="flex items-center gap-2 mb-4">
              <Eye size={16} color={HILITE} />
              <span style={{ ...DISPLAY, color: TEXT, fontSize: 16, fontWeight: 600 }}>Preview</span>
            </div>
            <LivePreview name={config.companyName} logo={config.logoText} tagline={config.tagline} primary={config.primaryColor} accent={config.accentColor} />
          </div>

          <div className="p-5 sm:p-6 glow-surface" style={GLASS}>
            <div className="space-y-2.5 mb-5">
              {[
                ["Brand name", config.companyName || "—"],
                ["Domain", config.domain || "—"],
                ["Package", activePackages.find(p => p.id === selectedTier)?.name ?? "Not chosen"],
                ["Commission", selectedTier ? `${activePackages.find(p => p.id === selectedTier)?.commission ?? 0}% lifetime` : "—"],
              ].map(([k, v]) => (
                <div key={k as string} className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: "1px solid rgba(91,167,214,0.1)" }}>
                  <span style={{ color: MUTED, fontSize: 12.5 }}>{k}</span>
                  <span style={{ color: SOFT, fontSize: 12.5, fontWeight: 600, textAlign: "right", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={publish} className="w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 fpd-btn-lift"
              style={{ background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", boxShadow: "0 8px 26px rgba(91,110,225,0.4)" }}>
              {locked
                ? <><Lock size={16} /> Unlock White Label</>
                : <><Rocket size={16} /> {config.enabled ? "Update Live Portal" : "Publish White-Label Portal"}</>}
            </button>
            <button onClick={() => toast.success("Draft saved (demo).")} disabled={locked} className="w-full py-2.5 mt-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "rgba(91,167,214,0.08)", color: HILITE, border: "1px solid rgba(91,167,214,0.2)", opacity: locked ? 0.45 : 1, cursor: locked ? "not-allowed" : "pointer" }}>
              <Save size={15} /> Save Draft
            </button>
            <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.6, marginTop: 14, textAlign: "center" }}>
              {locked
                ? "Branding, colors, and your custom domain unlock as soon as your partner payment clears."
                : "Publishing notifies your onboarding manager. Setup and first-month billing begin once your package is confirmed."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
