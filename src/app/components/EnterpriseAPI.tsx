import React, { useState } from "react";
import { Code, Play, Copy, CheckCircle, Key, Zap, Globe, Lock, ChevronDown, ChevronRight, Terminal, Book, Webhook } from "lucide-react";

const GLASS: React.CSSProperties = { background:"#101728", border:"1px solid rgba(255,255,255,0.06)", boxShadow:"0 10px 34px -18px rgba(0,0,0,0.6)", borderRadius:22 };
const GRID: React.CSSProperties = { backgroundImage: "linear-gradient(rgba(91,110,225,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(91,110,225,0.025) 1px,transparent 1px)", backgroundSize:"60px 60px" };
const MONO: React.CSSProperties = { fontFamily: "var(--font-mono)" };

const methodColor = { GET:"#48BB78", POST:"#5B6EE1", PUT:"#F6AD55", DELETE:"#FC8181", PATCH:"#5BA7D6" };

interface Endpoint { method:string; path:string; desc:string; body?:string; response:string; }
interface Group { label:string; endpoints:Endpoint[]; }

const apiGroups: Group[] = [
  {
    label:"Authentication",
    endpoints:[
      { method:"POST", path:"/api/auth/signup", desc:"Register a new user account. Creates a Stripe customer and sends OTP verification email.", body:`{ "name":"James Doe", "email":"james@example.com", "password":"••••••••", "plan":"premium" }`, response:`{ "success":true, "message":"Verification email sent", "user_id":"USR-8821" }` },
      { method:"POST", path:"/api/auth/login", desc:"Authenticate and receive a bearer token.", body:`{ "email":"james@example.com", "password":"••••••••" }`, response:`{ "token":"eyJ0eXAiOiJKV1QiLCJhbGci...", "user":{ "id":"USR-8821", "name":"James Doe", "plan":"premium" } }` },
      { method:"POST", path:"/api/auth/verify-otp", desc:"Verify the 6-digit OTP sent by email or SMS.", body:`{ "email":"james@example.com", "otp":"482910" }`, response:`{ "success":true, "verified":true }` },
      { method:"POST", path:"/api/auth/logout", desc:"Invalidate the current bearer token.", response:`{ "success":true }` },
      { method:"POST", path:"/api/auth/forgot-password", desc:"Send a password reset link to the user's email.", body:`{ "email":"james@example.com" }`, response:`{ "success":true, "message":"Reset link sent" }` },
    ]
  },
  {
    label:"User Profile",
    endpoints:[
      { method:"GET", path:"/api/user/profile", desc:"Retrieve the authenticated user's profile.", response:`{ "id":"USR-8821", "name":"James Doe", "email":"james@example.com", "plan":"premium", "storage_used_gb":16.9, "storage_limit_gb":25 }` },
      { method:"PUT", path:"/api/user/profile", desc:"Update user profile fields.", body:`{ "name":"James W. Doe", "phone":"+19165550182" }`, response:`{ "success":true, "user":{ ... } }` },
      { method:"POST", path:"/api/user/change-password", desc:"Change the authenticated user's password.", body:`{ "current_password":"••••••••", "new_password":"••••••••" }`, response:`{ "success":true }` },
    ]
  },
  {
    label:"Vault & Documents",
    endpoints:[
      { method:"GET", path:"/api/vault/documents", desc:"List all documents in the user's vault. Supports ?category= filter.", response:`{ "data":[ { "id":"DOC-001", "name":"Will & Testament", "category":"legal", "size_mb":2.4, "encrypted":true, "status":"verified" } ], "total":14 }` },
      { method:"POST", path:"/api/vault/documents", desc:"Upload a new document. Use multipart/form-data.", body:`FormData { file, category, name }`, response:`{ "success":true, "document":{ "id":"DOC-015", "name":"...", "size_mb":1.2 } }` },
      { method:"DELETE", path:"/api/vault/documents/:id", desc:"Permanently delete a document from the vault.", response:`{ "success":true }` },
      { method:"GET", path:"/api/vault/folders", desc:"List all personal folders.", response:`{ "data":[ { "id":"FOLD-001", "name":"Legal Documents", "files":8, "locked":false } ] }` },
      { method:"POST", path:"/api/vault/folders", desc:"Create a new folder.", body:`{ "name":"My Folder", "locked":false }`, response:`{ "success":true, "folder":{ "id":"FOLD-009", "name":"My Folder" } }` },
    ]
  },
  {
    label:"Contacts",
    endpoints:[
      { method:"GET", path:"/api/contacts", desc:"List all designated contacts. Filter by ?type=legacy|guardian|emergency|pet_emergency", response:`{ "data":[ { "id":"CON-001", "name":"Sarah Johnson", "type":"legacy", "verification_status":"verified" } ] }` },
      { method:"POST", path:"/api/contacts", desc:"Add a new contact and send them a verification invite.", body:`{ "name":"Sarah Johnson", "email":"sarah@example.com", "phone":"+19165550234", "type":"legacy", "access_level":"full_vault", "access_trigger":"Upon confirmed death" }`, response:`{ "success":true, "contact":{ "id":"CON-005", "verification_status":"pending" } }` },
      { method:"PUT", path:"/api/contacts/:id", desc:"Update a contact's details.", body:`{ "access_level":"legal_documents_only" }`, response:`{ "success":true }` },
      { method:"DELETE", path:"/api/contacts/:id", desc:"Remove a contact.", response:`{ "success":true }` },
    ]
  },
  {
    label:"Final Wishes",
    endpoints:[
      { method:"GET", path:"/api/final-wishes", desc:"Retrieve all final wish bequests.", response:`{ "data":[ { "id":"FW-001", "item":"1967 Ford Mustang", "recipient":"Michael Doe", "category":"personal_property" } ] }` },
      { method:"POST", path:"/api/final-wishes", desc:"Add a new final wish.", body:`{ "item":"Grandfather's watch", "recipient":"Emily Doe", "category":"sentimental", "notes":"Has been in family since 1892" }`, response:`{ "success":true, "wish":{ "id":"FW-008" } }` },
      { method:"GET", path:"/api/wills", desc:"Retrieve all legal will documents on record.", response:`{ "data":[ { "id":"WILL-001", "type":"Last Will & Testament", "attorney":"Linda Torres", "status":"current" } ] }` },
      { method:"GET", path:"/api/funeral-planning", desc:"Retrieve funeral planning preferences.", response:`{ "service_type":"Memorial", "location":"Green Valley Funeral Services", "budget":"$8,000-$12,000", "music":["Amazing Grace"] }` },
      { method:"PUT", path:"/api/funeral-planning", desc:"Update funeral planning preferences.", body:`{ "service_type":"Cremation", "location":"Pacific Coast Cremation Services" }`, response:`{ "success":true }` },
    ]
  },
  {
    label:"Medical Information",
    endpoints:[
      { method:"GET", path:"/api/medical/emergency-info", desc:"Get emergency medical information.", response:`{ "blood_type":"O+", "conditions":["Type 2 Diabetes"], "dnr":true, "organ_donor":true }` },
      { method:"PUT", path:"/api/medical/emergency-info", desc:"Update emergency medical information.", body:`{ "blood_type":"O+", "dnr":true }`, response:`{ "success":true }` },
      { method:"GET", path:"/api/medical/allergies", desc:"List all allergies.", response:`{ "data":[ { "id":"ALL-001", "allergen":"Penicillin", "severity":"severe", "reaction":"Anaphylaxis" } ] }` },
      { method:"POST", path:"/api/medical/allergies", desc:"Add a new allergy.", body:`{ "allergen":"Shellfish", "severity":"moderate", "reaction":"Hives", "type":"food" }`, response:`{ "success":true }` },
      { method:"GET", path:"/api/medical/medications", desc:"List all active medications.", response:`{ "data":[ { "id":"MED-001", "name":"Metformin", "dose":"1000mg", "frequency":"Twice daily" } ] }` },
      { method:"POST", path:"/api/medical/medications", desc:"Add a new medication.", body:`{ "name":"Lisinopril", "dose":"10mg", "frequency":"Once daily", "condition":"Hypertension" }`, response:`{ "success":true }` },
    ]
  },
  {
    label:"Financial Records",
    endpoints:[
      { method:"GET", path:"/api/financial/insurance", desc:"List all insurance policies.", response:`{ "data":[ { "id":"INS-001", "type":"Life Insurance", "carrier":"MetLife", "coverage":"$500,000" } ] }` },
      { method:"GET", path:"/api/financial/real-estate", desc:"List all real estate properties.", response:`{ "data":[ { "id":"RE-001", "type":"Primary Residence", "address":"1842 Oak Ridge Dr", "value":"$485,000" } ] }` },
      { method:"GET", path:"/api/financial/portfolios", desc:"List investment portfolio accounts.", response:`{ "data":[ { "id":"PORT-001", "institution":"Fidelity", "type":"Brokerage", "value":"$184,200" } ] }` },
      { method:"GET", path:"/api/financial/retirement", desc:"List retirement accounts.", response:`{ "data":[ { "id":"RET-001", "type":"401(k)", "institution":"Fidelity", "balance":"$312,800" } ] }` },
      { method:"GET", path:"/api/financial/taxes", desc:"List filed tax records.", response:`{ "data":[ { "year":2025, "filed_date":"2026-04-12", "refund":2180 } ] }` },
      { method:"GET", path:"/api/financial/business", desc:"List business accounts.", response:`{ "data":[ { "id":"BIZ-001", "name":"Doe Photography LLC", "type":"LLC", "ein":"XX-XXXXXXX" } ] }` },
    ]
  },
  {
    label:"Storage & Billing",
    endpoints:[
      { method:"GET", path:"/api/storage/usage", desc:"Get current storage usage and billing status.", response:`{ "used_gb":16.9, "limit_gb":25, "percent":68, "overage_gb":0, "overage_rate":0.10, "next_reset":"2026-07-01" }` },
      { method:"GET", path:"/api/storage/history", desc:"Get 6-month storage usage history.", response:`{ "data":[ { "month":"Jun 2026", "used_gb":16.9 }, { "month":"May 2026", "used_gb":14.3 } ] }` },
      { method:"GET", path:"/api/subscriptions/plans", desc:"Get all available subscription plans and current pricing.", response:`{ "data":[ { "id":"essential", "name":"Essential", "price":9.99, "storage_gb":5 }, { "id":"premium", "name":"Premium", "price":24.99, "storage_gb":25 } ] }` },
      { method:"POST", path:"/api/subscriptions/upgrade", desc:"Upgrade or change subscription plan.", body:`{ "plan_id":"legacy_pro" }`, response:`{ "success":true, "effective":"immediately" }` },
    ]
  },
  {
    label:"Affiliate Program",
    endpoints:[
      { method:"GET", path:"/api/affiliate/stats", desc:"Get affiliate program statistics.", response:`{ "tier":1, "rate":0.20, "active_referrals":6, "pending_payout":189.50, "total_earned":565.50 }` },
      { method:"GET", path:"/api/affiliate/referrals", desc:"List all referral users.", response:`{ "data":[ { "id":"REF-001", "name":"Amanda Chen", "plan":"premium", "months_remaining":9, "monthly_commission":4.99 } ] }` },
      { method:"GET", path:"/api/affiliate/link", desc:"Get the user's unique affiliate link.", response:`{ "code":"FPD-JD-2024-XKTZ", "url":"https://finalpassdown.com/r/FPD-JD-2024-XKTZ" }` },
    ]
  },
  {
    label:"Webhooks",
    endpoints:[
      { method:"GET", path:"/api/webhooks", desc:"List configured webhooks.", response:`{ "data":[ { "id":"WH-001", "url":"https://yourapp.com/webhook", "events":["vault.accessed","contact.verified"] } ] }` },
      { method:"POST", path:"/api/webhooks", desc:"Register a new webhook endpoint.", body:`{ "url":"https://yourapp.com/hook", "events":["vault.accessed","contact.verified","payment.overage"] }`, response:`{ "success":true, "webhook":{ "id":"WH-002", "secret":"whsec_..." } }` },
      { method:"DELETE", path:"/api/webhooks/:id", desc:"Remove a webhook.", response:`{ "success":true }` },
    ]
  },
  {
    label:"Admin Endpoints",
    endpoints:[
      { method:"GET", path:"/api/admin/users", desc:"[ADMIN] List all platform users with filtering and pagination.", response:`{ "data":[ { "id":"USR-8821", "name":"James Doe", "plan":"premium", "storage_used_gb":16.9, "status":"active" } ], "total":51490 }` },
      { method:"GET", path:"/api/admin/revenue", desc:"[ADMIN] Get revenue metrics — MRR, overage, churn.", response:`{ "mrr":112340, "overage_revenue":5212, "churn_rate":0.023, "ltv_avg":892 }` },
      { method:"GET", path:"/api/admin/verification-queue", desc:"[ADMIN] Get pending ID verification requests.", response:`{ "data":[ { "id":"VER-001", "contact_name":"Linda Torres", "submitted":"2026-06-11", "status":"pending" } ], "count":3 }` },
      { method:"POST", path:"/api/admin/verification/:id/approve", desc:"[ADMIN] Approve a legacy contact ID verification.", response:`{ "success":true, "contact_status":"verified" }` },
      { method:"POST", path:"/api/admin/verification/:id/reject", desc:"[ADMIN] Reject a verification with a reason.", body:`{ "reason":"ID image is blurry/unreadable" }`, response:`{ "success":true }` },
      { method:"GET", path:"/api/admin/payouts", desc:"[ADMIN] List all affiliate and partnership payouts.", response:`{ "data":[ { "id":"PAY-001", "recipient":"James Doe", "amount":189.50, "type":"affiliate", "status":"pending" } ] }` },
      { method:"PUT", path:"/api/admin/plans/:id", desc:"[ADMIN] Update a subscription plan's pricing or storage.", body:`{ "price":29.99, "storage_gb":30 }`, response:`{ "success":true, "effective":"immediately" }` },
    ]
  },
];

