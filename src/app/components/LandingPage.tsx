import React, { useState, useEffect } from "react";
import { useWLPackages } from "../context/WLPackagesContext";
import { calcMonthlyCharge } from "../services/wlPackages";
import {
  Shield, Lock, Archive, Users, ArrowRight, CheckCircle, Star,
  ChevronDown, Heart, Stethoscope, Wallet, Car, Camera, Folder,
  TrendingUp, Handshake, Globe, Zap, Eye, Key, FileText,
  Bell, Calendar, Phone, Building, Award, PawPrint, Video,
  DollarSign, HardDrive, BarChart3, Mail, Menu, X, Play,
  ChevronRight, Layers
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_new_logo.png";
import fpdLongLogo   from "../../imports/FPD_long_logo_blue.png";

/* ─── shared style helpers ─────────────────────────────────────── */
const GRID = {
  backgroundImage: "linear-gradient(rgba(108,92,231,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(108,92,231,0.04) 1px,transparent 1px)",
  backgroundSize: "60px 60px",
};
const GLASS = {
  background: "rgba(8,15,26,0.75)",
  border: "1px solid rgba(108,92,231,0.18)",
  backdropFilter: "blur(16px)",
  boxShadow: "0 0 40px rgba(108,92,231,0.06), inset 0 1px 0 rgba(108,92,231,0.1)",
};
const GLOW_BTN: React.CSSProperties = {
  background: "linear-gradient(135deg,#6C5CE7,#8B7CF6)",
  color: "#04080F",
  fontWeight: 700,
  boxShadow: "0 0 30px rgba(108,92,231,0.45)",
};
const MONO = { fontFamily: "var(--font-mono)" } as React.CSSProperties;
const DISPLAY = { fontFamily: "var(--font-display)" } as React.CSSProperties;

const Orb = ({ x, y, size = 400, opacity = 0.07 }: { x: string; y: string; size?: number; opacity?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle,rgba(108,92,231,${opacity}) 0%,transparent 70%)`, pointerEvents: "none" }} />
);

const Tag = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
    style={{ background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.25)", ...MONO }}>
    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6C5CE7", boxShadow: "0 0 8px #6C5CE7" }} />
    <span style={{ color: "#6C5CE7", fontSize: 11, letterSpacing: "0.12em" }}>{children}</span>
  </div>
);

const SectionTitle = ({ tag, title, sub }: { tag: string; title: React.ReactNode; sub?: string }) => (
  <div className="text-center mb-16">
    <Tag>{tag}</Tag>
    <h2 style={{ ...DISPLAY, fontSize: "clamp(1.9rem,4vw,3rem)", color: "#E8EDF5", marginBottom: 16, lineHeight: 1.15 }}>{title}</h2>
    {sub && <p style={{ color: "#6B7FA8", fontSize: 17, maxWidth: 560, margin: "0 auto", lineHeight: 1.8 }}>{sub}</p>}
  </div>
);

/* ─── NAV ───────────────────────────────────────────────────────── */
function Nav({ onStart, onWhiteGlove }: { onStart: () => void; onWhiteGlove?: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = ["About","How It Works","Features","Security","Pricing","Affiliates","Partners","White Label","Help"];

  function scrollToWhiteGlove() {
    if (onWhiteGlove) { onWhiteGlove(); return; }
    document.getElementById("white-glove")?.scrollIntoView({ behavior:"smooth" });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(4,8,15,0.97)" : "transparent", borderBottom: scrolled ? "1px solid rgba(108,92,231,0.12)" : "none", backdropFilter: scrolled ? "blur(20px)" : "none" }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <img src={fpdSquareLogo} alt="FPD" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }} />
          <img src={fpdLongLogo} alt="Final Pass Down" className="hidden md:block" style={{ height: 26, objectFit: "contain", filter: "brightness(0) saturate(100%) invert(28%) sepia(82%) saturate(600%) hue-rotate(218deg) brightness(90%)" }} />
        </div>
        <div className="hidden lg:flex items-center gap-6" style={{ outline:"none", border:"none" }}>
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,"-")}`} style={{ color: "#6B7FA8", fontSize: 13, ...MONO, outline:"none", border:"none" }} className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          {/* White Glove — plain text link, matches other nav links */}
          <button
            onClick={scrollToWhiteGlove}
            className="hidden md:flex items-center text-sm transition-colors hover:text-white fpd-btn-lift"
            style={{ color: "#6B7FA8", ...MONO, outline:"none", border:"none", background:"transparent" }}>
            White Glove
          </button>
          <button className="px-4 py-1.5 rounded-xl text-sm fpd-btn-lift" style={{ color: "#E8EDF5", border:"1px solid rgba(108,92,231,0.3)", background:"transparent" }}>Sign In</button>
          <button onClick={onStart} className="px-5 py-2 rounded-xl text-sm fpd-btn-lift" style={GLOW_BTN}>Get Started</button>
          <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} style={{ color: "#6B7FA8" }}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="lg:hidden px-6 pb-4 space-y-2" style={{ background: "rgba(4,8,15,0.98)" }}>
          {links.map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,"-")}`} onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm" style={{ color: "#6B7FA8" }}>{l}</a>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ─── HERO ──────────────────────────────────────────────────────── */
function Hero({ onStart }: { onStart: () => void }) {
  const stats = [["50,000+","Legacies Protected"],["$2.4B+","Assets Secured"],["4.9 / 5","User Rating"],["256-bit","Encryption"]];
  return (
    <section style={{ minHeight: "100vh", background: "#04080F", position: "relative", overflow: "hidden", display: "flex", alignItems: "center" }}>
      {/* background image with overlay */}
      <div style={{ position: "absolute", inset: 0 }}>
        <img src="https://images.unsplash.com/photo-1648221350871-e3ae3c8d0f58?w=1920&h=1080&fit=crop&auto=format" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.12 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,rgba(4,8,15,0.4) 0%,rgba(4,8,15,0.9) 60%,#04080F 100%)" }} />
        <div style={{ position: "absolute", inset: 0, ...GRID }} />
      </div>
      <Orb x="-10%" y="10%" size={700} opacity={0.1} />
      <Orb x="60%" y="-5%" size={500} opacity={0.07} />

      <div className="relative max-w-6xl mx-auto px-6 text-center w-full" style={{ paddingTop: 120 }}>
        <div className="fpd-fade-in-up"><Tag>TRUSTED DIGITAL LEGACY PLATFORM · EST. 2024</Tag></div>
        <h1 className="fpd-fade-in-up" style={{ ...DISPLAY, fontSize: "clamp(2.8rem,7vw,5.5rem)", fontWeight: 900, color: "#F0F6FF", lineHeight: 1.08, marginBottom: 24, animationDelay:"60ms" }}>
          My Life.{" "}
          <span style={{ background: "linear-gradient(135deg,#6C5CE7,#8B7CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>My Wishes.</span>
          <br />My Way.
        </h1>
        <p className="fpd-fade-in-up" style={{ color: "#8AA3C8", fontSize: "clamp(1rem,2vw,1.25rem)", maxWidth: 640, margin: "0 auto 40px", lineHeight: 1.8, animationDelay:"120ms" }}>
          Final Pass Down is the world's most complete digital legacy platform — store your documents, record your wishes, protect your family, and ensure everything you care about is passed on exactly as you intend.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20 fpd-fade-in-up" style={{ animationDelay:"180ms" }}>
          <button onClick={onStart} className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base fpd-btn-lift" style={GLOW_BTN}>
            Start Your Legacy <ArrowRight size={18} />
          </button>
          <button className="flex items-center gap-3 px-8 py-4 rounded-2xl text-base fpd-btn-lift"
            style={{ border: "1px solid rgba(108,92,231,0.3)", color: "#E8EDF5", background: "rgba(108,92,231,0.05)" }}>
            <Play size={16} fill="currentColor" /> Watch Demo
          </button>
        </div>

        {/* stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12 fpd-fade-in-up" style={{ animationDelay:"240ms" }}>
          {stats.map(([val, label]) => (
            <div key={label} className="p-4 rounded-2xl text-center fpd-hover-lift glow-surface" style={GLASS}>
              <div style={{ ...DISPLAY, fontSize: 26, fontWeight: 700, color: "#6C5CE7" }}>{val}</div>
              <div style={{ color: "#6B7FA8", fontSize: 12, marginTop: 4, ...MONO }}>{label}</div>
            </div>
          ))}
        </div>
        {/* Social proof faces */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center">
            {[
              "photo-1585813597616-63e881759e9d",
              "photo-1625690988276-0a7b0cdf3d5d",
              "photo-1537735319956-df7db4b6a4e9",
              "photo-1575267685970-7fbabf6ed7b0",
              "photo-1672640770474-e1d8a28fd0d2",
              "photo-1662987619545-1844207dedac",
            ].map((id, i) => (
              <div key={id} style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(108,92,231,0.4)", marginLeft: i > 0 ? -10 : 0, overflow: "hidden", background: "#04080F" }}>
                <img src={`https://images.unsplash.com/${id}?w=72&h=72&fit=crop&auto=format`} alt="User" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
              </div>
            ))}
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(108,92,231,0.4)", marginLeft: -10, background: "rgba(108,92,231,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#6C5CE7", fontSize: 10, fontWeight: 700, ...MONO }}>+50k</div>
          </div>
          <div style={{ color: "#6B7FA8", fontSize: 13 }}>Joined by 50,000+ families protecting their legacy</div>
        </div>
      </div>
    </section>
  );
}

