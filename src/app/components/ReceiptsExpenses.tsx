import React, { useState } from "react";
import {
  Camera, FolderOpen, ChevronRight, Download, Mail, CheckCircle, AlertCircle, X,
  Calendar, DollarSign, Building2, FileText, Tag, Folder, Search, Eye, Trash2,
  User, Briefcase, Cpu, Send, Package, ArrowLeft, ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentScanner, type ScannedDocument } from "./DocumentScanner";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, file cabinet, financial records & disaster recovery) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

/* Validated categorical set (node scripts/validate_palette.js, --mode dark --surface #101728 — all checks pass).
   Category identity is always carried by the text label beside it; these hues are a secondary cue, not the
   sole channel, so low-frequency categories fold to the neutral OTHER dot rather than getting the 9th+ hue. */
const CAT_HUES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"];
const CAT_OTHER = FAINT;
const CATEGORY_ORDER = ["Dining", "Groceries", "Travel", "Software", "Healthcare", "Fuel", "Office Supplies", "Entertainment"];
const CATEGORY_COLORS: Record<string, string> = Object.fromEntries(CATEGORY_ORDER.map((c, i) => [c, CAT_HUES[i]]));
const catColor = (cat: string) => CATEGORY_COLORS[cat] ?? CAT_OTHER;

/* ── Types ───────────────────────────────────────────────────────── */
interface Receipt {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
  ocrVerified: boolean;
  confidence: number;
  imageUrl?: string;
}

interface MonthData {
  total: number;
  receipts: Receipt[];
}

type Section = "personal" | "business";
type SectionData = Record<string, MonthData>;

/* ── Mock data (2026 demo ledger) ───────────────────────────────── */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BUSINESS_SEED: SectionData = {
  June: {
    total: 1245.50,
    receipts: [
      { id: "r1", merchant: "Adobe Creative Cloud", amount: 54.99, date: "Jun 28, 2026", category: "Software", ocrVerified: true, confidence: 98 },
      { id: "r2", merchant: "Delta Airlines", amount: 387.00, date: "Jun 25, 2026", category: "Travel", ocrVerified: true, confidence: 95 },
      { id: "r3", merchant: "Whole Foods Market", amount: 142.30, date: "Jun 22, 2026", category: "Groceries", ocrVerified: true, confidence: 99 },
      { id: "r4", merchant: "Shell Gas Station", amount: 68.45, date: "Jun 20, 2026", category: "Fuel", ocrVerified: false, confidence: 72 },
      { id: "r5", merchant: "The Capital Grille", amount: 225.80, date: "Jun 18, 2026", category: "Dining", ocrVerified: true, confidence: 97 },
      { id: "r6", merchant: "FedEx Shipping", amount: 34.96, date: "Jun 15, 2026", category: "Shipping", ocrVerified: true, confidence: 96 },
      { id: "r7", merchant: "Office Depot", amount: 89.50, date: "Jun 10, 2026", category: "Office Supplies", ocrVerified: true, confidence: 94 },
      { id: "r8", merchant: "Comcast Business", amount: 129.99, date: "Jun 5, 2026", category: "Utilities", ocrVerified: true, confidence: 99 },
      { id: "r9", merchant: "Uber Eats", amount: 48.71, date: "Jun 3, 2026", category: "Dining", ocrVerified: false, confidence: 68 },
      { id: "r10", merchant: "Walgreens Pharmacy", amount: 63.80, date: "Jun 1, 2026", category: "Healthcare", ocrVerified: true, confidence: 93 },
    ],
  },
  May: {
    total: 982.40,
    receipts: [
      { id: "m1", merchant: "Marriott Hotels", amount: 312.00, date: "May 27, 2026", category: "Travel", ocrVerified: true, confidence: 97 },
      { id: "m2", merchant: "Costco Wholesale", amount: 218.75, date: "May 20, 2026", category: "Groceries", ocrVerified: true, confidence: 99 },
      { id: "m3", merchant: "Zoom Video Comm.", amount: 149.90, date: "May 15, 2026", category: "Software", ocrVerified: true, confidence: 98 },
      { id: "m4", merchant: "Cheesecake Factory", amount: 156.30, date: "May 10, 2026", category: "Dining", ocrVerified: true, confidence: 95 },
      { id: "m5", merchant: "Amazon Web Services", amount: 145.45, date: "May 5, 2026", category: "Software", ocrVerified: true, confidence: 97 },
    ],
  },
  April: {
    total: 1560.20,
    receipts: [
      { id: "a1", merchant: "American Airlines", amount: 640.00, date: "Apr 22, 2026", category: "Travel", ocrVerified: true, confidence: 96 },
      { id: "a2", merchant: "Hilton Garden Inn", amount: 420.50, date: "Apr 18, 2026", category: "Travel", ocrVerified: true, confidence: 98 },
      { id: "a3", merchant: "Slack Technologies", amount: 87.50, date: "Apr 10, 2026", category: "Software", ocrVerified: true, confidence: 99 },
      { id: "a4", merchant: "Ruth's Chris Steak", amount: 312.20, date: "Apr 5, 2026", category: "Dining", ocrVerified: true, confidence: 94 },
      { id: "a5", merchant: "Staples", amount: 100.00, date: "Apr 2, 2026", category: "Office Supplies", ocrVerified: false, confidence: 71 },
    ],
  },
  March: { total: 743.80, receipts: [] },
  February: { total: 619.25, receipts: [] },
  January: { total: 891.10, receipts: [] },
};

