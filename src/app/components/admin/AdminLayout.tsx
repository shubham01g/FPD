import React, { useState } from "react";
import {
  Crown, Users, Handshake, DollarSign, Lock, Settings,
  Code, Mail, Layers, LogOut, Bell, Menu, X, BarChart3,
  Shield, ChevronDown, ChevronRight, UserCheck, Activity
} from "lucide-react";
import fpdSquareLogo from "../../../imports/FPD_mark_square.png";

export type AdminPageId =
  | "master-admin" | "admin-affiliate" | "admin-partnership"
  | "id-verification" | "payout-management" | "subscription-config"
  | "enterprise-api" | "email-templates" | "white-label"
  | "continuation-fee-admin" | "partner-onboarding-admin"
  | "white-glove-admin" | "crypto-merchant";

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
      { id: "master-admin", label: "Master Admin", icon: <BarChart3 size={14}/> },
    ],
  },
  {
    label: "Programs",
    items: [
      { id: "admin-affiliate",   label: "Affiliate Admin",   icon: <Users size={14}/> },
      { id: "admin-partnership", label: "Partnership Admin", icon: <Handshake size={14}/> },
      { id: "white-glove-admin", label: "White Glove",       icon: <Crown size={14}/>, badge: "⭐" },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "id-verification",     label: "ID Verification",   icon: <UserCheck size={14}/>, badge: "3" },
      { id: "payout-management",   label: "Payouts",           icon: <DollarSign size={14}/> },
      { id: "subscription-config", label: "Subscription Config", icon: <Settings size={14}/> },
    ],
  },
  {
    label: "Developer",
    items: [
      { id: "enterprise-api",          label: "Enterprise API",      icon: <Code size={14}/> },
      { id: "email-templates",         label: "Email Templates",     icon: <Mail size={14}/> },
      { id: "white-label",             label: "White Label",         icon: <Layers size={14}/> },
      { id: "continuation-fee-admin",  label: "$199 Legacy Fee",     icon: <Shield size={14}/> },
      { id: "partner-onboarding-admin",label: "WL Onboarding Control", icon: <Handshake size={14}/> },
      { id: "crypto-merchant",         label: "Crypto Payments",     icon: <span style={{fontSize:14,fontWeight:900,lineHeight:1}}>₿</span> },
    ],
  },
];

interface AdminLayoutProps {
  currentPage: AdminPageId;
  onNavigate: (page: AdminPageId) => void;
  onSignOut: () => void;
  children: React.ReactNode;
}

