/**
 * Run Evidence-State Accuracy Audit on controlled fixtures.
 * Run: npx tsx scripts/run-evidence-state-audit.ts
 */
import { defaultFixtures } from "../lib/eval/evidence-state-audit/fixtures";
import { runEvidenceStateAudit, writeAuditArtifacts } from "../lib/eval/evidence-state-audit/report";

const fixtures = defaultFixtures();
const result = runEvidenceStateAudit(fixtures);
const { jsonPath, mdPath } = writeAuditArtifacts(result);

console.log(result.disclaimer);
console.log(`Cases: ${result.metrics.totalCases}`);
console.log(`Evidence items: ${result.metrics.totalEvidenceItems}`);
console.log(`False-served: ${result.metrics.falseServedCount} (${(result.metrics.falseServedRate * 100).toFixed(1)}%)`);
console.log(`Blocking failures: ${result.blockingFailures.length}`);
console.log(`Warnings: ${result.warnings.length}`);
console.log(`Chase accuracy: ${((result.metrics.chaseAccuracy ?? 0) * 100).toFixed(1)}%`);
const chaseExpected = result.cases.reduce((n, c) => n + (c.chaseDetail?.expectedCount ?? 0), 0);
const chaseMatched = result.cases.reduce((n, c) => n + (c.chaseDetail?.matchedCount ?? 0), 0);
const chaseNoCandidate = result.cases.reduce((n, c) => n + (c.chaseDetail?.unmatchedNoCandidate ?? 0), 0);
console.log(`Chase mapping: ${chaseMatched}/${chaseExpected} matched; ${chaseNoCandidate} not surfaced on H5 chase surfaces`);
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

if (result.metrics.falseServedCount > 0) {
  console.error("STOP: dangerous false-served detected on controlled fixture — review before continuing.");
  process.exitCode = 2;
}