const PERSONAL_SEED: SectionData = {
  June: {
    total: 874.20,
    receipts: [
      { id: "p1", merchant: "Publix Supermarket", amount: 138.45, date: "Jun 27, 2026", category: "Groceries", ocrVerified: true, confidence: 99 },
      { id: "p2", merchant: "Dr. Sarah Mitchell", amount: 220.00, date: "Jun 24, 2026", category: "Healthcare", ocrVerified: true, confidence: 96 },
      { id: "p3", merchant: "Netflix", amount: 22.99, date: "Jun 20, 2026", category: "Entertainment", ocrVerified: true, confidence: 99 },
      { id: "p4", merchant: "BP Gas Station", amount: 71.30, date: "Jun 18, 2026", category: "Fuel", ocrVerified: false, confidence: 74 },
      { id: "p5", merchant: "Olive Garden", amount: 87.60, date: "Jun 15, 2026", category: "Dining", ocrVerified: true, confidence: 95 },
      { id: "p6", merchant: "CVS Pharmacy", amount: 43.80, date: "Jun 12, 2026", category: "Personal Care", ocrVerified: true, confidence: 97 },
      { id: "p7", merchant: "Home Depot", amount: 156.90, date: "Jun 8, 2026", category: "Home & Garden", ocrVerified: true, confidence: 93 },
      { id: "p8", merchant: "Target", amount: 133.16, date: "Jun 3, 2026", category: "Clothing", ocrVerified: true, confidence: 91 },
    ],
  },
  May: {
    total: 692.45,
    receipts: [
      { id: "pm1", merchant: "Kroger", amount: 198.30, date: "May 25, 2026", category: "Groceries", ocrVerified: true, confidence: 98 },
      { id: "pm2", merchant: "Planet Fitness", amount: 25.00, date: "May 20, 2026", category: "Personal Care", ocrVerified: true, confidence: 99 },
      { id: "pm3", merchant: "Regal Cinemas", amount: 54.75, date: "May 15, 2026", category: "Entertainment", ocrVerified: true, confidence: 94 },
      { id: "pm4", merchant: "Walgreens", amount: 67.40, date: "May 10, 2026", category: "Healthcare", ocrVerified: false, confidence: 79 },
      { id: "pm5", merchant: "Chili's Grill & Bar", amount: 92.50, date: "May 5, 2026", category: "Dining", ocrVerified: true, confidence: 96 },
      { id: "pm6", merchant: "Lowe's", amount: 254.50, date: "May 2, 2026", category: "Home & Garden", ocrVerified: true, confidence: 92 },
    ],
  },
  April: {
    total: 558.90,
    receipts: [
      { id: "pa1", merchant: "Whole Foods Market", amount: 167.20, date: "Apr 22, 2026", category: "Groceries", ocrVerified: true, confidence: 99 },
      { id: "pa2", merchant: "Urgent Care Clinic", amount: 185.00, date: "Apr 15, 2026", category: "Healthcare", ocrVerified: true, confidence: 97 },
      { id: "pa3", merchant: "TJ Maxx", amount: 206.70, date: "Apr 8, 2026", category: "Clothing", ocrVerified: true, confidence: 90 },
    ],
  },
  March: { total: 521.00, receipts: [] },
  February: { total: 488.60, receipts: [] },
  January: { total: 610.30, receipts: [] },
};

const CATEGORY_PICKLIST = [
  "Dining", "Groceries", "Travel", "Software", "Healthcare", "Fuel", "Office Supplies", "Entertainment",
  "Shipping", "Utilities", "Personal Care", "Home & Garden", "Clothing", "Advertising", "Business Meals", "Miscellaneous",
];

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