export function AdminLayout({ currentPage, onNavigate, onSignOut, children }: AdminLayoutProps) {
  const [open, setOpen] = useState(true);
  const isActive = (id: AdminPageId) => currentPage === id;

  const NavBtn = ({ item }: { item: AdminNavItem }) => (
    <button onClick={() => onNavigate(item.id)}
      className="w-full flex items-center gap-2.5 rounded-xl transition-all"
      style={{
        padding: open ? "7px 10px" : "9px",
        justifyContent: open ? "flex-start" : "center",
        background: isActive(item.id) ? "rgba(91,110,225,0.18)" : "transparent",
        color: isActive(item.id) ? "#FFFFFF" : "rgba(255,255,255,0.65)",
        borderLeft: isActive(item.id) ? "2px solid #5B6EE1" : "2px solid transparent",
        boxShadow: isActive(item.id) ? "inset 0 0 20px rgba(91,110,225,0.08)" : "none",
      }}>
      <span style={{ flexShrink:0, color: isActive(item.id) ? "#FFFFFF" : "inherit" }}>{item.icon}</span>
      {open && (
        <>
          <span style={{ fontSize:15, fontWeight: isActive(item.id) ? 600 : 400, color: isActive(item.id) ? "#FFFFFF" : "inherit", flex:1, textAlign:"left" }}>{item.label}</span>
          {item.badge && (
            <span style={{ fontSize:11, fontFamily:"var(--font-mono)", background:"rgba(229,62,62,0.18)", color:"#FC8181", padding:"1px 5px", borderRadius:99, fontWeight:700 }}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <div className="flex overflow-hidden" style={{ background:"#070A12", fontFamily:"var(--font-body)", height:"100vh" }}>
      {/* Admin sidebar – Royal Vault Blue */}
      <aside className="flex flex-col transition-all duration-300 flex-shrink-0"
        style={{ width: open ? 232 : 52, background:"rgba(10,10,15,0.98)", borderRight:"1px solid rgba(91,110,225,0.16)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-3 border-b" style={{ borderColor:"rgba(91,110,225,0.16)" }}>
          <img src={fpdSquareLogo} alt="FPD" style={{ width:32, height:32, borderRadius:7, objectFit:"contain", flexShrink:0, boxShadow:"0 0 16px rgba(91,110,225,0.35)" }}/>
          {open && (
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily:"var(--font-display)", color:"#6FAE8B", fontSize:12.5, fontWeight:700, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>ADMIN PORTAL</div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:9.5, letterSpacing:"0.15em", marginTop:1, fontFamily:"var(--font-mono)" }}>FINAL PASS DOWN · RESTRICTED</div>
            </div>
          )}
          <button onClick={() => setOpen(!open)} style={{ color:"rgba(255,255,255,0.35)", flexShrink:0 }}>
            {open ? <X size={13}/> : <Menu size={13}/>}
          </button>
        </div>

        {/* Admin badge */}
        {open && (
          <div className="mx-3 my-2 px-3 py-2 rounded-xl flex items-center gap-2"
            style={{ background:"rgba(91,110,225,0.12)", border:"1px solid rgba(91,110,225,0.3)" }}>
            <Crown size={13} color="#FFFFFF"/>
            <div>
              <div style={{ color:"#E8EDF5", fontSize:14, fontWeight:600 }}>Admin Session</div>
              <div style={{ color:"#6FAE8B", fontSize:11, fontFamily:"var(--font-mono)" }}>admin@finalpassdown.com</div>
            </div>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-3" style={{ scrollbarWidth:"none" }}>
          {adminGroups.map(group => (
            <div key={group.label}>
              {open && <div style={{ color:"rgba(255,255,255,0.38)", fontSize:10.5, letterSpacing:"0.14em", paddingLeft:8, paddingBottom:3, paddingTop:3, fontFamily:"var(--font-mono)" }}>{group.label.toUpperCase()}</div>}
              <div className="space-y-0.5">
                {group.items.map(item => <NavBtn key={item.id} item={item}/>)}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-3 border-t" style={{ borderColor:"rgba(91,110,225,0.16)" }}>
          <button onClick={onSignOut} className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 transition-all"
            style={{ color:"rgba(255,255,255,0.55)", justifyContent: open ? "flex-start" : "center", background:"rgba(229,62,62,0.06)" }}>
            <LogOut size={13}/>
            {open && <span style={{ fontSize:15 }}>Exit Admin Portal</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Admin top bar */}
        <header className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0"
          style={{ background:"rgba(10,10,15,0.98)", borderColor:"rgba(91,110,225,0.16)", backdropFilter:"blur(16px)" }}>
          <div className="flex items-center gap-3">
            <div style={{ color:"rgba(255,255,255,0.35)", fontSize:14, fontFamily:"var(--font-mono)" }}>
              {new Date().toLocaleDateString("en-US",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background:"rgba(91,110,225,0.12)", border:"1px solid rgba(91,110,225,0.3)" }}>
              <Activity size={10} color="#FFFFFF"/>
              <span style={{ color:"#6FAE8B", fontSize:11, fontFamily:"var(--font-mono)", fontWeight:700 }}>ADMIN SESSION ACTIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background:"rgba(229,62,62,0.08)", border:"1px solid rgba(229,62,62,0.2)" }}>
              <Shield size={11} color="#FC8181"/>
              <span style={{ color:"#FC8181", fontSize:12.5, fontFamily:"var(--font-mono)", fontWeight:700 }}>RESTRICTED ACCESS</span>
            </div>
            <button className="relative" style={{ color:"#8A9AB8" }}>
              <Bell size={15}/>
              <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
                style={{ width:13, height:13, background:"#E53E3E", color:"#fff", fontSize:10, fontWeight:700 }}>3</span>
            </button>
            <div className="flex items-center justify-center rounded-full"
              style={{ width:28, height:28, background:"rgba(91,110,225,0.18)", color:"#6FAE8B", fontSize:14, fontWeight:700 }}>A</div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto fpd-scroll" style={{ background:"#070A12" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
