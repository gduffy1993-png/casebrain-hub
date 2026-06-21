/**
 * Module 3 — scope contradiction tests.
 * Run: npx tsx scripts/bundle-scope-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractScopeContradictions } from "../lib/criminal/extract-scope-contradictions";
import { isBundleScopeSurfacingEnabled } from "../lib/criminal/bundle-scope-surfacing";
import { extractAllBundleContradictions } from "../lib/criminal/merge-bundle-contradictions";
import { buildHearingWarRoomBrief } from "../components/criminal/hearing-war-room/buildHearingWarRoomBrief";

const FRAUD_MULTI_SINGLE = `
=== SECTION: CHARGE ===
Between 01 March 2026 and 30 April 2026 the defendant made multiple fraudulent refunds.

=== SECTION: MG5 ===
MG5 case summary
This relates to one refund transaction on 15 March 2026 at the store.
MG5 total alleged loss is 1,280.40 for the charge period.
`.padStart(220, " ");

const TWO_COUNTS = `
=== SECTION: CHARGE ===
Count 1: Fraud by false representation
Count 2: Fraud by false representation

=== SECTION: MG5 ===
MG5 case summary
The prosecution relates to a single incident on 11 June 2026 at the address.
`.padStart(220, " ");

const scopeMulti = extractScopeContradictions(FRAUD_MULTI_SINGLE);
assert.ok(scopeMulti.some((c) => c.type === "scope_multi_vs_single"), "Fraud: multi vs single");

const scopeCounts = extractScopeContradictions(TWO_COUNTS);
assert.ok(scopeCounts.some((c) => c.type === "scope_indictment_count"), "Two counts vs single MG5");

assert.equal(extractScopeContradictions("Thin bundle.").length, 0, "Thin: empty");

process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING = "false";
process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING = "false";
assert.equal(isBundleScopeSurfacingEnabled(), false);
const warOff = buildHearingWarRoomBrief({
  caseId: "scope-off",
  caseTitle: "Test",
  clientLabel: "Client",
  allegation: "Fraud",
  stage: "PTPH",
  hearingStatus: "TBC",
  bundleHealth: "Partial",
  positionStatus: "Provisional",
  readiness: "Conditional",
  battleboard: null,
  hasSavedPosition: false,
  chaseItems: [],
  bundleText: FRAUD_MULTI_SINGLE,
});
assert.equal(warOff.bundleContradictions?.length ?? 0, 0, "Kill switch disables scope");
delete process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING;
delete process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING;

const all = extractAllBundleContradictions(FRAUD_MULTI_SINGLE);
assert.ok(all.some((c) => c.type === "scope_multi_vs_single"), "Merged: scope");

console.log("bundle-scope-extract.test.ts: ok");
