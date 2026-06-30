import React, { useState } from "react";
import {
  Home, Archive, Users, LogOut, Bell, BookOpen, Key, CreditCard,
  Menu, X, UserCheck, HardDrive, Heart, Stethoscope, FileText,
  Wallet, Car, Camera, Folder, TrendingUp, Copy,
  FolderOpen, Star, Shield, Settings, AlertCircle, PawPrint, MessageCircle,
  Briefcase, Plane, MapPin, Baby
} from "lucide-react";
import fpdSquareLogo from "../../imports/FPD_new_logo.png";
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
  | "legacy-continuation" | "white-glove" | "waiver-sign" | "account-settings"
  | "fpd-ai"
  | "job-history" | "daycare-info" | "id-keeper" | "favorite-places" | "travel-planner" | "kids-activities"
  | "warranties";

const navGroups = [
  {
    label: "Overview",
    items: [{ id: "dashboard" as PageId, label: "Dashboard", icon: <Home size={14}/> }],
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
  {
    label: "AI Assistant",
    items: [
      { id: "fpd-ai" as PageId, label: "Ask FPD AI Assistant", icon: <MessageCircle size={14}/>, badge: "AI" },
    ],
  },
];

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  onGoAdmin?: () => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [open, setOpen] = useState(true);
  const [showClone, setShowClone] = useState(false);
  const { unreadCount, user, markAllRead } = useDemo();
  const isActive = (id: PageId) => currentPage === id;

  const NavBtn = ({ item }: { item: (typeof navGroups)[0]["items"][0] & { badge?: string; highlight?: boolean } }) => (
    <button onClick={() => onNavigate(item.id)}
      className="w-full flex items-center gap-2.5 rounded-xl transition-all"
      style={{
        padding: open ? "7px 10px" : "9px",
        justifyContent: open ? "flex-start" : "center",
        background: isActive(item.id)
          ? item.highlight ? "rgba(32,64,192,0.15)" : "rgba(32,64,192,0.1)"
          : "transparent",
        color: isActive(item.id) ? "#FFFFFF" : "#B0C0DC",
        borderLeft: isActive(item.id) ? "2px solid #2040C0" : "2px solid transparent",
      }}>
      <span style={{ flexShrink:0, color: isActive(item.id) ? "#6090FF" : "inherit" }}>{item.icon}</span>
      {open && (
        <>
          <span style={{ fontSize:12, fontWeight: isActive(item.id) ? 600 : 400, color: isActive(item.id) ? "#E8EDF5" : "#B0C0DC", flex:1, textAlign:"left" }}>{item.label}</span>
          {item.badge && (
            <span style={{ fontSize:9, fontFamily:"var(--font-mono)", background:"rgba(32,64,192,0.25)", color:"#6090FF", padding:"1px 6px", borderRadius:99, fontWeight:700 }}>
              {item.badge}
            </span>
          )}
        </>
      )}
    </button>
  );

  return (
    <div className="flex overflow-hidden" style={{ background:"#F0F4FA", fontFamily:"var(--font-body)", height:"100vh" }}>
      {/* Dark navy sidebar */}
      <aside className="flex flex-col transition-all duration-300 flex-shrink-0"
        style={{ width: open ? 232 : 52, background:"#0A1428", borderRight:"1px solid rgba(32,64,192,0.12)" }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 py-3 border-b" style={{ borderColor:"rgba(32,64,192,0.15)" }}>
          <img src={fpdSquareLogo} alt="FPD" style={{ width:32, height:32, borderRadius:7, objectFit:"cover", flexShrink:0, boxShadow:"0 0 16px rgba(32,64,192,0.3)" }}/>
          {open && (
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily:"var(--font-display)", color:"#6090FF", fontSize:10, fontWeight:700, letterSpacing:"0.06em", whiteSpace:"nowrap" }}>FINAL PASS DOWN</div>
              <div style={{ color:"#4A5A7A", fontSize:7.5, letterSpacing:"0.15em", marginTop:1 }}>MY LIFE · MY WISHES · MY WAY</div>
            </div>
          )}
          <button onClick={() => setOpen(!open)} style={{ color:"#4A5A7A", flexShrink:0 }}>
            {open ? <X size={13}/> : <Menu size={13}/>}
          </button>
        </div>

        {/* User pill + settings shortcut */}
        {open && (
          <div className="px-3 py-2 border-b" style={{ borderColor:"rgba(32,64,192,0.1)" }}>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center rounded-full flex-shrink-0"
                style={{ width:28, height:28, background:"rgba(32,64,192,0.2)", color:"#6090FF", fontSize:11, fontWeight:700 }}>{user.avatar}</div>
              <div className="min-w-0 flex-1">
                <div style={{ color:"#E8EDF5", fontSize:11.5, fontWeight:500 }}>{user.name}</div>
                <div style={{ color:"#6090FF", fontSize:8.5, fontFamily:"var(--font-mono)" }}>{user.plan.replace("_"," ").toUpperCase()} PLAN</div>
              </div>
              <button onClick={() => onNavigate("account-settings" as PageId)}
                title="Account Settings"
                style={{ color:"#4A5A7A", flexShrink:0, padding:4, borderRadius:8 }}
                className="hover:bg-white/5 transition-colors">
                <Settings size={13}/>
              </button>
            </div>
          </div>
        )}

        {/* ═══ LEGACY VAULT CLONE — always visible ═══ */}
        <div className="px-3 py-2 border-b" style={{ borderColor:"rgba(32,64,192,0.12)" }}>
          <button onClick={() => setShowClone(true)}
            className="w-full flex items-center rounded-xl transition-all"
            style={{
              padding: open ? "10px 14px" : "10px",
              justifyContent: open ? "flex-start" : "center",
              background:"linear-gradient(135deg,#2040C0,#3355E0)",
              color:"#fff", gap:open?10:0,
              boxShadow:"0 4px 16px rgba(32,64,192,0.4)",
            }}>
            <Copy size={15}/>
            {open && (
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.03em" }}>LEGACY VAULT CLONE</span>
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-2.5" style={{ scrollbarWidth:"none" }}>
          {navGroups.map(group => (
            <div key={group.label}>
              {open && <div style={{ color:"#2A3A5A", fontSize:8.5, letterSpacing:"0.14em", paddingLeft:8, paddingBottom:3, paddingTop:3, fontFamily:"var(--font-mono)" }}>{group.label.toUpperCase()}</div>}
              <div className="space-y-0.5">
                {group.items.map(item => <NavBtn key={item.id} item={item}/>)}
              </div>
            </div>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-2 py-2 border-t" style={{ borderColor:"rgba(32,64,192,0.1)" }}>
          <button className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2"
            style={{ color:"#4A5A7A", justifyContent: open ? "flex-start" : "center" }}>
            <LogOut size={13}/>
            {open && <span style={{ fontSize:12 }}>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0"
          style={{ background:"rgba(255,255,255,0.98)", borderColor:"rgba(32,64,192,0.1)", backdropFilter:"blur(16px)" }}>
          <div style={{ color:"#8A9AB8", fontSize:11, fontFamily:"var(--font-mono)" }}>
            {new Date().toLocaleDateString("en-US",{ weekday:"long", year:"numeric", month:"long", day:"numeric" })}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ background:"rgba(72,187,120,0.08)", border:"1px solid rgba(72,187,120,0.2)" }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:"#48BB78", boxShadow:"0 0 6px #48BB78" }}/>
              <span style={{ color:"#48BB78", fontSize:10, fontFamily:"var(--font-mono)" }}>VAULT ACTIVE</span>
            </div>
            <button className="relative" onClick={markAllRead} style={{ color:"#8A9AB8" }}>
              <Bell size={15}/>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center rounded-full"
                  style={{ width:14, height:14, background:"#E53E3E", color:"#fff", fontSize:8, fontWeight:700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="flex items-center justify-center rounded-full"
              style={{ width:28, height:28, background:"rgba(32,64,192,0.12)", color:"#2040C0", fontSize:11, fontWeight:700 }}>{user.avatar}</div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto relative" style={{ background:"#F0F4FA" }}>
          {children}
        </main>
      </div>

      {showClone && <VaultClone onClose={() => setShowClone(false)} mode="clone"/>}
    </div>
  );
}
