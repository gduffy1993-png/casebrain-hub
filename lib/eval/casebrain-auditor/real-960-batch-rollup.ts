import fs from "node:fs";
import path from "node:path";
import { attachCorrectFixToGroups } from "./correct-fix";
import { generateFixPromptsByGroup } from "./fix-ticket-generator";
import { groupFailuresByFingerprint, topFingerprints } from "./grouped-failures";
import { buildOffenceCoverage, writeOffenceCoverageReports } from "./offence-coverage";
import type { RealCaseRow } from "./real-case-collector";
import {
  printConsoleSummary,
  writeDemoBlockersMd,
  writeGroupedFailuresMd,
  writeScoreboardMd,
} from "./report-writers";
import type {
  AuditorIssue,
  AuditorRunOptions,
  AuditorRunResult,
  AuditorRunSummary,
  GroupedFailure,
  ReleaseGate,
} from "./types";

function computeReleaseGate(issues: AuditorIssue[]): ReleaseGate {
  const confirmedBlocking = issues.filter((i) => i.releaseBlocking && i.manifestConfirmed);
  if (confirmedBlocking.some((i) => i.severity === "CRITICAL" || i.severity === "HIGH")) {
    return "RED";
  }
  if (
    issues.some((i) => !i.manifestConfirmed) ||
    issues.some((i) => i.severity === "MEDIUM" || i.severity === "LOW")
  ) {
    return "AMBER";
  }
  return "GREEN";
}

export const REAL_960_ROLLUP_SLUG = "full-960-real-rollup";

export type BatchChunkRecord = {
  chunkIndex: number;
  offset: number;
  limit: number;
  status: "ok" | "failed" | "empty";
  runId?: string;
  runDir?: string;
  casesScanned: number;
  error?: string;
  releaseGate?: ReleaseGate;
  topFingerprints: Array<{ fingerprint: string; count: number }>;
};

export type Real960Rollup = {
  generatedAt: string;
  orgId: string;
  chunkSize: number;
  maxCases: number;
  totalCasesScanned: number;
  chunksCompleted: number;
  chunksFailed: number;
  chunksEmpty: number;
  chunkRecords: BatchChunkRecord[];
  releaseGate: ReleaseGate;
  severityTotals: { CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number };
  demoBlockerCount: number;
  confirmedCases: number;
  uncertainCases: number;
  topFingerprints: Array<{ fingerprint: string; count: number }>;
  topIssueFamilies: Array<{ issueFamily: string; count: number }>;
  offenceCoverage: ReturnType<typeof buildOffenceCoverage>;
  groups: GroupedFailure[];
  summary: AuditorRunSummary;
};

function mergeExamples(groups: GroupedFailure[], maxPerFingerprint = 3): GroupedFailure[] {
  return groups.map((g) => ({
    ...g,
    examples: g.examples.slice(0, maxPerFingerprint),
    affectedCases: g.affectedCases.slice(0, 12),
    affectedScreens: g.affectedScreens.slice(0, 12),
  }));
}

function buildRollupSummary(
  runId: string,
  options: AuditorRunOptions,
  allIssues: AuditorIssue[],
  caseResults: import("./types").CaseAuditResult[],
  totalSurfaces: number,
  chunks: BatchChunkRecord[],
): AuditorRunSummary {
  const passCount = caseResults.filter((c) => c.pass).length;
  const weakCount = allIssues.filter((i) => i.status === "weak").length;
  const failCount = allIssues.filter((i) => i.status === "fail" && i.releaseBlocking).length;
  const confirmedBlocking = allIssues.filter((i) => i.releaseBlocking && i.manifestConfirmed);

  return {
    runId,
    pack: "full-960",
    mode: "discovery",
    ranAt: new Date().toISOString(),
    userRole: options.userRole,
    pilotUserId: options.pilotUserId,
    dataSource: `real corpus batch rollup (${chunks.length} chunks, chunkSize=${options.batchChunkSize ?? 50}, max=${options.batchMaxCases ?? 1000})`,
    totalCases: caseResults.length,
    totalSurfaces,
    confirmedCases: caseResults.filter((c) => c.manifestCertainty === "confirmed").length,
    uncertainCases: caseResults.filter((c) => c.manifestCertainty === "uncertain").length,
    passCount,
    weakCount,
    failCount,
    confirmedFailCount: confirmedBlocking.filter((i) => i.status === "fail").length,
    criticalCount: allIssues.filter((i) => i.severity === "CRITICAL").length,
    highCount: allIssues.filter((i) => i.severity === "HIGH").length,
    confirmedHighCount: confirmedBlocking.filter(
      (i) => i.severity === "CRITICAL" || i.severity === "HIGH",
    ).length,
    mediumCount: allIssues.filter((i) => i.severity === "MEDIUM").length,
    lowCount: allIssues.filter((i) => i.severity === "LOW").length,
    demoBlockerCount: allIssues.filter((i) => i.demoBlocker).length,
    releaseGate: computeReleaseGate(allIssues),
    topFingerprints: topFingerprints(allIssues, 25),
  };
}

