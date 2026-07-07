import React, { useState } from "react";
import { MapPin, Plus, X, Star, Phone, Globe, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PhotoPicker } from "./PhotoPicker";

const CARD: React.CSSProperties = { background:"var(--card)", border:"1px solid var(--border)", borderRadius:16 };
const INPUT: React.CSSProperties = { background:"rgba(108,92,231,0.05)", border:"1px solid rgba(108,92,231,0.2)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"var(--foreground)", outline:"none", width:"100%" };
const MONO: React.CSSProperties = { fontFamily:"var(--font-mono)" };

const PLACE_CATEGORIES = ["Restaurant","Coffee Shop","Bakery","Bar / Lounge","Park / Nature","Beach","Museum / Art","Entertainment","Shopping","Grocery / Market","Pharmacy","Doctor / Medical","Dentist","Hair / Salon","Gym / Fitness","Religious / Church","Library","Hotel / Resort","Vacation Spot","Family Home","Friend's Place","Other"];

const CAT_META: Record<string, { emoji:string; color:string; bg:string }> = {
  "Restaurant":        { emoji:"🍽️", color:"#ED8936", bg:"rgba(237,137,54,0.1)" },
  "Coffee Shop":       { emoji:"☕",  color:"#92400E", bg:"rgba(146,64,14,0.1)" },
  "Bakery":            { emoji:"🥐",  color:"#F6AD55", bg:"rgba(246,173,85,0.1)" },
  "Bar / Lounge":      { emoji:"🍸",  color:"#9F7AEA", bg:"rgba(159,122,234,0.1)" },
  "Park / Nature":     { emoji:"🌳",  color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  "Beach":             { emoji:"🏖️", color:"#4A90D9", bg:"rgba(74,144,217,0.1)" },
  "Museum / Art":      { emoji:"🏛️", color:"#6C5CE7", bg:"rgba(108,92,231,0.1)" },
  "Entertainment":     { emoji:"🎭",  color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
  "Shopping":          { emoji:"🛍️", color:"#9F7AEA", bg:"rgba(159,122,234,0.1)" },
  "Grocery / Market":  { emoji:"🛒",  color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  "Doctor / Medical":  { emoji:"🏥",  color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
  "Dentist":           { emoji:"🦷",  color:"#4A90D9", bg:"rgba(74,144,217,0.1)" },
  "Religious / Church":{ emoji:"⛪",  color:"#6C5CE7", bg:"rgba(108,92,231,0.1)" },
  "Gym / Fitness":     { emoji:"💪",  color:"#FC8181", bg:"rgba(252,129,129,0.1)" },
  "Hotel / Resort":    { emoji:"🏨",  color:"#ED8936", bg:"rgba(237,137,54,0.1)" },
  "Vacation Spot":     { emoji:"🌴",  color:"#48BB78", bg:"rgba(72,187,120,0.1)" },
  "Family Home":       { emoji:"🏡",  color:"#6C5CE7", bg:"rgba(108,92,231,0.1)" },
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

  return (
    <div className="p-6 space-y-6" style={{ maxWidth:1100 }}>
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--foreground)", marginBottom:4 }}>Favorite Places</h1>
          <p style={{ color:"var(--muted-foreground)", fontSize:14 }}>Record the places that matter most — restaurants, parks, family spots, and memories tied to locations.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>
          <Plus size={14}/> Add Place
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search places…" style={{ ...INPUT, width:220 }}/>
        <div className="flex flex-wrap gap-1.5">
          {allCats.map(cat => {
            const meta = getMeta(cat);
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background:filterCat===cat?meta.bg:"rgba(108,92,231,0.04)", color:filterCat===cat?meta.color:"var(--muted-foreground)", border:`1px solid ${filterCat===cat?meta.color+"40":"rgba(108,92,231,0.1)"}` }}>
                {cat==="all" ? "📍 All" : `${meta.emoji} ${cat}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(place => {
          const meta = getMeta(place.category);
          return (
            <div key={place.id} className="rounded-2xl overflow-hidden glow-surface" style={CARD}>
              {place.photo && <img src={place.photo} alt={place.name} style={{ width:"100%", height:160, objectFit:"cover" }}/>}
              <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-xl text-2xl flex-shrink-0" style={{ width:48, height:48, background:meta.bg }}>{meta.emoji}</div>
                  <div>
                    <div style={{ fontFamily:"var(--font-display)", fontSize:16, color:"var(--foreground)", marginBottom:2 }}>{place.name}</div>
                    <div style={{ color:meta.color, fontSize:11, ...MONO, fontWeight:700 }}>{place.category.toUpperCase()}</div>
                    <div className="flex items-center gap-0.5 mt-1">
                      {Array.from({length:5}).map((_,i)=><Star key={i} size={11} color={i<place.rating?"#F6AD55":"#D1D5DB"} fill={i<place.rating?"#F6AD55":"none"}/>)}
                    </div>
                  </div>
                </div>
                <button onClick={() => removePlace(place.id)} style={{ color:"#FC8181" }}><Trash2 size={14}/></button>
              </div>

              {place.address && <div className="flex items-center gap-1.5 text-xs mb-2" style={{ color:"var(--muted-foreground)" }}><MapPin size={10}/>{place.address}</div>}

              {place.favoriteItem && (
                <div className="px-3 py-2 rounded-xl mb-2" style={{ background:"rgba(246,173,85,0.07)", border:"1px solid rgba(246,173,85,0.2)" }}>
                  <div style={{ color:"#F6AD55", fontSize:9, ...MONO }}>FAVORITE ITEM / THING</div>
                  <div style={{ color:"var(--foreground)", fontSize:12, marginTop:1 }}>{place.favoriteItem}</div>
                </div>
              )}

              {place.whySpecial && (
                <div style={{ color:"var(--muted-foreground)", fontSize:12, lineHeight:1.6, fontStyle:"italic", marginBottom:8 }}>
                  "{place.whySpecial}"
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {place.tags.map(tag => (
                    <span key={tag} className="px-1.5 py-0.5 rounded text-xs" style={{ background:"rgba(108,92,231,0.06)", color:"var(--primary)" }}>#{tag}</span>
                  ))}
                </div>
                {place.visited && <span style={{ color:"var(--muted-foreground)", fontSize:10, ...MONO }}>{place.visited}</span>}
              </div>

              <div className="flex gap-2 mt-3">
                {place.phone && <button onClick={() => toast.success(`Calling ${place.name}: ${place.phone}`)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg" style={{ background:"rgba(108,92,231,0.06)", color:"var(--primary)" }}><Phone size={10}/>{place.phone}</button>}
                {place.website && <button onClick={() => toast.success(`Opening: ${place.website}`)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg" style={{ background:"rgba(108,92,231,0.06)", color:"var(--primary)" }}><Globe size={10}/>{place.website}</button>}
              </div>
              </div>
            </div>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:"rgba(0,0,0,0.75)", backdropFilter:"blur(6px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-3 overflow-y-auto glow-surface" style={{ background:"var(--card)", boxShadow:"0 32px 80px rgba(0,0,0,0.3)", maxHeight:"90vh" }}>
            <div className="flex items-center justify-between mb-1">
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, color:"var(--foreground)" }}>Add Favorite Place</h3>
              <button onClick={()=>setShowAdd(false)} style={{ color:"var(--muted-foreground)" }}><X size={16}/></button>
            </div>
            <PhotoPicker value={form.photo} onChange={url => setForm(p=>({...p,photo:url}))} label="Place Photo" aspectRatio="16/9"/>
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>CATEGORY</label>
              <select value={form.category} onChange={F("category")} style={INPUT}>
                {PLACE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            {[["Place Name *","name","e.g. Joe's Diner"],["Address","address",""],["Phone","phone",""],["Website","website",""],["Favorite Item or Thing","favoriteItem","e.g. Their signature burger"],["Why It's Special","whySpecial","Personal memory or reason you love it"],["How Often Visited","visited","e.g. Monthly, Every summer"],["Tags (comma-separated)","tags","e.g. family, date night, sunday"]].map(([label,key,ph])=>(
              <div key={key}>
                <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>{label.toUpperCase()}</label>
                <input value={(form as any)[key]} onChange={F(key)} placeholder={ph} style={INPUT}/>
              </div>
            ))}
            <div>
              <label style={{ color:"var(--muted-foreground)", fontSize:10, display:"block", marginBottom:3 }}>RATING (1–5 STARS)</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n=>(
                  <button key={n} onClick={()=>setForm(p=>({...p,rating:n}))} style={{ color:n<=form.rating?"#F6AD55":"#D1D5DB" }}>
                    <Star size={22} fill={n<=form.rating?"#F6AD55":"none"}/>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={addPlace} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ background:"var(--primary)", color:"#070D1A" }}>Save Place</button>
              <button onClick={()=>setShowAdd(false)} className="px-5 py-3 rounded-xl text-sm" style={{ background:"var(--secondary)", color:"var(--muted-foreground)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
