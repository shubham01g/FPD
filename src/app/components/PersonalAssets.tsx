import React, { useState, useRef, useEffect, useCallback } from "react";
import { Car, Lock, Bitcoin, Plus, Edit2, Trash2, Key, X, Home, Camera, Image, Gem, Sword, Boxes } from "lucide-react";
import { toast } from "sonner";
import { tables } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { prepareImage } from "../utils/imageInput";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { AttachDocumentField } from "./AttachDocumentField";
import heroAssetsPhoto from "../../imports/personalassets_hero_photo_v2.webp";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders, final wishes & wills) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

type Tab = "vehicles" | "realestate" | "digital" | "weapons" | "weapons_locker" | "collectibles";













/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-passets so nothing else in the app is affected. */
const PASSETS_CSS = `
.fpd-passets{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-passets *{box-sizing:border-box;}
.fpd-passets-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-passets .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

/* photo hero banner — same full-bleed treatment as the Dashboard's hero,
   tinted toward the brand palette via background-blend-mode so it reads as
   one system rather than a flat stock photo. Hover zooms the art only. */
.fpd-passets .hbanner{position:relative;overflow:hidden;border-radius:22px;min-height:220px;display:flex;align-items:stretch;background:#0A0F1A;border:1px solid rgba(255,255,255,0.06);isolation:isolate;flex-shrink:0;}
.fpd-passets .hbanner .art{position:absolute;inset:-6%;z-index:0;transition:transform .7s cubic-bezier(.16,1,.3,1);transform:scale(1);pointer-events:none;background-size:cover;background-position:center;background-blend-mode:color;}
.fpd-passets .hbanner:hover .art{transform:scale(1.08);}
.fpd-passets .hbanner .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(100deg,#070A12 0%,rgba(7,10,18,0.94) 32%,rgba(7,10,18,0.58) 60%,rgba(7,10,18,0.18) 100%);pointer-events:none;}
.fpd-passets .hbanner .hcontent{position:relative;z-index:2;padding:30px 34px;display:flex;flex-direction:column;justify-content:center;max-width:480px;}
.fpd-passets .hbanner .heyebrow{display:inline-flex;align-items:center;gap:8px;align-self:flex-start;padding:6px 13px;border-radius:99px;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.36);color:#AEB9F5;font-size:12.5px;font-weight:700;letter-spacing:0.13em;text-transform:uppercase;margin-bottom:14px;font-family:var(--font-mono);}
.fpd-passets .hbanner h1{font-family:var(--font-display);font-size:36.5px;font-weight:700;line-height:1.14;letter-spacing:-0.02em;margin:0 0 10px;color:${TEXT};}
.fpd-passets .hbanner h1 .accent{background:linear-gradient(90deg,${ACCENT2},${ACCENT});-webkit-background-clip:text;background-clip:text;color:transparent;}
.fpd-passets .hbanner p{color:${SOFT};font-size:17px;line-height:1.6;max-width:400px;margin:0 0 20px;}
.fpd-passets .hbanner .hactions{display:flex;gap:10px;flex-wrap:wrap;}
.fpd-passets .hbanner .hbtn{display:inline-flex;align-items:center;gap:8px;padding:11px 18px;border-radius:99px;font-size:15.5px;font-weight:700;cursor:pointer;font-family:var(--font-body);border:none;transition:transform .18s,filter .18s;}
.fpd-passets .hbanner .hbtn:hover{transform:translateY(-1px);}
.fpd-passets .hbanner .hbtn.primary{background:linear-gradient(180deg,#7E6BD8,${ACCENT});color:#fff;box-shadow:0 14px 30px -12px rgba(91,110,225,0.75),inset 0 1px 0 rgba(255,255,255,0.18);}
.fpd-passets .hbanner .hbtn.ghost{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);color:#fff;}
.fpd-passets .hbanner .hbtn.ghost:hover{background:rgba(255,255,255,0.1);}
@media (max-width:640px){.fpd-passets .hbanner{min-height:auto;} .fpd-passets .hbanner .hcontent{padding:24px 22px;max-width:none;} .fpd-passets .hbanner h1{font-size:29px;}}

.fpd-passets .card{background:#101728;border:1px solid rgba(255,255,255,0.06);border-radius:22px;}
.fpd-passets .card.pad{padding:28px;}
.fpd-passets .eyebrow{font-size:12.5px;font-weight:600;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-passets .pg-h1{font-size:30px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-passets .pg-sub{color:${MUTED};font-size:16px;max-width:660px;line-height:1.6;}
.fpd-passets .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:99px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:15.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-passets .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-passets .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:99px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:${MUTED};font-size:15.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-passets .seg{display:flex;gap:3px;padding:3px;border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);width:fit-content;flex-wrap:wrap;}
.fpd-passets .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:99px;font-size:15.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-passets .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-passets .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-passets .toolbar-end{display:flex;justify-content:flex-end;}

/* alert banners */
.fpd-passets .banner{display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-radius:16px;font-size:15.5px;line-height:1.6;flex:1;min-width:220px;}
.fpd-passets .banner.warn{background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.24);color:${WARN};}
.fpd-passets .banner.neg{background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.24);color:${NEG};}

/* record cards */
.fpd-passets .dlist{display:flex;flex-direction:column;gap:14px;}
.fpd-passets .dtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}
.fpd-passets .dleft{display:flex;align-items:flex-start;gap:14px;min-width:0;}
.fpd-passets .dico{width:44px;height:44px;border-radius:16px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:#FFFFFF;}
.fpd-passets .dtype{font-family:var(--font-display);font-size:21.5px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-passets .dsub{color:${MUTED};font-size:15.5px;}
.fpd-passets .dvalue{text-align:right;flex-shrink:0;}
.fpd-passets .dvnum{font-family:var(--font-display);font-size:24px;font-weight:700;color:#D99A6B;letter-spacing:-0.01em;line-height:1.2;}
.fpd-passets .dvlbl{color:${MUTED};font-size:14px;margin-top:2px;}
.fpd-passets .dright{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-passets .damt{font-family:var(--font-mono);color:#6FAE8B;font-size:17.5px;font-weight:700;white-space:nowrap;}
.fpd-passets .damt span{color:${MUTED};font-weight:500;font-size:14px;}

.fpd-passets .dbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:12.5px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-passets .dbadge.type{background:rgba(91,110,225,0.12);color:#6FAE8B;}
.fpd-passets .dbadge.autopay{background:rgba(95,190,145,0.14);color:#D99A6B;}
.fpd-passets .catbadge{display:inline-block;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:12.5px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:#6FAE8B;margin-bottom:9px;}

.fpd-passets .dgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:16px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);overflow:hidden;margin-bottom:4px;}
.fpd-passets .dgrid.two{grid-template-columns:repeat(2,1fr);}
.fpd-passets .dgrid:not(.two) .tile:nth-child(3n+2),.fpd-passets .dgrid:not(.two) .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-passets .dgrid:not(.two) .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-passets .dgrid.two .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.08);}
.fpd-passets .dgrid.two .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.08);}
.fpd-passets .tile{padding:12px 14px;}
.fpd-passets .tile .tk{font-size:12px;font-weight:600;color:${MUTED};margin-bottom:5px;}
.fpd-passets .tile .tv{color:${TEXT};font-size:16px;line-height:1.5;}
@media (max-width:900px){
.fpd-passets .dgrid,.fpd-passets .dgrid.two{grid-template-columns:1fr;}
.fpd-passets .dgrid:not(.two) .tile:nth-child(3n+2),.fpd-passets .dgrid:not(.two) .tile:nth-child(3n){border-left:none;}
.fpd-passets .dgrid.two .tile:nth-child(2n){border-left:none;}
.fpd-passets .dgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.08);}
}

.fpd-passets .notewarn{padding:12px 14px;border-radius:16px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.22);color:${WARN};font-size:15.5px;line-height:1.6;margin-top:12px;}
.fpd-passets .noteinfo{padding:12px 14px;border-radius:16px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.22);color:#6FAE8B;font-size:15.5px;line-height:1.6;margin-top:12px;}
.fpd-passets .notemuted{color:${MUTED};font-size:15px;margin-top:10px;line-height:1.6;}
.fpd-passets .noteitalic{color:${MUTED};font-size:15px;margin-top:10px;font-style:italic;line-height:1.6;}
.fpd-passets .dacts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;}

/* photo frame */
.fpd-passets .photo-frame{position:relative;background:#0F1624;border-bottom:1px solid rgba(255,255,255,0.08);overflow:hidden;}
.fpd-passets .photo-frame img{width:100%;height:100%;object-fit:cover;display:block;}
.fpd-passets .photo-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:7px;color:${MUTED};font-size:15px;}
.fpd-passets .photo-btn{position:absolute;bottom:10px;right:10px;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:99px;background:rgba(5,8,14,0.65);backdrop-filter:blur(6px);color:#fff;font-size:14.5px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}

/* modal */
.fpd-passets .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-passets .modal{width:100%;max-width:540px;max-height:90vh;overflow-y:auto;}
.fpd-passets .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.08);}
.fpd-passets .modal-head h3{font-family:var(--font-display);font-size:20px;color:${TEXT};font-weight:600;}
.fpd-passets .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-passets .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-passets .field label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:${MUTED};}
.fpd-passets .field input,.fpd-passets .field select,.fpd-passets .field textarea{width:100%;padding:11px 13px;border-radius:18px;background:#0F1624;border:1px solid rgba(255,255,255,0.08);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-passets .field input::placeholder,.fpd-passets .field textarea::placeholder{color:${FAINT};}
.fpd-passets .field input:focus,.fpd-passets .field select:focus,.fpd-passets .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-passets .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.08);}
.fpd-passets .modal-foot .save{flex:1;padding:12px;border-radius:18px;font-size:16px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-passets .modal-foot .save:hover{filter:brightness(1.08);}
`;

