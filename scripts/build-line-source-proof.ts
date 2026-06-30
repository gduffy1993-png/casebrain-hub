#!/usr/bin/env npx tsx
/**
 * One-case line-by-line source audit.
 * Run: npx tsx scripts/build-line-source-proof.ts
 * Env: LINE_SOURCE_CASE_ID=cb-fresh-002-jordan-hale
 */
import path from "node:path";

import { buildLineSourceProof, writeLineSourceProofArtifacts } from "../lib/eval/line-source-proof/build-report";

const ROOT = process.cwd();
const CASE_ID = process.argv[2] ?? process.env.LINE_SOURCE_CASE_ID ?? "cb-fresh-002-jordan-hale";
const caseDir = path.join(ROOT, "artifacts", "evidence-state-audit-local", "cases", CASE_ID);

const report = buildLineSourceProof(caseDir);
const { mdPath, jsonPath } = writeLineSourceProofArtifacts(report);

console.log(`Line-by-line source proof — ${CASE_ID}`);
console.log(`  lines: ${report.summary.totalMeaningfulLines}`);
console.log(`  PASS: ${report.summary.pass}  WARNING: ${report.summary.warning}  FAIL: ${report.summary.fail}`);
console.log(`  positive correct: ${report.summary.positiveCorrect}`);
console.log(`  tiers — blocking: ${report.summary.blockingReview}  source: ${report.summary.sourceReviewWarnings}  caution: ${report.summary.solicitorCaution}  clean: ${report.summary.cleanSourceBacked}  safety: ${report.summary.genericSafetyGuards}`);
console.log(`  Ged review (tiered): ${report.summary.gedReviewCount}`);
console.log(`  md:   ${mdPath}`);
console.log(`  json: ${jsonPath}`);

if (report.summary.fail > 0) process.exit(2);
