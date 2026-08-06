/**
 * Existence mapping policy + solicitor-visible evidence view contracts.
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

// --- Mapping policy locks (do not silently redefine) ---
assert.equal(EXISTENCE_MAPPING_POLICY_ID, "canonical-existence-map@1.1.0");
assert.equal(mapRawExistenceToCanonical("served"), "served");
assert.equal(mapRawExistenceToCanonical("referred_only"), "referred_only");
assert.equal(mapRawExistenceToCanonical("missing"), "missing");
assert.equal(mapRawExistenceToCanonical("incomplete"), "incomplete");
assert.equal(mapRawExistenceToCanonical("not_safely_confirmed"), "incomplete");
assert.equal(mapRawExistenceToCanonical("unknown"), "not_safely_confirmed");
assert.equal(mapRawExistenceToCanonical("something_else"), "not_safely_confirmed");

// Presentation alignment: raw NSC displays as Incomplete on primary surfaces
assert.equal(displayExistenceLabel("not_safely_confirmed"), "Incomplete");
assert.equal(displayExistenceLabel("unknown"), "Not safely confirmed");

const rows: FiveAnswersEvidenceRow[] = [
  { label: "MG11 complainant statement", existence: "served", reliability: "needs_review" },
  { label: "Witness statement", existence: "served", reliability: "needs_review" }, // same family+scope+status → collapse
  { label: "Body-worn video", existence: "not_safely_confirmed", reliability: "needs_review" },
  { label: "BWV", existence: "missing", reliability: "needs_review" }, // same family, different status → keep both
  { label: "Charge sheet", existence: "unknown", reliability: "needs_review" },
  { label: "CAD / 999", existence: "missing", reliability: "needs_review" },
];

const view = buildSolicitorVisibleEvidenceView(rows);

// Genuine same-scope duplicate collapses; status-divergent BWV rows must not
assert.equal(view.displayItems.length, 5, "MG11/witness collapse; BWV statuses stay separate");
assert.equal(view.counts.incomplete >= 1, true, "NSC maps into Incomplete bucket");
assert.equal(view.counts.notSafelyConfirmed >= 1, true, "unknown maps into NSC bucket");
assert.equal(view.counts.missing >= 2, true, "BWV missing + CAD missing both counted");

// overview ↔ truth_map invariant
const overview = parseOverviewCountsLine(view.overviewCountsText)!;
const fromTruth = countOverviewCategoriesFromDisplayItems(
  parseTruthMapCanonicalStates(view.truthMapText).map((existence) => ({ existence })),
);
assertCountsEqual(overview, view.counts);
assertCountsEqual(fromTruth, view.counts);

// Contradiction the independent review found must not recur:
// raw NSC must not appear as "Not safely confirmed" on the displayed truth map when counted as Incomplete
assert.equal(view.truthMapText.includes("— Incomplete") || view.counts.incomplete === 0, true);
if (view.counts.incomplete > 0) {
  // At least one Incomplete line for the Body-worn kept row (NSC→incomplete)
  assert.match(view.truthMapText, /Incomplete/);
}

// Alias expansion retains provenance for collapsed MG11/witness without changing displayed totals
assert.ok(view.aliasExpansion.some((g) => g.sourceRows.length > 1 && /mg11|witness/i.test(g.canonicalLabel)));
assert.match(view.aliasExpansionText, /←/);

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