/* ── CSS — scoped under .fpd-re so nothing else in the app is affected ── */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const RE_CSS = `
.fpd-re{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-re *{box-sizing:border-box;}
.fpd-re-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-re .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-re .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-re .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}
.fpd-re .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-re .pg-sub{color:${MUTED};font-size:16px;max-width:620px;line-height:1.6;}
.fpd-re .ocrbadge{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:99px;background:rgba(91,110,225,0.12);border:1px solid rgba(91,110,225,0.3);color:${ACCENT2};font-size:12.5px;font-weight:700;letter-spacing:0.06em;font-family:var(--font-mono);flex-shrink:0;}

.fpd-re .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-re .card.pad{padding:26px;}

.fpd-re .btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:9px;padding:15px 22px;border-radius:18px;background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;font-size:15.5px;font-weight:700;box-shadow:0 14px 30px -14px rgba(91,110,225,0.85),inset 0 1px 0 rgba(255,255,255,0.14);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);width:100%;}
.fpd-re .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-re .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:10px 16px;border-radius:99px;background:rgba(91,110,225,0.1);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:14px;font-weight:700;cursor:pointer;font-family:var(--font-body);transition:background .18s;}
.fpd-re .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-re .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:14px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* section toggle */
.fpd-re .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-re .seg button{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 15px;border-radius:13px;font-size:14.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-re .seg button.on.personal{background:linear-gradient(180deg,#6FD4A0,${POS});color:#08150F;box-shadow:0 6px 16px -8px rgba(95,190,145,0.7);}
.fpd-re .seg button.on.business{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

/* year summary */
.fpd-re .yearcard{border-radius:22px;padding:24px 26px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;background:linear-gradient(150deg,#101728,#0B1120);border:1px solid rgba(255,255,255,0.07);}
.fpd-re .yearcard .lbl{font-size:12px;font-family:var(--font-mono);letter-spacing:0.08em;color:${FAINT};margin-bottom:6px;}
.fpd-re .yearcard .val{font-family:var(--font-display);font-size:30px;font-weight:700;color:${TEXT};line-height:1;}
.fpd-re .yearcard .sub{color:${MUTED};font-size:13.5px;margin-top:6px;}
.fpd-re .yearcard .avg{font-family:var(--font-display);font-size:21px;font-weight:700;}

/* breadcrumb */
.fpd-re .crumb{display:flex;align-items:center;gap:6px;color:${MUTED};font-size:13.5px;}

/* month folders */
.fpd-re .month-row{width:100%;display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:18px;border:1px solid rgba(255,255,255,0.06);background:#101728;cursor:pointer;text-align:left;transition:background .15s,border-color .15s,transform .15s;}
.fpd-re .month-row:hover{background:#141C30;transform:translateY(-1px);}
.fpd-re .month-row.current{border-color:rgba(91,110,225,0.4);background:rgba(91,110,225,0.08);}
.fpd-re .month-row.empty{opacity:.45;cursor:default;}
.fpd-re .month-row.empty:hover{transform:none;background:#101728;}
.fpd-re .month-ico{width:44px;height:44px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.1);border:1px solid rgba(91,110,225,0.22);color:${ACCENT2};}
.fpd-re .month-row.current .month-ico{background:rgba(91,110,225,0.18);color:#fff;}
.fpd-re .month-name{font-size:15.5px;font-weight:600;color:${TEXT};}
.fpd-re .month-sub{color:${MUTED};font-size:13px;margin-top:2px;}
.fpd-re .month-total{font-family:var(--font-display);font-size:18px;font-weight:700;color:${TEXT};flex-shrink:0;}
.fpd-re .current-tag{font-size:9.5px;font-family:var(--font-mono);background:rgba(91,110,225,0.2);color:${ACCENT2};padding:2px 7px;border-radius:99px;font-weight:700;letter-spacing:0.05em;margin-left:8px;}

/* month detail header */
.fpd-re .mdhead{display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.fpd-re .mdtitle{font-family:var(--font-display);font-size:22px;color:${TEXT};font-weight:600;}
.fpd-re .mdsub{color:${MUTED};font-size:13.5px;margin-top:2px;}
.fpd-re .mdtotal{font-family:var(--font-display);font-size:24px;font-weight:700;color:${TEXT};margin-left:auto;}
.fpd-re .mdacts{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-re .search{display:flex;align-items:center;gap:10px;border-radius:16px;padding:11px 15px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);}
.fpd-re .search input{flex:1;border:none;outline:none;background:transparent;color:${TEXT};font-size:14.5px;font-family:var(--font-body);}
.fpd-re .search input::placeholder{color:${FAINT};}

/* receipt rows */
.fpd-re .receipt-row{width:100%;display:flex;align-items:center;gap:14px;padding:15px 16px;border-radius:16px;border:1px solid rgba(255,255,255,0.06);background:#101728;cursor:pointer;text-align:left;transition:background .15s,transform .15s;}
.fpd-re .receipt-row:hover{background:#141C30;transform:translateY(-1px);}
.fpd-re .receipt-ico{width:42px;height:42px;border-radius:13px;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fpd-re .cdot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.fpd-re .ocrpill{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-family:var(--font-mono);padding:2px 8px;border-radius:99px;font-weight:700;}
.fpd-re .ocrpill.ok{background:rgba(95,190,145,0.14);color:${POS};}
.fpd-re .ocrpill.review{background:rgba(217,165,94,0.14);color:${WARN};}

/* category breakdown */
.fpd-re .catbar-row{display:flex;flex-direction:column;gap:5px;}
.fpd-re .catbar-track{height:7px;border-radius:99px;background:#0F1624;overflow:hidden;}
.fpd-re .catbar-fill{height:100%;border-radius:99px;}

/* backdrop / modal (shared by detail, email, OCR review) */
.fpd-re .backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.78);backdrop-filter:blur(8px);}
.fpd-re .modal{width:100%;max-width:480px;max-height:92vh;overflow-y:auto;background:#101728;border-radius:22px;border:1px solid rgba(255,255,255,0.08);}
.fpd-re .modal-head{padding:20px 24px;background:linear-gradient(135deg,#7E6BD8,${ACCENT});}
.fpd-re .modal-head-top{display:flex;align-items:center;justify-content:space-between;}
.fpd-re .modal-head-title{color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;gap:9px;}
.fpd-re .modal-head-sub{color:rgba(255,255,255,0.75);font-size:12.5px;margin-top:5px;}
.fpd-re .modal-close{color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.14);border:none;border-radius:9px;padding:6px;cursor:pointer;display:flex;}
.fpd-re .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-re .field label{display:block;margin-bottom:6px;font-size:11px;font-weight:600;color:${MUTED};font-family:var(--font-mono);letter-spacing:0.06em;}
.fpd-re .field input,.fpd-re .field select{width:100%;padding:12px 14px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.09);color:${TEXT};font-size:14.5px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-re .field input:focus,.fpd-re .field select:focus{border-color:rgba(91,110,225,0.55);box-shadow:0 0 0 3px rgba(91,110,225,0.14);}
.fpd-re .conf-strip{display:flex;border-bottom:1px solid rgba(255,255,255,0.06);}
.fpd-re .conf-cell{flex:1;padding:11px 8px;text-align:center;}
.fpd-re .conf-cell .k{font-size:10px;color:${FAINT};font-family:var(--font-mono);margin-bottom:3px;}
.fpd-re .conf-cell .v{font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:4px;}
.fpd-re .amount-box{display:flex;align-items:center;gap:8px;border-radius:16px;border:1.5px solid rgba(91,110,225,0.5);background:rgba(91,110,225,0.06);padding:13px 16px;}
.fpd-re .amount-box .sign{font-size:20px;color:${ACCENT2};font-weight:300;}
.fpd-re .amount-box input{border:none;outline:none;background:transparent;flex:1;font-size:26px;font-weight:700;color:${TEXT};font-family:var(--font-display);}
.fpd-re .modal-foot{padding:0 22px 22px;}
.fpd-re .foot-note{color:${FAINT};font-size:11.5px;text-align:center;margin-top:10px;line-height:1.5;}
.fpd-re .detail-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06);}
.fpd-re .detail-row:last-child{border-bottom:none;}
.fpd-re .detail-lbl{display:flex;align-items:center;gap:9px;color:${MUTED};font-size:13px;}
.fpd-re .catchip{padding:2px 10px;border-radius:99px;font-size:11.5px;font-family:var(--font-mono);font-weight:700;}
.fpd-re .opt-row{display:flex;align-items:flex-start;gap:12px;border-radius:16px;padding:14px;text-align:left;cursor:pointer;transition:background .15s,border-color .15s;background:#0F1624;border:1.5px solid rgba(255,255,255,0.07);width:100%;}
.fpd-re .opt-row.on{background:rgba(91,110,225,0.08);border-color:rgba(91,110,225,0.4);}
.fpd-re .opt-check{width:18px;height:18px;border-radius:5px;flex-shrink:0;margin-top:1px;border:2px solid rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;}
.fpd-re .opt-row.on .opt-check{background:${ACCENT};border-color:${ACCENT};}

@media (max-width:640px){.fpd-re .pg-head{flex-direction:column;align-items:flex-start;}.fpd-re .mdtotal{margin-left:0;}}
`;