const sdkExamples: Record<string, string> = {
  javascript: `import FinalPassDown from '@finalpassdown/sdk';

const fpd = new FinalPassDown({
  apiKey: 'fpd_live_your_api_key_here',
  environment: 'production' // or 'sandbox'
});

// Get vault documents
const docs = await fpd.vault.documents.list({ category: 'legal' });

// Add a final wish
const wish = await fpd.finalWishes.create({
  item: "Grandfather's pocket watch",
  recipient: "Emily Doe",
  category: "sentimental",
  notes: "Has been in family since 1892"
});

// Subscribe to webhooks
fpd.webhooks.on('contact.verified', (event) => {
  console.log('Contact verified:', event.contact);
});`,
  python: `import finalpassdown

client = finalpassdown.Client(
    api_key="fpd_live_your_api_key_here",
    environment="production"
)

# Get vault documents
docs = client.vault.documents.list(category="legal")

# Add emergency info
client.medical.emergency_info.update(
    blood_type="O+",
    dnr=True,
    organ_donor=True,
    conditions=["Type 2 Diabetes", "Hypertension"]
)

# List affiliates
stats = client.affiliate.get_stats()
print(f"Current tier: {stats.tier}, Rate: {stats.rate}%")`,
  php: `use FinalPassDown\\Client;

$fpd = new Client([
    'api_key' => 'fpd_live_your_api_key_here',
    'environment' => 'production'
]);

// List contacts
$contacts = $fpd->contacts->list(['type' => 'legacy']);

// Get storage usage
$storage = $fpd->storage->getUsage();
echo "Used: {$storage->used_gb} GB of {$storage->limit_gb} GB";

// Upgrade subscription
$fpd->subscriptions->upgrade('legacy_pro');`,
  curl: `# Authenticate
curl -X POST https://api.finalpassdown.com/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"james@example.com","password":"••••••••"}'

# Get vault documents (with auth token)
curl https://api.finalpassdown.com/api/vault/documents \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "X-API-Key: fpd_live_your_api_key"

# Upload a document
curl -X POST https://api.finalpassdown.com/api/vault/documents \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -F "file=@will.pdf" \\
  -F "category=legal" \\
  -F "name=Last Will & Testament"`
};

