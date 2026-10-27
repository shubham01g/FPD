/**
 * VaultUnlock — the gate in front of encrypted credentials.
 *
 * Wraps any screen that reads or writes secrets (Password Manager,
 * Subscription Manager). Three states:
 *
 *   never set up  → offer to create a passphrase, with the no-recovery
 *                   warning stated before anything is created
 *   set up, locked→ ask for the passphrase; "Forgot your passphrase?" emails
 *                   a one-time reset link to the registered address
 *                   (VaultResetPage.tsx, migration 043)
 *   unlocked      → render the screen
 *
 * The passphrase is never sent anywhere and never stored. It derives a key
 * that lives in memory for the session; a refresh re-locks. See
 * services/vaultCrypto.ts for the reasoning.
 *
 * The inputs opt out of browser autofill. Without that, Chrome filled the
 * saved FinalPassDown login password into the passphrase box, so a client who
 * had never chosen a passphrase saw one "already entered" — and the same
 * autofill could quietly create a vault on the setup screen.
 */
import React, { useEffect, useState } from "react";
import { Lock, ShieldCheck, TriangleAlert, LoaderCircle, Eye, EyeOff, Mail } from "lucide-react";
import { toast } from "sonner";
import { db } from "../services/supabase";
import { requestVaultReset } from "../services/vaultReset";
import { useAuth } from "../context/AuthContext";
import { createVault, unlockVault, isUnlocked, lockVault } from "../services/vaultCrypto";

const TEXT = "#EFF2F9";
const SOFT = "#BCC5DA";
const MUTED = "#A3ADC9";
const ACCENT = "#5B6EE1";
const WARN = "#D9A55E";

const CSS = `
.fpd-unlock{display:flex;align-items:flex-start;justify-content:center;padding:48px 20px;}
.fpd-unlock .panel{width:100%;max-width:460px;background:#101728;border:1px solid rgba(255,255,255,0.08);border-radius:22px;padding:30px 28px;}
.fpd-unlock .ico{width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:rgba(91,110,225,0.14);border:1px solid rgba(91,110,225,0.3);color:#AEB9F5;margin-bottom:16px;}
.fpd-unlock h2{font-family:var(--font-display);font-size:24px;font-weight:700;color:${TEXT};margin:0 0 8px;letter-spacing:-0.01em;}
.fpd-unlock p{color:${MUTED};font-size:15.5px;line-height:1.65;margin:0 0 18px;}
.fpd-unlock label{display:block;color:${MUTED};font-size:12.5px;font-family:var(--font-mono);letter-spacing:0.08em;margin-bottom:6px;}
.fpd-unlock .hint{color:${MUTED};font-size:13.5px;margin:-8px 0 14px;}
.fpd-unlock .pw-wrap{position:relative;}
.fpd-unlock input{width:100%;padding:12px 14px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.1);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);margin-bottom:14px;}
.fpd-unlock .pw-wrap input{padding-right:42px;}
.fpd-unlock input:focus{border-color:${ACCENT};box-shadow:0 0 0 3px rgba(91,110,225,0.18);}
.fpd-unlock .pw-toggle{position:absolute;right:12px;top:12px;background:none;border:none;color:${MUTED};cursor:pointer;display:flex;padding:2px;}
.fpd-unlock .warn{display:flex;gap:10px;padding:14px 15px;border-radius:16px;background:rgba(217,165,94,0.09);border:1px solid rgba(217,165,94,0.28);margin-bottom:18px;}
.fpd-unlock .warn p{color:${SOFT};font-size:14.5px;line-height:1.6;margin:0;}
.fpd-unlock .warn strong{color:${WARN};}
.fpd-unlock button.go{width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;font-family:var(--font-body);font-size:16px;font-weight:700;color:#fff;background:linear-gradient(180deg,#7E6BD8,${ACCENT});display:flex;align-items:center;justify-content:center;gap:8px;}
.fpd-unlock button.go:disabled{opacity:.55;cursor:not-allowed;}
.fpd-unlock button.link{display:block;margin:16px auto 0;background:none;border:none;cursor:pointer;color:#AEB9F5;font-size:14.5px;font-family:var(--font-body);text-decoration:underline;text-underline-offset:3px;}
.fpd-unlock .sent{display:flex;gap:10px;padding:14px 15px;border-radius:16px;background:rgba(95,190,145,0.09);border:1px solid rgba(95,190,145,0.28);margin-bottom:6px;}
.fpd-unlock .sent p{color:${SOFT};font-size:14.5px;line-height:1.6;margin:0;}
.fpd-unlock .err{color:#FC8181;font-size:14.5px;margin:-6px 0 12px;}
@media (max-width:640px){.fpd-unlock{padding:24px 16px;} .fpd-unlock .panel{padding:24px 20px;}}
`;

