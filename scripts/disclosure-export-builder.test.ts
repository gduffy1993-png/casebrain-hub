/**
 * Disclosure / Export Builder — slice 1.
 * Run: npx tsx scripts/disclosure-export-builder.test.ts
 */
import assert from "node:assert/strict";
import { loadGoldPack, readBundleText } from "../lib/eval/casebrain-auditor/bundle-fidelity-pack";
import { buildReasoningV2FromBundleText } from "../lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { buildClientStressResult } from "../lib/criminal/client-stress-test/build-client-stress-result";
import { buildDisclosureChaseDraft } from "../lib/criminal/disclosure-export/build-disclosure-chase-draft";
import { buildHearingPrepNote } from "../lib/criminal/disclosure-export/build-hearing-prep-note";
import { buildSolicitorExport } from "../lib/criminal/disclosure-export/build-solicitor-export";
import {
  isExportsEnabled,
  shouldShowSolicitorExportBuilder,
} from "../lib/criminal/disclosure-export/export-flag";
import { lintExportOutput } from "../lib/criminal/disclosure-export/export-sanitize";

function assertNoLint(obj: object, label: string) {
  const issues = lintExportOutput(JSON.stringify(obj));
  assert.ok(!issues.length, `${label}: ${issues.join("; ")}`);
}

assert.equal(isExportsEnabled({ get: () => null }, false), false);
assert.equal(isExportsEnabled({ get: () => "1" }, false), true);
assert.equal(shouldShowSolicitorExportBuilder(false, true, true), false, "needs reasoningV2");
assert.equal(shouldShowSolicitorExportBuilder(true, false, true), false, "needs exports");
assert.equal(shouldShowSolicitorExportBuilder(true, true, true), true);

const motoring = loadGoldPack().find((e) => e.truthKey.bundleId === "motoring-thin-ella-shaw");
assert.ok(motoring?.bundleTextPaths.length);
const reasoning = buildReasoningV2FromBundleText(
  readBundleText(motoring!.bundleTextPaths),
  "Motoring thin",
);
assert.equal(reasoning.available, true);
if (!reasoning.available) throw new Error("reasoning");

const ctx = {
  caseLabel: "R v Ella Shaw",
  clientLabel: "Ella Shaw",
  stage: "Magistrates — first hearing",
  hearingDateIso: "2024-09-18",
};

const chase = buildDisclosureChaseDraft(reasoning, ctx);
assert.equal(chase.exportType, "disclosure_chase");
assert.ok(chase.items.length >= 1, "should include missing material items");
assert.ok(
  chase.fullText.match(/draft for solicitor review|DRAFT FOR SOLICITOR REVIEW/i),
  "draft wording",
);
assert.ok(
  chase.items.some((i) => /cctv|cad|interview|expert|missing|disclosure/i.test(i.materialLabel + i.whyItMatters)),
  "chase items from missing material",
);
assert.ok(!chase.fullText.match(/this wins|crown collapses|safe to advise plea|proves innocence/i));
assertNoLint(chase, "disclosure chase");

const stress = buildClientStressResult(reasoning, {
  selectedOptions: ["denies_presence", "accident_no_dangerous_standard"],
});
assert.equal(stress.available, true);

const prep = buildHearingPrepNote(reasoning, ctx, {
  clientStress: stress.available ? stress : null,
  readinessInput: {
    bundleMeta: { documentCount: 3, combinedTextLength: 4000, thinBundleHint: true },
    hearingMeta: { hearingDateIso: ctx.hearingDateIso, stage: ctx.stage },
  },
});
assert.equal(prep.exportType, "hearing_prep");
assert.ok(prep.safeHearingLine.length > 10);
assert.ok(prep.readinessSection.length > 10);
assert.ok(
  prep.doNotConcedePoints.length + prep.disclosureAsks.length > 0,
  "prep includes war room / disclosure content",
);
assert.ok(
  prep.clientInstructionGaps.length >= 1 || prep.doNotConcedePoints.length >= 1,
  "stress or war room content in prep",
);
assert.equal(prep.solicitorReviewRequired, true);
assertNoLint(prep, "hearing prep");

const viaBuilder = buildSolicitorExport("hearing_prep", reasoning, ctx, {
  clientStress: stress.available ? stress : null,
});
assert.equal(viaBuilder.exportType, "hearing_prep");
assert.ok(viaBuilder.fullText.includes("Solicitor review"));

assert.ok(!JSON.stringify(chase).includes("artifacts/"));
assert.ok(!/\bpp-[a-z0-9-]+/.test(JSON.stringify(prep)));

console.log("disclosure-export-builder.test.ts: ok");
