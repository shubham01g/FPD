import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router";
import { Toaster } from "sonner";
import { supabase } from "./services/supabase";
import { trackPageView, trackHeartbeat, HEARTBEAT_INTERVAL_MS } from "./services/engagement";
import { DemoProvider, useDemo } from "./context/DemoContext";
import { StarterUpgradeWall, StarterCountdownBanner, PastDueBanner } from "./components/StarterUpgradeWall";
import { usePaymentReturn } from "./hooks/usePaymentReturn";
import { captureReferral } from "./utils/referral";

// An affiliate link (/r/CODE or ?ref=CODE) is remembered before anything
// renders, so it survives the visitor browsing around before signing up.
captureReferral();
import { starterDaysLeft } from "./utils/starterPlan";
import { LegacyClaimSubmit } from "./components/LegacyClaimSubmit";
import { VaultResetPage } from "./components/VaultResetPage";
import { ContactAcceptPage } from "./components/ContactAcceptPage";
import { AccessPortal } from "./components/AccessPortal";
import { listSharedOwners } from "./services/contactAccess";
import { PortalNotice } from "./components/PortalNotice";
import { usePlatform, hiddenPages } from "./services/platform";
import { adminApi } from "./services/adminApi";
import { useAdminFetch } from "./hooks/useAdminFetch";
import { Wrench, Heart, UserX, Lock, CreditCard } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WhiteLabelProvider } from "./context/WhiteLabelContext";
import { WLPackagesProvider } from "./context/WLPackagesContext";
import { WLEntitlementProvider } from "./context/WLEntitlementContext";
import { UserLogin } from "./components/UserLogin";
import { ResetPasswordPage } from "./components/ResetPasswordPage";
import { LovedOneMessagePage } from "./components/LovedOneMessagePage";
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
import { AdminInviteAccept } from "./components/admin/AdminInviteAccept";
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
import { WaiverPublicPage } from "./components/WaiverForm";
import { AccountSettings } from "./components/AccountSettings";
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
  const platform = usePlatform();
  return (
    <div className="w-full" style={{ fontFamily:"var(--font-body)" }}>
      <LandingPage
        onGetStarted={() => navigate("/signup")}
        onPartnerPortal={() => navigate("/partner")}
        onApplyWhiteLabel={tier => navigate(`/partner/onboard?tier=${tier}`)}
      />
      {platform.flags.aiAssistant && <AIAgent/>}
      <DemoBar/>
    </div>
  );
}

/* ── User login / signup ─────────────────────────────────────────── */
function UserLoginRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  // ?next= brings a signed-out user back to the link they opened. Only these
  // pages are allowed, so the parameter can't send anyone elsewhere.
  const next = safeNext(location.search);
  const afterLogin = next ?? "/dashboard";
  return (
    <div className="size-full">
      <UserLogin
        onLogin={() => navigate(afterLogin)}
        onGoSignup={() => navigate(next ? `/signup?next=${encodeURIComponent(next)}` : "/signup")}
        onBackToSite={() => navigate("/")}
      />
    </div>
  );
}

/** The ?next= targets sign-in and sign-up may return to: the vault reset
 *  link, a contact invite (migration 046) and the Access Portal. */
function safeNext(search: string): string | null {
  const next = new URLSearchParams(search).get("next");
  return next && /^(\/vault-reset\/[0-9a-f]{64}|\/contact-accept\/[0-9a-f]{64}|\/access|\/partner(\?ref=[A-Za-z0-9-]{1,20})?|\/partner\/onboard(\?tier=[\w-]{1,60})?)$/.test(next) ? next : null;
}

function UserSignupRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  // A contact invited from /contact-accept/:token comes back there.
  const afterSignup = safeNext(location.search);
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
        onSignedUp={() => navigate(afterSignup ?? "/dashboard")}
        onGoLogin={() => navigate(afterSignup ? `/login?next=${encodeURIComponent(afterSignup)}` : "/login")}
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
  // Back from Stripe Checkout (?payment=success|cancelled).
  const { confirming } = usePaymentReturn();
  /* The portal's page is component state rather than a route, so the PWA
     manifest's home-screen shortcuts (/dashboard?page=file-cabinet) pass their
     target in as a query param. Read once, for the initial value only —
     afterwards the sidebar owns navigation and the URL stays put. */
  const [userPage, setUserPage] = useState<PageId>(() => {
    const p = new URLSearchParams(window.location.search).get("page");
    return (p as PageId) || "dashboard";
  });

  // Any screen can move to another page with goToPage() (utils/goToPage.ts).
  useEffect(() => {
    const onNav = (e: Event) => { const p = (e as CustomEvent<string>).detail; if (p) setUserPage(p as PageId); };
    window.addEventListener("fpd:navigate", onNav);
    return () => window.removeEventListener("fpd:navigate", onNav);
  }, []);

  // Product-usage telemetry (migration 021) — every screen funnels through
  // this one `userPage` state, so this is the single place to log a page
  // view rather than instrumenting ~30 individual screen components.
  useEffect(() => {
    if (!authUser) return;
    trackPageView(authUser.id, userPage);
  }, [authUser, userPage]);

  // Someone who is also a Legacy/Guardian Contact gets a "Shared with me"
  // link in the sidebar (migration 046). Quietly absent if the call fails.
  const [hasShared, setHasShared] = useState(false);
  useEffect(() => {
    if (!authUser) return;
    listSharedOwners().then(o => setHasShared(o.length > 0)).catch(() => setHasShared(false));
  }, [authUser]);

  // The header shortcut to the admin portal is for admins only; customers
  // never see it. (The server decides admin access; this only hides a button.)
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!authUser) { setIsAdmin(false); return; }
    supabase.from("users").select("is_admin").eq("id", authUser.id).maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean((data as { is_admin?: boolean } | null)?.is_admin)), () => setIsAdmin(false));
  }, [authUser]);

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

  // Suspended by an admin (Master Admin → Users → Suspend Account). The data
  // is kept; the account simply can't be used until an admin reinstates it.
  if (user.suspended) {
    return (
      <PortalNotice icon={<Lock size={30} color="#D9A55E"/>} kicker="ACCOUNT SUSPENDED" title="This account is suspended"
        body={"Your Final Pass Down account has been suspended, so it can't be used right now. Nothing in it has been deleted.\n\nIf you think this is a mistake, please contact Final Pass Down support."}
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
  // A paid (or comped) plan that ended — cancelled, or the card kept failing —
  // gets the same choice, worded as reactivating. Nothing stored is lost.
  const walled = starterDays === 0 || user.planStatus === "cancelled";
  // Just paid: the webhook lifts the wall within seconds, so don't flash it.
  if (walled && confirming) {
    return (
      <PortalNotice icon={<CreditCard size={30} color="#5B6EE1"/>} kicker="PAYMENT RECEIVED" title="Confirming your payment…"
        body={"Thanks! Your plan is being activated. This usually takes a few seconds."}
        actionLabel="Sign out" onAction={leave}/>
    );
  }
  if (user.planStatus === "cancelled") return <StarterUpgradeWall reason="cancelled" onSignOut={leave}/>;
  if (starterDays === 0) return <StarterUpgradeWall onSignOut={leave}/>;

  const renderUserPage = () => {
    const nav = (p: string) => setUserPage(p as PageId);
    if (hidden.has(userPage)) return <UserDashboard onNavigate={nav}/>;
    switch (userPage) {
      case "dashboard":           return <UserDashboard onNavigate={nav}/>;
      case "file-cabinet":        return <DigitalFileCabinet/>;
      case "family-friends":      return <FamilyFriends/>;
      case "legacy-vault":        return <LegacyVault/>;
      case "final-wishes":        return <FinalWishes/>;
      case "wills-trusts":        return <WillsAndTrusts onNavigate={nav}/>;
      case "job-history":         return <JobHistory/>;
      case "daycare-info":        return <DaycareInfo/>;
      case "id-keeper":           return <IDKeeper/>;
      case "favorite-places":     return <FavoritePlaces/>;
      case "travel-planner":      return <TravelPlanner/>;
      case "kids-activities":     return <KidsActivities/>;
      case "warranties":          return <Warranties/>;
      case "medical-info":        return <MedicalInfo/>;
      case "financial-records":   return <FinancialRecords onNavigate={nav}/>;
      case "insurance-policies":  return <FinancialRecords key="insurance" insuranceOnly/>;
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
      case "contacts-pet":       return <ContactsHub initialSection="pet_emergency"/>;
      // legacy-verification merged into contacts-legacy
      case "organize":            return <OrganizeHub onNavigate={nav}/>;
      case "calendar":            return <LifeCalendar onNavigate={nav}/>;
      case "storage-usage":       return <StorageUsage onNavigate={nav}/>;
      case "affiliate":           return <AffiliateProgram/>;
      case "white-glove":         return <WhiteGloveService/>;
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
        onGoAdmin={isAdmin ? () => navigate("/admin/login") : undefined}
        onSignOut={() => { signOut(); navigate("/"); }}
        onOpenShared={hasShared ? () => navigate("/access") : undefined}
      >
        {user.planStatus === "past_due" && <PastDueBanner/>}
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
interface AdminMe {
  email: string; role: string; sessionTimeout: string | null;
  permissions: { module: string; canView: boolean }[] | null;
}
/* Which permission module(s) each admin screen needs (any one is enough).
   Mirrors the server's requireModulePermission gates in index.tsx. */
const ADMIN_PAGE_MODULES: Partial<Record<AdminPageId, string[]>> = {
  "admin-roles": ["admin_team"], "admin-settings": ["admin_team"],
  "admin-affiliate": ["affiliates"], "admin-partnership": ["partners"],
  "white-glove-admin": ["white_glove"], "id-verification": ["verification"],
  "payout-management": ["payouts"], "subscription-config": ["subscription"],
  "enterprise-api": ["enterprise_api"], "email-templates": ["email_templates"],
  "white-label": ["white_label"], "partner-onboarding-admin": ["white_label"],
  "continuation-fee-admin": ["continuation", "subscription"],
  "crypto-merchant": ["crypto"], "payment-processors": ["crypto"],
};
function canOpenAdminPage(me: AdminMe | null, page: AdminPageId): boolean {
  // Until /me answers (or if it failed) only the home screen is offered, so a
  // restricted role never sees the full sidebar flash up.
  if (!me) return page === "master-admin";
  if (me.permissions === null || me.role === "super_admin") return true;
  const needs = ADMIN_PAGE_MODULES[page];
  if (!needs) return true;   // Master Admin: its tabs show what the role can read
  return needs.some(m => me.permissions!.some(p => p.module === m && p.canView));
}

function AdminRoute() {
  const navigate = useNavigate();
  const [adminPage, setAdminPage] = useState<AdminPageId>("master-admin");
  const { session, loading: authLoading, twoFactorPending } = useAuth();

  // Who is signed in (role + module permissions, which decide the sidebar)
  // and System → Settings → Security → Session Timeout, applied to every admin.
  const authed = isAdminAuthed();
  const { data: me } = useAdminFetch(
    () => authed && !twoFactorPending
      ? adminApi.get<AdminMe>("/me")
      : Promise.resolve(null),
    [authed, twoFactorPending],
  );
  const timeoutMinutes = Number(me?.sessionTimeout);
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
  if (authLoading) return null;
  // Same gate as the member portal. AdminLogin only challenges native
  // (authenticator/SMS) factors, so an email-code admin, or a restored
  // session that still owes a second factor, is challenged here. The server
  // refuses /admin/* until it is passed (requireAdmin).
  if (session && twoFactorPending) {
    return <TwoFactorGate onCancelled={() => { supabase.auth.signOut(); clearAdminAuthed(); navigate("/admin/login"); }}/>;
  }

  const renderAdminPage = () => {
    // A screen this role can't open (e.g. a stale selection) falls back home.
    if (!canOpenAdminPage(me ?? null, adminPage)) return <MasterAdmin onNavigate={setAdminPage}/>;
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
        canOpen={page => canOpenAdminPage(me ?? null, page)}
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
  // Admin → Settings → Feature flags → White Glove Concierge. The server
  // refuses every /concierge call while it's off; say why here.
  const platform = usePlatform();

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
  if (platform.ready && !platform.flags.whiteGloveConcierge) {
    return (
      <div className="size-full flex items-center justify-center px-6" style={{ background:"#070A12", color:"#C7D0E3", fontFamily:"var(--font-body)" }}>
        <div style={{ maxWidth:440, textAlign:"center" }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"#EFF2F9", marginBottom:10 }}>The Concierge Portal is switched off</h1>
          <p style={{ fontSize:16, lineHeight:1.6 }}>White Glove is turned off in the admin settings right now. Your clients and notes are kept; the portal opens again when it's turned back on.</p>
        </div>
      </div>
    );
  }

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
/* ── Admin invitation — public, opened from the link in an invite email ── */
function AdminInviteRoute() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  return <AdminInviteAccept id={params.get("id") ?? ""} token={params.get("token") ?? ""} onSignIn={() => navigate("/admin/login")}/>;
}

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

/* A delivered Message to Loved Ones (migration 050). No account needed. */
function LovedOneMessageRoute() {
  const { token } = useParams();
  if (!token) return <Navigate to="/" replace/>;
  return <div className="size-full overflow-y-auto"><LovedOneMessagePage token={token}/></div>;
}

/* White Glove authorization, signed from the emailed link (migration 051). */
function WaiverRoute() {
  const { token } = useParams();
  if (!token) return <Navigate to="/" replace/>;
  return <div className="size-full overflow-y-auto"><WaiverPublicPage token={token}/></div>;
}

function VaultResetRoute() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, loading, twoFactorPending } = useAuth();
  const { user } = useDemo();
  if (!token) return <Navigate to="/" replace/>;
  if (loading) return null;
  // Same gates as UserRoute: a session still owing its second factor must pass
  // it first, and a frozen or suspended account gets the dashboard's notice.
  if (session && twoFactorPending) return <TwoFactorGate onCancelled={() => navigate("/login")}/>;
  if (session && (user.deceasedAt || user.suspended)) return <Navigate to="/dashboard" replace/>;
  return (
    <div className="size-full overflow-y-auto">
      <VaultResetPage token={token}/>
    </div>
  );
}

/* "Forgot password?" email lands here. Deliberately outside the 2FA gate:
   the page runs the native challenge itself before allowing the change. */
function ResetPasswordRoute() {
  const navigate = useNavigate();
  return (
    <div className="size-full overflow-y-auto">
      <ResetPasswordPage onDone={() => navigate("/dashboard")} onBackToLogin={() => navigate("/login")}/>
    </div>
  );
}

/* ── Contacts (migration 046) ─────────────────────────────────────── */
/* The emailed Legacy/Guardian invite. Signed out is fine — the page offers
   sign in or sign up and comes back. Same gates as VaultResetRoute. */
function ContactAcceptRoute() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, loading, twoFactorPending } = useAuth();
  const { user } = useDemo();
  if (!token) return <Navigate to="/" replace/>;
  if (loading) return null;
  if (session && twoFactorPending) return <TwoFactorGate onCancelled={() => navigate("/login")}/>;
  if (session && (user.deceasedAt || user.suspended)) return <Navigate to="/dashboard" replace/>;
  return (
    <div className="size-full overflow-y-auto">
      <ContactAcceptPage token={token}/>
    </div>
  );
}

