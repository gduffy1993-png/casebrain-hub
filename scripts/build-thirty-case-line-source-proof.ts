#!/usr/bin/env npx tsx
/**
 * 30-case controlled proof-ledger pack.
 * Run: npx tsx scripts/build-thirty-case-line-source-proof.ts
 */
import path from "node:path";

import {
  PROOF_OUT_DIR,
  runProofLedgerPack,
  writePackSummary,
} from "../lib/eval/line-source-proof/build-pack-summary";
import { THIRTY_CASE_MANIFEST } from "../lib/eval/line-source-proof/thirty-case-manifest";

const result = runProofLedgerPack(THIRTY_CASE_MANIFEST);
const { passed } = writePackSummary({
  title: "Thirty-case proof-ledger pack",
  targetCount: 30,
  manifest: THIRTY_CASE_MANIFEST,
  result,
  outBasename: "THIRTY-CASE-SUMMARY",
  extraSections: [
    "## PDF-backed reference (separate)",
    "",
    "Run `npx tsx scripts/build-pdf-backed-jordan-proof-case.ts` for **cb-fresh-002-jordan-hale-pdf-proof** (not counted in the 30 text cases).",
    "",
    "Controlled audit only. **30 text-only cases** — PDF-backed Jordan runs separately.",
  ],
});

console.log(`\nThirty-case summary: ${path.join(PROOF_OUT_DIR, "THIRTY-CASE-SUMMARY.md")}`);
process.exit(passed ? 0 : 2);
