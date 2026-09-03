/**
 * VaultUnlock — the gate in front of encrypted credentials.
 *
 * Wraps any screen that reads or writes secrets (Password Manager,
 * Subscription Manager). Three states:
 *
 *   never set up  → offer to create a passphrase, with the no-recovery
 *                   warning stated before anything is created
 *   set up, locked→ ask for the passphrase
 *   unlocked      → render the screen
 *
 * The passphrase is never sent anywhere and never stored. It derives a key
 * that lives in memory for the session; a refresh re-locks. See
 * services/vaultCrypto.ts for the reasoning.
 */
import React, { useEffect, useState } from "react";
import { Lock, ShieldCheck, TriangleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { db } from "../services/supabase";
import { useAuth } from "../context/AuthContext";
import { createVault, unlockVault, isUnlocked } from "../services/vaultCrypto";

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
.fpd-unlock input{width:100%;padding:12px 14px;border-radius:14px;background:#0F1624;border:1px solid rgba(255,255,255,0.1);color:${TEXT};font-size:16px;outline:none;font-family:var(--font-body);margin-bottom:14px;}
.fpd-unlock input:focus{border-color:${ACCENT};box-shadow:0 0 0 3px rgba(91,110,225,0.18);}
.fpd-unlock .warn{display:flex;gap:10px;padding:14px 15px;border-radius:16px;background:rgba(217,165,94,0.09);border:1px solid rgba(217,165,94,0.28);margin-bottom:18px;}
.fpd-unlock .warn p{color:${SOFT};font-size:14.5px;line-height:1.6;margin:0;}
.fpd-unlock .warn strong{color:${WARN};}
.fpd-unlock button.go{width:100%;padding:13px;border-radius:14px;border:none;cursor:pointer;font-family:var(--font-body);font-size:16px;font-weight:700;color:#fff;background:linear-gradient(180deg,#7E6BD8,${ACCENT});display:flex;align-items:center;justify-content:center;gap:8px;}
.fpd-unlock button.go:disabled{opacity:.55;cursor:not-allowed;}
.fpd-unlock .err{color:#FC8181;font-size:14.5px;margin:-6px 0 12px;}
@media (max-width:640px){.fpd-unlock{padding:24px 16px;} .fpd-unlock .panel{padding:24px 20px;}}
`;

export function VaultUnlock({ children }: { children: React.ReactNode }) {
  const { authUser } = useAuth();
  const [checking, setChecking] = useState(true);
  const [hasVault, setHasVault] = useState(false);
  const [salt, setSalt] = useState<string | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(isUnlocked());
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

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
      if (error) { setErr(`Could not save vault key: ${error.message}`); setBusy(false); return; }
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

  return (
    <div className="fpd-unlock">
      <style>{CSS}</style>
      <div className="panel">
        <div className="ico">{hasVault ? <Lock size={22} /> : <ShieldCheck size={22} />}</div>

        {checking ? (
          <p>Checking vault status…</p>
        ) : hasVault ? (
          <>
            <h2>Unlock your vault</h2>
            <p>Your credentials are encrypted on this device. Enter your passphrase to read them.</p>
            <label htmlFor="vp">PASSPHRASE</label>
            <input id="vp" type="password" value={pass} autoFocus
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && unlock()} />
            {err && <div className="err">{err}</div>}
            <button className="go" onClick={unlock} disabled={busy || !pass}>
              {busy ? <><LoaderCircle size={16} className="animate-spin" /> Unlocking…</> : <>Unlock</>}
            </button>
          </>
        ) : (
          <>
            <h2>Create your vault passphrase</h2>
            <p>
              This passphrase encrypts your saved credentials in your browser before they are stored. It is never
              sent to us, so nobody at Final Pass Down — and nobody with access to the database — can read them.
            </p>
            <div className="warn">
              <TriangleAlert size={17} color={WARN} style={{ flexShrink: 0, marginTop: 1 }} />
              <p>
                <strong>There is no password reset.</strong> If you forget this passphrase, the credentials
                encrypted with it cannot be recovered by anyone, including us. That is what makes it secure.
                Write it down and keep it somewhere safe.
              </p>
            </div>
            <label htmlFor="vp1">PASSPHRASE (10+ CHARACTERS)</label>
            <input id="vp1" type="password" value={pass} onChange={(e) => setPass(e.target.value)} />
            <label htmlFor="vp2">CONFIRM PASSPHRASE</label>
            <input id="vp2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !busy && setup()} />
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
