import React, { useState, useRef } from "react";
import { Car, Zap, Lock, Bitcoin, Plus, Edit2, Trash2, Key, X, Home, Camera, Image, Gem, Sword, Boxes } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { AttachDocumentField } from "./AttachDocumentField";

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

type Tab = "vehicles" | "realestate" | "utilities" | "digital" | "weapons" | "weapons_locker" | "collectibles";

const vehicles = [
  { id: 1, year: 2021, make: "Toyota", model: "Camry XSE", color: "Midnight Black", vin: "4T1BZ1HK8MU024891", plate: "7KBH421 CA", title: "James Doe", lien: "None — Owned free & clear", insurance: "GEICO — Policy GI-293847-CA", registration: "Exp. Dec 2026", value: "$28,400", notes: "Primary vehicle. Keys in kitchen drawer." },
  { id: 2, year: 1967, make: "Ford", model: "Mustang Fastback", color: "Candy Apple Red", vin: "7F02S100433", plate: "CLASIC67 CA", title: "James Doe", lien: "None", insurance: "Hagerty Collector — Policy HG-88421", registration: "Exp. Mar 2027", value: "$68,000", notes: "Do NOT sell. Bequeathed to Michael Doe per will." },
];

const utilities = [
  { id: 1, service: "Electricity", provider: "SMUD", accountNum: "SMUD-9284-01", phone: "(916) 452-3211", website: "smud.org", autopay: true, monthlyAvg: "$142", notes: "" },
  { id: 2, service: "Natural Gas", provider: "PG&E", accountNum: "PGE-481-2291-X", phone: "1-800-743-5000", website: "pge.com", autopay: true, monthlyAvg: "$68", notes: "" },
  { id: 3, service: "Internet", provider: "AT&T Fiber", accountNum: "ATT-882-4291", phone: "1-800-288-2020", website: "att.com", autopay: true, monthlyAvg: "$65", notes: "1 Gig plan. Router in home office closet." },
  { id: 4, service: "Water / Sewer", provider: "Sacramento Water District", accountNum: "SWD-2941-B", phone: "(916) 808-5454", website: "cityofsacramento.org", autopay: false, monthlyAvg: "$88", notes: "Bill arrives first of month." },
  { id: 5, service: "Trash Collection", provider: "Republic Services", accountNum: "RS-4821-SAC", phone: "1-800-237-9840", website: "republicservices.com", autopay: true, monthlyAvg: "$44", notes: "Pickup Tuesdays." },
  { id: 6, service: "HOA", provider: "Oak Ridge HOA", accountNum: "ORHA-29", phone: "(916) 555-0192", website: "oakridgehoa.com", autopay: false, monthlyAvg: "$220", notes: "Quarterly billing — $660/quarter." },
];

const digitalAssets = [
  { id: 1, category: "Cryptocurrency", platform: "Coinbase", asset: "Bitcoin (BTC)", holdings: "0.84 BTC", value: "~$58,200", accessMethod: "Seed phrase stored in Secret Vault", walletAddress: "bc1q...8f2k (full address in vault)", notes: "Do NOT share seed phrase digitally." },
  { id: 2, category: "Cryptocurrency", platform: "Coinbase", asset: "Ethereum (ETH)", holdings: "4.2 ETH", value: "~$14,100", accessMethod: "Same Coinbase account as BTC", walletAddress: "0x8f2k...a91b (full in vault)", notes: "" },
  { id: 3, category: "Online Accounts", platform: "Google Account", asset: "james.doe@gmail.com", holdings: "25 GB Drive Storage", value: "Inactive Memorial Policy", accessMethod: "Password in Password Manager", walletAddress: "N/A", notes: "Designate as memorial account via Google's Inactive Account Manager." },
  { id: 4, category: "Domain Names", platform: "GoDaddy", asset: "doephotography.com", holdings: "Domain + Hosting", value: "$120/year", accessMethod: "GoDaddy login in Password Manager", walletAddress: "N/A", notes: "Transfer to Michael Doe or let expire." },
  { id: 5, category: "Social Media", platform: "Instagram", asset: "@doewildlife", holdings: "42,000 followers", value: "Photography portfolio", accessMethod: "Password in Password Manager", walletAddress: "N/A", notes: "Memorialize or transfer to Michael Doe." },
];

