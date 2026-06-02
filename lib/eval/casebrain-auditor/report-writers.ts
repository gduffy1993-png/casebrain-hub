import fs from "node:fs";
import path from "node:path";
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
  const lines: string[] = ["# CaseBrain Auditor — grouped failures", ""];
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
      lines.push("**Expected behaviour:**", g.expectedBehaviour, "");
      lines.push("**Likely shared cause:**", g.likelySharedCause, "");
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
    `| Cases | ${summary.totalCases} |`,
    `| Surfaces | ${summary.totalSurfaces} |`,
    `| Pass | ${summary.passCount} |`,
    `| Weak | ${summary.weakCount} |`,
    `| Fail (blocking) | ${summary.failCount} |`,
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
  outDir: string,
  groups: GroupedFailure[],
): void {
  console.log("");
  console.log(`Release gate: ${summary.releaseGate}`);
  console.log(`Pack: ${summary.pack} | Run: ${summary.runId}`);
  console.log(`Cases: ${summary.totalCases} | Surfaces: ${summary.totalSurfaces}`);
  console.log(`Pass: ${summary.passCount} | Weak: ${summary.weakCount} | Fail: ${summary.failCount}`);
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
  console.log(`Grouped failures: ${path.join(outDir, "grouped-failures.md")}`);
  console.log(`Fix prompts:      ${path.join(outDir, "fix-prompts-by-group.md")}`);
  console.log("");
}