const webhookEvents = [
  { event:"vault.document.uploaded", desc:"Triggered when a new document is added to the vault" },
  { event:"vault.document.deleted", desc:"Triggered when a document is deleted" },
  { event:"contact.invited", desc:"Triggered when a legacy contact invitation is sent" },
  { event:"contact.verified", desc:"Triggered when a contact completes ID verification" },
  { event:"storage.warning.80", desc:"Storage reaches 80% of plan limit" },
  { event:"storage.warning.90", desc:"Storage reaches 90% of plan limit" },
  { event:"storage.warning.95", desc:"Storage reaches 95% of plan limit" },
  { event:"storage.overage.started", desc:"User exceeds plan storage limit — overage billing begins" },
  { event:"payment.overage.charged", desc:"Overage charge successfully processed" },
  { event:"payment.subscription.renewed", desc:"Monthly subscription renewed successfully" },
  { event:"payment.subscription.failed", desc:"Subscription payment failed" },
  { event:"affiliate.commission.earned", desc:"Referral commission earned this cycle" },
  { event:"affiliate.payout.sent", desc:"Commission payout dispatched" },
];

export function EnterpriseAPI() {
  const [activeGroup, setActiveGroup] = useState(0);
  const [activeEndpoint, setActiveEndpoint] = useState<Endpoint | null>(null);
  const [sdkLang, setSdkLang] = useState("javascript");
  const [apiKey, setApiKey] = useState("fpd_live_xxxxxxxxxxxxxxxxxxxxxxxx");
  const [keyCopied, setKeyCopied] = useState(false);
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<"endpoints"|"sdk"|"webhooks"|"keys">("endpoints");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(0);

  const runTest = (ep: Endpoint) => {
    setTesting(true);
    setTestResponse(null);
    setTimeout(() => {
      setTesting(false);
      setTestResponse(ep.response);
    }, 800 + Math.random() * 400);
  };

  const copyKey = () => {
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const mc = (m: string) => (methodColor as any)[m] ?? "#8A9AB8";

  return (
    <div className="p-6 space-y-6 relative" style={{ maxWidth: 1300, ...GRID }}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Code size={15} color="#FFFFFF" />
            <span style={{ color: "#6E90C9", fontSize: 14, ...MONO, letterSpacing: "0.12em" }}>ENTERPRISE</span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 35.5, color: "#E8EDF5", marginBottom: 6 }}>API Reference & Developer Hub</h1>
          <p style={{ color: "#8A9AB8", fontSize: 17.5 }}>RESTful API · Laravel Sanctum Auth · JSON responses · Rate limited: 1000 req/min</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl" style={{ ...GLASS }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#48BB78", boxShadow: "0 0 8px #48BB78" }} />
          <span style={{ color: "#D99A6B", fontSize: 15, ...MONO }}>API STATUS: OPERATIONAL</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#0A0F1A", border: "1px solid rgba(91,110,225,0.25)", width: "fit-content" }}>
        {([["endpoints","Endpoints",<Book size={13}/>],["sdk","SDK Examples",<Terminal size={13}/>],["webhooks","Webhooks",<Webhook size={13}/>],["keys","API Keys",<Key size={13}/>]] as const).map(([id,label,icon]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl text-sm transition-all"
            style={{ background: activeTab===id ? "#5B6EE1" : "transparent", color: activeTab===id ? "#F0F4FA" : "#8A9AB8", fontWeight: activeTab===id ? 700 : 400 }}>
            {icon} {label}
          </button>
        ))}
      </div>

      {/* ENDPOINTS TAB */}
      {activeTab === "endpoints" && (
        <div className="grid grid-cols-1 lg:[grid-template-columns:260px_1fr]" style={{ gap: 20, minHeight: 600 }}>
          {/* sidebar */}
          <div className="rounded-2xl overflow-hidden" style={GLASS}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(91,110,225,0.1)" }}>
              <div style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO, letterSpacing: "0.1em" }}>BASE URL</div>
              <div style={{ color: "#6E90C9", fontSize: 14, ...MONO, marginTop: 2 }}>https://api.finalpassdown.com</div>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 700 }}>
              {apiGroups.map((group, gi) => (
                <div key={gi}>
                  <button className="w-full flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(91,110,225,0.06)", background: expandedGroup===gi ? "rgba(91,110,225,0.06)" : "transparent" }}
                    onClick={() => setExpandedGroup(expandedGroup===gi ? null : gi)}>
                    <span style={{ color: "#E8EDF5", fontSize: 16, fontWeight: 500 }}>{group.label}</span>
                    <div className="flex items-center gap-2">
                      <span style={{ color: "#8A9AB8", fontSize: 12.5, ...MONO }}>{group.endpoints.length}</span>
                      {expandedGroup===gi ? <ChevronDown size={12} color="#8A9AB8" /> : <ChevronRight size={12} color="#8A9AB8" />}
                    </div>
                  </button>
                  {expandedGroup===gi && group.endpoints.map((ep, ei) => (
                    <button key={ei} className="w-full flex items-start gap-2 px-4 py-2.5 border-b text-left"
                      style={{ borderColor: "rgba(91,110,225,0.04)", background: activeEndpoint===ep ? "rgba(91,110,225,0.1)" : "transparent" }}
                      onClick={() => setActiveEndpoint(ep)}>
                      <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: mc(ep.method), flexShrink:0, marginTop: 3, minWidth: 40 }}>{ep.method}</span>
                      <span style={{ color: "#8A9AB8", fontSize: 14, ...MONO, lineHeight: 1.4, wordBreak: "break-all" }}>{ep.path}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* detail panel */}
          <div className="rounded-2xl p-6" style={GLASS}>
            {!activeEndpoint ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Code size={40} color="rgba(91,110,225,0.2)" style={{ marginBottom: 16 }} />
                <div style={{ color: "#8A9AB8", fontSize: 19 }}>Select an endpoint to view details and test it</div>
                <div style={{ color: "#8A9AB8", fontSize: 16, marginTop: 8 }}>{apiGroups.reduce((s,g)=>s+g.endpoints.length,0)} endpoints across {apiGroups.length} modules</div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-xl text-sm font-bold" style={{ background: `${mc(activeEndpoint.method)}18`, color: mc(activeEndpoint.method), ...MONO }}>{activeEndpoint.method}</span>
                  <code style={{ color: "#E8EDF5", fontSize: 19, ...MONO }}>{activeEndpoint.path}</code>
                </div>
                <p style={{ color: "#8AA3C8", fontSize: 17.5, lineHeight: 1.7 }}>{activeEndpoint.desc}</p>

                {activeEndpoint.body && (
                  <div>
                    <div style={{ color: "#8A9AB8", fontSize: 14, ...MONO, letterSpacing: "0.08em", marginBottom: 8 }}>REQUEST BODY</div>
                    <div className="p-4 rounded-2xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(91,110,225,0.15)" }}>
                      <pre style={{ color: "#6E90C9", fontSize: 15, ...MONO, margin: 0, whiteSpace: "pre-wrap" }}>{activeEndpoint.body}</pre>
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ color: "#8A9AB8", fontSize: 14, ...MONO, letterSpacing: "0.08em", marginBottom: 8 }}>RESPONSE</div>
                  <div className="p-4 rounded-2xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(72,187,120,0.2)" }}>
                    <pre style={{ color: "#68D391", fontSize: 15, ...MONO, margin: 0, whiteSpace: "pre-wrap" }}>{activeEndpoint.response}</pre>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => runTest(activeEndpoint)} disabled={testing}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-sm font-semibold transition-all"
                    style={{ background: testing ? "rgba(91,110,225,0.1)" : "linear-gradient(135deg,#5B6EE1,#5B6EE1)", color: testing ? "#6E90C9" : "#F0F4FA", boxShadow: testing ? "none" : "0 0 20px rgba(91,110,225,0.3)" }}>
                    <Play size={14} fill="currentColor" />
                    {testing ? "Running..." : "Run Live Test"}
                  </button>
                  <span style={{ color: "#8A9AB8", fontSize: 15 }}>Uses sandbox credentials</span>
                </div>

                {testResponse && (
                  <div>
                    <div style={{ color: "#D99A6B", fontSize: 14, ...MONO, letterSpacing: "0.08em", marginBottom: 8 }}>✓ LIVE RESPONSE (200 OK)</div>
                    <div className="p-4 rounded-2xl overflow-x-auto" style={{ background: "rgba(72,187,120,0.04)", border: "1px solid rgba(72,187,120,0.2)" }}>
                      <pre style={{ color: "#68D391", fontSize: 15, ...MONO, margin: 0, whiteSpace: "pre-wrap" }}>{testResponse}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SDK TAB */}
      {activeTab === "sdk" && (
        <div className="space-y-5">
          <div className="flex gap-2">
            {Object.keys(sdkExamples).map(lang => (
              <button key={lang} onClick={() => setSdkLang(lang)}
                className="px-4 py-2 rounded-2xl text-sm transition-all capitalize"
                style={{ background: sdkLang===lang ? "#5B6EE1" : "rgba(91,110,225,0.06)", color: sdkLang===lang ? "#F0F4FA" : "#8A9AB8", fontWeight: sdkLang===lang ? 700 : 400, ...MONO }}>
                {lang}
              </button>
            ))}
          </div>
          <div className="p-6 rounded-2xl" style={{ ...GLASS }}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ color: "#8A9AB8", fontSize: 14, ...MONO }}>
                {sdkLang === "javascript" ? "npm install @finalpassdown/sdk" : sdkLang === "python" ? "pip install finalpassdown" : sdkLang === "php" ? "composer require finalpassdown/sdk" : "curl / HTTP"}
              </div>
              <button style={{ color: "#6E90C9", fontSize: 15 }}>Copy</button>
            </div>
            <pre className="overflow-x-auto" style={{ color: "#E8EDF5", fontSize: 16, ...MONO, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 }}>
              {sdkExamples[sdkLang]}
            </pre>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title:"Rate Limiting", desc:"1,000 requests/minute per API key. 10,000/minute for Enterprise plans.", color:"#6E90C9" },
              { title:"Sandbox Mode", desc:"Test with sandbox API keys — all data is isolated and never charged.", color:"#D99A6B" },
              { title:"Versioning", desc:"API version is included in the base URL: /v1/. Breaking changes release on new versions.", color:"#6FAE8B" },
            ].map(info => (
              <div key={info.title} className="p-5 rounded-2xl" style={GLASS}>
                <div style={{ color: info.color, fontSize: 17.5, fontWeight: 600, marginBottom: 8 }}>{info.title}</div>
                <p style={{ color: "#8A9AB8", fontSize: 16, lineHeight: 1.7 }}>{info.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEBHOOKS TAB */}
      {activeTab === "webhooks" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 16 }}>Configured Webhooks</h3>
              <div className="space-y-3">
                <div className="p-4 rounded-2xl" style={{ background: "rgba(91,110,225,0.06)", border: "1px solid rgba(91,110,225,0.2)" }}>
                  <div style={{ color: "#E8EDF5", fontSize: 16, marginBottom: 4 }}>https://yourapp.com/fpd-webhook</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {["vault.document.uploaded","contact.verified","storage.warning.80"].map(ev => (
                      <span key={ev} className="px-2 py-0.5 rounded text-xs" style={{ background: "rgba(91,110,225,0.1)", color: "#6E90C9", ...MONO, fontSize: 11 }}>{ev}</span>
                    ))}
                  </div>
                  <div style={{ color: "#D99A6B", fontSize: 14, marginTop: 8 }}>● Active · 0 failures</div>
                </div>
                <button className="w-full py-3 rounded-2xl text-sm" style={{ border: "1px dashed rgba(91,110,225,0.3)", color: "#6E90C9" }}>+ Add Webhook Endpoint</button>
              </div>
            </div>
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 16 }}>Webhook Signature Verification</h3>
              <pre className="p-4 rounded-2xl overflow-x-auto text-xs" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(91,110,225,0.15)", color: "#68D391", ...MONO, whiteSpace: "pre-wrap" }}>
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return \`sha256=\${expected}\` === signature;
}

// In your webhook handler:
app.post('/fpd-webhook', (req, res) => {
  const sig = req.headers['x-fpd-signature'];
  if (!verifyWebhook(req.body, sig, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  // Process event
  console.log('Event:', req.body.event, req.body.data);
  res.sendStatus(200);
});`}
              </pre>
            </div>
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 16 }}>Available Events</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {webhookEvents.map(ev => (
                <div key={ev.event} className="flex items-start gap-3 p-3 rounded-2xl" style={{ background: "rgba(91,110,225,0.04)" }}>
                  <Zap size={13} color="#FFFFFF" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ color: "#6E90C9", fontSize: 15, ...MONO }}>{ev.event}</div>
                    <div style={{ color: "#8A9AB8", fontSize: 14, marginTop: 2 }}>{ev.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* API KEYS TAB */}
      {activeTab === "keys" && (
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 16 }}>Live API Keys</h3>
              <div className="space-y-3">
                {[{ label:"Live Secret Key", key:"fpd_live_sk_xxxxxxxxxxxxxxxxxxxxxxxx", type:"live" }, { label:"Live Publishable Key", key:"fpd_live_pk_xxxxxxxxxxxxxxxxxxxxxxxx", type:"live" }].map(k => (
                  <div key={k.label}>
                    <div style={{ color: "#8A9AB8", fontSize: 14, marginBottom: 6 }}>{k.label}</div>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(91,110,225,0.2)" }}>
                      <Lock size={12} color="#8A9AB8" />
                      <span style={{ color: "#8A9AB8", fontSize: 15, ...MONO, flex: 1 }}>{k.key}</span>
                      <button onClick={copyKey} style={{ color: "#6E90C9" }}>{keyCopied ? <CheckCircle size={13} /> : <Copy size={13} />}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 rounded-2xl" style={GLASS}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 16 }}>Sandbox API Keys</h3>
              <div className="space-y-3">
                {[{ label:"Sandbox Secret Key", key:"fpd_test_sk_xxxxxxxxxxxxxxxxxxxxxxxx" }, { label:"Sandbox Publishable Key", key:"fpd_test_pk_xxxxxxxxxxxxxxxxxxxxxxxx" }].map(k => (
                  <div key={k.label}>
                    <div style={{ color: "#8A9AB8", fontSize: 14, marginBottom: 6 }}>{k.label}</div>
                    <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(246,173,85,0.2)" }}>
                      <Lock size={12} color="#F6AD55" />
                      <span style={{ color: "#8A9AB8", fontSize: 15, ...MONO, flex: 1 }}>{k.key}</span>
                      <button style={{ color: "#F6AD55" }}><Copy size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 px-4 py-3 rounded-2xl" style={{ background: "rgba(246,173,85,0.06)", border: "1px solid rgba(246,173,85,0.2)" }}>
                <span style={{ color: "#F6AD55", fontSize: 15 }}>Sandbox keys never charge real money and use isolated test data.</span>
              </div>
            </div>
          </div>
          <div className="p-6 rounded-2xl" style={GLASS}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "#E8EDF5", marginBottom: 16 }}>Usage This Month</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[{ label:"API Calls", value:"84,291", limit:"1M included", color:"#6E90C9" }, { label:"Webhooks Sent", value:"12,841", limit:"Unlimited", color:"#D99A6B" }, { label:"Documents Accessed", value:"2,190", limit:"Unlimited", color:"#6FAE8B" }, { label:"Rate Limit Hits", value:"0", limit:"1,000/min", color:"#F6AD55" }].map(stat => (
                <div key={stat.label} className="p-4 rounded-2xl" style={{ background: "rgba(91,110,225,0.04)", border: "1px solid rgba(91,110,225,0.1)" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 27.5, color: stat.color }}>{stat.value}</div>
                  <div style={{ color: "#E8EDF5", fontSize: 15, marginTop: 4 }}>{stat.label}</div>
                  <div style={{ color: "#8A9AB8", fontSize: 12.5, marginTop: 2, ...MONO }}>{stat.limit}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