/* ── Receipt Detail Modal ─────────────────────────────────────────── */
function ReceiptDetailModal({ receipt, onClose, onDelete }: { receipt: Receipt; onClose: () => void; onDelete: () => void }) {
  const color = catColor(receipt.category);
  const details = [
    { label: "Merchant", value: receipt.merchant, icon: <Building2 size={14} /> },
    { label: "Amount", value: fmt(receipt.amount), icon: <DollarSign size={14} /> },
    { label: "Date", value: receipt.date, icon: <Calendar size={14} /> },
    { label: "Category", value: receipt.category, icon: <Tag size={14} /> },
    { label: "OCR Confidence", value: `${receipt.confidence}%`, icon: <Cpu size={14} /> },
  ];

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-head-top">
            <span className="modal-head-title"><ReceiptText size={16} /> {receipt.merchant}</span>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 700, color: "#fff", marginTop: 12 }}>{fmt(receipt.amount)}</div>
          <div style={{ marginTop: 10 }}>
            {receipt.ocrVerified ? (
              <span className="ocrpill" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}><CheckCircle size={11} /> OCR VERIFIED · {receipt.confidence}%</span>
            ) : (
              <span className="ocrpill" style={{ background: "rgba(255,255,255,0.16)", color: "rgba(255,255,255,0.9)" }}><AlertCircle size={11} /> NEEDS REVIEW · {receipt.confidence}%</span>
            )}
          </div>
        </div>

        {receipt.imageUrl && (
          <div style={{ padding: "18px 22px 0" }}>
            <img src={receipt.imageUrl} alt="Scanned receipt" style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 14, background: "#0B1120", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>
        )}

        <div className="modal-body">
          {details.map(d => (
            <div key={d.label} className="detail-row">
              <span className="detail-lbl">{d.icon} {d.label}</span>
              {d.label === "Category" ? (
                <span className="catchip" style={{ background: `${color}22`, color }}>{d.value}</span>
              ) : (
                <span style={{
                  color: d.label === "OCR Confidence" ? (receipt.confidence >= 90 ? POS : receipt.confidence >= 75 ? WARN : NEG) : TEXT,
                  fontSize: d.label === "Amount" ? 16 : 14, fontWeight: d.label === "Amount" ? 700 : 500,
                }}>{d.value}</span>
              )}
            </div>
          ))}
        </div>

        <div className="modal-foot" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => { toast.success(`Downloading receipt — ${receipt.merchant}`); }}>
              <Download size={14} /> Download
            </button>
            <button className="btn-primary" style={{ flex: 1, padding: "11px 16px" }} onClick={() => { toast.success(`Sharing receipt — ${receipt.merchant}`); }}>
              <Send size={14} /> Share
            </button>
          </div>
          <button className="btn-sec" style={{ justifyContent: "center", color: NEG, background: "rgba(208,107,107,0.08)", borderColor: "rgba(208,107,107,0.2)" }}
            onClick={() => { onDelete(); toast.error("Receipt deleted"); onClose(); }}>
            <Trash2 size={13} /> Delete Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Email CPA Modal ───────────────────────────────────────────────── */
