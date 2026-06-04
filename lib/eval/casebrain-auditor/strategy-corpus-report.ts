import fs from "node:fs";
import path from "node:path";
import type { StrategyCorpusSummary } from "./strategy-corpus-types";
import { holdoutSummaryFrom, strategyCorpusReportDir } from "./strategy-corpus-run";

function weakFailCsv(summary: StrategyCorpusSummary): string {
  const header = "caseId,seed,split,offenceFamily,recipeId,overall,failures,fingerprints";
  const rows = summary.results
    .filter((r) => r.overall !== "pass")
    .map((r) => {
      const failures = r.failures.join("; ").replace(/"/g, '""');
      const fps = r.fingerprints.join("; ");
      return `"${r.caseId}",${r.seed},${r.split},${r.offenceFamily},"${r.recipeId}",${r.overall},"${failures}","${fps}"`;
    });
  return [header, ...rows].join("\n");
}

function fingerprintMarkdown(summary: StrategyCorpusSummary): string {
  const lines = [
    "# Strategy corpus — fingerprint rollup",
    "",
    `Generated: ${summary.generatedAt}`,
    `Scored: ${summary.scored} | Pass: ${summary.passed} | Weak: ${summary.weak} | Fail: ${summary.failed}`,
    "",
    "## Top failure fingerprints (group fixes here — not per caseId)",
    "",
  ];
  if (!summary.topFingerprints.length) {
    lines.push("_No failure fingerprints in this run._");
  } else {
    for (const fp of summary.topFingerprints) {
      lines.push(`- \`${fp.fingerprint}\` — ${fp.count} case(s)`);
    }
  }
  lines.push("", "## Anti-overfitting", "", "- Holdout is frozen — do not tune against holdout failures.", "- Fix shared fingerprints on discovery/validation only.", "");
  return lines.join("\n");
}

function summaryMarkdown(summary: StrategyCorpusSummary): string {
  const lines = [
    "# Strategy corpus summary (Phase 4e v1)",
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Generator | ${summary.generatorVersion} |`,
    `| Phase | ${summary.phase} |`,
    `| Count requested | ${summary.count} |`,
    `| Split filter | ${summary.splitFilter} |`,
    `| Canary | ${summary.canary} |`,
    `| Materialisation | ${summary.materialisationMode} |`,
    `| Scored | ${summary.scored} |`,
    `| Pass | ${summary.passed} |`,
    `| Weak | ${summary.weak} |`,
    `| Fail | ${summary.failed} |`,
    "",
    "## Split counts (full corpus assignment)",
    "",
    `- Discovery: ${summary.splitCounts.discovery}`,
    `- Validation: ${summary.splitCounts.validation}`,
    `- Holdout: ${summary.splitCounts.holdout} (frozen — not for tuning)`,
    "",
    "## By offence family",
    "",
  ];
  for (const f of summary.byFamily) {
    lines.push(
      `- **${f.offenceFamily}**: ${f.total} scored — pass ${f.pass}, weak ${f.weak}, fail ${f.fail}`,
    );
  }
  lines.push("", "## By failure-mode tag (cases may carry multiple tags)", "");
  for (const t of summary.byFailureMode.slice(0, 15)) {
    lines.push(`- **${t.tag}**: ${t.total} — pass ${t.pass}, weak ${t.weak}, fail ${t.fail}`);
  }
  return lines.join("\n");
}

export function writeStrategyCorpusReport(summary: StrategyCorpusSummary, outDir?: string): string {
  const dir = outDir ?? strategyCorpusReportDir();
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
  fs.writeFileSync(path.join(dir, "SUMMARY.md"), summaryMarkdown(summary), "utf8");
  fs.writeFileSync(path.join(dir, "fingerprint-rollup.md"), fingerprintMarkdown(summary), "utf8");
  fs.writeFileSync(path.join(dir, "weak-fail-cases.csv"), weakFailCsv(summary), "utf8");

  const holdout = holdoutSummaryFrom(summary);
  fs.writeFileSync(
    path.join(dir, "holdout-summary.json"),
    JSON.stringify(
      {
        generatedAt: summary.generatedAt,
        holdoutFrozen: true,
        tuneAllowed: false,
        note: "Holdout scored but not for tuning — Phase 4e anti-overfitting rule",
        ...holdout,
      },
      null,
      2,
    ),
    "utf8",
  );

  fs.writeFileSync(
    path.join(dir, "by-family.json"),
    JSON.stringify(summary.byFamily, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(dir, "by-failure-mode.json"),
    JSON.stringify(summary.byFailureMode, null, 2),
    "utf8",
  );

  return dir;
}
