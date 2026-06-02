import fs from "node:fs";
import path from "node:path";
import { PROTECTED_FILES_NOTE } from "./issue-fingerprints";
import type { AuditorIssue, AuditorRunResult, AuditorRunSummary, BaselineComparison, GroupedFailure } from "./types";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function writeFailuresCsv(filePath: string, issues: AuditorIssue[]): void {
  const header =
    "runId,pack,caseId,caseTitle,screen,status,severity,fingerprint,issueFamily,badText,expected,surfaceSource,collectionStatus,demoBlocker,suggestedSharedFix";
  const rows = issues
    .filter((i) => i.status === "fail" && i.releaseBlocking)
    .map((i) =>
      [
        i.runId,
        i.pack,
        i.caseId,
        i.caseTitle,
        i.screen,
        i.status,
        i.severity,
        i.fingerprint,
        i.issueFamily,
        i.badText,
        i.expected,
        i.surfaceSource,
        i.collectionStatus,
        String(i.demoBlocker),
        i.suggestedSharedFix,
      ]
        .map(csvEscape)
        .join(","),
    );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [header, ...rows].join("\n"), "utf8");
}

export function writeWeakCsv(filePath: string, issues: AuditorIssue[]): void {
  const header =
    "runId,pack,caseId,caseTitle,screen,status,severity,fingerprint,issueFamily,badText,expected,surfaceSource,collectionStatus,demoBlocker,suggestedSharedFix";
  const rows = issues
    .filter((i) => i.status === "weak" || !i.releaseBlocking)
    .map((i) =>
      [
        i.runId,
        i.pack,
        i.caseId,
        i.caseTitle,
        i.screen,
        i.status,
        i.severity,
        i.fingerprint,
        i.issueFamily,
        i.badText,
        i.expected,
        i.surfaceSource,
        i.collectionStatus,
        String(i.demoBlocker),
        i.suggestedSharedFix,
      ]
        .map(csvEscape)
        .join(","),
    );
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, [header, ...rows].join("\n"), "utf8");
}

