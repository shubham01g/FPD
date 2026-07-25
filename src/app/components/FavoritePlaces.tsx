import React, { useState } from "react";
import { MapPin, Plus, X, Star, Phone, Globe, Heart, Trash2, Compass } from "lucide-react";
import { toast } from "sonner";
import { PhotoPicker } from "./PhotoPicker";

/* ── Royal Vault Blue palette (matched to the redesigned dashboard, calendar, AI assistant, file cabinet, legacy vault, folders & final wishes) ── */
const TEXT    = "#EFF2F9";
const SOFT    = "#BCC5DA";
const MUTED   = "#A3ADC9";
const FAINT   = "#929CBC";
const ACCENT  = "#5B6EE1";
const ACCENT2 = "#5BA7D6";
const POS     = "#5FBE91";
const WARN    = "#D9A55E";
const NEG     = "#D06B6B";

const PLACE_CATEGORIES = ["Restaurant","Coffee Shop","Bakery","Bar / Lounge","Park / Nature","Beach","Museum / Art","Entertainment","Shopping","Grocery / Market","Pharmacy","Doctor / Medical","Dentist","Hair / Salon","Gym / Fitness","Religious / Church","Library","Hotel / Resort","Vacation Spot","Family Home","Friend's Place","Other"];

const CAT_META: Record<string, { emoji:string; color:string; bg:string }> = {
  "Restaurant":        { emoji:"🍽️", color:"#ED8936", bg:"rgba(237,137,54,0.1)" },
  "Coffee Shop":       { emoji:"☕",  color:"#92400E", bg:"rgba(146,64,14,0.1)" },
  "Bakery":            { emoji:"🥐",  color:"#F6AD55", bg:"rgba(246,173,85,0.1)" },
  "Bar / Lounge":      { emoji:"🍸",  color:"#5B6EE1", bg:"rgba(91,110,225,0.1)" },
  "Park / Nature":     { emoji:"🌳",  color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  "Beach":             { emoji:"🏖️", color:"#5BA7D6", bg:"rgba(91,167,214,0.1)" },
  "Museum / Art":      { emoji:"🏛️", color:"#5B6EE1", bg:"rgba(91,110,225,0.1)" },
  "Entertainment":     { emoji:"🎭",  color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
  "Shopping":          { emoji:"🛍️", color:"#5B6EE1", bg:"rgba(91,110,225,0.1)" },
  "Grocery / Market":  { emoji:"🛒",  color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  "Doctor / Medical":  { emoji:"🏥",  color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
  "Dentist":           { emoji:"🦷",  color:"#5BA7D6", bg:"rgba(91,167,214,0.1)" },
  "Religious / Church":{ emoji:"⛪",  color:"#5B6EE1", bg:"rgba(91,110,225,0.1)" },
  "Gym / Fitness":     { emoji:"💪",  color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
  "Hotel / Resort":    { emoji:"🏨",  color:"#ED8936", bg:"rgba(237,137,54,0.1)" },
  "Vacation Spot":     { emoji:"🌴",  color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  "Family Home":       { emoji:"🏡",  color:"#5B6EE1", bg:"rgba(91,110,225,0.1)" },
};

function getMeta(cat:string) { return CAT_META[cat] || { emoji:"📍", color:"rgba(255,255,255,0.65)", bg:"rgba(138,154,184,0.1)" }; }

interface Place {
  id: number;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  favoriteItem: string;
  whySpecial: string;
  rating: number;
  visited: string;
  tags: string[];
  photo?: string;
}

const initPlaces: Place[] = [
  { id:1, name:"Grange Restaurant", category:"Restaurant", address:"926 J Street, Sacramento, CA 95814", phone:"(916) 492-4450", website:"grangerestaurant.com", favoriteItem:"Braised short rib, house-made bread", whySpecial:"Our anniversary spot every year since 2012. Sarah loves the wine selection.", rating:5, visited:"Multiple times a year", tags:["anniversary","fine dining","date night"] },
  { id:2, name:"Insight Coffee Roasters", category:"Coffee Shop", address:"1901 8th Street, Sacramento, CA 95811", phone:"(916) 594-8911", website:"insightcoffee.com", favoriteItem:"Single-origin pour-over, almond croissant", whySpecial:"My daily morning stop. Staff knows my order.", rating:5, visited:"Almost daily", tags:["coffee","morning routine","work"] },
  { id:3, name:"Effie Yeaw Nature Center", category:"Park / Nature", address:"2850 San Lorenzo Way, Carmichael, CA 95608", phone:"(916) 489-4918", website:"effieyeaw.org", favoriteItem:"Morning wildlife walk trail", whySpecial:"Where we took Emma and Lucas for their first nature walks. Deer always out at sunrise.", rating:5, visited:"Monthly", tags:["nature","family","hiking","kids"] },
  { id:4, name:"Temple Coffee Roasters", category:"Coffee Shop", address:"2829 S Street, Sacramento, CA 95816", phone:"(916) 454-1272", website:"templecoffee.com", favoriteItem:"Ethiopian single origin, lavender latte", whySpecial:"Best quiet workspace in the city. Go for afternoon focus sessions.", rating:4, visited:"Weekly", tags:["coffee","work","quiet"] },
  { id:5, name:"The Fox & Goose", category:"Restaurant", address:"1001 R Street, Sacramento, CA 95811", phone:"(916) 443-8825", website:"foxandgoose.com", favoriteItem:"Full English breakfast, Irish coffee", whySpecial:"Sunday brunch tradition with the family. Kids love the atmosphere.", rating:5, visited:"Sunday mornings", tags:["brunch","family","sunday tradition"] },
  { id:6, name:"Folsom Lake State Recreation Area", category:"Park / Nature", address:"7806 Folsom-Auburn Rd, Folsom, CA 95630", phone:"(916) 988-0205", website:"parks.ca.gov", favoriteItem:"Beals Point beach, kayaking on the lake", whySpecial:"Summer family tradition since 2015. Emma learned to swim here.", rating:5, visited:"Every summer", tags:["lake","swimming","family","summer"] },
  { id:7, name:"Crocker Art Museum", category:"Museum / Art", address:"216 O Street, Sacramento, CA 95814", phone:"(916) 808-7000", website:"crockerart.org", favoriteItem:"European Masters gallery, First Saturdays events", whySpecial:"Date nights with Sarah. We're members. Michael did his first painting class here.", rating:4, visited:"Monthly", tags:["art","date night","museum","members"] },
];

/* Whisper-fine matte grain (data-URI so nothing loads over the network). */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/* All styling scoped under .fpd-fav so nothing else in the app is affected. */
const FAV_CSS = `
.fpd-fav{position:relative;min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%);}
.fpd-fav *{box-sizing:border-box;}
.fpd-fav-grain{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.03;mix-blend-mode:overlay;background-image:${GRAIN};}
.fpd-fav .wrap{max-width:1240px;margin:0 auto;padding:24px 30px 42px;display:flex;flex-direction:column;gap:18px;position:relative;z-index:1;}

.fpd-fav .card{background:linear-gradient(180deg,#0D1421 0%,#0A0F1A 100%);border:1px solid rgba(255,255,255,0.22);border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.035),0 10px 34px -18px rgba(0,0,0,0.7);}
.fpd-fav .card.pad{padding:22px;}
.fpd-fav .eyebrow{font-family:var(--font-mono);font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:${MUTED};display:flex;align-items:center;gap:7px;}

/* header */
.fpd-fav .pg-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;}
.fpd-fav .pg-h1{font-size:24px;color:${TEXT};font-weight:600;margin:9px 0 5px;letter-spacing:-0.02em;font-family:var(--font-display);}
.fpd-fav .pg-sub{color:${MUTED};font-size:13px;max-width:640px;line-height:1.6;}
.fpd-fav .btn-primary{display:inline-flex;align-items:center;gap:8px;padding:10px 17px;border-radius:9px;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-size:12.5px;font-weight:600;box-shadow:0 8px 20px -8px rgba(91,110,225,0.7),inset 0 1px 0 rgba(255,255,255,0.035);transition:filter .18s,transform .18s;border:none;cursor:pointer;font-family:var(--font-body);flex-shrink:0;}
.fpd-fav .btn-primary:hover{filter:brightness(1.08);transform:translateY(-1px);}
.fpd-fav .btn-ghost{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(91,110,225,0.10);border:1px solid rgba(91,110,225,0.28);color:${ACCENT2};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);transition:background .18s;border:none;}
.fpd-fav .btn-ghost:hover{background:rgba(91,110,225,0.18);}
.fpd-fav .btn-sec{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.22);color:${MUTED};font-size:12.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}

/* KPI ledger */
.fpd-fav .kstrip{display:grid;grid-template-columns:repeat(4,1fr);border-radius:15px;}
.fpd-fav .kcell{padding:20px 22px;border-left:1px solid rgba(255,255,255,0.22);position:relative;text-align:left;overflow:hidden;}
.fpd-fav .kcell:first-child{border-left:none;}
.fpd-fav .kcell .khead{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;}
.fpd-fav .kcell .klbl{font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.12em;text-transform:uppercase;color:${MUTED};}
.fpd-fav .kcell .kico{width:27px;height:27px;border-radius:8px;border:1px solid rgba(255,255,255,0.22);display:flex;align-items:center;justify-content:center;background:#0F1624;color:${SOFT};}
.fpd-fav .kcell .kval{font-family:var(--font-display);font-size:26px;font-weight:600;color:${TEXT};line-height:1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
.fpd-fav .kcell .ksub{font-size:11.5px;color:${MUTED};margin-top:9px;display:flex;align-items:center;gap:6px;}
.fpd-fav .kcell .ksub .dt{width:5px;height:5px;border-radius:50%;flex-shrink:0;}
@media (max-width:880px){.fpd-fav .kstrip{grid-template-columns:1fr 1fr;}.fpd-fav .kcell:nth-child(3){border-left:none;}.fpd-fav .kcell:nth-child(n+3){border-top:1px solid rgba(255,255,255,0.22);}}

/* filters */
.fpd-fav .filters{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.fpd-fav .search-input{width:220px;padding:9px 13px;border-radius:9px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:12.5px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-fav .search-input::placeholder{color:${FAINT};}
.fpd-fav .search-input:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-fav .chip{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;border-radius:9px;font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-body);border:1px solid;transition:opacity .16s,background .16s,border-color .16s;}
.fpd-fav .chip.off{opacity:.48;}
.fpd-fav .chip.off:hover{opacity:.72;}

/* place cards */
.fpd-fav .pgrid{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
@media (max-width:820px){.fpd-fav .pgrid{grid-template-columns:1fr;}}
.fpd-fav .pcard{overflow:hidden;}
.fpd-fav .pphoto{width:100%;height:160px;object-fit:cover;display:block;}
.fpd-fav .pbody{padding:20px;}
.fpd-fav .ptop{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px;}
.fpd-fav .pico{width:46px;height:46px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;}
.fpd-fav .pname{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;margin-bottom:2px;letter-spacing:-0.01em;}
.fpd-fav .pcat{font-family:var(--font-mono);font-size:10.5px;font-weight:700;letter-spacing:0.04em;margin-bottom:5px;}
.fpd-fav .pstars{display:flex;align-items:center;gap:1px;}
.fpd-fav .pdel{background:none;border:none;cursor:pointer;color:${MUTED};flex-shrink:0;padding:4px;transition:color .16s;}
.fpd-fav .pdel:hover{color:${NEG};}
.fpd-fav .paddr{display:flex;align-items:center;gap:6px;color:${MUTED};font-size:12px;margin-bottom:10px;}
.fpd-fav .pfav{padding:10px 12px;border-radius:10px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.22);margin-bottom:10px;}
.fpd-fav .pfav .pfk{color:${WARN};font-family:var(--font-mono);font-size:9px;letter-spacing:0.08em;margin-bottom:3px;}
.fpd-fav .pfav .pfv{color:${TEXT};font-size:12.5px;line-height:1.5;}
.fpd-fav .pwhy{color:${MUTED};font-size:12px;line-height:1.65;font-style:italic;margin-bottom:12px;}
.fpd-fav .pfoot-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px;}
.fpd-fav .ptags{display:flex;flex-wrap:wrap;gap:6px;}
.fpd-fav .ptag{padding:3px 9px;border-radius:6px;font-size:11px;font-weight:500;background:rgba(91,110,225,0.10);color:${ACCENT2};}
.fpd-fav .pvisited{color:${MUTED};font-size:10.5px;font-family:var(--font-mono);flex-shrink:0;}
.fpd-fav .pacts{display:flex;gap:8px;flex-wrap:wrap;}
.fpd-fav .pact-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:8px;font-size:11.5px;font-weight:600;cursor:pointer;border:none;font-family:var(--font-body);background:rgba(91,110,225,0.08);color:${ACCENT2};transition:background .16s;}
.fpd-fav .pact-btn:hover{background:rgba(91,110,225,0.16);}

/* empty state */
.fpd-fav .empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:52px 12px;}
.fpd-fav .empty .ei{width:52px;height:52px;border-radius:14px;background:rgba(91,110,225,0.08);border:1px solid rgba(91,110,225,0.2);display:flex;align-items:center;justify-content:center;color:${ACCENT2};margin-bottom:14px;}
.fpd-fav .empty .et{color:${SOFT};font-size:14px;font-weight:600;font-family:var(--font-display);margin-bottom:4px;}
.fpd-fav .empty .ed{color:${MUTED};font-size:12.5px;}

/* modal */
.fpd-fav .backdrop{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,8,14,0.75);backdrop-filter:blur(8px);}
.fpd-fav .modal{width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
.fpd-fav .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.22);}
.fpd-fav .modal-head h3{font-family:var(--font-display);font-size:16px;color:${TEXT};font-weight:600;}
.fpd-fav .modal-head button{background:none;border:none;color:${MUTED};cursor:pointer;display:flex;}
.fpd-fav .modal-body{padding:22px;display:flex;flex-direction:column;gap:14px;}
.fpd-fav .field label{display:block;margin-bottom:6px;font-family:var(--font-mono);font-size:9.5px;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};}
.fpd-fav .field input,.fpd-fav .field select,.fpd-fav .field textarea{width:100%;padding:11px 13px;border-radius:10px;background:#0F1624;border:1px solid rgba(255,255,255,0.22);color:${TEXT};font-size:13px;outline:none;font-family:var(--font-body);transition:border-color .18s,box-shadow .18s;}
.fpd-fav .field input::placeholder,.fpd-fav .field textarea::placeholder{color:${FAINT};}
.fpd-fav .field input:focus,.fpd-fav .field select:focus,.fpd-fav .field textarea:focus{border-color:rgba(91,110,225,0.5);box-shadow:0 0 0 3px rgba(91,110,225,0.12);}
.fpd-fav .rate-row{display:flex;gap:6px;}
.fpd-fav .rate-row button{background:none;border:none;cursor:pointer;padding:2px;display:flex;}
.fpd-fav .modal-foot{display:flex;align-items:center;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,0.22);}
.fpd-fav .modal-foot .save{flex:1;padding:12px;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;background:linear-gradient(180deg,#7E6BD8,#5B6EE1);color:#fff;font-family:var(--font-body);transition:filter .18s;}
.fpd-fav .modal-foot .save:hover{filter:brightness(1.08);}
`;

export function FavoritePlaces() {
  const [places, setPlaces] = useState<Place[]>(initPlaces);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name:"", category:PLACE_CATEGORIES[0], address:"", phone:"", website:"", favoriteItem:"", whySpecial:"", rating:5, visited:"", tags:"", photo:"" });

  const F = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) => setForm(p=>({...p,[k]:e.target.value}));

  function addPlace() {
    if (!form.name) { toast.error("Place name required"); return; }
    setPlaces(p => [...p, { ...form, id:Date.now(), rating:Number(form.rating), tags:form.tags.split(",").map(t=>t.trim()).filter(Boolean) }]);
    toast.success(`${form.name} saved to Favorite Places`);
    setForm({ name:"", category:PLACE_CATEGORIES[0], address:"", phone:"", website:"", favoriteItem:"", whySpecial:"", rating:5, visited:"", tags:"", photo:"" });
    setShowAdd(false);
  }

  function removePlace(id:number) {
    setPlaces(p => p.filter(x => x.id!==id));
    toast.success("Place removed");
  }

  const allCats = ["all", ...Array.from(new Set(places.map(p=>p.category)))];
  const filtered = places.filter(p =>
    (filterCat==="all" || p.category===filterCat) &&
    (search==="" || p.name.toLowerCase().includes(search.toLowerCase()) || p.whySpecial.toLowerCase().includes(search.toLowerCase()))
  );

  const categoryCount = new Set(places.map(p => p.category)).size;
  const topRatedCount = places.filter(p => p.rating === 5).length;
  const avgRating = places.length ? (places.reduce((s,p) => s + p.rating, 0) / places.length) : 0;
  const kpis = [
    { label: "Places Saved", value: String(places.length), sub: "Across all categories", icon: <MapPin size={14} />, dot: ACCENT2 },
    { label: "Categories", value: String(categoryCount), sub: "Distinct place types", icon: <Compass size={14} />, dot: ACCENT2 },
    { label: "Top Rated", value: String(topRatedCount), sub: "5-star favorites", icon: <Star size={14} />, dot: WARN },
    { label: "Avg Rating", value: avgRating.toFixed(1), sub: "out of 5 stars", icon: <Heart size={14} />, dot: POS },
  ];

  return (
    <div className="fpd-fav">
      <style dangerouslySetInnerHTML={{ __html: FAV_CSS }} />
      <div className="fpd-fav-grain" />

      <div className="wrap">
        {/* ── Header ── */}
        <div className="pg-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow"><MapPin size={12} /> Location Memories</div>
            <h1 className="pg-h1">Favorite Places</h1>
            <div className="pg-sub">Record the places that matter most — restaurants, parks, family spots, and memories tied to locations.</div>
          </div>
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Place
          </button>
        </div>

        {/* ── KPI ledger ── */}
        <div className="card kstrip glow-surface">
          {kpis.map(k => (
            <div key={k.label} className="kcell">
              <div className="khead">
                <span className="klbl">{k.label}</span>
                <span className="kico">{k.icon}</span>
              </div>
              <div className="kval">{k.value}</div>
              <div className="ksub"><span className="dt" style={{ background: k.dot }} />{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Search + category filters ── */}
        <div className="card pad glow-surface">
          <div className="filters">
            <input className="search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search places…" />
            {allCats.map(cat => {
              const meta = getMeta(cat);
              const on = filterCat === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCat(cat)}
                  className={`chip ${on ? "" : "off"}`}
                  style={{
                    background: on ? meta.bg : "transparent",
                    color: on ? meta.color : MUTED,
                    borderColor: on ? `${meta.color}44` : "rgba(255,255,255,0.09)",
                  }}
                >
                  {cat === "all" ? "📍 All" : `${meta.emoji} ${cat}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Cards ── */}
        {filtered.length === 0 && (
          <div className="card empty glow-surface">
            <div className="ei"><MapPin size={20} /></div>
            <div className="et">No places match</div>
            <div className="ed">Try a different search term or category filter.</div>
          </div>
        )}

        <div className="pgrid">
          {filtered.map(place => {
            const meta = getMeta(place.category);
            return (
              <div key={place.id} className="card pcard glow-surface">
                {place.photo && <img src={place.photo} alt={place.name} className="pphoto" />}
                <div className="pbody">
                  <div className="ptop">
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, minWidth: 0 }}>
                      <div className="pico" style={{ background: meta.bg }}>{meta.emoji}</div>
                      <div style={{ minWidth: 0 }}>
                        <div className="pname">{place.name}</div>
                        <div className="pcat" style={{ color: meta.color }}>{place.category.toUpperCase()}</div>
                        <div className="pstars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} size={11} color={i < place.rating ? WARN : MUTED} fill={i < place.rating ? WARN : "none"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button className="pdel" onClick={() => removePlace(place.id)} title="Remove place"><Trash2 size={14} /></button>
                  </div>

                  {place.address && <div className="paddr"><MapPin size={10} />{place.address}</div>}

                  {place.favoriteItem && (
                    <div className="pfav">
                      <div className="pfk">FAVORITE ITEM / THING</div>
                      <div className="pfv">{place.favoriteItem}</div>
                    </div>
                  )}

                  {place.whySpecial && <div className="pwhy">"{place.whySpecial}"</div>}

                  <div className="pfoot-row">
                    <div className="ptags">
                      {place.tags.map(tag => <span key={tag} className="ptag">#{tag}</span>)}
                    </div>
                    {place.visited && <span className="pvisited">{place.visited}</span>}
                  </div>

                  <div className="pacts">
                    {place.phone && (
                      <button className="pact-btn" onClick={() => toast.success(`Calling ${place.name}: ${place.phone}`)}>
                        <Phone size={11} />{place.phone}
                      </button>
                    )}
                    {place.website && (
                      <button className="pact-btn" onClick={() => toast.success(`Opening: ${place.website}`)}>
                        <Globe size={11} />{place.website}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Add place modal ── */}
        {showAdd && (
          <div className="backdrop">
            <div className="card modal glow-surface">
              <div className="modal-head">
                <h3>Add Favorite Place</h3>
                <button onClick={() => setShowAdd(false)}><X size={16} /></button>
              </div>
              <div className="modal-body">
                <PhotoPicker value={form.photo} onChange={url => setForm(p => ({ ...p, photo: url }))} label="Place Photo" aspectRatio="16/9" />
                <div className="field">
                  <label>CATEGORY</label>
                  <select value={form.category} onChange={F("category")}>
                    {PLACE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {[["Place Name *","name","e.g. Joe's Diner"],["Address","address",""],["Phone","phone",""],["Website","website",""],["Favorite Item or Thing","favoriteItem","e.g. Their signature burger"],["Why It's Special","whySpecial","Personal memory or reason you love it"],["How Often Visited","visited","e.g. Monthly, Every summer"],["Tags (comma-separated)","tags","e.g. family, date night, sunday"]].map(([label,key,ph]) => (
                  <div className="field" key={key}>
                    <label>{label.toUpperCase()}</label>
                    <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} />
                  </div>
                ))}
                <div className="field">
                  <label>RATING (1–5 STARS)</label>
                  <div className="rate-row">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} onClick={() => setForm(p => ({ ...p, rating: n }))}>
                        <Star size={22} color={n <= form.rating ? WARN : MUTED} fill={n <= form.rating ? WARN : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-foot">
                <button className="save" onClick={addPlace}>Save Place</button>
                <button className="btn-sec" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
