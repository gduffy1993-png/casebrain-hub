/**
 * Client Account Stress-Test — slices 1–2.
 * Run: npx tsx scripts/client-account-stress.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import {
  shouldShowClientStressPanel,
  isClientStressEnabled,
} from "../lib/criminal/client-stress-test/client-stress-flag";
import { lintClientStressOutput } from "../lib/criminal/client-stress-test/client-stress-sanitize";
import { selectionBlobContainsForbiddenContent } from "../lib/criminal/client-stress-test/client-stress-selection-storage";
import { CLIENT_ACCOUNT_OPTIONS } from "../lib/criminal/client-stress-test/client-stress-types";

function assertNoLint(result: object, label: string) {
  const blob = JSON.stringify(result);
  const issues = lintClientStressOutput(blob);
  assert.ok(!issues.length, `${label} lint: ${issues.join("; ")}`);
}

assert.equal(CLIENT_ACCOUNT_OPTIONS.length, 11);

assert.equal(isClientStressEnabled({ get: () => null }, false), false);
assert.equal(isClientStressEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowClientStressPanel(false, true, true), false, "flag off = no UI");
assert.equal(shouldShowClientStressPanel(true, true, true), true, "flag on + reasoning v2");
assert.equal(shouldShowClientStressPanel(true, false, true), false, "needs reasoning v2 flag");

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const reasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(reasoning.available, true);
if (!reasoning.available) throw new Error("expected motoring reasoning");

const stress = buildClientStressResult(reasoning, {
  selectedOptions: ["denies_presence", "accident_no_dangerous_standard"],
  otherNote: null,
});
assert.equal(stress.available, true);
if (!stress.available) throw new Error("expected stress result");

assertNoLint(stress, "motoring");
assert.ok(
  stress.supportsAccount.some((s) => /unresolved|driver|cctv|do not state/i.test(s)),
  "denies presence + motoring should mention unresolved driver/CCTV",
);
assert.ok(stress.clientInstructionQuestions.length >= 2);
assert.ok(stress.whatNotToOverstate.length >= 1);

assert.ok(
  stress.clientInstructionChecklist.some(
    (c) => /vehicle|keys|driver|cctv|route|timeline/i.test(c.questionText),
  ),
  "denies driving/presence should produce driver-ID / vehicle questions",
);
assert.ok(
  stress.doNotConcedeGuards.some(
    (g) => /driver identity|identification|presence/i.test(g.concessionRiskLabel),
  ),
  "should include identity/driver do-not-concede guard",
);
assert.ok(
  stress.doNotConcedeGuards.some((g) =>
    /unresolved on served papers|provisional|remains/i.test(g.safeWordingAlternative),
  ),
  "guards should use safe solicitor wording",
);

const pwitsEntry = loadGoldPack().find((e) => e.truthKey.bundleId === "pilot-3-kian-doyle");
assert.ok(pwitsEntry?.bundleTextPaths.length);
const pwitsReasoning = buildReasoningV2FromBundleText(readBundleText(pwitsEntry!.bundleTextPaths), "PWITS");
assert.equal(pwitsReasoning.available, true);
if (!pwitsReasoning.available) throw new Error("pwits reasoning");

const supplyStress = buildClientStressResult(pwitsReasoning, {
  selectedOptions: ["accepts_possession_disputes_supply"],
});
assert.equal(supplyStress.available, true);
if (!supplyStress.available) throw new Error("supply stress");
assertNoLint(supplyStress, "pwits supply");
assert.ok(
  supplyStress.missingBeforeAssessment.length + supplyStress.supportsAccount.length > 0,
  "supply dispute should reference papers",
);
assert.ok(
  supplyStress.clientInstructionChecklist.some((c) => /phone|message|packag|lab|personal use/i.test(c.questionText)),
  "possession-not-supply should ask phone/supply questions",
);
assert.ok(
  supplyStress.doNotConcedeGuards.some((g) => /supply intent/i.test(g.concessionRiskLabel)),
  "supply intent guard required",
);

const violenceEntry =
  loadGoldPack().find((e) => e.truthKey.bundleId === "s18-thin-james-pike") ??
  loadGoldPack().find((e) => /s18|violence|pike/i.test(e.truthKey.bundleId));
assert.ok(violenceEntry?.bundleTextPaths.length, "need violence bundle for self-defence test");
const violenceReasoning = buildReasoningV2FromBundleText(
  readBundleText(violenceEntry!.bundleTextPaths),
  "Violence",
);
assert.equal(violenceReasoning.available, true);
if (!violenceReasoning.available) throw new Error("violence reasoning");

const selfDefStress = buildClientStressResult(violenceReasoning, {
  selectedOptions: ["self_defence"],
});
assert.equal(selfDefStress.available, true);
if (!selfDefStress.available) throw new Error("self-defence stress");
assertNoLint(selfDefStress, "self-defence");
assert.ok(
  selfDefStress.clientInstructionChecklist.some((c) =>
    /sequence|force|retreat|proportion|injur|witness|cctv|bwv|cad/i.test(c.questionText),
  ),
  "self-defence should ask sequence/proportionality questions",
);
assert.ok(
  selfDefStress.doNotConcedeGuards.some((g) =>
    /self-defence|proportionality|causation|intent/i.test(
      `${g.concessionRiskLabel} ${g.safeWordingAlternative}`,
    ),
  ),
  "self-defence safe caution guards",
);
assert.ok(
  !JSON.stringify(selfDefStress).match(/this wins|crown collapses|proves innocence|guaranteed|must dismiss/i),
  "no forbidden phrases in self-defence output",
);

const selectionBlob = JSON.stringify({
  selectedOptions: ["denies_presence"],
  otherNote: "Was not driving",
  updatedAt: new Date().toISOString(),
});
assert.equal(selectionBlobContainsForbiddenContent(selectionBlob), false);
assert.equal(
  selectionBlobContainsForbiddenContent(
    JSON.stringify({ selectedOptions: [], otherNote: "artifacts/casebrain-auditor/x" }),
  ),
  true,
);

assert.equal(buildClientStressResult(null, { selectedOptions: ["denies_presence"] }).available, false);

console.log("client-account-stress.test.ts: ok");
