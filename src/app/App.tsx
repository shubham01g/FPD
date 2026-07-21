import React, { useState } from "react";
import { Toaster } from "sonner";
import { DemoProvider } from "./context/DemoContext";
import { WhiteLabelProvider } from "./context/WhiteLabelContext";
import { WLPackagesProvider } from "./context/WLPackagesContext";
import { WLEntitlementProvider } from "./context/WLEntitlementContext";

/* User portal */
import { Layout, type PageId } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { UserDashboard } from "./components/UserDashboard";
import { LegacyVault } from "./components/LegacyVault";
import { LegacyVerification } from "./components/LegacyVerification";
import { StorageUsage } from "./components/StorageUsage";
import { FinalWishes } from "./components/FinalWishes";
import { WillsAndTrusts } from "./components/WillsAndTrusts";
import { JobHistory } from "./components/JobHistory";
import { DaycareInfo } from "./components/DaycareInfo";
import { IDKeeper } from "./components/IDKeeper";
import { FavoritePlaces } from "./components/FavoritePlaces";
import { TravelPlanner } from "./components/TravelPlanner";
import { KidsActivities } from "./components/KidsActivities";
import { Warranties } from "./components/Warranties";
import { MedicalInfo } from "./components/MedicalInfo";
import { FinancialRecords } from "./components/FinancialRecords";
import { PersonalAssets } from "./components/PersonalAssets";
import { FamilyMemories } from "./components/FamilyMemories";
import { ContactsHub } from "./components/ContactsHub";
import { OrganizeHub } from "./components/OrganizeHub";
import { AffiliateProgram } from "./components/AffiliateProgram";
import { DigitalFileCabinet } from "./components/DigitalFileCabinet";
import { FamilyFriends } from "./components/FamilyFriends";
import { DigitalDiary } from "./components/DigitalDiary";
import { LifeCalendar } from "./components/LifeCalendar";
import { MessagesToLovedOnes } from "./components/MessagesToLovedOnes";
import { VitalClone } from "./components/VitalClone";
import { PasswordManager } from "./components/PasswordManager";
import { SubscriptionManager } from "./components/SubscriptionManager";
import { LegacyContinuationFee } from "./components/LegacyContinuationFee";
import { PartnerOnboarding } from "./components/PartnerOnboarding";
import { PartnerOnboardingAdmin } from "./components/admin/PartnerOnboardingAdmin";
import { AIAgent } from "./components/AIAgent";

/* Admin portal */
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminLayout, type AdminPageId } from "./components/admin/AdminLayout";
import { MasterAdmin } from "./components/admin/MasterAdmin";
import { IDVerification } from "./components/admin/IDVerification";
import { PayoutManagement } from "./components/admin/PayoutManagement";
import { SubscriptionConfig } from "./components/admin/SubscriptionConfig";
import { AffiliateAdmin } from "./components/admin/AffiliateAdmin";
import { PartnershipAdmin } from "./components/admin/PartnershipAdmin";
import { EnterpriseAPI } from "./components/EnterpriseAPI";
import { EmailTemplates } from "./components/admin/EmailTemplates";
import { WhiteLabelConfig } from "./components/WhiteLabelConfig";
import { ContinuationFeeAdmin } from "./components/admin/ContinuationFeeAdmin";
import { WhiteGloveAdmin } from "./components/admin/WhiteGloveAdmin";
import { WhiteGloveService } from "./components/WhiteGloveService";
import { WhiteLabelStudio } from "./components/WhiteLabelStudio";
import { WaiverSignPage } from "./components/WaiverForm";
import { AccountSettings } from "./components/AccountSettings";
import { WGClientSubmit } from "./components/WGClientSubmit";
import { WGSchedulePage } from "./components/WGSchedulePage";
import { createScheduleToken } from "./services/wgClientStore";

