/**
 * Bundle contradiction extraction — Tier 1 Item 1 acceptance tests.
 * Run: npx tsx scripts/bundle-contradiction-extract.test.ts
 */
import assert from "node:assert/strict";
import { extractBundleContradictions } from "../lib/criminal/extract-bundle-contradictions";

const PAIGE_BUNDLE = `
=== SECTION: MG5 ===
MG5 case summary
Both parties were struggling in the kitchen during the argument.
Ms Thornton says Ms Lee threw the mug first before the injury occurred.

=== SECTION: MG11 ===
MG11 – Hannah Lee
I did not throw anything at her.
I walked away and she followed… I felt something hit my face… I was bleeding… in the hallway.
`;

const NEIL_BUNDLE = `
=== SECTION: CHARGE ===
Between 01 March 2026 and 30 April 2026 the defendant fraudulently made refunds.

=== SECTION: MG5 ===
MG5 case summary
MG5 total alleged loss is 1,280.40 for the charge period.
CCTV stills are limited to two dates, while the charge covers two months.

=== SECTION: MG11 ===
MG11 – Owen Clarke (store investigator)
My schedule totals 1,084.90.
`;

const paige = extractBundleContradictions(PAIGE_BUNDLE);
assert.ok(paige.some((c) => c.type === "location"), "Paige: location");
assert.ok(paige.some((c) => c.type === "first_contact"), "Paige: first contact");
assert.ok(
  paige.find((c) => c.type === "location")?.theoryLine.includes("kitchen"),
  "Paige location mentions kitchen",
);
assert.ok(
  paige.find((c) => c.type === "first_contact")?.theoryLine.includes("denies"),
  "Paige first contact uses provisional denial framing",
);

const neil = extractBundleContradictions(NEIL_BUNDLE);
assert.ok(neil.some((c) => c.type === "loss_figure"), "Neil: loss figure");
assert.ok(neil.some((c) => c.type === "cctv_window"), "Neil: CCTV window");
assert.ok(
  neil.find((c) => c.type === "loss_figure")?.values.some((v) => v.includes("1,280")),
  "Neil loss includes MG5 figure",
);
assert.ok(
  neil.find((c) => c.type === "loss_figure")?.values.some((v) => v.includes("1,084")),
  "Neil loss includes investigator figure",
);

const empty = extractBundleContradictions("Short bundle with no structured sections.");
assert.equal(empty.length, 0, "No contradictions on thin text");

console.log("bundle-contradiction-extract.test.ts: ok");
