/**
 * One-shot grant tooling for temporary internal_qa workspace entitlements.
 * Email is used only for read-only identity resolution — never written into
 * production entitlement source files.
 *
 * Usage:
 *   node scripts/grant-internal-qa-entitlement.mjs
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const TARGET_EMAIL = "gduffy1993+casebrain@gmail.com";
const EXPECTED_USER_ID = "c8300c48-f1d9-475d-8b58-4ddd0f35a3db";
const EXPECTED_WORKSPACE_ID = "1cf4ae7c-2c73-40ff-b1c1-957615cd1761";
const REASON = "Real-PDF authenticated 5→20 QA pilot";
const GRANTED_BY = "operator:real-pdf-live-pilot-v1";
const ENTITLEMENT_DAYS = 14;

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

function trunc(id) {
  return id ? `${String(id).slice(0, 8)}…${String(id).slice(-4)}` : null;
}

// Prefer the local service-role key; Vercel-pulled preview env may contain
 // non-runnable secret placeholders and must not override auth credentials.
const previewEnv = loadEnv(path.join(repoRoot, ".env.preview.local"));
const env = {
  ...previewEnv,
  ...loadEnv(path.join(repoRoot, ".env.local")),
  ...loadEnv(path.join("C:/Users/gduff/casebrain-hub", ".env.local")),
};
if (
  previewEnv.NEXT_PUBLIC_SUPABASE_URL &&
  env.NEXT_PUBLIC_SUPABASE_URL &&
  previewEnv.NEXT_PUBLIC_SUPABASE_URL !== env.NEXT_PUBLIC_SUPABASE_URL
) {
  console.error("Preview Supabase URL does not match local service credentials", {
    preview: previewEnv.NEXT_PUBLIC_SUPABASE_URL,
    local: env.NEXT_PUBLIC_SUPABASE_URL,
  });
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

console.log(
  JSON.stringify(
    {
      mode: "grant_internal_qa",
      projectRef,
      targetEmail: TARGET_EMAIL,
    },
    null,
    2,
  ),
);

const { data: listed, error: listErr } = await sb.auth.admin.listUsers({
  perPage: 200,
});
if (listErr) {
  console.error(listErr);
  process.exit(1);
}
const authUser = (listed?.users || []).find(
  (u) => u.email?.toLowerCase() === TARGET_EMAIL.toLowerCase(),
);
if (!authUser) {
  console.error("Auth user not found for target email");
  process.exit(1);
}
if (authUser.id !== EXPECTED_USER_ID) {
  console.error("Auth user ID mismatch — refusing grant", {
    got: trunc(authUser.id),
    expected: trunc(EXPECTED_USER_ID),
  });
  process.exit(1);
}

const { data: org, error: orgErr } = await sb
  .from("organisations")
  .select("*")
  .eq("id", EXPECTED_WORKSPACE_ID)
  .maybeSingle();
if (orgErr || !org) {
  console.error("Expected QA workspace not found", orgErr);
  process.exit(1);
}
const expectedExternalRef = `solo-user_${EXPECTED_USER_ID}`;
if (org.external_ref !== expectedExternalRef) {
  console.error("Workspace is not the dedicated QA solo workspace", {
    external_ref: org.external_ref,
    expectedExternalRef,
  });
  process.exit(1);
}

const { count: casesUsed } = await sb
  .from("cases")
  .select("id", { count: "exact", head: true })
  .eq("org_id", EXPECTED_WORKSPACE_ID);
const { count: docsUsed } = await sb
  .from("documents")
  .select("id", { count: "exact", head: true })
  .eq("org_id", EXPECTED_WORKSPACE_ID);

const previousEntitlement = {
  source: "default_trial",
  casesLimit: 2,
  documentsLimit: 10,
  analysesLimit: 20,
  exportsLimit: 3,
  bypassActive: false,
  casesUsed: casesUsed ?? 0,
  docsUsed: docsUsed ?? 0,
  upload_count: org.upload_count ?? 0,
  analysis_count: org.analysis_count ?? 0,
  export_count: org.export_count ?? 0,
};

// Ensure OWNER membership on this workspace only
const { data: existingMemberships, error: memListErr } = await sb
  .from("organisation_members")
  .select("*")
  .eq("user_id", EXPECTED_USER_ID);
if (memListErr) {
  console.error(memListErr);
  process.exit(1);
}

const foreign = (existingMemberships || []).filter(
  (m) => m.organisation_id !== EXPECTED_WORKSPACE_ID,
);
if (foreign.length > 0) {
  console.error(
    "User has memberships outside the QA workspace — refusing grant",
    foreign.map((m) => ({
      org: trunc(m.organisation_id),
      role: m.role,
    })),
  );
  process.exit(1);
}

const existingHere = (existingMemberships || []).find(
  (m) => m.organisation_id === EXPECTED_WORKSPACE_ID,
);
if (!existingHere) {
  const { error: insertMemErr } = await sb.from("organisation_members").insert({
    organisation_id: EXPECTED_WORKSPACE_ID,
    user_id: EXPECTED_USER_ID,
    role: "OWNER",
  });
  if (insertMemErr) {
    console.error("Failed to create OWNER membership", insertMemErr);
    process.exit(1);
  }
} else if (String(existingHere.role).toUpperCase() !== "OWNER") {
  const { error: updMemErr } = await sb
    .from("organisation_members")
    .update({ role: "OWNER" })
    .eq("id", existingHere.id);
  if (updMemErr) {
    console.error("Failed to elevate membership to OWNER", updMemErr);
    process.exit(1);
  }
}

// Ensure users row points at this workspace with owner-equivalent role
const { data: dbUser } = await sb
  .from("users")
  .select("*")
  .eq("id", EXPECTED_USER_ID)
  .maybeSingle();
if (!dbUser) {
  const { error: userInsErr } = await sb.from("users").insert({
    id: EXPECTED_USER_ID,
    email: TARGET_EMAIL,
    name: "QA Pilot",
    role: "owner",
    org_id: EXPECTED_WORKSPACE_ID,
  });
  if (userInsErr) {
    console.warn("users insert skipped/failed:", userInsErr.message);
  }
} else if (dbUser.org_id !== EXPECTED_WORKSPACE_ID) {
  console.error("users.org_id points elsewhere — refusing grant", {
    org: trunc(dbUser.org_id),
  });
  process.exit(1);
}

const startsAt = new Date();
const expiresAt = new Date(startsAt);
expiresAt.setUTCDate(expiresAt.getUTCDate() + ENTITLEMENT_DAYS);

const newEntitlement = {
  workspaceId: EXPECTED_WORKSPACE_ID,
  kind: "internal_qa",
  casesLimit: 25,
  documentsLimit: 100,
  analysesLimit: 100,
  exportsLimit: 40,
  bypassActive: false,
  startsAt: startsAt.toISOString(),
  expiresAt: expiresAt.toISOString(),
  grantedBy: GRANTED_BY,
  reason: REASON,
};

if (newEntitlement.bypassActive !== false) {
  console.error("Refusing grant with bypassActive !== false");
  process.exit(1);
}

// Optional DB upsert when migration is present
const { error: tableProbeErr } = await sb
  .from("workspace_entitlements")
  .select("id")
  .limit(1);
let dbEntitlementApplied = false;
if (!tableProbeErr) {
  const row = {
    workspace_id: newEntitlement.workspaceId,
    kind: newEntitlement.kind,
    cases_limit: newEntitlement.casesLimit,
    documents_limit: newEntitlement.documentsLimit,
    analyses_limit: newEntitlement.analysesLimit,
    exports_limit: newEntitlement.exportsLimit,
    bypass_active: false,
    starts_at: newEntitlement.startsAt,
    expires_at: newEntitlement.expiresAt,
    granted_by: newEntitlement.grantedBy,
    reason: newEntitlement.reason,
    updated_at: new Date().toISOString(),
  };
  const { error: upsertErr } = await sb
    .from("workspace_entitlements")
    .upsert(row, { onConflict: "workspace_id" });
  if (upsertErr) {
    console.warn("DB entitlement upsert failed:", upsertErr.message);
  } else {
    dbEntitlementApplied = true;
    await sb.from("workspace_entitlement_audit").insert({
      workspace_id: EXPECTED_WORKSPACE_ID,
      granted_by: GRANTED_BY,
      reason: REASON,
      previous_entitlement: previousEntitlement,
      new_entitlement: newEntitlement,
      expires_at: newEntitlement.expiresAt,
    });
  }
}

// Always record audit via existing app_events
const auditPayload = {
  grantedBy: GRANTED_BY,
  workspaceId: EXPECTED_WORKSPACE_ID,
  reason: REASON,
  previousEntitlement,
  newEntitlement,
  expiry: newEntitlement.expiresAt,
  bypassActive: false,
  projectRef,
};
const { data: auditRow, error: auditErr } = await sb
  .from("app_events")
  .insert({
    user_id: EXPECTED_USER_ID,
    organisation_id: EXPECTED_WORKSPACE_ID,
    event_type: "WORKSPACE_ENTITLEMENT_GRANTED",
    event_payload: auditPayload,
  })
  .select("id, created_at")
  .single();
if (auditErr) {
  console.error("Failed to write app_events audit", auditErr);
  process.exit(1);
}

// Update committed grant registry (workspace ID only — no email)
const grantsPath = path.join(
  repoRoot,
  "lib/paywall/workspace-entitlement-grants.ts",
);
const grantsSource = `/**
 * Workspace-scoped entitlement grants.
 * Keys are organisation/workspace UUIDs only — never emails.
 *
 * Applied after read-only identity match for the dedicated QA solo workspace.
 */
