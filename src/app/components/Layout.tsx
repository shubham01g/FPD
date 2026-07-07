import React, { useState, useRef, useEffect } from "react";
import {
  Home, Archive, Users, LogOut, Bell, BookOpen, Key, CreditCard,
  UserCheck, HardDrive, Heart, Stethoscope, FileText,
  Wallet, Car, Camera, Folder, TrendingUp, Copy,
  FolderOpen, Star, Shield, Settings, AlertCircle, MessageCircle,
  Briefcase, Plane, MapPin, Baby, ChevronDown
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_new_logo.png";
import { VaultClone } from "./VaultClone";
import { useDemo } from "../context/DemoContext";
import { Dock, DockIcon, DockItem, DockLabel } from "./ui/dock";

export type PageId =
  | "dashboard"
  | "file-cabinet"
  | "legacy-vault" | "storage-usage"
  | "final-wishes" | "wills-trusts" | "medical-info" | "financial-records"
  | "personal-assets" | "family-memories" | "organize"
  | "family-friends"
  | "contacts-legacy" | "contacts-guardian" | "contacts-emergency"
  | "affiliate" | "digital-diary" | "password-manager" | "subscription-manager"
  | "legacy-continuation" | "white-glove" | "waiver-sign" | "account-settings"
  | "fpd-ai"
  | "job-history" | "daycare-info" | "id-keeper" | "favorite-places" | "travel-planner" | "kids-activities"
  | "warranties";

const navGroups = [
  {
    label: "Overview",
    items: [
      { id: "dashboard" as PageId, label: "Dashboard", icon: <Home size={14}/> },
      { id: "fpd-ai" as PageId, label: "Ask FPD AI Assistant", icon: <MessageCircle size={14}/>, badge: "AI" },
    ],
  },
  {
    label: "Digital File Cabinet",
    items: [
      { id: "file-cabinet" as PageId, label: "File Cabinet", icon: <FolderOpen size={14}/>, highlight: true },
      { id: "legacy-vault" as PageId, label: "Legacy Vault", icon: <Archive size={14}/> },
      { id: "organize" as PageId, label: "Folders & Reminders", icon: <Folder size={14}/> },
    ],
  },
  {
    label: "Wishes & Trusts",
    items: [
      { id: "final-wishes" as PageId, label: "Final Wishes",           icon: <Heart size={14}/> },
      { id: "wills-trusts" as PageId, label: "Wills and Living Trusts", icon: <FileText size={14}/> },
    ],
  },
  {
    label: "Life Records",
    items: [
      { id: "medical-info" as PageId,       label: "Medical Info",         icon: <Stethoscope size={14}/> },
      { id: "financial-records" as PageId,  label: "Financial Records",    icon: <Wallet size={14}/> },
      { id: "personal-assets" as PageId,    label: "Assets & Property",    icon: <Car size={14}/> },
      { id: "family-memories" as PageId,    label: "Family & Memories",    icon: <Camera size={14}/> },
      { id: "digital-diary" as PageId,      label: "Digital Diary",        icon: <BookOpen size={14}/>, badge: "New" },
      { id: "job-history" as PageId,        label: "Job History",          icon: <Briefcase size={14}/> },
      { id: "id-keeper" as PageId,          label: "ID Keeper",            icon: <CreditCard size={14}/> },
      { id: "warranties" as PageId,         label: "Warranties",           icon: <Shield size={14}/> },
      { id: "travel-planner" as PageId,     label: "Travel Planner",       icon: <Plane size={14}/> },
      { id: "favorite-places" as PageId,    label: "Favorite Places",      icon: <MapPin size={14}/> },
    ],
  },
  {
    label: "Family Life",
    items: [
      { id: "daycare-info" as PageId,       label: "Daycare Information",  icon: <Baby size={14}/> },
      { id: "kids-activities" as PageId,    label: "Kids' Activities",     icon: <Star size={14}/> },
    ],
  },
  {
    label: "People",
    items: [
      { id: "family-friends" as PageId,    label: "Family & Friends",         icon: <Star size={14}/> },
      { id: "contacts-legacy" as PageId,   label: "Legacy Contacts",          icon: <Shield size={14}/> },
      { id: "contacts-guardian" as PageId, label: "Guardian Contacts",        icon: <UserCheck size={14}/> },
      { id: "contacts-emergency" as PageId,label: "Emergency Contacts",       icon: <AlertCircle size={14}/> },
    ],
  },
  {
    label: "Security",
    items: [
      { id: "account-settings" as PageId,     label: "Account & Profile",   icon: <Settings size={14}/> },
      { id: "password-manager" as PageId,     label: "Password Manager",    icon: <Key size={14}/> },
      { id: "subscription-manager" as PageId, label: "Auto Pay & Subs",     icon: <CreditCard size={14}/> },
      { id: "legacy-continuation" as PageId, label: "Activate Legacy Access", icon: <Shield size={14}/> },
    ],
  },
  {
    label: "Storage & Billing",
    items: [{ id: "storage-usage" as PageId, label: "Usage & Billing", icon: <HardDrive size={14}/> }],
  },
  {
    label: "Earn",
    items: [
      { id: "affiliate" as PageId, label: "Affiliate Program", icon: <TrendingUp size={14}/>, badge: "Earn 30%" },
    ],
  },
  {
    label: "Concierge",
    items: [
      { id: "white-glove" as PageId, label: "White Glove Service", icon: <Star size={14}/>, badge: "⭐" },
    ],
  },
];

/* Quick-access shortcuts pinned to the slim icon sidebar */
const quickIcons: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard",       label: "Dashboard",       icon: <Home className="h-full w-full"/> },
  { id: "file-cabinet",    label: "File Cabinet",    icon: <FolderOpen className="h-full w-full"/> },
  { id: "legacy-vault",    label: "Legacy Vault",    icon: <Archive className="h-full w-full"/> },
  { id: "storage-usage",   label: "Usage & Billing", icon: <HardDrive className="h-full w-full"/> },
  { id: "contacts-legacy", label: "Contacts",        icon: <Users className="h-full w-full"/> },
  { id: "fpd-ai",          label: "AI Assistant",    icon: <MessageCircle className="h-full w-full"/> },
];

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onGoAdmin?: () => void;
  onSignOut?: () => void;
  children: React.ReactNode;
}

