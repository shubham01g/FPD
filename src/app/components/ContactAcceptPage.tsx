/**
 * ContactAcceptPage — where a Legacy or Guardian Contact's emailed invite
 * lands (/contact-accept/:token; routes/contactAccess.ts, migration 046).
 *
 * Accepting links the contact row to the signed-in Final Pass Down login, so
 * the person named can later open what was shared at /access. Signed out, the
 * page offers sign in or a free sign-up and comes back here afterwards.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Shield, Users, TriangleAlert, LoaderCircle, CheckCircle, LogIn, UserPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { signOut } from "../services/auth";
import { acceptContactInvite, checkContactInvite, type InviteCheck, type InviteProblem } from "../services/contactAccess";

const TEXT = "#EFF2F9";
const MUTED = "#A3ADC9";
const ACCENT = "#5B6EE1";
const POS = "#5FBE91";
const NEG = "#D06B6B";
const LEGACY = "#6FAE8B";
const GUARDIAN = "#D99A6B";

const CSS = `
.fpd-caccept{min-height:100%;display:flex;align-items:flex-start;justify-content:center;padding:64px 20px;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%),#070A12;font-family:var(--font-body);}
.fpd-caccept .panel{width:100%;max-width:480px;background:#101728;border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:30px 28px;}
.fpd-caccept .ico{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.fpd-caccept h2{font-family:var(--font-display);font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;letter-spacing:-0.01em;}
.fpd-caccept p{color:${MUTED};font-size:15.5px;line-height:1.65;margin:0 0 18px;}
.fpd-caccept button.go{width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;font-family:var(--font-body);font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(180deg,#7E6BD8,${ACCENT});margin-bottom:10px;}
.fpd-caccept button.go.alt{background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.4);}
.fpd-caccept button.go:disabled{opacity:.55;cursor:not-allowed;}
.fpd-caccept button.link{display:block;margin:16px auto 0;background:none;border:none;cursor:pointer;color:#AEB9F5;font-size:14.5px;font-family:var(--font-body);text-decoration:underline;text-underline-offset:3px;}
.fpd-caccept .err{color:#FC8181;font-size:14.5px;margin:0 0 12px;}
@media (max-width:640px){.fpd-caccept{padding:28px 16px;} .fpd-caccept .panel{padding:24px 20px;}}
`;

const PROBLEM_TEXT: Record<InviteProblem, { title: string; body: string }> = {
  invalid:      { title: "This invite link isn't valid", body: "It may have been copied incompletely, or a newer invite replaced it. Open the most recent email, or ask the person who named you to send the invite again." },
  expired:      { title: "This invite has expired", body: "Invite links work for 30 days. Ask the person who named you to send the invite again from their Contacts page." },
  own_account:  { title: "This is your own account", body: "You're signed in to the account that sent this invite. Sign out, then sign in as the person who was invited (or create their free sign-in)." },
  linked_other: { title: "Already accepted on another sign-in", body: "This invitation was accepted by a different Final Pass Down sign-in. If that wasn't you, contact Final Pass Down support." },
};

export function ContactAcceptPage({ token }: { token: string }) {
  const { authUser, loading } = useAuth();
  const navigate = useNavigate();
  const [check, setCheck] = useState<InviteCheck | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const here = encodeURIComponent(`/contact-accept/${token}`);

  useEffect(() => {
    if (!authUser) return;
    checkContactInvite(token).then(setCheck).catch(e => setLoadErr((e as Error).message));
  }, [authUser, token]);

  const accept = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await acceptContactInvite(token);
      if ("problem" in r) setCheck({ ok: false, problem: r.problem });
      else setDone(true);
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const icon = (color: string, node: React.ReactNode) => (
    <div className="ico" style={{ background: `${color}1F`, border: `1px solid ${color}55`, color }}>{node}</div>
  );

  let body: React.ReactNode;
  if (loading) {
    body = <p>Loading…</p>;
  } else if (!authUser) {
    body = (
      <>
        {icon(ACCENT, <LogIn size={22} />)}
        <h2>Accept your invitation</h2>
        <p>You were named as a trusted contact on Final Pass Down. Sign in, or create a free sign-in, to connect this invitation to you. You won't be asked to pay.</p>
        <button className="go" onClick={() => navigate(`/login?next=${here}`)}><LogIn size={16} /> Sign in</button>
        <button className="go alt" onClick={() => navigate(`/signup?next=${here}`)}><UserPlus size={16} /> Create a free sign-in</button>
        <p style={{ fontSize: 13.5, margin: "8px 0 0" }}>If sign-up asks you to confirm your email, open this invite link again afterwards.</p>
      </>
    );
  } else if (loadErr) {
    body = (
      <>
        {icon(NEG, <TriangleAlert size={22} />)}
        <h2>Couldn't check this invite</h2>
        <p>{loadErr}</p>
      </>
    );
  } else if (!check) {
    body = <p>Checking your invitation…</p>;
  } else if ("problem" in check) {
    body = (
      <>
        {icon(NEG, <TriangleAlert size={22} />)}
        <h2>{PROBLEM_TEXT[check.problem].title}</h2>
        <p>{PROBLEM_TEXT[check.problem].body}</p>
        {check.problem === "own_account"
          ? <button className="go" onClick={async () => { await signOut(); navigate(`/login?next=${here}`); }}>Sign out and switch</button>
          : <button className="go" onClick={() => navigate("/access")}>Go to Shared with me</button>}
      </>
    );
  } else if (done || check.alreadyAccepted) {
    body = (
      <>
        {icon(POS, <CheckCircle size={22} />)}
        <h2>You're connected</h2>
        <p>
          {check.kind === "legacy"
            ? `You're ${check.ownerName}'s Legacy Contact. Nothing is shared with you today. If the time comes and the claim is approved, their Legacy Vault opens under "Shared with me" on this sign-in.`
            : `You're ${check.ownerName}'s Guardian Contact. Once our team has verified you, the folders they chose appear under "Shared with me", view-only.`}
        </p>
        <button className="go" onClick={() => navigate("/access")}>Go to Shared with me</button>
      </>
    );
  } else {
    const legacy = check.kind === "legacy";
    body = (
      <>
        {icon(legacy ? LEGACY : GUARDIAN, legacy ? <Shield size={22} /> : <Users size={22} />)}
        <h2>{check.ownerName} named you their {legacy ? "Legacy Contact" : "Guardian Contact"}</h2>
        <p>
          Hi {check.contactName}. Accepting connects this role to the sign-in you're using now
          ({authUser.email}). {legacy
            ? "Their vault is shared only after their passing is verified and the claim is approved."
            : "You'll get view-only access to the folders they chose, after our team verifies you."}
        </p>
        {err && <div className="err">{err}</div>}
        <button className="go" onClick={accept} disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="animate-spin" /> Accepting…</> : <>Accept invitation</>}
        </button>
        <button className="link" onClick={async () => { await signOut(); navigate(`/login?next=${here}`); }}>Not you? Use a different sign-in</button>
      </>
    );
  }

  return (
    <div className="fpd-caccept">
      <style>{CSS}</style>
      <div className="panel">{body}</div>
    </div>
  );
}
