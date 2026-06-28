#!/usr/bin/env npx tsx
import assert from "node:assert/strict";
import { buildMatterConfidence, prioritizeSourceBadges } from "../lib/criminal/matter-confidence/build-matter-confidence";
import { buildCopySafeResult, inferChaseItemSourceState } from "../lib/criminal/trust/copy-safe";

assert.equal(
  buildMatterConfidence({ documentCount: 0, bundleHealth: "unknown" }).level,
  "blocked",
);

assert.equal(
  buildMatterConfidence({ documentCount: 2, bundleHealth: "thin", missingMaterialCount: 2 }).level,
  "provisional",
);

assert.equal(
  buildMatterConfidence({
    documentCount: 4,
    bundleHealth: "ready",
    humanReviewRequired: true,
  }).level,
  "needs_review",
);

const full = buildMatterConfidence({
  documentCount: 3,
  bundleHealth: "thin",
  missingMaterialCount: 2,
  hasSafeCourtLine: true,
});
assert.equal(full.evidenceCoverage, "thin");
assert.equal(full.chaseSendability, "provisional_check_source");
assert.equal(full.safeCourtLineStatus, "needs_review");

const capped = prioritizeSourceBadges(
  ["provisional", "missing", "referred_only", "needs_review"],
  3,
);
assert.equal(capped.visible.length, 3);
assert.equal(capped.overflow.length, 1);
assert.deepEqual(capped.visible, ["needs_review", "missing", "referred_only"]);
assert.equal(capped.overflow[0], "provisional");

const blockedCopy = buildCopySafeResult({
  text: "Please provide CCTV.",
  kind: "cps_chase",
  sourceState: null,
});
assert.equal(blockedCopy.sendability, "blocked");
assert.equal(blockedCopy.canCopy, false);

const courtInCps = buildCopySafeResult({
  text: "Ask the court to record that CCTV is outstanding.",
  kind: "cps_chase",
  sourceState: "missing",
});
assert.equal(courtInCps.sendability, "blocked");
assert.match(courtInCps.blockedReason ?? "", /Court wording/i);

const missingChase = inferChaseItemSourceState({
  label: "CCTV full window",
  source: "Police / CCTV unit",
  baseStatus: "not_started",
  evidenceAnchor: "outstanding on export",
});
assert.equal(missingChase, "missing");

console.log("matter-confidence.test.ts: all assertions passed");
