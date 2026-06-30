#!/usr/bin/env npx tsx
/**
 * 500-case controlled proof-ledger + solicitor proof packet scale run.
 * Run: npx tsx scripts/build-five-hundred-case-line-source-proof.ts
 *
 * Audit/proof/report layer only. Hard-stops on blocking acceptance gates.
 */
import path from "node:path";

import {
  PROOF_OUT_DIR,
  renderSolicitorProofIndex,
  runProofLedgerPack,
  writePackSummary,
} from "../lib/eval/line-source-proof/build-pack-summary";
import { FIVE_HUNDRED_CASE_MANIFEST } from "../lib/eval/line-source-proof/five-hundred-case-manifest";
import { writeFiveHundredPackReports } from "../lib/eval/line-source-proof/five-hundred-pack-reports";
import fs from "node:fs";

const TARGET = 500;

console.log(`Branch scale run: ${TARGET} solicitor proof packets`);
console.log(`Manifest: ${FIVE_HUNDRED_CASE_MANIFEST.length} cases`);

const result = runProofLedgerPack(FIVE_HUNDRED_CASE_MANIFEST);
const caseIds = result.rows.map((r) => r.caseId);
const totals = result.rows.reduce(
  (acc, r) => {
    acc.fail += r.summary.fail;
    acc.emittedUnsupported += r.proofLedger.counts.emittedUnsupported;
    acc.blocked += r.acceptance.blocked ? 1 : 0;
    return acc;
  },
  { fail: 0, emittedUnsupported: 0, blocked: 0 },
);

const { totals: packTotals, passed: gatesPassed } = writePackSummary({
  title: "Five-hundred-case proof-ledger pack",
  targetCount: TARGET,
  manifest: FIVE_HUNDRED_CASE_MANIFEST,
  result,
  outBasename: "FIVE-HUNDRED-CASE-SUMMARY",
  closeout: false,
});

const { phraseScan, weak, passed: reportsPassed } = writeFiveHundredPackReports({
  rows: result.rows,
  totals: packTotals,
  stoppedEarly: result.stoppedEarly,
  caseIds,
});

// Ensure 500-case index title (writePackSummary already writes index for targetCount>=100)
fs.writeFileSync(
  path.join(PROOF_OUT_DIR, "SOLICITOR-PROOF-INDEX.md"),
  renderSolicitorProofIndex(result.rows, "Five-hundred-case solicitor proof packet index"),
);

console.log(`\n500-case summary: ${path.join(PROOF_OUT_DIR, "500-PROOF-PACKET-SUMMARY.md")}`);
console.log(`Index: ${path.join(PROOF_OUT_DIR, "SOLICITOR-PROOF-INDEX.md")}`);
console.log(`Phrase scan: ${phraseScan.hits.length} hits, ${phraseScan.missingPackets.length} missing`);
console.log(`Weak top: ${weak.slice(0, 5).map((w) => `${w.caseId}(${w.weakScore})`).join(", ")}`);

const hardPass =
  !result.stoppedEarly &&
  result.rows.length === TARGET &&
  gatesPassed &&
  reportsPassed;

if (!hardPass) {
  console.error("BLOCKED: hard acceptance checks failed — not safe to commit");
  if (result.stoppedEarly) console.error("  - stopped early");
  if (result.rows.length !== TARGET) console.error(`  - cases ${result.rows.length}/${TARGET}`);
  if (packTotals.fail > 0) console.error(`  - FAIL=${packTotals.fail}`);
  if (packTotals.emittedUnsupported > 0) console.error(`  - emitted unsupported=${packTotals.emittedUnsupported}`);
  if (packTotals.blocked > 0) console.error(`  - blocked=${packTotals.blocked}`);
  if (phraseScan.hits.length > 0) console.error(`  - phrase hits=${phraseScan.hits.length}`);
  if (phraseScan.missingPackets.length > 0) console.error(`  - missing packets=${phraseScan.missingPackets.length}`);
  process.exit(2);
}

console.log("PASS: all hard acceptance checks — safe to commit on branch (do not merge to master)");
process.exit(0);
