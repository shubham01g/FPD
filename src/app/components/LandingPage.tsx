import React, { useState, useEffect, useRef } from "react";
import {
  Shield, Lock, Archive, Users, ArrowRight, CheckCircle2, Heart,
  KeyRound, Camera, FolderLock, Menu, X, Play, ChevronRight,
  HandCoins, Handshake, FileCheck2, Fingerprint, Server, Mail, Phone,
  Star, MessageSquare, Building2, Scale, Landmark, TrendingUp,
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_new_logo.png";
import fpdLongLogo from "../../imports/FPD_long_logo_blue.png";

/* ── Royal Vault Blue palette ─────────────────────────────────── */
const BG = "#070A12";
const CARD = "#101728";
const PRIMARY = "#3A5BD9";
const ACCENT = "#5B7BF5";
const HILITE = "#8AA0FF";
const TEXT = "#F0F0F5";
const SOFT = "#B8C8E0";
const MUTED = "#8A97B8";
const FAINT = "#5A6A88";

const DISPLAY: React.CSSProperties = { fontFamily: "var(--font-display)" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

/* ── Marketing site pages ─────────────────────────────────────── */
type MPage = "home" | "about" | "how" | "features" | "security" | "pricing" | "affiliate" | "partnership" | "contact";
type Nav = (p: MPage) => void;

/* ── Swappable media backdrop ─────────────────────────────────────
   Renders a branded gradient placeholder always; a lightweight poster
   image paints instantly, and the <video> only mounts/streams once the
   backdrop is eager (hero) or scrolls near the viewport — so the page
   loads fast on any device (see public/media). Poster defaults to the
   `.jpg` alongside a `.mp4` src, so callers rarely pass it explicitly. */
function MediaBackdrop({ src, poster, tone = "blue", overlay = 0.55, showPlay = false, eager = false }:
  { src?: string; poster?: string; tone?: "blue" | "deep" | "warm"; overlay?: number; showPlay?: boolean; eager?: boolean }) {
  const gradients: Record<string, string> = {
    blue: "radial-gradient(120% 130% at 25% 15%, rgba(58,91,217,0.38), transparent 58%), radial-gradient(100% 110% at 85% 90%, rgba(91,123,245,0.26), transparent 55%), linear-gradient(160deg,#0C1630,#070A12)",
    deep: "radial-gradient(120% 130% at 80% 10%, rgba(46,75,176,0.42), transparent 60%), radial-gradient(90% 90% at 10% 100%, rgba(58,91,217,0.20), transparent 55%), linear-gradient(160deg,#080D1C,#05070E)",
    warm: "radial-gradient(120% 120% at 30% 20%, rgba(138,160,255,0.28), transparent 55%), radial-gradient(100% 100% at 90% 80%, rgba(58,91,217,0.30), transparent 55%), linear-gradient(160deg,#0B1226,#070A12)",
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
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(58,91,217,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(58,91,217,0.06) 1px,transparent 1px)", backgroundSize: "44px 44px", opacity: 0.5 }} />
      {effPoster && (
        <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${effPoster})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      )}
      {showPlay && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div className="flex items-center justify-center rounded-full" style={{ width: 72, height: 72, background: "rgba(58,91,217,0.22)", border: "1px solid rgba(138,160,255,0.4)", backdropFilter: "blur(4px)" }}>
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
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
      style={{ background: "rgba(58,91,217,0.10)", border: "1px solid rgba(58,91,217,0.28)" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
      <span style={{ color: HILITE, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", ...MONO }}>{children}</span>
    </div>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="text-center mb-14 flex flex-col items-center">
      <Kicker>{kicker}</Kicker>
      <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4.2vw,3.2rem)", fontWeight: 700, color: TEXT, margin: "18px 0 14px", lineHeight: 1.12, letterSpacing: "-0.02em", maxWidth: 820 }}>{title}</h2>
      {sub && <p style={{ color: MUTED, fontSize: 17, maxWidth: 620, lineHeight: 1.7 }}>{sub}</p>}
    </div>
  );
}

function PrimaryBtn({ children, onClick, large }: { children: React.ReactNode; onClick?: () => void; large?: boolean }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl fpd-btn-lift"
      style={{ padding: large ? "15px 30px" : "12px 24px", fontSize: large ? 16 : 14, fontWeight: 700, color: "#fff", background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, boxShadow: "0 8px 30px rgba(58,91,217,0.45)" }}>
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick, large }: { children: React.ReactNode; onClick?: () => void; large?: boolean }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-2 rounded-xl transition-colors"
      style={{ padding: large ? "15px 28px" : "12px 22px", fontSize: large ? 16 : 14, fontWeight: 600, color: SOFT, background: "rgba(58,91,217,0.08)", border: "1px solid rgba(58,91,217,0.28)" }}>
      {children}
    </button>
  );
}

/* ── NAV ──────────────────────────────────────────────────────── */
const NAV_LINKS: [string, MPage][] = [
  ["Home", "home"], ["About", "about"], ["How It Works", "how"], ["Features", "features"],
  ["Security", "security"], ["Pricing", "pricing"], ["Affiliate", "affiliate"],
  ["Partners", "partnership"], ["Contact", "contact"],
];

function TopNav({ current, onNavigate, onStart }: { current: MPage; onNavigate: Nav; onStart: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", fn); return () => window.removeEventListener("scroll", fn);
  }, []);
  const solid = scrolled || current !== "home";
  const go = (p: MPage) => { setOpen(false); onNavigate(p); };
  return (
    <nav className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{ background: solid ? "rgba(7,10,18,0.92)" : "transparent", borderBottom: solid ? "1px solid rgba(58,91,217,0.14)" : "1px solid transparent", backdropFilter: solid ? "blur(18px)" : "none" }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
        <button onClick={() => go("home")} className="flex items-center gap-2.5">
          <img src={fpdSquareLogo} alt="FPD" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover" }} />
          <img src={fpdLongLogo} alt="Final Pass Down" className="hidden sm:block" style={{ height: 22, objectFit: "contain" }} />
        </button>
        <div className="hidden xl:flex items-center gap-0.5">
          {NAV_LINKS.map(([l, p]) => (
            <button key={l} onClick={() => go(p)} className="px-3 py-2 rounded-lg transition-colors"
              style={{ color: current === p ? "#fff" : MUTED, fontSize: 13.5, fontWeight: current === p ? 600 : 500 }}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2.5">
          <button onClick={onStart} className="hidden sm:block px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:text-white" style={{ color: SOFT }}>Sign In</button>
          <PrimaryBtn onClick={onStart}>Get Started</PrimaryBtn>
          <button className="xl:hidden p-2 rounded-lg" style={{ color: TEXT }} onClick={() => setOpen(o => !o)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {open && (
        <div className="xl:hidden px-6 pb-4 flex flex-col gap-1" style={{ background: "rgba(7,10,18,0.98)", borderBottom: "1px solid rgba(58,91,217,0.14)" }}>
          {NAV_LINKS.map(([l, p]) => (
            <button key={l} onClick={() => go(p)} className="text-left px-3 py-2.5 rounded-lg" style={{ color: current === p ? "#fff" : SOFT, fontSize: 14 }}>{l}</button>
          ))}
        </div>
      )}
    </nav>
  );
}

/* ── PAGE HERO (for sub-pages) ────────────────────────────────── */
function PageHero({ kicker, title, sub, tone = "deep" }: { kicker: string; title: React.ReactNode; sub: string; tone?: "blue" | "deep" | "warm" }) {
  return (
    <header className="relative px-6 pt-40 pb-24">
      <MediaBackdrop tone={tone} overlay={0.72} />
      <div className="relative max-w-4xl mx-auto text-center flex flex-col items-center fpd-fade-in-up">
        <Kicker>{kicker}</Kicker>
        <h1 style={{ ...DISPLAY, fontSize: "clamp(2.4rem,5vw,4rem)", fontWeight: 800, color: TEXT, margin: "20px 0 16px", lineHeight: 1.08, letterSpacing: "-0.02em" }}>{title}</h1>
        <p style={{ color: SOFT, fontSize: 18, maxWidth: 620, lineHeight: 1.7 }}>{sub}</p>
      </div>
    </header>
  );
}

/* ── HERO (home) ──────────────────────────────────────────────── */
function Hero({ onStart, onNavigate }: { onStart: () => void; onNavigate: Nav }) {
  return (
    <header className="relative flex items-center" style={{ minHeight: "100vh" }}>
      <MediaBackdrop src="/media/hero.mp4" tone="warm" overlay={0.5} eager />
      <div className="relative max-w-7xl mx-auto w-full px-6 py-32">
        <div style={{ maxWidth: 720 }} className="fpd-fade-in-up">
          <Kicker>My Life · My Wishes · My Way</Kicker>
          <h1 style={{ ...DISPLAY, fontSize: "clamp(2.8rem,6.5vw,5rem)", fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.03em", color: TEXT, margin: "22px 0 20px" }}>
            Your whole life,<br />
            <span style={{ background: `linear-gradient(120deg,${ACCENT},${HILITE})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>safely passed down.</span>
          </h1>
          <p style={{ color: SOFT, fontSize: 19, lineHeight: 1.65, maxWidth: 560, marginBottom: 16 }}>
            One secure vault for everything that matters — documents, final wishes, memories, and passwords — released to the people you choose, exactly when it's time.
          </p>
          <p style={{ color: FAINT, fontSize: 12, letterSpacing: "0.22em", ...MONO, marginBottom: 34 }}>PREPARE · PROTECT · PASS DOWN</p>
          <div className="flex flex-wrap items-center gap-3.5">
            <PrimaryBtn onClick={onStart} large>Get Started — It's Free <ArrowRight size={18} /></PrimaryBtn>
            <GhostBtn onClick={() => onNavigate("how")} large><Play size={16} /> See How It Works</GhostBtn>
          </div>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2 mt-10">
            {["Bank-grade encryption", "No card required", "Cancel anytime"].map(t => (
              <span key={t} className="flex items-center gap-2" style={{ color: MUTED, fontSize: 13 }}><CheckCircle2 size={15} color="#48BB78" /> {t}</span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── FEATURES ─────────────────────────────────────────────────── */
const FEATURES = [
  { icon: <FolderLock size={22} />, title: "Digital File Cabinet", desc: "Every legal, financial, insurance, medical, and property document — organized, encrypted, and instantly findable.", wide: true },
  { icon: <Archive size={22} />, title: "Legacy Vault", desc: "A sealed, downloadable archive released to your legacy contact only after a verified passing." },
  { icon: <Heart size={22} />, title: "Final Wishes", desc: "Funeral preferences, directives, and the questions families struggle to answer — recorded in your words." },
  { icon: <KeyRound size={22} />, title: "Password Manager", desc: "Accounts, 2FA, and logins with importance flags, so nothing critical is ever locked away." },
  { icon: <Camera size={22} />, title: "Family & Memories", desc: "Photos, video and voice messages, and stories — the presence that outlasts paperwork.", wide: true },
  { icon: <Users size={22} />, title: "Legacy Contacts", desc: "A legally-ordered chain of authority — the right people gain access in the right order." },
];

function FeaturesGrid() {
  return (
    <div className="grid md:grid-cols-3 gap-5">
      {FEATURES.map(f => (
        <div key={f.title} className={`p-7 rounded-2xl glow-surface fpd-hover-lift ${f.wide ? "md:col-span-2" : ""}`} style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
          <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 48, height: 48, background: "rgba(58,91,217,0.14)", color: HILITE }}>{f.icon}</div>
          <h3 style={{ ...DISPLAY, fontSize: 19, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{f.title}</h3>
          <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.65 }}>{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function FeaturesSection({ onNavigate }: { onNavigate: Nav }) {
  return (
    <section className="relative py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="Everything in one place" title={<>Everything your family will need,<br />the day they need it</>} sub="Final Pass Down replaces the shoebox of documents and scattered logins with one calm, secure home for your entire legacy." />
        <FeaturesGrid />
        <div className="flex justify-center mt-12"><GhostBtn onClick={() => onNavigate("features")} large>Explore all features <ChevronRight size={16} /></GhostBtn></div>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ─────────────────────────────────────────────── */
const STEPS = [
  { icon: <FolderLock size={20} />, title: "Store Everything", desc: "Upload documents, record wishes and messages, and save passwords into one encrypted vault." },
  { icon: <Users size={20} />, title: "Assign Access", desc: "Choose your legacy, guardian, and emergency contacts — and exactly which folders each can see." },
  { icon: <FileCheck2 size={20} />, title: "Verified Passing", desc: "A death certificate is verified before anything unlocks. Nothing is released a moment early." },
  { icon: <Heart size={20} />, title: "Family Receives", desc: "Your legacy contact downloads the complete vault — no chaos, no guesswork, no missing pieces." },
];

function StepsGrid() {
  return (
    <div className="grid md:grid-cols-4 gap-5">
      {STEPS.map((s, i) => (
        <div key={s.title} className="relative p-7 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
          <div className="flex items-center justify-center rounded-full mb-5" style={{ width: 40, height: 40, background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", fontWeight: 700, ...MONO }}>{i + 1}</div>
          <div style={{ color: HILITE, marginBottom: 10 }}>{s.icon}</div>
          <h3 style={{ ...DISPLAY, fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{s.title}</h3>
          <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

function HowItWorksSection({ onNavigate }: { onNavigate?: Nav }) {
  return (
    <section className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="How it works" title="From your hands to theirs, in four steps" sub="Simple to set up while you're here. Airtight when it matters most." />
        <StepsGrid />
        {onNavigate && <div className="flex justify-center mt-12"><GhostBtn onClick={() => onNavigate("how")} large>See the full process <ChevronRight size={16} /></GhostBtn></div>}
      </div>
    </section>
  );
}

/* ── STORY SPLITS ─────────────────────────────────────────────── */
function StorySplit({ kicker, title, body, points, media, tone, reverse, cta, onCta }:
  { kicker: string; title: React.ReactNode; body: string; points: string[]; media?: string; tone?: "blue" | "deep" | "warm"; reverse?: boolean; cta?: string; onCta?: () => void }) {
  return (
    <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <div className={reverse ? "lg:order-2" : ""}>
        <Kicker>{kicker}</Kicker>
        <h3 style={{ ...DISPLAY, fontSize: "clamp(1.7rem,3vw,2.4rem)", fontWeight: 700, color: TEXT, margin: "16px 0 14px", lineHeight: 1.15, letterSpacing: "-0.02em" }}>{title}</h3>
        <p style={{ color: SOFT, fontSize: 16.5, lineHeight: 1.7, marginBottom: 20 }}>{body}</p>
        <div className="flex flex-col gap-3 mb-7">
          {points.map(p => (
            <div key={p} className="flex items-start gap-3">
              <CheckCircle2 size={18} color={ACCENT} style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ color: MUTED, fontSize: 15, lineHeight: 1.5 }}>{p}</span>
            </div>
          ))}
        </div>
        {cta && <GhostBtn onClick={onCta}>{cta} <ChevronRight size={16} /></GhostBtn>}
      </div>
      <div className={`relative rounded-3xl overflow-hidden ${reverse ? "lg:order-1" : ""}`} style={{ aspectRatio: "4 / 3", border: "1px solid rgba(58,91,217,0.2)", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <MediaBackdrop src={media} tone={tone ?? "blue"} overlay={0.35} showPlay />
      </div>
    </div>
  );
}

function Stories({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative py-28 px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-28">
        <StorySplit
          kicker="A vault that outlives you"
          title={<>Everything organized,<br />nothing left behind</>}
          body="Families lose weeks searching for account numbers, policies, and passwords. Final Pass Down keeps it all in one encrypted place, so your loved ones inherit clarity instead of chaos."
          points={["Legal, financial, insurance, medical & property records", "Auto-pay and subscriptions with cancel instructions", "One downloadable archive — no logins to hunt down"]}
          media="/media/story-vault.mp4" tone="deep" cta="Explore the File Cabinet" onCta={onStart}
        />
        <StorySplit reverse
          kicker="The right people, at the right time"
          title="Access that follows your wishes"
          body="You decide who can see what — and in what order. A legally-ordered chain of authority means the right person steps in only when they should, and only for what you allowed."
          points={["Legacy, Guardian, and Emergency contact roles", "Folder-level access per contact", "Contingent backups if a contact can't act"]}
          media="/media/story-contacts.mp4" tone="blue" cta="See Legacy Contacts" onCta={onStart}
        />
        <StorySplit
          kicker="Memories that speak for you"
          title="Your voice, kept close"
          body="Beyond documents, leave the things that truly last — video and voice messages, photos, and the stories only you can tell — delivered to the people they're meant for."
          points={["Record video, voice, and written messages", "Organize family photos and favorite memories", "Assign each memory to the loved one it's for"]}
          media="/media/story-memories.mp4" tone="warm" cta="Start a memory" onCta={onStart}
        />
      </div>
    </section>
  );
}

/* ── SECURITY ─────────────────────────────────────────────────── */
const SEC_STATS = [
  { icon: <Lock size={18} />, value: "AES-256", label: "Bank-grade encryption" },
  { icon: <Fingerprint size={18} />, value: "Zero-Knowledge", label: "Only you hold the keys" },
  { icon: <FileCheck2 size={18} />, value: "Death-Cert Lock", label: "Verified release only" },
  { icon: <Server size={18} />, value: "99.99%", label: "Uptime & redundancy" },
];
const SEC_POINTS = [
  { icon: <Shield size={18} />, title: "You own your legacy", desc: "Your data is never sold, mined, or shared. It belongs to you and the family you choose — forever." },
  { icon: <Lock size={18} />, title: "Encrypted end to end", desc: "Every document, message, and password is encrypted in transit and at rest with row-level isolation." },
  { icon: <FileCheck2 size={18} />, title: "Nothing releases early", desc: "The Legacy Vault stays sealed until a death certificate is verified. No accidental exposure, ever." },
];

function SecuritySection({ onNavigate }: { onNavigate?: Nav }) {
  return (
    <section className="relative py-28 px-6" style={{ background: "linear-gradient(180deg,#070A12,#0A1020,#070A12)" }}>
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="Security & Privacy" title={<>Built like a vault,<br />because it is one</>} sub="Your life's most sensitive information deserves more than a folder in a drawer. We protect legacies, not just data." />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {SEC_STATS.map(s => (
            <div key={s.value} className="p-6 rounded-2xl text-center glow-surface" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl mx-auto mb-3" style={{ width: 42, height: 42, background: "rgba(58,91,217,0.14)", color: HILITE }}>{s.icon}</div>
              <div style={{ ...DISPLAY, fontSize: 22, fontWeight: 700, color: TEXT }}>{s.value}</div>
              <div style={{ color: MUTED, fontSize: 12.5, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {SEC_POINTS.map(p => (
            <div key={p.title} className="p-7 rounded-2xl fpd-hover-lift glow-surface" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
              <div style={{ color: ACCENT, marginBottom: 12 }}>{p.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
        {onNavigate && <div className="flex justify-center mt-12"><GhostBtn onClick={() => onNavigate("security")} large>Read our security approach <ChevronRight size={16} /></GhostBtn></div>}
      </div>
    </section>
  );
}

/* ── PRICING ──────────────────────────────────────────────────── */
const PLANS = [
  { name: "Free", price: "$0", unit: "forever", desc: "Start organizing the essentials.", features: ["Core File Cabinet", "Up to 3 legacy contacts", "1 GB secure storage", "Final Wishes questionnaire"], cta: "Get Started", popular: false },
  { name: "Legacy Premium", price: "$9", unit: "/mo", desc: "The complete legacy toolkit.", features: ["Everything in Free", "Unlimited storage & contacts", "Video & voice messages", "Password manager + 2FA", "Auto-pay & subscription tracking"], cta: "Start Premium", popular: true },
  { name: "Legacy Vault", price: "$199", unit: "one-time", desc: "Sealed archive + verified release.", features: ["Downloadable encrypted archive", "Death-certificate release lock", "Chain-of-authority handoff", "Lifetime preservation"], cta: "Add Legacy Vault", popular: false },
];

function PricingGrid({ onStart }: { onStart: () => void }) {
  return (
    <div className="grid md:grid-cols-3 gap-5 items-stretch">
      {PLANS.map(p => (
        <div key={p.name} className="relative p-7 rounded-2xl flex flex-col glow-surface fpd-hover-lift"
          style={{ background: CARD, border: p.popular ? `1.5px solid ${PRIMARY}` : "1px solid rgba(58,91,217,0.16)", boxShadow: p.popular ? "0 0 40px rgba(58,91,217,0.25)" : "none" }}>
          {p.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full flex items-center gap-1.5" style={{ background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", fontSize: 11, fontWeight: 700 }}>
              <Star size={11} fill="#fff" /> Most Popular
            </div>
          )}
          <h3 style={{ ...DISPLAY, fontSize: 18, fontWeight: 600, color: TEXT, marginBottom: 4 }}>{p.name}</h3>
          <p style={{ color: MUTED, fontSize: 13, marginBottom: 16 }}>{p.desc}</p>
          <div className="flex items-baseline gap-1.5 mb-6">
            <span style={{ ...DISPLAY, fontSize: 40, fontWeight: 800, color: p.popular ? HILITE : TEXT }}>{p.price}</span>
            <span style={{ color: MUTED, fontSize: 14 }}>{p.unit}</span>
          </div>
          <div className="flex flex-col gap-3 mb-7 flex-1">
            {p.features.map(f => (
              <div key={f} className="flex items-start gap-2.5">
                <CheckCircle2 size={16} color="#48BB78" style={{ marginTop: 1, flexShrink: 0 }} />
                <span style={{ color: SOFT, fontSize: 14 }}>{f}</span>
              </div>
            ))}
          </div>
          <button onClick={onStart} className="w-full py-3 rounded-xl font-semibold text-sm fpd-btn-lift"
            style={p.popular ? { background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff", boxShadow: "0 8px 24px rgba(58,91,217,0.4)" } : { background: "rgba(58,91,217,0.1)", color: HILITE, border: "1px solid rgba(58,91,217,0.28)" }}>
            {p.cta}
          </button>
        </div>
      ))}
    </div>
  );
}

function PricingSection({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative py-28 px-6">
      <div className="max-w-7xl mx-auto">
        <SectionHead kicker="Simple pricing" title="Protect what matters for less than a coffee a week" sub="Unlimited storage on every paid plan. No hidden fees — you only pay for the peace of mind." />
        <PricingGrid onStart={onStart} />
      </div>
    </section>
  );
}

/* ── CTA band ─────────────────────────────────────────────────── */
function CTA({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative py-28 px-6">
      <div className="max-w-5xl mx-auto relative rounded-3xl overflow-hidden text-center px-6 py-20" style={{ border: "1px solid rgba(58,91,217,0.24)" }}>
        <MediaBackdrop src="/media/cta.mp4" tone="blue" overlay={0.6} />
        <div className="relative flex flex-col items-center">
          <Kicker>Start today</Kicker>
          <h2 style={{ ...DISPLAY, fontSize: "clamp(2rem,4.5vw,3.4rem)", fontWeight: 800, color: TEXT, margin: "18px 0 14px", lineHeight: 1.1, letterSpacing: "-0.02em", maxWidth: 680 }}>
            Give your family the gift of being prepared
          </h2>
          <p style={{ color: SOFT, fontSize: 17, maxWidth: 520, lineHeight: 1.7, marginBottom: 30 }}>
            It takes minutes to start and a lifetime of worry off their shoulders. Free to begin — no card required.
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
const FOOTER_COLS: [string, [string, MPage][]][] = [
  ["Product", [["Features", "features"], ["How It Works", "how"], ["Security", "security"], ["Pricing", "pricing"]]],
  ["Company", [["Home", "home"], ["About", "about"], ["Contact", "contact"]]],
  ["Programs", [["Affiliate", "affiliate"], ["Partnership", "partnership"]]],
];

function Footer({ onStart, onNavigate, onAdminLogin }: { onStart: () => void; onNavigate: Nav; onAdminLogin?: () => void }) {
  const legal = ["Privacy Policy", "Terms of Service", "Cookie Policy", "Refund Policy"];
  return (
    <footer className="relative px-6 pt-16 pb-8" style={{ background: "#050810", borderTop: "1px solid rgba(58,91,217,0.14)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-10 mb-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img src={fpdSquareLogo} alt="FPD" style={{ width: 34, height: 34, borderRadius: 8, objectFit: "cover" }} />
              <img src={fpdLongLogo} alt="Final Pass Down" style={{ height: 20, objectFit: "contain" }} />
            </div>
            <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.7, maxWidth: 300 }}>
              The secure digital vault for everything that matters — prepared by you, passed down to those you love.
            </p>
            <div className="mt-5"><PrimaryBtn onClick={onStart}>Get Started</PrimaryBtn></div>
          </div>
          {FOOTER_COLS.map(([title, links]) => (
            <div key={title}>
              <div style={{ color: FAINT, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", ...MONO, marginBottom: 14 }}>{title}</div>
              <div className="flex flex-col gap-2.5">
                {links.map(([l, p], i) => (
                  <button key={`${l}-${i}`} onClick={() => onNavigate(p)} className="text-left transition-colors hover:text-white" style={{ color: MUTED, fontSize: 14 }}>{l}</button>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div style={{ color: FAINT, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", ...MONO, marginBottom: 14 }}>Legal</div>
            <div className="flex flex-col gap-2.5">
              {legal.map(l => (
                <button key={l} onClick={onStart} className="text-left transition-colors hover:text-white" style={{ color: MUTED, fontSize: 14 }}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: "1px solid rgba(58,91,217,0.1)" }}>
          <span style={{ color: FAINT, fontSize: 13 }}>© {new Date().getFullYear()} Final Pass Down. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span style={{ color: FAINT, fontSize: 13 }} className="flex items-center gap-1.5"><Phone size={13} /> 1-800-LEGACY</span>
            {onAdminLogin && <button onClick={onAdminLogin} className="transition-colors hover:text-white" style={{ color: FAINT, fontSize: 12 }}>Admin</button>}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── PAGES ────────────────────────────────────────────────────── */
function HomePage({ onStart, onNavigate }: { onStart: () => void; onNavigate: Nav }) {
  return (
    <>
      <Hero onStart={onStart} onNavigate={onNavigate} />
      <FeaturesSection onNavigate={onNavigate} />
      <HowItWorksSection onNavigate={onNavigate} />
      <Stories onStart={onStart} />
      <SecuritySection onNavigate={onNavigate} />
      <CTA onStart={onStart} />
    </>
  );
}

function AboutPage({ onStart }: { onStart: () => void }) {
  const values = [
    { icon: <Heart size={20} />, title: "Family First", desc: "Every decision starts with the people who'll rely on this vault when you're gone." },
    { icon: <Shield size={20} />, title: "Privacy & Trust", desc: "We never sell or mine your data. Your legacy belongs to you and your family — forever." },
    { icon: <Scale size={20} />, title: "Dignity & Order", desc: "We turn scattered chaos into a calm, structured handoff that honors your wishes." },
    { icon: <Users size={20} />, title: "Accessibility", desc: "Preparedness shouldn't be a luxury — affordable plans so every family can be ready." },
  ];
  return (
    <>
      <PageHero kicker="Our mission" title="Preserving what matters, one family at a time" sub="Final Pass Down exists so no document is lost, no wish goes unspoken, and no password dies with you." tone="warm" />
      <section className="relative py-24 px-6">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <p style={{ color: SOFT, fontSize: 18, lineHeight: 1.8 }}>
            When someone passes, their family shouldn't inherit a mystery. While you're here, you build the vault.
            When it's time, the people you trust receive exactly what you intended — with dignity, not confusion.
          </p>
        </div>
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {values.map(v => (
            <div key={v.title} className="p-7 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, background: "rgba(58,91,217,0.14)", color: HILITE }}>{v.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{v.title}</h3>
              <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA onStart={onStart} />
    </>
  );
}

function HowPage({ onStart }: { onStart: () => void }) {
  return (
    <>
      <PageHero kicker="How it works" title="How Final Pass Down works" sub="From your first upload to a verified handoff — a clear, secure path that protects your family from chaos." />
      <div className="pt-24"><HowItWorksSection /></div>
      <Stories onStart={onStart} />
      <CTA onStart={onStart} />
    </>
  );
}

function FeaturesPage({ onStart }: { onStart: () => void }) {
  return (
    <>
      <PageHero kicker="Features" title="Everything you need to prepare" sub="A complete toolkit for organizing, protecting, and passing down every part of your legacy." />
      <section className="relative py-24 px-6"><div className="max-w-7xl mx-auto"><FeaturesGrid /></div></section>
      <CTA onStart={onStart} />
    </>
  );
}

function SecurityPage({ onStart }: { onStart: () => void }) {
  return (
    <>
      <PageHero kicker="Security & Privacy" title="Security, privacy & digital sovereignty" sub="Your life's most sensitive information deserves more than a folder in a drawer. Here's how we protect it." tone="deep" />
      <div className="pt-8"><SecuritySection /></div>
      <CTA onStart={onStart} />
    </>
  );
}

function PricingPage({ onStart }: { onStart: () => void }) {
  return (
    <>
      <PageHero kicker="Pricing" title="Choose your legacy plan" sub="Unlimited storage on every paid plan. Start free, upgrade when you're ready, and add the Legacy Vault whenever you like." />
      <section className="relative py-24 px-6"><div className="max-w-7xl mx-auto"><PricingGrid onStart={onStart} /></div></section>
      <CTA onStart={onStart} />
    </>
  );
}

function AffiliatePage({ onStart }: { onStart: () => void }) {
  const benefits = [
    { icon: <HandCoins size={20} />, title: "Up to 30% commission", desc: "Recurring revenue for the lifetime of every customer you refer." },
    { icon: <TrendingUp size={20} />, title: "Real-time dashboard", desc: "Track clicks, sign-ups, and earnings with a shareable referral link." },
    { icon: <MessageSquare size={20} />, title: "Priority support", desc: "A dedicated affiliate team and all the assets you need to succeed." },
  ];
  return (
    <>
      <PageHero kicker="Affiliate Program" title="Share Final Pass Down, earn rewards" sub="Help families preserve their legacy while earning recurring commission on every subscription you refer." />
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {benefits.map(b => (
            <div key={b.title} className="p-7 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, background: "rgba(58,91,217,0.14)", color: HILITE }}>{b.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{b.title}</h3>
              <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.6 }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA onStart={onStart} />
    </>
  );
}

function PartnershipPage({ onStart }: { onStart: () => void }) {
  const profiles = [
    { icon: <Scale size={20} />, title: "Estate Attorneys", desc: "Offer clients a living home for the documents behind their will and trust." },
    { icon: <Landmark size={20} />, title: "Financial Advisors", desc: "Add legacy planning to your practice with white-label options and revenue share." },
    { icon: <Building2 size={20} />, title: "Funeral Homes", desc: "Give families a dignified, organized way to honor final wishes." },
  ];
  return (
    <>
      <PageHero kicker="Partnership" title="Partner with us to build the future" sub="Bring legacy planning to your clients with white-label options, revenue share, and dedicated support." tone="deep" />
      <section className="relative py-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-5">
          {profiles.map(p => (
            <div key={p.title} className="p-7 rounded-2xl glow-surface fpd-hover-lift" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
              <div className="flex items-center justify-center rounded-xl mb-4" style={{ width: 44, height: 44, background: "rgba(58,91,217,0.14)", color: HILITE }}>{p.icon}</div>
              <h3 style={{ ...DISPLAY, fontSize: 17, fontWeight: 600, color: TEXT, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ color: MUTED, fontSize: 14.5, lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>
      <CTA onStart={onStart} />
    </>
  );
}

function ContactPage({ onStart }: { onStart: () => void }) {
  const field: React.CSSProperties = { background: "#141B2E", border: "1px solid rgba(58,91,217,0.22)", color: "#fff", borderRadius: 12, padding: "11px 14px", fontSize: 14, width: "100%", outline: "none" };
  const label: React.CSSProperties = { color: MUTED, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", ...MONO, display: "block", marginBottom: 6 };
  return (
    <>
      <PageHero kicker="Get in touch" title="Contact us" sub="Have questions? We're here to help. Reach out and we'll respond within 24 hours." />
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
          <div className="p-8 rounded-2xl glow-surface" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
            <h3 style={{ ...DISPLAY, fontSize: 22, fontWeight: 700, color: TEXT, marginBottom: 18 }}>Send us a message</h3>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div><label style={label}>Your Name</label><input style={field} placeholder="Jane Doe" /></div>
              <div><label style={label}>Email Address</label><input style={field} placeholder="jane@example.com" /></div>
            </div>
            <div className="mb-4"><label style={label}>Subject</label><input style={field} placeholder="How can we help?" /></div>
            <div className="mb-5"><label style={label}>Message</label><textarea style={{ ...field, minHeight: 120, resize: "vertical" }} placeholder="Tell us more…" /></div>
            <button onClick={() => alert("Thanks! This form is a preview — we'll wire it to the backend during migration.")} className="w-full py-3 rounded-xl font-semibold text-sm fpd-btn-lift" style={{ background: `linear-gradient(135deg,${PRIMARY},${ACCENT})`, color: "#fff" }}>Send Message</button>
          </div>
          <div className="flex flex-col gap-4">
            {[{ icon: <Mail size={18} />, title: "Email Us", val: "support@finalpassdown.com", sub: "General inquiries & support" },
              { icon: <MessageSquare size={18} />, title: "Chat Live", val: "Start a conversation", sub: "Mon–Fri, 9am–6pm EST" },
              { icon: <Phone size={18} />, title: "Call Us", val: "1-800-LEGACY", sub: "For urgent legacy activation" }].map(c => (
              <div key={c.title} className="p-6 rounded-2xl glow-surface fpd-hover-lift flex items-start gap-4" style={{ background: CARD, border: "1px solid rgba(58,91,217,0.16)" }}>
                <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 44, height: 44, background: "rgba(58,91,217,0.14)", color: HILITE }}>{c.icon}</div>
                <div>
                  <h4 style={{ ...DISPLAY, fontSize: 16, fontWeight: 600, color: TEXT }}>{c.title}</h4>
                  <div style={{ color: HILITE, fontSize: 14, margin: "3px 0" }}>{c.val}</div>
                  <div style={{ color: MUTED, fontSize: 12.5 }}>{c.sub}</div>
                </div>
              </div>
            ))}
            <div className="mt-2"><PrimaryBtn onClick={onStart}>Or just get started <ArrowRight size={16} /></PrimaryBtn></div>
          </div>
        </div>
      </section>
    </>
  );
}

/* ── SITE SHELL (internal router) ─────────────────────────────── */
export function LandingPage({ onGetStarted, onAdminLogin, onPartnerPortal, onConciergeLogin }:
  { onGetStarted: () => void; onAdminLogin?: () => void; onPartnerPortal?: () => void; onConciergeLogin?: () => void }) {
  const [page, setPage] = useState<MPage>("home");
  if (typeof window !== "undefined") (window as any).__adminLogin = onAdminLogin;
  const go: Nav = (p) => { setPage(p); if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "auto" }); };

  return (
    <div style={{ fontFamily: "var(--font-body)", background: BG, color: TEXT, overflowX: "hidden" }}>
      <TopNav current={page} onNavigate={go} onStart={onGetStarted} />
      <main>
        {page === "home" && <HomePage onStart={onGetStarted} onNavigate={go} />}
        {page === "about" && <AboutPage onStart={onGetStarted} />}
        {page === "how" && <HowPage onStart={onGetStarted} />}
        {page === "features" && <FeaturesPage onStart={onGetStarted} />}
        {page === "security" && <SecurityPage onStart={onGetStarted} />}
        {page === "pricing" && <PricingPage onStart={onGetStarted} />}
        {page === "affiliate" && <AffiliatePage onStart={onGetStarted} />}
        {page === "partnership" && <PartnershipPage onStart={onGetStarted} />}
        {page === "contact" && <ContactPage onStart={onGetStarted} />}
      </main>
      <Footer onStart={onGetStarted} onNavigate={go} onAdminLogin={onAdminLogin} />
    </div>
  );
}
