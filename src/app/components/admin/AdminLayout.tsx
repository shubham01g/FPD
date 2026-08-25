import React, { useState } from "react";
import {
  Crown, Users, Handshake, DollarSign, Settings,
  Code, Mail, Layers, LogOut, Bell, BarChart3,
  Shield, ChevronRight, UserCheck, PanelLeft, PanelLeftClose
} from "lucide-react";
import fpdSquareLogo from "../../../imports/FPD_mark_square.png";
import fpdFullLogo from "../../../imports/FPD_full_logo.png";
import { AdminAIAgent } from "../AdminAIAgent";

export type AdminPageId =
  | "master-admin" | "admin-affiliate" | "admin-partnership"
  | "id-verification" | "payout-management" | "subscription-config"
  | "enterprise-api" | "email-templates" | "white-label"
  | "continuation-fee-admin" | "partner-onboarding-admin"
  | "white-glove-admin" | "crypto-merchant" | "admin-roles";

interface AdminNavItem {
  id: AdminPageId;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

const adminGroups: { label: string; items: AdminNavItem[] }[] = [
  {
    label: "Command Center",
    items: [
      { id: "master-admin", label: "Master Admin", icon: <BarChart3 size={16}/> },
      { id: "admin-roles",  label: "Admin Team & Roles", icon: <Shield size={16}/> },
    ],
  },
  {
    label: "Programs",
    items: [
      { id: "admin-affiliate",   label: "Affiliate Admin",   icon: <Users size={16}/> },
      { id: "admin-partnership", label: "Partnership Admin", icon: <Handshake size={16}/> },
      { id: "white-glove-admin", label: "White Glove",       icon: <Crown size={16}/> },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "id-verification",     label: "ID Verification",   icon: <UserCheck size={16}/>, badge: "3" },
      { id: "payout-management",   label: "Payouts",           icon: <DollarSign size={16}/> },
      { id: "subscription-config", label: "Subscription Config", icon: <Settings size={16}/> },
    ],
  },
  {
    label: "Developer",
    items: [
      { id: "enterprise-api",          label: "Enterprise API",      icon: <Code size={16}/> },
      { id: "email-templates",         label: "Email Templates",     icon: <Mail size={16}/> },
      { id: "white-label",             label: "White Label",         icon: <Layers size={16}/> },
      { id: "continuation-fee-admin",  label: "$199 Legacy Fee",     icon: <Shield size={16}/> },
      { id: "partner-onboarding-admin",label: "WL Onboarding Control", icon: <Handshake size={16}/> },
      { id: "crypto-merchant",         label: "Crypto Payments",     icon: <span style={{fontSize:15,fontWeight:900,lineHeight:1}}>₿</span> },
    ],
  },
];

/* Flattened lookup: page → { group, label } — powers the top-bar breadcrumb/title */
const pageMeta: Record<string, { group: string; label: string }> = {};
adminGroups.forEach(g => g.items.forEach(i => { pageMeta[i.id] = { group: g.label, label: i.label }; }));

/* ── Royal Vault Blue palette (matches the redesigned user dashboard sidebar/top bar) ── */
const BG       = "#070A12";
const SIDEBAR  = "linear-gradient(180deg,#0A1020 0%,#070A12 100%)";
const BORDER   = "rgba(91,110,225,0.18)";
const BORDER_S = "rgba(91,110,225,0.26)";
const TEXT     = "#FFFFFF";
const SOFT     = "#B8C8E0";
const MUTED    = "#8A9AB8";
const FAINT    = "#5A6A88";
const ACCENT   = "#5B6EE1";
const ACCENT2  = "#7E6BD8";
const DANGER   = "#FC8181";

