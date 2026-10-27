/**
 * VaultResetPage — where the emailed "Reset vault passphrase" link lands
 * (/vault-reset/:token; routes/vaultReset.ts, migration 043).
 *
 * Two things are required: the link, and being signed in as the account it
 * was sent for. Signed out, the page sends the user to sign in and back here.
 * The reset erases the encrypted fields — the vault is zero-knowledge, so
 * nothing is recovered — and the next visit to Password Manager or Auto Pay
 * shows "Create your vault passphrase".
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { RotateCcw, TriangleAlert, LoaderCircle, CheckCircle, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { lockVault } from "../services/vaultCrypto";
import { checkVaultReset, confirmVaultReset, type ResetCheck, type ResetProblem } from "../services/vaultReset";

const TEXT = "#EFF2F9";
const SOFT = "#BCC5DA";
const MUTED = "#A3ADC9";
const ACCENT = "#5B6EE1";
const POS = "#5FBE91";
const NEG = "#D06B6B";

const CSS = `
.fpd-vreset{min-height:100%;display:flex;align-items:flex-start;justify-content:center;padding:64px 20px;background:radial-gradient(1200px 460px at 60% -140px,rgba(91,110,225,0.10),transparent 70%),#070A12;font-family:var(--font-body);}
.fpd-vreset .panel{width:100%;max-width:480px;background:#101728;border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:30px 28px;}
.fpd-vreset .ico{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.fpd-vreset h2{font-family:var(--font-display);font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;letter-spacing:-0.01em;}
.fpd-vreset p{color:${MUTED};font-size:15.5px;line-height:1.65;margin:0 0 18px;}
.fpd-vreset .warn{display:flex;gap:10px;padding:14px 15px;border-radius:16px;background:rgba(208,107,107,0.08);border:1px solid rgba(208,107,107,0.3);margin-bottom:18px;}
.fpd-vreset .warn p{color:${SOFT};font-size:14.5px;line-height:1.6;margin:0;}
.fpd-vreset .warn strong{color:${NEG};}
.fpd-vreset button.go{width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;font-family:var(--font-body);font-size:16px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;gap:8px;background:linear-gradient(180deg,#7E6BD8,${ACCENT});}
.fpd-vreset button.go.neg{background:linear-gradient(180deg,#D97C7C,${NEG});}
.fpd-vreset button.go:disabled{opacity:.55;cursor:not-allowed;}
.fpd-vreset button.link{display:block;margin:16px auto 0;background:none;border:none;cursor:pointer;color:#AEB9F5;font-size:14.5px;font-family:var(--font-body);text-decoration:underline;text-underline-offset:3px;}
.fpd-vreset .err{color:#FC8181;font-size:14.5px;margin:0 0 12px;}
@media (max-width:640px){.fpd-vreset{padding:28px 16px;} .fpd-vreset .panel{padding:24px 20px;}}
`;

const PROBLEM_TEXT: Record<ResetProblem, { title: string; body: string }> = {
  invalid:       { title: "This link isn't valid", body: "It may have been copied incompletely. Open the email again, or ask for a new link from the vault unlock screen." },
  expired:       { title: "This link has expired", body: "Reset links work for 45 minutes. Open Password Manager or Auto Pay & Subs, click \"Forgot your passphrase?\" and ask for a new one." },
  used:          { title: "This link was already used", body: "Each link works once, and asking for a new link retires the old one. If you still need to reset, ask for a new link from the vault unlock screen." },
  wrong_account: { title: "Signed in to a different account", body: "This link belongs to another FinalPassDown account. Sign out, sign in to the account the email was sent to, then open the link again." },
};

export function VaultResetPage({ token }: { token: string }) {
  const { authUser, loading } = useAuth();
  const navigate = useNavigate();
  const [check, setCheck] = useState<ResetCheck | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!authUser) return;
    checkVaultReset(token).then(setCheck).catch(e => setLoadErr((e as Error).message));
  }, [authUser, token]);

  const reset = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await confirmVaultReset(token);
      if ("problem" in r) setCheck({ ok: false, problem: r.problem });
      else { lockVault(); setDone(true); }
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
        <h2>Sign in to reset your vault</h2>
        <p>For your security, the reset link only works while you're signed in to the account it was sent to.</p>
        <button className="go" onClick={() => navigate(`/login?next=${encodeURIComponent(`/vault-reset/${token}`)}`)}>
          <LogIn size={16} /> Sign in to continue
        </button>
      </>
    );
  } else if (done) {
    body = (
      <>
        {icon(POS, <CheckCircle size={22} />)}
        <h2>Your vault has been reset</h2>
        <p>Open Password Manager or Auto Pay &amp; Subs and create a new vault passphrase. Then re-enter the passwords you want to keep.</p>
        <button className="go" onClick={() => navigate("/dashboard")}>Go to my dashboard</button>
      </>
    );
  } else if (loadErr) {
    body = (
      <>
        {icon(NEG, <TriangleAlert size={22} />)}
        <h2>Couldn't check this link</h2>
        <p>{loadErr}</p>
        <button className="link" onClick={() => navigate("/dashboard")}>Back to my dashboard</button>
      </>
    );
  } else if (!check) {
    body = <p>Checking your reset link…</p>;
  } else if ("problem" in check) {
    body = (
      <>
        {icon(NEG, <TriangleAlert size={22} />)}
        <h2>{PROBLEM_TEXT[check.problem].title}</h2>
        <p>{PROBLEM_TEXT[check.problem].body}</p>
        <button className="go" onClick={() => navigate("/dashboard")}>Go to my dashboard</button>
      </>
    );
  } else {
    body = (
      <>
        {icon(NEG, <RotateCcw size={22} />)}
        <h2>Reset your vault passphrase</h2>
        <p>Signed in as <b style={{ color: TEXT }}>{check.email}</b>. After the reset you'll create a new vault passphrase.</p>
        <div className="warn">
          <TriangleAlert size={17} color={NEG} style={{ flexShrink: 0, marginTop: 1 }} />
          <p>
            <strong>This permanently erases</strong> {check.passwords} saved password{check.passwords === 1 ? "" : "s"} in
            Password Manager and the login passwords on {check.subscriptions} Auto Pay subscription{check.subscriptions === 1 ? "" : "s"},
            plus security answers and backup codes. Nobody can recover them, including us. Titles, websites, usernames,
            amounts and dates are kept.
          </p>
        </div>
        {err && <div className="err">{err}</div>}
        <button className="go neg" onClick={reset} disabled={busy}>
          {busy ? <><LoaderCircle size={16} className="animate-spin" /> Resetting…</> : <>Erase and reset vault</>}
        </button>
        <button className="link" onClick={() => navigate("/dashboard")}>Cancel — keep my vault</button>
      </>
    );
  }

  return (
    <div className="fpd-vreset">
      <style>{CSS}</style>
      <div className="panel">{body}</div>
    </div>
  );
}
