import assert from "node:assert/strict";
import {
  auditTruthKeyCoverage,
  deriveVerificationFromManifest,
  mainIssueForFamily,
} from "../lib/eval/casebrain-auditor/golden-truth-key-v2";
import { generateManifestFromSeed } from "../lib/eval/casebrain-auditor/strategy-corpus-manifest";

const manifest = generateManifestFromSeed(42, "discovery", "text-rendered");
const derived = deriveVerificationFromManifest(manifest, {
  bundleId: manifest.caseId,
  fictional: true,
  defendant: manifest.defendantName,
  charge: manifest.chargeWording,
  thinBundleExpected: true,
  expectedWorkflowProfile: "generic_provisional",
  linkStatus: "runnable",
});

assert.ok(derived.offenceFamily);
assert.ok(derived.mainIssueExpected);
assert.ok((derived.expectedChaseItems?.length ?? 0) > 0);
assert.equal(derived.truthKeyVersion, "h2-v1");

const audit = auditTruthKeyCoverage(derived);
assert.ok(audit.coveragePct >= 75, `expected >=75% coverage, got ${audit.coveragePct}`);
assert.ok(mainIssueForFamily("fraud_account_control").includes("Account"));

console.log("golden-truth-key-v2.test.ts: all assertions passed");