/* ── Demo wrapper: pick which client to simulate ────────────────── */
const WG_DEMO_CLIENTS = [
  { token:"TOKEN_MARCUS_001", name:"Dorothy Henderson",      specialist:"Marcus Williams",  clientId:"WG-001" },
  { token:"TOKEN_PATRICIA_002", name:"Walter & Edna Briggs", specialist:"Patricia Chen",   clientId:"WG-002" },
  { token:"TOKEN_JAMES_003",  name:"Margaret Thompson",      specialist:"James Rivera",    clientId:"WG-003" },
];

function WGClientSubmitDemo({ setMode }: { setMode: (m: AppMode) => void }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  if (selected) {
    const client = WG_DEMO_CLIENTS.find(c => c.token === selected)!;
    return (
      <div>
        {/* Back bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b"
          style={{ background:"#fff", borderColor:"rgba(110,139,255,0.15)" }}>
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color:"#6E8BFF" }}>
            ← Switch Client
          </button>
          <div style={{ color:"#5A6A88", fontSize:12, ...MONO }}>
            Simulating: {client.name} · Specialist: {client.specialist}
          </div>
          <button onClick={() => setMode("concierge")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background:"rgba(58,91,217,0.08)", color:"#3A5BD9" }}>
            View {client.specialist.split(" ")[0]}'s Inbox →
          </button>
        </div>
        <WGClientSubmit token={selected}/>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background:"#F5F8FF", fontFamily:"var(--font-body)" }}>
      <div style={{ maxWidth:520, width:"100%" }}>
        <div className="text-center mb-8">
          <div style={{ color:"#6E8BFF", fontSize:12, fontWeight:700, ...MONO, letterSpacing:"0.1em", marginBottom:8 }}>
            📤 CLIENT DOCUMENT SUBMISSION — DEMO
          </div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:24, color:"#0D1428", marginBottom:8 }}>
            Which client are you simulating?
          </h2>
          <p style={{ color:"#5A6A88", fontSize:13, lineHeight:1.7 }}>
            Each client has a unique secure link. Select a client to see their submission page — then switch to the Concierge Portal to see the document appear live in their specialist's inbox.
          </p>
        </div>

        <div className="space-y-3">
          {WG_DEMO_CLIENTS.map(c => (
            <button key={c.token} onClick={() => setSelected(c.token)}
              className="w-full flex items-start gap-4 p-5 rounded-2xl text-left transition-all"
              style={{ background:"#fff", border:"1.5px solid rgba(110,139,255,0.2)",
                boxShadow:"0 2px 12px rgba(110,139,255,0.06)" }}>
              <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                style={{ width:48, height:48, background:"rgba(110,139,255,0.1)", color:"#6E8BFF", fontFamily:"var(--font-display)", fontSize:18 }}>
                {c.name.split(" ").map((w:string) => w[0]).join("").slice(0,2)}
              </div>
              <div className="flex-1">
                <div style={{ color:"#0D1428", fontSize:15, fontWeight:600, marginBottom:3 }}>{c.name}</div>
                <div style={{ color:"#8A9AB8", fontSize:12 }}>
                  Specialist: <strong style={{ color:"#6E8BFF" }}>{c.specialist}</strong>
                </div>
                <div style={{ color:"#8A9AB8", fontSize:11, marginTop:2, ...MONO }}>
                  Token: {c.token}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl self-center flex-shrink-0"
                style={{ background:"rgba(110,139,255,0.08)", color:"#6E8BFF", fontSize:12, fontWeight:700 }}>
                Open →
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-2xl text-center"
          style={{ background:"rgba(58,91,217,0.04)", border:"1px solid rgba(58,91,217,0.12)" }}>
          <div style={{ color:"#3A5BD9", fontSize:12, fontWeight:700, ...MONO, marginBottom:6 }}>HOW TO TEST THE LIVE SYNC</div>
          <ol style={{ color:"#5A6A88", fontSize:12, lineHeight:2, textAlign:"left" }}>
            <li>1. Select a client above (e.g. Dorothy Henderson)</li>
            <li>2. Submit a document on their page</li>
            <li>3. Switch Demo Mode → ⭐ Concierge Portal</li>
            <li>4. Log in as {WG_DEMO_CLIENTS[0].specialist} (password: Concierge2026!)</li>
            <li>5. Open Document Inbox tab → see the document appear ✅</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
import { CryptoMerchant } from "./components/admin/CryptoMerchant";
import { ConciergeLogin } from "./components/ConciergeLogin";
import { ConciergePortal } from "./components/ConciergePortal";
import { type ConciergeEmployee, conciergeEmployees } from "./services/conciergeStaff";

type AppMode = "landing" | "user" | "admin-login" | "admin" | "partner-onboarding" | "concierge-login" | "concierge" | "wg-submit" | "wg-schedule";

const TOASTER_STYLE = {
  background: "rgba(8,15,26,0.98)",
  border: "1px solid rgba(58,91,217,0.25)",
  color: "#E8EDF5",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  borderRadius: 12,
  backdropFilter: "blur(16px)",
};

/* ── Floating demo nav — bottom-right, sits just below the AI Assistant ── */
function DemoBar({ mode, setMode }: { mode: AppMode; setMode: (m: AppMode) => void }) {
  const [open, setOpen] = useState(false);
  const tabs: { id: AppMode; label: string }[] = [
    { id: "landing",            label: "🏠 Landing" },
    { id: "user",               label: "👤 User Portal" },
    { id: "admin-login",        label: "🔐 Admin Login" },
    { id: "admin",              label: "👑 Admin Portal" },
    { id: "partner-onboarding", label: "🤝 Partner Portal" },
    { id: "concierge-login",    label: "⭐ Concierge Login" },
    { id: "concierge",          label: "⭐ Concierge Portal" },
    { id: "wg-submit",          label: "📤 Client Doc Submit" },
    { id: "wg-schedule",        label: "📅 Client Schedule Page" },
  ];
  const current = tabs.find(t => t.id === mode);
  return (
    /* right:24 aligns with AI Assistant (right-6 = 24px). top of this pill sits ~8px below the AI button. */
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, fontFamily:"var(--font-mono)" }}>
      {open && (
        <div style={{
          position:"absolute", bottom:"calc(100% + 8px)", right:0,
          background:"rgba(10,10,15,0.97)", borderRadius:14,
          boxShadow:"0 8px 40px rgba(0,0,0,0.6)", backdropFilter:"blur(20px)",
          border:"1px solid rgba(58,91,217,0.3)", padding:"8px 6px",
          display:"flex", flexDirection:"column", gap:3, minWidth:190,
        }}>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:8, letterSpacing:"0.15em", padding:"2px 8px 4px", fontWeight:700 }}>DEMO MODE — SWITCH VIEW</div>
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setMode(t.id); setOpen(false); }}
              style={{
                padding:"7px 12px", borderRadius:9, fontSize:11, fontWeight:700,
                cursor:"pointer", textAlign:"left", transition:"all 0.12s",
                background: mode===t.id ? "#3A5BD9" : "transparent",
                color: mode===t.id ? "#fff" : "#8A9AB8",
                border: mode===t.id ? "1px solid #3A5BD9" : "1px solid transparent",
              }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        style={{
          display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
          borderRadius:99, fontSize:10, fontWeight:700, cursor:"pointer",
          background:"rgba(10,10,15,0.95)", color:"#8AA0FF",
          border:"1px solid rgba(58,91,217,0.4)",
          boxShadow:"0 4px 20px rgba(0,0,0,0.5)", backdropFilter:"blur(16px)",
          letterSpacing:"0.06em",
        }}>
        <span style={{ fontSize:14 }}>{current?.label.split(" ")[0]}</span>
        <span>DEMO</span>
        <span style={{ fontSize:8, opacity:0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
    </div>
  );
}

function AppShell() {
  /* Default to the public landing page; "Sign In" / "Get Started" route to the dashboard */
  const [mode, setMode] = useState<AppMode>("landing");
  const [userPage, setUserPage] = useState<PageId>("dashboard");
  const [adminPage, setAdminPage] = useState<AdminPageId>("master-admin");
  const [conciergeEmployee, setConciergeEmployee] = useState<ConciergeEmployee | null>(null);

  /* ── User page renderer ── */
  const renderUserPage = () => {
    const nav = (p: string) => setUserPage(p as PageId);
    switch (userPage) {
      case "dashboard":           return <UserDashboard onNavigate={nav}/>;
      case "file-cabinet":        return <DigitalFileCabinet/>;
      case "family-friends":      return <FamilyFriends/>;
      case "legacy-vault":        return <LegacyVault/>;
      case "final-wishes":        return <FinalWishes/>;
      case "wills-trusts":        return <WillsAndTrusts/>;
      case "job-history":         return <JobHistory/>;
      case "daycare-info":        return <DaycareInfo/>;
      case "id-keeper":           return <IDKeeper/>;
      case "favorite-places":     return <FavoritePlaces/>;
      case "travel-planner":      return <TravelPlanner/>;
      case "kids-activities":     return <KidsActivities/>;
      case "warranties":          return <Warranties/>;
      case "medical-info":        return <MedicalInfo/>;
      case "financial-records":   return <FinancialRecords/>;
      case "personal-assets":     return <PersonalAssets/>;
      case "family-memories":     return <FamilyMemories/>;
      case "digital-diary":         return <DigitalDiary/>;
      case "calendar":              return <LifeCalendar onNavigate={nav}/>;
      case "messages-loved-ones":   return <MessagesToLovedOnes/>;
      case "vital-clone":           return <VitalClone/>;
      case "password-manager":      return <PasswordManager/>;
      case "subscription-manager":   return <SubscriptionManager/>;
      case "legacy-continuation":    return <LegacyContinuationFee/>;
      case "contacts-legacy":    return <ContactsHub initialSection="legacy"/>;
      case "contacts-guardian":  return <ContactsHub initialSection="guardian"/>;
      case "contacts-emergency": return <ContactsHub initialSection="emergency"/>;
      // legacy-verification merged into contacts-legacy
      case "organize":            return <OrganizeHub/>;
      case "storage-usage":       return <StorageUsage/>;
      case "affiliate":           return <AffiliateProgram/>;
      case "white-glove":         return <WhiteGloveService/>;
      // Always reachable — the Studio renders its own locked state until the
      // partner package is paid for, and routes here to the purchase flow.
      case "white-label":         return <WhiteLabelStudio onPurchase={() => setMode("partner-onboarding")}/>;
      case "waiver-sign":         return <div className="p-6"><WaiverSignPage onBack={() => nav("dashboard")}/></div>;
      case "account-settings":    return <AccountSettings/>;
      case "fpd-ai":              return <AIAgent pageMode={true}/>;
      default:                    return <UserDashboard onNavigate={nav}/>;
    }
  };

  /* ── Admin page renderer ── */
  const renderAdminPage = () => {
    switch (adminPage) {
      case "master-admin":        return <MasterAdmin/>;
      case "admin-affiliate":     return <AffiliateAdmin/>;
      case "admin-partnership":   return <PartnershipAdmin/>;
      case "id-verification":     return <IDVerification/>;
      case "payout-management":   return <PayoutManagement/>;
      case "subscription-config": return <SubscriptionConfig/>;
      case "enterprise-api":      return <EnterpriseAPI/>;
      case "email-templates":     return <EmailTemplates/>;
      case "white-label":             return <WhiteLabelConfig/>;
      case "continuation-fee-admin":  return <ContinuationFeeAdmin/>;
      case "partner-onboarding-admin":  return <PartnerOnboardingAdmin/>;
      case "white-glove-admin":         return <WhiteGloveAdmin/>;
      case "crypto-merchant":           return <CryptoMerchant/>;
      default:                          return <MasterAdmin/>;
    }
  };

  /* ── Landing ── */
  if (mode === "landing") {
    return (
      <div className="w-full" style={{ fontFamily:"var(--font-body)" }}>
        <LandingPage
          onGetStarted={() => setMode("user")}
          onAdminLogin={() => setMode("admin-login")}
          onPartnerPortal={() => setMode("partner-onboarding")}
          onConciergeLogin={() => setMode("concierge-login")}
        />
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── Admin login ── */
  if (mode === "admin-login") {
    return (
      <div className="size-full">
        <AdminLogin
          onLogin={() => setMode("admin")}
          onBackToSite={() => setMode("landing")}
        />
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── Admin portal ── */
  if (mode === "admin") {
    return (
      <div className="size-full" style={{ fontFamily:"var(--font-body)" }}>
        <AdminLayout
          currentPage={adminPage}
          onNavigate={setAdminPage}
          onSignOut={() => setMode("landing")}
        >
          {renderAdminPage()}
        </AdminLayout>
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── Partner onboarding (public standalone page) ── */
  if (mode === "partner-onboarding") {
    return (
      <div className="size-full overflow-y-auto">
        <PartnerOnboarding />
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── White Glove client document submission (token-based, no login) ── */
  if (mode === "wg-submit") {
    return (
      <div className="size-full overflow-y-auto">
        <WGClientSubmitDemo setMode={setMode}/>
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── White Glove client scheduling page (token-based, no login) ── */
  if (mode === "wg-schedule") {
    // Create a live demo token for Dorothy so the flow is interactive
    const demoToken = (() => {
      const today = new Date();
      const fmt = (d: Date, t: string) =>
        d.toLocaleDateString("en-US", { weekday:"long", month:"short", day:"numeric" }) + " · " + t;
      const d1 = new Date(today); d1.setDate(today.getDate() + 1);
      const d2 = new Date(today); d2.setDate(today.getDate() + 1);
      const d3 = new Date(today); d3.setDate(today.getDate() + 2);
      const d4 = new Date(today); d4.setDate(today.getDate() + 3);
      const token = createScheduleToken(
        "WG-001", "Dorothy Henderson", "Marcus Williams",
        [fmt(d1,"10:00 AM"), fmt(d2,"2:00 PM"), fmt(d3,"11:00 AM"), fmt(d4,"3:00 PM")]
      );
      return token.token;
    })();
    return (
      <div className="size-full overflow-y-auto">
        <div className="px-4 pt-3 pb-1 text-center" style={{ background:"rgba(58,91,217,0.05)", borderBottom:"1px solid rgba(58,91,217,0.1)" }}>
          <span style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>
            📅 DEMO — Dorothy's callback scheduling page (as she sees it on her phone)
          </span>
        </div>
        <WGSchedulePage token={demoToken}/>
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── Concierge staff login ── */
  if (mode === "concierge-login") {
    return (
      <div className="size-full">
        <ConciergeLogin
          onLogin={emp => { setConciergeEmployee(emp); setMode("concierge"); }}
          onBackToSite={() => setMode("landing")}
        />
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── Concierge staff portal ── */
  if (mode === "concierge") {
    // If no one has logged in (e.g. jumped here from DemoBar), use first demo employee
    const portalEmployee = conciergeEmployee ?? conciergeEmployees[0];
    if (!portalEmployee) { setMode("concierge-login"); return null; }
    return (
      <div className="size-full">
        <ConciergePortal
          employee={portalEmployee}
          onSignOut={() => { setConciergeEmployee(null); setMode("concierge-login"); }}
        />
        <DemoBar mode={mode} setMode={setMode}/>
      </div>
    );
  }

  /* ── User portal ── */
  return (
    <div className="size-full" style={{ fontFamily:"var(--font-body)" }}>
      <Layout
        currentPage={userPage}
        onNavigate={setUserPage}
        onGoAdmin={() => setMode("admin-login")}
        onSignOut={() => setMode("landing")}
      >
        {renderUserPage()}
      </Layout>
      <DemoBar mode={mode} setMode={setMode}/>
    </div>
  );
}

export default function App() {
  return (
    <WLPackagesProvider>
      <WhiteLabelProvider>
        <WLEntitlementProvider>
        <DemoProvider>
          <Toaster position="bottom-right" toastOptions={{ style: TOASTER_STYLE }} theme="dark"/>
          <AppShell/>
        </DemoProvider>
        </WLEntitlementProvider>
      </WhiteLabelProvider>
    </WLPackagesProvider>
  );
}

