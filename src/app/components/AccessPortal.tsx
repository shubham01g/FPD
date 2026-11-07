/**
 * AccessPortal — "Shared with me" (/access; routes/contactAccess.ts,
 * migration 046). A Legacy or Guardian Contact, signed in with their own
 * login, sees each account that named them and opens what is shared:
 *
 *   Guardian  once verified: the sections and documents of the folders the
 *             owner assigned. View only — no download button, and the server
 *             never signs a download link for a guardian.
 *   Legacy    once the claim is approved and the continuation fee activated,
 *             until it expires: every section and document, downloads allowed.
 *
 * Everything is read-only. Encrypted vault fields (passwords, backup codes,
 * 2FA hand-off notes) show as "Encrypted by the owner" until the Legacy
 * Recovery Code exists (phase L2).
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield, Users, Lock, LoaderCircle, FileText, Eye, Download, ArrowLeft, Clock, TriangleAlert, LogOut, LayoutDashboard,
} from "lucide-react";
import { signOut } from "../services/auth";
import {
  documentUrl, getOwnerSections, getSection, listOwnerDocuments, listSharedOwners,
  type GrantStatus, type OwnerSections, type PortalDocument, type SectionData, type SharedOwner,
} from "../services/contactAccess";

const TEXT = "#EFF2F9";
const SOFT = "#BCC5DA";
const MUTED = "#A3ADC9";
const ACCENT = "#5B6EE1";
const BORDER = "rgba(255,255,255,0.08)";
const LEGACY = "#6FAE8B";
const GUARDIAN = "#D99A6B";
const WARN = "#D9A55E";
const NEG = "#D06B6B";
const DOCS_KEY = "__documents";

const CSS = `
.fpd-access{min-height:100%;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%),#070A12;font-family:var(--font-body);color:${TEXT};}
.fpd-access .wrap{max-width:1040px;margin:0 auto;padding:28px 20px 60px;}
.fpd-access .top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:22px;}
.fpd-access h1{font-family:var(--font-display);font-size:26px;font-weight:700;margin:0;letter-spacing:-0.01em;}
.fpd-access h2{font-family:var(--font-display);font-size:21px;font-weight:700;margin:0 0 4px;}
.fpd-access p{color:${MUTED};font-size:15.5px;line-height:1.6;margin:0;}
.fpd-access .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 14px;border-radius:12px;border:1px solid ${BORDER};background:rgba(255,255,255,0.04);color:${SOFT};font-size:14.5px;font-weight:600;cursor:pointer;font-family:var(--font-body);}
.fpd-access .btn:hover{background:rgba(255,255,255,0.08);}
.fpd-access .card{background:#101728;border:1px solid ${BORDER};border-radius:18px;padding:18px;}
.fpd-access .owners{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
.fpd-access .owner{cursor:default;text-align:left;width:100%;font-family:var(--font-body);color:${TEXT};}
.fpd-access .owner.open{cursor:pointer;}
.fpd-access .owner.open:hover{border-color:rgba(91,110,225,0.5);}
.fpd-access .chip{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:999px;font-size:12.5px;font-weight:700;letter-spacing:.04em;}
.fpd-access .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:18px 0;}
.fpd-access .tab{padding:8px 13px;border-radius:999px;border:1px solid ${BORDER};background:rgba(255,255,255,0.03);color:${SOFT};font-size:14.5px;cursor:pointer;font-family:var(--font-body);}
.fpd-access .tab.on{background:rgba(91,110,225,0.18);border-color:rgba(91,110,225,0.55);color:#fff;font-weight:600;}
.fpd-access .group{margin-bottom:22px;}
.fpd-access .group h3{font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:${MUTED};margin:0 0 10px;font-weight:700;}
.fpd-access .rows{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;}
.fpd-access .row h4{font-size:16.5px;margin:0 0 10px;font-weight:650;}
.fpd-access dl{margin:0;display:grid;grid-template-columns:minmax(110px,40%) 1fr;gap:6px 12px;}
.fpd-access dt{color:${MUTED};font-size:13.5px;}
.fpd-access dd{margin:0;color:${SOFT};font-size:14.5px;white-space:pre-wrap;word-break:break-word;}
.fpd-access .enc{display:inline-flex;align-items:center;gap:5px;color:${WARN};font-size:13.5px;}
.fpd-access .photos{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;}
.fpd-access .photos img{width:76px;height:76px;object-fit:cover;border-radius:10px;border:1px solid ${BORDER};}
.fpd-access .doc{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid ${BORDER};}
.fpd-access .doc:last-child{border-bottom:none;}
.fpd-access .note{display:flex;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(217,165,94,0.08);border:1px solid rgba(217,165,94,0.3);margin-bottom:16px;}
.fpd-access .err{color:#FC8181;font-size:14.5px;}
@media (max-width:640px){.fpd-access .wrap{padding:20px 16px 48px;} .fpd-access .rows{grid-template-columns:1fr;} .fpd-access dl{grid-template-columns:1fr;gap:2px;} .fpd-access dd{margin-bottom:8px;}}
`;

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

function statusLine(o: SharedOwner): { text: string; color: string } {
  const map: Record<GrantStatus, { text: string; color: string }> = {
    active: o.kind === "legacy"
      ? { text: o.expiresAt ? `Open until ${fmtDate(o.expiresAt)}` : "Open", color: LEGACY }
      : { text: "View-only access is open", color: GUARDIAN },
    awaiting_verification: { text: "Waiting for Final Pass Down to verify you", color: WARN },
    awaiting_claim: { text: "Nothing is shared yet. Opens only after a claim on their passing is approved.", color: MUTED },
    awaiting_activation: { text: "Claim approved. Waiting for the Legacy Continuation Fee to be activated.", color: WARN },
    expired: { text: `The access window ended${o.expiresAt ? ` on ${fmtDate(o.expiresAt)}` : ""}`, color: NEG },
    rejected: { text: "Your verification was not approved. Contact Final Pass Down support.", color: NEG },
  };
  return map[o.status];
}

const fmtSize = (b: number) => b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

export function AccessPortal() {
  const navigate = useNavigate();
  const [owners, setOwners] = useState<SharedOwner[] | null>(null);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<OwnerSections | null>(null);
  const [tab, setTab] = useState<string>("");
  const [section, setSection] = useState<SectionData | null>(null);
  const [docs, setDocs] = useState<PortalDocument[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listSharedOwners().then(setOwners).catch(e => setErr((e as Error).message));
  }, []);

  const openOwner = async (o: SharedOwner) => {
    setErr(""); setBusy(true);
    try {
      const s = await getOwnerSections(o.ownerId);
      setOpen(s);
      await pick(s, s.sections[0]?.key ?? DOCS_KEY);
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const pick = async (s: OwnerSections, key: string) => {
    setTab(key); setErr(""); setSection(null); setDocs(null); setBusy(true);
    try {
      if (key === DOCS_KEY) setDocs(await listOwnerDocuments(s.owner.id));
      else setSection(await getSection(s.owner.id, key));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  const openDoc = async (d: PortalDocument, download: boolean) => {
    if (!open) return;
    // Open the tab synchronously so a popup blocker doesn't eat it.
    const win = download ? null : window.open("", "_blank");
    try {
      const url = await documentUrl(open.owner.id, d.id, download);
      if (win) win.location.href = url; else window.location.href = url;
    } catch (e) { win?.close(); setErr((e as Error).message); }
  };

  const kindChip = (kind: "legacy" | "guardian") => {
    const c = kind === "legacy" ? LEGACY : GUARDIAN;
    return (
      <span className="chip" style={{ background: `${c}1F`, color: c, border: `1px solid ${c}55` }}>
        {kind === "legacy" ? <Shield size={12} /> : <Users size={12} />}
        {kind === "legacy" ? "LEGACY CONTACT" : "GUARDIAN · VIEW ONLY"}
      </span>
    );
  };

  let body: React.ReactNode;
  if (open) {
    body = (
      <>
        <button className="btn" onClick={() => { setOpen(null); setSection(null); setDocs(null); }}><ArrowLeft size={15} /> All shared accounts</button>
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <h2>{open.owner.name}</h2>{kindChip(open.kind)}
          </div>
          <p>
            {open.kind === "legacy"
              ? `Read-only Legacy Vault access${open.expiresAt ? `, open until ${fmtDate(open.expiresAt)}` : ""}.`
              : "View-only access to the folders they chose for you. Files can be viewed but not downloaded."}
          </p>
        </div>
        <div className="tabs">
          {open.sections.map(s => (
            <button key={s.key} className={`tab${tab === s.key ? " on" : ""}`} onClick={() => pick(open, s.key)}>{s.label}</button>
          ))}
          <button className={`tab${tab === DOCS_KEY ? " on" : ""}`} onClick={() => pick(open, DOCS_KEY)}>Documents</button>
        </div>
        {err && <p className="err" style={{ marginBottom: 12 }}>{err}</p>}
        {busy && <p><LoaderCircle size={15} className="animate-spin" style={{ display: "inline", verticalAlign: "-2px" }} /> Loading…</p>}
        {section && (
          section.groups.length === 0
            ? <p>Nothing has been added to {section.section.label} yet.</p>
            : <>
              {section.groups.some(g => g.rows.some(r => r.fields.some(f => f.encrypted))) && (
                <div className="note">
                  <Lock size={16} color={WARN} style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 14.5 }}>Some fields are encrypted with the owner's own vault passphrase, so nobody, including Final Pass Down, can show them here yet.</p>
                </div>
              )}
              {section.groups.map(g => (
                <div className="group" key={g.label}>
                  <h3>{g.label}</h3>
                  <div className="rows">
                    {g.rows.map(r => (
                      <div className="card row" key={r.id}>
                        <h4>{r.title}</h4>
                        {r.fields.length > 0 && (
                          <dl>
                            {r.fields.map((f, i) => (
                              <React.Fragment key={i}>
                                <dt>{f.label}</dt>
                                <dd>{f.encrypted ? <span className="enc"><Lock size={12} /> Encrypted by the owner</span> : f.value}</dd>
                              </React.Fragment>
                            ))}
                          </dl>
                        )}
                        {r.photos.length > 0 && (
                          <div className="photos">{r.photos.map(src => <img key={src} src={src} alt="" />)}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
        )}
        {docs && (
          docs.length === 0
            ? <p>No documents have been shared with you here.</p>
            : <div className="card" style={{ padding: 0 }}>
              {docs.map(d => (
                <div className="doc" key={d.id}>
                  <FileText size={18} color={ACCENT} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</div>
                    <div style={{ color: MUTED, fontSize: 13.5 }}>{d.folder} · {fmtSize(d.sizeBytes)} · {fmtDate(d.uploadedAt)}</div>
                  </div>
                  <button className="btn" onClick={() => openDoc(d, false)}><Eye size={14} /> View</button>
                  {open.canDownload && <button className="btn" onClick={() => openDoc(d, true)}><Download size={14} /> Download</button>}
                </div>
              ))}
            </div>
        )}
      </>
    );
  } else if (err && !owners) {
    body = <p className="err">{err}</p>;
  } else if (!owners) {
    body = <p>Loading…</p>;
  } else if (owners.length === 0) {
    body = (
      <div className="card">
        <h2>Nothing is shared with you yet</h2>
        <p style={{ marginTop: 6 }}>When someone names you as their Legacy or Guardian Contact, accept the invitation from the email they send you. It then appears here.</p>
      </div>
    );
  } else {
    body = (
      <>
        {err && <p className="err" style={{ marginBottom: 12 }}>{err}</p>}
        <div className="owners">
          {owners.map(o => {
            const s = statusLine(o);
            const live = o.status === "active";
            return (
              <button key={`${o.ownerId}-${o.kind}`} className={`card owner${live ? " open" : ""}`} disabled={!live || busy} onClick={() => openOwner(o)}>
                <div style={{ marginBottom: 10 }}>{kindChip(o.kind)}</div>
                <div style={{ fontSize: 18, fontWeight: 650, marginBottom: 6 }}>{o.ownerName}</div>
                <div style={{ display: "flex", gap: 7, alignItems: "flex-start", color: s.color, fontSize: 14.5, lineHeight: 1.5 }}>
                  {live ? <Eye size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    : o.status === "expired" || o.status === "rejected" ? <TriangleAlert size={15} style={{ flexShrink: 0, marginTop: 2 }} />
                    : <Clock size={15} style={{ flexShrink: 0, marginTop: 2 }} />}
                  <span>{s.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <div className="fpd-access">
      <style>{CSS}</style>
      <div className="wrap">
        <div className="top">
          <div>
            <h1>Shared with me</h1>
            <p>Accounts that named you as a Legacy or Guardian Contact.</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={() => navigate("/dashboard")}><LayoutDashboard size={15} /> My account</button>
            <button className="btn" onClick={async () => { await signOut(); navigate("/"); }}><LogOut size={15} /> Sign out</button>
          </div>
        </div>
        {body}
      </div>
    </div>
  );
}
