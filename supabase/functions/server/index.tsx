import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

import { requireAdmin } from "./middleware/adminAuth.ts";
import { requireUser } from "./middleware/userAuth.ts";
import { auditLog } from "./middleware/auditLog.ts";
import { requireModulePermission } from "./middleware/modulePermission.ts";
import { ipAllowlist } from "./middleware/ipAllowlist.ts";

import analytics from "./routes/analytics.ts";
import users from "./routes/users.ts";
import verification from "./routes/verification.ts";
import audit from "./routes/audit.ts";
import affiliates from "./routes/affiliates.ts";
import partnerships from "./routes/partnerships.ts";
import payouts from "./routes/payouts.ts";
import subscriptions from "./routes/subscriptions.ts";
import pricing from "./routes/pricing.ts";
import emailTemplates from "./routes/emailTemplates.ts";
import whiteLabel from "./routes/whiteLabel.ts";
import legacy from "./routes/legacy.ts";
import enterpriseApi from "./routes/enterpriseApi.ts";
import cryptoConfig from "./routes/cryptoConfig.ts";
import adminAccounts from "./routes/adminAccounts.ts";
import notifications from "./routes/notifications.ts";
import concierge from "./routes/concierge.ts";
import whiteGlove from "./routes/whiteGlove.ts";
import { wlEntitlements, drState } from "./routes/entitlements.ts";
import publicRoutes from "./routes/public.ts";
import twoFactor from "./routes/twoFactor.ts";
import settings from "./routes/settings.ts";
import billing from "./routes/billing.ts";
import contacts from "./routes/contacts.ts";
import adminBilling from "./routes/adminBilling.ts";
import internal from "./routes/internal.ts";
import adminUserBilling from "./routes/adminUserBilling.ts";
import adminBillingTest from "./routes/adminBillingTest.ts";
import affiliateJoin from "./routes/affiliateJoin.ts";

