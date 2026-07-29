import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Home, Archive, Users, LogOut, Bell, BookOpen, Key, CreditCard,
  UserCheck, HardDrive, Heart, Stethoscope, FileText,
  Wallet, Car, Camera, Folder, TrendingUp, Copy,
  FolderOpen, Star, Shield, Settings, AlertCircle, MessageCircle,
  Briefcase, Plane, MapPin, Baby, Search, PanelLeftClose, PanelLeft,
  ShieldCheck, ChevronRight, X, Menu, Layers, CalendarDays, Activity, Zap, PawPrint
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_mark_square.png";
import { useWLEntitlement } from "../context/WLEntitlementContext";
import { VaultClone } from "./VaultClone";
import { useDemo } from "../context/DemoContext";

export type PageId =
  | "dashboard"
  | "file-cabinet"
  | "legacy-vault" | "storage-usage"
  | "final-wishes" | "wills-trusts" | "medical-info" | "financial-records"
  | "personal-assets" | "family-memories" | "organize"
  | "family-friends"
  | "contacts-legacy" | "contacts-guardian" | "contacts-emergency"
  | "affiliate" | "digital-diary" | "password-manager" | "subscription-manager"
  | "calendar" | "messages-loved-ones" | "vital-clone"
  | "legacy-continuation" | "white-glove" | "white-label" | "waiver-sign" | "account-settings"
  | "fpd-ai"
  | "job-history" | "daycare-info" | "id-keeper" | "favorite-places" | "travel-planner" | "kids-activities"
  | "warranties" | "utilities" | "pet-records";

type NavItem = { id: PageId; label: string; icon: React.ReactNode; badge?: string; highlight?: boolean };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <Home size={16}/> },
      { id: "calendar", label: "Calendar", icon: <CalendarDays size={16}/> },
      { id: "fpd-ai", label: "Ask Carlos", icon: <MessageCircle size={16}/> },
    ],
  },
  {
    label: "Digital File Cabinet",
    items: [
      { id: "file-cabinet", label: "File Cabinet", icon: <FolderOpen size={16}/>, highlight: true },
      { id: "legacy-vault", label: "Legacy Vault", icon: <Archive size={16}/> },
      { id: "organize", label: "Folders & Reminders", icon: <Folder size={16}/> },
    ],
  },
  {
    label: "Wishes & Trusts",
    items: [
      { id: "final-wishes", label: "Final Wishes",            icon: <Heart size={16}/> },
      { id: "wills-trusts", label: "Wills and Living Trusts",  icon: <FileText size={16}/> },
    ],
  },
  {
    label: "Life Records",
    items: [
      { id: "medical-info",      label: "Medical Info",       icon: <Stethoscope size={16}/> },
      { id: "financial-records", label: "Financial Records",  icon: <Wallet size={16}/> },
      { id: "personal-assets",   label: "Assets & Property",  icon: <Car size={16}/> },
      { id: "utilities",         label: "Utilities",          icon: <Zap size={16}/> },
      { id: "family-memories",   label: "Family & Memories",  icon: <Camera size={16}/> },
      { id: "pet-records",       label: "Pet Records",        icon: <PawPrint size={16}/> },
      { id: "messages-loved-ones", label: "Messages to Loved Ones", icon: <Heart size={16}/>, badge: "New" },
      { id: "digital-diary",     label: "Digital Diary",      icon: <BookOpen size={16}/> },
      { id: "job-history",       label: "Job History",        icon: <Briefcase size={16}/> },
      { id: "id-keeper",         label: "ID Keeper",          icon: <CreditCard size={16}/> },
      { id: "warranties",        label: "Warranties",         icon: <Shield size={16}/> },
      { id: "travel-planner",    label: "Travel Planner",     icon: <Plane size={16}/> },
      { id: "favorite-places",   label: "Favorite Places",    icon: <MapPin size={16}/> },
    ],
  },
  {
    label: "Family Life",
    items: [
      { id: "daycare-info",    label: "Daycare Information", icon: <Baby size={16}/> },
      { id: "kids-activities", label: "Kids' Activities",    icon: <Star size={16}/> },
    ],
  },
  {
    label: "People & Contacts",
    items: [
      { id: "family-friends",     label: "Family & Friends",   icon: <Users size={16}/> },
      { id: "contacts-legacy",    label: "Legacy Contacts",    icon: <ShieldCheck size={16}/> },
      { id: "contacts-guardian",  label: "Guardian Contacts",  icon: <UserCheck size={16}/> },
      { id: "contacts-emergency", label: "Emergency Contacts", icon: <AlertCircle size={16}/> },
    ],
  },
  {
    label: "Security & Account",
    items: [
      { id: "password-manager",     label: "Password Manager",       icon: <Key size={16}/> },
      { id: "subscription-manager", label: "Auto Pay & Subs",        icon: <CreditCard size={16}/> },
      { id: "legacy-continuation",  label: "Activate Legacy Access", icon: <Shield size={16}/> },
    ],
  },
  {
    label: "Billing & Earn",
    items: [
      { id: "account-settings", label: "Account & Profile",  icon: <Settings size={16}/> },
      { id: "storage-usage", label: "Usage & Billing",   icon: <HardDrive size={16}/> },
      { id: "affiliate",     label: "Affiliate Program", icon: <TrendingUp size={16}/>, badge: "30%" },
      { id: "white-glove",   label: "White Glove Service", icon: <Star size={16}/> },
      { id: "white-label",   label: "White Label", icon: <Layers size={16}/>, badge: "Partner" },
      { id: "vital-clone",   label: "Vital Clone", icon: <Activity size={16}/> },
    ],
  },
];