function EmailCPAModal({ month, total, onClose }: { month: string; total: number; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [includeCSV, setIncludeCSV] = useState(true);
  const [includeImages, setIncludeImages] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!email) { toast.error("Please enter an email address"); return; }
    setSending(true);
    setTimeout(() => { setSending(false); setSent(true); toast.success(`Secure package sent to ${email}`); }, 1200);
  };

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-head-top">
            <span className="modal-head-title"><Mail size={16} /> Email to CPA</span>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-head-sub">{month} 2026 · {fmt(total)} total · Encrypted secure delivery</div>
        </div>

        {!sent ? (
          <>
            <div className="modal-body">
              <div className="field">
                <label>CPA EMAIL ADDRESS</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="cpa@taxfirm.com" type="email" />
              </div>

              <div>
                <label style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: MUTED, letterSpacing: "0.06em", display: "block", marginBottom: 10 }}>EXPORT OPTIONS</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <button className={`opt-row${includeCSV ? " on" : ""}`} onClick={() => setIncludeCSV(v => !v)}>
                    <div className="opt-check">{includeCSV && <CheckCircle size={11} color="#fff" />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: TEXT, fontSize: 13.5, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}><FileText size={13} /> CSV Summary</div>
                      <div style={{ color: MUTED, fontSize: 12 }}>Merchant, amount, date, category for every receipt</div>
                    </div>
                  </button>
                  <button className={`opt-row${includeImages ? " on" : ""}`} onClick={() => setIncludeImages(v => !v)}>
                    <div className="opt-check">{includeImages && <CheckCircle size={11} color="#fff" />}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: TEXT, fontSize: 13.5, fontWeight: 600, marginBottom: 2, display: "flex", alignItems: "center", gap: 7 }}><Package size={13} /> Image Bundle</div>
                      <div style={{ color: MUTED, fontSize: 12 }}>All receipt images in a single ZIP archive</div>
                    </div>
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 9, padding: "12px 14px", borderRadius: 14, background: "rgba(91,110,225,0.06)", border: "1px solid rgba(91,110,225,0.16)" }}>
                <CheckCircle size={13} color={ACCENT2} style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ color: MUTED, fontSize: 12, lineHeight: 1.6, margin: 0 }}>Package is encrypted end-to-end. Your CPA receives a secure download link valid for 48 hours.</p>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-primary" disabled={sending} onClick={handleSend}>
                {sending ? "Sending…" : <><Send size={15} /> Send Secure Package</>}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: "34px 22px", textAlign: "center" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(95,190,145,0.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle size={30} color={POS} />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, color: TEXT, marginBottom: 8 }}>Package Sent!</h3>
            <p style={{ color: MUTED, fontSize: 13, lineHeight: 1.6 }}>{month} 2026 receipt package delivered securely to<br /><strong style={{ color: ACCENT2 }}>{email}</strong></p>
            <p style={{ color: FAINT, fontSize: 12, marginTop: 8 }}>Download link valid for 48 hours.</p>
            <button className="btn-ghost" style={{ marginTop: 20 }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── OCR Review Modal — confirms fields against the scanned image ──── */
function OCRReviewModal({ doc, month, onSave, onClose }: { doc: ScannedDocument; month: string; onSave: (r: Omit<Receipt, "id">) => void; onClose: () => void }) {
  const [merchant, setMerchant] = useState(doc.name || "New Receipt");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState(CATEGORY_PICKLIST[0]);
  const [saving, setSaving] = useState(false);

  const confidence = [
    { label: "MERCHANT", pct: 91 },
    { label: "AMOUNT", pct: 63 },
    { label: "DATE", pct: 88 },
  ];

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter the receipt total"); return; }
    setSaving(true);
    setTimeout(() => {
      onSave({ merchant, amount: amt, date, category, ocrVerified: true, confidence: 95, imageUrl: doc.previewUrl });
      toast.success(`Receipt saved to ${month} 2026 folder`);
      onClose();
    }, 600);
  };

  return (
    <div className="backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-head-top">
            <span className="modal-head-title"><Cpu size={15} /> Confirm Receipt Details</span>
            <button className="modal-close" onClick={onClose}><X size={15} /></button>
          </div>
          <div className="modal-head-sub">Review the scanned fields before saving</div>
        </div>

        <div className="conf-strip">
          {confidence.map(f => (
            <div key={f.label} className="conf-cell">
              <div className="k">{f.label}</div>
              <div className="v" style={{ color: f.pct >= 90 ? POS : f.pct >= 75 ? WARN : NEG }}>{f.pct}% <CheckCircle size={10} /></div>
            </div>
          ))}
        </div>

        <div className="modal-body">
          {doc.previewUrl && (
            <img src={doc.previewUrl} alt="Scanned receipt" style={{ width: "100%", maxHeight: 160, objectFit: "contain", borderRadius: 14, background: "#0B1120", border: "1px solid rgba(255,255,255,0.08)" }} />
          )}

          <div className="field">
            <label>TOTAL AMOUNT</label>
            <div className="amount-box">
              <span className="sign">$</span>
              <input value={amount} onChange={e => setAmount(e.target.value)} type="number" step="0.01" placeholder="0.00" autoFocus />
            </div>
          </div>

          <div className="field">
            <label>MERCHANT NAME</label>
            <input value={merchant} onChange={e => setMerchant(e.target.value)} />
          </div>

          <div className="field">
            <label>DATE</label>
            <input value={date} onChange={e => setDate(e.target.value)} type="date" />
          </div>

          <div className="field">
            <label>CATEGORY</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORY_PICKLIST.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Saving…" : <><CheckCircle size={15} /> Save to {month} 2026 Folder</>}
          </button>
          <p className="foot-note">Receipt will be encrypted and stored under Receipts &gt; 2026 &gt; {month}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Month Detail View ─────────────────────────────────────────────── */
function MonthDetail({
  month, section, sectionData, onBack, onEmailCPA, onOpenReceipt,
}: {
  month: string; section: Section; sectionData: SectionData;
  onBack: () => void; onEmailCPA: () => void; onOpenReceipt: (r: Receipt) => void;
}) {
  const data = sectionData[month] ?? { total: 0, receipts: [] };
  const [search, setSearch] = useState("");
  const filtered = data.receipts.filter(r =>
    r.merchant.toLowerCase().includes(search.toLowerCase()) || r.category.toLowerCase().includes(search.toLowerCase())
  );

  const byCategory = Object.entries(
    data.receipts.reduce((acc, r) => { acc[r.category] = (acc[r.category] ?? 0) + r.amount; return acc; }, {} as Record<string, number>)
  ).sort(([, a], [, b]) => b - a);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="mdhead">
          <button className="btn-ghost" onClick={onBack}><ArrowLeft size={14} /> Back</button>
          <div>
            <div className="mdtitle" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {month} 2026
              <span className="ocrpill" style={{ background: section === "personal" ? "rgba(95,190,145,0.14)" : "rgba(91,110,225,0.16)", color: section === "personal" ? POS : ACCENT2 }}>
                {section === "personal" ? <User size={9} /> : <Briefcase size={9} />} {section.toUpperCase()}
              </span>
            </div>
            <div className="mdsub">{data.receipts.length} receipt{data.receipts.length === 1 ? "" : "s"}</div>
          </div>
          <div className="mdtotal">{fmt(data.total)}</div>
        </div>

        <div className="mdacts">
          <button className="btn-ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => toast.success(`Downloading ${month} 2026 receipt package…`)}>
            <Download size={14} /> Download Package
          </button>
          <button className="btn-primary" style={{ flex: 1, padding: "10px 16px" }} onClick={onEmailCPA}>
            <Mail size={14} /> Email to CPA
          </button>
        </div>

        <div className="search">
          <Search size={14} color={FAINT} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search receipts…" />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && (
          <div className="card pad" style={{ textAlign: "center", color: MUTED }}>
            <FileText size={28} color={FAINT} style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 14 }}>No receipts found</p>
          </div>
        )}
        {filtered.map(r => {
          const color = catColor(r.category);
          return (
            <button key={r.id} className="receipt-row" onClick={() => onOpenReceipt(r)}>
              <div className="receipt-ico" style={{ background: `${color}1E`, border: `1.5px solid ${color}44` }}>
                <FileText size={18} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <span style={{ color: TEXT, fontWeight: 600, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.merchant}</span>
                  <span style={{ fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: TEXT, flexShrink: 0 }}>{fmt(r.amount)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ color: MUTED, fontSize: 12 }}>{r.date}</span>
                  <span className="cdot" style={{ background: color }} />
                  <span style={{ color: MUTED, fontSize: 12 }}>{r.category}</span>
                  {r.ocrVerified
                    ? <span className="ocrpill ok"><CheckCircle size={9} /> VERIFIED</span>
                    : <span className="ocrpill review"><AlertCircle size={9} /> REVIEW</span>}
                </div>
              </div>
              <ChevronRight size={14} color={FAINT} />
            </button>
          );
        })}

        {byCategory.length > 0 && (
          <div className="card pad" style={{ marginTop: 6 }}>
            <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, color: TEXT, marginBottom: 14 }}>Spend by Category</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {byCategory.map(([cat, amt]) => {
                const color = catColor(cat);
                return (
                  <div key={cat} className="catbar-row">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7, color: TEXT, fontSize: 13, fontWeight: 500 }}>
                        <span className="cdot" style={{ background: color }} /> {cat}
                      </span>
                      <span style={{ color: TEXT, fontSize: 13, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{fmt(amt)}</span>
                    </div>
                    <div className="catbar-track">
                      <div className="catbar-fill" style={{ width: `${(amt / data.total) * 100}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────────── */
export function ReceiptsExpenses() {
  const [business, setBusiness] = useState<SectionData>(BUSINESS_SEED);
  const [personal, setPersonal] = useState<SectionData>(PERSONAL_SEED);
  const [section, setSection] = useState<Section>("personal");
  const [view, setView] = useState<"directory" | "month">("directory");
  const [selectedMonth, setSelectedMonth] = useState<string>("June");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [showEmail, setShowEmail] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<ScannedDocument | null>(null);
  const currentMonth = MONTHS[new Date().getMonth()];

  const activeData = section === "personal" ? personal : business;
  const setActiveData = section === "personal" ? setPersonal : setBusiness;
  const yearTotal = Object.values(activeData).reduce((s, m) => s + m.total, 0);
  const monthsWithData = Object.entries(activeData).sort((a, b) => MONTHS.indexOf(b[0]) - MONTHS.indexOf(a[0]));

  const saveMonth = selectedMonth || currentMonth;

  const addReceipt = (r: Omit<Receipt, "id">) => {
    setActiveData(prev => {
      const existing = prev[saveMonth] ?? { total: 0, receipts: [] };
      const receipt: Receipt = { ...r, id: `${Date.now()}` };
      return { ...prev, [saveMonth]: { total: existing.total + r.amount, receipts: [receipt, ...existing.receipts] } };
    });
  };

  const deleteReceipt = (month: string, id: string) => {
    setActiveData(prev => {
      const existing = prev[month];
      if (!existing) return prev;
      const target = existing.receipts.find(r => r.id === id);
      if (!target) return prev;
      return { ...prev, [month]: { total: existing.total - target.amount, receipts: existing.receipts.filter(r => r.id !== id) } };
    });
  };

  return (
    <div className="fpd-re">
      <style dangerouslySetInnerHTML={{ __html: RE_CSS }} />
      <div className="fpd-re-grain" />

      <div className="wrap">
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><ReceiptText size={12} /> Receipts &amp; Expenses</div>
            <h1 className="pg-h1">Receipts &amp; Expenses</h1>
            <div className="pg-sub">Scan or upload receipts, auto-categorize spending, and hand your CPA a ready-to-file package — every month, organized by folder.</div>
          </div>
          <div className="ocrbadge"><Cpu size={13} /> OCR ACTIVE</div>
        </div>

        <div className="seg">
          {(["personal", "business"] as Section[]).map(s => (
            <button key={s} className={`${section === s ? "on " + s : ""}`} onClick={() => { setSection(s); setView("directory"); }}>
              {s === "personal" ? <User size={14} /> : <Briefcase size={14} />} {s === "personal" ? "Personal" : "Business"}
            </button>
          ))}
        </div>

        {view === "directory" ? (
          <>
            <button className="btn-primary" onClick={() => setShowScanner(true)}>
              <Camera size={17} /> Scan / Upload {section === "personal" ? "Personal" : "Business"} Receipt
            </button>

            <div className="yearcard">
              <div>
                <div className="lbl">{section.toUpperCase()} · 2026 YTD</div>
                <div className="val">{fmt(yearTotal)}</div>
                <div className="sub">{monthsWithData.length} months tracked</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="lbl">AVG / MONTH</div>
                <div className="avg" style={{ color: section === "personal" ? POS : ACCENT2 }}>{fmt(yearTotal / monthsWithData.length)}</div>
              </div>
            </div>

            <div className="crumb">
              <Folder size={13} color={section === "personal" ? POS : ACCENT2} />
              <span style={{ color: section === "personal" ? POS : ACCENT2, fontWeight: 600 }}>{section === "personal" ? "Personal" : "Business"} Receipts</span>
              <ChevronRight size={12} /> <span>2026</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {monthsWithData.map(([month, data]) => {
                const isCurrent = month === currentMonth;
                const hasReceipts = data.receipts.length > 0;
                return (
                  <button key={month} className={`month-row${isCurrent ? " current" : ""}${!hasReceipts ? " empty" : ""}`}
                    onClick={() => { if (!hasReceipts && !isCurrent) return; setSelectedMonth(month); setView("month"); }}>
                    <div className="month-ico">{hasReceipts ? <FolderOpen size={19} /> : <Folder size={19} />}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="month-name">{month}</span>
                        {isCurrent && <span className="current-tag">CURRENT</span>}
                      </div>
                      <div className="month-sub">{data.receipts.length} receipt{data.receipts.length === 1 ? "" : "s"}</div>
                    </div>
                    <span className="month-total">{fmt(data.total)}</span>
                    <ChevronRight size={14} color={FAINT} />
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <MonthDetail
            month={selectedMonth}
            section={section}
            sectionData={activeData}
            onBack={() => setView("directory")}
            onEmailCPA={() => setShowEmail(true)}
            onOpenReceipt={setSelectedReceipt}
          />
        )}
      </div>

      <DocumentScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        folder="financial"
        onUpload={doc => { setShowScanner(false); setPendingDoc(doc); }}
      />

      {pendingDoc && (
        <OCRReviewModal
          doc={pendingDoc}
          month={saveMonth}
          onClose={() => setPendingDoc(null)}
          onSave={r => addReceipt(r)}
        />
      )}

      {selectedReceipt && (
        <ReceiptDetailModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onDelete={() => deleteReceipt(selectedMonth, selectedReceipt.id)}
        />
      )}

      {showEmail && (
        <EmailCPAModal month={selectedMonth} total={activeData[selectedMonth]?.total ?? 0} onClose={() => setShowEmail(false)} />
      )}
    </div>
  );
}