/* NUMERIC columns <-> the "$45,000" strings the UI shows. Converting at
   this boundary keeps both the schema and the screens as they are. */
const toMoney = (n: unknown) => (n === null || n === undefined || n === "" ? "" : "$" + Number(n).toLocaleString());
const fromMoney = (v: string) => {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
};

export function PersonalAssets() {
  const [tab, setTab] = useState<Tab>("vehicles");
  const { authUser } = useAuth();
  const [vehicleList, setVehicleList] = useState<any[]>([]);
  const [realEstateList, setRealEstateList] = useState<any[]>([]);
  const [digitalList, setDigitalList] = useState<any[]>([]);
  const [weaponList, setWeaponList] = useState<any[]>([]);
  const [collectiblesList, setCollectiblesList] = useState<any[]>([]);
  const [weaponsLockerList, setWeaponsLockerList] = useState<any[]>([]);

  /* Each tab has its own table (migration 007, columns completed by 015).
     Money is NUMERIC in the database but the UI shows "$45,000" strings, so
     it converts at this boundary rather than changing either side. */
  const reload = useCallback(async () => {
    if (!authUser) return;
    const fail = (what: string, e: { message: string }) => toast.error(`Could not load ${what}: ${e.message}`);

    const [v, re, d, w, wl, c] = await Promise.all([
      tables.vehicles.list(authUser.id),
      tables.realEstate.list(authUser.id),
      tables.digitalAssets.list(authUser.id),
      tables.weapons.list(authUser.id),
      tables.weaponsLocker.list(authUser.id),
      tables.collectibles.list(authUser.id),
    ]);

    if (v.error) fail("vehicles", v.error); else setVehicleList((v.data ?? []).map(r => ({
      id: String(r.id), year: Number(r.year) || "", make: String(r.make ?? ""), model: String(r.model ?? ""),
      color: String(r.color ?? ""), vin: String(r.vin ?? ""), plate: String(r.license_plate ?? ""),
      title: String(r.title_holder ?? ""), lien: String(r.loan_lender ?? "None"),
      insurance: String(r.insurance_provider ?? ""), registration: String(r.registration_expiry ?? ""),
      value: toMoney(r.current_value), notes: String(r.notes ?? ""), photo: String(r.photo_url ?? ""),
      attachedDoc: ((r.document_urls as string[] | null) ?? [])[0] ?? null,
    })));

    if (re.error) fail("real estate", re.error); else setRealEstateList((re.data ?? []).map(r => ({
      id: String(r.id), type: String(r.property_type ?? ""), address: String(r.address ?? ""),
      city: String(r.city ?? ""), value: toMoney(r.current_value), mortgage: toMoney(r.mortgage_balance),
      mortgagePayment: toMoney(r.mortgage_payment), titleHolder: String(r.title_holder ?? ""),
      deed: String(r.deed_location ?? ""), yearBuilt: String(r.year_built ?? ""), sqft: String(r.sqft ?? ""),
      bedBath: String(r.bed_bath ?? ""), lotSize: String(r.lot_size ?? ""), notes: String(r.notes ?? ""),
      photo: String(r.photo_url ?? ""), attachedDoc: ((r.document_urls as string[] | null) ?? [])[0] ?? null,
    })));

    if (d.error) fail("digital assets", d.error); else setDigitalList((d.data ?? []).map(r => ({
      id: String(r.id), category: String(r.asset_type ?? ""), platform: String(r.platform ?? ""),
      asset: String(r.asset_name ?? ""), holdings: String(r.holdings ?? ""), value: toMoney(r.estimated_value),
      accessMethod: String(r.access_instructions ?? ""), notes: String(r.notes ?? ""), attachedDoc: null,
    })));

    if (w.error) fail("weapons", w.error); else setWeaponList((w.data ?? []).map(r => ({
      id: String(r.id), type: String(r.weapon_type ?? ""), make: String(r.make ?? ""), model: String(r.model ?? ""),
      caliber: String(r.caliber ?? ""), serial: String(r.serial_number ?? ""), registration: String(r.permit_number ?? ""),
      storage: String(r.storage_location ?? ""), transfer: String(r.transfer_to ?? ""), photo: String(r.photo_url ?? ""),
      attachedDoc: ((r.document_urls as string[] | null) ?? [])[0] ?? null,
    })));

    if (wl.error) fail("weapons locker", wl.error); else setWeaponsLockerList((wl.data ?? []).map(r => ({
      id: String(r.id), type: String(r.item_type ?? ""), make: String(r.make ?? ""), model: String(r.model ?? ""),
      blade: String(r.blade ?? ""), handle: String(r.handle ?? ""), storage: String(r.location ?? ""),
      transfer: String(r.transfer_to ?? ""), notes: String(r.notes ?? ""), photo: String(r.photo_url ?? ""),
      attachedDoc: ((r.document_urls as string[] | null) ?? [])[0] ?? null,
    })));

    if (c.error) fail("collectibles", c.error); else setCollectiblesList((c.data ?? []).map(r => ({
      id: String(r.id), name: String(r.item_name ?? ""), category: String(r.category ?? ""),
      condition: String(r.condition ?? ""), estimatedValue: toMoney(r.current_value),
      purchaseDate: String(r.acquired_date ?? ""), purchasedFrom: String(r.acquired_from ?? ""),
      intendedFor: String(r.intended_for ?? ""), serialNum: String(r.serial_number ?? ""),
      notes: String(r.notes ?? ""), photo: String(r.photo_url ?? ""),
      attachedDoc: ((r.document_urls as string[] | null) ?? [])[0] ?? null,
    })));
  }, [authUser]);

  useEffect(() => { void reload(); }, [reload]);
  const [showAdd, setShowAdd] = useState<Tab | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const tabContentRef = React.useRef<HTMLDivElement>(null);
  const [pendingPhotoTarget, setPendingPhotoTarget] = useState<{type:"realestate"|"weapon"; id:number}|null>(null);

  const [vForm, setVForm] = useState({ year:"", make:"", model:"", color:"", vin:"", plate:"", title:"", lien:"", insurance:"", registration:"", value:"", notes:"", photo:"" });
  const [vDoc, setVDoc] = useState<string|null>(null);
  const [rForm, setRForm] = useState({ type:"", address:"", city:"", value:"", mortgage:"", mortgagePayment:"", titleHolder:"", deed:"", yearBuilt:"", sqft:"", bedBath:"", lotSize:"", notes:"", photo:"" });
  const [rDoc, setRDoc] = useState<string|null>(null);
  const [dForm, setDForm] = useState({ category:"Cryptocurrency", platform:"", asset:"", holdings:"", value:"", accessMethod:"", notes:"" });
  const [dDoc, setDDoc] = useState<string|null>(null);
  const [wForm, setWForm] = useState({ type:"Handgun", make:"", model:"", caliber:"", serial:"", registration:"", storage:"", transfer:"", photo:"" });
  const [wDoc, setWDoc] = useState<string|null>(null);
  const [cForm, setCForm] = useState({ name:"", category:"Sports Cards", condition:"", estimatedValue:"", purchaseDate:"", purchasedFrom:"", intendedFor:"", serialNum:"", notes:"", photo:"" });
  const [cDoc, setCDoc] = useState<string|null>(null);
  const [wlForm, setWlForm] = useState({ type:"Knife", make:"", model:"", blade:"", handle:"", storage:"", transfer:"", notes:"", photo:"" });
  const [wlDoc, setWlDoc] = useState<string|null>(null);

  async function uploadPhoto(file: File) {
    if (!pendingPhotoTarget) return;
    let url: string;
    try { url = (await prepareImage(file)).url; }
    catch (err) { toast.error((err as Error).message); return; }
    if (pendingPhotoTarget.type === "realestate") {
      setRealEstateList(p => p.map(r => r.id === pendingPhotoTarget.id ? { ...r, photo: url } : r));
      toast.success("Property photo added");
    } else {
      setWeaponList(p => p.map(w => w.id === pendingPhotoTarget.id ? { ...w, photo: url } : w));
      toast.success("Firearm photo added");
    }
    setPendingPhotoTarget(null);
  }

  async function addRealEstate() {
    if (!authUser) return;
    if (!rForm.address) { toast.error("Address required"); return; }
    const row = {
      property_name: rForm.address, property_type: rForm.type || null, address: rForm.address,
      city: rForm.city || null, current_value: fromMoney(rForm.value),
      mortgage_balance: fromMoney(rForm.mortgage), mortgage_payment: fromMoney(rForm.mortgagePayment),
      title_holder: rForm.titleHolder || null, deed_location: rForm.deed || null,
      year_built: rForm.yearBuilt || null, sqft: rForm.sqft || null, bed_bath: rForm.bedBath || null,
      lot_size: rForm.lotSize || null, notes: rForm.notes || null, photo_url: rForm.photo || null,
      document_urls: rDoc ? [rDoc] : [],
    };
    const { error } = editingId !== null
      ? await tables.realEstate.update(String(editingId), row)
      : await tables.realEstate.add(authUser.id, row);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await reload();
    toast.success(`${rForm.address} ${editingId !== null ? "updated" : "added"}`);
    setRForm({ type:"", address:"", city:"", value:"", mortgage:"", mortgagePayment:"", titleHolder:"", deed:"", yearBuilt:"", sqft:"", bedBath:"", lotSize:"", notes:"", photo:"" });
    setRDoc(null); setEditingId(null); setShowAdd(null);
  }

  async function addVehicle() {
    if (!authUser) return;
    if (!vForm.make || !vForm.model) { toast.error("Make and model required"); return; }
    const row = {
      year: vForm.year || null, make: vForm.make, model: vForm.model, color: vForm.color || null,
      vin: vForm.vin || null, license_plate: vForm.plate || null, title_holder: vForm.title || null,
      loan_lender: vForm.lien || null, insurance_provider: vForm.insurance || null,
      registration_expiry: vForm.registration || null, current_value: fromMoney(vForm.value),
      notes: vForm.notes || null, photo_url: vForm.photo || null,
      document_urls: vDoc ? [vDoc] : [],
    };
    const { error } = editingId !== null
      ? await tables.vehicles.update(String(editingId), row)
      : await tables.vehicles.add(authUser.id, row);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await reload();
    toast.success(`${vForm.year} ${vForm.make} ${vForm.model} ${editingId !== null ? "updated" : "added"}`);
    setVForm({ year:"", make:"", model:"", color:"", vin:"", plate:"", title:"", lien:"", insurance:"", registration:"", value:"", notes:"", photo:"" });
    setVDoc(null); setEditingId(null); setShowAdd(null);
  }
  async function addDigital() {
    if (!authUser) return;
    if (!dForm.asset) { toast.error("Asset name required"); return; }
    const row = {
      asset_name: dForm.asset, asset_type: dForm.category || null, platform: dForm.platform || null,
      holdings: dForm.holdings || null, estimated_value: fromMoney(dForm.value),
      access_instructions: dForm.accessMethod || null, notes: dForm.notes || null,
    };
    const { error } = editingId !== null
      ? await tables.digitalAssets.update(String(editingId), row)
      : await tables.digitalAssets.add(authUser.id, row);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await reload();
    toast.success(`${dForm.asset} ${editingId !== null ? "updated" : "added"}`);
    setDForm({ category:"Cryptocurrency", platform:"", asset:"", holdings:"", value:"", accessMethod:"", notes:"" });
    setDDoc(null); setEditingId(null); setShowAdd(null);
  }
  async function addWeapon() {
    if (!authUser) return;
    if (!wForm.make) { toast.error("Make required"); return; }
    const row = {
      weapon_type: wForm.type, make: wForm.make, model: wForm.model || null, caliber: wForm.caliber || null,
      serial_number: wForm.serial || null, permit_number: wForm.registration || null,
      storage_location: wForm.storage || null, transfer_to: wForm.transfer || null,
      photo_url: wForm.photo || null, document_urls: wDoc ? [wDoc] : [],
    };
    const { error } = editingId !== null
      ? await tables.weapons.update(String(editingId), row)
      : await tables.weapons.add(authUser.id, row);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await reload();
    toast.success(`${wForm.make} ${wForm.model} ${editingId !== null ? "updated" : "added"}`);
    setWForm({ type:"Handgun", make:"", model:"", caliber:"", serial:"", registration:"", storage:"", transfer:"", photo:"" });
    setWDoc(null); setEditingId(null); setShowAdd(null);
  }

  async function addCollectible() {
    if (!authUser) return;
    if (!cForm.name) { toast.error("Item name required"); return; }
    const row = {
      item_name: cForm.name, category: cForm.category || null, condition: cForm.condition || null,
      current_value: fromMoney(cForm.estimatedValue), acquired_date: cForm.purchaseDate || null,
      acquired_from: cForm.purchasedFrom || null, intended_for: cForm.intendedFor || null,
      serial_number: cForm.serialNum || null, notes: cForm.notes || null, photo_url: cForm.photo || null,
      document_urls: cDoc ? [cDoc] : [],
    };
    const { error } = editingId !== null
      ? await tables.collectibles.update(String(editingId), row)
      : await tables.collectibles.add(authUser.id, row);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await reload();
    toast.success(`${cForm.name} ${editingId !== null ? "updated" : "added"}`);
    setCForm({ name:"", category:"Sports Cards", condition:"", estimatedValue:"", purchaseDate:"", purchasedFrom:"", intendedFor:"", serialNum:"", notes:"", photo:"" });
    setCDoc(null); setEditingId(null); setShowAdd(null);
  }

  async function addWeaponsLocker() {
    if (!authUser) return;
    if (!wlForm.make) { toast.error("Make required"); return; }
    // This tab is an inventory of bladed weapons, not a physical locker --
    // see the note in migration 015 about the original column shape.
    const row = {
      item_type: wlForm.type, make: wlForm.make, model: wlForm.model || null,
      blade: wlForm.blade || null, handle: wlForm.handle || null, location: wlForm.storage || null,
      transfer_to: wlForm.transfer || null, notes: wlForm.notes || null, photo_url: wlForm.photo || null,
      document_urls: wlDoc ? [wlDoc] : [],
    };
    const { error } = editingId !== null
      ? await tables.weaponsLocker.update(String(editingId), row)
      : await tables.weaponsLocker.add(authUser.id, row);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    await reload();
    toast.success(`${wlForm.make} ${wlForm.model} ${editingId !== null ? "updated" : "added"}`);
    setWlForm({ type:"Knife", make:"", model:"", blade:"", handle:"", storage:"", transfer:"", notes:"", photo:"" });
    setWlDoc(null); setEditingId(null); setShowAdd(null);
  }

  function editVehicle(v: any) {
    setVForm({ year:String(v.year), make:v.make, model:v.model, color:v.color, vin:v.vin, plate:v.plate, title:v.title, lien:v.lien, insurance:v.insurance, registration:v.registration, value:v.value, notes:v.notes, photo:(v as any).photo || "" });
    setEditingId(v.id);
    setShowAdd("vehicles");
  }
  function editRealEstate(r: any) {
    setRForm({ type:r.type, address:r.address, city:r.city, value:r.value, mortgage:r.mortgage, mortgagePayment:r.mortgagePayment, titleHolder:r.titleHolder, deed:r.deed, yearBuilt:r.yearBuilt, sqft:r.sqft, bedBath:r.bedBath, lotSize:r.lotSize, notes:r.notes, photo:r.photo });
    setEditingId(r.id);
    setShowAdd("realestate");
  }
  function editDigital(d: any) {
    setDForm({ category:d.category, platform:d.platform, asset:d.asset, holdings:d.holdings, value:d.value, accessMethod:d.accessMethod, notes:d.notes });
    setDDoc((d as any).attachedDoc || null);
    setEditingId(d.id);
    setShowAdd("digital");
  }
  function editWeapon(w: any) {
    setWForm({ type:w.type, make:w.make, model:w.model, caliber:w.caliber, serial:w.serial, registration:w.registration, storage:w.storage, transfer:w.transfer, photo:w.photo || "" });
    setEditingId(w.id);
    setShowAdd("weapons");
  }
  function editWeaponsLocker(w: any) {
    setWlForm({ type:w.type, make:w.make, model:w.model, blade:w.blade, handle:w.handle, storage:w.storage, transfer:w.transfer, notes:w.notes, photo:w.photo || "" });
    setEditingId(w.id);
    setShowAdd("weapons_locker");
  }
  function editCollectible(c: any) {
    setCForm({ name:c.name, category:c.category, condition:c.condition, estimatedValue:c.estimatedValue, purchaseDate:c.purchaseDate, purchasedFrom:c.purchasedFrom, intendedFor:c.intendedFor, serialNum:c.serialNum, notes:c.notes, photo:c.photo || "" });
    setEditingId(c.id);
    setShowAdd("collectibles");
  }

  function closeModal() {
    setShowAdd(null);
    setEditingId(null);
  }

  const COLLECTIBLE_CATEGORIES = ["Sports Cards","Coins / Currency","Stamps","Art / Paintings","Sculptures","Jewelry","Watches","Luxury Handbags","Rare Books","Vinyl / Music","Movie Memorabilia","Military Antiques","Musical Instruments","Wine / Whiskey","Toys / Action Figures","Other"];
  const WEAPON_LOCKER_TYPES = ["Knife","Hunting Knife","Pocket Knife","Sword","Katana","Dagger","Machete","Tactical Axe / Tomahawk","Antique Sword","Bayonet","Other Edged Weapon"];

  const tabs = [
    { id: "vehicles" as Tab,        label: "Vehicles",       icon: <Car size={14} /> },
    { id: "realestate" as Tab,      label: "Real Estate",    icon: <Home size={14} /> },
    { id: "digital" as Tab,         label: "Digital Assets", icon: <Bitcoin size={14} /> },
    { id: "weapons" as Tab,         label: "Firearms",       icon: <Lock size={14} /> },
    { id: "weapons_locker" as Tab,  label: "Weapons Locker", icon: <Sword size={14} /> },
    { id: "collectibles" as Tab,    label: "Collectibles",   icon: <Gem size={14} /> },
  ];

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div className="tile">
      <div className="tk">{label}</div>
      <div className="tv">{value}</div>
    </div>
  );

  return (
    <div className="fpd-passets">
      <style dangerouslySetInnerHTML={{ __html: PASSETS_CSS }} />
      <div className="fpd-passets-grain" />

      <div className="wrap">
        {/* ── Hero banner ── */}
        <div className="hbanner">
          <div className="art" style={{ backgroundImage: `linear-gradient(160deg, rgba(91,110,225,0.38), rgba(91,167,214,0.2)), url(${heroAssetsPhoto})` }} />
          <div className="scrim" />
          <div className="hcontent">
            <span className="heyebrow">Everything You Own, On Record</span>
            <h1>Vehicles, property, and valuables — <span className="accent">documented and secure.</span></h1>
            <p>From vehicles and real estate to digital assets and collectibles — keep the paperwork your family will need, all in one vault.</p>
            <div className="hactions">
              <button className="hbtn primary" onClick={() => setTab("vehicles")}>
                <Car size={15}/> View Vehicles
              </button>
              <button className="hbtn ghost" onClick={() => tabContentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                <Boxes size={15}/> View All Assets
              </button>
            </div>
          </div>
        </div>

        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Boxes size={12} /> Estate Inventory</div>
          <h1 className="pg-h1">Personal Assets</h1>
          <div className="pg-sub">Vehicles, real estate, digital assets, and firearms — all in one secure record.</div>
        </div>

        {/* ── Tabs ── */}
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div ref={tabContentRef}>
        {/* ── VEHICLES ── */}
        {tab === "vehicles" && (
          <div className="dlist">
            <div className="toolbar-end">
              <button className="btn-primary" onClick={() => setShowAdd("vehicles")}><Plus size={14} /> Add Vehicle</button>
            </div>
            {vehicleList.map(v => (
              <div key={v.id} className="card" style={{ overflow: "hidden" }}>
                {(v as any).photo && (
                  <div className="photo-frame" style={{ height: 200 }}>
                    <img src={(v as any).photo} alt={`${v.year} ${v.make} ${v.model}`} />
                  </div>
                )}
                <div className="pad" style={{ padding: 22 }}>
                  <div className="dtop">
                    <div className="dleft">
                      <div className="dico"><Car size={20} /></div>
                      <div>
                        <div className="dtype">{v.year} {v.make} {v.model}</div>
                        <div className="dsub">{v.color} · {v.plate}</div>
                      </div>
                    </div>
                    <div className="dvalue">
                      <div className="dvnum">{v.value}</div>
                      <div className="dvlbl">Est. Value</div>
                    </div>
                  </div>
                  <div className="dgrid">
                    <Field label="VIN" value={v.vin} />
                    <Field label="Title Holder" value={v.title} />
                    <Field label="Lien / Loan" value={v.lien} />
                    <Field label="Insurance" value={v.insurance} />
                    <Field label="Registration Exp." value={v.registration} />
                  </div>
                  {v.notes && <div className="notewarn">{v.notes}</div>}
                  <div className="dacts">
                    <button className="btn-sec" onClick={() => editVehicle(v)}><Edit2 size={12} /> Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REAL ESTATE ── */}
        {tab === "realestate" && (
          <div className="dlist">
            <div className="toolbar-end">
              <button className="btn-primary" onClick={() => setShowAdd("realestate")}><Plus size={14} /> Add Property</button>
            </div>
            {realEstateList.map(r => (
              <div key={r.id} className="card" style={{ overflow: "hidden" }}>
                <div className="photo-frame" style={{ height: r.photo ? 220 : 80 }}>
                  {r.photo ? (
                    <img src={r.photo} alt={r.address} />
                  ) : (
                    <div className="photo-empty">
                      <Home size={26} color="rgba(91,110,225,0.3)" />
                      <span>No photo — add one below</span>
                    </div>
                  )}
                  <button
                    className="photo-btn"
                    onClick={() => { setPendingPhotoTarget({ type: "realestate", id: r.id }); photoInputRef.current?.click(); }}
                  >
                    <Camera size={12} /> {r.photo ? "Change Photo" : "Add Photo"}
                  </button>
                </div>
                <div className="pad" style={{ padding: 22 }}>
                  <div className="dtop">
                    <div className="dleft">
                      <div className="dico"><Home size={20} /></div>
                      <div>
                        <div className="dtype">{r.type || "Property"}</div>
                        <div className="dsub">{r.address} · {r.city}</div>
                      </div>
                    </div>
                    <div className="dvalue">
                      <div className="dvnum">{r.value}</div>
                      <div className="dvlbl">Est. Value</div>
                    </div>
                  </div>
                  <div className="dgrid">
                    <Field label="Mortgage / Lender" value={r.mortgage} />
                    <Field label="Monthly Payment" value={r.mortgagePayment} />
                    <Field label="Title Holder" value={r.titleHolder} />
                    <Field label="Deed Recording" value={r.deed} />
                    <Field label="Year Built" value={r.yearBuilt} />
                    <Field label="Size" value={r.sqft} />
                    <Field label="Bed / Bath" value={r.bedBath} />
                    <Field label="Lot Size" value={r.lotSize} />
                  </div>
                  {r.notes && <div className="notewarn">{r.notes}</div>}
                  <div className="dacts">
                    <button className="btn-sec" onClick={() => editRealEstate(r)}><Edit2 size={12} /> Edit</button>
                    <ScanButton folder="property" onUpload={doc => toast.success(`"${doc.name}" added to ${r.address}`)} size="sm" label="Scan Document" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── DIGITAL ASSETS ── */}
        {tab === "digital" && (
          <div className="dlist">
            <div className="toolbar">
              <div className="banner neg">
                <Lock size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Cryptocurrency seed phrases are stored in your Secret Vault — never share them digitally.</span>
              </div>
              <button className="btn-primary" onClick={() => setShowAdd("digital")}><Plus size={14} /> Add Asset</button>
            </div>
            {digitalList.map(d => (
              <div key={d.id} className="card pad">
                <div className="dtop">
                  <div>
                    <span className="catbadge">{d.category.toUpperCase()}</span>
                    <div className="dtype" style={{ fontSize: 20 }}>{d.asset}</div>
                    <div className="dsub">{d.platform}</div>
                  </div>
                  <div className="dvnum" style={{ fontSize: 19 }}>{d.value}</div>
                </div>
                <div className="dgrid two">
                  <Field label="Holdings" value={d.holdings} />
                  <Field label="Access Method" value={d.accessMethod} />
                </div>
                {d.notes && <div className="noteitalic">{d.notes}</div>}
                {(d as any).attachedDoc && <div className="notemuted">📄 {(d as any).attachedDoc}</div>}
                <div className="dacts">
                  <button className="btn-sec" onClick={() => editDigital(d)}><Edit2 size={12} /> Edit</button>
                  <ScanButton folder="digital" onUpload={doc => { setDigitalList(p => p.map(x => x.id === d.id ? { ...x, attachedDoc: doc.name } : x)); toast.success(`"${doc.name}" linked to ${d.asset}`); }} size="sm" label="Scan Document" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── FIREARMS ── */}
        {tab === "weapons" && (
          <div className="dlist">
            <div className="toolbar">
              <div className="banner warn">
                <span>All firearms must be transferred according to California DOJ regulations. Consult an attorney before transfer.</span>
              </div>
              <button className="btn-primary" onClick={() => setShowAdd("weapons")}><Plus size={14} /> Add Firearm</button>
            </div>
            {weaponList.map(w => (
              <div key={w.id} className="card" style={{ overflow: "hidden" }}>
                <div className="photo-frame" style={{ height: w.photo ? 200 : 72 }}>
                  {w.photo ? (
                    <img src={w.photo} alt={`${w.make} ${w.model}`} />
                  ) : (
                    <div className="photo-empty" style={{ flexDirection: "row" }}>
                      <Image size={18} color="rgba(91,110,225,0.25)" />
                      <span>No photo</span>
                    </div>
                  )}
                  <button
                    className="photo-btn"
                    onClick={() => { setPendingPhotoTarget({ type: "weapon", id: w.id }); photoInputRef.current?.click(); }}
                  >
                    <Camera size={12} /> {w.photo ? "Change Photo" : "Add Photo"}
                  </button>
                </div>
                <div className="pad" style={{ padding: 22 }}>
                  <div className="dtop" style={{ alignItems: "center" }}>
                    <div className="dleft" style={{ alignItems: "center" }}>
                      <div className="dtype" style={{ marginBottom: 0 }}>{w.make} {w.model}</div>
                      <span className="dbadge type">{w.type}</span>
                      <span className="dsub">{w.caliber}</span>
                    </div>
                  </div>
                  <div className="dgrid two">
                    <Field label="Serial Number" value={w.serial} />
                    <Field label="Registration" value={w.registration} />
                    <Field label="Storage Location" value={w.storage} />
                    <Field label="Transfer Instructions" value={w.transfer} />
                  </div>
                  <div className="dacts">
                    <button className="btn-sec" onClick={() => editWeapon(w)}><Edit2 size={12} /> Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── WEAPONS LOCKER ── */}
        {tab === "weapons_locker" && (
          <div className="dlist">
            <div className="toolbar">
              <div className="banner warn">
                <span>Non-firearm bladed weapons and edged tools. Consult your estate attorney regarding transfer and legal requirements by state.</span>
              </div>
              <button className="btn-primary" onClick={() => setShowAdd("weapons_locker")}><Plus size={14} /> Add Item</button>
            </div>
            {weaponsLockerList.map(w => (
              <div key={w.id} className="card" style={{ overflow: "hidden" }}>
                {(w as any).photo && (
                  <div className="photo-frame" style={{ height: 180 }}>
                    <img src={(w as any).photo} alt={`${w.make} ${w.model}`} />
                  </div>
                )}
                <div className="pad" style={{ padding: 22 }}>
                  <div className="dtop">
                    <div className="dleft">
                      <div className="dico"><Sword size={18} /></div>
                      <div>
                        <div className="dtype">{w.make} {w.model}</div>
                        <span className="dbadge type">{w.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="dgrid two">
                    {[["Blade / Edge", w.blade], ["Handle / Grip", w.handle], ["Storage Location", w.storage], ["Transfer Instructions", w.transfer]].map(([label, value]) => (
                      <Field key={label as string} label={label as string} value={(value as string) || "—"} />
                    ))}
                  </div>
                  {(w as any).notes && <div className="notewarn">{(w as any).notes}</div>}
                  <div className="dacts">
                    <button className="btn-sec" onClick={() => editWeaponsLocker(w)}><Edit2 size={12} /> Edit</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── COLLECTIBLES ── */}
        {tab === "collectibles" && (
          <div className="dlist">
            <div className="toolbar-end">
              <button className="btn-primary" onClick={() => setShowAdd("collectibles")}><Plus size={14} /> Add Collectible</button>
            </div>
            {collectiblesList.map(c => (
              <div key={c.id} className="card" style={{ overflow: "hidden" }}>
                {c.photo && (
                  <div className="photo-frame" style={{ height: 220 }}>
                    <img src={c.photo} alt={c.name} />
                  </div>
                )}
                <div className="pad" style={{ padding: 22 }}>
                  <div className="dtop">
                    <div>
                      <span className="catbadge">{c.category.toUpperCase()}</span>
                      <div className="dtype" style={{ fontSize: 20 }}>{c.name}</div>
                    </div>
                    <div className="dvalue">
                      <div className="dvnum">{c.estimatedValue}</div>
                      <div className="dvlbl">Est. Value</div>
                    </div>
                  </div>
                  <div className="dgrid two">
                    {[["Condition", c.condition || "—"], ["Purchased From", c.purchasedFrom || "—"], ["Purchase Date", c.purchaseDate || "—"], ["Serial / Cert #", c.serialNum || "—"], ["Intended For", c.intendedFor || "—"]].map(([label, value]) => (
                      <Field key={label as string} label={label as string} value={value as string} />
                    ))}
                  </div>
                  {c.notes && <div className="noteinfo">{c.notes}</div>}
                  <div className="dacts">
                    <button className="btn-sec" onClick={() => editCollectible(c)}><Edit2 size={12} /> Edit</button>
                    <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" linked to ${c.name}`)} size="sm" label="Attach Document" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* Add Vehicle Modal */}
        {showAdd === "vehicles" && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Vehicle" : "Add Vehicle"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={vForm.photo} onChange={url => setVForm(p => ({ ...p, photo: url }))} label="Vehicle Photo" aspectRatio="16/9" />
                {([["Year", "year", "2024"], ["Make", "make", "e.g. Toyota"], ["Model", "model", "e.g. Camry"], ["Color", "color", "e.g. Silver"], ["VIN", "vin", "Vehicle ID number"], ["License Plate", "plate", "e.g. 7ABC123 CA"], ["Title Holder", "title", "Name on title"], ["Lien / Loan", "lien", "e.g. None or lender name"], ["Insurance", "insurance", "Provider — Policy #"], ["Registration Exp.", "registration", "e.g. Dec 2027"], ["Estimated Value", "value", "e.g. $28,000"], ["Notes", "notes", "Any special instructions"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(vForm as any)[key]} onChange={e => setVForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={vDoc} onChange={setVDoc} folder="vehicles" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (title, registration, insurance)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addVehicle}>{editingId !== null ? "Save Changes" : "Add Vehicle"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Digital Asset Modal */}
        {showAdd === "digital" && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Digital Asset" : "Add Digital Asset"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label>Category</label>
                  <select value={dForm.category} onChange={e => setDForm(p => ({ ...p, category: e.target.value }))}>
                    {["Cryptocurrency", "Online Accounts", "Domain Names", "Social Media", "Investment Accounts", "Other"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {([["Platform", "platform", "e.g. Coinbase, Google, GoDaddy"], ["Asset / Account Name", "asset", "e.g. Bitcoin (BTC) or email@gmail.com"], ["Holdings", "holdings", "e.g. 0.5 BTC or 15 GB"], ["Estimated Value", "value", "e.g. ~$35,000"], ["Access Method", "accessMethod", "e.g. Seed phrase in Secret Vault"], ["Notes", "notes", "Optional"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(dForm as any)[key]} onChange={e => setDForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={dDoc} onChange={setDDoc} folder="digital" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (account statement, ownership record)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addDigital}>{editingId !== null ? "Save Changes" : "Add Asset"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Firearm Modal */}
        {showAdd === "weapons" && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Firearm Record" : "Add Firearm Record"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={wForm.photo} onChange={url => setWForm(p => ({ ...p, photo: url }))} label="Firearm Photo" aspectRatio="4/3" />
                <div className="field">
                  <label>Type</label>
                  <select value={wForm.type} onChange={e => setWForm(p => ({ ...p, type: e.target.value }))}>
                    {["Handgun", "Rifle", "Shotgun", "Other"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {([["Make", "make", "e.g. Glock, Ruger"], ["Model", "model", "e.g. 19 Gen 5"], ["Caliber", "caliber", "e.g. 9mm, .22 LR"], ["Serial Number", "serial", ""], ["Registration", "registration", "e.g. CA DOJ Registered"], ["Storage Location", "storage", "Where it is stored"], ["Transfer Instructions", "transfer", "Who receives it per your will"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(wForm as any)[key]} onChange={e => setWForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={wDoc} onChange={setWDoc} folder="firearms" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (registration, purchase receipt)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addWeapon}>{editingId !== null ? "Save Changes" : "Add Firearm"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Real Estate Modal */}
        {showAdd === "realestate" && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Property" : "Add Property"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={rForm.photo} onChange={url => setRForm(p => ({ ...p, photo: url }))} label="Property Photo" aspectRatio="16/9" />
                {([
                  ["Property Type", "type", "e.g. Primary Residence, Rental, Vacation Home"],
                  ["Street Address *", "address", "e.g. 123 Main Street"],
                  ["City, State, ZIP", "city", "e.g. Sacramento, CA 95825"],
                  ["Estimated Value", "value", "e.g. $450,000"],
                  ["Mortgage / Lender", "mortgage", "e.g. Wells Fargo or None"],
                  ["Monthly Payment", "mortgagePayment", "e.g. $1,800/month"],
                  ["Title Holder", "titleHolder", "Name(s) on title"],
                  ["Deed Recording", "deed", "e.g. Recorded — Sacramento County"],
                  ["Year Built", "yearBuilt", "e.g. 2002"],
                  ["Square Footage", "sqft", "e.g. 1,850 sq ft"],
                  ["Bed / Bath", "bedBath", "e.g. 3 bed / 2 bath"],
                  ["Lot Size", "lotSize", "e.g. 0.15 acres"],
                  ["Notes", "notes", "Special instructions, key locations, etc."],
                ] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(rForm as any)[key]} onChange={e => setRForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={rDoc} onChange={setRDoc} folder="property" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (deed, mortgage statement, title)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addRealEstate}>{editingId !== null ? "Save Changes" : "Add Property"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Weapons Locker Modal */}
        {showAdd === "weapons_locker" && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Weapons Locker Item" : "Add to Weapons Locker"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={wlForm.photo} onChange={url => setWlForm(p => ({ ...p, photo: url }))} label="Photo of Item" aspectRatio="4/3" />
                <div className="field">
                  <label>Item Type</label>
                  <select value={wlForm.type} onChange={e => setWlForm(p => ({ ...p, type: e.target.value }))}>
                    {WEAPON_LOCKER_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {([["Make / Brand", "make", "e.g. Buck Knives, Cold Steel"], ["Model Name", "model", "e.g. 110 Folding Hunter"], ["Blade / Edge Description", "blade", "e.g. 3.75 inch clip point, stainless"], ["Handle / Grip", "handle", "e.g. Wood, G10, bone"], ["Storage Location", "storage", "Where it is kept"], ["Transfer Instructions", "transfer", "Who receives it per your will"], ["Notes", "notes", "Provenance, history, appraisal"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(wlForm as any)[key]} onChange={e => setWlForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={wlDoc} onChange={setWlDoc} folder="weapons_locker" sectionId="weapons_locker" sectionLabel="Weapons Locker" label="Attach Document (appraisal, provenance, receipt)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addWeaponsLocker}>{editingId !== null ? "Save Changes" : "Add to Locker"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Collectible Modal */}
        {showAdd === "collectibles" && (
          <div className="backdrop">
            <div className="card modal">
              <div className="modal-head">
                <h3>{editingId !== null ? "Edit Collectible" : "Add Collectible"}</h3>
                <button onClick={closeModal}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={cForm.photo} onChange={url => setCForm(p => ({ ...p, photo: url }))} label="Photo of Item" aspectRatio="4/3" />
                <div className="field">
                  <label>Category</label>
                  <select value={cForm.category} onChange={e => setCForm(p => ({ ...p, category: e.target.value }))}>
                    {COLLECTIBLE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {([["Item Name *", "name", "e.g. 1952 Topps Mickey Mantle Rookie Card"], ["Condition", "condition", "e.g. VG+, Mint, PSA 7"], ["Estimated Value", "estimatedValue", "e.g. $38,000"], ["Purchase Date", "purchaseDate", "e.g. Mar 2009"], ["Purchased From", "purchasedFrom", "e.g. Heritage Auctions"], ["Serial / Certificate #", "serialNum", "e.g. PSA grading number"], ["Intended For", "intendedFor", "Who gets this item — or sell/donate"], ["Notes", "notes", "Provenance, storage, authentication details"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(cForm as any)[key]} onChange={e => setCForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
                <AttachDocumentField value={cDoc} onChange={setCDoc} folder="personal" sectionId="collectibles" sectionLabel="Collectibles" label="Attach Document (appraisal, certificate of authenticity)" />
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addCollectible}>{editingId !== null ? "Save Changes" : "Add Collectible"}</button>
                <button className="btn-sec" onClick={closeModal}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input for property & firearm photos */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) { uploadPhoto(e.target.files[0]); e.target.value = ""; } }}
        />
      </div>
    </div>
  );
}
