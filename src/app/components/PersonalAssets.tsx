import React, { useState, useRef } from "react";
import { Car, Zap, Lock, Bitcoin, Plus, Edit2, Trash2, Key, X, Home, Camera, Image, Gem, Sword } from "lucide-react";
import { toast } from "sonner";
import { ScanButton } from "./DocumentScanner";
import { PhotoPicker } from "./PhotoPicker";
import { AttachDocumentField } from "./AttachDocumentField";

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

const INPUT: React.CSSProperties = { background:"rgba(58,91,217,0.05)", border:"1px solid rgba(58,91,217,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };

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
    <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg" style={{ background: "#141B2E" }}>
      <span style={{ color: "var(--muted-foreground)", fontSize: 10 }}>{label.toUpperCase()}</span>
      <span style={{ color: "var(--foreground)", fontSize: 12 }}>{value}</span>
    </div>
  );

  return (
    <div className="p-6 space-y-6" style={{ maxWidth: 1100 }}>
      <div>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--foreground)", marginBottom: 4 }}>Personal Assets</h1>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14 }}>Vehicles, utility accounts, digital assets, and firearms — all in one secure record.</p>
      </div>

      <div className="flex flex-wrap gap-1 p-1 rounded-xl" style={{ background: "var(--card)", width: "fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all"
            style={{ background: tab === t.id ? "var(--primary)" : "transparent", color: tab === t.id ? "#070D1A" : "var(--muted-foreground)", fontWeight: tab === t.id ? 600 : 400 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "vehicles" && (
        <div className="space-y-4">
          <div className="flex justify-end"><button onClick={() => setShowAdd("vehicles")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Vehicle</button></div>
          {vehicleList.map(v => (
            <div key={v.id} className="rounded-xl border overflow-hidden glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              {(v as any).photo && (
                <img src={(v as any).photo} alt={`${v.year} ${v.make} ${v.model}`} style={{ width:"100%", height:200, objectFit:"cover" }}/>
              )}
              <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl p-2.5" style={{ background: "rgba(58,91,217,0.1)" }}><Car size={20} color="var(--primary)" /></div>
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--foreground)" }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{v.color} · {v.plate}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div style={{ color: "#48BB78", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700 }}>{v.value}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 12 }}>Est. Value</div>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-3">
                <Field label="VIN" value={v.vin} />
                <Field label="Title Holder" value={v.title} />
                <Field label="Lien / Loan" value={v.lien} />
                <Field label="Insurance" value={v.insurance} />
                <Field label="Registration Exp." value={v.registration} />
              </div>
              {v.notes && <div className="mt-3 px-4 py-3 rounded-lg" style={{ background: "rgba(246,173,85,0.08)", border: "1px solid rgba(246,173,85,0.2)" }}><span style={{ color: "#F6AD55", fontSize: 13 }}>{v.notes}</span></div>}

              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "realestate" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAdd("realestate")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background:"var(--primary)", color:"#070D1A", fontWeight:600 }}>
              <Plus size={14}/> Add Property
            </button>
          </div>
          {realEstateList.map(r => (
            <div key={r.id} className="rounded-xl border overflow-hidden glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              {/* Property photo */}
              <div className="relative" style={{ height: r.photo ? 220 : 80, background: r.photo ? "transparent" : "rgba(58,91,217,0.04)", borderBottom:"1px solid var(--border)" }}>
                {r.photo ? (
                  <img src={r.photo} alt={r.address} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Home size={28} color="rgba(58,91,217,0.25)"/>
                    <span style={{ color:"var(--muted-foreground)", fontSize:12 }}>No photo — add one below</span>
                  </div>
                )}
                <button
                  onClick={() => { setPendingPhotoTarget({type:"realestate", id:r.id}); photoInputRef.current?.click(); }}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background:"rgba(0,0,0,0.6)", color:"#fff", backdropFilter:"blur(4px)" }}>
                  <Camera size={12}/> {r.photo ? "Change Photo" : "Add Photo"}
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Home size={16} color="var(--primary)"/>
                      <span style={{ fontFamily:"var(--font-display)", fontSize:16, color:"var(--foreground)" }}>{r.type || "Property"}</span>
                    </div>
                    <div style={{ color:"var(--foreground)", fontSize:14, fontWeight:500 }}>{r.address}</div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:13 }}>{r.city}</div>
                  </div>
                  <div style={{ color:"var(--primary)", fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 }}>{r.value}</div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="Mortgage / Lender" value={r.mortgage}/>
                  <Field label="Monthly Payment" value={r.mortgagePayment}/>
                  <Field label="Title Holder" value={r.titleHolder}/>
                  <Field label="Deed Recording" value={r.deed}/>
                  <Field label="Year Built" value={r.yearBuilt}/>
                  <Field label="Size" value={r.sqft}/>
                  <Field label="Bed / Bath" value={r.bedBath}/>
                  <Field label="Lot Size" value={r.lotSize}/>
                </div>
                {r.notes && <div className="mt-3 px-4 py-3 rounded-xl" style={{ background:"rgba(246,173,85,0.06)", border:"1px solid rgba(246,173,85,0.2)" }}><span style={{ color:"#F6AD55", fontSize:13 }}>{r.notes}</span></div>}
                <div className="mt-3 flex gap-2 flex-wrap">
                  <ScanButton folder="property" onUpload={doc => toast.success(`"${doc.name}" added to ${r.address}`)} size="sm" label="Scan Document"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "utilities" && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => setShowAdd("utilities")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Utility</button></div>
          {utilityList.map(u => (
            <div key={u.id} className="p-5 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Zap size={16} color="var(--primary)" />
                  <div>
                    <span style={{ color: "var(--foreground)", fontSize: 15, fontWeight: 500 }}>{u.service}</span>
                    <span style={{ color: "var(--muted-foreground)", fontSize: 13, marginLeft: 8 }}>{u.provider}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {u.autopay && <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(72,187,120,0.12)", color: "#48BB78", fontFamily: "var(--font-mono)" }}>AUTOPAY</span>}
                  <span style={{ color: "var(--primary)", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600 }}>{u.monthlyAvg}/mo</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Account #" value={u.accountNum} />
                <Field label="Phone" value={u.phone} />
                <Field label="Website" value={u.website} />
              </div>
              {u.notes && <div style={{ color: "var(--muted-foreground)", fontSize: 12, marginTop: 8 }}>{u.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {tab === "digital" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ background: "rgba(229,62,62,0.06)", borderColor: "rgba(229,62,62,0.25)" }}>
              <Lock size={14} color="#FC8181" />
              <span style={{ color: "#FC8181", fontSize: 13 }}>Cryptocurrency seed phrases are stored in your Secret Vault — never share them digitally.</span>
            </div>
            <button onClick={() => setShowAdd("digital")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Asset</button>
          </div>
          {digitalList.map(d => (
            <div key={d.id} className="p-5 rounded-xl border glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(58,91,217,0.1)", color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{d.category.toUpperCase()}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--foreground)" }}>{d.asset}</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13 }}>{d.platform}</div>
                </div>
                <div style={{ color: "#48BB78", fontSize: 14, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{d.value}</div>
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Holdings" value={d.holdings} />
                <Field label="Access Method" value={d.accessMethod} />
              </div>
              {d.notes && <div className="mt-3" style={{ color: "var(--muted-foreground)", fontSize: 12, fontStyle: "italic" }}>{d.notes}</div>}

            </div>
          ))}
        </div>
      )}

      {tab === "weapons" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="px-4 py-3 rounded-xl border" style={{ background: "rgba(246,173,85,0.06)", borderColor: "rgba(246,173,85,0.25)" }}>
              <span style={{ color: "#F6AD55", fontSize: 13 }}>All firearms must be transferred according to California DOJ regulations. Consult an attorney before transfer.</span>
            </div>
            <button onClick={() => setShowAdd("weapons")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm ml-4" style={{ background: "var(--primary)", color: "#070D1A", fontWeight: 600 }}><Plus size={14} /> Add Firearm</button>
          </div>
          {weaponList.map(w => (
            <div key={w.id} className="rounded-xl border overflow-hidden glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              {/* Firearm photo */}
              <div className="relative" style={{ height: w.photo ? 200 : 72, background:"rgba(58,91,217,0.03)", borderBottom:"1px solid var(--border)" }}>
                {w.photo ? (
                  <img src={w.photo} alt={`${w.make} ${w.model}`} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                ) : (
                  <div className="flex items-center justify-center h-full gap-2">
                    <Image size={20} color="rgba(58,91,217,0.2)"/>
                    <span style={{ color:"var(--muted-foreground)", fontSize:12 }}>No photo</span>
                  </div>
                )}
                <button
                  onClick={() => { setPendingPhotoTarget({type:"weapon", id:w.id}); photoInputRef.current?.click(); }}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background:"rgba(0,0,0,0.6)", color:"#fff", backdropFilter:"blur(4px)" }}>
                  <Camera size={12}/> {w.photo ? "Change Photo" : "Add Photo"}
                </button>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"var(--foreground)" }}>{w.make} {w.model}</div>
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>{w.type}</span>
                  <span style={{ color:"var(--muted-foreground)", fontSize:13 }}>{w.caliber}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="Serial Number" value={w.serial}/>
                  <Field label="Registration" value={w.registration}/>
                  <Field label="Storage Location" value={w.storage}/>
                  <Field label="Transfer Instructions" value={w.transfer}/>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── WEAPONS LOCKER TAB ────────────────────────────────────── */}
      {tab === "weapons_locker" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="px-4 py-3 rounded-xl border flex-1" style={{ background:"rgba(246,173,85,0.06)", borderColor:"rgba(246,173,85,0.25)" }}>
              <span style={{ color:"#F6AD55", fontSize:13 }}>Non-firearm bladed weapons and edged tools. Consult your estate attorney regarding transfer and legal requirements by state.</span>
            </div>
            <button onClick={() => setShowAdd("weapons_locker")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background:"var(--primary)", color:"#070D1A", fontWeight:600 }}>
              <Plus size={14}/> Add Item
            </button>
          </div>
          {weaponsLockerList.map(w => (
            <div key={w.id} className="rounded-xl border overflow-hidden glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              {(w as any).photo && <img src={(w as any).photo} alt={`${w.make} ${w.model}`} style={{ width:"100%", height:180, objectFit:"cover" }}/>}
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background:"rgba(246,173,85,0.1)" }}><Sword size={18} color="#F6AD55"/></div>
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"var(--foreground)" }}>{w.make} {w.model}</div>
                    <span className="px-2 py-0.5 rounded text-xs" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>{w.type}</span>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {[["Blade / Edge",w.blade],["Handle / Grip",w.handle],["Storage Location",w.storage],["Transfer Instructions",w.transfer]].map(([label,value])=>(
                    <div key={label} className="flex flex-col gap-1 px-3 py-2.5 rounded-lg" style={{ background:"#141B2E" }}>
                      <span style={{ color:"var(--muted-foreground)", fontSize:10 }}>{(label as string).toUpperCase()}</span>
                      <span style={{ color:"var(--foreground)", fontSize:12 }}>{value||"—"}</span>
                    </div>
                  ))}
                </div>
                {(w as any).notes && <div className="mt-3 px-4 py-3 rounded-lg" style={{ background:"rgba(246,173,85,0.07)", border:"1px solid rgba(246,173,85,0.2)" }}><span style={{ color:"#F6AD55", fontSize:13 }}>{(w as any).notes}</span></div>}

              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── COLLECTIBLES TAB ──────────────────────────────────────── */}
      {tab === "collectibles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowAdd("collectibles")} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm" style={{ background:"var(--primary)", color:"#070D1A", fontWeight:600 }}>
              <Plus size={14}/> Add Collectible
            </button>
          </div>
          {collectiblesList.map(c => (
            <div key={c.id} className="rounded-xl border overflow-hidden glow-surface" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
              {c.photo && <img src={c.photo} alt={c.name} style={{ width:"100%", height:220, objectFit:"cover" }}/>}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background:"rgba(110,139,255,0.1)", color:"#6E8BFF", fontFamily:"var(--font-mono)" }}>{c.category.toUpperCase()}</span>
                    </div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"var(--foreground)" }}>{c.name}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div style={{ color:"#48BB78", fontFamily:"var(--font-display)", fontSize:18, fontWeight:700 }}>{c.estimatedValue}</div>
                    <div style={{ color:"var(--muted-foreground)", fontSize:11 }}>Est. Value</div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {[["Condition",c.condition||"—"],["Purchased From",c.purchasedFrom||"—"],["Purchase Date",c.purchaseDate||"—"],["Serial / Cert #",c.serialNum||"—"],["Intended For",c.intendedFor||"—"]].map(([label,value])=>(
                    <div key={label} className="flex flex-col gap-1 px-3 py-2.5 rounded-lg" style={{ background:"#141B2E" }}>
                      <span style={{ color:"var(--muted-foreground)", fontSize:10 }}>{(label as string).toUpperCase()}</span>
                      <span style={{ color:"var(--foreground)", fontSize:12 }}>{value}</span>
                    </div>
                  ))}
                </div>
                {c.notes && <div className="mt-3 px-4 py-3 rounded-lg" style={{ background:"rgba(110,139,255,0.06)", border:"1px solid rgba(110,139,255,0.2)" }}><span style={{ color:"#6E8BFF", fontSize:13 }}>{c.notes}</span></div>}
                <div className="mt-3 flex gap-2 flex-wrap">
                  <ScanButton folder="personal" onUpload={doc => toast.success(`"${doc.name}" linked to ${c.name}`)} size="sm" label="Attach Document"/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAdd === "vehicles" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-2"><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Vehicle</h3><button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button></div>
            <PhotoPicker value={vForm.photo} onChange={url => setVForm(p=>({...p,photo:url}))} label="Vehicle Photo" aspectRatio="16/9"/>
            {([["Year","year","2024"],["Make","make","e.g. Toyota"],["Model","model","e.g. Camry"],["Color","color","e.g. Silver"],["VIN","vin","Vehicle ID number"],["License Plate","plate","e.g. 7ABC123 CA"],["Title Holder","title","Name on title"],["Lien / Loan","lien","e.g. None or lender name"],["Insurance","insurance","Provider — Policy #"],["Registration Exp.","registration","e.g. Dec 2027"],["Estimated Value","value","e.g. $28,000"],["Notes","notes","Any special instructions"]] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(vForm as any)[key]} onChange={e=>setVForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/></div>
            ))}
            <AttachDocumentField value={vDoc} onChange={setVDoc} folder="vehicles" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (title, registration, insurance)"/>
            <div className="flex gap-3 pt-2"><button onClick={addVehicle} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Vehicle</button><button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Add Utility Modal */}
      {showAdd === "utilities" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center justify-between mb-2"><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Utility Account</h3><button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button></div>
            {([["Service Type","service","e.g. Electricity, Internet, Water"],["Provider","provider","e.g. AT&T, PG&E"],["Account Number","accountNum",""],["Phone","phone",""],["Website","website",""],["Monthly Average","monthlyAvg","e.g. $85"],["Notes","notes","Optional"]] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(uForm as any)[key]} onChange={e=>setUForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={addUtility} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Utility</button><button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Add Digital Asset Modal */}
      {showAdd === "digital" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center justify-between mb-2"><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Digital Asset</h3><button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button></div>
            <div><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>CATEGORY</label>
              <select value={dForm.category} onChange={e=>setDForm(p=>({...p,category:e.target.value}))} style={INPUT}>
                {["Cryptocurrency","Online Accounts","Domain Names","Social Media","Investment Accounts","Other"].map(c=><option key={c}>{c}</option>)}
              </select></div>
            {([["Platform","platform","e.g. Coinbase, Google, GoDaddy"],["Asset / Account Name","asset","e.g. Bitcoin (BTC) or email@gmail.com"],["Holdings","holdings","e.g. 0.5 BTC or 15 GB"],["Estimated Value","value","e.g. ~$35,000"],["Access Method","accessMethod","e.g. Seed phrase in Secret Vault"],["Notes","notes","Optional"]] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(dForm as any)[key]} onChange={e=>setDForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/></div>
            ))}
            <div className="flex gap-3 pt-2"><button onClick={addDigital} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Asset</button><button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Add Firearm Modal */}
      {showAdd === "weapons" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center justify-between mb-2"><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Firearm Record</h3><button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button></div>
            <PhotoPicker value={wForm.photo} onChange={url => setWForm(p=>({...p,photo:url}))} label="Firearm Photo" aspectRatio="4/3"/>
            <div><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>TYPE</label>
              <select value={wForm.type} onChange={e=>setWForm(p=>({...p,type:e.target.value}))} style={INPUT}>
                {["Handgun","Rifle","Shotgun","Other"].map(t=><option key={t}>{t}</option>)}
              </select></div>
            {([["Make","make","e.g. Glock, Ruger"],["Model","model","e.g. 19 Gen 5"],["Caliber","caliber","e.g. 9mm, .22 LR"],["Serial Number","serial",""],["Registration","registration","e.g. CA DOJ Registered"],["Storage Location","storage","Where it is stored"],["Transfer Instructions","transfer","Who receives it per your will"]] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(wForm as any)[key]} onChange={e=>setWForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/></div>
            ))}
            <AttachDocumentField value={wDoc} onChange={setWDoc} folder="firearms" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (registration, purchase receipt)"/>
            <div className="flex gap-3 pt-2"><button onClick={addWeapon} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Firearm</button><button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Add Real Estate Modal */}
      {showAdd === "realestate" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Property</h3>
              <button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            <PhotoPicker value={rForm.photo} onChange={url => setRForm(p=>({...p,photo:url}))} label="Property Photo" aspectRatio="16/9"/>
            {([
              ["Property Type","type","e.g. Primary Residence, Rental, Vacation Home"],
              ["Street Address *","address","e.g. 123 Main Street"],
              ["City, State, ZIP","city","e.g. Sacramento, CA 95825"],
              ["Estimated Value","value","e.g. $450,000"],
              ["Mortgage / Lender","mortgage","e.g. Wells Fargo or None"],
              ["Monthly Payment","mortgagePayment","e.g. $1,800/month"],
              ["Title Holder","titleHolder","Name(s) on title"],
              ["Deed Recording","deed","e.g. Recorded — Sacramento County"],
              ["Year Built","yearBuilt","e.g. 2002"],
              ["Square Footage","sqft","e.g. 1,850 sq ft"],
              ["Bed / Bath","bedBath","e.g. 3 bed / 2 bath"],
              ["Lot Size","lotSize","e.g. 0.15 acres"],
              ["Notes","notes","Special instructions, key locations, etc."],
            ] as [string,string,string][]).map(([label,key,ph]) => (
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(rForm as any)[key]} onChange={e=>setRForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <AttachDocumentField value={rDoc} onChange={setRDoc} folder="property" sectionId="personal-assets" sectionLabel="Personal Assets" label="Attach Document (deed, mortgage statement, title)"/>
              <button onClick={addRealEstate} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Property</button>
              <button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Weapons Locker Modal */}
      {showAdd === "weapons_locker" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1"><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add to Weapons Locker</h3><button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button></div>
            <PhotoPicker value={wlForm.photo} onChange={url => setWlForm(p=>({...p,photo:url}))} label="Photo of Item" aspectRatio="4/3"/>
            <div><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>ITEM TYPE</label>
              <select value={wlForm.type} onChange={e=>setWlForm(p=>({...p,type:e.target.value}))} style={INPUT}>
                {WEAPON_LOCKER_TYPES.map(t=><option key={t}>{t}</option>)}
              </select></div>
            {([["Make / Brand","make","e.g. Buck Knives, Cold Steel"],["Model Name","model","e.g. 110 Folding Hunter"],["Blade / Edge Description","blade","e.g. 3.75 inch clip point, stainless"],["Handle / Grip","handle","e.g. Wood, G10, bone"],["Storage Location","storage","Where it is kept"],["Transfer Instructions","transfer","Who receives it per your will"],["Notes","notes","Provenance, history, appraisal"]] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(wlForm as any)[key]} onChange={e=>setWlForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/></div>
            ))}
            <AttachDocumentField value={wlDoc} onChange={setWlDoc} folder="weapons_locker" sectionId="weapons_locker" sectionLabel="Weapons Locker" label="Attach Document (appraisal, provenance, receipt)"/>
            <div className="flex gap-3 pt-2"><button onClick={addWeaponsLocker} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add to Locker</button><button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Add Collectible Modal */}
      {showAdd === "collectibles" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1"><h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Collectible</h3><button onClick={()=>setShowAdd(null)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button></div>
            <PhotoPicker value={cForm.photo} onChange={url => setCForm(p=>({...p,photo:url}))} label="Photo of Item" aspectRatio="4/3"/>
            <div><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>CATEGORY</label>
              <select value={cForm.category} onChange={e=>setCForm(p=>({...p,category:e.target.value}))} style={INPUT}>
                {COLLECTIBLE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select></div>
            {([["Item Name *","name","e.g. 1952 Topps Mickey Mantle Rookie Card"],["Condition","condition","e.g. VG+, Mint, PSA 7"],["Estimated Value","estimatedValue","e.g. $38,000"],["Purchase Date","purchaseDate","e.g. Mar 2009"],["Purchased From","purchasedFrom","e.g. Heritage Auctions"],["Serial / Certificate #","serialNum","e.g. PSA grading number"],["Intended For","intendedFor","Who gets this item — or sell/donate"],["Notes","notes","Provenance, storage, authentication details"]] as [string,string,string][]).map(([label,key,ph])=>(
              <div key={key}><label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(cForm as any)[key]} onChange={e=>setCForm(p=>({...p,[key]:e.target.value}))} placeholder={ph} style={INPUT}/></div>
            ))}
            <AttachDocumentField value={cDoc} onChange={setCDoc} folder="personal" sectionId="collectibles" sectionLabel="Collectibles" label="Attach Document (appraisal, certificate of authenticity)"/>
            <div className="flex gap-3 pt-2"><button onClick={addCollectible} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Add Collectible</button><button onClick={()=>setShowAdd(null)} className="px-4 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button></div>
          </div>
        </div>
      )}

      {/* Hidden file input for property & firearm photos */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) { uploadPhoto(e.target.files[0]); e.target.value = ""; } }}
      />
    </div>
  );
}