/* Flattened lookup: page → { group, item } — powers the top-bar title/eyebrow */
const pageMeta: Record<string, { group: string; label: string }> = {};
navGroups.forEach(g => g.items.forEach(i => { pageMeta[i.id] = { group: g.label, label: i.label }; }));
pageMeta["waiver-sign"] = { group: "Concierge", label: "Sign Authorization Waiver" };

/* ── Royal Vault Blue palette (logo-matched) ── */
const BG       = "#070A12";
const SIDEBAR   = "linear-gradient(180deg,#0A1020 0%,#070A12 100%)";
const PANEL    = "#101728";
const BORDER   = "rgba(91,110,225,0.18)";
const BORDER_S = "rgba(91,110,225,0.26)";
const TEXT     = "#FFFFFF";
const SOFT     = "#B8C8E0";
const MUTED    = "#8A9AB8";
const FAINT    = "#5A6A88";
const HILITE   = "#5BA7D6";
const ACCENT   = "#5B6EE1";
const ACCENT2  = "#7E6BD8";
const SUCCESS  = "#48BB78";

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter", foundation: "Foundation", family_archive: "Legacy Archive",
  legacy_pro: "Legacy Pro", legacy_vault: "Legacy Vault",
};

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onGoAdmin?: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, onGoAdmin, onSignOut, children }: LayoutProps) {
  const { isEntitled: wlEntitled } = useWLEntitlement();
  const [showClone, setShowClone] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const { unreadCount, user, notifications, markAllRead, markNotifRead } = useDemo();

  const isActive = (id: PageId) => currentPage === id;
  /* Navigate + auto-close the drawer on mobile */
  const go = (id: PageId) => { onNavigate(id); if (isMobile) setMobileOpen(false); };
  const meta = pageMeta[currentPage] ?? { group: "Overview", label: "Dashboard" };
  const storagePct = Math.min(100, Math.round((user.storageUsed / user.storageLimit) * 100));

  /* White Label is always visible so clients can see what they'd get, but it
     carries a lock badge until the partner package is paid for. */
  const visibleGroups = useMemo(() => {
    if (wlEntitled) return navGroups;
    return navGroups.map(g => ({
      ...g,
      items: g.items.map(i => i.id === "white-label" ? { ...i, badge: "Locked" } : i),
    }));
  }, [wlEntitled]);

  /* Filter nav by search query */
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleGroups;
    return visibleGroups
      .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }, [query, visibleGroups]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /* Responsive: below 1024px the sidebar becomes an off-canvas drawer */
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 1024;
      setIsMobile(m);
      if (m) setCollapsed(false); // drawer always shows full labels
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const SIDEBAR_W = collapsed ? 74 : 264;

  /* ── Single nav item renderer (shared by expanded + collapsed) ── */
  const renderItem = (item: NavItem) => {
    const active = isActive(item.id);
    return (
      <button key={item.id} onClick={() => go(item.id)}
        title={collapsed ? item.label : undefined}
        className="group w-full flex items-center rounded-xl transition-all"
        style={{
          gap: collapsed ? 0 : 11,
          justifyContent: collapsed ? "center" : "flex-start",
          padding: collapsed ? "10px 0" : "8.5px 11px",
          background: active ? `linear-gradient(135deg, rgba(91,110,225,0.95), rgba(91,110,225,0.72))` : "transparent",
          color: active ? TEXT : SOFT,
          boxShadow: active ? "0 6px 18px -6px rgba(91,110,225,0.7)" : "none",
          border: active ? `1px solid ${BORDER_S}` : "1px solid transparent",
          position: "relative",
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(91,110,225,0.12)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ flexShrink: 0, color: "#FFFFFF", display: "flex" }}>{item.icon}</span>
        {!collapsed && <span style={{ fontSize: 16, fontWeight: active ? 650 : 500, flex: 1, minWidth: 0, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
        {!collapsed && item.badge && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", flexShrink: 0,
            background: active ? "rgba(255,255,255,0.22)" : "rgba(91,110,225,0.25)",
            color: active ? "#FFFFFF" : "#6FAE8B", padding: "2px 6px", borderRadius: 99,
          }}>{item.badge}</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex overflow-hidden" style={{ background: BG, fontFamily: "var(--font-body)", height: "100vh" }}>
      {/* Mobile drawer backdrop */}
      {isMobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(3,6,12,0.6)", backdropFilter: "blur(2px)", zIndex: 65 }}/>
      )}

      {/* ───────── Sidebar ───────── */}
      <aside className="flex flex-col flex-shrink-0" style={{
        width: SIDEBAR_W, background: SIDEBAR, borderRight: `1px solid ${BORDER}`,
        transition: "width 0.22s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1)",
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 70,
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          boxShadow: mobileOpen ? "8px 0 60px rgba(0,0,0,0.6)" : "none",
        } : {}),
      }}>
        {/* Brand */}
        <div className="flex flex-shrink-0" style={{
          height: 64, padding: collapsed ? 0 : "0 16px",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          {collapsed ? (
            /* Collapsed rail — whole logo in a square, never cropped/distorted */
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: "rgba(91,110,225,0.14)", border: `1px solid ${BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(91,110,225,0.35)",
            }}>
              <img src={fpdSquareLogo} alt="Final Pass Down"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }}/>
            </div>
          ) : (
            /* Expanded — the full logo lockup (already contains the wordmark) + tagline */
            <div style={{ overflow: "hidden" }}>
              <img src={fpdSquareLogo} alt="Final Pass Down"
                style={{ height: 38, width: "auto", maxWidth: "100%", objectFit: "contain", display: "block", filter: "drop-shadow(0 0 14px rgba(91,110,225,0.35))" }}/>
              <div style={{ fontSize: 12, color: FAINT, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", whiteSpace: "nowrap", marginTop: 3, paddingLeft: 2 }}>
                MY LIFE · MY WISHES · MY WAY
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="flex-shrink-0" style={{ padding: "12px 12px 6px" }}>
            <div className="flex items-center gap-2" style={{
              background: "rgba(91,110,225,0.08)", border: `1px solid ${BORDER}`,
              borderRadius: 10, padding: "0 10px", height: 36,
            }}>
              <Search size={14} style={{ color: MUTED, flexShrink: 0 }}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search sections…"
                style={{ background: "transparent", border: "none", outline: "none", color: TEXT, fontSize: 15.5, width: "100%", fontFamily: "var(--font-body)" }}/>
              {query && <button onClick={() => setQuery("")} style={{ color: MUTED, display: "flex" }}><X size={13}/></button>}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto fpd-scroll" style={{ padding: collapsed ? "8px 12px" : "6px 12px 12px" }}>
          {filteredGroups.map(group => (
            <div key={group.label} style={{ marginBottom: collapsed ? 6 : 14 }}>
              {!collapsed && (
                <div style={{ fontSize: 14, fontWeight: 600, color: FAINT, padding: "0 11px 8px" }}>
                  {group.label}
                </div>
              )}
              <div className="flex flex-col" style={{ gap: 2 }}>
                {group.items.map(renderItem)}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <div style={{ color: MUTED, fontSize: 15, textAlign: "center", padding: "24px 8px" }}>
              No sections match “{query}”.
            </div>
          )}
        </nav>

        {/* Footer — Vault Clone + user card */}
        <div className="flex-shrink-0" style={{ borderTop: `1px solid ${BORDER}`, padding: collapsed ? "10px 12px" : "12px" }}>
          <button onClick={() => setShowClone(true)} title={collapsed ? "Legacy Vault Export" : undefined}
            className="w-full flex items-center rounded-xl transition-all"
            style={{
              gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "10px 0" : "9px 11px", marginBottom: 8,
              background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}`, color: SOFT,
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(91,110,225,0.2)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(91,110,225,0.1)"}>
            <Copy size={16} style={{ color: "#6FAE8B", flexShrink: 0 }}/>
            {!collapsed && <span style={{ fontSize: 15.5, fontWeight: 600 }}>Legacy Vault Export</span>}
          </button>

          {collapsed ? (
            <button onClick={() => onNavigate("account-settings")} title={`${user.name} · Account`}
              className="w-full flex justify-center">
              <div className="flex items-center justify-center rounded-full" style={{ width: 36, height: 36, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontSize: 15, fontWeight: 700 }}>
                {user.avatar}
              </div>
            </button>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl" style={{ padding: "8px 9px", background: "rgba(91,110,225,0.07)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 34, height: 34, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontSize: 15, fontWeight: 700 }}>
                {user.avatar}
              </div>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>
                <div style={{ fontSize: 15.5, fontWeight: 650, color: TEXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                <div style={{ fontSize: 14, color: "#6FAE8B" }}>{PLAN_LABEL[user.plan] ?? user.plan}</div>
              </div>
              <button onClick={onSignOut} title="Sign out" style={{ color: MUTED, display: "flex", flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = "#FC8181"} onMouseLeave={e => e.currentTarget.style.color = MUTED}>
                <LogOut size={15}/>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───────── Main ───────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 flex-shrink-0" style={{
          height: 64, padding: "0 22px", background: "rgba(7,10,18,0.82)",
          borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)",
        }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => isMobile ? setMobileOpen(o => !o) : setCollapsed(c => !c)}
              title={isMobile ? "Menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 34, height: 34, background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}`, color: "#6FAE8B" }}>
              {isMobile ? <Menu size={16}/> : collapsed ? <PanelLeft size={16}/> : <PanelLeftClose size={16}/>}
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: 14.5, color: FAINT }}>
                <span>{meta.group}</span><ChevronRight size={10}/><span style={{ color: "#6FAE8B" }}>{meta.label}</span>
              </div>
              <h1 style={{ fontSize: 22.5, fontWeight: 600, color: TEXT, lineHeight: 1.2, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="hidden md:block" style={{ color: MUTED, fontSize: 15, whiteSpace: "nowrap" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(72,187,120,0.1)", border: "1px solid rgba(72,187,120,0.25)" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: SUCCESS, boxShadow: `0 0 6px ${SUCCESS}` }}/>
              <span style={{ color: "#D99A6B", fontSize: 14.5, fontWeight: 600 }}>Vault Active</span>
            </div>

            {onGoAdmin && (
              <button onClick={onGoAdmin} title="Admin portal"
                className="flex items-center justify-center rounded-lg"
                style={{ width: 34, height: 34, background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}`, color: "#6FAE8B" }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(91,110,225,0.2)"} onMouseLeave={e => e.currentTarget.style.background = "rgba(91,110,225,0.1)"}>
                <ShieldCheck size={16}/>
              </button>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen(o => !o)} className="relative flex items-center justify-center rounded-lg"
                style={{ width: 34, height: 34, background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}`, color: "#6FAE8B" }}>
                <Bell size={16}/>
                {unreadCount > 0 && (
                  <span className="absolute flex items-center justify-center rounded-full" style={{ top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px", background: "#E53E3E", color: "#fff", fontSize: 11, fontWeight: 700, border: `2px solid ${BG}` }}>
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute rounded-2xl fpd-fade-in-up" style={{ top: "calc(100% + 10px)", right: 0, width: 340, background: PANEL, border: `1px solid ${BORDER_S}`, boxShadow: "0 24px 60px rgba(0,0,0,0.6)", zIndex: 60, overflow: "hidden" }}>
                  <div className="flex items-center justify-between" style={{ padding: "13px 15px", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>Notifications</span>
                    {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: 14, color: "#6FAE8B", fontWeight: 600 }}>Mark all read</button>}
                  </div>
                  <div className="fpd-scroll" style={{ maxHeight: 360, overflowY: "auto" }}>
                    {notifications.length === 0 && <div style={{ padding: 24, textAlign: "center", color: MUTED, fontSize: 15 }}>You're all caught up.</div>}
                    {notifications.slice(0, 12).map(n => (
                      <button key={n.id} onClick={() => markNotifRead(n.id)} className="w-full flex gap-2.5 text-left transition-colors"
                        style={{ padding: "11px 15px", borderBottom: `1px solid ${BORDER}`, background: n.read ? "transparent" : "rgba(91,110,225,0.06)" }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(91,110,225,0.12)"}
                        onMouseLeave={e => e.currentTarget.style.background = n.read ? "transparent" : "rgba(91,110,225,0.06)"}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: n.read ? "transparent" : ACCENT2 }}/>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15.5, fontWeight: 600, color: TEXT }}>{n.title}</div>
                          <div style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.45, marginTop: 1 }}>{n.message}</div>
                          <div style={{ fontSize: 12.5, color: FAINT, fontFamily: "var(--font-mono)", marginTop: 3 }}>{n.time}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Storage pill */}
            <button onClick={() => onNavigate("storage-usage")} title="Usage & Billing"
              className="hidden lg:flex items-center gap-2 rounded-lg" style={{ padding: "6px 11px", background: "rgba(91,110,225,0.08)", border: `1px solid ${BORDER}` }}>
              <HardDrive size={14} style={{ color: storagePct >= 90 ? "#F6AD55" : "#6FAE8B" }}/>
              <div style={{ width: 64 }}>
                <div style={{ height: 4, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${storagePct}%`, borderRadius: 99, background: storagePct >= 90 ? "linear-gradient(90deg,#5B6EE1,#F6AD55)" : `linear-gradient(90deg,${ACCENT},${ACCENT2})` }}/>
                </div>
              </div>
              <span style={{ fontSize: 14.5, color: SOFT, whiteSpace: "nowrap" }}>{storagePct}%</span>
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto fpd-scroll relative" style={{ background: BG }}>
          {children}
        </main>
      </div>

      {showClone && <VaultClone onClose={() => setShowClone(false)} mode="clone"/>}
    </div>
  );
}
