import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router";
import { Toaster } from "sonner";
import { supabase } from "./services/supabase";
import { trackPageView, trackHeartbeat, HEARTBEAT_INTERVAL_MS } from "./services/engagement";
import { DemoProvider, useDemo } from "./context/DemoContext";
import { StarterUpgradeWall, StarterCountdownBanner } from "./components/StarterUpgradeWall";
import { starterDaysLeft } from "./utils/starterPlan";
import { LegacyClaimSubmit } from "./components/LegacyClaimSubmit";
import { PortalNotice } from "./components/PortalNotice";
import { usePlatform, hiddenPages } from "./services/platform";
import { adminApi } from "./services/adminApi";
import { useAdminFetch } from "./hooks/useAdminFetch";
import { Wrench, Heart, UserX } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WhiteLabelProvider } from "./context/WhiteLabelContext";
import { WLPackagesProvider } from "./context/WLPackagesContext";
import { WLEntitlementProvider } from "./context/WLEntitlementContext";
import { UserLogin } from "./components/UserLogin";
import { TwoFactorGate } from "./components/twofa/TwoFactorGate";
import { UserSignup } from "./components/UserSignup";
import { signOut } from "./services/auth";

/* User portal */
import { Layout, type PageId } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { UserDashboard } from "./components/UserDashboard";
import { LegacyVault } from "./components/LegacyVault";
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
import { ReceiptsExpenses } from "./components/ReceiptsExpenses";
import { PersonalAssets } from "./components/PersonalAssets";
import { Utilities } from "./components/Utilities";
import { FamilyMemories } from "./components/FamilyMemories";
import { PetRecords } from "./components/PetRecords";
import { ContactsHub } from "./components/ContactsHub";
import { OrganizeHub } from "./components/OrganizeHub";
import { LifeCalendar } from "./components/LifeCalendar";
import { AffiliateProgram } from "./components/AffiliateProgram";
import { DigitalFileCabinet } from "./components/DigitalFileCabinet";
import { FamilyFriends } from "./components/FamilyFriends";
import { DigitalDiary } from "./components/DigitalDiary";
import { MessagesToLovedOnes } from "./components/MessagesToLovedOnes";
import { VitalClone } from "./components/VitalClone";
import { PasswordManager } from "./components/PasswordManager";
import { VaultUnlock } from "./components/VaultUnlock";
import { SubscriptionManager } from "./components/SubscriptionManager";
import { LegacyContinuationFee } from "./components/LegacyContinuationFee";
import { DisasterRecovery } from "./components/DisasterRecovery";
import { PartnerOnboarding } from "./components/PartnerOnboarding";
import { WhiteLabelOnboarding } from "./components/WhiteLabelOnboarding";
import { PartnerOnboardingAdmin } from "./components/admin/PartnerOnboardingAdmin";
import { AIAgent } from "./components/AIAgent";

/* Admin portal */
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminLayout, type AdminPageId } from "./components/admin/AdminLayout";
import { MasterAdmin } from "./components/admin/MasterAdmin";
import { AdminSettings } from "./components/admin/AdminSettings";
import { PaymentProcessors } from "./components/admin/PaymentProcessors";
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
import { WaiverSignPage } from "./components/WaiverForm";
import { AccountSettings } from "./components/AccountSettings";
import { WGClientSubmit } from "./components/WGClientSubmit";
import { WGSchedulePage } from "./components/WGSchedulePage";
import { createScheduleToken } from "./services/wgClientStore";
import { CryptoMerchant } from "./components/admin/CryptoMerchant";
import { AdminRoles } from "./components/admin/AdminRoles";
import { ConciergeLogin } from "./components/ConciergeLogin";
import { ConciergePortal } from "./components/ConciergePortal";
import { getMyConciergeProfile, type ConciergeEmployee } from "./services/conciergeStaff";
import {
  isAdminAuthed, setAdminAuthed, clearAdminAuthed,
  // The concierge flag no longer gates anything — kept only to clear stale
  // values written before that portal moved onto real Supabase auth.
  clearConciergeEmployeeId,
} from "./services/authSession";

