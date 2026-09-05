import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

import { requireAdmin } from "./middleware/adminAuth.ts";
import { auditLog } from "./middleware/auditLog.ts";
import { requireModulePermission } from "./middleware/modulePermission.ts";

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
import adminAccounts from "./routes/adminAccounts.ts";
import { wlEntitlements, drState } from "./routes/entitlements.ts";
import publicRoutes from "./routes/public.ts";

const app = new Hono();
const BASE = "/make-server-b5ad85e0";

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
app.get(`${BASE}/health`, (c) => {
  return c.json({ status: "ok" });
});

// Every /admin/* route requires a valid admin session (requireAdmin), has its
// mutating requests written to audit_logs automatically (auditLog), and is
// gated per-module against AdminRoles.tsx's permission matrix
// (requireModulePermission) — a restricted admin gets the same 403 from the
// API directly as they would from a hidden UI button.
const admin = new Hono();
admin.use("*", requireAdmin);
admin.use("*", auditLog);

// Each router gets its own module gate before being mounted.
analytics.use("*", requireModulePermission("analytics"));
users.use("*", requireModulePermission("users"));
verification.use("*", requireModulePermission("verification"));
audit.use("*", requireModulePermission("audit"));
affiliates.use("*", requireModulePermission("affiliates"));
partnerships.use("*", requireModulePermission("partners"));
payouts.use("*", requireModulePermission("payouts"));
subscriptions.use("*", requireModulePermission("continuation"));
pricing.use("*", requireModulePermission("subscription"));
emailTemplates.use("*", requireModulePermission("email_templates"));
whiteLabel.use("*", requireModulePermission("white_label"));
legacy.use("*", requireModulePermission("legacy_management"));
enterpriseApi.use("*", requireModulePermission("enterprise_api"));
adminAccounts.use("*", requireModulePermission("admin_team"));
// Entitlement writes are the only way to unlock a paid add-on, so they sit
// behind the same module gates as the features they unlock: the WL Studio
// paywall under white_label, the per-user emergency bypass under users.
wlEntitlements.use("*", requireModulePermission("white_label"));
drState.use("*", requireModulePermission("users"));

admin.route("/analytics", analytics);
admin.route("/users", users);
admin.route("/verification", verification);
admin.route("/audit", audit);
admin.route("/affiliates", affiliates);
admin.route("/partnerships", partnerships);
admin.route("/payouts", payouts);
admin.route("/subscriptions", subscriptions);
admin.route("/pricing", pricing);
admin.route("/email-templates", emailTemplates);
admin.route("/white-label", whiteLabel);
admin.route("/legacy", legacy);
admin.route("/enterprise-api", enterpriseApi);
admin.route("/admin-accounts", adminAccounts);
admin.route("/wl-entitlements", wlEntitlements);
admin.route("/disaster-recovery", drState);

app.route(`${BASE}/admin`, admin);

// Public, unauthenticated data for the customer-facing app.
app.route(`${BASE}/public`, publicRoutes);

Deno.serve(app.fetch);