const realEstateInit = [
  { id:1, type:"Primary Residence", address:"1842 Oak Ridge Drive", city:"Sacramento, CA 95825", value:"$485,000", mortgage:"Wells Fargo — Balance: $201,400", mortgagePayment:"$1,842/month", titleHolder:"James & Sarah Doe", deed:"Recorded — Sacramento County", yearBuilt:"1998", sqft:"2,240 sq ft", bedBath:"4 bed / 2.5 bath", lotSize:"0.18 acres", notes:"Paid off 2034. Keys: main + spare in kitchen drawer.", photo:"" },
  { id:2, type:"Rental Property", address:"524 Elm Street", city:"Roseville, CA 95678", value:"$320,000", mortgage:"None — Owned free & clear", mortgagePayment:"N/A", titleHolder:"James Doe", deed:"Recorded — Placer County", yearBuilt:"2005", sqft:"1,480 sq ft", bedBath:"3 bed / 2 bath", lotSize:"0.12 acres", notes:"Rented — $1,800/month income. Tenant lease expires Dec 2026.", photo:"" },
];

const weapons = [
  { id: 1, type: "Handgun", make: "Glock", model: "19 Gen 5", caliber: "9mm", serial: "BKPL241", registration: "CA DOJ Registered — #CA-2019-882941", storage: "Gun safe — master bedroom closet, combination: in Secret Vault", transfer: "Transfer to Michael Doe per will. Must follow CA transfer laws.", photo:"" },
  { id: 2, type: "Rifle", make: "Ruger", model: "10/22", caliber: ".22 LR", serial: "249-48821", registration: "CA DOJ Registered — #CA-2021-441892", storage: "Gun safe — same as above", transfer: "Transfer to Michael Doe per will.", photo:"" },
];

const collectiblesInit = [
  { id:1, name:"1952 Topps Mickey Mantle Rookie Card", category:"Sports Cards", condition:"VG+", estimatedValue:"$38,000", purchaseDate:"Mar 2009", purchasedFrom:"Heritage Auctions, New York", intendedFor:"Michael Doe (Son) — per will", serialNum:"", notes:"PSA graded VG+ 4.5. Stored in acid-free sleeve inside the fireproof safe.", photo:"" },
  { id:2, name:"Louis Vuitton Speedy 35 (Limited Edition 2006)", category:"Luxury Handbags", condition:"Excellent", estimatedValue:"$2,800", purchaseDate:"Jun 2006", purchasedFrom:"Louis Vuitton Flagship, San Francisco", intendedFor:"Emily Doe (Daughter)", serialNum:"LV-SP35-2006-0482", notes:"Original dust bag and box stored in hall closet. Authenticate before selling.", photo:"" },
  { id:3, name:"1964 Fender Stratocaster (Sunburst)", category:"Musical Instruments", condition:"Good — original hardware", estimatedValue:"$22,000", purchaseDate:"Nov 2002", purchasedFrom:"Guitar Center Vintage — Los Angeles", intendedFor:"Michael Doe (Son) — musician", serialNum:"L58291", notes:"Original case. Has been played — minor fret wear. Certificate of authenticity in Legacy Vault.", photo:"" },
  { id:4, name:"18k Gold Rolex Submariner (Ref. 116618LB)", category:"Watches", condition:"Excellent", estimatedValue:"$45,000", purchaseDate:"Dec 2015", purchasedFrom:"Shreve & Co., San Francisco", intendedFor:"Sell — proceeds to grandchildren's education fund", serialNum:"RSW-G882N1", notes:"Blue dial, ceramic bezel. Box and papers included. Serviced 2022.", photo:"" },
];

