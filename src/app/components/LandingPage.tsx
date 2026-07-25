import React, { useState, useEffect, useRef } from "react";
import { useWLPackages } from "../context/WLPackagesContext";
import type { WLPackage } from "../services/wlPackages";
import {
  Shield, Lock, Archive, Users, ArrowRight, CheckCircle2, Heart,
  KeyRound, Camera, Menu, X, Play, ChevronRight, ChevronDown,
  Handshake, Mail, Phone,
  Star, Building2, Scale, Landmark, TrendingUp,
  Stethoscope, Wallet, Car, Folder, Globe, Zap, Eye, FileText,
  Bell, Calendar, Award, PawPrint, Video, DollarSign, HardDrive,
  BarChart3, Layers,
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_mark_square.png";

/* ── Royal Vault Blue palette ─────────────────────────────────── */
const BG = "#070A12";
const CARD = "#101728";
const PRIMARY = "#7E6BD8";
const ACCENT = "#5B6EE1";
const HILITE = "#5BA7D6";
const TEXT = "#F0F0F5";
const SOFT = "#B8C8E0";
const MUTED = "#8A97B8";
const FAINT = "#5A6A88";
/* premium concierge accent — a violet that harmonizes with Royal Vault Blue */
const VIOLET = "#7E6BD8";
const VIOLET_SOFT = "#7E6BD8";

const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* ── Swappable media backdrop ─────────────────────────────────────
   Renders a branded gradient placeholder always; a lightweight poster
   image paints instantly, and the <video> only mounts/streams once the
   backdrop is eager (hero) or scrolls near the viewport — so the page
   loads fast on any device (see public/media). Poster defaults to the
   `.jpg` alongside a `.mp4` src, so callers rarely pass it explicitly. */
function MediaBackdrop({ src, poster, tone = "blue", overlay = 0.55, showPlay = false, eager = false }:
  { src?: string; poster?: string; tone?: "blue" | "deep" | "warm"; overlay?: number; showPlay?: boolean; eager?: boolean }) {
  const gradients: Record<string, string> = {
    blue: "radial-gradient(120% 130% at 25% 15%, rgba(91,110,225,0.38), transparent 58%), radial-gradient(100% 110% at 85% 90%, rgba(91,110,225,0.26), transparent 55%), linear-gradient(160deg,#0C1630,#070A12)",
    deep: "radial-gradient(120% 130% at 80% 10%, rgba(46,75,176,0.42), transparent 60%), radial-gradient(90% 90% at 10% 100%, rgba(91,110,225,0.20), transparent 55%), linear-gradient(160deg,#080D1C,#05070E)",
    warm: "radial-gradient(120% 120% at 30% 20%, rgba(91,167,214,0.28), transparent 55%), radial-gradient(100% 100% at 90% 80%, rgba(91,110,225,0.30), transparent 55%), linear-gradient(160deg,#0B1226,#070A12)",
  };
  const effPoster = poster ?? (src && /\.mp4$/.test(src) ? src.replace(/\.mp4$/, ".jpg") : undefined);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(eager);
  useEffect(() => {
    if (active || !src || typeof IntersectionObserver === "undefined") return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setActive(true); io.disconnect(); }
    }, { rootMargin: "500px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [active, src]);
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", background: gradients[tone] }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(91,110,225,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.06) 1px,transparent 1px)", backgroundSize: "44px 44px", opacity: 0.5 }} />
      {effPoster && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${effPoster})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
      {showPlay && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 72, height: 72, background: "rgba(91,110,225,0.22)", border: "1px solid rgba(91,167,214,0.4)", backdropFilter: "blur(4px)" }}>
            <Play size={26} color={HILITE} style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}
      {src && active && (
        <video autoPlay loop muted playsInline poster={effPoster} preload="auto"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}>
          <source src={src} type="video/mp4" />
        </video>
      )}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(7,10,18,0.35) 0%, rgba(7,10,18,${overlay}) 60%, ${BG} 100%)` }} />
    </div>
  );
}

/* ── primitives ───────────────────────────────────────────────── */
function Kicker({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "violet" }) {
  const c = tone === "violet" ? VIOLET : ACCENT;
  const t = tone === "violet" ? VIOLET_SOFT : HILITE;
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
      style={{ background: tone === "violet" ? "rgba(126,107,216,0.10)" : "rgba(91,110,225,0.10)", border: `1px solid ${tone === "violet" ? "rgba(126,107,216,0.28)" : "rgba(91,110,225,0.28)"}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 8px ${c}` }} />
      <span style={{ color: t, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", ...MONO }}>{children}</span>
    </div>
  );
}

function SectionHead({ kicker, title, sub, tone }: { kicker: string; title: React.ReactNode; sub?: string; tone?: "blue" | "violet" }) {
  return (
    <div className="text-center mb-14 flex flex-col items-center">
      <Kicker tone={tone}>{kicker}</Kicker>
      <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4.2vw,3.2rem)", fontWeight: 700, color: TEXT, margin: "18px 0 14px", lineHeight: 1.12, letterSpacing: "-0.02em", maxWidth: 820 }}>{title}</h2>
      {sub && <p style={{ color: MUTED, fontSize: 17, maxWidth: 620, lineHeight: 1.7 }}>{sub}</p>}
    </div>
  );
}

function PrimaryBtn({ children, onClick, large }: { children: React.ReactNode; onClick?: () => void; large?: boolean }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl fpd-btn-lift"
      style={{ padding: large ? "15px 30px" : "12px 24px", fontSize: large ? 16 : 14, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, boxShadow: "0 8px 30px rgba(91,110,225,0.45)" }}>
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick, large }: { children: React.ReactNode; onClick?: () => void; large?: boolean }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl transition-colors"
      style={{ padding: large ? "15px 28px" : "12px 22px", fontSize: large ? 16 : 14, fontWeight: 600, color: SOFT, background: "rgba(91,110,225,0.08)", border: "1px solid rgba(91,110,225,0.28)" }}>
      {children}
    </button>
  );
}

/* smoothly scroll to an in-page section */
function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── NAV ──────────────────────────────────────────────────────── */
const NAV_LINKS: [string, string][] = [
  ["About", "about"], ["How It Works", "how-it-works"], ["Features", "features"],
  ["Security", "security"], ["Pricing", "pricing"], ["Affiliates", "affiliates"],
  ["Partners", "partners"], ["White Label", "white-label"], ["Help", "help"],
];

function TopNav({ onStart }: { onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn);
  }, []);
  const go = (id: string) => { setOpen(false); scrollToId(id); };
  return (
    <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{ background: scrolled ? "rgba(7,10,18,0.92)" : "transparent", borderBottom: scrolled ? "1px solid rgba(91,110,225,0.14)" : "1px solid transparent", backdropFilter: scrolled ? "blur(18px)" : "none" }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
        <button onClick={() => { setOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex items-center gap-2.5">
          <img src={fpdSquareLogo} alt="Final Pass Down" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "contain" }} />
          <span className="hidden 2xl:block" style={{ fontFamily: "var(--font-display)", color: TEXT, fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>FINAL PASS DOWN</span>
        </button>
        <div className="hidden xl:flex items-center gap-0.5">
          {NAV_LINKS.map(([l, id]) => (
            <button key={l} onClick={() => go(id)} className="px-2.5 py-2 rounded-lg transition-colors hover:text-white"
              style={{ color: MUTED, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={() => go("white-glove")} className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors" style={{ color: VIOLET_SOFT }}>
            <Star size={13} /> White Glove
          </button>
          <button onClick={onStart} className="hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-white" style={{ color: SOFT }}>Sign In</button>
          <PrimaryBtn onClick={onStart}>Get Started</PrimaryBtn>
          <button className="xl:hidden p-2 rounded-lg" style={{ color: TEXT }} onClick={() => setOpen(o => !o)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && (
        <div className="xl:hidden px-6 pb-4 flex flex-col gap-1" style={{ background: "rgba(7,10,18,0.98)", borderBottom: "1px solid rgba(91,110,225,0.14)" }}>
          {NAV_LINKS.map(([l, id]) => (
            <button key={l} onClick={() => go(id)} className="text-left px-3 py-2.5 rounded-lg" style={{ color: SOFT, fontSize: 14 }}>{l}</button>
          ))}
          <button onClick={() => go("white-glove")} className="text-left px-3 py-2.5 rounded-lg" style={{ color: VIOLET_SOFT, fontSize: 14 }}>White Glove Concierge</button>
        </div>
      )}
    </nav>
  );
}

/* ── HERO ─────────────────────────────────────────────────────── */
function Hero({ onStart }: { onStart: () => void }) {
  const stats: [string, string][] = [
    ["50,000+", "Legacies Protected"],
    ["$2.4B+", "Assets Secured"],
    ["4.9 / 5", "User Rating"],
    ["256-bit", "Encryption"],
  ];
  return (
    <header className="relative flex items-center" style={{ minHeight: "100vh" }}>
      <MediaBackdrop src="/media/hero.mp4" tone="warm" overlay={0.5} eager />
      <div className="relative max-w-6xl mx-auto w-full px-6 py-32 text-center flex flex-col items-center">
        <div className="fpd-fade-in-up flex flex-col items-center">
          <Kicker>Trusted Digital Legacy Platform · Est. 2024</Kicker>
          <h1 style={{ ...DISPLAY, fontSize: "clamp(2.8rem,6.8vw,5.2rem)", fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.03em", color: TEXT, margin: "22px 0 20px" }}>
            My Life.{" "}
            <span style={{ background: `linear-gradient(120deg,${ACCENT},${HILITE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>My Wishes.</span>
            <br />My Way.
          </h1>
          <p style={{ color: SOFT, fontSize: 19, lineHeight: 1.7, maxWidth: 640, marginBottom: 20 }}>
            Final Pass Down is the world's most complete digital legacy platform — store your documents, record your wishes, protect your family, and ensure everything you care about is passed on exactly as you intend.
          </p>
          <p style={{ color: FAINT, fontSize: 12, letterSpacing: "0.22em", ...MONO, marginBottom: 32 }}>PREPARE · PROTECT · PASS DOWN</p>
          <div className="flex flex-wrap items-center justify-center gap-3.5 mb-16">
            <PrimaryBtn onClick={onStart} large>Start Your Legacy <ArrowRight size={18} /></PrimaryBtn>
            <GhostBtn onClick={() => scrollToId("how-it-works")} large><Play size={16} /> Watch Demo</GhostBtn>
          </div>
        </div>

        {/* stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-3xl mb-12">
          {stats.map(([val, label]) => (
            <div key={label} className="p-5 rounded-2xl text-center glow-surface" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div style={{ ...DISPLAY, fontSize: 26, fontWeight: 800, color: HILITE }}>{val}</div>
              <div style={{ color: MUTED, fontSize: 12, marginTop: 4, ...MONO }}>{label}</div>
            </div>
          ))}
        </div>

        {/* social proof */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center">
            {["AR", "MT", "JW", "LK", "DP", "RH"].map((ini, i) => (
              <div key={ini} className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(91,110,225,0.4)", marginLeft: i > 0 ? -10 : 0, background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", fontSize: 11, fontWeight: 700, ...MONO }}>{ini}</div>
            ))}
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid rgba(91,110,225,0.4)", marginLeft: -10, background: "rgba(91,110,225,0.14)", display: "flex", alignItems: "center", justifyContent: "center", color: HILITE, fontSize: 10, fontWeight: 700, ...MONO }}>+50k</div>
          </div>
          <div style={{ color: MUTED, fontSize: 13 }}>Joined by 50,000+ families protecting their legacy</div>
        </div>
      </div>
    </header>
  );
}

