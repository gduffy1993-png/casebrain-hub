/**
 * Workspace entitlement contracts — scoped internal_qa capacity.
 * Run: node --import tsx --test scripts/workspace-entitlement-contracts.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { PAYWALL_LIMITS } from "@/lib/paywall/config";
import { WORKSPACE_ENTITLEMENT_GRANTS } from "@/lib/paywall/workspace-entitlement-grants";
import {
  DEFAULT_TRIAL_CASES_LIMIT,
  DEFAULT_TRIAL_DOCUMENTS_LIMIT,
  assertSafeInternalQaGrant,
  resolveEffectiveCapacityLimits,
  type WorkspaceEntitlementRecord,
} from "@/lib/paywall/workspace-entitlement";

/** Mirror owner.ts hardcoded lists without importing server-only. */
const HARD_CODED_OWNER_EMAILS = ["gduffy1993@gmail.com"];
function isHardcodedOwnerEmail(email: string | null | undefined): boolean {
  const normalized = email?.toLowerCase() ?? null;
  return !!normalized && HARD_CODED_OWNER_EMAILS.includes(normalized);
}

const QA_WORKSPACE_ID = "1cf4ae7c-2c73-40ff-b1c1-957615cd1761";
const OTHER_TRIAL_WORKSPACE_ID = "00000000-0000-4000-8000-000000000099";
const QA_EMAIL = "gduffy1993+casebrain@gmail.com";

const repoRoot = path.resolve(__dirname, "..");

function readPaywallSources(): string {
  const files = [
    "lib/paywall/workspace-entitlement.ts",
    "lib/paywall/workspace-entitlement-grants.ts",
    "lib/paywall/trialLimits.ts",
    "lib/paywall/usage.ts",
  ];
  return files
    .map((rel) => readFileSync(path.join(repoRoot, rel), "utf8"))
    .join("\n");
}

function baseGrant(
  overrides: Partial<WorkspaceEntitlementRecord> = {},
): WorkspaceEntitlementRecord {
  return {
    workspaceId: QA_WORKSPACE_ID,
    kind: "internal_qa",
    casesLimit: 25,
    documentsLimit: 100,
    analysesLimit: 100,
    exportsLimit: 40,
    bypassActive: false,
    startsAt: "2026-08-09T21:00:00.000Z",
    expiresAt: "2026-08-23T21:00:00.000Z",
    grantedBy: "operator:real-pdf-live-pilot-v1",
    reason: "Real-PDF authenticated 5→20 QA pilot",
    ...overrides,
  };
}

describe("workspace entitlement — scoped capacity", () => {
  it("only the selected workspace receives elevated capacity", () => {
    const entitlements = WORKSPACE_ENTITLEMENT_GRANTS;
    const qa = resolveEffectiveCapacityLimits({
      workspaceId: QA_WORKSPACE_ID,
      entitlements,
      now: "2026-08-10T00:00:00.000Z",
      defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
      defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
    });
    const other = resolveEffectiveCapacityLimits({
      workspaceId: OTHER_TRIAL_WORKSPACE_ID,
      entitlements,
      now: "2026-08-10T00:00:00.000Z",
      defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
      defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
    });

    assert.equal(qa.source, "workspace_entitlement");
    assert.equal(qa.casesLimit, 25);
    assert.equal(qa.documentsLimit, 100);
    assert.equal(qa.analysesLimit, 100);
    assert.equal(qa.exportsLimit, 40);
    assert.equal(qa.entitlement?.bypassActive, false);

    assert.equal(other.source, "default_trial");
    assert.equal(other.casesLimit, DEFAULT_TRIAL_CASES_LIMIT);
    assert.equal(other.documentsLimit, DEFAULT_TRIAL_DOCUMENTS_LIMIT);
  });
});

describe("workspace entitlement — expiry restores normal limits", () => {
  it("falls back to 2 cases / 10 documents after expiry", () => {
    const entitlements = [baseGrant()];
    const expired = resolveEffectiveCapacityLimits({
      workspaceId: QA_WORKSPACE_ID,
      entitlements,
      now: "2026-08-24T00:00:00.000Z",
      defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
      defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
    });
    assert.equal(expired.source, "default_trial");
    assert.equal(expired.casesLimit, 2);
    assert.equal(expired.documentsLimit, 10);
    assert.equal(expired.entitlement, null);
  });
});

describe("workspace entitlement — admin role alone is not unlimited", () => {
  it("OWNER/admin identity for the QA email does not trip owner bypass", () => {
    assert.equal(isHardcodedOwnerEmail(QA_EMAIL), false);
    assert.equal(isHardcodedOwnerEmail("gduffy1993@gmail.com"), true);
    // Role strings are irrelevant to capacity resolver — only workspace grant matters.
    const adminWithoutGrant = resolveEffectiveCapacityLimits({
      workspaceId: OTHER_TRIAL_WORKSPACE_ID,
      entitlements: [],
      defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
      defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
    });
    assert.equal(adminWithoutGrant.casesLimit, 2);
    assert.equal(adminWithoutGrant.documentsLimit, 10);
    assert.notEqual(adminWithoutGrant.casesLimit, Infinity);
  });
});

describe("workspace entitlement — other trial users stay 2/10", () => {
  it("unrelated workspaces keep default trial caps while QA grant is active", () => {
    const now = "2026-08-10T12:00:00.000Z";
    for (const workspaceId of [
      OTHER_TRIAL_WORKSPACE_ID,
      "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    ]) {
      const status = resolveEffectiveCapacityLimits({
        workspaceId,
        entitlements: WORKSPACE_ENTITLEMENT_GRANTS,
        now,
        defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
        defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
      });
      assert.equal(status.casesLimit, 2);
      assert.equal(status.documentsLimit, 10);
      assert.equal(status.source, "default_trial");
    }
  });
});

describe("workspace entitlement — no email hardcoding", () => {
  it("entitlement source files do not hardcode the QA email", () => {
    const source = readPaywallSources();
    assert.equal(source.toLowerCase().includes(QA_EMAIL.toLowerCase()), false);
    assertSafeInternalQaGrant({
      workspaceId: QA_WORKSPACE_ID,
      email: QA_EMAIL,
      bypassActive: false,
      entitlementsSourceText: source,
    });
  });
});

describe("workspace entitlement — bypass remains false", () => {
  it("rejects bypassActive true and does not elevate when bypass is set", () => {
    assert.throws(() =>
      assertSafeInternalQaGrant({
        workspaceId: QA_WORKSPACE_ID,
        bypassActive: true,
        entitlementsSourceText: "workspaceId only",
      }),
    );

    const withBypass = resolveEffectiveCapacityLimits({
      workspaceId: QA_WORKSPACE_ID,
      entitlements: [baseGrant({ bypassActive: true })],
      now: "2026-08-10T00:00:00.000Z",
      defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
      defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
    });
    assert.equal(withBypass.source, "default_trial");
    assert.equal(withBypass.casesLimit, 2);

    for (const grant of WORKSPACE_ENTITLEMENT_GRANTS) {
      assert.equal(grant.bypassActive, false);
    }
  });
});
