/**
 * Solicitor-visible boundary + 600-char post-composition truncation regressions.
 * Run: npx tsx scripts/solicitor-visible-boundary.test.ts
 */
import assert from "node:assert/strict";
import {
  assessSolicitorVisibleBoundary,
  assertCopyableSolicitorText,
  finalizeSolicitorVisibleProse,
  hasIncompleteRequiredDisclaimer,
} from "@/lib/criminal/solicitor-visible-boundary";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { gateSolicitorOutput } from "@/lib/criminal/solicitor-output-gate";

const COMPLETE_DISCLAIMER =
  "[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]";

// Reconstructed from the GOLD-11-039 / CASE-12 post-composition 600-cap FN (pre-fix).
const BODY =
  "CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\nWe are reviewing the papers in your case (Daniel Pike). This is early-stage — nothing is final until we have full disclosure and your instructions. A draft complainant statement is on the papers, but the ABE interview video, transcript, and final signed MG11 are still outstanding. We cannot rely on the served draft alone for hearing position. This is a historic allegation — the ABE interview video is referred on the schedule but not on the bundle we have reviewed.";

const FULL = `${BODY}\n\n${COMPLETE_DISCLAIMER}`;
assert.ok(FULL.length > 600, `expected FULL > 600, got ${FULL.length}`);

// The historical hard-cap artefact ended exactly at 600 mid-disclaimer.
const HISTORIC_600 =
  `${BODY}\n\n[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS us`;
assert.equal(HISTORIC_600.length, 600);

assert.equal(hasIncompleteRequiredDisclaimer(HISTORIC_600.slice(0, 599)), true);
assert.equal(hasIncompleteRequiredDisclaimer(HISTORIC_600), true);
assert.equal(finalizeSolicitorVisibleProse(HISTORIC_600.slice(0, 599)).ok, false);
assert.equal(finalizeSolicitorVisibleProse(HISTORIC_600).ok, false);
assert.equal(finalizeSolicitorVisibleProse(`${HISTORIC_600}e`).ok, false); // still incomplete
assert.equal(finalizeSolicitorVisibleProse(FULL).ok, true);

// Exact GOLD-11-039 class cut (600 chars, incomplete disclaimer)
const gold039Cut = HISTORIC_600;
assert.equal(gold039Cut.length, 600);
assert.equal(hasIncompleteRequiredDisclaimer(gold039Cut), true);
assert.equal(finalizeSolicitorVisibleProse(gold039Cut).ok, false);
const assessed039 = assessSolicitorSentence(gold039Cut);
assert.ok(assessed039.issues.includes("truncated_fragment") || assessed039.issues.includes("incomplete_sentence"));

const gated039 = gateSolicitorOutput({
  surfaceId: "boundary_client_summary",
  texts: [gold039Cut],
  allegation: "Historic allegation",
  bundleHay: "ABE MG11 draft",
  auditFamily: "violence",
  mode: "copy",
  data: { texts: [gold039Cut] },
});
assert.equal(gated039.canCopy, false);

// Arbitrary mid-word cut positions
for (const cutAt of [100, 250, 400, 550, 600, 650]) {
  if (cutAt >= FULL.length) continue;
  const mid = FULL.slice(0, cutAt);
  // Skip if we happened to land on a complete boundary
  if (assessSolicitorVisibleBoundary(mid).ok) continue;
  assert.equal(finalizeSolicitorVisibleProse(mid).ok, false, `cutAt=${cutAt}`);
}

// Complete vs incomplete disclaimer suffixes
assert.equal(hasIncompleteRequiredDisclaimer(COMPLETE_DISCLAIMER), false);
assert.equal(hasIncompleteRequiredDisclaimer(COMPLETE_DISCLAIMER.slice(0, -2)), true);
assert.equal(hasIncompleteRequiredDisclaimer("[CaseBrain — client-safe summary. Evidence state: provisional."), true);

// Multibyte characters must not be mid-cut by hard cap
const multi = `${"证据状态 ".repeat(40)}complete sentence about disclosure.\n\n${COMPLETE_DISCLAIMER}`;
const multiFail = finalizeSolicitorVisibleProse(multi, { maxChars: 80 });
assert.equal(multiFail.ok, false);

// Punctuation / quotation boundaries
assert.equal(finalizeSolicitorVisibleProse('He said "the footage shows').ok, false);
assert.equal(finalizeSolicitorVisibleProse("Outstanding material (see MG6C").ok, false);
assert.equal(finalizeSolicitorVisibleProse("Attribution remains outstanding on the served screenshots.").ok, true);

// Soft budget: prefer complete sentence, else fail closed (never mid-word)
const longSafe =
  "Attribution remains outstanding on the served screenshots. Please chase the full download before the hearing.";
const soft = finalizeSolicitorVisibleProse(longSafe, { maxChars: 70 });
assert.equal(soft.ok, true);
assert.match(soft.text!, /\.$/);
assert.ok(!soft.text!.endsWith("screen"));

const softFail = finalizeSolicitorVisibleProse("The attribution remains outstan", { maxChars: 600 });
assert.equal(softFail.ok, false);

// assertCopyableSolicitorText alias
assert.equal(assertCopyableSolicitorText(gold039Cut).ok, false);
assert.equal(assertCopyableSolicitorText(FULL).ok, true);

console.log(
  JSON.stringify(
    {
      ok: true,
      fullLen: FULL.length,
      gold039CutLen: gold039Cut.length,
      softBudgetOk: soft.ok,
    },
    null,
    2,
  ),
);