/* ── Demo wrapper: pick which client to simulate ────────────────── */
const WG_DEMO_CLIENTS = [
  { token:"TOKEN_MARCUS_001", name:"Dorothy Henderson",      specialist:"Marcus Williams",  clientId:"WG-001" },
  { token:"TOKEN_PATRICIA_002", name:"Walter & Edna Briggs", specialist:"Patricia Chen",   clientId:"WG-002" },
  { token:"TOKEN_JAMES_003",  name:"Margaret Thompson",      specialist:"James Rivera",    clientId:"WG-003" },
];

function WGClientSubmitDemo() {
  /* Dev-only, for the same reason as DemoBar: goToSpecialistInbox() below
     establishes a Concierge session from a PUBLIC route (/documents/submit)
     without asking for credentials, which would let anyone read client
     document inboxes. Replaced at build time, so production drops it. */
  if (!import.meta.env.DEV) return null;

  const navigate = useNavigate();
  const [selected, setSelected] = React.useState<string | null>(null);
  const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

  if (selected) {
    const client = WG_DEMO_CLIENTS.find(c => c.token === selected)!;
    const goToSpecialistInbox = () => {
      // The Concierge Portal runs on real Supabase auth now, so there is no
      // session to fabricate from here — send them to sign in properly.
      navigate("/concierge/login");
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
  /* Dev-only. goTo() below establishes an admin or concierge session without
     asking for credentials, which is a convenience on a developer machine and
     an authentication bypass on a public site — the switcher is rendered on
     the landing page, so anyone could walk into the admin portal.

     import.meta.env.DEV is replaced at build time, so in a production bundle
     this reads `if (true) return null` and the rest is dropped entirely
     rather than merely hidden. The guard sits above every hook, and because
     the value is a compile-time constant the hook order stays stable. */
  if (!import.meta.env.DEV) return null;

  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  function goTo(tab: DemoTab) {
    // The demo switcher stays frictionless: jumping straight into a gated
    // portal establishes the session on the fly instead of bouncing to login.
    if (tab.path === "/admin") setAdminAuthed();
    // /concierge is real Supabase auth now and cannot be short-circuited; its
    // route guard bounces to the staff sign-in like any other visitor.
    navigate(tab.path);
    setOpen(false);
  }

  return (
    /* right:24 aligns with AI Assistant (right-6 = 24px). top of this pill sits ~8px below the AI button. */
    <div className="fpd-demo" style={{ zIndex:9999, fontFamily:"var(--font-mono)" }}>
      <style>{`
        .fpd-demo{position:fixed;bottom:24px;right:24px;}
        .fpd-demo .demo-panel{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1.5px solid rgba(91,110,225,0.4);box-shadow:0 0 0 1px rgba(91,110,225,0.1),0 8px 40px rgba(0,0,0,0.6),0 0 18px -8px rgba(91,110,225,0.35);backdrop-filter:blur(20px);}
        .fpd-demo .demo-tab{color:#8A9AB8;background:transparent;border:1px solid transparent;transition:background .16s ease,color .16s ease,box-shadow .16s ease;}
        .fpd-demo .demo-tab:hover{background:rgba(91,110,225,0.14);color:#C7CEE8;}
        .fpd-demo .demo-tab.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}
        .fpd-demo .demo-tab.on:hover{filter:brightness(1.08);}
        .fpd-demo .demo-toggle{display:flex;align-items:center;justify-content:center;width:58px;height:58px;padding:0;border-radius:50%;font-size:22.5px;font-weight:700;cursor:pointer;color:#fff;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);border:1px solid rgba(255,255,255,0.08);box-shadow:0 14px 34px -12px rgba(91,110,225,0.8),inset 0 1px 0 rgba(255,255,255,0.08);transition:transform .18s ease,filter .18s ease;}
        .fpd-demo .demo-toggle:hover{transform:translateY(-2px);filter:brightness(1.06);}
        @media (max-width:480px){
          .fpd-demo{bottom:18px;right:16px;}
          .fpd-demo .demo-toggle{width:48px;height:48px;font-size:19px;}
        }
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
      <button onClick={() => setOpen(!open)} className="demo-toggle" title="Switch Demo View" aria-label="Switch Demo View">
        👤
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
        onGetStarted={() => navigate("/signup")}
        onAdminLogin={() => navigate("/admin/login")}
        onPartnerPortal={() => navigate("/partner")}
        onConciergeLogin={() => navigate("/concierge/login")}
        onApplyWhiteLabel={tier => navigate(`/partner/onboard?tier=${tier}`)}
      />
      <AIAgent/>
      <DemoBar/>
    </div>
  );
}

/* ── User login / signup ─────────────────────────────────────────── */
function UserLoginRoute() {
  const navigate = useNavigate();
  return (
    <div className="size-full">
      <UserLogin
        onLogin={() => navigate("/dashboard")}
        onGoSignup={() => navigate("/signup")}
        onBackToSite={() => navigate("/")}
      />
    </div>
  );
}

function UserSignupRoute() {
  const navigate = useNavigate();
  // System → Settings → Feature Flags → Public Signup.
  const platform = usePlatform();
  if (platform.ready && !platform.flags.publicSignup) {
    return (
      <PortalNotice icon={<UserX size={30} color="#D9A55E"/>} kicker="SIGN-UPS CLOSED" title="New accounts are not open right now"
        body="Final Pass Down is not accepting new sign-ups at the moment. If you already have an account you can still sign in."
        actionLabel="Go to sign in" onAction={() => navigate("/login")}/>
    );
  }
  return (
    <div className="size-full">
      <UserSignup
        onSignedUp={() => navigate("/dashboard")}
        onGoLogin={() => navigate("/login")}
        onBackToSite={() => navigate("/")}
      />
    </div>
  );
}

/* ── User portal (gated — redirects to /login without a session) ──── */
function UserRoute() {
  const navigate = useNavigate();
  const { session, authUser, loading, twoFactorPending, refreshTwoFactor } = useAuth();
  const { user } = useDemo();
  const platform = usePlatform();
  /* The portal's page is component state rather than a route, so the PWA
     manifest's home-screen shortcuts (/dashboard?page=file-cabinet) pass their
     target in as a query param. Read once, for the initial value only —
     afterwards the sidebar owns navigation and the URL stays put. */
  const [userPage, setUserPage] = useState<PageId>(() => {
    const p = new URLSearchParams(window.location.search).get("page");
    return (p as PageId) || "dashboard";
  });

  // Product-usage telemetry (migration 021) — every screen funnels through
  // this one `userPage` state, so this is the single place to log a page
  // view rather than instrumenting ~30 individual screen components.
  useEffect(() => {
    if (!authUser) return;
    trackPageView(authUser.id, userPage);
  }, [authUser, userPage]);

  useEffect(() => {
    if (!authUser) return;
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") trackHeartbeat(authUser.id, userPage);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authUser, userPage]);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace/>;
  // A restored session (persistSession) can be valid and still owe a second
  // factor — the sign-in screen's own challenge never ran for it.
  if (twoFactorPending) return <TwoFactorGate onCancelled={() => navigate("/login")}/>;

  const leave = () => { signOut(); navigate("/"); };

  // An account marked deceased by an admin is frozen: nothing in it can be
  // opened or changed from its own sign-in. Legacy contacts reach it through
  // the claim process instead.
  if (user.deceasedAt) {
    return (
      <PortalNotice icon={<Heart size={30} color="#FC8181"/>} kicker="ACCOUNT FROZEN" title="This account has been frozen"
        body={"Final Pass Down has been notified that this account holder has passed away, so the account can no longer be signed in to.\n\nIf you are a legacy contact, please use the secure claim link sent to you. If this is a mistake, contact Final Pass Down support."}
        actionLabel="Sign out" onAction={leave}/>
    );
  }

  // System → Settings → General → Maintenance Mode.
  if (platform.maintenance) {
    return (
      <PortalNotice icon={<Wrench size={30} color="#D9A55E"/>} kicker="MAINTENANCE" title="We'll be right back"
        body={platform.maintenanceMsg || "We're performing scheduled maintenance. We'll be back shortly."}
        actionLabel="Sign out" onAction={leave}/>
    );
  }

  // Pages whose feature flag is switched off fall back to the dashboard.
  const hidden = hiddenPages(platform.flags);

  // Starter is a 14-day introductory plan (migration 026). Once it runs out
  // the portal is replaced by the upgrade screen until a bigger plan is chosen.
  const starterDays = starterDaysLeft(user.plan, user.starterStartedAt, platform.starterTrialDays);
  if (starterDays === 0) return <StarterUpgradeWall onSignOut={() => { signOut(); navigate("/"); }}/>;

  const renderUserPage = () => {
    const nav = (p: string) => setUserPage(p as PageId);
    if (hidden.has(userPage)) return <UserDashboard onNavigate={nav}/>;
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
      case "receipts-expenses":   return <ReceiptsExpenses/>;
      case "personal-assets":     return <PersonalAssets/>;
      case "utilities":           return <Utilities/>;
      case "family-memories":     return <FamilyMemories/>;
      case "pet-records":         return <PetRecords/>;
      case "digital-diary":         return <DigitalDiary/>;
      case "messages-loved-ones":   return <MessagesToLovedOnes/>;
      case "vital-clone":           return <VitalClone/>;
      // Credentials are encrypted client-side, so the screen cannot render
      // anything readable until the passphrase has derived the key.
      case "password-manager":      return <VaultUnlock><PasswordManager/></VaultUnlock>;
      case "subscription-manager":   return <VaultUnlock><SubscriptionManager/></VaultUnlock>;
      case "legacy-continuation":    return <LegacyContinuationFee/>;
      case "disaster-recovery":      return <DisasterRecovery/>;
      case "contacts-legacy":    return <ContactsHub initialSection="legacy"/>;
      case "contacts-guardian":  return <ContactsHub initialSection="guardian"/>;
      case "contacts-emergency": return <ContactsHub initialSection="emergency"/>;
      // legacy-verification merged into contacts-legacy
      case "organize":            return <OrganizeHub onNavigate={nav}/>;
      case "calendar":            return <LifeCalendar onNavigate={nav}/>;
      case "storage-usage":       return <StorageUsage onNavigate={nav}/>;
      case "affiliate":           return <AffiliateProgram/>;
      case "white-glove":         return <WhiteGloveService/>;
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
        onSignOut={() => { signOut(); navigate("/"); }}
      >
        {starterDays !== null && userPage !== "storage-usage" && (
          <StarterCountdownBanner daysLeft={starterDays} onUpgrade={() => setUserPage("storage-usage")}/>
        )}
        {renderUserPage()}
      </Layout>
      {userPage !== "fpd-ai" && platform.flags.aiAssistant && <AIAgent/>}
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

  // System → Settings → Security → Session Timeout: sign an idle admin out.
  const authed = isAdminAuthed();
  const { data: settingsData } = useAdminFetch(
    () => authed
      ? adminApi.get<{ settings: { security?: { sessionTimeout?: string } } }>("/settings")
      : Promise.resolve({ settings: {} as { security?: { sessionTimeout?: string } } }),
    [authed],
  );
  const timeoutMinutes = Number(settingsData?.settings.security?.sessionTimeout);
  useEffect(() => {
    if (!authed || !Number.isFinite(timeoutMinutes) || timeoutMinutes <= 0) return;
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => { supabase.auth.signOut(); clearAdminAuthed(); navigate("/admin/login"); };
    const reset = () => { clearTimeout(timer); timer = setTimeout(expire, timeoutMinutes * 60_000); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [authed, timeoutMinutes, navigate]);

  if (!authed) return <Navigate to="/admin/login" replace/>;

  const renderAdminPage = () => {
    switch (adminPage) {
      case "master-admin":        return <MasterAdmin onNavigate={setAdminPage}/>;
      case "admin-affiliate":     return <AffiliateAdmin/>;
      case "admin-partnership":   return <PartnershipAdmin/>;
      case "id-verification":     return <IDVerification/>;
      case "payout-management":   return <PayoutManagement/>;
      case "subscription-config": return <SubscriptionConfig/>;
      case "enterprise-api":      return <EnterpriseAPI/>;
      case "email-templates":     return <EmailTemplates/>;
      case "white-label":             return <WhiteLabelConfig/>;
      case "continuation-fee-admin":  return <ContinuationFeeAdmin view="config"/>;
      case "partner-onboarding-admin":  return <PartnerOnboardingAdmin/>;
      case "white-glove-admin":         return <WhiteGloveAdmin/>;
      case "crypto-merchant":           return <CryptoMerchant/>;
      case "admin-roles":               return <AdminRoles/>;
      case "admin-settings":            return <AdminSettings onNavigate={setAdminPage}/>;
      case "payment-processors":        return <PaymentProcessors/>;
      default:                          return <MasterAdmin onNavigate={setAdminPage}/>;
    }
  };

  return (
    <div className="size-full" style={{ fontFamily:"var(--font-body)" }}>
      <AdminLayout
        currentPage={adminPage}
        onNavigate={setAdminPage}
        onSignOut={() => { supabase.auth.signOut(); clearAdminAuthed(); navigate("/"); }}
      >
        {renderAdminPage()}
      </AdminLayout>
      <DemoBar/>
    </div>
  );
}

/* ── Partner onboarding (public standalone page) ── */
function PartnerRoute() {
  // System → Settings → Feature Flags → Partner Portal.
  const platform = usePlatform();
  if (platform.ready && !platform.flags.partnerPortal) return <Navigate to="/" replace/>;
  return (
    <div className="size-full overflow-y-auto">
      <PartnerOnboarding />
      <DemoBar/>
    </div>
  );
}

/* ── White label reseller application (public standalone page — no existing account needed) ── */
function WhiteLabelOnboardRoute() {
  const platform = usePlatform();
  if (platform.ready && !platform.flags.partnerPortal) return <Navigate to="/" replace/>;
  return (
    <div className="size-full overflow-y-auto">
      <WhiteLabelOnboarding />
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
        onLogin={() => navigate("/concierge")}
        onBackToSite={() => navigate("/")}
      />
      <DemoBar/>
    </div>
  );
}

/* ── Concierge staff portal (gated — redirects to /concierge/login without a session) ── */
function ConciergeRoute() {
  const navigate = useNavigate();
  const { session, loading, twoFactorPending } = useAuth();
  const [employee, setEmployee] = useState<ConciergeEmployee | null | undefined>(undefined);

  // The roster row is the authorization check: a valid Supabase session proves
  // who you are, not that you are concierge staff. RLS returns nothing for a
  // customer session, so this is a real gate rather than a UI convenience.
  useEffect(() => {
    if (!session) { setEmployee(null); return; }
    let cancelled = false;
    getMyConciergeProfile()
      .then(emp => { if (!cancelled) setEmployee(emp); })
      .catch(() => { if (!cancelled) setEmployee(null); });
    return () => { cancelled = true; };
  }, [session]);

  if (loading || employee === undefined) return null;
  if (!session) return <Navigate to="/concierge/login" replace/>;
  if (twoFactorPending) return <TwoFactorGate onCancelled={() => navigate("/concierge/login")}/>;
  if (!employee || employee.status === "suspended") return <Navigate to="/concierge/login" replace/>;

  return (
    <div className="size-full">
      <ConciergePortal
        employee={employee}
        onSignOut={() => { clearConciergeEmployeeId(); signOut(); navigate("/concierge/login"); }}
      />
      <DemoBar/>
    </div>
  );
}

/* ── White Glove client document submission (token-based, no login) ── */
/* ── Legacy Claim Portal — public, opened from the link an admin issues ── */
function LegacyClaimRoute() {
  const { token } = useParams();
  if (!token) return <Navigate to="/" replace/>;
  return (
    <div className="size-full overflow-y-auto">
      <LegacyClaimSubmit token={token}/>
    </div>
  );
}

function DocSubmitRoute() {
  // The real client flow is token-based and lives elsewhere; this route only
  // ever hosted the demo client picker, so without it there is nothing here.
  if (!import.meta.env.DEV) return <Navigate to="/" replace/>;
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
      <Route path="/login" element={<UserLoginRoute/>}/>
      <Route path="/signup" element={<UserSignupRoute/>}/>
      <Route path="/dashboard" element={<UserRoute/>}/>
      <Route path="/admin/login" element={<AdminLoginRoute/>}/>
      <Route path="/admin" element={<AdminRoute/>}/>
      <Route path="/partner" element={<PartnerRoute/>}/>
      <Route path="/partner/onboard" element={<WhiteLabelOnboardRoute/>}/>
      <Route path="/concierge/login" element={<ConciergeLoginRoute/>}/>
      <Route path="/concierge" element={<ConciergeRoute/>}/>
      <Route path="/documents/submit" element={<DocSubmitRoute/>}/>
      <Route path="/schedule" element={<WGScheduleDemo/>}/>
      <Route path="/legacy-claim/:token" element={<LegacyClaimRoute/>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