/* "Shared with me". Not behind the contact's own plan: a contact never has to
   pay to see what was left for them. */
function AccessRoute() {
  const navigate = useNavigate();
  const { session, loading, twoFactorPending } = useAuth();
  const { user } = useDemo();
  if (loading) return null;
  if (!session) return <Navigate to={`/login?next=${encodeURIComponent("/access")}`} replace/>;
  if (twoFactorPending) return <TwoFactorGate onCancelled={() => navigate("/login")}/>;
  if (user.deceasedAt || user.suspended) return <Navigate to="/dashboard" replace/>;
  return (
    <div className="size-full overflow-y-auto">
      <AccessPortal/>
    </div>
  );
}

function AppShell() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute/>}/>
      <Route path="/login" element={<UserLoginRoute/>}/>
      <Route path="/signup" element={<UserSignupRoute/>}/>
      <Route path="/r/:code" element={<Navigate to="/" replace/>}/>
      <Route path="/dashboard" element={<UserRoute/>}/>
      <Route path="/admin/login" element={<AdminLoginRoute/>}/>
      <Route path="/admin/accept" element={<AdminInviteRoute/>}/>
      <Route path="/admin" element={<AdminRoute/>}/>
      <Route path="/partner" element={<PartnerRoute/>}/>
      <Route path="/partner/onboard" element={<WhiteLabelOnboardRoute/>}/>
      <Route path="/concierge/login" element={<ConciergeLoginRoute/>}/>
      <Route path="/concierge" element={<ConciergeRoute/>}/>
      <Route path="/legacy-claim/:token" element={<LegacyClaimRoute/>}/>
      <Route path="/vault-reset/:token" element={<VaultResetRoute/>}/>
      <Route path="/reset-password" element={<ResetPasswordRoute/>}/>
      <Route path="/message/:token" element={<LovedOneMessageRoute/>}/>
      <Route path="/waiver/:token" element={<WaiverRoute/>}/>
      <Route path="/contact-accept/:token" element={<ContactAcceptRoute/>}/>
      <Route path="/access" element={<AccessRoute/>}/>
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