export function writeGroupedFailuresMd(filePath: string, groups: GroupedFailure[]): void {
  const lines: string[] = [
    "# CaseBrain Auditor — grouped failures",
    "",
    PROTECTED_FILES_NOTE,
    "",
  ];
  for (const sev of ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const) {
    const subset = groups.filter((g) => g.severity === sev);
    if (!subset.length) continue;
    lines.push(`## ${sev}`, "");
    for (const g of subset) {
      lines.push(`# ${sev} — ${g.fingerprint}`);
      lines.push("");
      lines.push(`**Affected count:** ${g.affectedCount}`);
      lines.push("");
      lines.push("**Affected cases/screens:**");
      for (const s of g.affectedScreens.slice(0, 12)) lines.push(`- ${s}`);
      lines.push("");
      lines.push("**Examples of bad text:**");
      for (const ex of g.examples) lines.push(`- ${ex.caseTitle} / ${ex.screen}: \`${ex.badText}\``);
      if (g.affectedCount > g.examples.length) {
        lines.push(`- _+${g.affectedCount - g.examples.length} more_`);
      }
      lines.push("");
      if (g.badOutputSnippet) {
        lines.push("**Correct-fix output:**");
        lines.push(`- badOutputSnippet: \`${g.badOutputSnippet}\``);
        lines.push(`- whyItIsWrong: ${g.whyItIsWrong ?? "—"}`);
        lines.push(`- correctFixPrinciple: ${g.correctFixPrinciple ?? "—"}`);
        lines.push(`- suggestedBetterOutput: ${g.suggestedBetterOutput ?? "—"}`);
        lines.push(`- fixType: ${g.fixType ?? "uncertain_needs_review"}`);
        lines.push(`- confidence: ${g.confidence ?? "medium"}`);
        lines.push(`- needsHumanReview: ${g.needsHumanReview ? "yes" : "no"}`);
        lines.push("");
      }
      lines.push("**Expected behaviour:**", g.expectedBehaviour, "");
      lines.push("**Likely shared cause:**", g.likelySharedCause, "");
      if (g.fixImpactCategory) lines.push(`**Fix impact:** ${g.fixImpactCategory} | **Blast radius:** ${g.blastRadius ?? "—"}`);
      if (g.regressionTestName) lines.push(`**Regression test:** \`${g.regressionTestName}\``);
      if (g.likelyFiles?.length) lines.push(`**Likely files:** ${g.likelyFiles.join(", ")}`);
      lines.push("**Suggested Cursor fix brief:**", g.suggestedCursorFix, "");
      lines.push("_Do not patch case-by-case. Patch the shared rule/profile/filter._", "");
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

export function writeScoreboardMd(
  filePath: string,
  summary: AuditorRunSummary,
  groups: GroupedFailure[],
  baseline?: BaselineComparison,
): void {
  const lines = [
    "# CaseBrain Auditor — scoreboard",
    "",
    `## Release gate: ${summary.releaseGate}`,
    "",
    `Run: ${summary.runId} | Pack: ${summary.pack} | ${summary.ranAt}`,
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Mode | ${summary.mode} |`,
    `| Cases | ${summary.totalCases} |`,
    `| Confirmed / uncertain | ${summary.confirmedCases} / ${summary.uncertainCases} |`,
    `| Surfaces | ${summary.totalSurfaces} |`,
    `| Pass | ${summary.passCount} |`,
    `| Weak | ${summary.weakCount} |`,
    `| Fail (blocking) | ${summary.failCount} |`,
    `| Confirmed HIGH+ | ${summary.confirmedHighCount} |`,
    `| CRITICAL | ${summary.criticalCount} |`,
    `| HIGH | ${summary.highCount} |`,
    `| Demo blockers | ${summary.demoBlockerCount} |`,
    "",
    "### Top fingerprints",
    ...summary.topFingerprints.map((t) => `- \`${t.fingerprint}\` — ${t.count}`),
    "",
    "### Blocking groups",
    ...groups.filter((g) => g.releaseBlocking).slice(0, 20).map((g) => `- ${g.fingerprint} (${g.affectedCount})`),
  ];
  if (baseline?.baselineRunId) {
    lines.push("", "### Baseline", `Run: ${baseline.baselineRunId}`, `- New: ${baseline.newFailures.length}`, `- Fixed: ${baseline.fixedFailures.length}`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

export function writeResultsJson(filePath: string, result: AuditorRunResult): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), "utf8");
}

export function printConsoleSummary(
  summary: AuditorRunSummary,
  runDir: string,
  latestDir: string,
  latestSlug: string,
  groups: GroupedFailure[],
): void {
  console.log("");
  console.log(`Release gate: ${summary.releaseGate}`);
  console.log(`Pack: ${summary.pack} | Run: ${summary.runId}`);
  console.log(`Cases: ${summary.totalCases} | Surfaces: ${summary.totalSurfaces}`);
  console.log(`Pass: ${summary.passCount} | Weak: ${summary.weakCount} | Fail: ${summary.failCount}`);
  console.log(
    `Confirmed: ${summary.confirmedCases} | Uncertain: ${summary.uncertainCases} | Confirmed HIGH+: ${summary.confirmedHighCount}`,
  );
  console.log(`CRITICAL: ${summary.criticalCount} | HIGH: ${summary.highCount} | Demo blockers: ${summary.demoBlockerCount}`);
  console.log("");
  console.log("Failure groups by severity:");
  for (const sev of ["CRITICAL", "HIGH", "MEDIUM"] as const) {
    const gs = groups.filter((g) => g.severity === sev && g.releaseBlocking);
    if (gs.length) console.log(`  ${sev}: ${gs.map((g) => `${g.fingerprint}(${g.affectedCount})`).join(", ")}`);
  }
  console.log("");
  console.log("Top fingerprints:");
  for (const t of summary.topFingerprints) console.log(`  ${t.count}x  ${t.fingerprint}`);
  console.log("");
  console.log(`Run folder:       ${runDir}`);
  console.log(`Latest (${latestSlug}): ${latestDir}`);
  console.log(`Grouped failures: ${path.join(runDir, "grouped-failures.md")}`);
  console.log(`Fix prompts:      ${path.join(runDir, "fix-prompts-by-group.md")}`);
  console.log(`Demo blockers:    ${path.join(runDir, "demo-blockers.md")}`);
  console.log(`Latest copy:      ${path.join(latestDir, "grouped-failures.md")}`);
  console.log("");
}

export function writeDemoBlockersMd(filePath: string, issues: AuditorIssue[]): void {
  const blockers = issues.filter((i) => i.demoBlocker);
  const lines = [
    "# CaseBrain Auditor — demo blockers",
    "",
    `Total demo-blocker findings: ${blockers.length}`,
    "",
  ];
  const byFp = new Map<string, AuditorIssue[]>();
  for (const i of blockers) {
    const list = byFp.get(i.fingerprint) ?? [];
    list.push(i);
    byFp.set(i.fingerprint, list);
  }
  for (const [fp, list] of [...byFp.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`## ${fp} (${list.length})`, "");
    for (const i of list.slice(0, 3)) {
      lines.push(`- ${i.caseTitle} / ${i.screen}: \`${i.badText.slice(0, 120)}\` (${i.manifestConfirmed ? "confirmed" : "needs-review"})`);
    }
    if (list.length > 3) lines.push(`- _+${list.length - 3} more_`);
    lines.push("");
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}

export function writeBaselineDiffMd(filePath: string, baseline: BaselineComparison): void {
  const lines = [
    "# CaseBrain Auditor — baseline diff",
    "",
    `Baseline run: ${baseline.baselineRunId ?? "unknown"}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|-------|`,
    `| New failures | ${baseline.newFailures.length} |`,
    `| Fixed failures | ${baseline.fixedFailures.length} |`,
    `| Improved (fixed) | ${baseline.improvedFailures.length} |`,
    `| Repeated | ${baseline.repeatedFailures.length} |`,
    `| Worsened | ${baseline.worsenedFailures.length} |`,
    "",
    "## New failures",
    ...baseline.newFailures.slice(0, 50).map((k) => `- ${k}`),
    "",
    "## Fixed / improved",
    ...baseline.fixedFailures.slice(0, 50).map((k) => `- ${k}`),
    "",
    "_Full lists are in results.json when comparing runs with --baseline._",
  ];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf8");
}
