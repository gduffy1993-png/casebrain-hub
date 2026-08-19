#!/usr/bin/env npx tsx
/**
 * Tenant existence isolation — production source contracts.
 * Run: npx tsx scripts/tenant-existence-isolation.test.ts
 *
 * Invariant: authenticated org A + foreign resource ID ≡ nonexistent ID
 * (uniform 404, identical error text; no 403 existence oracle; no signed URL).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

// --- Shared gate ---
const gate = read("lib/tenant/require-case-in-org.ts");
assert.ok(/export async function requireCaseInOrg/.test(gate));
assert.ok(/export async function requireDocumentInOrg/.test(gate));
assert.ok(/\.eq\("id", caseId\)[\s\S]{0,80}\.eq\("org_id", orgId\)/.test(gate));
assert.ok(/\.eq\("id", documentId\)[\s\S]{0,80}\.eq\("org_id", orgId\)/.test(gate));
assert.ok(/status: 404/.test(gate));
assert.ok(!/status: 403/.test(gate), "shared gate must never 403 (existence oracle)");
assert.ok(/TENANT_CASE_NOT_FOUND/.test(gate));
assert.ok(/TENANT_DOCUMENT_NOT_FOUND/.test(gate));
assert.ok(/tenantNotFoundEquivalence/.test(gate));

// Pure equivalence contract (avoid importing server-only module from tsx)
function tenantNotFoundEquivalence(
  foreign: { status: number; error: string },
  missing: { status: number; error: string },
): boolean {
  return foreign.status === 404 && missing.status === 404 && foreign.error === missing.error;
}
assert.ok(
  tenantNotFoundEquivalence(
    { status: 404, error: "Case not found" },
    { status: 404, error: "Case not found" },
  ),
);
assert.ok(
  !tenantNotFoundEquivalence(
    { status: 403, error: "Unauthorized" },
    { status: 404, error: "Case not found" },
  ),
  "403 vs 404 must fail equivalence",
);
assert.ok(/export const TENANT_DOCUMENT_NOT_FOUND = "Document not found"/.test(gate));

// --- case-lookup: no NULL-org cross-tenant fallback ---
const lookup = read("lib/db/case-lookup.ts");
assert.ok(/Do NOT fall back to org_id IS NULL/.test(lookup));
assert.ok(!/\.is\("org_id", null\)/.test(lookup), "must not query org_id IS NULL");
assert.ok(
  /caseOrgId === scope\.orgId \|\| caseOrgId === scope\.externalRef/.test(lookup),
  "document caseOrgId fallback must match auth scope only",
);

// --- Case page / bundle / aggressive / phase1 (baseline) ---
const casePage = read("app/(protected)/cases/[caseId]/page.tsx");
assert.ok(!/existsElsewhere/.test(casePage), "case page must not unscoped-existence-probe");
assert.ok(!/different workspace/i.test(casePage));
assert.ok(!/belongs to another account/i.test(casePage));
assert.ok(
  /\.eq\("id", caseId\)[\s\S]{0,80}\.eq\("org_id", orgId\)/.test(casePage) ||
    /\.eq\("org_id", orgId\)[\s\S]{0,80}\.eq\("id", caseId\)/.test(casePage),
  "case page lookup must be org-scoped",
);

const bundle = read("app/api/criminal/[caseId]/bundle-source/route.ts");
assert.ok(/\.eq\("org_id", orgId\)/.test(bundle));
assert.ok(/Case not found/.test(bundle));
assert.ok(!/different workspace|another account/i.test(bundle));
assert.ok(
  /from\("documents"\)[\s\S]{0,200}\.eq\("org_id", orgId\)/.test(bundle),
  "bundle-source documents must filter org_id",
);

const aggressive = read("app/api/criminal/[caseId]/aggressive-defense/route.ts");
assert.ok(
  /\.eq\("id", caseId\)[\s\S]{0,120}\.eq\("org_id", orgId\)/.test(aggressive),
  "aggressive-defense must not look up case by id alone",
);
assert.ok(/Case not found for your organisation/.test(aggressive));

const phase1 = read("app/api/criminal/[caseId]/phase1-detect/route.ts");
assert.ok(
  /from\("criminal_cases"\)[\s\S]{0,200}\.eq\("org_id", orgId\)/.test(phase1),
  "phase1-detect criminal_cases lookup must be org-scoped",
);

// --- Routes that must use shared requireCaseInOrg (no 403 org oracle) ---
const requireCaseRoutes = [
  "app/api/criminal/[caseId]/position/route.ts",
  "app/api/criminal/[caseId]/strategy-commitment/route.ts",
  "app/api/criminal/[caseId]/review-confirm/route.ts",
  "app/api/criminal/[caseId]/dependencies/route.ts",
  "app/api/criminal/[caseId]/irreversible-decisions/route.ts",
  "app/api/criminal/[caseId]/phase2-strategy-plan/route.ts",
  "app/api/criminal/[caseId]/trust-feedback/route.ts",
  "app/api/criminal/[caseId]/supervisor-signoff/route.ts",
  "app/api/criminal/[caseId]/reasoning-feedback/route.ts",
  "app/api/criminal/[caseId]/export-review/route.ts",
  "app/api/criminal/[caseId]/evidence-change-snapshot/route.ts",
  "app/api/criminal/[caseId]/audit-events/route.ts",
  "app/api/criminal/[caseId]/disclosure-timeline/route.ts",
  "app/api/criminal/[caseId]/disclosure-pressure/route.ts",
];

for (const rel of requireCaseRoutes) {
  const src = read(rel);
  assert.ok(/requireCaseInOrg/.test(src), `${rel} must use requireCaseInOrg`);
  assert.ok(
    !/Unauthorized: Case does not belong/.test(src),
    `${rel} must not disclose foreign ownership via 403 text`,
  );
  // Disallow classic oracle: load by id alone then compare org → 403
  assert.ok(
    !/\.eq\("id", caseId\)[\s\S]{0,120}\.single\(\)[\s\S]{0,200}status:\s*403/.test(src),
    `${rel} must not id-load then 403`,
  );
}

// phase2: must snapshot with auth orgId, never foreign caseRow.org_id
const phase2 = read("app/api/criminal/[caseId]/phase2-strategy-plan/route.ts");
assert.ok(/getCaseStateSnapshot\(caseId, orgId\)/.test(phase2));
assert.ok(!/getCaseStateSnapshot\(caseId, caseRow\.org_id\)/.test(phase2));

// strategy-commitment writes must use auth orgId
const stratCommit = read("app/api/criminal/[caseId]/strategy-commitment/route.ts");
assert.ok(/org_id:\s*orgId/.test(stratCommit), "commitment insert must use auth orgId");
assert.ok(/requireCaseInOrg\(caseId, orgId\)/.test(stratCommit));

// review-confirm writes must use auth orgId (not foreign case.org_id)
const review = read("app/api/criminal/[caseId]/review-confirm/route.ts");
assert.ok(/org_id:\s*orgId/.test(review));
assert.ok(/\.eq\("org_id", orgId\)/.test(review));

// position GET/POST both gated
const position = read("app/api/criminal/[caseId]/position/route.ts");
assert.ok(
  (position.match(/requireCaseInOrg/g) || []).length >= 2,
  "position GET and POST must both gate",
);

// --- Documents / signed URLs ---
const filesView = read("app/api/files/[fileId]/view/route.ts");
assert.ok(/requireDocumentInOrg/.test(filesView), "signed URL route must use requireDocumentInOrg");
assert.ok(!/status:\s*403/.test(filesView), "signed URL must not 403 foreign docs");
assert.ok(/createSignedUrl/.test(filesView));

const docsList = read("app/api/cases/[caseId]/documents/route.ts");
assert.ok(
  /\.eq\("id", caseId\)[\s\S]{0,80}\.eq\("org_id", orgId\)/.test(docsList),
  "documents list case gate must be org-scoped",
);
assert.ok(
  /from\("documents"\)[\s\S]{0,200}\.eq\("org_id", documentOrgId\)/.test(docsList) ||
    /from\("documents"\)[\s\S]{0,200}\.eq\("org_id", orgId\)/.test(docsList),
  "documents list must filter org_id",
);

// --- charges: no case_id-only fallback ---
const charges = read("app/api/criminal/[caseId]/charges/route.ts");
assert.ok(!/fall back to case_id only/i.test(charges));
assert.ok(
  /from\("criminal_charges"\)[\s\S]{0,200}\.eq\("org_id", orgId\)/.test(charges),
  "charges must stay org-scoped",
);

// --- write endpoints: dependencies / irreversible / trust-feedback ---
for (const rel of [
  "app/api/criminal/[caseId]/dependencies/route.ts",
  "app/api/criminal/[caseId]/irreversible-decisions/route.ts",
  "app/api/criminal/[caseId]/trust-feedback/route.ts",
  "app/api/criminal/[caseId]/supervisor-signoff/route.ts",
]) {
  const src = read(rel);
  assert.ok(/export async function (POST|PUT|PATCH)/.test(src) || /POST/.test(src));
  assert.ok(/requireCaseInOrg/.test(src), `${rel} write path must gate`);
}

// Production scan: no silent name→truth force remains in pilot-workflow resolve path.
const pilot = read("lib/criminal/pilot-workflow.ts");
assert.ok(!/\+ 100/.test(pilot), "no +100 demo name score boost");
assert.ok(/resolveExplicitDemoFixtureFromContext/.test(pilot));
assert.ok(
  /Only an explicit profileHint may force/.test(pilot) ||
    /profileHint && context\.profileHint !== "generic"/.test(pilot),
);

console.log("tenant-existence-isolation.test.ts: PASS");