import type { WorkspaceEntitlementRecord } from "./workspace-entitlement";

export const WORKSPACE_ENTITLEMENT_GRANTS: WorkspaceEntitlementRecord[] = [
  {
    workspaceId: ${JSON.stringify(newEntitlement.workspaceId)},
    kind: "internal_qa",
    casesLimit: ${newEntitlement.casesLimit},
    documentsLimit: ${newEntitlement.documentsLimit},
    analysesLimit: ${newEntitlement.analysesLimit},
    exportsLimit: ${newEntitlement.exportsLimit},
    bypassActive: false,
    startsAt: ${JSON.stringify(newEntitlement.startsAt)},
    expiresAt: ${JSON.stringify(newEntitlement.expiresAt)},
    grantedBy: ${JSON.stringify(newEntitlement.grantedBy)},
    reason: ${JSON.stringify(newEntitlement.reason)},
  },
];
`;
if (grantsSource.toLowerCase().includes(TARGET_EMAIL.toLowerCase())) {
  console.error("Refusing to write email into entitlement grants source");
  process.exit(1);
}
fs.writeFileSync(grantsPath, grantsSource, "utf8");

const receiptDir = path.join(
  repoRoot,
  "artifacts/casebrain-qa/assurance/workspace-entitlements",
);
fs.mkdirSync(receiptDir, { recursive: true });
const receipt = {
  ok: true,
  projectRef,
  userIdTrunc: trunc(EXPECTED_USER_ID),
  workspaceIdTrunc: trunc(EXPECTED_WORKSPACE_ID),
  membershipRole: "OWNER",
  previousEntitlement,
  newEntitlement: {
    ...newEntitlement,
    workspaceIdTrunc: trunc(newEntitlement.workspaceId),
  },
  expiry: newEntitlement.expiresAt,
  audit: {
    appEventId: auditRow.id,
    created_at: auditRow.created_at,
    event_type: "WORKSPACE_ENTITLEMENT_GRANTED",
  },
  dbEntitlementApplied,
  usageCountersUnchanged: {
    casesUsed: casesUsed ?? 0,
    docsUsed: docsUsed ?? 0,
    upload_count: org.upload_count ?? 0,
    analysis_count: org.analysis_count ?? 0,
    export_count: org.export_count ?? 0,
  },
};
const receiptPath = path.join(
  receiptDir,
  `internal-qa-grant-${EXPECTED_WORKSPACE_ID.slice(0, 8)}.json`,
);
fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), "utf8");

console.log(JSON.stringify(receipt, null, 2));