/* ─── ABOUT ─────────────────────────────────────────────────────── */
function About() {
  return (
    <section id="about" style={{ background: "#04080F", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="70%" y="20%" size={500} />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Tag>ABOUT FINAL PASS DOWN</Tag>
            <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4vw,3rem)", color: "#E8EDF5", lineHeight: 1.15, marginBottom: 24 }}>
              What Happens to Your<br />
              <span style={{ color: "#6C5CE7" }}>Life's Work</span> When You're Gone?
            </h2>
            <p style={{ color: "#8AA3C8", fontSize: 16, lineHeight: 1.9, marginBottom: 20 }}>
              Most families face chaos after a loved one passes — scrambling to find documents, discover accounts, and piece together final wishes. Final Pass Down changes everything.
            </p>
            <p style={{ color: "#8AA3C8", fontSize: 16, lineHeight: 1.9, marginBottom: 32 }}>
              We give you a secure digital vault to organize every aspect of your life — from wills and insurance to personal memories and final messages — then deliver it to your trusted contacts exactly when and how you decide.
            </p>
            <div className="space-y-3">
              {["Store every document securely in one encrypted vault","Designate Legacy, Guardian & Emergency Contacts","Record video messages for loved ones to receive after you pass","Plan your funeral, write your final wishes, answer life questions","Keep medical, financial, and personal records organized"].map(pt => (
                <div key={pt} className="flex items-start gap-3">
                  <CheckCircle size={16} color="#6C5CE7" style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ color: "#B8C8E0", fontSize: 14 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <div style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(108,92,231,0.2)", boxShadow: "0 0 80px rgba(108,92,231,0.12)" }}>
              <img src="https://images.unsplash.com/photo-1585813597616-63e881759e9d?w=700&h=500&fit=crop&auto=format" alt="Happy couple family" style={{ width: "100%", height: 340, objectFit: "cover", objectPosition: "center 20%" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(108,92,231,0.15)" }}>
                <img src="https://images.unsplash.com/photo-1642522029691-029b5a432954?w=350&h=220&fit=crop&auto=format" alt="Estate planning meeting" style={{ width: "100%", height: 130, objectFit: "cover" }} />
              </div>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(108,92,231,0.15)" }}>
                <img src="https://images.unsplash.com/photo-1662987619545-1844207dedac?w=350&h=220&fit=crop&auto=format" alt="Three generations family" style={{ width: "100%", height: 130, objectFit: "cover" }} />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 p-5 rounded-2xl glow-surface" style={GLASS}>
              <div style={{ ...MONO, color: "#6C5CE7", fontSize: 11, marginBottom: 4 }}>PLATFORM COVERAGE</div>
              <div style={{ ...DISPLAY, fontSize: 32, color: "#E8EDF5" }}>30+</div>
              <div style={{ color: "#6B7FA8", fontSize: 13 }}>Life Categories</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── HOW IT WORKS ──────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    { n:"01", icon:<Shield size={28}/>, title:"Create Your Account", desc:"Sign up and choose your plan. Set up multi-factor authentication and biometric security for your vault.", img:"photo-1585813597616-63e881759e9d", imgPos:"center 15%" },
    { n:"02", icon:<Archive size={28}/>, title:"Build Your Vault", desc:"Upload documents, add life records across 30+ categories — everything from wills to pet care instructions.", img:"photo-1642522029691-029b5a432954", imgPos:"center center" },
    { n:"03", icon:<Users size={28}/>, title:"Designate Contacts", desc:"Add Legacy, Guardian, Emergency, and Pet Emergency contacts. Each verifies their identity with government-issued ID.", img:"photo-1758518731462-d091b0b4ed0d", imgPos:"center center" },
    { n:"04", icon:<Heart size={28}/>, title:"Your Legacy Lives On", desc:"When the time comes, your designated contacts receive exactly what you intended — securely and on your terms.", img:"photo-1662987619545-1844207dedac", imgPos:"center 20%" },
  ];
  return (
    <section id="how-it-works" style={{ background: "#06101A", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="10%" y="30%" />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionTitle tag="HOW IT WORKS" title={<>Four Steps to a<br /><span style={{ color: "#6C5CE7" }}>Secure Legacy</span></>} sub="Getting started takes less than 10 minutes. Your family will thank you forever." />
        <div className="grid md:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <div key={s.n} className="relative rounded-2xl flex flex-col p-6 fpd-hover-lift glow-surface" style={{ ...GLASS }}>
              {i < steps.length - 1 && <div className="hidden md:block absolute top-10 -right-3 z-10" style={{ width: 6, height: 6, borderRadius: "50%", background: "#6C5CE7", boxShadow: "0 0 12px #6C5CE7" }} />}
              <div className="mb-4 w-11 h-11 rounded-full flex items-center justify-center" style={{ ...DISPLAY, background: "linear-gradient(135deg,#6C5CE7,#8B7CF6)", color: "#fff", fontWeight: 700, fontSize: 15 }}>{s.n}</div>
              <div className="mb-4 w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,92,231,0.12)", color: "#6C5CE7" }}>{s.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 15, color: "#E8EDF5", marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: "#6B7FA8", fontSize: 13, lineHeight: 1.8 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── FEATURES ──────────────────────────────────────────────────── */
function Features() {
  const [active, setActive] = useState("all");
  const cats = ["all","legacy","personal","financial","family","organize"];
  const features = [
    { cat:"legacy", icon:<FileText size={20}/>, title:"Will & Testament", desc:"Store executed wills, living wills, and power of attorney documents." },
    { cat:"legacy", icon:<Heart size={20}/>, title:"Final Wishes", desc:"Specify exactly what you want done with personal property and bequests." },
    { cat:"legacy", icon:<Users size={20}/>, title:"Funeral Planning", desc:"Pre-plan your service: location, music, readings, obituary draft." },
    { cat:"legacy", icon:<Archive size={20}/>, title:"Document Vault", desc:"AES-256 encrypted storage for every important document you own." },
    { cat:"legacy", icon:<Video size={20}/>, title:"Video Messages", desc:"Record personal video messages delivered to loved ones after you pass." },
    { cat:"legacy", icon:<Eye size={20}/>, title:"Questionnaire", desc:"Answer life questions so your family truly knows your story and values." },
    { cat:"personal", icon:<Stethoscope size={20}/>, title:"Emergency Info", desc:"Blood type, doctors, hospital preferences, DNR and organ donor status." },
    { cat:"personal", icon:<Bell size={20}/>, title:"Allergies", desc:"Complete allergy registry with severity ratings and reaction details." },
    { cat:"personal", icon:<Shield size={20}/>, title:"Medications", desc:"Active medications, dosages, prescribers, and refill schedules." },
    { cat:"personal", icon:<Car size={20}/>, title:"Vehicles", desc:"Title, VIN, insurance, and transfer instructions for every vehicle." },
    { cat:"personal", icon:<Zap size={20}/>, title:"Utilities", desc:"All utility account numbers, providers, and autopay status." },
    { cat:"personal", icon:<Lock size={20}/>, title:"Digital Assets", desc:"Cryptocurrency, domain names, social accounts with access methods." },
    { cat:"personal", icon:<Key size={20}/>, title:"Firearms", desc:"Serial numbers, registration, safe location, and legal transfer plan." },
    { cat:"financial", icon:<Wallet size={20}/>, title:"Insurance Policies", desc:"Life, home, auto, and umbrella policies with beneficiary details." },
    { cat:"financial", icon:<Globe size={20}/>, title:"Real Estate", desc:"Property records, deeds, mortgage details, and rental income." },
    { cat:"financial", icon:<TrendingUp size={20}/>, title:"Investment Portfolios", desc:"Brokerage accounts, holdings, and beneficiary designations." },
    { cat:"financial", icon:<DollarSign size={20}/>, title:"Retirement Accounts", desc:"401(k), IRA, pension, and Social Security information." },
    { cat:"financial", icon:<FileText size={20}/>, title:"Tax Records", desc:"Filed returns, preparer contact, and document locations." },
    { cat:"financial", icon:<Building size={20}/>, title:"Business Accounts", desc:"Business entities, EIN, bank accounts, and succession plans." },
    { cat:"family", icon:<Camera size={20}/>, title:"Memories", desc:"Photo and video memories with stories and tags for future generations." },
    { cat:"family", icon:<Heart size={20}/>, title:"Kids Activities", desc:"School info, activities, allergies, and guardianship instructions." },
    { cat:"family", icon:<Star size={20}/>, title:"Keepsakes", desc:"Sentimental items with their stories and intended recipients." },
    { cat:"family", icon:<Award size={20}/>, title:"Awards & Achievements", desc:"Military service, professional recognition, and life accomplishments." },
    { cat:"family", icon:<PawPrint size={20}/>, title:"Pet Care", desc:"Vet info, medications, diet, microchip, and emergency pet guardian." },
    { cat:"organize", icon:<Folder size={20}/>, title:"Personal Folders", desc:"Custom folders including a locked Secret Vault for ultra-sensitive items." },
    { cat:"organize", icon:<Bell size={20}/>, title:"Reminders", desc:"Recurring reminders for document renewals, reviews, and key dates." },
    { cat:"organize", icon:<Calendar size={20}/>, title:"Occasions", desc:"Birthdays, anniversaries, and holidays with personal notes." },
    { cat:"organize", icon:<Phone size={20}/>, title:"Contacts Hub", desc:"All Legacy, Guardian, Emergency, and Pet Emergency contacts in one place." },
    { cat:"organize", icon:<HardDrive size={20}/>, title:"Storage Metering", desc:"Real-time storage dashboard with overage alerts at 80%, 90%, 95%." },
    { cat:"organize", icon:<BarChart3 size={20}/>, title:"Activity Log", desc:"Complete audit trail of all vault changes and contact access events." },
  ];

  const filtered = active === "all" ? features : features.filter(f => f.cat === active);
  const catLabels: Record<string,string> = { all:"All Features", legacy:"Legacy Planning", personal:"Personal Records", financial:"Financial", family:"Family & Memories", organize:"Organization" };

  return (
    <section id="features" style={{ background: "#04080F", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="80%" y="40%" size={600} />
      <div className="relative max-w-7xl mx-auto px-6">
        <SectionTitle tag="PLATFORM FEATURES" title={<>Everything Your<br /><span style={{ color: "#6C5CE7" }}>Legacy Needs</span></>} sub="30+ life categories, all in one military-grade encrypted vault." />

        {/* filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {cats.map(c => (
            <button key={c} onClick={() => setActive(c)}
              className="px-5 py-2 rounded-full text-sm transition-all fpd-btn-lift"
              style={{ background: active===c ? "#6C5CE7" : "rgba(108,92,231,0.06)", color: active===c ? "#04080F" : "#6B7FA8", border: `1px solid ${active===c ? "#6C5CE7" : "rgba(108,92,231,0.15)"}`, fontWeight: active===c ? 700 : 400, ...MONO }}>
              {catLabels[c]}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {filtered.map((f) => (
            <div key={f.title} className="p-5 rounded-2xl group cursor-pointer transition-all fpd-hover-lift glow-surface" style={{ ...GLASS }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all" style={{ background: "rgba(108,92,231,0.1)", color: "#6C5CE7" }}>{f.icon}</div>
              <div style={{ ...DISPLAY, fontSize: 13, color: "#E8EDF5", marginBottom: 6 }}>{f.title}</div>
              <p style={{ color: "#6B7FA8", fontSize: 11, lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── SECURITY ──────────────────────────────────────────────────── */
function Security() {
  const items = [
    { icon:<Lock size={22}/>, title:"AES-256 Encryption", desc:"Military-grade encryption protects every file, message, and record in your vault." },
    { icon:<Eye size={22}/>, title:"Zero-Knowledge Architecture", desc:"We cannot read your data. Only you and your designated contacts can decrypt it." },
    { icon:<Shield size={22}/>, title:"Government ID Verification", desc:"Every legacy contact must submit and pass identity verification before gaining access." },
    { icon:<Key size={22}/>, title:"Multi-Factor Authentication", desc:"Biometric + authenticator app + backup codes — your account is always protected." },
    { icon:<Globe size={22}/>, title:"SOC 2 Type II Compliant", desc:"Annual third-party security audits validate our infrastructure and data practices." },
    { icon:<Zap size={22}/>, title:"Breach Notification", desc:"Real-time alerts if any suspicious access is detected on your account." },
  ];
  return (
    <section id="security" style={{ background: "#06101A", padding: "120px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <img src="https://images.unsplash.com/photo-1758073519996-6d3c63b4922c?w=1920&h=800&fit=crop&auto=format" alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.06 }} />
        <div style={{ position: "absolute", inset: 0, ...GRID }} />
      </div>
      <Orb x="20%" y="10%" size={600} opacity={0.08} />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionTitle tag="ENTERPRISE-GRADE SECURITY" title={<>Your Data is<br /><span style={{ color: "#6C5CE7" }}>Fortress-Protected</span></>} sub="We built Final Pass Down with the same security standards used by banks and defense contractors." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => (
            <div key={item.title} className="p-7 rounded-2xl fpd-hover-lift glow-surface" style={GLASS}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: "rgba(108,92,231,0.1)", color: "#6C5CE7", boxShadow: "0 0 20px rgba(108,92,231,0.15)" }}>{item.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 16, color: "#E8EDF5", marginBottom: 10 }}>{item.title}</h3>
              <p style={{ color: "#6B7FA8", fontSize: 13, lineHeight: 1.8 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        {/* Security imagery strip */}
        <div className="mt-12 grid md:grid-cols-3 gap-4 mb-10">
          {[
            { url:"https://images.unsplash.com/photo-1614064641938-3bbee52942c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=500&q=80", label:"Encrypted Storage" },
            { url:"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=500&q=80", label:"Zero-Knowledge Architecture" },
            { url:"https://images.unsplash.com/photo-1695668548342-c0c1ad479aee?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=500&q=80", label:"Identity Verification" },
          ].map(img => (
            <div key={img.label} style={{ borderRadius:16, overflow:"hidden", position:"relative" }}>
              <img src={img.url} alt={img.label} style={{ width:"100%", height:160, objectFit:"cover", opacity:0.7 }}/>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(4,8,15,0.8),transparent)" }}/>
              <div style={{ position:"absolute", bottom:12, left:14, color:"#B8C8E0", fontSize:12, fontFamily:"var(--font-mono)" }}>{img.label}</div>
            </div>
          ))}
        </div>
        <div className="p-8 rounded-2xl text-center glow-surface" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)" }}>
          <div style={{ ...MONO, color: "#6C5CE7", fontSize: 12, letterSpacing: "0.1em", marginBottom: 12 }}>SECURITY CERTIFICATION</div>
          <div className="flex flex-wrap items-center justify-center gap-8">
            {["AES-256 Encrypted","Zero-Knowledge","SOC 2 Type II","HIPAA Compliant","GDPR Ready","ISO 27001"].map(badge => (
              <div key={badge} className="flex items-center gap-2">
                <CheckCircle size={14} color="#6C5CE7" />
                <span style={{ color: "#B8C8E0", fontSize: 13 }}>{badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PRICING ───────────────────────────────────────────────────── */
function Pricing({ onStart }: { onStart: () => void }) {
  const [annual, setAnnual] = useState(false);
  const plans = [
    { name:"Starter",      price:1.99,   storage:"1 GB",    contacts:1,  features:["1 GB Legacy Storage","1 Legacy Contact","1 Guardian Contact","Document Vault","Encrypted Documents","Media Uploads","Photos and Videos","Legacy Messaging","Text, Video & Voice Messages","Calendar Reminders","Access Control","Advanced Security","Email Support"], color:"#48BB78", popular:false },
    { name:"Foundation",   price:9.99,   storage:"50 GB",   contacts:3,  features:["50 GB Legacy Storage","3 Legacy Contacts","3 Guardian Contacts","Document Vault","Encrypted Documents","Media Uploads","Photos and Videos","Legacy Messaging","Text, Video & Voice Messages","Calendar Reminders","Access Control","Advanced Security","Email Support"], color:"#4A90D9", popular:false },
    { name:"Legacy Archive",price:24.99, storage:"250 GB",  contacts:-1, features:["250 GB Legacy Storage","Unlimited Legacy Contacts","Unlimited Guardian Contacts","Document Vault","Encrypted Documents","Media Uploads","Photos and Videos","Legacy Messaging","Text, Video & Voice Messages","Calendar Reminders","Access Control","Advanced Security","Priority Support","Email and Chat"], color:"#6C5CE7", popular:true },
    { name:"Legacy Pro",   price:49.99,  storage:"500 GB",  contacts:-1, features:["500 GB Legacy Storage","Unlimited Legacy Contacts","Unlimited Guardian Contacts","Document Vault","Encrypted Documents","Media Uploads","Photos and Videos","Legacy Messaging","Text, Video & Voice Messages","Calendar Reminders","Access Control","Advanced Security","Priority Support","Email and Chat"], color:"#9F7AEA", popular:false },
    { name:"Legacy Vault", price:129.99, storage:"1 TB",    contacts:-1, features:["1 TB Legacy Storage","Unlimited Legacy Contacts","Unlimited Guardian Contacts","Document Vault","Encrypted Documents","Media Uploads","Photos and Videos","Legacy Messaging","Text, Video & Voice Messages","Calendar Reminders","Access Control","Advanced Security","Priority Support","Email and Chat"], color:"#ED8936", popular:false },
  ];
  return (
    <section id="pricing" style={{ background: "#04080F", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="50%" y="0%" size={700} opacity={0.06} />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionTitle tag="SIMPLE PRICING" title={<>Invest in Your<br /><span style={{ color: "#6C5CE7" }}>Family's Future</span></>} sub="All plans include metered GB storage. Unused monthly storage expires at billing reset. Overage billed at $0.50/GB (Starter) or $0.40/GB (all other plans)." />

        {/* Pricing imagery banner */}
        <div className="grid grid-cols-4 gap-3 mb-14">
          {[
            { url:"https://images.unsplash.com/photo-1596510914965-9ae08acae566?w=400&h=220&fit=crop&auto=format", label:"Young Families" },
            { url:"https://images.unsplash.com/photo-1541089404510-5c9a779841fc?w=400&h=220&fit=crop&auto=format", label:"Couples" },
            { url:"https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=220&fit=crop&auto=format", label:"Professionals" },
            { url:"https://images.unsplash.com/photo-1554331292-735256644d5f?w=400&h=220&fit=crop&auto=format", label:"Seniors" },
          ].map(img => (
            <div key={img.label} style={{ position:"relative", borderRadius:12, overflow:"hidden" }}>
              <img src={img.url} alt={img.label} style={{ width:"100%", height:140, objectFit:"cover", opacity:0.65 }}/>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(4,8,15,0.85),transparent 60%)" }}/>
              <div style={{ position:"absolute", bottom:10, left:12, color:"#B8C8E0", fontSize:11, fontFamily:"var(--font-mono)" }}>{img.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mb-12">
          <span style={{ color: "#6B7FA8", fontSize: 14 }}>Monthly</span>
          <button onClick={() => setAnnual(!annual)} className="relative rounded-full transition-all" style={{ width: 48, height: 26, background: annual ? "#6C5CE7" : "#0A1628", border: "1px solid rgba(108,92,231,0.3)", boxShadow: annual ? "0 0 20px rgba(108,92,231,0.4)" : "none" }}>
            <div className="absolute top-1 rounded-full transition-all" style={{ width: 18, height: 18, background: "#fff", left: annual ? 26 : 4 }} />
          </button>
          <span style={{ color: annual ? "#6C5CE7" : "#6B7FA8", fontSize: 14 }}>Annual <span style={{ color: "#48BB78", fontSize: 12 }}>Save 20%</span></span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {plans.map(plan => (
            <div key={plan.name} className="relative p-8 rounded-2xl flex flex-col fpd-hover-lift glow-surface" style={{ ...GLASS, borderColor: plan.popular ? plan.color : "rgba(108,92,231,0.15)", borderWidth: plan.popular ? 2 : 1, boxShadow: plan.popular ? `0 0 60px rgba(108,92,231,0.15)` : undefined }}>
              {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1 rounded-full text-xs font-bold" style={{ background: "#6C5CE7", color: "#04080F", ...MONO }}>MOST POPULAR</div>}
              <div style={{ ...MONO, color: plan.color, fontSize: 11, letterSpacing: "0.12em", marginBottom: 12 }}>{plan.name.toUpperCase()}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span style={{ ...DISPLAY, fontSize: 42, color: "#E8EDF5", fontWeight: 700 }}>${annual ? (plan.price*0.8).toFixed(2) : plan.price}</span>
                <span style={{ color: "#6B7FA8", fontSize: 14 }}>/mo</span>
              </div>
              <div style={{ color: "#6B7FA8", fontSize: 13, marginBottom: 24 }}>{plan.storage} storage · {plan.contacts === -1 ? "Unlimited" : plan.contacts} contacts</div>
              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle size={13} color={plan.color} style={{ marginTop: 3, flexShrink: 0 }} />
                    <span style={{ color: "#B8C8E0", fontSize: 13 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-semibold transition-all text-sm fpd-btn-lift"
                style={plan.popular ? GLOW_BTN : { background: "rgba(108,92,231,0.08)", color: "#6C5CE7", border: "1px solid rgba(108,92,231,0.25)" }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
        <p className="text-center mt-8" style={{ color: "#6B7FA8", fontSize: 13 }}>All plans billed in USD. No contracts. Cancel anytime. Overage auto-billed at end of cycle.</p>
      </div>
    </section>
  );
}

/* ─── AFFILIATES ────────────────────────────────────────────────── */
function Affiliates({ onStart }: { onStart: () => void }) {
  const tiers = [
    { tier:"Tier 1", range:"5–24 active accounts", rate:"20%", color:"#4A90D9", note:"12-month cap per referral" },
    { tier:"Tier 2", range:"25–74 active accounts", rate:"25%", color:"#6C5CE7", note:"12-month cap per referral" },
    { tier:"Tier 3", range:"74+ active accounts", rate:"30%", color:"#8B7CF6", note:"12-month cap per referral" },
  ];
  return (
    <section id="affiliates" style={{ background: "#06101A", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="10%" y="50%" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <Tag>AFFILIATE PROGRAM</Tag>
            <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4vw,3rem)", color: "#E8EDF5", lineHeight: 1.15, marginBottom: 20 }}>
              Earn Up to <span style={{ color: "#6C5CE7" }}>30%</span><br />Referring Friends
            </h2>
            <p style={{ color: "#8AA3C8", fontSize: 16, lineHeight: 1.9, marginBottom: 32 }}>
              Share your unique affiliate link. Every time someone signs up through your link and stays subscribed, you earn a monthly commission for 12 months — automatically, no invoices needed.
            </p>
            <div className="space-y-3 mb-8">
              {[["Commission paid monthly","Commissions hit your account on the 1st of each month"],["12-month earning window","Each referral earns you commission for their full first 12 months"],["Automatic tier upgrades","Hit 25+ referrals and your rate jumps automatically"],["No cap on referrals","Refer as many people as you want — more referrals, more income"]].map(([bold, rest]) => (
                <div key={bold} className="flex items-start gap-3">
                  <CheckCircle size={15} color="#6C5CE7" style={{ marginTop: 3, flexShrink: 0 }} />
                  <span style={{ color: "#B8C8E0", fontSize: 14 }}><strong style={{ color: "#E8EDF5" }}>{bold}</strong> — {rest}</span>
                </div>
              ))}
            </div>
            <button onClick={onStart} className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm fpd-btn-lift" style={GLOW_BTN}>
              Join Affiliate Program <ArrowRight size={16} />
            </button>
          </div>
          <div className="space-y-4">
            {tiers.map(t => (
              <div key={t.tier} className="p-6 rounded-2xl fpd-hover-lift glow-surface" style={{ ...GLASS, borderColor: `${t.color}30` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div style={{ ...MONO, color: t.color, fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>{t.tier.toUpperCase()}</div>
                    <div style={{ color: "#E8EDF5", fontSize: 15, fontWeight: 500 }}>{t.range}</div>
                    <div style={{ color: "#6B7FA8", fontSize: 12, marginTop: 2 }}>{t.note}</div>
                  </div>
                  <div style={{ ...DISPLAY, fontSize: 42, fontWeight: 700, color: t.color }}>{t.rate}</div>
                </div>
              </div>
            ))}
            <div className="p-5 rounded-2xl text-center glow-surface" style={{ background: "rgba(108,92,231,0.06)", border: "1px solid rgba(108,92,231,0.2)" }}>
              <div style={{ color: "#6B7FA8", fontSize: 13 }}>Example: 30 referrals on Legacy Archive ($24.99/mo) =</div>
              <div style={{ ...DISPLAY, fontSize: 28, color: "#6C5CE7", marginTop: 4 }}>$187.43 / month</div>
              <div style={{ color: "#6B7FA8", fontSize: 12, marginTop: 2 }}>at Tier 2 (25%) for 12 months</div>
            </div>
            {/* Affiliate lifestyle photo */}
            <div style={{ borderRadius:16, overflow:"hidden", marginTop:4 }}>
              <img src="https://images.unsplash.com/photo-1479920252409-6e3d8e8d4866?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=700&q=80" alt="Earning commissions" style={{ width:"100%", height:130, objectFit:"cover", opacity:0.65 }}/>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── PARTNERSHIPS ──────────────────────────────────────────────── */
function Partnerships({ onStart }: { onStart: () => void }) {
  const tiers = [
    { tier:"Tier 1", range:"0–50 referred accounts", rate:"20%", color:"#48BB78" },
    { tier:"Tier 2", range:"51–100 referred accounts", rate:"25%", color:"#6C5CE7" },
    { tier:"Tier 3", range:"101+ referred accounts", rate:"30%", color:"#9F7AEA" },
  ];
  const partners = [
    { icon:<FileText size={18}/>, label:"Estate Attorneys", desc:"Offer clients a comprehensive digital legacy tool as part of your practice." },
    { icon:<Wallet size={18}/>, label:"Financial Advisors", desc:"Help clients protect and organize the assets you manage for them." },
    { icon:<Building size={18}/>, label:"Senior Living Centers", desc:"Provide residents and families peace of mind as part of your care offering." },
    { icon:<Globe size={18}/>, label:"Banks & Credit Unions", desc:"Add digital legacy planning to your financial wellness product suite." },
    { icon:<Stethoscope size={18}/>, label:"Healthcare Providers", desc:"Support advance directives and end-of-life planning for your patients." },
    { icon:<Heart size={18}/>, label:"Funeral Homes", desc:"Offer pre-planning services and connect families to organized digital records." },
  ];
  return (
    <section id="partners" style={{ background: "#04080F", padding: "120px 0", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 220, overflow: "hidden" }}>
        <img src="https://images.unsplash.com/photo-1758518729706-b1810dd39cc6?w=1920&h=300&fit=crop&auto=format" alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.07 }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(4,8,15,0.4), #04080F)" }}/>
      </div>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="60%" y="20%" size={600} opacity={0.07} />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionTitle tag="STRATEGIC PARTNERSHIPS" title={<>Recurring <span style={{ color: "#6C5CE7" }}>Lifetime</span> Commissions</>} sub="Built for professionals who serve clients going through major life transitions. Refer once, earn forever." />
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {tiers.map(t => (
            <div key={t.tier} className="p-7 rounded-2xl text-center fpd-hover-lift glow-surface" style={{ ...GLASS, borderColor: `${t.color}30` }}>
              <div style={{ ...DISPLAY, fontSize: 52, fontWeight: 700, color: t.color, lineHeight: 1 }}>{t.rate}</div>
              <div style={{ ...MONO, color: t.color, fontSize: 11, letterSpacing: "0.1em", margin: "8px 0 4px" }}>{t.tier.toUpperCase()}</div>
              <div style={{ color: "#6B7FA8", fontSize: 13 }}>{t.range}</div>
              <div className="mt-3 flex items-center justify-center gap-1" style={{ color: "#48BB78", fontSize: 12 }}>
                <CheckCircle size={12} /> Recurring · Lifetime · No cap
              </div>
            </div>
          ))}
        </div>
        {/* Partner imagery row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { url:"https://images.unsplash.com/photo-1758518731462-d091b0b4ed0d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=500&q=80", label:"Estate Attorneys" },
            { url:"https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=500&q=80", label:"Financial Advisors" },
            { url:"https://images.unsplash.com/photo-1584432810601-6c7f27d2362b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=500&q=80", label:"Healthcare Providers" },
          ].map(img => (
            <div key={img.label} style={{ borderRadius:16, overflow:"hidden", position:"relative" }}>
              <img src={img.url} alt={img.label} style={{ width:"100%", height:160, objectFit:"cover", opacity:0.65 }}/>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top,rgba(4,8,15,0.8),transparent 60%)" }}/>
              <div style={{ position:"absolute", bottom:12, left:14, color:"#B8C8E0", fontSize:12, fontFamily:"var(--font-mono)" }}>{img.label}</div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {partners.map(p => (
            <div key={p.label} className="flex items-start gap-4 p-5 rounded-2xl fpd-hover-lift glow-surface" style={GLASS}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(108,92,231,0.1)", color: "#6C5CE7" }}>{p.icon}</div>
              <div>
                <div style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.label}</div>
                <div style={{ color: "#6B7FA8", fontSize: 12, lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <button onClick={onStart} className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base fpd-btn-lift" style={GLOW_BTN}>
            Apply for Partnership <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── WHITE GLOVE CONCIERGE ─────────────────────────────────────── */
function WhiteGloveLanding({ onStart }: { onStart: () => void }) {
  const steps = [
    { icon:<Phone size={20}/>,    num:"01", title:"We Call You",        desc:"A dedicated Final Pass Down specialist calls you personally. No forms to fill out online. Just a phone call." },
    { icon:<FileText size={20}/>, num:"02", title:"We Handle Everything",desc:"Your specialist uploads every document, sets up your legacy contacts, and records your final wishes — exactly as you describe them." },
    { icon:<Users size={20}/>,    num:"03", title:"We Verify Together",  desc:"We walk through the completed vault with you over the phone, confirm every detail is exactly right, and make any adjustments." },
    { icon:<CheckCircle size={20}/>,num:"04",title:"You're Protected",   desc:"Your family is protected. Your legacy is organized. You didn't have to touch a single keyboard." },
  ];

  const included = [
    "Dedicated personal specialist assigned to you",
    "Up to 4 one-on-one phone or video sessions",
    "All documents uploaded on your behalf",
    "Legacy contacts set up and verified for you",
    "Final wishes recorded exactly as you describe",
    "30-day follow-up call after completion",
    "Priority phone and email support — always a real person",
    "No tech skills required — ever",
  ];

  return (
    <section id="white-glove" style={{ background:"#06030F", padding:"120px 0", position:"relative", overflow:"hidden" }}>
      {/* Background */}
      <div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(159,122,234,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(159,122,234,0.03) 1px,transparent 1px)", backgroundSize:"50px 50px" }}/>
      <div style={{ position:"absolute", top:"10%", right:"5%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(159,122,234,0.07) 0%,transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:"5%", left:"0%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle,rgba(247,147,26,0.05) 0%,transparent 70%)", pointerEvents:"none" }}/>

      <div className="relative max-w-6xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5"
            style={{ background:"rgba(159,122,234,0.12)", border:"1px solid rgba(159,122,234,0.3)" }}>
            <Star size={12} color="#C4B5FD" fill="rgba(196,181,253,0.3)"/>
            <span style={{ color:"#C4B5FD", fontSize:11, letterSpacing:"0.12em", ...MONO }}>WHITE GLOVE CONCIERGE SERVICE</span>
          </div>
          <h2 style={{ ...DISPLAY, fontSize:"clamp(2rem,4.5vw,3.2rem)", color:"#E8EDF5", lineHeight:1.12, marginBottom:20 }}>
            Not Comfortable With Technology?<br/>
            <span style={{ color:"#C4B5FD" }}>We Do Everything For You.</span>
          </h2>
          <p style={{ color:"#8AA3C8", fontSize:17, lineHeight:1.9, maxWidth:600, margin:"0 auto" }}>
            Final Pass Down's White Glove Concierge Service is for people who want their legacy protected but don't want to deal with apps, uploads, or anything technical. A real person calls you, listens to you, and handles everything — start to finish — over the phone.
          </p>
        </div>

        {/* 4 steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {steps.map((s, i) => (
            <div key={i} className="relative p-6 rounded-2xl fpd-hover-lift glow-surface"
              style={{ background:"rgba(159,122,234,0.05)", border:"1px solid rgba(159,122,234,0.15)", borderTop:`3px solid rgba(159,122,234,0.5)` }}>
              <div style={{ color:"rgba(159,122,234,0.25)", fontSize:52, fontFamily:"var(--font-display)", fontWeight:900, lineHeight:1, marginBottom:12 }}>{s.num}</div>
              <div style={{ color:"#C4B5FD", marginBottom:10 }}>{s.icon}</div>
              <div style={{ ...DISPLAY, fontSize:16, color:"#E8EDF5", marginBottom:8 }}>{s.title}</div>
              <div style={{ color:"#6B7FA8", fontSize:13, lineHeight:1.8 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing — two cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-14">
          <div className="rounded-3xl p-8 text-center fpd-hover-lift glow-surface"
            style={{ background:"linear-gradient(135deg,#0A0520,#1A0840)", border:"2px solid rgba(159,122,234,0.4)", boxShadow:"0 0 48px rgba(159,122,234,0.15)" }}>
            <div style={{ color:"#C4B5FD", fontSize:11, ...MONO, letterSpacing:"0.14em", marginBottom:12 }}>ONE-TIME SETUP FEE</div>
            <div style={{ ...DISPLAY, fontSize:72, color:"#E8EDF5", lineHeight:1, marginBottom:6 }}>$99</div>
            <div style={{ color:"#8A9AB8", fontSize:13, marginBottom:20 }}>Paid once · Gets you started with your dedicated specialist</div>
            <div className="flex flex-col gap-2 text-left">
              {["Specialist assigned to your account","Intake call to understand your needs","Secure document upload link sent to you","Full onboarding plan created"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={12} color="#9F7AEA"/>
                  <span style={{ color:"#B8C8E0", fontSize:13 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl p-8 text-center glow-surface"
            style={{ background:"rgba(159,122,234,0.06)", border:"2px solid rgba(159,122,234,0.25)" }}>
            <div style={{ color:"#9F7AEA", fontSize:11, ...MONO, letterSpacing:"0.14em", marginBottom:12 }}>SESSION RATE</div>
            <div style={{ ...DISPLAY, fontSize:72, color:"#E8EDF5", lineHeight:1, marginBottom:6 }}>$25</div>
            <div style={{ color:"#8A9AB8", fontSize:13, marginBottom:20 }}>per 30 minutes · Only pay for time you use</div>
            <div className="flex flex-col gap-2 text-left mb-6">
              {["Phone or video session with your specialist","Specialist uploads documents during the call","Session notes + progress tracking","No minimum session requirement"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle size={12} color="#9F7AEA"/>
                  <span style={{ color:"#B8C8E0", fontSize:13 }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 rounded-2xl"
              style={{ background:"rgba(159,122,234,0.1)", border:"1px solid rgba(159,122,234,0.25)" }}>
              <div style={{ color:"#C4B5FD", fontSize:12, fontWeight:600 }}>Typical Total: $199–$249</div>
              <div style={{ color:"#8A9AB8", fontSize:11 }}>$99 setup + 2–3 hours of sessions</div>
            </div>
          </div>
        </div>

        {/* Included + CTA side by side */}
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div style={{ color:"#C4B5FD", fontSize:11, ...MONO, letterSpacing:"0.14em", marginBottom:16 }}>EVERYTHING INCLUDED</div>
            <ul className="space-y-3">
              {included.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle size={14} color="#9F7AEA" style={{ marginTop:2, flexShrink:0 }}/>
                  <span style={{ color:"#B8C8E0", fontSize:14, lineHeight:1.6 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl overflow-hidden fpd-hover-lift glow-surface"
            style={{ background:"rgba(159,122,234,0.08)", border:"2px solid rgba(159,122,234,0.25)", boxShadow:"0 0 60px rgba(159,122,234,0.1)" }}>
            {/* Specialist photo */}
            <div style={{ position:"relative", height:200, overflow:"hidden" }}>
              <img src="https://images.unsplash.com/photo-1581065178047-8ee15951ede6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=600&q=80" alt="White Glove Specialist" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center 20%", opacity:0.8 }}/>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,transparent 40%,rgba(20,5,40,0.95))" }}/>
              <div style={{ position:"absolute", bottom:16, left:20 }}>
                <div style={{ color:"#C4B5FD", fontSize:14, fontWeight:700, fontFamily:"var(--font-display)" }}>Your Personal Specialist</div>
                <div style={{ color:"#8A6FB8", fontSize:11, fontFamily:"var(--font-mono)" }}>Calls you within 1 business day</div>
              </div>
            </div>
          <div className="p-8 text-center">
            <div style={{ ...DISPLAY, fontSize:24, color:"#E8EDF5", marginBottom:8 }}>Perfect For</div>
            <div className="space-y-2 mb-8">
              {[
                "Seniors and older adults",
                "Anyone recovering from illness",
                "People with very limited tech experience",
                "Family members setting up on behalf of a loved one",
                "Those with an urgent timeline (medical procedure, travel)",
              ].map(p => (
                <div key={p} style={{ color:"#8AA3C8", fontSize:13 }}>· {p}</div>
              ))}
            </div>
            <div style={{ color:"#C4B5FD", fontSize:26, fontFamily:"var(--font-display)", fontWeight:700, marginBottom:4 }}>
              Just Leave Your Number.
            </div>
            <div style={{ color:"#6B7FA8", fontSize:13, marginBottom:20 }}>
              A specialist calls within 1 business day. No apps. No computers. Just a phone call.
            </div>
            {/* Pricing reminder */}
            <div className="flex justify-center gap-4 mb-5 text-center">
              <div className="px-4 py-2 rounded-xl" style={{ background:"rgba(159,122,234,0.12)", border:"1px solid rgba(159,122,234,0.25)" }}>
                <div style={{ color:"#E8EDF5", fontSize:18, fontFamily:"var(--font-display)", fontWeight:700 }}>$99</div>
                <div style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>SETUP FEE</div>
              </div>
              <div style={{ color:"#4A5A7A", fontSize:20, display:"flex", alignItems:"center" }}>+</div>
              <div className="px-4 py-2 rounded-xl" style={{ background:"rgba(159,122,234,0.12)", border:"1px solid rgba(159,122,234,0.25)" }}>
                <div style={{ color:"#E8EDF5", fontSize:18, fontFamily:"var(--font-display)", fontWeight:700 }}>$25</div>
                <div style={{ color:"#8A9AB8", fontSize:10, ...MONO }}>PER 30 MIN</div>
              </div>
            </div>
            <button onClick={onStart}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base fpd-btn-lift"
              style={{ background:"linear-gradient(135deg,#9F7AEA,#C4B5FD)", color:"#04080F", boxShadow:"0 0 32px rgba(159,122,234,0.4)" }}>
              <Phone size={18}/> Request My White Glove Call
            </button>
            <div style={{ color:"#4A5A7A", fontSize:11, marginTop:12 }}>
              No obligation · Available Mon–Fri 9AM–7PM
            </div>
          </div>
          </div>
        </div>

        {/* Bottom trust strip */}
        <div className="grid grid-cols-3 gap-4 mt-16">
          {[
            { icon:<Shield size={18}/>,     title:"Your Privacy Is Sacred",   desc:"Your information is encrypted and your specialist's access ends the moment your setup is complete." },
            { icon:<Star size={18}/>,        title:"Real Humans, Always",      desc:"No chatbots. No automated systems. Every session is with a named, trained Final Pass Down specialist." },
            { icon:<Heart size={18}/>,       title:"At Your Pace, Always",     desc:"Sessions happen when you're ready. Most clients finish in 2–3 calls over 1–2 weeks. We never rush." },
          ].map(t => (
            <div key={t.title} className="p-5 rounded-2xl text-center fpd-hover-lift glow-surface"
              style={{ background:"rgba(159,122,234,0.04)", border:"1px solid rgba(159,122,234,0.1)" }}>
              <div style={{ color:"#9F7AEA", margin:"0 auto 10px" }}>{t.icon}</div>
              <div style={{ ...DISPLAY, fontSize:14, color:"#E8EDF5", marginBottom:4 }}>{t.title}</div>
              <div style={{ color:"#6B7FA8", fontSize:12, lineHeight:1.7 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── WHITE LABEL ───────────────────────────────────────────────── */
function WhiteLabel({ onStart }: { onStart: () => void }) {
  const { packages } = useWLPackages();
  const active = packages.filter(p => p.active);

  // Always show the public-facing monthly price — billing model details are backend-only
  function getMonthlyPrice(p: typeof packages[0]): number {
    const b = p.billing;
    if (b.type === "flat_monthly") return b.flatMonthly;
    if (b.type === "per_user_flat") return b.minMonthly;
    return (b as any).minMonthly ?? 0;
  }

  return (
    <section id="white-label" style={{ background: "#06101A", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="15%" y="25%" size={500} opacity={0.06} />
      <Orb x="78%" y="65%" size={400} opacity={0.05} />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
            style={{ background:"rgba(159,122,234,0.1)", border:"1px solid rgba(159,122,234,0.3)" }}>
            <Layers size={12} color="#9F7AEA"/>
            <span style={{ color:"#9F7AEA", fontSize:11, letterSpacing:"0.12em", ...MONO }}>WHITE LABEL SOLUTIONS</span>
          </div>
          <h2 style={{ ...DISPLAY, fontSize:"clamp(2rem,4vw,3rem)", color:"#E8EDF5", lineHeight:1.15, marginBottom:16 }}>
            Launch Your Own<br/><span style={{ color:"#9F7AEA" }}>Legacy Platform</span>
          </h2>
          <p style={{ color:"#8AA3C8", fontSize:16, lineHeight:1.8, maxWidth:580, margin:"0 auto" }}>
            License the full Final Pass Down platform under your brand. Pricing updates live when admin adjusts packages.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {active.map(p => {
            const monthly = getMonthlyPrice(p);
            return (
              <div key={p.id} className="rounded-2xl p-7 relative flex flex-col fpd-hover-lift glow-surface"
                style={{ ...GLASS, borderColor:`${p.color}40`, background:p.badge?"rgba(8,15,26,0.92)":"rgba(8,15,26,0.78)", boxShadow:p.badge?`0 0 48px ${p.color}40`:"none" }}>
                {p.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold"
                    style={{ background:p.color, color:"#04080F", ...MONO, whiteSpace:"nowrap" }}>{p.badge}</div>
                )}
                <div style={{ color:p.color, fontSize:10, ...MONO, letterSpacing:"0.14em", fontWeight:700, marginBottom:6 }}>{p.tier}</div>
                <div style={{ ...DISPLAY, fontSize:22, color:"#E8EDF5", marginBottom:4 }}>{p.name}</div>
                <div style={{ color:"#8AA3C8", fontSize:14, marginBottom:16 }}>{p.userLimitLabel}</div>
                <div className="mb-1">
                  <span style={{ ...DISPLAY, fontSize:40, color:p.color, lineHeight:1 }}>${monthly.toLocaleString()}</span>
                  <span style={{ color:"#6B7FA8", fontSize:13 }}>/mo</span>
                </div>
                <div style={{ color:"#4A5A7A", fontSize:12, marginBottom:16 }}>
                  + ${p.billing.setupFee.toLocaleString()} one-time setup fee
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5"
                  style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}>
                  <Globe size={10} color="#4A5A7A"/>
                  <span style={{ color:"#4A5A7A", fontSize:10, ...MONO, flex:1 }} className="truncate">{p.onboardingLink}</span>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle size={11} color={p.color} style={{ marginTop:2, flexShrink:0 }}/>
                      <span style={{ color:"#B8C8E0", fontSize:12, lineHeight:1.5 }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={onStart} className="w-full py-3 rounded-xl font-bold text-sm fpd-btn-lift"
                  style={{ background:p.badge?`linear-gradient(135deg,${p.color},${p.color}BB)`:"transparent",
                    color:p.badge?"#fff":p.color, border:`1px solid ${p.color}60`,
                    boxShadow:p.badge?`0 0 24px ${p.color}40`:"none" }}>
                  Apply for {p.name} →
                </button>
              </div>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon:<Globe size={18}/>,  title:"Custom Domain",  desc:"Your own domain — clients never see FPD branding" },
            { icon:<Layers size={18}/>, title:"Full Branding",  desc:"Logo, colors, fonts, email templates — all yours" },
            { icon:<Award size={18}/>,  title:"HIPAA + SOC 2", desc:"Legacy Vault compliance baked in at no extra cost" },
            { icon:<Zap size={18}/>,    title:"Stripe + More", desc:"Stripe, PayPal, Square or bring your own processor" },
          ].map(f => (
            <div key={f.title} className="flex gap-3 p-5 rounded-2xl fpd-hover-lift glow-surface" style={GLASS}>
              <div style={{ color:"#9F7AEA", flexShrink:0 }}>{f.icon}</div>
              <div>
                <div style={{ color:"#E8EDF5", fontSize:13, fontWeight:600, marginBottom:3 }}>{f.title}</div>
                <div style={{ color:"#6B7FA8", fontSize:12, lineHeight:1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}


/* ─── TESTIMONIALS ──────────────────────────────────────────────── */
function Testimonials() {
  const quotes = [
    { name:"Dr. Rebecca Hayes", role:"Estate Planning Attorney, Chicago", photo:"https://images.unsplash.com/photo-1625690988276-0a7b0cdf3d5d?w=120&h=120&fit=crop&auto=format", quote:"I now recommend Final Pass Down to every single client. It fills a gap that no legal document can — the human story behind the estate.", rating:5, bg:"photo-1642522029691-029b5a432954" },
    { name:"Marcus & Diana Torres", role:"Retired Couple, Sacramento CA", photo:"https://images.unsplash.com/photo-1585813597616-63e881759e9d?w=120&h=120&fit=crop&auto=format&crop=faces", quote:"After our health scare last year, we realized our kids would have had no idea where anything was. FPD changed that in a weekend.", rating:5, bg:"photo-1662987619545-1844207dedac" },
    { name:"James Washington", role:"Financial Advisor, Atlanta", photo:"https://images.unsplash.com/photo-1575267685970-7fbabf6ed7b0?w=120&h=120&fit=crop&auto=format", quote:"The partnership program is incredible. My clients get a world-class service, and I earn recurring income for simply doing the right thing for them.", rating:5, bg:"photo-1758518731462-d091b0b4ed0d" },
  ];
  return (
    <section style={{ background: "#04080F", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <div className="relative max-w-6xl mx-auto px-6">
        <SectionTitle tag="TESTIMONIALS" title={<>Trusted by Thousands<br /><span style={{ color: "#6C5CE7" }}>Across America</span></>} />
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map(q => (
            <div key={q.name} className="rounded-2xl flex flex-col overflow-hidden fpd-hover-lift glow-surface" style={GLASS}>
              {/* Background image strip */}
              <div style={{ height: 120, overflow: "hidden", position: "relative" }}>
                <img src={`https://images.unsplash.com/${q.bg}?w=500&h=200&fit=crop&auto=format`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }}/>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(4,8,15,0.2), rgba(8,15,26,0.9))" }}/>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <div className="flex gap-1 mb-4">
                  {Array.from({length:q.rating}).map((_,i) => <Star key={i} size={13} fill="#6C5CE7" color="#6C5CE7" />)}
                </div>
                <p style={{ color: "#B8C8E0", fontSize: 14, lineHeight: 1.9, flex: 1, marginBottom: 20 }}>"{q.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: "rgba(108,92,231,0.12)" }}>
                  <img src={q.photo} alt={q.name} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", objectPosition: "center 20%", border: "2px solid rgba(108,92,231,0.4)", flexShrink: 0 }} />
                  <div>
                    <div style={{ color: "#E8EDF5", fontSize: 14, fontWeight: 600 }}>{q.name}</div>
                    <div style={{ color: "#6B7FA8", fontSize: 12 }}>{q.role}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── HELP & ADVICE ─────────────────────────────────────────────── */
function Help() {
  const [open, setOpen] = useState<number|null>(null);
  const faqs = [
    { q:"Who can access my vault?", a:"Only you and the contacts you specifically designate. Legacy Contacts must pass government-ID verification before any access is granted. You control exactly what each contact can see and when." },
    { q:"What happens to my data if I cancel?", a:"Your data is retained for 90 days after cancellation so you can export everything. After 90 days it is permanently and irreversibly deleted per our privacy policy." },
    { q:"How does storage metering work?", a:"Every file you upload is counted toward your monthly storage allowance in gigabytes. Unused storage does not carry forward — it resets each billing cycle. If you exceed your plan limit, overage is billed at $0.50/GB on Starter or $0.40/GB on all other plans." },
    { q:"What happens when I pass away?", a:"Your designated executor or Legacy Contact initiates the release process. They submit a death certificate, complete identity verification, and our compliance team reviews the request within 24–48 hours before granting access." },
    { q:"Is Final Pass Down available on mobile?", a:"Yes — iOS and Android apps are available, plus a Progressive Web App (PWA) that works on any device without an app store download." },
    { q:"Can I update my documents anytime?", a:"Yes. You can add, replace, or delete any document at any time. Your contacts only ever receive the most current version of your vault when access is triggered." },
    { q:"How do I verify my legacy contacts?", a:"You invite them via email. They click a secure link, create a limited account, and upload a government-issued photo ID. Our team verifies within 1–2 business days." },
    { q:"What is the difference between affiliate and partnership?", a:"Affiliates earn a commission per referred user for 12 months (capped per referral). Partners — typically businesses like law firms or financial advisors — earn recurring lifetime commissions on every account they refer, with no time cap." },
  ];
  return (
    <section id="help" style={{ background: "#06101A", padding: "120px 0", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="70%" y="10%" />
      <div className="relative max-w-3xl mx-auto px-6">
        <SectionTitle tag="HELP & ADVICE" title={<>Frequently Asked<br /><span style={{ color: "#6C5CE7" }}>Questions</span></>} sub="Everything you need to know about Final Pass Down." />
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(108,92,231,0.15)" }}>
              <button className="w-full flex items-center justify-between px-6 py-5" onClick={() => setOpen(open===i ? null:i)}
                style={{ background: open===i ? "rgba(108,92,231,0.08)" : "rgba(8,15,26,0.8)", textAlign:"left" }}>
                <span style={{ color: "#E8EDF5", fontSize: 15, fontWeight: 500 }}>{faq.q}</span>
                <ChevronDown size={16} color="#6C5CE7" style={{ transform: open===i?"rotate(180deg)":"rotate(0)", transition:"transform 0.2s", flexShrink:0 }} />
              </button>
              {open===i && (
                <div className="px-6 pb-5" style={{ background: "rgba(108,92,231,0.04)", color: "#8AA3C8", fontSize: 14, lineHeight: 1.9 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 p-8 rounded-2xl text-center fpd-hover-lift glow-surface" style={{ ...GLASS }}>
          <div style={{ ...DISPLAY, fontSize: 20, color: "#E8EDF5", marginBottom: 8 }}>Still have questions?</div>
          <p style={{ color: "#6B7FA8", fontSize: 14, marginBottom: 20 }}>Our team is available 7 days a week. Average response time: under 2 hours.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm fpd-btn-lift" style={{ background: "rgba(108,92,231,0.1)", color: "#6C5CE7", border: "1px solid rgba(108,92,231,0.3)" }}>
              <Mail size={15} /> Email Support
            </button>
            <button className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm fpd-btn-lift" style={{ background: "rgba(108,92,231,0.1)", color: "#6C5CE7", border: "1px solid rgba(108,92,231,0.3)" }}>
              <Phone size={15} /> Call Us
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────── */
function CTA({ onStart }: { onStart: () => void }) {
  return (
    <section style={{ background: "#04080F", padding: "100px 0", position: "relative", overflow: "hidden" }}>
      {/* Full-width background photo blend */}
      <div style={{ position:"absolute", inset:0 }}>
        <img src="https://images.unsplash.com/photo-1541089404510-5c9a779841fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1920&q=80" alt="" style={{ width:"100%", height:"100%", objectFit:"cover", opacity:0.08 }}/>
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom,#04080F 10%,transparent 50%,#04080F 90%)" }}/>
      </div>
      <div style={{ position: "absolute", inset: 0, ...GRID }} />
      <Orb x="30%" y="0%" size={800} opacity={0.08} />
      <Orb x="70%" y="30%" size={500} opacity={0.06} />
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        {/* Photo row above CTA */}
        <div className="flex justify-center gap-3 mb-10">
          {[
            "https://images.unsplash.com/photo-1562337404-3044c84ac061?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=120&q=80",
            "https://images.unsplash.com/photo-1547121591-ebfd615332af?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=120&q=80",
            "https://images.unsplash.com/photo-1507679799987-c73779587ccf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=120&q=80",
            "https://images.unsplash.com/photo-1581065178047-8ee15951ede6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=120&q=80",
            "https://images.unsplash.com/photo-1522724709546-19901cb1818a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=120&q=80",
          ].map((src, i) => (
            <img key={i} src={src} alt="FPD user" style={{ width:52, height:52, borderRadius:"50%", objectFit:"cover", border:"2px solid rgba(108,92,231,0.4)", marginLeft:i>0?-12:0, boxShadow:"0 0 0 2px #04080F" }}/>
          ))}
          <div className="flex items-center justify-center rounded-full text-xs font-bold" style={{ width:52, height:52, background:"rgba(108,92,231,0.15)", border:"2px solid rgba(108,92,231,0.4)", color:"#6C5CE7", marginLeft:-12, fontFamily:"var(--font-mono)" }}>50k+</div>
        </div>
        <img src={fpdSquareLogo} alt="FPD" style={{ width: 80, height: 80, borderRadius: 18, objectFit: "cover", margin: "0 auto 24px", boxShadow: "0 0 60px rgba(108,92,231,0.3)" }} />
        <h2 style={{ ...DISPLAY, fontSize: "clamp(2.2rem,5vw,4rem)", color: "#E8EDF5", marginBottom: 20, lineHeight: 1.1 }}>
          Start Your Legacy<br /><span style={{ color: "#6C5CE7" }}>Today</span>
        </h2>
        <p style={{ color: "#8AA3C8", fontSize: 17, maxWidth: 500, margin: "0 auto 40px", lineHeight: 1.8 }}>
          Join 50,000+ people who have secured their digital legacy. Takes less than 10 minutes to start.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onStart} className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base fpd-btn-lift" style={GLOW_BTN}>
            Create Your Vault <ArrowRight size={18} />
          </button>
          <button className="flex items-center gap-3 px-10 py-4 rounded-2xl text-base fpd-btn-lift"
            style={{ border: "1px solid rgba(108,92,231,0.3)", color: "#E8EDF5", background: "rgba(108,92,231,0.05)" }}>
            View Demo Account
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── FOOTER ────────────────────────────────────────────────────── */
function Footer({ onStart, onPartnerPortal, onConciergeLogin }: { onStart: () => void; onPartnerPortal: () => void; onConciergeLogin: () => void }) {
  const cols = [
    { title:"Platform", links:["Dashboard","Document Vault","Final Wishes","Medical Info","Financial Records","Personal Assets","Family & Memories","Contacts Hub"] },
    { title:"Programs", links:["Affiliate Program","Business Partnerships","White Label Solutions","Legacy Vault API"] },
    { title:"Resources", links:["Help Center","Security Overview","Privacy Policy","Terms of Service","Cookie Policy","HIPAA Compliance"] },
    { title:"Company", links:["About Us","Careers","Press","Contact","Blog","Investor Relations"] },
  ];
  return (
    <footer style={{ background: "#030710", borderTop: "1px solid rgba(108,92,231,0.1)", padding: "60px 0 30px" }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-10 mb-12">
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={fpdSquareLogo} alt="FPD" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
            </div>
            <img src={fpdLongLogo} alt="Final Pass Down" style={{ height: 20, objectFit: "contain", filter: "brightness(0) saturate(100%) invert(28%) sepia(82%) saturate(600%) hue-rotate(218deg) brightness(90%)", marginBottom: 12 }} />
            <p style={{ color: "#6B7FA8", fontSize: 12, lineHeight: 1.8, marginBottom: 16 }}>My Life · My Wishes · My Way</p>
            <p style={{ color: "#4A5A7A", fontSize: 11 }}>AES-256 Encrypted · SOC 2 Type II · HIPAA Compliant</p>
          </div>
          {cols.map(col => (
            <div key={col.title}>
              <div style={{ ...MONO, color: "#6C5CE7", fontSize: 10, letterSpacing: "0.12em", marginBottom: 16 }}>{col.title.toUpperCase()}</div>
              <ul className="space-y-2">
                {col.links.map(link => (
                  <li key={link}><a href="#" style={{ color: "#6B7FA8", fontSize: 13 }} className="hover:text-white transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t" style={{ borderColor: "rgba(108,92,231,0.08)" }}>
          <div style={{ color: "#4A5A7A", fontSize: 12 }}>© 2026 Final Pass Down Inc. All rights reserved.</div>
          <div className="flex items-center gap-3">
            {["App Store","Google Play","PWA"].map(p => (
              <span key={p} className="px-3 py-1 rounded-lg text-xs" style={{ background: "rgba(108,92,231,0.08)", color: "#6C5CE7", border: "1px solid rgba(108,92,231,0.2)", ...MONO }}>{p}</span>
            ))}
            <button
              onClick={onPartnerPortal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all fpd-btn-lift"
              style={{ background: "rgba(72,187,120,0.1)", color: "#48BB78", border: "1px solid rgba(72,187,120,0.3)", ...MONO, letterSpacing:"0.06em", boxShadow:"0 0 16px rgba(72,187,120,0.08)" }}
            >
              <Handshake size={11}/> PARTNER PORTAL
            </button>
            <button
              onClick={onConciergeLogin}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all fpd-btn-lift"
              style={{ background: "rgba(247,147,26,0.08)", color: "#F7931A", border: "1px solid rgba(247,147,26,0.3)", ...MONO, letterSpacing:"0.06em" }}
            >
              <Star size={11}/> CONCIERGE STAFF
            </button>
            <button
              onClick={() => (window as any).__adminLogin?.()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all fpd-btn-lift"
              style={{ background: "rgba(159,122,234,0.12)", color: "#9F7AEA", border: "1px solid rgba(159,122,234,0.35)", ...MONO, letterSpacing:"0.06em", boxShadow:"0 0 16px rgba(159,122,234,0.1)" }}
            >
              <Lock size={11}/> MASTER ADMIN LOGIN
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── ROOT EXPORT ───────────────────────────────────────────────── */
export function LandingPage({ onGetStarted, onAdminLogin, onPartnerPortal, onConciergeLogin }: { onGetStarted: () => void; onAdminLogin?: () => void; onPartnerPortal?: () => void; onConciergeLogin?: () => void }) {
  // expose for footer button
  if (typeof window !== "undefined") (window as any).__adminLogin = onAdminLogin;
  return (
    <div style={{ fontFamily: "var(--font-body)", background: "#04080F", color: "#E8EDF5" }}>
      <Nav onStart={onGetStarted} onWhiteGlove={() => document.getElementById("white-glove")?.scrollIntoView({ behavior:"smooth" })} />
      <Hero onStart={onGetStarted} />
      <About />
      <HowItWorks />
      <Features />
      <Security />
      <Pricing onStart={onGetStarted} />
      <Affiliates onStart={onGetStarted} />
      <Partnerships onStart={onGetStarted} />
      <WhiteGloveLanding onStart={onGetStarted} />
      <WhiteLabel onStart={onGetStarted} />
      <Testimonials />
      <Help />
      <CTA onStart={onGetStarted} />
      <Footer onStart={onGetStarted} onPartnerPortal={onPartnerPortal ?? (() => {})} onConciergeLogin={onConciergeLogin ?? (() => {})} />
    </div>
  );
}
