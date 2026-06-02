import fs from "node:fs";
import path from "node:path";
import { auditFamily40Case } from "./family-40-audit";
import { runDiscoveryCase } from "./discovery-mode";
import { resolvePack } from "./pack-registry";
import { attachCorrectFixToGroups } from "./correct-fix";
import { generateFixPromptsByGroup } from "./fix-ticket-generator";
import { groupFailuresByFingerprint, topFingerprints } from "./grouped-failures";
import { writeManifestReviewQueue } from "./manifest-review-queue";
import { writeTrainingDataJsonl } from "./training-data-export";
import { copyRunArtifactsToLatest, resolveArtifactDirs } from "./artifact-output";
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
  writeBaselineDiffMd,
  writeDemoBlockersMd,
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
  CaseTruthManifest,
  ReleaseGate,
} from "./types";

function newRunId(): string {
  return `auditor_${Date.now()}`;
}

export function computeReleaseGate(issues: AuditorIssue[]): ReleaseGate {
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

export function compareToBaseline(
  currentIssues: AuditorIssue[],
  baselinePath: string,
): BaselineComparison | undefined {
  if (!fs.existsSync(baselinePath)) return undefined;
  try {
    const raw = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as AuditorRunResult;
    const key = (i: AuditorIssue) => `${i.caseId}|${i.fingerprint}|${i.screen}`;
    const prevBlocking = new Set(
      (raw.issues ?? []).filter((i) => i.releaseBlocking && i.manifestConfirmed).map(key),
    );
    const curBlocking = new Set(
      currentIssues.filter((i) => i.releaseBlocking && i.manifestConfirmed).map(key),
    );
    const newFailures = [...curBlocking].filter((k) => !prevBlocking.has(k));
    const fixedFailures = [...prevBlocking].filter((k) => !curBlocking.has(k));
    const repeatedFailures = [...curBlocking].filter((k) => prevBlocking.has(k));
    return {
      baselineRunId: raw.summary?.runId ?? null,
      newFailures,
      fixedFailures,
      repeatedFailures,
      worsenedFailures: [],
      improvedFailures: fixedFailures,
    };
  } catch {
    return undefined;
  }
}

function filterManifests(
  manifests: CaseTruthManifest[],
  opts: AuditorRunOptions,
): CaseTruthManifest[] {
  let list = manifests;
  if (opts.familyFilter) {
    list = list.filter((m) => m.auditorFamily === opts.familyFilter);
  }
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? list.length;
  return list.slice(offset, offset + limit);
}

function auditPilot3Case(
  runId: string,
  manifest: CaseTruthManifest,
  opts: AuditorRunOptions,
) {
  const screens = collectCaseSurfaces(manifest, {
    userRole: opts.userRole,
    pilotUserId: opts.pilotUserId,
  });
  const issues = scoreCaseScreens(runId, "pilot-3", manifest, screens, {
    includeSynthetic: opts.includeSynthetic,
    userRole: opts.userRole,
  });
  return { screens, issues };
}

function buildSummary(
  runId: string,
  packId: import("./types").AuditorPackId,
  mode: import("./types").AuditorMode,
  opts: AuditorRunOptions,
  allIssues: AuditorIssue[],
  caseResults: CaseAuditResult[],
  totalSurfaces: number,
  dataSource: string,
): AuditorRunSummary {
  const { failures, weak } = partitionIssues(allIssues);
  const confirmedBlocking = allIssues.filter((i) => i.releaseBlocking && i.manifestConfirmed);
  return {
    runId,
    pack: packId,
    mode,
    ranAt: new Date().toISOString(),
    userRole: opts.userRole,
    pilotUserId: opts.pilotUserId,
    dataSource,
    totalCases: caseResults.length,
    totalSurfaces,
    confirmedCases: caseResults.filter((c) => c.manifestCertainty === "confirmed").length,
    uncertainCases: caseResults.filter((c) => c.manifestCertainty === "uncertain").length,
    passCount: caseResults.filter((c) => c.pass).length,
    weakCount: weak.length,
    failCount: failures.length,
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
    topFingerprints: topFingerprints(allIssues),
  };
}

export async function runAuditor(options: AuditorRunOptions): Promise<AuditorRunResult> {
  const pack = resolvePack(options.pack, options.mode);
  const runId = newRunId();
  const pilotUserId = options.pilotUserId || PILOT_DEMO_USER_ID;
  const manifests = filterManifests(pack.caseManifests, options);

  const allIssues: AuditorIssue[] = [];
  const caseResults: CaseAuditResult[] = [];
  let totalSurfaces = 0;

  const collectorOpts = { userRole: options.userRole, pilotUserId };

  for (const manifest of manifests) {
    let screens;
    let issues: AuditorIssue[];

    if (options.pack === "pilot-3") {
      ({ screens, issues } = auditPilot3Case(runId, manifest, { ...options, pilotUserId }));
    } else if (options.pack === "family-40") {
      const result = auditFamily40Case(runId, "family-40", manifest as import("./types").Family40CaseManifest, {
        includeSynthetic: options.includeSynthetic,
        userRole: options.userRole,
        pilotUserId,
      });
      screens = result.screens;
      issues = result.issues;
    } else if (options.pack === "full-960" && options.mode === "discovery") {
      ({ screens, issues } = runDiscoveryCase(runId, "full-960", manifest, collectorOpts));
    } else {
      throw new Error(`Unsupported pack/mode: ${options.pack} / ${options.mode}`);
    }

    totalSurfaces += screens.length;
    allIssues.push(...issues);

    const blocking = issues.filter((i) => i.releaseBlocking && i.manifestConfirmed);
    caseResults.push({
      caseId: manifest.caseId,
      caseTitle: manifest.caseTitle,
      profile: manifest.profile,
      auditorFamily: manifest.auditorFamily,
      manifestCertainty: manifest.manifestCertainty,
      sourceRef: manifest.sourceRef,
      screens,
      issues,
      pass:
        manifest.manifestCertainty !== "uncertain" &&
        blocking.length === 0 &&
        !issues.some((i) => i.fingerprint === "ui.surface_not_collected" && i.releaseBlocking),
      failCount: blocking.filter((i) => i.status === "fail").length,
      weakCount: issues.filter((i) => i.status === "weak").length,
    });
  }

  let aggregate: Record<string, unknown> = {};
  if (options.pack === "pilot-3") {
    const aggregateCourt = collectAggregateCourtToday(pack.caseManifests, options.userRole);
    totalSurfaces += 1;
    allIssues.push(...scoreAggregateCourtToday(runId, pack.id, aggregateCourt, options.userRole));
    aggregate = aggregateCourt.payload;

    const pilotUi = collectPilotUiSurface(pilotUserId, options.userRole);
    totalSurfaces += 1;
    allIssues.push(...scorePilotUi(runId, pack.id, pilotUi, options.userRole));
  }

  let groups = groupFailuresByFingerprint(allIssues);
  groups = attachCorrectFixToGroups(groups, { pack: options.pack, cases: caseResults });
  const dataSource =
    options.pack === "full-960"
      ? `discovery scan (family-40 catalog corpus, limit=${options.limit ?? "all"})`
      : options.pack === "family-40"
        ? "live-builder + family-40 truth manifests (confirmed + uncertain scaffold)"
        : "live-builder (stress battleboard through pilot filters); no browser/DOM";

  const summary = buildSummary(
    runId,
    pack.id,
    options.mode,
    { ...options, pilotUserId },
    allIssues,
    caseResults,
    totalSurfaces,
    dataSource,
  );

  const baseline = options.baselinePath
    ? compareToBaseline(allIssues, options.baselinePath)
    : undefined;

  const result: AuditorRunResult = {
    summary,
    aggregate,
    cases: caseResults,
    issues: allIssues,
    groups,
    baseline,
  };

  const artifactRoot = options.outDir;
  const { runDir, latestDir, latestSlug } = resolveArtifactDirs(
    artifactRoot,
    runId,
    pack.id,
    options.mode,
  );
  fs.mkdirSync(runDir, { recursive: true });

  const writtenFiles: string[] = [];

  const writeArtifact = (fileName: string, writeFn: (filePath: string) => void) => {
    writeFn(path.join(runDir, fileName));
    writtenFiles.push(fileName);
  };

  writeArtifact("results.json", (p) => writeResultsJson(p, result));
  writeArtifact("failures.csv", (p) => writeFailuresCsv(p, allIssues));
  writeArtifact("weak.csv", (p) => writeWeakCsv(p, allIssues));
  writeArtifact("grouped-failures.md", (p) => writeGroupedFailuresMd(p, groups));
  writeArtifact("fix-prompts-by-group.md", (p) =>
    fs.writeFileSync(p, generateFixPromptsByGroup(groups), "utf8"),
  );
  writeArtifact("scoreboard.md", (p) => writeScoreboardMd(p, summary, groups, baseline));
  writeArtifact("demo-blockers.md", (p) => writeDemoBlockersMd(p, allIssues));
  if (baseline) {
    writeArtifact("baseline-diff.md", (p) => writeBaselineDiffMd(p, baseline));
  }

  if (options.pack === "family-40") {
    const n = writeManifestReviewQueue(runDir);
    writtenFiles.push("manifest-review-queue.md", "manifest-review-queue.json");
    console.log(
      `Manifest review queue: ${n} uncertain case(s) → ${path.join(runDir, "manifest-review-queue.md")}`,
    );
  }

  if (options.exportTrainingData) {
    const n = writeTrainingDataJsonl(runDir, result);
    writtenFiles.push("training-data.jsonl");
    console.log(
      `Training-data export: ${n} row(s) → ${path.join(runDir, "training-data.jsonl")} (approvedForTraining defaults false)`,
    );
  }

  copyRunArtifactsToLatest(runDir, latestDir, writtenFiles);

  printConsoleSummary(summary, runDir, latestDir, latestSlug, groups);
  return result;
}

export function shouldExitNonZero(
  summary: AuditorRunSummary,
  opts: Pick<AuditorRunOptions, "strict" | "failOnMedium">,
): boolean {
  if (summary.confirmedHighCount > 0) return true;
  if (opts.failOnMedium && summary.mediumCount > 0) return true;
  if (opts.strict && summary.releaseGate === "RED") return true;
  return false;
}

export * from "./types";
export { resolvePack, listPackIds, AUDITOR_PACKS } from "./pack-registry";
export { PILOT_3_TRUTH_MANIFESTS, PILOT_DEMO_USER_ID } from "./truth-manifests";
export { FAMILY_40_CATALOG, listFamily40ByFamily, countFamily40Certainty } from "./family-40-catalog";
export { buildFamily40Manifest, buildAllFamily40Manifests } from "./family-40-manifests";