function writeRollupMarkdown(rollupDir: string, rollup: Real960Rollup): void {
  const lines = [
    "# CaseBrain Auditor — real 960 batch rollup",
    "",
    `Generated: ${rollup.generatedAt}`,
    `Org: ${rollup.orgId}`,
    `Cases scanned: **${rollup.totalCasesScanned}**`,
    `Chunks: ${rollup.chunksCompleted} ok, ${rollup.chunksFailed} failed, ${rollup.chunksEmpty} empty`,
    `Release gate: **${rollup.releaseGate}**`,
    "",
    "## Severity totals",
    "",
    `| CRITICAL | HIGH | MEDIUM | LOW | Demo blockers |`,
    `|----------|------|--------|-----|---------------|`,
    `| ${rollup.severityTotals.CRITICAL} | ${rollup.severityTotals.HIGH} | ${rollup.severityTotals.MEDIUM} | ${rollup.severityTotals.LOW} | ${rollup.demoBlockerCount} |`,
    "",
    "## Top fingerprints (all chunks)",
    "",
  ];

  for (const t of rollup.topFingerprints.slice(0, 20)) {
    lines.push(`- ${t.count}× \`${t.fingerprint}\``);
  }

  lines.push("", "## Top issue families", "");
  for (const f of rollup.topIssueFamilies.slice(0, 15)) {
    lines.push(`- ${f.count}× ${f.issueFamily}`);
  }

  lines.push("", "## Chunks", "", "| # | offset | limit | status | runId | cases | gate |", "|---|--------|-------|--------|-------|-------|------|");
  for (const c of rollup.chunkRecords) {
    lines.push(
      `| ${c.chunkIndex} | ${c.offset} | ${c.limit} | ${c.status} | ${c.runId ?? "—"} | ${c.casesScanned} | ${c.releaseGate ?? "—"} |`,
    );
  }

  if (rollup.chunkRecords.some((c) => c.error)) {
    lines.push("", "### Chunk errors", "");
    for (const c of rollup.chunkRecords.filter((x) => x.error)) {
      lines.push(`- Chunk ${c.chunkIndex} (offset ${c.offset}): ${c.error}`);
    }
  }

  lines.push("", "## Rollup artifact paths", "");
  lines.push(`- ${path.join(rollupDir, "real-960-rollup.json")}`);
  lines.push(`- ${path.join(rollupDir, "grouped-failures.md")}`);
  lines.push(`- ${path.join(rollupDir, "offence-coverage.md")}`);
  lines.push("");

  fs.writeFileSync(path.join(rollupDir, "real-960-rollup.md"), lines.join("\n"), "utf8");
}