/* Autofill opt-out: "new-password" is the value Chrome honours on password
   fields ("off" is ignored there); the data-* flags cover LastPass/1Password. */
function SecretInput({ id, name, value, onChange, onEnter, autoFocus, show, onToggle }: {
  id: string; name: string; value: string; onChange: (v: string) => void;
  onEnter?: () => void; autoFocus?: boolean; show: boolean; onToggle: () => void;
}) {
  return (
    <div className="pw-wrap">
      <input id={id} name={name} type={show ? "text" : "password"} value={value} autoFocus={autoFocus}
        autoComplete="new-password" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        data-lpignore="true" data-1p-ignore="true" data-form-type="other"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()} />
      <button type="button" className="pw-toggle" onClick={onToggle} aria-label={show ? "Hide passphrase" : "Show passphrase"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function VaultUnlock({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [salt, setSalt] = useState<string | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [forgot, setForgot] = useState(false);
  const [sentTo, setSentTo] = useState<{ to: string; minutes: number } | null>(null);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await db.getUser(authUser.id);
      if (cancelled) return;
      if (error) {
        toast.error(`Could not check vault status: ${error.message}`);
      } else if (data?.vault_salt && data?.vault_verifier) {
        setHasVault(true);
        setSalt(data.vault_salt);
        setVerifier(data.vault_verifier);
      }
      setChecking(false);
    })();
    return () => { cancelled = true; };
  }, [authUser]);

  if (!authUser) return null;
  if (unlocked) return <>{children}</>;

  const setup = async () => {
    setErr("");
    if (pass.length < 10) return setErr("Use at least 10 characters — this is the only thing protecting your credentials.");
    if (pass !== confirm) return setErr("The two passphrases do not match.");
    setBusy(true);
    try {
      const { salt: s, verifier: v } = await createVault(pass);
      const { error } = await db.updateUser(authUser.id, { vault_salt: s, vault_verifier: v });
      if (error) { lockVault(); setErr(`Could not save vault key: ${error.message}`); setBusy(false); return; }
      setUnlocked(true);
      toast.success("Vault created and unlocked");
    } catch (e) {
      setErr(`Could not create the vault: ${(e as Error).message}`);
    }
    setBusy(false);
  };

  const unlock = async () => {
    setErr("");
    setBusy(true);
    const ok = await unlockVault(pass, salt!, verifier!).catch(() => false);
    setBusy(false);
    if (!ok) return setErr("That passphrase is not correct.");
    setUnlocked(true);
  };

  /* The link goes to the account's registered email, which the server takes
     from the session — nothing typed here can redirect it. */
  const sendReset = async () => {
    setErr("");
    setBusy(true);
    try {
      const r = await requestVaultReset();
      setSentTo({ to: r.to, minutes: r.minutes });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  const toggle = () => setShow(s => !s);

  return (
    <div className="fpd-unlock">
      <style>{CSS}</style>
      <div className="panel">
        <div className="ico">{hasVault ? <Lock size={22} /> : <ShieldCheck size={22} />}</div>

        {checking ? (
          <p>Checking vault status…</p>
        ) : hasVault && forgot ? (
          <>
            <h2>Forgot your passphrase?</h2>
            <p>We'll email a reset link to the address registered on your account. The link works once and only while you're signed in.</p>
            <div className="warn">
              <TriangleAlert size={17} color={WARN} style={{ flexShrink: 0, marginTop: 1 }} />
              <p>
                <strong>Resetting erases your saved passwords.</strong> Your passphrase is never sent to us, so nobody —
                including us — can recover what it protected. Titles, usernames, amounts and dates are kept, and you'll
                choose a new passphrase.
              </p>
            </div>
            {sentTo ? (
              <div className="sent">
                <Mail size={17} color="#7FC9A6" style={{ flexShrink: 0, marginTop: 1 }} />
                <p>Check your email. We sent a reset link to <b style={{ color: TEXT }}>{sentTo.to}</b>. It expires in {sentTo.minutes} minutes.</p>
              </div>
            ) : (
              <>
                {err && <div className="err" style={{ marginTop: 0 }}>{err}</div>}
                <button className="go" onClick={sendReset} disabled={busy}>
                  {busy ? <><LoaderCircle size={16} className="animate-spin" /> Sending…</> : <><Mail size={16} /> Email me a reset link</>}
                </button>
              </>
            )}
            <button className="link" onClick={() => { setForgot(false); setSentTo(null); setErr(""); }}>Back — I remember it</button>
          </>
        ) : hasVault ? (
          <>
            <h2>Unlock your vault</h2>
            <p>A vault passphrase was already created for this account. Enter it to read your saved passwords.</p>
            <label htmlFor="vp">VAULT PASSPHRASE</label>
            <SecretInput id="vp" name="fpd-vault-passphrase" value={pass} onChange={setPass}
              onEnter={() => !busy && pass && unlock()} autoFocus show={show} onToggle={toggle} />
            <div className="hint">This is separate from your FinalPassDown login. If your browser filled it in when the vault was created, try your login password.</div>
            {err && <div className="err">{err}</div>}
            <button className="go" onClick={unlock} disabled={busy || !pass}>
              {busy ? <><LoaderCircle size={16} className="animate-spin" /> Unlocking…</> : <>Unlock</>}
            </button>
            <button className="link" onClick={() => { setForgot(true); setErr(""); }}>Forgot your passphrase?</button>
          </>
        ) : (
          <>
            <h2>Create your vault passphrase</h2>
            <p>
              <b style={{ color: TEXT }}>This is a one-time setup.</b> You are choosing the main passphrase that protects your
              saved passwords and Auto Pay logins, and you will enter it each time you open Password Manager or
              Auto Pay &amp; Subs. It is separate from your FinalPassDown login password.
            </p>
            <p>
              It encrypts your credentials in your browser before they are stored and is never sent to us, so nobody
              at Final Pass Down — and nobody with access to the database — can read them.
            </p>
            <div className="warn">
              <TriangleAlert size={17} color={WARN} style={{ flexShrink: 0, marginTop: 1 }} />
              <p>
                <strong>It cannot be recovered.</strong> If you forget this passphrase, the credentials encrypted
                with it cannot be recovered by anyone, including us. You can reset the vault through a link sent to
                your registered email, but that erases the saved passwords. Write it down and keep it somewhere safe.
              </p>
            </div>
            <label htmlFor="vp1">NEW VAULT PASSPHRASE (10+ CHARACTERS)</label>
            <SecretInput id="vp1" name="fpd-vault-passphrase-new" value={pass} onChange={setPass} show={show} onToggle={toggle} />
            <div className="hint">Choose something different from your FinalPassDown login password.</div>
            <label htmlFor="vp2">CONFIRM PASSPHRASE</label>
            <SecretInput id="vp2" name="fpd-vault-passphrase-confirm" value={confirm} onChange={setConfirm}
              onEnter={() => !busy && setup()} show={show} onToggle={toggle} />
            {err && <div className="err">{err}</div>}
            <button className="go" onClick={setup} disabled={busy || !pass || !confirm}>
              {busy ? <><LoaderCircle size={16} className="animate-spin" /> Creating…</> : <>Create vault</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
