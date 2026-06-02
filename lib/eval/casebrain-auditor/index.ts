import fs from "node:fs";
import path from "node:path";
import { resolvePack } from "./pack-registry";
import { generateFixPromptsByGroup } from "./fix-ticket-generator";
import { groupFailuresByFingerprint, topFingerprints } from "./grouped-failures";
import {
  collectAggregateCourtToday,
  collectCaseSurfaces,
  collectPilotUiSurface,
} from "./surface-collectors";
import {
  partitionIssues,
  scoreAggregateCourtToday,
  scoreCaseScreens,
  scorePilotUi,
} from "./scorers";
import {
  printConsoleSummary,
  writeFailuresCsv,
  writeGroupedFailuresMd,
  writeResultsJson,
  writeScoreboardMd,
  writeWeakCsv,
} from "./report-writers";
import { PILOT_DEMO_USER_ID } from "./truth-manifests";
import type {
  AuditorIssue,
  AuditorRunOptions,
  AuditorRunResult,
  AuditorRunSummary,
  BaselineComparison,
  CaseAuditResult,
  ReleaseGate,
} from "./types";

function newRunId(): string {
  return `auditor_${Date.now()}`;
}

function computeReleaseGate(critical: number, high: number, medium: number, low: number): ReleaseGate {
  if (critical > 0 || high > 0) return "RED";
  if (medium > 0 || low > 0) return "AMBER";
  return "GREEN";
}

export function compareToBaseline(
  currentIssues: AuditorIssue[],
  baselinePath: string,
): BaselineComparison | undefined {
  if (!fs.existsSync(baselinePath)) return undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as AuditorRunResult;
    const prev = new Set(
      (raw.issues ?? [])
        .filter((i) => i.releaseBlocking)
        .map((i) => `${i.caseId}|${i.fingerprint}|${i.screen}`),
    );
    const cur = new Set(
      currentIssues.filter((i) => i.releaseBlocking).map((i) => `${i.caseId}|${i.fingerprint}|${i.screen}`),
    );
    return {
      baselineRunId: raw.summary?.runId ?? null,
      newFailures: [...cur].filter((k) => !prev.has(k)),
      fixedFailures: [...prev].filter((k) => !cur.has(k)),
      repeatedFailures: [...cur].filter((k) => prev.has(k)),
      worsenedFailures: [],
    };
  } catch {
    return undefined;
  }
}

export async function runAuditor(options: AuditorRunOptions): Promise<AuditorRunResult> {
  const pack = resolvePack(options.pack);
  const runId = newRunId();
  const ranAt = new Date().toISOString();
  const pilotUserId = options.pilotUserId || PILOT_DEMO_USER_ID;

  const allIssues: AuditorIssue[] = [];
  const caseResults: CaseAuditResult[] = [];
  let totalSurfaces = 0;

  for (const manifest of pack.caseManifests) {
    const screens = collectCaseSurfaces(manifest, {
      userRole: options.userRole,
      pilotUserId,
    });
    totalSurfaces += screens.length;

    const issues = scoreCaseScreens(runId, pack.id, manifest, screens, {
      includeSynthetic: options.includeSynthetic,
      userRole: options.userRole,
    });
    allIssues.push(...issues);

    const blocking = issues.filter((i) => i.releaseBlocking);
    caseResults.push({
      caseId: manifest.caseId,
      caseTitle: manifest.caseTitle,
      profile: manifest.profile,
      screens,
      issues,
      pass: blocking.length === 0,
      failCount: blocking.filter((i) => i.status === "fail").length,
      weakCount: issues.filter((i) => i.status === "weak").length,
    });
  }

  const aggregateCourt = collectAggregateCourtToday(pack.caseManifests, options.userRole);
  totalSurfaces += 1;
  allIssues.push(...scoreAggregateCourtToday(runId, pack.id, aggregateCourt, options.userRole));

  const pilotUi = collectPilotUiSurface(pilotUserId, options.userRole);
  totalSurfaces += 1;
  allIssues.push(...scorePilotUi(runId, pack.id, pilotUi, options.userRole));

  const groups = groupFailuresByFingerprint(allIssues);
  const { failures, weak } = partitionIssues(allIssues);

  const summary: AuditorRunSummary = {
    runId,
    pack: pack.id,
    ranAt,
    userRole: options.userRole,
    pilotUserId,
    dataSource: "live-builder (stress battleboard through pilot filters); no browser/DOM",
    totalCases: pack.caseManifests.length,
    totalSurfaces,
    passCount: caseResults.filter((c) => c.pass).length,
    weakCount: weak.length,
    failCount: failures.length,
    criticalCount: allIssues.filter((i) => i.severity === "CRITICAL").length,
    highCount: allIssues.filter((i) => i.severity === "HIGH").length,
    mediumCount: allIssues.filter((i) => i.severity === "MEDIUM").length,
    lowCount: allIssues.filter((i) => i.severity === "LOW").length,
    demoBlockerCount: allIssues.filter((i) => i.demoBlocker).length,
    releaseGate: computeReleaseGate(
      allIssues.filter((i) => i.severity === "CRITICAL").length,
      allIssues.filter((i) => i.severity === "HIGH").length,
      allIssues.filter((i) => i.severity === "MEDIUM").length,
      allIssues.filter((i) => i.severity === "LOW").length,
    ),
    topFingerprints: topFingerprints(allIssues),
  };

  const baseline = options.baselinePath
    ? compareToBaseline(allIssues, options.baselinePath)
    : undefined;

  const result: AuditorRunResult = {
    summary,
    aggregate: aggregateCourt.payload,
    cases: caseResults,
    issues: allIssues,
    groups,
    baseline,
  };

  const outDir = options.outDir;
  fs.mkdirSync(outDir, { recursive: true });
  writeResultsJson(path.join(outDir, "results.json"), result);
  writeFailuresCsv(path.join(outDir, "failures.csv"), allIssues);
  writeWeakCsv(path.join(outDir, "weak.csv"), allIssues);
  writeGroupedFailuresMd(path.join(outDir, "grouped-failures.md"), groups);
  fs.writeFileSync(path.join(outDir, "fix-prompts-by-group.md"), generateFixPromptsByGroup(groups), "utf8");
  writeScoreboardMd(path.join(outDir, "scoreboard.md"), summary, groups, baseline);

  printConsoleSummary(summary, outDir, groups);
  return result;
}

export function shouldExitNonZero(
  summary: AuditorRunSummary,
  opts: Pick<AuditorRunOptions, "strict" | "failOnMedium">,
): boolean {
  if (summary.criticalCount > 0 || summary.highCount > 0) return true;
  if (opts.failOnMedium && summary.mediumCount > 0) return true;
  if (opts.strict && summary.releaseGate !== "GREEN") return true;
  return false;
}

export * from "./types";
export { resolvePack, listPackIds, AUDITOR_PACKS } from "./pack-registry";
export { PILOT_3_TRUTH_MANIFESTS, PILOT_DEMO_USER_ID } from "./truth-manifests";
