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
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);

if (result.metrics.falseServedCount > 0) {
  console.error("STOP: dangerous false-served detected on controlled fixture — review before continuing.");
  process.exitCode = 2;
}
