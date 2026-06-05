/**
 * Real-matter auditor — slice 1 tests.
 * Run: npx tsx scripts/real-matter-auditor.test.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FICTIONAL_TEMPLATE_MANIFEST,
  validateLocalManifest,
} from "../lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-validate";
import { listLocalRealMatters } from "../lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-load";
import {
  localRealMattersRoot,
  realMatterAuditorReportDir,
} from "../lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-paths";
import { toSafeSummaryJson } from "../lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-report";
import { runAndWriteRealMatterAuditor } from "../lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-run";
import { scoreRealMatterCase } from "../lib/eval/casebrain-auditor/real-matter-auditor/real-matter-auditor-score";

const templateValid = validateLocalManifest(FICTIONAL_TEMPLATE_MANIFEST);
assert.equal(templateValid.ok, true, "fictional template validates");

const committedTemplate = JSON.parse(
  fs.readFileSync("docs/real-matter-auditor/manifest.template.json", "utf8"),
);
const committedValid = validateLocalManifest(committedTemplate);
assert.equal(committedValid.ok, true, "committed manifest.template.json validates");

const gitignore = fs.readFileSync(".gitignore", "utf8");
assert.ok(gitignore.includes("artifacts/casebrain-auditor/"), "artifacts gitignored");
assert.ok(localRealMattersRoot().includes("local-real-matters"));

const thinScored = scoreRealMatterCase(
  FICTIONAL_TEMPLATE_MANIFEST,
  "short",
  "bundle-text",
  { mode: "discovery", humanTruth: null },
);
assert.ok(
  thinScored.fingerprints.includes("fp:real-text-thin") ||
    thinScored.overall === "needs_review",
);

async function runAsyncTests(): Promise<void> {
  const { summary, reportDir } = await runAndWriteRealMatterAuditor({
    pack: "local",
    mode: "discovery",
  });
  assert.equal(summary.matterCount, listLocalRealMatters().length);
  assert.equal(summary.scored, 0);
  assert.ok(fs.existsSync(reportDir));

  const safeJson = JSON.stringify(toSafeSummaryJson(summary));
  assert.ok(!safeJson.includes("bundleText"));
  assert.ok(!safeJson.includes("extractText"));
  assert.ok(!safeJson.includes("clientName"));

  const strict = await runAndWriteRealMatterAuditor({
    pack: "local",
    mode: "strict-truth",
  });
  assert.equal(strict.summary.scored, 0);
}

runAsyncTests()
  .then(() => {
    console.log("real-matter-auditor.test.ts: ok");
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
