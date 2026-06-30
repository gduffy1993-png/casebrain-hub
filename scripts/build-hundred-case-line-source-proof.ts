#!/usr/bin/env npx tsx
/**
 * 100-case controlled proof-ledger pack.
 * Run: npx tsx scripts/build-hundred-case-line-source-proof.ts
 *
 * Hard-stops on emitted unsupported, wrong-family, or referred-as-served gates.
 * PDF-backed Jordan is separate.
 */
import path from "node:path";

import {
  PROOF_OUT_DIR,
  runProofLedgerPack,
  writePackSummary,
} from "../lib/eval/line-source-proof/build-pack-summary";
import { HUNDRED_CASE_MANIFEST, DUPLICATE_COVERAGE_EXCLUDED } from "../lib/eval/line-source-proof/hundred-case-manifest";

const FALSE_SUPP_CLUSTER_STOP = 15;

const result = runProofLedgerPack(HUNDRED_CASE_MANIFEST);
const { totals, passed: gatesPassed } = writePackSummary({
  title: "Hundred-case proof-ledger pack (closeout)",
  targetCount: 100,
  manifest: HUNDRED_CASE_MANIFEST,
  result,
  outBasename: "HUNDRED-CASE-SUMMARY",
  closeout: true,
});

let blocked = !gatesPassed;
let blockReason = "";

if (totals.emittedUnsupported > 0) {
  blocked = true;
  blockReason = `emitted unsupported=${totals.emittedUnsupported}`;
}
if (totals.falseSupp >= FALSE_SUPP_CLUSTER_STOP) {
  blocked = true;
  blockReason = blockReason || `possible false suppressions cluster=${totals.falseSupp}`;
}

console.log(`\nHundred-case summary: ${path.join(PROOF_OUT_DIR, "HUNDRED-CASE-SUMMARY.md")}`);
if (blocked) {
  console.error(`BLOCKED: ${blockReason || "acceptance gate failure"}`);
  process.exit(2);
}
process.exit(0);
