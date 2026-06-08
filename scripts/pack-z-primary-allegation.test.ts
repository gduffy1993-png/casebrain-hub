/**
 * Pack Z Q1 charge sheet extract — production parser (defence-plan-chat).
 * Run: npx tsx scripts/pack-z-primary-allegation.test.ts
 */
import assert from "node:assert/strict";
import {
  packZParsePrimaryAllegationForEval,
  type PackZQ1ParseDebug,
} from "../lib/criminal/pack-z-primary-allegation";

/** Exact real text shape from Pack Z PDF charge sheet (page ~6). */
const REAL_CHARGE_SHEET_EXTRACT = `
CHARGE SHEET EXTRACT
Case reference: CB-Z-500-ABH-0007
Defendant: Priya Vale DOB 08/10/1995
Charge: Assault occasioning actual bodily harm, section 47 OAPA 1861
Particulars: On a date in 2026 at or near Westbridge Parade, Priya Vale is alleged to have committed abh s.47
in relation to Eli Rook.
Prosecution wording is served as a working extract only; route pressure: causation / old injury / medical report gap.
`;

/** PDF-style: few newlines, one long prose run. */
const PDFISH_SINGLE_FLOW = `
CB-Z-500-MUR-0001
CHARGE SHEET EXTRACT
Case reference: CB-Z-500-ABH-0007
Defendant: Priya Vale DOB 08/10/1995
Charge: Assault occasioning actual bodily harm, section 47 OAPA 1861
Particulars: On a date in 2026 at or near Westbridge Parade, Priya Vale is alleged to have committed abh s.47 in relation to Eli Rook.
Prosecution wording is served as a working extract only; route pressure: causation / old injury / medical report gap.
`;

/**
 * Simulates the previous production bug: broad block-end regex cut the charge block
 * before Particulars (e.g. MG5 / disclosure heading between Charge and Particulars in OCR order).
 */
const TRUNCATED_BLOCK_BEFORE_PARTICULARS = `
CB-Z-500-MUR-0001
${"x".repeat(5000)}
CHARGE SHEET EXTRACT
Case reference: CB-Z-500-ABH-0007
Defendant: Priya Vale DOB 08/10/1995
Charge: Assault occasioning actual bodily harm, section 47 OAPA 1861
MG5
Particulars: On a date in 2026 at or near Westbridge Parade, Priya Vale is alleged to have committed abh s.47
in relation to Eli Rook.
Prosecution wording is served as a working extract only.
`;

function assertFullParticularsAnswer(
  label: string,
  out: string,
  debug: PackZQ1ParseDebug
): void {
  assert.match(out, /Priya Vale/i, `${label}: defendant`);
  assert.match(out, /Assault occasioning actual bodily harm/i, `${label}: charge`);
  assert.match(out, /particulars state that/i, `${label}: particulars lead-in`);
  assert.match(out, /Westbridge Parade/i, `${label}: particulars place`);
  assert.match(out, /in relation to Eli Rook/i, `${label}: particulars continuation`);
  assert.ok(!/Core point: The bundle does not safely support/i.test(out), `${label}: no lightweight slab`);
  assert.equal(debug.chargeOnlyReason, null, `${label}: must not be charge-only (${JSON.stringify(debug)})`);
  assert.ok(debug.particularsSource, `${label}: particulars source recorded`);
}

function runCase(name: string, bundle: string): void {
  const { answer, debug } = packZParsePrimaryAllegationForEval(bundle);
  assert.ok(answer, `${name}: answer must not be null (debug=${JSON.stringify(debug)})`);
  assertFullParticularsAnswer(name, answer!, debug);
  console.log(`  ok ${name} (particulars via ${debug.particularsSource})`);
}

runCase("real_charge_sheet_extract", REAL_CHARGE_SHEET_EXTRACT);
runCase("pdfish_single_flow", PDFISH_SINGLE_FLOW);
runCase("truncated_block_before_particulars", TRUNCATED_BLOCK_BEFORE_PARTICULARS);

const chargeOnly = packZParsePrimaryAllegationForEval(`
CB-Z-500-TEST-0001
CHARGE SHEET EXTRACT
Defendant: Priya Vale DOB 08/10/1995
Charge: Affray
`);
assert.ok(chargeOnly.answer?.includes("is charged with"));
assert.ok(!chargeOnly.answer?.includes("particulars state that"));
assert.equal(chargeOnly.debug.chargeOnlyReason, "no_particulars_label_seen");

console.log("pack-z-primary-allegation.test.ts: ok");
