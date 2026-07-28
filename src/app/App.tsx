import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router";
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
import { CryptoMerchant } from "./components/admin/CryptoMerchant";
import { ConciergeLogin } from "./components/ConciergeLogin";
import { ConciergePortal } from "./components/ConciergePortal";
import { conciergeEmployees, getEmployee } from "./services/conciergeStaff";
import {
  isAdminAuthed, setAdminAuthed, clearAdminAuthed,
  getConciergeEmployeeId, setConciergeEmployeeId, clearConciergeEmployeeId,
} from "./services/authSession";

/* ── Demo wrapper: pick which client to simulate ────────────────── */
const WG_DEMO_CLIENTS = [
  { token:"TOKEN_MARCUS_001", name:"Dorothy Henderson",      specialist:"Marcus Williams",  clientId:"WG-001" },
  { token:"TOKEN_PATRICIA_002", name:"Walter & Edna Briggs", specialist:"Patricia Chen",   clientId:"WG-002" },
  { token:"TOKEN_JAMES_003",  name:"Margaret Thompson",      specialist:"James Rivera",    clientId:"WG-003" },
];

function WGClientSubmitDemo() {
  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<string | null>(null);
  const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  if (selected) {
    const client = WG_DEMO_CLIENTS.find(c => c.token === selected)!;
    const goToSpecialistInbox = () => {
      // Demo-only cross-link straight from the public doc-submit page into the
      // Concierge Portal — establish the session on the fly so it's frictionless.
      const emp = conciergeEmployees.find(e => e.name === client.specialist);
      if (emp) setConciergeEmployeeId(emp.id);
      navigate("/concierge");
    };
    return (
      <div>
        {/* Back bar */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b"
          style={{ background:"#0A0F1A", borderColor:"rgba(91,167,214,0.2)" }}>
          <button onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color:"#6FAE8B" }}>
            ← Switch Client
          </button>
          <div style={{ color:"#8A9AB8", fontSize:15, ...MONO }}>
            Simulating: {client.name} · Specialist: {client.specialist}
          </div>
          <button onClick={goToSpecialistInbox}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background:"rgba(91,110,225,0.08)", color:"#6E90C9" }}>
            View {client.specialist.split(" ")[0]}'s Inbox →
          </button>
        </div>
        <WGClientSubmit token={selected}/>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background:"#070A12", fontFamily:"var(--font-body)" }}>
      <div style={{ maxWidth:520, width:"100%" }}>
        <div className="text-center mb-8">
          <div style={{ color:"#6FAE8B", fontSize:15, fontWeight:700, ...MONO, letterSpacing:"0.1em", marginBottom:8 }}>
            📤 CLIENT DOCUMENT SUBMISSION — DEMO
          </div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:30, color:"#E8EDF5", marginBottom:8 }}>
            Which client are you simulating?
          </h2>
          <p style={{ color:"#8A9AB8", fontSize:16, lineHeight:1.7 }}>
            Each client has a unique secure link. Select a client to see their submission page — then switch to the Concierge Portal to see the document appear live in their specialist's inbox.
          </p>
        </div>

        <div className="space-y-3">
          {WG_DEMO_CLIENTS.map(c => (
            <button key={c.token} onClick={() => setSelected(c.token)}
              className="w-full flex items-start gap-4 p-5 rounded-2xl text-left transition-all"
              style={{ background:"linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%)", border:"1.5px solid rgba(91,167,214,0.35)",
                boxShadow:"0 0 0 1px rgba(91,167,214,0.1), 0 8px 24px rgba(0,0,0,0.35)" }}>
              <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
                style={{ width:48, height:48, background:"rgba(91,167,214,0.1)", color:"#6FAE8B", fontFamily:"var(--font-display)", fontSize:22.5 }}>
                {c.name.split(" ").map((w:string) => w[0]).join("").slice(0,2)}
              </div>
              <div className="flex-1">
                <div style={{ color:"#E8EDF5", fontSize:19, fontWeight:600, marginBottom:3 }}>{c.name}</div>
                <div style={{ color:"#8A9AB8", fontSize:15 }}>
                  Specialist: <strong style={{ color:"#6FAE8B" }}>{c.specialist}</strong>
                </div>
                <div style={{ color:"#4A5A7A", fontSize:14, marginTop:2, ...MONO }}>
                  Token: {c.token}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl self-center flex-shrink-0"
                style={{ background:"rgba(91,167,214,0.08)", color:"#6FAE8B", fontSize:15, fontWeight:700 }}>
                Open →
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 p-4 rounded-2xl text-center"
          style={{ background:"rgba(91,110,225,0.06)", border:"1px solid rgba(91,110,225,0.2)" }}>
          <div style={{ color:"#6E90C9", fontSize:15, fontWeight:700, ...MONO, marginBottom:6 }}>HOW TO TEST THE LIVE SYNC</div>
          <ol style={{ color:"#8A9AB8", fontSize:15, lineHeight:2, textAlign:"left" }}>
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

/* ── Client scheduling demo wrapper — creates a live token once per visit ── */
function WGScheduleDemo() {
  const [demoToken] = useState(() => {
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
  });

  return (
    <div className="size-full overflow-y-auto">
      <div className="px-4 pt-3 pb-1 text-center" style={{ background:"rgba(91,110,225,0.05)", borderBottom:"1px solid rgba(91,110,225,0.1)" }}>
        <span style={{ color:"#8A9AB8", fontSize:14, fontFamily:"var(--font-mono)" }}>
          📅 DEMO — Dorothy's callback scheduling page (as she sees it on her phone)
        </span>
      </div>
      <WGSchedulePage token={demoToken}/>
      <DemoBar/>
    </div>
  );
}

const TOASTER_STYLE = {
  background: "rgba(8,15,26,0.98)",
  border: "1px solid rgba(91,110,225,0.25)",
  color: "#E8EDF5",
  fontFamily: "var(--font-body)",
  fontSize: 16,
  borderRadius: 12,
  backdropFilter: "blur(16px)",
};

/* ── Floating demo nav — bottom-right, sits just below the AI Assistant ── */
type DemoTab = { path: string; label: string };

const DEMO_TABS: DemoTab[] = [
  { path: "/",                  label: "🏠 Landing" },
  { path: "/dashboard",         label: "👤 User Portal" },
  { path: "/admin/login",       label: "🔐 Admin Login" },
  { path: "/admin",             label: "👑 Admin Portal" },
  { path: "/partner",           label: "🤝 Partner Portal" },
  { path: "/concierge/login",   label: "⭐ Concierge Login" },
  { path: "/concierge",         label: "⭐ Concierge Portal" },
  { path: "/documents/submit",  label: "📤 Client Doc Submit" },
  { path: "/schedule",          label: "📅 Client Schedule Page" },
];

function DemoBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const current = DEMO_TABS.find(t => t.path === location.pathname) ?? DEMO_TABS[0];

  function goTo(tab: DemoTab) {
    // The demo switcher stays frictionless: jumping straight into a gated
    // portal establishes the session on the fly instead of bouncing to login.
    if (tab.path === "/admin") setAdminAuthed();
    if (tab.path === "/concierge") setConciergeEmployeeId(conciergeEmployees[0].id);
    navigate(tab.path);
    setOpen(false);
  }

  return (
    /* right:24 aligns with AI Assistant (right-6 = 24px). top of this pill sits ~8px below the AI button. */
    <div className="fpd-demo" style={{ position:"fixed", bottom:24, right:24, zIndex:9999, fontFamily:"var(--font-mono)" }}>
      <style>{`
        .fpd-demo .demo-panel{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1.5px solid rgba(91,110,225,0.4);box-shadow:0 0 0 1px rgba(91,110,225,0.1),0 8px 40px rgba(0,0,0,0.6),0 0 18px -8px rgba(91,110,225,0.35);backdrop-filter:blur(20px);}
        .fpd-demo .demo-tab{color:#8A9AB8;background:transparent;border:1px solid transparent;transition:background .16s ease,color .16s ease,box-shadow .16s ease;}
        .fpd-demo .demo-tab:hover{background:rgba(91,110,225,0.14);color:#C7CEE8;}
        .fpd-demo .demo-tab.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}
        .fpd-demo .demo-tab.on:hover{filter:brightness(1.08);}
        .fpd-demo .demo-toggle{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(91,110,225,0.4);box-shadow:0 0 0 1px rgba(91,110,225,0.1),0 4px 20px rgba(0,0,0,0.5);transition:border-color .18s ease,box-shadow .18s ease;}
        .fpd-demo .demo-toggle:hover{border-color:rgba(91,110,225,0.6);box-shadow:0 0 0 1px rgba(91,110,225,0.14),0 4px 20px rgba(0,0,0,0.5),0 0 22px -6px rgba(91,110,225,0.45);}
      `}</style>
      {open && (
        <div className="demo-panel" style={{
          position:"absolute", bottom:"calc(100% + 8px)", right:0,
          borderRadius:14, padding:"8px 6px",
          display:"flex", flexDirection:"column", gap:3, minWidth:190,
        }}>
          <div style={{ color:"rgba(255,255,255,0.34)", fontSize:10, letterSpacing:"0.15em", padding:"2px 8px 4px", fontWeight:700 }}>DEMO MODE — SWITCH VIEW</div>
          {DEMO_TABS.map(t => (
            <button key={t.path} onClick={() => goTo(t)}
              className={`demo-tab${location.pathname===t.path ? " on" : ""}`}
              style={{ padding:"7px 12px", borderRadius:9, fontSize:14, fontWeight:700, cursor:"pointer", textAlign:"left" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="demo-toggle"
        style={{
          display:"flex", alignItems:"center", gap:8, padding:"8px 14px",
          borderRadius:99, fontSize:12.5, fontWeight:700, cursor:"pointer",
          color:"#6FAE8B", backdropFilter:"blur(16px)", letterSpacing:"0.06em",
        }}>
        <span style={{ fontSize:17.5 }}>{current.label.split(" ")[0]}</span>
        <span>DEMO</span>
        <span style={{ fontSize:10, opacity:0.6 }}>{open ? "▲" : "▼"}</span>
      </button>
    </div>
  );
}

/* ── Landing ─────────────────────────────────────────────────────── */
function LandingRoute() {
  const navigate = useNavigate();
  return (
    <div className="w-full" style={{ fontFamily:"var(--font-body)" }}>
      <LandingPage
        onGetStarted={() => navigate("/dashboard")}
        onAdminLogin={() => navigate("/admin/login")}
        onPartnerPortal={() => navigate("/partner")}
        onConciergeLogin={() => navigate("/concierge/login")}
      />
      <DemoBar/>
    </div>
  );
}

/* ── User portal ─────────────────────────────────────────────────── */
function UserRoute() {
  const navigate = useNavigate();
  const [userPage, setUserPage] = useState<PageId>("dashboard");

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
      case "white-label":         return <WhiteLabelStudio onPurchase={() => navigate("/partner")}/>;
      case "waiver-sign":         return <div className="p-6"><WaiverSignPage onBack={() => nav("dashboard")}/></div>;
      case "account-settings":    return <AccountSettings/>;
      case "fpd-ai":              return <AIAgent pageMode={true}/>;
      default:                    return <UserDashboard onNavigate={nav}/>;
    }
  };

  return (
    <div className="size-full" style={{ fontFamily:"var(--font-body)" }}>
      <Layout
        currentPage={userPage}
        onNavigate={setUserPage}
        onGoAdmin={() => navigate("/admin/login")}
        onSignOut={() => navigate("/")}
      >
        {renderUserPage()}
      </Layout>
      <DemoBar/>
    </div>
  );
}

/* ── Admin login ─────────────────────────────────────────────────── */
function AdminLoginRoute() {
  const navigate = useNavigate();
  return (
    <div className="size-full">
      <AdminLogin
        onLogin={() => { setAdminAuthed(); navigate("/admin"); }}
        onBackToSite={() => navigate("/")}
      />
      <DemoBar/>
    </div>
  );
}

/* ── Admin portal (gated — redirects to /admin/login without a session) ── */
function AdminRoute() {
  const navigate = useNavigate();
  const [adminPage, setAdminPage] = useState<AdminPageId>("master-admin");

  if (!isAdminAuthed()) return <Navigate to="/admin/login" replace/>;

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

  return (
    <div className="size-full" style={{ fontFamily:"var(--font-body)" }}>
      <AdminLayout
        currentPage={adminPage}
        onNavigate={setAdminPage}
        onSignOut={() => { clearAdminAuthed(); navigate("/"); }}
      >
        {renderAdminPage()}
      </AdminLayout>
      <DemoBar/>
    </div>
  );
}

/* ── Partner onboarding (public standalone page) ── */
function PartnerRoute() {
  return (
    <div className="size-full overflow-y-auto">
      <PartnerOnboarding />
      <DemoBar/>
    </div>
  );
}

/* ── Concierge staff login ── */
function ConciergeLoginRoute() {
  const navigate = useNavigate();
  return (
    <div className="size-full">
      <ConciergeLogin
        onLogin={emp => { setConciergeEmployeeId(emp.id); navigate("/concierge"); }}
        onBackToSite={() => navigate("/")}
      />
      <DemoBar/>
    </div>
  );
}

/* ── Concierge staff portal (gated — redirects to /concierge/login without a session) ── */
function ConciergeRoute() {
  const navigate = useNavigate();
  const id = getConciergeEmployeeId();
  const employee = id ? getEmployee(id) : undefined;

  if (!employee) return <Navigate to="/concierge/login" replace/>;

  return (
    <div className="size-full">
      <ConciergePortal
        employee={employee}
        onSignOut={() => { clearConciergeEmployeeId(); navigate("/concierge/login"); }}
      />
      <DemoBar/>
    </div>
  );
}

/* ── White Glove client document submission (token-based, no login) ── */
function DocSubmitRoute() {
  return (
    <div className="size-full overflow-y-auto">
      <WGClientSubmitDemo/>
      <DemoBar/>
    </div>
  );
}

function AppShell() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute/>}/>
      <Route path="/dashboard" element={<UserRoute/>}/>
      <Route path="/admin/login" element={<AdminLoginRoute/>}/>
      <Route path="/admin" element={<AdminRoute/>}/>
      <Route path="/partner" element={<PartnerRoute/>}/>
      <Route path="/concierge/login" element={<ConciergeLoginRoute/>}/>
      <Route path="/concierge" element={<ConciergeRoute/>}/>
      <Route path="/documents/submit" element={<DocSubmitRoute/>}/>
      <Route path="/schedule" element={<WGScheduleDemo/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <WLPackagesProvider>
      <WhiteLabelProvider>
        <WLEntitlementProvider>
        <DemoProvider>
          <BrowserRouter>
            <Toaster position="bottom-right" toastOptions={{ style: TOASTER_STYLE }} theme="dark"/>
            <AppShell/>
          </BrowserRouter>
        </DemoProvider>
        </WLEntitlementProvider>
      </WhiteLabelProvider>
    </WLPackagesProvider>
  );
}
