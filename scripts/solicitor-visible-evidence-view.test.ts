#!/usr/bin/env npx tsx
/**
 * Existence mapping policy 1.2.0 — NSC remains distinct from incomplete.
 * Run: npx tsx scripts/solicitor-visible-evidence-view.test.ts
 */
import assert from "node:assert/strict";
import {
  EXISTENCE_MAPPING_POLICY_ID,
  mapRawExistenceToCanonical,
} from "@/lib/criminal/canonical-matter-state";
import {
  assertCountsEqual,
  buildSolicitorVisibleEvidenceView,
  countOverviewCategoriesFromDisplayItems,
  parseOverviewCountsLine,
  parseTruthMapCanonicalStates,
} from "@/lib/criminal/solicitor-visible-evidence-view";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

assert.equal(EXISTENCE_MAPPING_POLICY_ID, "canonical-existence-map@1.2.0");
assert.equal(mapRawExistenceToCanonical("served"), "served");
assert.equal(mapRawExistenceToCanonical("referred_only"), "referred_only");
assert.equal(mapRawExistenceToCanonical("missing"), "missing");
assert.equal(mapRawExistenceToCanonical("incomplete"), "incomplete");
assert.equal(mapRawExistenceToCanonical("not_safely_confirmed"), "not_safely_confirmed");
assert.equal(mapRawExistenceToCanonical("unknown"), "not_safely_confirmed");
assert.equal(mapRawExistenceToCanonical("something_else"), "not_safely_confirmed");

assert.equal(displayExistenceLabel("not_safely_confirmed"), "Not safely confirmed");
assert.equal(displayExistenceLabel("incomplete"), "Incomplete");
assert.equal(displayExistenceLabel("unknown"), "Not safely confirmed");

const rows: FiveAnswersEvidenceRow[] = [
  { label: "MG11 complainant statement", existence: "served", reliability: "needs_review" },
  { label: "Witness statement", existence: "served", reliability: "needs_review" },
  { label: "Body-worn video", existence: "not_safely_confirmed", reliability: "needs_review" },
  { label: "BWV", existence: "missing", reliability: "needs_review" },
  { label: "Charge sheet", existence: "unknown", reliability: "needs_review" },
  { label: "CAD / 999", existence: "missing", reliability: "needs_review" },
  { label: "Partial complainant MG11", existence: "incomplete", reliability: "needs_review" },
];

const view = buildSolicitorVisibleEvidenceView(rows);

assert.equal(view.counts.notSafelyConfirmed >= 1, true, "NSC stays in NSC bucket");
assert.equal(view.counts.incomplete >= 1, true, "explicit incomplete stays Incomplete");
assert.equal(view.counts.missing >= 2, true, "BWV missing + CAD missing both counted");

const overview = parseOverviewCountsLine(view.overviewCountsText)!;
const fromTruth = countOverviewCategoriesFromDisplayItems(
  parseTruthMapCanonicalStates(view.truthMapText).map((existence) => ({ existence })),
);
assertCountsEqual(overview, view.counts);
assertCountsEqual(fromTruth, view.counts);

assert.match(view.truthMapText, /Not safely confirmed/);
assert.match(view.truthMapText, /Incomplete/);
assert.ok(view.aliasExpansion.some((g) => g.sourceRows.length > 1 && /mg11|witness/i.test(g.canonicalLabel)));

console.log(
  JSON.stringify(
    {
      ok: true,
      mappingPolicyId: EXISTENCE_MAPPING_POLICY_ID,
      displayItems: view.displayItems.length,
      counts: view.counts,
      aliasGroupsWithCollapse: view.aliasExpansion.filter((g) => g.sourceRows.length > 1).length,
    },
    null,
    2,
  ),
);
console.log("solicitor-visible-evidence-view.test.ts: PASS");