const app = new Hono();
// Supabase hands the function the full path INCLUDING the function's own name,
// so a request to /functions/v1/server/make-server-b5ad85e0/health arrives here
// as /server/make-server-b5ad85e0/health. The prefix must match the deployed
// function name or every route 404s. The same code is also deployed as
// "server-billing" while Stripe billing is proven in test mode (see
// GO_LIVE_CHECKLIST.md), so every route is mounted under both names.
const FUNCTION_NAMES = ["server", "server-billing"];
const api = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
api.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Every /admin/* route requires a valid admin session (requireAdmin), has its
// mutating requests written to audit_logs automatically (auditLog), and is
// gated per-module against AdminRoles.tsx's permission matrix
// (requireModulePermission) — a restricted admin gets the same 403 from the
// API directly as they would from a hidden UI button.
const admin = new Hono();
admin.use("*", requireAdmin);
// System → Settings → Security → IP Allowlist (no-op while the list is empty).
admin.use("*", ipAllowlist);
admin.use("*", auditLog);

// Each module's gate is registered on this parent router, before the module
// is mounted. It has to be here and not on the module's own router: those
// routers already hold their handlers by the time this file runs, and a
// middleware added after a handler never runs for it — which left every
// role able to call every admin route.
admin.use("/analytics", requireModulePermission("analytics"));
admin.use("/analytics/*", requireModulePermission("analytics"));
admin.use("/users", requireModulePermission("users"));
admin.use("/users/*", requireModulePermission("users"));
admin.use("/verification", requireModulePermission("verification"));
admin.use("/verification/*", requireModulePermission("verification"));
admin.use("/audit", requireModulePermission("audit"));
admin.use("/audit/*", requireModulePermission("audit"));
admin.use("/affiliates", requireModulePermission("affiliates"));
admin.use("/affiliates/*", requireModulePermission("affiliates"));
admin.use("/partnerships", requireModulePermission("partners"));
admin.use("/partnerships/*", requireModulePermission("partners"));
admin.use("/payouts", requireModulePermission("payouts"));
admin.use("/payouts/*", requireModulePermission("payouts"));
admin.use("/subscriptions", requireModulePermission("continuation"));
admin.use("/subscriptions/*", requireModulePermission("continuation"));
admin.use("/pricing", requireModulePermission("subscription"));
admin.use("/pricing/*", requireModulePermission("subscription"));
// Stripe setup (catalog sync, portal, webhook check) sits with plan pricing.
admin.use("/billing", requireModulePermission("subscription"));
admin.use("/billing/*", requireModulePermission("subscription"));
// One account's billing (refunds, comps, plan changes) sits with user management.
admin.use("/user-billing", requireModulePermission("users"));
admin.use("/user-billing/*", requireModulePermission("users"));
admin.use("/email-templates", requireModulePermission("email_templates"));
admin.use("/email-templates/*", requireModulePermission("email_templates"));
admin.use("/white-label", requireModulePermission("white_label"));
admin.use("/white-label/*", requireModulePermission("white_label"));
admin.use("/legacy", requireModulePermission("legacy_management"));
admin.use("/legacy/*", requireModulePermission("legacy_management"));
admin.use("/enterprise-api", requireModulePermission("enterprise_api"));
admin.use("/enterprise-api/*", requireModulePermission("enterprise_api"));
admin.use("/crypto", requireModulePermission("crypto"));
admin.use("/crypto/*", requireModulePermission("crypto"));
admin.use("/admin-accounts", requireModulePermission("admin_team"));
admin.use("/admin-accounts/*", requireModulePermission("admin_team"));
// Platform settings sit with admin-team management: the same people own both.
admin.use("/settings", requireModulePermission("admin_team"));
admin.use("/settings/*", requireModulePermission("admin_team"));
admin.use("/notifications", requireModulePermission("notifications"));
admin.use("/notifications/*", requireModulePermission("notifications"));
admin.use("/concierge", requireModulePermission("white_glove"));
admin.use("/concierge/*", requireModulePermission("white_glove"));
admin.use("/white-glove", requireModulePermission("white_glove"));
admin.use("/white-glove/*", requireModulePermission("white_glove"));
// Entitlement writes are the only way to unlock a paid add-on, so they sit
// behind the same module gates as the features they unlock: the WL Studio
// paywall under white_label, the per-user emergency bypass under users.
admin.use("/wl-entitlements", requireModulePermission("white_label"));
admin.use("/wl-entitlements/*", requireModulePermission("white_label"));
admin.use("/disaster-recovery", requireModulePermission("users"));
admin.use("/disaster-recovery/*", requireModulePermission("users"));

admin.route("/analytics", analytics);
admin.route("/users", users);
admin.route("/verification", verification);
admin.route("/audit", audit);
admin.route("/affiliates", affiliates);
admin.route("/partnerships", partnerships);
admin.route("/payouts", payouts);
admin.route("/subscriptions", subscriptions);
admin.route("/pricing", pricing);
// Test-mode helpers for proving billing (404 with a live key).
admin.route("/billing/test", adminBillingTest);
admin.route("/billing", adminBilling);
admin.route("/user-billing", adminUserBilling);
admin.route("/email-templates", emailTemplates);
admin.route("/white-label", whiteLabel);
admin.route("/legacy", legacy);
admin.route("/enterprise-api", enterpriseApi);
admin.route("/crypto", cryptoConfig);
admin.route("/admin-accounts", adminAccounts);
admin.route("/settings", settings);
admin.route("/notifications", notifications);
admin.route("/concierge", concierge);
admin.route("/white-glove", whiteGlove);
admin.route("/wl-entitlements", wlEntitlements);
admin.route("/disaster-recovery", drState);

api.route("/admin", admin);

// Routes a signed-in customer calls about their own account. Same JWT check as
// /admin/* minus the is_admin requirement, and no module permission matrix —
// a user is always allowed to manage their own security settings.
const account = new Hono();
account.use("*", requireUser);
account.route("/2fa", twoFactor);
account.route("/billing", billing);
account.route("/contacts", contacts);
account.route("/affiliate", affiliateJoin);
api.route("/account", account);

// Public, unauthenticated data for the customer-facing app.
api.route("/public", publicRoutes);

// Scheduled jobs (pg_cron), authenticated by CRON_SECRET.
api.route("/internal", internal);

for (const name of FUNCTION_NAMES) app.route(`/${name}/make-server-b5ad85e0`, api);

Deno.serve(app.fetch);
