/**
 * Pack Y Q1/Q3 deterministic answer quality (defence-plan-chat helpers).
 * Run: npx tsx scripts/pack-y-golden-answer-quality.test.ts
 */
import assert from "node:assert/strict";

// Minimal inline copies of detection logic for smoke tests (bundle snippets only).

function isPackYWorkflowStressBundle(bundleFullText: string): boolean {
  return /\bCB-Y\b/i.test(bundleFullText) || /\b40\s*[x×]\s*40\b/i.test(bundleFullText);
}

function isIncompletePrimaryAllegation(text: string): boolean {
  const t = text.trim();
  if (/\bin that,\s*$/i.test(t)) return true;
  if (/\bin that,\s*on\s*$/i.test(t)) return true;
  if (/\bon\s+\d{1,2}\s*$/i.test(t)) return true;
  if (/,\s*$/.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
}

const ARSON_BUNDLE = `
CB-Y-2026-0101
Offence(s) as tag: Arson being reckless as to whether life was endangered
Core issues include: final fire investigation report awaited; accelerant sample not yet served
Case-specific pressure points: CCTV master only as stills; 999 tape summary only
DISCLOSURE CHASE NOTE
Outstanding item: fire-scene photo index not served
Chase: accelerant lab final report
`;

const BLADE_Q1_CLIP =
  "Dylan Harper is charged with Possession of a bladed article in a public place in that, on 14";

assert.ok(isPackYWorkflowStressBundle(ARSON_BUNDLE));
assert.ok(isIncompletePrimaryAllegation(BLADE_Q1_CLIP));
assert.ok(!isIncompletePrimaryAllegation("On 14 April 2026 at Northchester, he had a knife in public without good reason."));

console.log("pack-y-golden-answer-quality.test.ts: ok");
