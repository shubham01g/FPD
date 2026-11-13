import { useEffect, useState } from "react";
import { adminApi } from "../services/adminApi";

/* Who the signed-in admin is and what their role may do, from GET /admin/me.
   The server enforces every permission (middleware/modulePermission.ts);
   this only lets screens hide buttons the role would get a 403 for.

   One request per page load, shared by every screen that asks. */

export type PermLevel = "view" | "edit" | "delete";
export interface AdminPermission { module: string; canView: boolean; canEdit: boolean; canDelete: boolean }
export interface AdminMe {
  email: string;
  role: string;
  /** null = legacy full-access admin (no admin_accounts row). */
  permissions: AdminPermission[] | null;
  sessionTimeout: string | null;
  twoFactorEnrollmentRequired?: boolean;
}

let cached: Promise<AdminMe> | null = null;

/** Forget the cached /me (sign-out, or a role change on yourself). */
export function resetAdminMe() { cached = null; }
// Fired by services/authSession on admin sign-in and sign-out.
if (typeof window !== "undefined") window.addEventListener("fpd:admin-auth", resetAdminMe);

function loadMe(): Promise<AdminMe> {
  if (!cached) {
    cached = adminApi.get<AdminMe>("/me");
    cached.catch(() => { cached = null; });
  }
  return cached;
}

export interface AdminMeState {
  me: AdminMe | null;
  /** True until /me has answered (or failed). */
  loading: boolean;
  /** Super admin, or a legacy full-access account. */
  isSuper: boolean;
  /** False while loading or if /me failed, so nothing extra flashes on screen. */
  can: (module: string, level?: PermLevel) => boolean;
}

export function useAdminMe(): AdminMeState {
  const [me, setMe] = useState<AdminMe | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    loadMe().then(m => { if (live) setMe(m); }).catch(() => { /* treated as no rights */ })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  const isSuper = !!me && (me.permissions === null || me.role === "super_admin");
  const can = (module: string, level: PermLevel = "view") => {
    if (!me) return false;
    if (isSuper) return true;
    const p = me.permissions!.find(x => x.module === module);
    return !!p && (level === "view" ? p.canView : level === "edit" ? p.canEdit : p.canDelete);
  };
  return { me, loading, isSuper, can };
}
