#!/usr/bin/env npx tsx
/**
 * Tenant existence isolation — production source contracts.
 * Run: npx tsx scripts/tenant-existence-isolation.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";

const casePage = fs.readFileSync("app/(protected)/cases/[caseId]/page.tsx", "utf8");
assert.ok(!/existsElsewhere/.test(casePage), "case page must not unscoped-existence-probe");
assert.ok(!/different workspace/i.test(casePage));
assert.ok(!/belongs to another account/i.test(casePage));
assert.ok(
  /\.eq\("id", caseId\)[\s\S]{0,80}\.eq\("org_id", orgId\)/.test(casePage) ||
    /\.eq\("org_id", orgId\)[\s\S]{0,80}\.eq\("id", caseId\)/.test(casePage),
  "case page lookup must be org-scoped",
);

const bundle = fs.readFileSync("app/api/criminal/[caseId]/bundle-source/route.ts", "utf8");
assert.ok(/\.eq\("org_id", orgId\)/.test(bundle));
assert.ok(/Case not found/.test(bundle));
assert.ok(!/different workspace|another account/i.test(bundle));
// documents query must also be org-scoped after case check
assert.ok(
  /from\("documents"\)[\s\S]{0,200}\.eq\("org_id", orgId\)/.test(bundle),
  "bundle-source documents must filter org_id",
);

const aggressive = fs.readFileSync("app/api/criminal/[caseId]/aggressive-defense/route.ts", "utf8");
assert.ok(
  /\.eq\("id", caseId\)[\s\S]{0,120}\.eq\("org_id", orgId\)/.test(aggressive),
  "aggressive-defense must not look up case by id alone",
);
assert.ok(!/Case exists but has no org_id/.test(aggressive) || /\.eq\("org_id", orgId\)/.test(aggressive));
assert.ok(/Case not found for your organisation/.test(aggressive));

const phase1 = fs.readFileSync("app/api/criminal/[caseId]/phase1-detect/route.ts", "utf8");
assert.ok(
  /from\("criminal_cases"\)[\s\S]{0,200}\.eq\("org_id", orgId\)/.test(phase1),
  "phase1-detect criminal_cases lookup must be org-scoped",
);

// Production scan: no silent name→truth force remains in pilot-workflow resolve path.
const pilot = fs.readFileSync("lib/criminal/pilot-workflow.ts", "utf8");
assert.ok(!/\+ 100/.test(pilot), "no +100 demo name score boost");
assert.ok(/resolveExplicitDemoFixtureFromContext/.test(pilot));
assert.ok(
  /Only an explicit profileHint may force/.test(pilot) ||
    /profileHint && context\.profileHint !== "generic"/.test(pilot),
);

console.log("tenant-existence-isolation.test.ts: PASS");