/* ── Premium dark-blue palette — white-only fonts ── */
const BG      = "#0A0A0F";
const PANEL   = "#16161F";
const BORDER  = "rgba(108,92,231,0.2)";
const TEXT    = "#FFFFFF";
const MUTED   = "rgba(255,255,255,0.6)";
const HILITE  = "#A29BFE";
const ACCENT  = "#6C5CE7";
const ACCENT2 = "#8B7CF6";

export function Layout({ currentPage, onNavigate, onSignOut, children }: LayoutProps) {
  const [showClone, setShowClone] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const { unreadCount, user, markAllRead } = useDemo();
  const isActive = (id: PageId) => currentPage === id;
  const groupIsActive = (group: (typeof navGroups)[number]) => group.items.some(i => i.id === currentPage);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex overflow-hidden" style={{ background:BG, fontFamily:"var(--font-body)", height:"100vh" }}>
      {/* Slim icon sidebar */}
      <aside className="flex flex-col items-center flex-shrink-0 py-4"
        style={{ width:76, background:BG, borderRight:`1px solid ${BORDER}` }}>
        <img src={fpdSquareLogo} alt="FPD" style={{ width:34, height:34, borderRadius:9, objectFit:"cover", marginBottom:22, boxShadow:"0 0 16px rgba(108,92,231,0.35)" }}/>

        <Dock>
          {quickIcons.map(item => (
            <DockItem key={item.id} title={item.label} onClick={() => onNavigate(item.id)}
              className="rounded-2xl transition-colors"
              style={{
                background: isActive(item.id) ? `linear-gradient(135deg,${ACCENT},${ACCENT2})` : "rgba(108,92,231,0.15)",
                color: isActive(item.id) ? "#FFFFFF" : HILITE,
                boxShadow: isActive(item.id) ? "0 4px 16px rgba(108,92,231,0.5)" : "none",
              }}>
              <DockLabel>{item.label}</DockLabel>
              <DockIcon>{item.icon}</DockIcon>
            </DockItem>
          ))}
          <DockItem title="Legacy Vault Clone" onClick={() => setShowClone(true)}
            className="rounded-2xl transition-colors"
            style={{ background:"rgba(108,92,231,0.15)", color:HILITE }}>
            <DockLabel>Legacy Vault Clone</DockLabel>
            <DockIcon><Copy size={18}/></DockIcon>
          </DockItem>
          <DockItem title="Account Settings" onClick={() => onNavigate("account-settings" as PageId)}
            className="rounded-2xl transition-colors" style={{ background:"rgba(108,92,231,0.15)", color:HILITE }}>
            <DockLabel>Account Settings</DockLabel>
            <DockIcon><Settings className="h-full w-full"/></DockIcon>
          </DockItem>
          <DockItem title="Sign Out" onClick={onSignOut}
            className="rounded-2xl transition-colors" style={{ background:"rgba(108,92,231,0.15)", color:HILITE }}>
            <DockLabel>Sign Out</DockLabel>
            <DockIcon><LogOut className="h-full w-full"/></DockIcon>
          </DockItem>
        </Dock>

        <div className="flex flex-col items-center flex-1 justify-end">
          <div className="flex items-center justify-center rounded-full mt-1"
            style={{ width:38, height:38, background:"rgba(108,92,231,0.25)", color:HILITE, fontSize:12, fontWeight:700 }}>
            {user.avatar}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar — one tab per main category, each opening its own subcategory dropdown */}
        <header className="flex items-center justify-between gap-4 px-5 py-3 flex-shrink-0"
          style={{ background:BG, borderBottom:`1px solid ${BORDER}` }}>
          <div ref={navRef} className="flex items-center gap-1 flex-wrap" onMouseLeave={() => setOpenGroup(null)}>
            {navGroups.map(group => (
              <div key={group.label} className="relative" onMouseEnter={() => setOpenGroup(group.label)}>
                <button onClick={() => setOpenGroup(openGroup === group.label ? null : group.label)}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl whitespace-nowrap transition-all"
                  style={{
                    background: groupIsActive(group) || openGroup === group.label ? "rgba(108,92,231,0.22)" : "transparent",
                    color: TEXT, fontSize:12.5, fontWeight: groupIsActive(group) ? 700 : 500,
                  }}>
                  {group.label}
                  <ChevronDown size={12} style={{ transform: openGroup === group.label ? "rotate(180deg)" : "none", transition:"transform 0.15s", color:HILITE }}/>
                </button>

                {openGroup === group.label && (
                  <div className="absolute left-0 top-full mt-2 py-2 rounded-2xl z-50"
                    style={{ minWidth:240, background:PANEL, border:`1px solid ${BORDER}`, boxShadow:"0 20px 56px rgba(0,0,0,0.55)" }}>
                    {group.items.map(item => (
                      <button key={item.id} onClick={() => { onNavigate(item.id); setOpenGroup(null); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 transition-all text-left"
                        style={{
                          background: isActive(item.id) ? "rgba(108,92,231,0.22)" : "transparent",
                          color: TEXT,
                        }}>
                        <span style={{ flexShrink:0, color: isActive(item.id) ? HILITE : "inherit" }}>{item.icon}</span>
                        <span style={{ fontSize:13, flex:1 }}>{item.label}</span>
                        {(item as { badge?: string }).badge && (
                          <span style={{ fontSize:8.5, fontFamily:"var(--font-mono)", background:"rgba(108,92,231,0.25)", color:HILITE, padding:"1px 6px", borderRadius:99, fontWeight:700 }}>
                            {(item as { badge?: string }).badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div style={{ color:MUTED, fontSize:11, fontFamily:"var(--font-mono)", whiteSpace:"nowrap" }}>
              {new Date().toLocaleDateString("en-US",{ weekday:"short", month:"short", day:"numeric" })}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background:"rgba(72,187,120,0.1)", border:"1px solid rgba(72,187,120,0.25)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 6px #48BB78" }}/>
              <span style={{ color:"#48BB78", fontSize:10, fontFamily:"var(--font-mono)" }}>VAULT ACTIVE</span>
            </div>
            <button className="relative" onClick={markAllRead} style={{ color:MUTED }}>
              <Bell size={16}/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
                  style={{ width:14, height:14, background:"#E53E3E", color:"#fff", fontSize:8, fontWeight:700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto relative" style={{ background:BG }}>
          {children}
        </main>
      </div>

      {showClone && <VaultClone onClose={() => setShowClone(false)} mode="clone"/>}
    </div>
  );
}