const weaponsLockerInit = [
  { id:1, type:"Hunting Knife", make:"Buck Knives", model:"110 Folding Hunter", blade:"3.75 inch clip point, 420HC steel", handle:"Genuine ebony wood with brass bolsters", storage:"Leather sheath — displayed in home office", transfer:"Michael Doe per will", notes:"Grandfather's knife — sentimental value. Purchased 1968.", photo:"" },
  { id:2, type:"Katana", make:"Unknown Maker (Edo period)", model:"Antique Japanese Katana", blade:"28 inch hand-forged tamahagane steel", handle:"Traditional tsuka with ray skin wrap", storage:"Custom wall mount — home office. NOT for handling.", transfer:"Estate auction — contact Bonhams Asian Art Division", notes:"Appraised 2021 at $12,000–$18,000. Authentication certificate in Legacy Vault. DO NOT separate from saya.", photo:"" },
  { id:3, type:"Tactical Tomahawk", make:"SOG", model:"Fasthawk", blade:"2.75 inch 420 stainless", handle:"GRN reinforced polymer", storage:"Canvas roll bag — garage cabinet", transfer:"Michael Doe", notes:"Camping / utility tool.", photo:"" },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-passets so nothing else in the app is affected. */
const PASSETS_CSS = `
.fpd-passets{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-passets *{box-sizing:border-box;}
.fpd-passets-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-passets .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-passets .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-passets .card.pad{padding:22px;}
.fpd-passets .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-passets .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-passets .pg-sub{color:${MUTED};font-size:13px;max-width:660px;line-height:1.6;}
.fpd-passets .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-passets .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-passets .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* segmented tabs */
.fpd-passets .seg{display:flex;gap:3px;padding:3px;border-radius:12px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);width:fit-content;flex-wrap:wrap;}
.fpd-passets .seg button{display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:9px;font-size:12.5px;font-weight:600;color:${MUTED};background:none;border:none;cursor:pointer;font-family:var(--font-body);transition:color .18s,background .18s;}
.fpd-passets .seg button.on{background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;box-shadow:0 6px 16px -8px rgba(91,110,225,0.8);}

.fpd-passets .toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;}
.fpd-passets .toolbar-end{display:flex;justify-content:flex-end;}

/* alert banners */
.fpd-passets .banner{display:flex;align-items:flex-start;gap:10px;padding:13px 16px;border-radius:12px;font-size:12.5px;line-height:1.6;flex:1;min-width:220px;}
.fpd-passets .banner.warn{background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.24);color:${WARN};}
.fpd-passets .banner.neg{background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.24);color:${NEG};}

/* record cards */
.fpd-passets .dlist{display:flex;flex-direction:column;gap:14px;}
.fpd-passets .dtop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px;}
.fpd-passets .dleft{display:flex;align-items:flex-start;gap:14px;min-width:0;}
.fpd-passets .dico{width:44px;height:44px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.24);color:${ACCENT2};}
.fpd-passets .dtype{font-family:var(--font-display);font-size:17px;color:${TEXT};font-weight:600;margin-bottom:3px;letter-spacing:-0.01em;}
.fpd-passets .dsub{color:${MUTED};font-size:12.5px;}
.fpd-passets .dvalue{text-align:right;flex-shrink:0;}
.fpd-passets .dvnum{font-family:var(--font-display);font-size:19px;font-weight:700;color:${POS};letter-spacing:-0.01em;line-height:1.2;}
.fpd-passets .dvlbl{color:${MUTED};font-size:11px;margin-top:2px;}
.fpd-passets .dright{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.fpd-passets .damt{font-family:var(--font-mono);color:${ACCENT2};font-size:14px;font-weight:700;white-space:nowrap;}
.fpd-passets .damt span{color:${MUTED};font-weight:500;font-size:11px;}

.fpd-passets .dbadge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:99px;font-family:var(--font-mono);font-size:10px;font-weight:700;letter-spacing:0.04em;flex-shrink:0;}
.fpd-passets .dbadge.type{background:rgba(91,110,225,0.12);color:${ACCENT2};}
.fpd-passets .dbadge.autopay{background:rgba(95,190,145,0.14);color:${POS};}
.fpd-passets .catbadge{display:inline-block;padding:3px 9px;border-radius:6px;font-family:var(--font-mono);font-size:10px;letter-spacing:0.04em;background:rgba(91,110,225,0.12);color:${ACCENT2};margin-bottom:9px;}

.fpd-passets .dgrid{display:grid;grid-template-columns:repeat(3,1fr);border-radius:11px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);overflow:hidden;margin-bottom:4px;}
.fpd-passets .dgrid.two{grid-template-columns:repeat(2,1fr);}
.fpd-passets .dgrid:not(.two) .tile:nth-child(3n+2),.fpd-passets .dgrid:not(.two) .tile:nth-child(3n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-passets .dgrid:not(.two) .tile:nth-child(n+4){border-top:1px solid rgba(255,255,255,0.22);}
.fpd-passets .dgrid.two .tile:nth-child(2n){border-left:1px solid rgba(255,255,255,0.22);}
.fpd-passets .dgrid.two .tile:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}
.fpd-passets .tile{padding:12px 14px;}
.fpd-passets .tile .tk{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};margin-bottom:5px;}
.fpd-passets .tile .tv{color:${TEXT};font-size:13px;line-height:1.5;}
@media (max-width:760px){
.fpd-passets .dgrid,.fpd-passets .dgrid.two{grid-template-columns:1fr;}
.fpd-passets .dgrid:not(.two) .tile:nth-child(3n+2),.fpd-passets .dgrid:not(.two) .tile:nth-child(3n){border-left:none;}
.fpd-passets .dgrid.two .tile:nth-child(2n){border-left:none;}
.fpd-passets .dgrid .tile:nth-child(n+2){border-top:1px solid rgba(255,255,255,0.22);}
}

.fpd-passets .notewarn{padding:12px 14px;border-radius:11px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.22);color:${WARN};font-size:12.5px;line-height:1.6;margin-top:12px;}
.fpd-passets .noteinfo{padding:12px 14px;border-radius:11px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.22);color:${ACCENT2};font-size:12.5px;line-height:1.6;margin-top:12px;}
.fpd-passets .notemuted{color:${MUTED};font-size:12px;margin-top:10px;line-height:1.6;}
.fpd-passets .noteitalic{color:${MUTED};font-size:12px;margin-top:10px;font-style:italic;line-height:1.6;}
.fpd-passets .dacts{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px;}

/* photo frame */
.fpd-passets .photo-frame{position:relative;background:#0F1624;border-bottom:1px solid rgba(255,255,255,0.22);overflow:hidden;}
.fpd-passets .photo-frame img{width:100%;height:100%;object-fit:cover;display:block;}
.fpd-passets .photo-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:7px;color:${MUTED};font-size:12px;}
.fpd-passets .photo-btn{position:absolute;bottom:10px;right:10px;display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:9px;background:rgba(5,8,14,0.65);backdrop-filter:blur(6px);color:#fff;font-size:11.5px;font-weight:600;border:none;cursor:pointer;font-family:var(--font-body);}

/* modal */
.fpd-passets .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-passets .modal{width:100%;max-width:540px;max-height:90vh;overflow-y:auto;}
.fpd-passets .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-passets .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-passets .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-passets .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-passets .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-passets .field input,.fpd-passets .field select,.fpd-passets .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-passets .field input::placeholder,.fpd-passets .field textarea::placeholder{color:${FAINT};}
.fpd-passets .field input:focus,.fpd-passets .field select:focus,.fpd-passets .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-passets .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-passets .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-passets .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function PersonalAssets() {
  const [tab, setTab] = useState<Tab>("vehicles");
  const [vehicleList, setVehicleList] = useState(vehicles);
  const [realEstateList, setRealEstateList] = useState(realEstateInit);
  const [utilityList, setUtilityList] = useState(utilities);
  const [digitalList, setDigitalList] = useState(digitalAssets);
  const [weaponList, setWeaponList] = useState(weapons);
  const [collectiblesList, setCollectiblesList] = useState(collectiblesInit);
  const [weaponsLockerList, setWeaponsLockerList] = useState(weaponsLockerInit);
  const [showAdd, setShowAdd] = useState<Tab | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [pendingPhotoTarget, setPendingPhotoTarget] = useState<{type:"realestate"|"weapon"; id:number}|null>(null);

  const [vForm, setVForm] = useState({ year:"", make:"", model:"", color:"", vin:"", plate:"", title:"", lien:"", insurance:"", registration:"", value:"", notes:"", photo:"" });
  const [vDoc, setVDoc] = useState<string|null>(null);
  const [rForm, setRForm] = useState({ type:"", address:"", city:"", value:"", mortgage:"", mortgagePayment:"", titleHolder:"", deed:"", yearBuilt:"", sqft:"", bedBath:"", lotSize:"", notes:"", photo:"" });
  const [rDoc, setRDoc] = useState<string|null>(null);
  const [uForm, setUForm] = useState({ service:"", provider:"", accountNum:"", phone:"", website:"", monthlyAvg:"", notes:"" });
  const [dForm, setDForm] = useState({ category:"Cryptocurrency", platform:"", asset:"", holdings:"", value:"", accessMethod:"", notes:"" });
  const [wForm, setWForm] = useState({ type:"Handgun", make:"", model:"", caliber:"", serial:"", registration:"", storage:"", transfer:"", photo:"" });
  const [wDoc, setWDoc] = useState<string|null>(null);
  const [cForm, setCForm] = useState({ name:"", category:"Sports Cards", condition:"", estimatedValue:"", purchaseDate:"", purchasedFrom:"", intendedFor:"", serialNum:"", notes:"", photo:"" });
  const [cDoc, setCDoc] = useState<string|null>(null);
  const [wlForm, setWlForm] = useState({ type:"Knife", make:"", model:"", blade:"", handle:"", storage:"", transfer:"", notes:"", photo:"" });
  const [wlDoc, setWlDoc] = useState<string|null>(null);

  function uploadPhoto(file: File) {
    if (!pendingPhotoTarget) return;
    const url = URL.createObjectURL(file);
    if (pendingPhotoTarget.type === "realestate") {
      setRealEstateList(p => p.map(r => r.id === pendingPhotoTarget.id ? { ...r, photo: url } : r));
      toast.success("Property photo added");
    } else {
      setWeaponList(p => p.map(w => w.id === pendingPhotoTarget.id ? { ...w, photo: url } : w));
      toast.success("Firearm photo added");
    }
    setPendingPhotoTarget(null);
  }

  function addRealEstate() {
    if (!rForm.address) { toast.error("Address required"); return; }
    setRealEstateList(p => [...p, { id:Date.now(), type:rForm.type||"Property", address:rForm.address, city:rForm.city, value:rForm.value||"—", mortgage:rForm.mortgage||"—", mortgagePayment:rForm.mortgagePayment||"—", titleHolder:rForm.titleHolder, deed:rForm.deed, yearBuilt:rForm.yearBuilt, sqft:rForm.sqft, bedBath:rForm.bedBath, lotSize:rForm.lotSize, notes:rForm.notes, photo:rForm.photo }]);
    toast.success(`${rForm.address} added`);
    setRForm({ type:"", address:"", city:"", value:"", mortgage:"", mortgagePayment:"", titleHolder:"", deed:"", yearBuilt:"", sqft:"", bedBath:"", lotSize:"", notes:"", photo:"" });
    setShowAdd(null);
  }

  function addVehicle() {
    if (!vForm.make || !vForm.model) { toast.error("Make and model required"); return; }
    setVehicleList(p => [...p, { id:Date.now(), year:Number(vForm.year)||new Date().getFullYear(), make:vForm.make, model:vForm.model, color:vForm.color, vin:vForm.vin, plate:vForm.plate, title:vForm.title, lien:vForm.lien||"None", insurance:vForm.insurance, registration:vForm.registration, value:vForm.value||"—", notes:vForm.notes, photo:vForm.photo }]);
    toast.success(`${vForm.year} ${vForm.make} ${vForm.model} added`);
    setVForm({ year:"", make:"", model:"", color:"", vin:"", plate:"", title:"", lien:"", insurance:"", registration:"", value:"", notes:"", photo:"" });
    setShowAdd(null);
  }
  function addUtility() {
    if (!uForm.service || !uForm.provider) { toast.error("Service and provider required"); return; }
    setUtilityList(p => [...p, { id:Date.now(), service:uForm.service, provider:uForm.provider, accountNum:uForm.accountNum, phone:uForm.phone, website:uForm.website, autopay:false, monthlyAvg:uForm.monthlyAvg||"$0", notes:uForm.notes }]);
    toast.success(`${uForm.service} — ${uForm.provider} added`);
    setUForm({ service:"", provider:"", accountNum:"", phone:"", website:"", monthlyAvg:"", notes:"" });
    setShowAdd(null);
  }
  function addDigital() {
    if (!dForm.asset) { toast.error("Asset name required"); return; }
    setDigitalList(p => [...p, { id:Date.now(), category:dForm.category, platform:dForm.platform, asset:dForm.asset, holdings:dForm.holdings, value:dForm.value||"—", accessMethod:dForm.accessMethod, walletAddress:"—", notes:dForm.notes }]);
    toast.success(`${dForm.asset} added`);
    setDForm({ category:"Cryptocurrency", platform:"", asset:"", holdings:"", value:"", accessMethod:"", notes:"" });
    setShowAdd(null);
  }
  function addWeapon() {
    if (!wForm.make || !wForm.model) { toast.error("Make and model required"); return; }
    setWeaponList(p => [...p, { id:Date.now(), type:wForm.type, make:wForm.make, model:wForm.model, caliber:wForm.caliber, serial:wForm.serial, registration:wForm.registration, storage:wForm.storage, transfer:wForm.transfer, photo:wForm.photo }]);
    toast.success(`${wForm.make} ${wForm.model} added`);
    setWForm({ type:"Handgun", make:"", model:"", caliber:"", serial:"", registration:"", storage:"", transfer:"", photo:"" });
    setShowAdd(null);
  }

  function addCollectible() {
    if (!cForm.name) { toast.error("Item name required"); return; }
    setCollectiblesList(p => [...p, { id:Date.now(), name:cForm.name, category:cForm.category, condition:cForm.condition, estimatedValue:cForm.estimatedValue||"—", purchaseDate:cForm.purchaseDate, purchasedFrom:cForm.purchasedFrom, intendedFor:cForm.intendedFor, serialNum:cForm.serialNum, notes:cForm.notes, photo:cForm.photo }]);
    toast.success(`"${cForm.name}" added to Collectibles`);
    setCForm({ name:"", category:"Sports Cards", condition:"", estimatedValue:"", purchaseDate:"", purchasedFrom:"", intendedFor:"", serialNum:"", notes:"", photo:"" });
    setShowAdd(null);
  }

  function addWeaponsLocker() {
    if (!wlForm.make && !wlForm.model) { toast.error("Make or model required"); return; }
    setWeaponsLockerList(p => [...p, { id:Date.now(), type:wlForm.type, make:wlForm.make, model:wlForm.model, blade:wlForm.blade, handle:wlForm.handle, storage:wlForm.storage, transfer:wlForm.transfer, notes:wlForm.notes, photo:wlForm.photo }]);
    toast.success(`${wlForm.make} ${wlForm.model} added to Weapons Locker`);
    setWlForm({ type:"Knife", make:"", model:"", blade:"", handle:"", storage:"", transfer:"", notes:"", photo:"" });
    setShowAdd(null);
  }

  const COLLECTIBLE_CATEGORIES = ["Sports Cards","Coins / Currency","Stamps","Art / Paintings","Sculptures","Jewelry","Watches","Luxury Handbags","Rare Books","Vinyl / Music","Movie Memorabilia","Military Antiques","Musical Instruments","Wine / Whiskey","Toys / Action Figures","Other"];
  const WEAPON_LOCKER_TYPES = ["Knife","Hunting Knife","Pocket Knife","Sword","Katana","Dagger","Machete","Tactical Axe / Tomahawk","Antique Sword","Bayonet","Other Edged Weapon"];

  const tabs = [
    { id: "vehicles" as Tab,        label: "Vehicles",       icon: <Car size={14} /> },
    { id: "realestate" as Tab,      label: "Real Estate",    icon: <Home size={14} /> },
    { id: "utilities" as Tab,       label: "Utilities",      icon: <Zap size={14} /> },
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
        {/* ── Header ── */}
        <div>
          <div className="eyebrow"><Boxes size={12} /> Estate Inventory</div>
          <h1 className="pg-h1">Personal Assets</h1>
          <div className="pg-sub">Vehicles, utility accounts, digital assets, and firearms — all in one secure record.</div>
        </div>

        {/* ── Tabs ── */}
        <div className="seg">
          {tabs.map(t => (
            <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── VEHICLES ── */}
        {tab === "vehicles" && (
          <div className="dlist">
            <div className="toolbar-end">
              <button className="btn-primary" onClick={() => setShowAdd("vehicles")}><Plus size={14} /> Add Vehicle</button>
            </div>
            {vehicleList.map(v => (
              <div key={v.id} className="card glow-surface" style={{ overflow: "hidden" }}>
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
              <div key={r.id} className="card glow-surface" style={{ overflow: "hidden" }}>
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
                    <ScanButton folder="property" onUpload={doc => toast.success(`"${doc.name}" added to ${r.address}`)} size="sm" label="Scan Document" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── UTILITIES ── */}
        {tab === "utilities" && (
          <div className="dlist">
            <div className="toolbar-end">
              <button className="btn-primary" onClick={() => setShowAdd("utilities")}><Plus size={14} /> Add Utility</button>
            </div>
            {utilityList.map(u => (
              <div key={u.id} className="card pad glow-surface">
                <div className="dtop" style={{ marginBottom: 14 }}>
                  <div className="dleft">
                    <div className="dico"><Zap size={18} /></div>
                    <div>
                      <div className="dtype" style={{ fontSize: 15 }}>{u.service}</div>
                      <div className="dsub">{u.provider}</div>
                    </div>
                  </div>
                  <div className="dright">
                    {u.autopay && <span className="dbadge autopay">AUTOPAY</span>}
                    <span className="damt">{u.monthlyAvg}<span>/mo</span></span>
                  </div>
                </div>
                <div className="dgrid">
                  <Field label="Account #" value={u.accountNum} />
                  <Field label="Phone" value={u.phone} />
                  <Field label="Website" value={u.website} />
                </div>
                {u.notes && <div className="notemuted">{u.notes}</div>}
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
              <div key={d.id} className="card pad glow-surface">
                <div className="dtop">
                  <div>
                    <span className="catbadge">{d.category.toUpperCase()}</span>
                    <div className="dtype" style={{ fontSize: 16 }}>{d.asset}</div>
                    <div className="dsub">{d.platform}</div>
                  </div>
                  <div className="dvnum" style={{ fontSize: 15 }}>{d.value}</div>
                </div>
                <div className="dgrid two">
                  <Field label="Holdings" value={d.holdings} />
                  <Field label="Access Method" value={d.accessMethod} />
                </div>
                {d.notes && <div className="noteitalic">{d.notes}</div>}
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
              <div key={w.id} className="card glow-surface" style={{ overflow: "hidden" }}>
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
              <div key={w.id} className="card glow-surface" style={{ overflow: "hidden" }}>
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
              <div key={c.id} className="card glow-surface" style={{ overflow: "hidden" }}>
                {c.photo && (
                  <div className="photo-frame" style={{ height: 220 }}>
                    <img src={c.photo} alt={c.name} />
                  </div>
                )}
                <div className="pad" style={{ padding: 22 }}>
                  <div className="dtop">
                    <div>
                      <span className="catbadge">{c.category.toUpperCase()}</span>
                      <div className="dtype" style={{ fontSize: 16 }}>{c.name}</div>
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
                    <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" linked to ${c.name}`)} size="sm" label="Attach Document" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Vehicle Modal */}
        {showAdd === "vehicles" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Vehicle</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
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
                <button className="save" onClick={addVehicle}>Add Vehicle</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Utility Modal */}
        {showAdd === "utilities" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Utility Account</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                {([["Service Type", "service", "e.g. Electricity, Internet, Water"], ["Provider", "provider", "e.g. AT&T, PG&E"], ["Account Number", "accountNum", ""], ["Phone", "phone", ""], ["Website", "website", ""], ["Monthly Average", "monthlyAvg", "e.g. $85"], ["Notes", "notes", "Optional"]] as [string, string, string][]).map(([label, key, ph]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input value={(uForm as any)[key]} onChange={e => setUForm(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
                  </div>
                ))}
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addUtility}>Add Utility</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Digital Asset Modal */}
        {showAdd === "digital" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Digital Asset</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
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
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addDigital}>Add Asset</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Firearm Modal */}
        {showAdd === "weapons" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Firearm Record</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
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
                <button className="save" onClick={addWeapon}>Add Firearm</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Real Estate Modal */}
        {showAdd === "realestate" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Property</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
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
                <button className="save" onClick={addRealEstate}>Add Property</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Weapons Locker Modal */}
        {showAdd === "weapons_locker" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add to Weapons Locker</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
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
                <button className="save" onClick={addWeaponsLocker}>Add to Locker</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Collectible Modal */}
        {showAdd === "collectibles" && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Collectible</h3>
                <button onClick={() => setShowAdd(null)}><X size={16} /></button>
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
                <button className="save" onClick={addCollectible}>Add Collectible</button>
                <button className="btn-sec" onClick={() => setShowAdd(null)}>Cancel</button>
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