export async function runReal960BatchDiscovery(
  options: AuditorRunOptions,
): Promise<{ rollup: Real960Rollup; rollupDir: string; result: AuditorRunResult }> {
  const orgId = process.env.EVAL_ORG_ID?.trim();
  if (!orgId) {
    throw new Error("batch real-960 requires EVAL_ORG_ID in environment.");
  }

  const chunkSize = options.batchChunkSize ?? 50;
  const maxCases = options.batchMaxCases ?? 1000;

  const allIssues: AuditorIssue[] = [];
  const allCases: import("./types").CaseAuditResult[] = [];
  const allRows: RealCaseRow[] = [];
  const chunkRecords: BatchChunkRecord[] = [];
  let totalSurfaces = 0;
  let offset = 0;
  let chunkIndex = 0;
  let totalScanned = 0;

  while (totalScanned < maxCases) {
    const limit = Math.min(chunkSize, maxCases - totalScanned);
    const record: BatchChunkRecord = {
      chunkIndex,
      offset,
      limit,
      status: "ok",
      casesScanned: 0,
      topFingerprints: [],
    };

    console.log(`\n[batch] Chunk ${chunkIndex + 1}: offset=${offset} limit=${limit}`);

    try {
      const { runAuditor } = await import("./index");
      const chunkResult = await runAuditor({
        ...options,
        pack: "full-960",
        mode: "discovery",
        corpus: "real",
        limit,
        offset,
        writeLatest: false,
        quietConsole: true,
      });

      const n = chunkResult.summary.totalCases;
      record.status = n === 0 ? "empty" : "ok";
      record.casesScanned = n;
      record.runId = chunkResult.summary.runId;
      record.runDir = path.join(options.outDir, "runs", chunkResult.summary.runId);
      record.releaseGate = chunkResult.summary.releaseGate;
      record.topFingerprints = chunkResult.summary.topFingerprints.slice(0, 5);

      if (n === 0) {
        chunkRecords.push(record);
        break;
      }

      allIssues.push(...chunkResult.issues);
      allCases.push(...chunkResult.cases);
      totalSurfaces += chunkResult.summary.totalSurfaces;
      totalScanned += n;

      const { fetchRealCaseRows } = await import("./real-case-collector");
      const { rows } = await fetchRealCaseRows(orgId, { limit, offset, criminalOnly: true });
      allRows.push(...rows);
    } catch (err) {
      record.status = "failed";
      record.error = err instanceof Error ? err.message : String(err);
      chunkRecords.push(record);
      allIssues.push({
        runId: `batch_${Date.now()}`,
        pack: "full-960",
        caseId: `chunk_${chunkIndex}`,
        caseTitle: `Batch chunk ${chunkIndex}`,
        screen: "control_room",
        status: "warn",
        severity: "MEDIUM",
        fingerprint: "collector.chunk_failed",
        issueFamily: "manifest",
        badText: record.error,
        expected: "Chunk should complete read-only scan.",
        surfaceSource: "synthetic",
        collectionStatus: "missing",
        suggestedSharedFix: "Fix collector error and rerun batch from failed offset.",
        demoBlocker: false,
        message: `collector.chunk_failed: ${record.error}`,
        releaseBlocking: false,
        manifestConfirmed: false,
      });
      offset += limit;
      chunkIndex += 1;
      continue;
    }

    chunkRecords.push(record);
    offset += limit;
    chunkIndex += 1;

    if (record.status === "empty") break;
  }

  let groups = groupFailuresByFingerprint(allIssues);
  groups = attachCorrectFixToGroups(groups, { pack: "full-960", cases: allCases });

  const rollupRunId = `rollup_${Date.now()}`;
  const summary = buildRollupSummary(rollupRunId, options, allIssues, allCases, totalSurfaces, chunkRecords);

  const familyCounts = new Map<string, number>();
  for (const i of allIssues) {
    familyCounts.set(i.issueFamily, (familyCounts.get(i.issueFamily) ?? 0) + 1);
  }

  const rollup: Real960Rollup = {
    generatedAt: new Date().toISOString(),
    orgId,
    chunkSize,
    maxCases,
    totalCasesScanned: totalScanned,
    chunksCompleted: chunkRecords.filter((c) => c.status === "ok").length,
    chunksFailed: chunkRecords.filter((c) => c.status === "failed").length,
    chunksEmpty: chunkRecords.filter((c) => c.status === "empty").length,
    chunkRecords,
    releaseGate: summary.releaseGate,
    severityTotals: {
      CRITICAL: summary.criticalCount,
      HIGH: summary.highCount,
      MEDIUM: summary.mediumCount,
      LOW: summary.lowCount,
    },
    demoBlockerCount: summary.demoBlockerCount,
    confirmedCases: summary.confirmedCases,
    uncertainCases: summary.uncertainCases,
    topFingerprints: summary.topFingerprints,
    topIssueFamilies: [...familyCounts.entries()]
      .map(([issueFamily, count]) => ({ issueFamily, count }))
      .sort((a, b) => b.count - a.count),
    offenceCoverage: buildOffenceCoverage(allRows),
    groups,
    summary,
  };

  const rollupDir = path.join(options.outDir, "latest", REAL_960_ROLLUP_SLUG);
  fs.mkdirSync(rollupDir, { recursive: true });

  const mergedGroups = mergeExamples(groups, 3);
  writeGroupedFailuresMd(path.join(rollupDir, "grouped-failures.md"), mergedGroups);
  fs.writeFileSync(
    path.join(rollupDir, "fix-prompts-by-group.md"),
    generateFixPromptsByGroup(mergedGroups),
    "utf8",
  );
  writeScoreboardMd(path.join(rollupDir, "scoreboard.md"), summary, mergedGroups);
  writeDemoBlockersMd(path.join(rollupDir, "demo-blockers.md"), allIssues);
  writeOffenceCoverageReports(rollupDir, allRows);
  fs.writeFileSync(path.join(rollupDir, "real-960-rollup.json"), JSON.stringify(rollup, null, 2), "utf8");
  writeRollupMarkdown(rollupDir, rollup);

  const result: AuditorRunResult = {
    summary,
    aggregate: { batch: true, chunkRecords },
    cases: allCases,
    issues: allIssues,
    groups: mergedGroups,
  };

  if (!options.quietConsole) {
    console.log("");
    console.log(`Batch rollup: ${rollupDir}`);
    console.log(`Cases scanned: ${totalScanned} | Chunks: ${chunkRecords.length}`);
    printConsoleSummary(summary, rollupDir, rollupDir, REAL_960_ROLLUP_SLUG, mergedGroups);
  }

  return { rollup, rollupDir, result };
}