/* ── ABOUT ────────────────────────────────────────────────────── */
function About({ onStart }: { onStart: () => void }) {
  const points = [
    "Store every document securely in one encrypted vault",
    "Designate Legacy, Guardian & Emergency Contacts",
    "Record video messages for loved ones to receive after you pass",
    "Plan your funeral, write your final wishes, answer life questions",
    "Keep medical, financial, and personal records organized",
  ];
  return (
    <section id="about" className="relative py-28 px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div>
          <Kicker>About Final Pass Down</Kicker>
          <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: TEXT, lineHeight: 1.15, margin: "18px 0 20px", letterSpacing: "-0.02em" }}>
            What Happens to Your<br />
            <span style={{ color: HILITE }}>Life's Work</span> When You're Gone?
          </h2>
          <p style={{ color: SOFT, fontSize: 16.5, lineHeight: 1.85, marginBottom: 18 }}>
            Most families face chaos after a loved one passes — scrambling to find documents, discover accounts, and piece together final wishes. Final Pass Down changes everything.
          </p>
          <p style={{ color: SOFT, fontSize: 16.5, lineHeight: 1.85, marginBottom: 28 }}>
            We give you a secure digital vault to organize every aspect of your life — from wills and insurance to personal memories and final messages — then deliver it to your trusted contacts exactly when and how you decide.
          </p>
          <div className="flex flex-col gap-3 mb-8">
            {points.map(p => (
              <div key={p} className="flex items-start gap-3">
                <CheckCircle2 size={17} color={ACCENT} style={{ marginTop: 2, flexShrink: 0 }} />
                <span style={{ color: MUTED, fontSize: 15, lineHeight: 1.5 }}>{p}</span>
              </div>
            ))}
          </div>
          <GhostBtn onClick={onStart}>Start your vault <ChevronRight size={16} /></GhostBtn>
        </div>
        <div className="relative rounded-3xl overflow-hidden" style={{ aspectRatio: "4 / 3", border: "1px solid rgba(91,110,225,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <MediaBackdrop src="/media/story-vault.mp4" tone="deep" overlay={0.35} showPlay />
          <div className="absolute top-4 right-4 p-5 rounded-2xl" style={{ background: "rgba(8,12,24,0.82)", border: "1px solid rgba(91,110,225,0.25)", backdropFilter: "blur(10px)" }}>
            <div style={{ ...MONO, color: HILITE, fontSize: 11, marginBottom: 4, letterSpacing: "0.08em" }}>PLATFORM COVERAGE</div>
            <div style={{ ...DISPLAY, fontSize: 32, fontWeight: 800, color: TEXT }}>30+</div>
            <div style={{ color: MUTED, fontSize: 13 }}>Life Categories</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ─────────────────────────────────────────────── */
const STEPS = [
  { icon: <Shield size={22} />, n: "01", title: "Create Your Account", desc: "Sign up and choose your plan. Set up multi-factor authentication and biometric security for your vault." },
  { icon: <Archive size={22} />, n: "02", title: "Build Your Vault", desc: "Upload documents, add life records across 30+ categories — everything from wills to pet care instructions." },
  { icon: <Users size={22} />, n: "03", title: "Designate Contacts", desc: "Add Legacy, Guardian, Emergency, and Pet Emergency contacts. Each verifies their identity with government-issued ID." },
  { icon: <Heart size={22} />, n: "04", title: "Your Legacy Lives On", desc: "When the time comes, your designated contacts receive exactly what you intended — securely and on your terms." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="How it works" title={<>Four Steps to a<br />Secure Legacy</>} sub="Getting started takes less than 10 minutes. Your family will thank you forever." />
        <div className="grid md:grid-cols-4 gap-5">
          {STEPS.map(s => (
            <div key={s.n} className="relative p-7 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div style={{ ...DISPLAY, fontSize: 44, fontWeight: 800, color: "rgba(91,167,214,0.18)", lineHeight: 1, marginBottom: 8 }}>{s.n}</div>
              <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, background: "rgba(91,110,225,0.14)", color: HILITE }}>{s.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.65 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── FEATURES (30+ categories with filter tabs) ───────────────── */
type Feat = { cat: string; icon: React.ReactNode; title: string; desc: string };
const FEATURES: Feat[] = [
  { cat: "legacy", icon: <FileText size={20} />, title: "Will & Testament", desc: "Store executed wills, living wills, and power of attorney documents." },
  { cat: "legacy", icon: <Heart size={20} />, title: "Final Wishes", desc: "Specify exactly what you want done with personal property and bequests." },
  { cat: "legacy", icon: <Users size={20} />, title: "Funeral Planning", desc: "Pre-plan your service: location, music, readings, obituary draft." },
  { cat: "legacy", icon: <Archive size={20} />, title: "Document Vault", desc: "AES-256 encrypted storage for every important document you own." },
  { cat: "legacy", icon: <Video size={20} />, title: "Video Messages", desc: "Record personal video messages delivered to loved ones after you pass." },
  { cat: "legacy", icon: <Eye size={20} />, title: "Questionnaire", desc: "Answer life questions so your family truly knows your story and values." },
  { cat: "personal", icon: <Stethoscope size={20} />, title: "Emergency Info", desc: "Blood type, doctors, hospital preferences, DNR and organ donor status." },
  { cat: "personal", icon: <Bell size={20} />, title: "Allergies", desc: "Complete allergy registry with severity ratings and reaction details." },
  { cat: "personal", icon: <Shield size={20} />, title: "Medications", desc: "Active medications, dosages, prescribers, and refill schedules." },
  { cat: "personal", icon: <Car size={20} />, title: "Vehicles", desc: "Title, VIN, insurance, and transfer instructions for every vehicle." },
  { cat: "personal", icon: <Zap size={20} />, title: "Utilities", desc: "All utility account numbers, providers, and autopay status." },
  { cat: "personal", icon: <Lock size={20} />, title: "Digital Assets", desc: "Cryptocurrency, domain names, social accounts with access methods." },
  { cat: "personal", icon: <KeyRound size={20} />, title: "Firearms", desc: "Serial numbers, registration, safe location, and legal transfer plan." },
  { cat: "financial", icon: <Wallet size={20} />, title: "Insurance Policies", desc: "Life, home, auto, and umbrella policies with beneficiary details." },
  { cat: "financial", icon: <Globe size={20} />, title: "Real Estate", desc: "Property records, deeds, mortgage details, and rental income." },
  { cat: "financial", icon: <TrendingUp size={20} />, title: "Investment Portfolios", desc: "Brokerage accounts, holdings, and beneficiary designations." },
  { cat: "financial", icon: <DollarSign size={20} />, title: "Retirement Accounts", desc: "401(k), IRA, pension, and Social Security information." },
  { cat: "financial", icon: <FileText size={20} />, title: "Tax Records", desc: "Filed returns, preparer contact, and document locations." },
  { cat: "financial", icon: <Building2 size={20} />, title: "Business Accounts", desc: "Business entities, EIN, bank accounts, and succession plans." },
  { cat: "family", icon: <Camera size={20} />, title: "Memories", desc: "Photo and video memories with stories and tags for future generations." },
  { cat: "family", icon: <Heart size={20} />, title: "Kids Activities", desc: "School info, activities, allergies, and guardianship instructions." },
  { cat: "family", icon: <Star size={20} />, title: "Keepsakes", desc: "Sentimental items with their stories and intended recipients." },
  { cat: "family", icon: <Award size={20} />, title: "Awards & Achievements", desc: "Military service, professional recognition, and life accomplishments." },
  { cat: "family", icon: <PawPrint size={20} />, title: "Pet Care", desc: "Vet info, medications, diet, microchip, and emergency pet guardian." },
  { cat: "organize", icon: <Folder size={20} />, title: "Personal Folders", desc: "Custom folders including a locked Secret Vault for ultra-sensitive items." },
  { cat: "organize", icon: <Bell size={20} />, title: "Reminders", desc: "Recurring reminders for document renewals, reviews, and key dates." },
  { cat: "organize", icon: <Calendar size={20} />, title: "Occasions", desc: "Birthdays, anniversaries, and holidays with personal notes." },
  { cat: "organize", icon: <Phone size={20} />, title: "Contacts Hub", desc: "All Legacy, Guardian, Emergency, and Pet Emergency contacts in one place." },
  { cat: "organize", icon: <HardDrive size={20} />, title: "Storage Metering", desc: "Real-time storage dashboard with overage alerts at 80%, 90%, 95%." },
  { cat: "organize", icon: <BarChart3 size={20} />, title: "Activity Log", desc: "Complete audit trail of all vault changes and contact access events." },
];
const CAT_LABELS: Record<string, string> = { all: "All Features", legacy: "Legacy Planning", personal: "Personal Records", financial: "Financial", family: "Family & Memories", organize: "Organization" };

function Features() {
  const [active, setActive] = useState("all");
  const cats = ["all", "legacy", "personal", "financial", "family", "organize"];
  const filtered = active === "all" ? FEATURES : FEATURES.filter(f => f.cat === active);
  return (
    <section id="features" className="relative py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="Platform features" title={<>Everything Your<br />Legacy Needs</>} sub="30+ life categories, all in one military-grade encrypted vault." />
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {cats.map(c => (
            <button key={c} onClick={() => setActive(c)} className="px-5 py-2 rounded-full text-sm transition-all"
              style={{ background: active === c ? `linear-gradient(135deg,${PRIMARY},${ACCENT})` : "rgba(91,110,225,0.06)", color: active === c ? "#fff" : MUTED, border: `1px solid ${active === c ? "transparent" : "rgba(91,110,225,0.18)"}`, fontWeight: active === c ? 700 : 500, ...MONO }}>
              {CAT_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {filtered.map(f => (
            <div key={f.title} className="p-5 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 40, height: 40, background: "rgba(91,110,225,0.12)", color: HILITE }}>{f.icon}</div>
              <div style={{ ...DISPLAY, fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 6 }}>{f.title}</div>
              <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── SECURITY ─────────────────────────────────────────────────── */
const SEC_ITEMS = [
  { icon: <Lock size={22} />, title: "AES-256 Encryption", desc: "Military-grade encryption protects every file, message, and record in your vault." },
  { icon: <Eye size={22} />, title: "Zero-Knowledge Architecture", desc: "We cannot read your data. Only you and your designated contacts can decrypt it." },
  { icon: <Shield size={22} />, title: "Government ID Verification", desc: "Every legacy contact must submit and pass identity verification before gaining access." },
  { icon: <KeyRound size={22} />, title: "Multi-Factor Authentication", desc: "Biometric + authenticator app + backup codes — your account is always protected." },
  { icon: <Globe size={22} />, title: "SOC 2 Type II Compliant", desc: "Annual third-party security audits validate our infrastructure and data practices." },
  { icon: <Zap size={22} />, title: "Breach Notification", desc: "Real-time alerts if any suspicious access is detected on your account." },
];
const SEC_BADGES = ["AES-256 Encrypted", "Zero-Knowledge", "SOC 2 Type II", "HIPAA Compliant", "GDPR Ready", "ISO 27001"];

function Security() {
  return (
    <section id="security" className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-6xl mx-auto">
        <SectionHead kicker="Enterprise-grade security" title={<>Your Data is<br />Fortress-Protected</>} sub="We built Final Pass Down with the same security standards used by banks and defense contractors." />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {SEC_ITEMS.map(item => (
            <div key={item.title} className="p-7 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl mb-5" style={{ width: 48, height: 48, background: "rgba(91,110,225,0.14)", color: HILITE, boxShadow: "0 0 20px rgba(91,110,225,0.15)" }}>{item.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 10 }}>{item.title}</h3>
              <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.7 }}>{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="p-8 rounded-2xl text-center" style={{ background: "rgba(91,110,225,0.06)", border: "1px solid rgba(91,110,225,0.2)" }}>
          <div style={{ ...MONO, color: HILITE, fontSize: 12, letterSpacing: "0.1em", marginBottom: 14 }}>SECURITY CERTIFICATION</div>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {SEC_BADGES.map(b => (
              <div key={b} className="flex items-center gap-2">
                <CheckCircle2 size={14} color={ACCENT} />
                <span style={{ color: SOFT, fontSize: 13 }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PRICING (5 tiers + annual toggle) ────────────────────────── */
type Plan = { name: string; price: number; storage: string; contacts: number; color: string; popular: boolean; features: string[] };
const PLANS: Plan[] = [
  { name: "Starter", price: 1.99, storage: "1 GB", contacts: 1, color: "#48BB78", popular: false, features: ["1 GB Legacy Storage", "1 Legacy Contact", "1 Guardian Contact", "Document Vault", "Encrypted Documents", "Media Uploads", "Photos and Videos", "Legacy Messaging", "Text, Video & Voice Messages", "Calendar Reminders", "Access Control", "Advanced Security", "Email Support"] },
  { name: "Foundation", price: 9.99, storage: "50 GB", contacts: 3, color: ACCENT, popular: false, features: ["50 GB Legacy Storage", "3 Legacy Contacts", "3 Guardian Contacts", "Document Vault", "Encrypted Documents", "Media Uploads", "Photos and Videos", "Legacy Messaging", "Text, Video & Voice Messages", "Calendar Reminders", "Access Control", "Advanced Security", "Email Support"] },
  { name: "Legacy Archive", price: 24.99, storage: "250 GB", contacts: -1, color: PRIMARY, popular: true, features: ["250 GB Legacy Storage", "Unlimited Legacy Contacts", "Unlimited Guardian Contacts", "Document Vault", "Encrypted Documents", "Media Uploads", "Photos and Videos", "Legacy Messaging", "Text, Video & Voice Messages", "Calendar Reminders", "Access Control", "Advanced Security", "Priority Support", "Email and Chat"] },
  { name: "Legacy Pro", price: 49.99, storage: "500 GB", contacts: -1, color: VIOLET, popular: false, features: ["500 GB Legacy Storage", "Unlimited Legacy Contacts", "Unlimited Guardian Contacts", "Document Vault", "Encrypted Documents", "Media Uploads", "Photos and Videos", "Legacy Messaging", "Text, Video & Voice Messages", "Calendar Reminders", "Access Control", "Advanced Security", "Priority Support", "Email and Chat"] },
  { name: "Legacy Vault", price: 129.99, storage: "1 TB", contacts: -1, color: "#ED8936", popular: false, features: ["1 TB Legacy Storage", "Unlimited Legacy Contacts", "Unlimited Guardian Contacts", "Document Vault", "Encrypted Documents", "Media Uploads", "Photos and Videos", "Legacy Messaging", "Text, Video & Voice Messages", "Calendar Reminders", "Access Control", "Advanced Security", "Priority Support", "Email and Chat"] },
];

function Pricing({ onStart }: { onStart: () => void }) {
  const [annual, setAnnual] = useState(false);
  return (
    <section id="pricing" className="relative py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="Simple pricing" title={<>Invest in Your<br />Family's Future</>} sub="All plans include metered GB storage. Unused monthly storage expires at billing reset. Overage billed at $0.50/GB (Starter) or $0.40/GB (all other plans)." />
        <div className="flex items-center justify-center gap-3 mb-12">
          <span style={{ color: MUTED, fontSize: 14 }}>Monthly</span>
          <button onClick={() => setAnnual(a => !a)} className="relative rounded-full transition-all" style={{ width: 48, height: 26, background: annual ? PRIMARY : "#0A1628", border: "1px solid rgba(91,110,225,0.3)", boxShadow: annual ? "0 0 20px rgba(91,110,225,0.4)" : "none" }}>
            <div className="absolute top-1 rounded-full transition-all" style={{ width: 18, height: 18, background: "#fff", left: annual ? 26 : 4 }} />
          </button>
          <span style={{ color: annual ? HILITE : MUTED, fontSize: 14 }}>Annual <span style={{ color: "#48BB78", fontSize: 12 }}>Save 20%</span></span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch">
          {PLANS.map(plan => (
            <div key={plan.name} className="relative p-7 rounded-2xl flex flex-col glow-surface fpd-hover-lift"
              style={{ background: CARD, border: plan.popular ? `1.5px solid ${plan.color}` : "1px solid rgba(91,110,225,0.16)", boxShadow: plan.popular ? "0 0 40px rgba(91,110,225,0.25)" : "none" }}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", ...MONO, whiteSpace: "nowrap" }}>MOST POPULAR</div>
              )}
              <div style={{ ...MONO, color: plan.color, fontSize: 11, letterSpacing: "0.12em", marginBottom: 12 }}>{plan.name.toUpperCase()}</div>
              <div className="flex items-baseline gap-1 mb-2">
                <span style={{ ...DISPLAY, fontSize: 40, fontWeight: 800, color: TEXT }}>${annual ? (plan.price * 0.8).toFixed(2) : plan.price}</span>
                <span style={{ color: MUTED, fontSize: 14 }}>/mo</span>
              </div>
              <div style={{ color: MUTED, fontSize: 13, marginBottom: 22 }}>{plan.storage} storage · {plan.contacts === -1 ? "Unlimited" : plan.contacts} contacts</div>
              <ul className="flex flex-col gap-3 flex-1 mb-7">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckCircle2 size={13} color={plan.color} style={{ marginTop: 3, flexShrink: 0 }} />
                    <span style={{ color: SOFT, fontSize: 13 }}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className="w-full py-3 rounded-xl font-semibold text-sm fpd-btn-lift"
                style={plan.popular ? { background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", boxShadow: "0 8px 24px rgba(91,110,225,0.4)" } : { background: "rgba(91,110,225,0.08)", color: HILITE, border: "1px solid rgba(91,110,225,0.25)" }}>
                Get Started
              </button>
            </div>
          ))}
        </div>
        <p className="text-center mt-8" style={{ color: MUTED, fontSize: 13 }}>All plans billed in USD. No contracts. Cancel anytime. Overage auto-billed at end of cycle.</p>
      </div>
    </section>
  );
}

/* ── AFFILIATES ───────────────────────────────────────────────── */
function Affiliates({ onStart }: { onStart: () => void }) {
  const tiers = [
    { tier: "Tier 1", range: "5–24 active accounts", rate: "20%", note: "12-month cap per referral" },
    { tier: "Tier 2", range: "25–74 active accounts", rate: "25%", note: "12-month cap per referral" },
    { tier: "Tier 3", range: "74+ active accounts", rate: "30%", note: "12-month cap per referral" },
  ];
  const benefits: [string, string][] = [
    ["Commission paid monthly", "Commissions hit your account on the 1st of each month"],
    ["12-month earning window", "Each referral earns you commission for their full first 12 months"],
    ["Automatic tier upgrades", "Hit 25+ referrals and your rate jumps automatically"],
    ["No cap on referrals", "Refer as many people as you want — more referrals, more income"],
  ];
  return (
    <section id="affiliates" className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <Kicker>Affiliate Program</Kicker>
          <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4vw,3rem)", fontWeight: 700, color: TEXT, lineHeight: 1.15, margin: "18px 0 20px", letterSpacing: "-0.02em" }}>
            Earn Up to <span style={{ color: HILITE }}>30%</span><br />Referring Friends
          </h2>
          <p style={{ color: SOFT, fontSize: 16, lineHeight: 1.85, marginBottom: 28 }}>
            Share your unique affiliate link. Every time someone signs up through your link and stays subscribed, you earn a monthly commission for 12 months — automatically, no invoices needed.
          </p>
          <div className="flex flex-col gap-3 mb-8">
            {benefits.map(([bold, rest]) => (
              <div key={bold} className="flex items-start gap-3">
                <CheckCircle2 size={15} color={ACCENT} style={{ marginTop: 3, flexShrink: 0 }} />
                <span style={{ color: SOFT, fontSize: 14 }}><strong style={{ color: TEXT }}>{bold}</strong> — {rest}</span>
              </div>
            ))}
          </div>
          <PrimaryBtn onClick={onStart}>Join Affiliate Program <ArrowRight size={16} /></PrimaryBtn>
        </div>
        <div className="flex flex-col gap-4">
          {tiers.map(t => (
            <div key={t.tier} className="p-6 rounded-2xl glow-surface" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.18)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div style={{ ...MONO, color: HILITE, fontSize: 11, letterSpacing: "0.1em", marginBottom: 4 }}>{t.tier.toUpperCase()}</div>
                  <div style={{ color: TEXT, fontSize: 15, fontWeight: 500 }}>{t.range}</div>
                  <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>{t.note}</div>
                </div>
                <div style={{ ...DISPLAY, fontSize: 42, fontWeight: 800, color: HILITE }}>{t.rate}</div>
              </div>
            </div>
          ))}
          <div className="p-5 rounded-2xl text-center" style={{ background: "rgba(91,110,225,0.06)", border: "1px solid rgba(91,110,225,0.2)" }}>
            <div style={{ color: MUTED, fontSize: 13 }}>Example: 30 referrals on Legacy Archive ($24.99/mo) =</div>
            <div style={{ ...DISPLAY, fontSize: 28, fontWeight: 800, color: HILITE, marginTop: 4 }}>$187.43 / month</div>
            <div style={{ color: MUTED, fontSize: 12, marginTop: 2 }}>at Tier 2 (25%) for 12 months</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PARTNERSHIPS ─────────────────────────────────────────────── */
function Partnerships({ onStart }: { onStart: () => void }) {
  const tiers = [
    { tier: "Tier 1", range: "0–50 referred accounts", rate: "20%" },
    { tier: "Tier 2", range: "51–100 referred accounts", rate: "25%" },
    { tier: "Tier 3", range: "101+ referred accounts", rate: "30%" },
  ];
  const partners = [
    { icon: <Scale size={18} />, label: "Estate Attorneys", desc: "Offer clients a comprehensive digital legacy tool as part of your practice." },
    { icon: <Wallet size={18} />, label: "Financial Advisors", desc: "Help clients protect and organize the assets you manage for them." },
    { icon: <Building2 size={18} />, label: "Senior Living Centers", desc: "Provide residents and families peace of mind as part of your care offering." },
    { icon: <Landmark size={18} />, label: "Banks & Credit Unions", desc: "Add digital legacy planning to your financial wellness product suite." },
    { icon: <Stethoscope size={18} />, label: "Healthcare Providers", desc: "Support advance directives and end-of-life planning for your patients." },
    { icon: <Heart size={18} />, label: "Funeral Homes", desc: "Offer pre-planning services and connect families to organized digital records." },
  ];
  return (
    <section id="partners" className="relative py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHead kicker="Strategic partnerships" title={<>Recurring <span style={{ color: HILITE }}>Lifetime</span> Commissions</>} sub="Built for professionals who serve clients going through major life transitions. Refer once, earn forever." />
        <div className="grid md:grid-cols-3 gap-5 mb-12">
          {tiers.map(t => (
            <div key={t.tier} className="p-7 rounded-2xl text-center glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.18)" }}>
              <div style={{ ...DISPLAY, fontSize: 52, fontWeight: 800, color: HILITE, lineHeight: 1 }}>{t.rate}</div>
              <div style={{ ...MONO, color: ACCENT, fontSize: 11, letterSpacing: "0.1em", margin: "8px 0 4px" }}>{t.tier.toUpperCase()}</div>
              <div style={{ color: MUTED, fontSize: 13 }}>{t.range}</div>
              <div className="mt-3 flex items-center justify-center gap-1" style={{ color: "#48BB78", fontSize: 12 }}>
                <CheckCircle2 size={12} /> Recurring · Lifetime · No cap
              </div>
            </div>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {partners.map(p => (
            <div key={p.label} className="flex items-start gap-4 p-5 rounded-2xl glow-surface" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 40, height: 40, background: "rgba(91,110,225,0.12)", color: HILITE }}>{p.icon}</div>
              <div>
                <div style={{ color: TEXT, fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{p.label}</div>
                <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.7 }}>{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center">
          <PrimaryBtn onClick={onStart} large>Apply for Partnership <ArrowRight size={18} /></PrimaryBtn>
        </div>
      </div>
    </section>
  );
}

/* ── WHITE GLOVE CONCIERGE ────────────────────────────────────── */
function WhiteGlove({ onStart }: { onStart: () => void }) {
  const vBorder = "rgba(126,107,216,0.25)";
  const steps = [
    { icon: <Phone size={20} />, num: "01", title: "We Call You", desc: "A dedicated Final Pass Down specialist calls you personally. No forms to fill out online. Just a phone call." },
    { icon: <FileText size={20} />, num: "02", title: "We Handle Everything", desc: "Your specialist uploads every document, sets up your legacy contacts, and records your final wishes — exactly as you describe them." },
    { icon: <Users size={20} />, num: "03", title: "We Verify Together", desc: "We walk through the completed vault with you over the phone, confirm every detail is exactly right, and make any adjustments." },
    { icon: <CheckCircle2 size={20} />, num: "04", title: "You're Protected", desc: "Your family is protected. Your legacy is organized. You didn't have to touch a single keyboard." },
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
  const perfectFor = [
    "Seniors and older adults",
    "Anyone recovering from illness",
    "People with very limited tech experience",
    "Family members setting up on behalf of a loved one",
    "Those with an urgent timeline (medical procedure, travel)",
  ];
  const trust = [
    { icon: <Shield size={18} />, title: "Your Privacy Is Sacred", desc: "Your information is encrypted and your specialist's access ends the moment your setup is complete." },
    { icon: <Star size={18} />, title: "Real Humans, Always", desc: "No chatbots. No automated systems. Every session is with a named, trained Final Pass Down specialist." },
    { icon: <Heart size={18} />, title: "At Your Pace, Always", desc: "Sessions happen when you're ready. Most clients finish in 2–3 calls over 1–2 weeks. We never rush." },
  ];
  return (
    <section id="white-glove" className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0B0818,#070A12)" }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 flex flex-col items-center">
          <Kicker tone="violet">White Glove Concierge Service</Kicker>
          <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4.5vw,3.2rem)", fontWeight: 700, color: TEXT, lineHeight: 1.12, margin: "18px 0 16px", letterSpacing: "-0.02em" }}>
            Not Comfortable With Technology?<br />
            <span style={{ color: VIOLET_SOFT }}>We Do Everything For You.</span>
          </h2>
          <p style={{ color: SOFT, fontSize: 17, lineHeight: 1.85, maxWidth: 620 }}>
            Final Pass Down's White Glove Concierge Service is for people who want their legacy protected but don't want to deal with apps, uploads, or anything technical. A real person calls you, listens to you, and handles everything — start to finish — over the phone.
          </p>
        </div>

        {/* 4 steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {steps.map(s => (
            <div key={s.num} className="relative p-6 rounded-2xl" style={{ background: "rgba(126,107,216,0.05)", border: `1px solid ${vBorder}`, borderTop: `3px solid rgba(126,107,216,0.5)` }}>
              <div style={{ ...DISPLAY, color: "rgba(126,107,216,0.28)", fontSize: 52, fontWeight: 800, lineHeight: 1, marginBottom: 12 }}>{s.num}</div>
              <div style={{ color: VIOLET_SOFT, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ ...DISPLAY, fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{s.title}</div>
              <div style={{ color: MUTED, fontSize: 13, lineHeight: 1.75 }}>{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Pricing — two cards */}
        <div className="grid md:grid-cols-2 gap-5 mb-14">
          <div className="rounded-3xl p-8 text-center" style={{ background: "linear-gradient(135deg,#0A0820,#150E30)", border: `2px solid rgba(126,107,216,0.4)`, boxShadow: "0 0 48px rgba(126,107,216,0.15)" }}>
            <div style={{ color: VIOLET_SOFT, fontSize: 11, ...MONO, letterSpacing: "0.14em", marginBottom: 12 }}>ONE-TIME SETUP FEE</div>
            <div style={{ ...DISPLAY, fontSize: 72, fontWeight: 800, color: TEXT, lineHeight: 1, marginBottom: 6 }}>$99</div>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>Paid once · Gets you started with your dedicated specialist</div>
            <div className="flex flex-col gap-2 text-left">
              {["Specialist assigned to your account", "Intake call to understand your needs", "Secure document upload link sent to you", "Full onboarding plan created"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 size={12} color={VIOLET} />
                  <span style={{ color: SOFT, fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl p-8 text-center" style={{ background: "rgba(126,107,216,0.06)", border: `2px solid ${vBorder}` }}>
            <div style={{ color: VIOLET, fontSize: 11, ...MONO, letterSpacing: "0.14em", marginBottom: 12 }}>SESSION RATE</div>
            <div style={{ ...DISPLAY, fontSize: 72, fontWeight: 800, color: TEXT, lineHeight: 1, marginBottom: 6 }}>$25</div>
            <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>per 30 minutes · Only pay for time you use</div>
            <div className="flex flex-col gap-2 text-left mb-6">
              {["Phone or video session with your specialist", "Specialist uploads documents during the call", "Session notes + progress tracking", "No minimum session requirement"].map(f => (
                <div key={f} className="flex items-center gap-2">
                  <CheckCircle2 size={12} color={VIOLET} />
                  <span style={{ color: SOFT, fontSize: 13 }}>{f}</span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 rounded-2xl" style={{ background: "rgba(126,107,216,0.1)", border: `1px solid ${vBorder}` }}>
              <div style={{ color: VIOLET_SOFT, fontSize: 12, fontWeight: 600 }}>Typical Total: $199–$249</div>
              <div style={{ color: MUTED, fontSize: 11 }}>$99 setup + 2–3 hours of sessions</div>
            </div>
          </div>
        </div>

        {/* Included + CTA */}
        <div className="grid md:grid-cols-2 gap-10 items-center mb-16">
          <div>
            <div style={{ color: VIOLET_SOFT, fontSize: 11, ...MONO, letterSpacing: "0.14em", marginBottom: 16 }}>EVERYTHING INCLUDED</div>
            <ul className="flex flex-col gap-3">
              {included.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 size={14} color={VIOLET} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: SOFT, fontSize: 14, lineHeight: 1.6 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(126,107,216,0.08)", border: `2px solid ${vBorder}`, boxShadow: "0 0 60px rgba(126,107,216,0.1)" }}>
            <div style={{ position: "relative", height: 200 }}>
              <MediaBackdrop tone="deep" overlay={0.5} />
              <div style={{ position: "absolute", bottom: 16, left: 20 }}>
                <div style={{ ...DISPLAY, color: VIOLET_SOFT, fontSize: 14, fontWeight: 700 }}>Your Personal Specialist</div>
                <div style={{ ...MONO, color: MUTED, fontSize: 11 }}>Calls you within 1 business day</div>
              </div>
            </div>
            <div className="p-8 text-center">
              <div style={{ ...DISPLAY, fontSize: 24, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Perfect For</div>
              <div className="flex flex-col gap-2 mb-8">
                {perfectFor.map(p => (<div key={p} style={{ color: SOFT, fontSize: 13 }}>· {p}</div>))}
              </div>
              <div style={{ ...DISPLAY, color: VIOLET_SOFT, fontSize: 26, fontWeight: 700, marginBottom: 4 }}>Just Leave Your Number.</div>
              <div style={{ color: MUTED, fontSize: 13, marginBottom: 20 }}>A specialist calls within 1 business day. No apps. No computers. Just a phone call.</div>
              <div className="flex justify-center gap-4 mb-5">
                <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(126,107,216,0.12)", border: `1px solid ${vBorder}` }}>
                  <div style={{ ...DISPLAY, color: TEXT, fontSize: 18, fontWeight: 700 }}>$99</div>
                  <div style={{ color: MUTED, fontSize: 10, ...MONO }}>SETUP FEE</div>
                </div>
                <div style={{ color: FAINT, fontSize: 20, display: "flex", alignItems: "center" }}>+</div>
                <div className="px-4 py-2 rounded-xl" style={{ background: "rgba(126,107,216,0.12)", border: `1px solid ${vBorder}` }}>
                  <div style={{ ...DISPLAY, color: TEXT, fontSize: 18, fontWeight: 700 }}>$25</div>
                  <div style={{ color: MUTED, fontSize: 10, ...MONO }}>PER 30 MIN</div>
                </div>
              </div>
              <button onClick={onStart} className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base fpd-btn-lift" style={{ background: `linear-gradient(135deg,${VIOLET},${VIOLET_SOFT})`, color: "#0A0820", boxShadow: "0 0 32px rgba(126,107,216,0.4)" }}>
                <Phone size={18} /> Request My White Glove Call
              </button>
              <div style={{ color: FAINT, fontSize: 11, marginTop: 12 }}>No obligation · Available Mon–Fri 9AM–7PM</div>
            </div>
          </div>
        </div>

        {/* trust strip */}
        <div className="grid md:grid-cols-3 gap-4">
          {trust.map(t => (
            <div key={t.title} className="p-5 rounded-2xl text-center" style={{ background: "rgba(126,107,216,0.04)", border: "1px solid rgba(126,107,216,0.12)" }}>
              <div style={{ color: VIOLET, margin: "0 auto 10px", display: "flex", justifyContent: "center" }}>{t.icon}</div>
              <div style={{ ...DISPLAY, fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>{t.title}</div>
              <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.7 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── WHITE LABEL ──────────────────────────────────────────────── */
function getMonthlyPrice(p: WLPackage): number {
  const b = p.billing;
  if (b.type === "flat_monthly") return b.flatMonthly;
  return (b as any).minMonthly ?? 0;
}

function WhiteLabel({ onStart }: { onStart: () => void }) {
  const { packages } = useWLPackages();
  const active = packages.filter(p => p.active);
  const perks = [
    { icon: <Globe size={18} />, title: "Custom Domain", desc: "Your own domain — clients never see FPD branding" },
    { icon: <Layers size={18} />, title: "Full Branding", desc: "Logo, colors, fonts, email templates — all yours" },
    { icon: <Award size={18} />, title: "HIPAA + SOC 2", desc: "Legacy Vault compliance baked in at no extra cost" },
    { icon: <Zap size={18} />, title: "Stripe + More", desc: "Stripe, PayPal, Square or bring your own processor" },
  ];
  return (
    <section id="white-label" className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-6xl mx-auto">
        <SectionHead kicker="White label solutions" title={<>Launch Your Own<br />Legacy Platform</>} sub="License the full Final Pass Down platform under your brand. Pricing updates live when admin adjusts packages." />
        {active.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {active.map(p => {
              const monthly = getMonthlyPrice(p);
              return (
                <div key={p.id} className="rounded-2xl p-7 relative flex flex-col glow-surface fpd-hover-lift"
                  style={{ background: CARD, border: `1px solid ${p.badge ? p.color : "rgba(91,110,225,0.16)"}`, boxShadow: p.badge ? `0 0 40px ${p.color}30` : "none" }}>
                  {p.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold" style={{ background: p.color, color: "#04080F", ...MONO, whiteSpace: "nowrap" }}>{p.badge}</div>
                  )}
                  <div style={{ color: p.color, fontSize: 10, ...MONO, letterSpacing: "0.14em", fontWeight: 700, marginBottom: 6 }}>{p.tier}</div>
                  <div style={{ ...DISPLAY, fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ color: SOFT, fontSize: 14, marginBottom: 16 }}>{p.userLimitLabel}</div>
                  <div className="mb-1">
                    <span style={{ ...DISPLAY, fontSize: 40, fontWeight: 800, color: p.color, lineHeight: 1 }}>${monthly.toLocaleString()}</span>
                    <span style={{ color: MUTED, fontSize: 13 }}>/mo</span>
                  </div>
                  <div style={{ color: FAINT, fontSize: 12, marginBottom: 16 }}>+ ${p.billing.setupFee.toLocaleString()} one-time setup fee</div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <Globe size={10} color={FAINT} />
                    <span style={{ color: FAINT, fontSize: 10, ...MONO, flex: 1 }} className="truncate">{p.onboardingLink}</span>
                  </div>
                  <ul className="flex flex-col gap-2 flex-1 mb-6">
                    {p.features.map(f => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={11} color={p.color} style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ color: SOFT, fontSize: 12, lineHeight: 1.5 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={onStart} className="w-full py-3 rounded-xl font-bold text-sm fpd-btn-lift"
                    style={{ background: p.badge ? `linear-gradient(135deg,${p.color},${p.color}BB)` : "transparent", color: p.badge ? "#fff" : p.color, border: `1px solid ${p.color}60`, boxShadow: p.badge ? `0 0 24px ${p.color}40` : "none" }}>
                    Apply for {p.name} →
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {perks.map(f => (
            <div key={f.title} className="flex gap-3 p-5 rounded-2xl glow-surface" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div style={{ color: HILITE, flexShrink: 0 }}>{f.icon}</div>
              <div>
                <div style={{ color: TEXT, fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{f.title}</div>
                <div style={{ color: MUTED, fontSize: 12, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── TESTIMONIALS ─────────────────────────────────────────────── */
function Testimonials() {
  const quotes = [
    { name: "Dr. Rebecca Hayes", role: "Estate Planning Attorney, Chicago", initials: "RH", quote: "I now recommend Final Pass Down to every single client. It fills a gap that no legal document can — the human story behind the estate.", rating: 5 },
    { name: "Marcus & Diana Torres", role: "Retired Couple, Sacramento CA", initials: "MT", quote: "After our health scare last year, we realized our kids would have had no idea where anything was. FPD changed that in a weekend.", rating: 5 },
    { name: "James Washington", role: "Financial Advisor, Atlanta", initials: "JW", quote: "The partnership program is incredible. My clients get a world-class service, and I earn recurring income for simply doing the right thing for them.", rating: 5 },
  ];
  return (
    <section className="relative py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <SectionHead kicker="Testimonials" title={<>Trusted by Thousands<br />Across America</>} />
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map(q => (
            <div key={q.name} className="p-7 rounded-2xl flex flex-col glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
              <div className="flex gap-1 mb-4">
                {Array.from({ length: q.rating }).map((_, i) => <Star key={i} size={13} fill={HILITE} color={HILITE} />)}
              </div>
              <p style={{ color: SOFT, fontSize: 14.5, lineHeight: 1.85, flex: 1, marginBottom: 20 }}>"{q.quote}"</p>
              <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid rgba(91,110,225,0.12)" }}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 46, height: 46, borderRadius: "50%", background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", fontSize: 14, fontWeight: 700, ...MONO }}>{q.initials}</div>
                <div>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{q.name}</div>
                  <div style={{ color: MUTED, fontSize: 12 }}>{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── HELP & FAQ ───────────────────────────────────────────────── */
function Help() {
  const [open, setOpen] = useState<number | null>(null);
  const faqs = [
    { q: "Who can access my vault?", a: "Only you and the contacts you specifically designate. Legacy Contacts must pass government-ID verification before any access is granted. You control exactly what each contact can see and when." },
    { q: "What happens to my data if I cancel?", a: "Your data is retained for 90 days after cancellation so you can export everything. After 90 days it is permanently and irreversibly deleted per our privacy policy." },
    { q: "How does storage metering work?", a: "Every file you upload is counted toward your monthly storage allowance in gigabytes. Unused storage does not carry forward — it resets each billing cycle. If you exceed your plan limit, overage is billed at $0.50/GB on Starter or $0.40/GB on all other plans." },
    { q: "What happens when I pass away?", a: "Your designated executor or Legacy Contact initiates the release process. They submit a death certificate, complete identity verification, and our compliance team reviews the request within 24–48 hours before granting access." },
    { q: "Is Final Pass Down available on mobile?", a: "Yes — iOS and Android apps are available, plus a Progressive Web App (PWA) that works on any device without an app store download." },
    { q: "Can I update my documents anytime?", a: "Yes. You can add, replace, or delete any document at any time. Your contacts only ever receive the most current version of your vault when access is triggered." },
    { q: "How do I verify my legacy contacts?", a: "You invite them via email. They click a secure link, create a limited account, and upload a government-issued photo ID. Our team verifies within 1–2 business days." },
    { q: "What is the difference between affiliate and partnership?", a: "Affiliates earn a commission per referred user for 12 months (capped per referral). Partners — typically businesses like law firms or financial advisors — earn recurring lifetime commissions on every account they refer, with no time cap." },
  ];
  return (
    <section id="help" className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-3xl mx-auto">
        <SectionHead kicker="Help & advice" title={<>Frequently Asked<br />Questions</>} sub="Everything you need to know about Final Pass Down." />
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(91,110,225,0.16)" }}>
              <button className="w-full flex items-center justify-between px-6 py-5" onClick={() => setOpen(open === i ? null : i)}
                style={{ background: open === i ? "rgba(91,110,225,0.08)" : CARD, textAlign: "left" }}>
                <span style={{ color: TEXT, fontSize: 15, fontWeight: 500 }}>{faq.q}</span>
                <ChevronDown size={16} color={HILITE} style={{ transform: open === i ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }} />
              </button>
              {open === i && (
                <div className="px-6 pb-5 pt-1" style={{ background: "rgba(91,110,225,0.04)", color: SOFT, fontSize: 14, lineHeight: 1.85 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-12 p-8 rounded-2xl text-center glow-surface" style={{ background: CARD, border: "1px solid rgba(91,110,225,0.16)" }}>
          <div style={{ ...DISPLAY, fontSize: 20, fontWeight: 700, color: TEXT, marginBottom: 8 }}>Still have questions?</div>
          <p style={{ color: MUTED, fontSize: 14, marginBottom: 20 }}>Our team is available 7 days a week. Average response time: under 2 hours.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="mailto:support@finalpassdown.com"><GhostBtn><Mail size={15} /> Email Support</GhostBtn></a>
            <GhostBtn><Phone size={15} /> Call Us</GhostBtn>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── CTA ──────────────────────────────────────────────────────── */
function CTA({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative py-28 px-6">
      <div className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden text-center px-6 py-20" style={{ border: "1px solid rgba(91,110,225,0.24)" }}>
        <MediaBackdrop src="/media/cta.mp4" tone="blue" overlay={0.6} />
        <div className="relative flex flex-col items-center">
          <img src={fpdSquareLogo} alt="Final Pass Down" style={{ width: 72, height: 72, borderRadius: 16, objectFit: "contain", marginBottom: 20, boxShadow: "0 0 60px rgba(91,110,225,0.3)" }} />
          <Kicker>Start today</Kicker>
          <h2 style={{ ...DISPLAY, fontSize: "clamp(2.2rem,5vw,3.8rem)", fontWeight: 800, color: TEXT, margin: "18px 0 14px", lineHeight: 1.1, letterSpacing: "-0.02em", maxWidth: 680 }}>
            Start Your Legacy Today
          </h2>
          <p style={{ color: SOFT, fontSize: 17, maxWidth: 520, lineHeight: 1.7, marginBottom: 30 }}>
            Join 50,000+ people who have secured their digital legacy. Takes less than 10 minutes to start — free to begin, no card required.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <PrimaryBtn onClick={onStart} large>Create Your Vault <ArrowRight size={18} /></PrimaryBtn>
            <a href="mailto:hello@finalpassdown.com"><GhostBtn large><Mail size={16} /> Talk to Us</GhostBtn></a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ───────────────────────────────────────────────────── */
const FOOTER_COLS: [string, string[]][] = [
  ["Platform", ["Dashboard", "Document Vault", "Final Wishes", "Medical Info", "Financial Records", "Personal Assets", "Family & Memories", "Contacts Hub"]],
  ["Programs", ["Affiliate Program", "Business Partnerships", "White Label Solutions", "Legacy Vault API"]],
  ["Resources", ["Help Center", "Security Overview", "Privacy Policy", "Terms of Service", "Cookie Policy", "HIPAA Compliance"]],
  ["Company", ["About Us", "Careers", "Press", "Contact", "Blog", "Investor Relations"]],
];

function Footer({ onStart, onAdminLogin, onPartnerPortal, onConciergeLogin }:
  { onStart: () => void; onAdminLogin?: () => void; onPartnerPortal?: () => void; onConciergeLogin?: () => void }) {
  const linkTargets: Record<string, string> = {
    "Document Vault": "features", "Final Wishes": "features", "Medical Info": "features",
    "Financial Records": "features", "Personal Assets": "features", "Family & Memories": "features",
    "Contacts Hub": "features", "Affiliate Program": "affiliates", "Business Partnerships": "partners",
    "White Label Solutions": "white-label", "Help Center": "help", "Security Overview": "security",
    "About Us": "about", "Contact": "help",
  };
  return (
    <footer className="relative px-6 pt-16 pb-8" style={{ background: "#050810", borderTop: "1px solid rgba(91,110,225,0.14)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={fpdSquareLogo} alt="Final Pass Down" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "contain" }} />
              <span style={{ fontFamily: "var(--font-display)", color: TEXT, fontSize: 14, fontWeight: 700, letterSpacing: "0.08em", whiteSpace: "nowrap" }}>FINAL PASS DOWN</span>
            </div>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.7, maxWidth: 300, marginBottom: 12 }}>
              The secure digital vault for everything that matters — prepared by you, passed down to those you love.
            </p>
            <p style={{ color: FAINT, fontSize: 12, ...MONO, marginBottom: 8 }}>My Life · My Wishes · My Way</p>
            <p style={{ color: FAINT, fontSize: 11 }}>AES-256 Encrypted · SOC 2 Type II · HIPAA Compliant</p>
            <div className="mt-5"><PrimaryBtn onClick={onStart}>Get Started</PrimaryBtn></div>
          </div>
          {FOOTER_COLS.map(([title, links]) => (
            <div key={title}>
              <div style={{ color: FAINT, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", ...MONO, marginBottom: 14 }}>{title}</div>
              <div className="flex flex-col gap-2.5">
                {links.map((l, i) => (
                  <button key={`${l}-${i}`} onClick={() => { const t = linkTargets[l]; if (t) scrollToId(t); else onStart(); }} className="text-left transition-colors hover:text-white" style={{ color: MUTED, fontSize: 14 }}>{l}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: "1px solid rgba(91,110,225,0.1)" }}>
          <span style={{ color: FAINT, fontSize: 13 }}>© {new Date().getFullYear()} Final Pass Down Inc. All rights reserved.</span>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {["App Store", "Google Play", "PWA"].map(p => (
              <span key={p} className="px-3 py-1 rounded-lg text-xs" style={{ background: "rgba(91,110,225,0.08)", color: HILITE, border: "1px solid rgba(91,110,225,0.2)", ...MONO }}>{p}</span>
            ))}
            {onPartnerPortal && (
              <button onClick={onPartnerPortal} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(72,187,120,0.1)", color: "#48BB78", border: "1px solid rgba(72,187,120,0.3)", ...MONO, letterSpacing: "0.06em" }}>
                <Handshake size={11} /> PARTNER PORTAL
              </button>
            )}
            {onConciergeLogin && (
              <button onClick={onConciergeLogin} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(126,107,216,0.1)", color: VIOLET_SOFT, border: "1px solid rgba(126,107,216,0.3)", ...MONO, letterSpacing: "0.06em" }}>
                <Star size={11} /> CONCIERGE STAFF
              </button>
            )}
            {onAdminLogin && (
              <button onClick={onAdminLogin} className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all" style={{ background: "rgba(91,110,225,0.12)", color: HILITE, border: "1px solid rgba(91,110,225,0.35)", ...MONO, letterSpacing: "0.06em" }}>
                <Lock size={11} /> MASTER ADMIN LOGIN
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── ROOT EXPORT ──────────────────────────────────────────────── */
export function LandingPage({ onGetStarted, onAdminLogin, onPartnerPortal, onConciergeLogin }:
  { onGetStarted: () => void; onAdminLogin?: () => void; onPartnerPortal?: () => void; onConciergeLogin?: () => void }) {
  if (typeof window !== "undefined") (window as any).__adminLogin = onAdminLogin;
  return (
    <div style={{ fontFamily: "var(--font-body)", background: BG, color: TEXT, overflowX: "hidden" }}>
      <TopNav onStart={onGetStarted} />
      <main>
        <Hero onStart={onGetStarted} />
        <About onStart={onGetStarted} />
        <HowItWorks />
        <Features />
        <Security />
        <Pricing onStart={onGetStarted} />
        <Affiliates onStart={onGetStarted} />
        <Partnerships onStart={onGetStarted} />
        <WhiteGlove onStart={onGetStarted} />
        <WhiteLabel onStart={onGetStarted} />
        <Testimonials />
        <Help />
        <CTA onStart={onGetStarted} />
      </main>
      <Footer onStart={onGetStarted} onAdminLogin={onAdminLogin} onPartnerPortal={onPartnerPortal} onConciergeLogin={onConciergeLogin} />
    </div>
  );
}