interface AdminLayoutProps {
  currentPage: AdminPageId;
  onNavigate: (page: AdminPageId) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function AdminLayout({ currentPage, onNavigate, onSignOut, children }: AdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isActive = (id: AdminPageId) => currentPage === id;
  const meta = pageMeta[currentPage] ?? { group: "Command Center", label: "Master Admin" };
  const SIDEBAR_W = collapsed ? 74 : 250;

  const renderItem = (item: AdminNavItem) => {
    const active = isActive(item.id);
    return (
      <button key={item.id} onClick={() => onNavigate(item.id)}
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
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(91,110,225,0.12)"; }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
        <span style={{ flexShrink: 0, color: "#FFFFFF", display: "flex" }}>{item.icon}</span>
        {!collapsed && <span style={{ fontSize: 15.5, fontWeight: active ? 650 : 500, flex: 1, minWidth: 0, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>}
        {!collapsed && item.badge && (
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", flexShrink: 0,
            background: active ? "rgba(255,255,255,0.22)" : "rgba(229,62,62,0.2)",
            color: active ? "#FFFFFF" : DANGER, padding: "2px 6px", borderRadius: 99,
          }}>{item.badge}</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex overflow-hidden" style={{ background: BG, fontFamily: "var(--font-body)", height: "100vh" }}>
      {/* Sidebar */}
      <aside className="flex flex-col flex-shrink-0" style={{
        width: SIDEBAR_W, background: SIDEBAR, borderRight: `1px solid ${BORDER}`,
        transition: "width 0.22s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Brand */}
        <div className="flex flex-shrink-0" style={{
          height: 64, padding: collapsed ? 0 : "0 16px",
          alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: `1px solid ${BORDER}`,
        }}>
          {collapsed ? (
            <div style={{
              width: 42, height: 42, borderRadius: 11, flexShrink: 0,
              background: "rgba(91,110,225,0.14)", border: `1px solid ${BORDER}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(91,110,225,0.35)",
            }}>
              <img src={fpdSquareLogo} alt="Final Pass Down" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 10 }}/>
            </div>
          ) : (
            <div style={{ overflow: "hidden" }}>
              <img src={fpdFullLogo} alt="Final Pass Down — My Life, My Wishes, My Way"
                style={{ height: 42, width: 64, flexShrink: 0, objectFit: "contain", display: "block", borderRadius: 7, filter: "drop-shadow(0 0 14px rgba(91,110,225,0.35))" }}/>
              <div style={{ fontSize: 11.5, color: FAINT, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", whiteSpace: "nowrap", marginTop: 4, paddingLeft: 2 }}>
                ADMIN PORTAL · RESTRICTED
              </div>
            </div>
          )}
        </div>

        {/* Admin session card */}
        {!collapsed && (
          <div className="flex-shrink-0" style={{ padding: "12px 12px 6px" }}>
            <div className="flex items-center gap-2.5 rounded-xl" style={{ padding: "9px 11px", background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}` }}>
              <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 32, height: 32, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff" }}>
                <Crown size={14}/>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 650, color: TEXT }}>Admin Session</div>
                <div style={{ fontSize: 12.5, color: "#6FAE8B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>admin@finalpassdown.com</div>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto fpd-scroll" style={{ padding: collapsed ? "8px 12px" : "6px 12px 12px" }}>
          {adminGroups.map(group => (
            <div key={group.label} style={{ marginBottom: collapsed ? 6 : 14 }}>
              {!collapsed && (
                <div style={{ fontSize: 13, fontWeight: 600, color: FAINT, padding: "0 11px 8px" }}>
                  {group.label}
                </div>
              )}
              <div className="flex flex-col" style={{ gap: 2 }}>
                {group.items.map(renderItem)}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — sign out */}
        <div className="flex-shrink-0" style={{ borderTop: `1px solid ${BORDER}`, padding: collapsed ? "10px 12px" : "12px" }}>
          <button onClick={onSignOut} title={collapsed ? "Exit Admin Portal" : undefined}
            className="w-full flex items-center rounded-xl transition-all"
            style={{
              gap: collapsed ? 0 : 10, justifyContent: collapsed ? "center" : "flex-start",
              padding: collapsed ? "10px 0" : "9px 11px",
              background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.2)", color: DANGER,
            }}>
            <LogOut size={15}/>
            {!collapsed && <span style={{ fontSize: 15 }}>Exit Admin Portal</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 flex-shrink-0" style={{
          height: 64, padding: "0 22px", background: "rgba(7,10,18,0.82)",
          borderBottom: `1px solid ${BORDER}`, backdropFilter: "blur(12px)",
        }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setCollapsed(c => !c)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ width: 34, height: 34, background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}`, color: "#6FAE8B" }}>
              {collapsed ? <PanelLeft size={16}/> : <PanelLeftClose size={16}/>}
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1.5" style={{ fontSize: 14, color: FAINT }}>
                <span>{meta.group}</span><ChevronRight size={10}/><span style={{ color: "#6FAE8B" }}>{meta.label}</span>
              </div>
              <h1 style={{ fontSize: 21, fontWeight: 600, color: TEXT, lineHeight: 1.2, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.label}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="hidden md:block" style={{ color: MUTED, fontSize: 14.5, whiteSpace: "nowrap" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.25)" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: DANGER, boxShadow: `0 0 6px ${DANGER}` }}/>
              <span style={{ color: DANGER, fontSize: 13.5, fontWeight: 600 }}>Restricted Access</span>
            </div>
            <button className="relative flex items-center justify-center rounded-lg" style={{ width: 34, height: 34, background: "rgba(91,110,225,0.1)", border: `1px solid ${BORDER}`, color: "#6FAE8B" }}>
              <Bell size={16}/>
              <span className="absolute flex items-center justify-center rounded-full" style={{ top: -5, right: -5, minWidth: 16, height: 16, padding: "0 4px", background: "#E53E3E", color: "#fff", fontSize: 11, fontWeight: 700, border: `2px solid ${BG}` }}>3</span>
            </button>
            <div className="flex items-center justify-center rounded-full" style={{ width: 34, height: 34, background: `linear-gradient(135deg,${ACCENT},${ACCENT2})`, color: "#fff", fontSize: 14.5, fontWeight: 700 }}>A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto fpd-scroll" style={{ background: BG }}>
          {children}
        </main>
      </div>

      <AdminAIAgent/>
    </div>
  );
}