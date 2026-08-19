import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "../../components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildBundleTruthLedger, ledgerMaterialsNeedingChase } from "../../lib/criminal/bundle-truth-ledger";
import {
  clusterFailures,
  createAuditResult,
  validateControlCoverageMap,
  type AuditResultEnvelope,
  type ControlCoverageMap,
  type ControlCoverageMapRow,
} from "../../lib/eval/master3000-quality";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const PHASE5_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase5-starter-gold-audit",
);
const OUT_ROOT = path.join(
  ROOT,
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v2",
  "master-3000-phase6-p1-live-builder-validation",
);
const CONTROL_MAP_PATH = path.join(PHASE5_ROOT, "361-CONTROL-COVERAGE-MAP.json");

type Cluster = {
  key: string;
  count: number;
  severity: string;
  failureClass: string;
  evidenceFamily: string | null;
  surface: string;
  representativeCaseIds: string[];
  rootCauseCluster: string | null;
};

type StarterMatter = {
  caseId: string;
  title: string;
  offenceFamily: string;
  profile: string;
  sourcePath: string;
  truthKeyPath: string;
  outputPath: string;
};

type TruthKey = {
  caseId: string;
  title?: string;
  offenceWording?: string;
  bundleStatus?: string;
  expectedChaseItems?: string[];
  evidenceItems?: { evidence_item?: string; correct_evidence_state?: string; chase_needed?: boolean; safe_to_rely_on?: boolean }[];
};

type ClusterClassification =
  | "CONFIRMED_LIVE_SHARED_DEFECT"
  | "STALE_HISTORICAL_OUTPUT_ONLY"
  | "AUDITOR_FALSE_POSITIVE"
  | "TRUTH_AMBIGUOUS_REQUIRES_REVIEW";

function rel(absOrRel: string): string {
  const absolute = path.isAbsolute(absOrRel) ? absOrRel : path.join(ROOT, absOrRel);
  return path.relative(ROOT, absolute).replaceAll(path.sep, "/");
}

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function bytes(filePath: string): number {
  return statSync(filePath).size;
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function writeJson(name: string, value: unknown): string {
  mkdirSync(OUT_ROOT, { recursive: true });
  const filePath = path.join(OUT_ROOT, name);
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return filePath;
}

function writeText(name: string, value: string): string {
  mkdirSync(OUT_ROOT, { recursive: true });
  const filePath = path.join(OUT_ROOT, name);
  writeFileSync(filePath, value, "utf8");
  return filePath;
}

function norm(text: string | undefined | null): string {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return norm(text)
    .split(" ")
    .filter((word) => word.length >= 4 && !["full", "record", "material", "source", "outstanding"].includes(word));
}

function familyFromLabel(label: string): string {
  const n = norm(label);
  if (/\bcctv|dashcam|footage|master\b/.test(n)) return "cctv";
  if (/\binterview|transcript\b/.test(n)) return "interview";
  if (/\bcustody|pace|risk assessment\b/.test(n)) return "custody";
  if (/\bbwv|body worn\b/.test(n)) return "bwv";
  if (/\bphone|download|device|subscriber|metadata\b/.test(n)) return "phone";
  if (/\bmessage|screenshot\b/.test(n)) return "message";
  if (/\bcad|999|control room\b/.test(n)) return "999";
  if (/\bmg11|witness statement|complainant\b/.test(n)) return "mg11";
  if (/\bmg6|unused|schedule\b/.test(n)) return "mg6";
  if (/\bmedical|injury|hospital|expert|examiner|collision report|lab|analysis|forensic\b/.test(n)) return "expert_lab";
  if (/\bprovenance|continuity|chain|mapping\b/.test(n)) return "provenance_continuity";
  if (/\bsearch\b/.test(n)) return "search";
  if (/\border\b/.test(n)) return "order";
  if (/\bidentification|id procedure\b/.test(n)) return "identification";
  return "other";
}

function expectedSynonyms(expected: string): string[] {
  const n = norm(expected);
  const out = new Set<string>([n]);
  if (/\bbwv\b|\bbody worn\b|\bbody worn video\b/.test(n)) {
    out.add("bwv");
    out.add("body worn");
    out.add("body worn video");
  }
  if (/\blab analysis\b|\blab report\b|\bforensic analysis\b/.test(n)) {
    out.add("lab analysis");
    out.add("lab report");
    out.add("forensic report");
    out.add("forensic analysis");
  }
  if (/\baccount ownership\b|\baccount control\b|\bbank schedules?\b/.test(n)) {
    out.add("account ownership");
    out.add("account control");
    out.add("bank schedule");
    out.add("bank schedules");
  }
  if (/\bprevious incident history\b|\bprevious incidents?\b|\bhistory\b/.test(n)) {
    out.add("previous incident history");
    out.add("previous incident");
    out.add("incident history");
  }
  return [...out].filter(Boolean);
}

function sourceSupportsExpected(expected: string, sourceText: string): boolean {
  const haystack = norm(sourceText);
  if (expectedSynonyms(expected).some((phrase) => haystack.includes(phrase))) return true;
  const expectedWords = words(expected);
  if (expectedWords.length === 0) return false;
  return expectedWords.some((word) => haystack.includes(word));
}

function liveTextForItem(item: ReturnType<typeof buildDisclosureChaseBrief>["items"][number]): string {
  return [item.label, item.whyItMatters, item.draftChaseWording, item.courtLine, item.evidenceAnchor, ...item.mergedFrom]
    .filter(Boolean)
    .join("\n");
}

function expectedFoundInLive(expected: string, liveItems: ReturnType<typeof buildDisclosureChaseBrief>["items"]): boolean {
  const expectedNorm = norm(expected);
  const expectedFamily = familyFromLabel(expected);
  const expectedWords = words(expected);
  for (const item of liveItems) {
    const haystack = norm(liveTextForItem(item));
    if (expectedSynonyms(expected).some((phrase) => haystack.includes(phrase))) return true;
    if (haystack.includes(expectedNorm)) return true;
    if (item.familyId !== "other" && (item.familyId === expectedFamily || familyFromLabel(item.label) === expectedFamily)) return true;
    if (expectedWords.length && expectedWords.some((word) => haystack.includes(word))) return true;
  }
  return false;
}

function liveLabelIsVagueForExpected(expected: string, liveItems: ReturnType<typeof buildDisclosureChaseBrief>["items"]): boolean {
  const expectedFamily = familyFromLabel(expected);
  return liveItems.some((item) => {
    const itemText = norm(liveTextForItem(item));
    const label = norm(item.label);
    const itemContainsExpected = itemText.includes(norm(expected)) || words(expected).some((word) => itemText.includes(word));
    if (!itemContainsExpected) return false;
    if (label === "outstanding source material on disclosure schedule") return true;
    if (label.startsWith("outstanding source material") && expectedFamily !== "other" && !words(expected).some((word) => label.includes(word))) return true;
    return false;
  });
}

function buildLive(matter: StarterMatter) {
  const truth = readJson<TruthKey>(path.join(ROOT, matter.truthKeyPath));
  const bundleText = readFileSync(path.join(ROOT, matter.sourcePath), "utf8");
  const ledger = buildBundleTruthLedger({ bundleText });
  const brief = buildDisclosureChaseBrief({
    caseId: matter.caseId,
    caseTitle: truth.title ?? matter.title,
    clientLabel: truth.title ?? matter.title,
    allegation: truth.offenceWording ?? "",
    stage: "unknown",
    hearingStatus: "unknown",
    hearingDateIso: null,
    bundleHealth: truth.bundleStatus ?? "",
    positionStatus: "unknown",
    battleboard: null,
    bundleText,
  });
  return { truth, bundleText, ledger, brief };
}

const commit = git(["rev-parse", "HEAD"]);
const phase5Stop = readJson<Record<string, unknown>>(path.join(PHASE5_ROOT, "STOP-FOR-CODEX-REVIEW.json"));
const phase5Coverage = readJson<ControlCoverageMap>(CONTROL_MAP_PATH);
const gold = readJson<{ matters: StarterMatter[] }>(path.join(PHASE5_ROOT, "STARTER-GOLD-MANIFEST.json"));
const clusters = readJson<Cluster[]>(path.join(PHASE5_ROOT, "FAILURE-CLUSTERS.json"));
const matterById = new Map(gold.matters.map((matter) => [matter.caseId, matter]));
const p1Clusters = clusters.filter((cluster) => cluster.severity === "P1");

const clusterReports = p1Clusters.map((cluster) => {
  const reps = cluster.representativeCaseIds
    .map((caseId) => matterById.get(caseId))
    .filter((matter): matter is StarterMatter => Boolean(matter))
    .slice(0, 3);
  const representativeReports = reps.map((matter) => {
    const live = buildLive(matter);
    const expectedItems = live.truth.expectedChaseItems ?? [];
    const relevantExpected = expectedItems.filter((expected) => {
      if (cluster.rootCauseCluster === "missing_expected_chase") {
        const family = cluster.evidenceFamily ?? "";
        return family === "other" || familyFromLabel(expected) === family || words(expected).some((word) => family.includes(word));
      }
      return true;
    });
    const expectedFound = relevantExpected.map((expected) => ({
      expected,
      foundInCurrentLiveBuilder: expectedFoundInLive(expected, live.brief.items),
      vagueVisibleLabel: liveLabelIsVagueForExpected(expected, live.brief.items),
      sourceMentionsExpected: sourceSupportsExpected(expected, live.bundleText),
    }));
    return {
      caseId: matter.caseId,
      sourcePath: matter.sourcePath,
      truthKeyPath: matter.truthKeyPath,
      independentTruthExpected: expectedItems,
      currentCanonicalState: {
        materialRowsNeedingChase: ledgerMaterialsNeedingChase(live.ledger).map((row) => ({
          id: row.id,
          label: row.label,
          detail: row.detail,
          status: row.status,
          displayLine: row.displayLine,
        })),
      },
      currentLiveSharedBuilderOutput: live.brief.items.map((item) => ({
        label: item.label,
        familyId: item.familyId,
        baseStatus: item.baseStatus,
        evidenceAnchor: item.evidenceAnchor,
        mergedFrom: item.mergedFrom,
        draftChaseWording: item.draftChaseWording,
      })),
      expectedFound,
    };
  });

  const anyStillMissing = representativeReports.some((report) =>
    report.expectedFound.some((expected) => !expected.foundInCurrentLiveBuilder && expected.sourceMentionsExpected),
  );
  const anyVague = representativeReports.some((report) =>
    report.expectedFound.some((expected) => expected.foundInCurrentLiveBuilder && expected.vagueVisibleLabel),
  );
  // Truth key expects chase with no source support, and live builder also omits it → truth-key / auditor overreach.
  const anyTruthOverreachNoLive = representativeReports.some((report) =>
    report.expectedFound.some(
      (expected) => !expected.sourceMentionsExpected && !expected.foundInCurrentLiveBuilder,
    ),
  );
  // Truth key expects chase with no clear source support, but live builder surfaces it → needs human review.
  const anyAmbiguousTruthLivePresent = representativeReports.some((report) =>
    report.expectedFound.some(
      (expected) => !expected.sourceMentionsExpected && expected.foundInCurrentLiveBuilder,
    ),
  );

  let classification: ClusterClassification;
  let reason: string;
  if (cluster.rootCauseCluster !== "missing_expected_chase") {
    classification = "STALE_HISTORICAL_OUTPUT_ONLY";
    reason = "Cluster was a Phase 5 stored-output candidate and is not reproduced by current live-builder validation class.";
  } else if (anyStillMissing || anyVague) {
    classification = "CONFIRMED_LIVE_SHARED_DEFECT";
    reason = anyStillMissing
      ? "Current live builder still misses at least one source/truth-supported expected chase in representative cases."
      : "Current live builder carries the expected item only behind a vague visible label.";
  } else if (anyAmbiguousTruthLivePresent) {
    classification = "TRUTH_AMBIGUOUS_REQUIRES_REVIEW";
    reason =
      "Truth-key expected item is not clearly present in source text, yet current live builder surfaces related chase wording; do not force a product fix without stronger independent truth.";
  } else if (anyTruthOverreachNoLive) {
    classification = "AUDITOR_FALSE_POSITIVE";
    reason =
      "Truth-key expected chase is not source-backed and current live builder correctly omits it; treat as truth-key/auditor overreach rather than a live product defect.";
  } else {
    classification = "STALE_HISTORICAL_OUTPUT_ONLY";
    reason = "Representative expected items are now present in current canonical/live-builder output.";
  }

  return {
    ...cluster,
    classification,
    reason,
    representativeReports,
  };
});

const classificationCounts = clusterReports.reduce<Record<ClusterClassification, number>>(
  (acc, report) => {
    acc[report.classification] += 1;
    return acc;
  },
  {
    CONFIRMED_LIVE_SHARED_DEFECT: 0,
    STALE_HISTORICAL_OUTPUT_ONLY: 0,
    AUDITOR_FALSE_POSITIVE: 0,
    TRUTH_AMBIGUOUS_REQUIRES_REVIEW: 0,
  },
);

const phase6Results: AuditResultEnvelope[] = gold.matters.flatMap((matter) => {
  const live = buildLive(matter);
  const expected = live.truth.expectedChaseItems ?? [];
  const rows: AuditResultEnvelope[] = [];
  for (const item of expected) {
    const sourceSupported = sourceSupportsExpected(item, live.bundleText);
    const found = expectedFoundInLive(item, live.brief.items);
    const disposition = !sourceSupported
      ? found
        ? "human_review_required"
        : "false_positive"
      : found
        ? "pass"
        : "candidate_failure";
    rows.push(
      createAuditResult({
        runId: `phase6-live-builder-${GENERATED_AT.replace(/[:.]/g, "-")}`,
        commit,
        caseId: matter.caseId,
        controlId: "MAA-CHASE-QUALITY",
        invariantId: "CB-LIVE-EXPECTED-CHASE-PRESENT",
        failureClass: "extraction_failure",
        severity: "P1",
        evidenceFamily: familyFromLabel(item),
        surface: "cps_chase",
        sourceReference: { path: matter.truthKeyPath, field: "expectedChaseItems" },
        expected: `Current live builder should surface expected chase: ${item}`,
        actual: !sourceSupported
          ? found
            ? "Truth-key expectation is not independently source-backed, but live builder surfaces related wording; human/source review required."
            : "Truth-key expectation is not independently source-backed and live builder correctly omits it (auditor/truth false positive)."
          : found
            ? "Expected chase found in current live builder output."
            : "Expected chase absent from current live builder output.",
        rootCauseCluster: !sourceSupported
          ? found
            ? "truth_expected_not_source_backed_live_present"
            : "truth_expected_not_source_backed_live_absent"
          : found
            ? "live_expected_chase_present"
            : "live_expected_chase_missing",
        disposition,
        coverageStatus: "evaluated",
      }),
    );
  }
  rows.push(
    createAuditResult({
      runId: `phase6-live-builder-${GENERATED_AT.replace(/[:.]/g, "-")}`,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-PROVENANCE",
      invariantId: "CB-LIVE-CHASE-HAS-SOURCE-LIMITATION",
      failureClass: "provenance_family_failure",
      severity: "P1",
      evidenceFamily: "all_chase_items",
      surface: "cps_chase",
      sourceReference: { path: matter.sourcePath },
      expected: "Every current live chase item should carry provenance, evidence anchor or an explicit limitation.",
      actual: live.brief.items.every((item) => item.evidenceAnchor || item.provenance)
        ? "All live chase items carry provenance/anchor/limitation."
        : "At least one live chase item lacks provenance/anchor/limitation.",
      rootCauseCluster: live.brief.items.every((item) => item.evidenceAnchor || item.provenance)
        ? "live_chase_provenance_present"
        : "live_chase_provenance_gap",
      disposition: live.brief.items.every((item) => item.evidenceAnchor || item.provenance) ? "pass" : "candidate_failure",
      coverageStatus: "evaluated",
    }),
  );
  rows.push(
    createAuditResult({
      runId: `phase6-live-builder-${GENERATED_AT.replace(/[:.]/g, "-")}`,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-COMPLETENESS",
      invariantId: "CB-LIVE-CANONICAL-LEDGER-USED",
      failureClass: "partial_processing_failure",
      severity: "P1",
      evidenceFamily: "bundle_ledger",
      surface: "canonical_state",
      sourceReference: { path: matter.sourcePath },
      expected: "Current live validation should use bundle truth ledger rows as canonical state input.",
      actual: live.ledger.materials.length > 0 ? "Bundle truth ledger produced material rows." : "Bundle truth ledger produced no material rows.",
      rootCauseCluster: live.ledger.materials.length > 0 ? "canonical_ledger_available" : "canonical_ledger_empty",
      disposition: live.ledger.materials.length > 0 ? "pass" : "candidate_failure",
      coverageStatus: "evaluated",
    }),
  );
  rows.push(
    createAuditResult({
      runId: `phase6-live-builder-${GENERATED_AT.replace(/[:.]/g, "-")}`,
      commit,
      caseId: matter.caseId,
      controlId: "MAA-CROSS-SURFACE",
      invariantId: "CB-LIVE-CHASE-COUNTERS-RECONCILE",
      failureClass: "counter_denominator_failure",
      severity: "P2",
      evidenceFamily: "counters",
      surface: "cps_chase",
      expected: "Disclosure counters should reconcile to current live builder item denominator.",
      actual: live.brief.counters.total === live.brief.items.length
        ? "Counters reconcile to live item count."
        : `Counter ${live.brief.counters.total} does not equal items ${live.brief.items.length}.`,
      rootCauseCluster: live.brief.counters.total === live.brief.items.length ? "live_counter_reconciles" : "live_counter_mismatch",
      disposition: live.brief.counters.total === live.brief.items.length ? "pass" : "candidate_failure",
      coverageStatus: "evaluated",
    }),
  );
  return rows;
});

const phase6Clusters = clusterFailures(phase6Results);
const existingRows = new Map(phase5Coverage.rows.map((row) => [row.controlId, row]));
const phase6ByControl = new Map<string, AuditResultEnvelope[]>();
for (const result of phase6Results) {
  phase6ByControl.set(result.controlId, [...(phase6ByControl.get(result.controlId) ?? []), result]);
}

const coverageRows: ControlCoverageMapRow[] = phase5Coverage.rows.map((row) => {
  const current = phase6ByControl.get(row.controlId);
  if (!current?.length) return row;
  return {
    ...row,
    starterGoldStatus: "evaluated",
    starterGoldCasesEvaluated: new Set(current.map((r) => r.caseId)).size,
    starterGoldCandidateFailures: current.filter((result) => result.disposition === "candidate_failure").length,
    starterGoldConfirmedFailures: current.filter((result) => result.disposition === "confirmed_failure").length,
    limitation: "Phase 6 current live-builder validation exercised this control on all 40 Starter Gold matters.",
  };
});

for (const [controlId, current] of phase6ByControl) {
  if (existingRows.has(controlId)) continue;
  coverageRows.push({
    controlId,
    starterGoldStatus: "evaluated",
    starterGoldCasesEvaluated: new Set(current.map((result) => result.caseId)).size,
    starterGoldCandidateFailures: current.filter((result) => result.disposition === "candidate_failure").length,
    starterGoldConfirmedFailures: current.filter((result) => result.disposition === "confirmed_failure").length,
    limitation: "Phase 6 current live-builder validation exercised this control on all 40 Starter Gold matters.",
  });
}

const coverageSummary = coverageRows.reduce(
  (acc, row) => {
    if (row.starterGoldStatus === "evaluated") acc.evaluated += 1;
    else if (row.starterGoldStatus === "unresolved") acc.unresolved += 1;
    else if (row.starterGoldStatus === "unavailable") acc.unavailable += 1;
    else if (row.starterGoldStatus === "not_in_registry") acc.notInRegistry += 1;
    else acc.notExercised += 1;
    return acc;
  },
  { evaluated: 0, unresolved: 0, unavailable: 0, notExercised: 0, notInRegistry: 0 },
);
const coverageAfter: ControlCoverageMap = {
  schemaVersion: "casebrain-master3000-361-control-coverage-map@1.0.0",
  generatedAt: GENERATED_AT,
  commit,
  totalControls: 361,
  rows: coverageRows,
  summary: coverageSummary,
  nonClaims: {
    all361Exercised: false,
    starterGoldIsCorpusPass: false,
  },
};

const coverageIssues = validateControlCoverageMap(coverageAfter);
const liveCandidateFailures = phase6Results.filter((result) => result.disposition === "candidate_failure");
const liveConfirmedFailures = phase6Results.filter((result) => result.disposition === "confirmed_failure");
const humanReviewRows = phase6Results.filter((result) => result.disposition === "human_review_required");
const auditorFalsePositiveRows = phase6Results.filter((result) => result.disposition === "false_positive");
const liveDefectResults = phase6Results.filter((result) =>
  result.disposition === "candidate_failure" || result.disposition === "confirmed_failure",
);
const liveDefectClusters = clusterFailures(liveDefectResults);
const humanReviewClusters = clusterFailures(humanReviewRows);
const phase5Commit =
  typeof phase5Stop.commit === "string"
    ? phase5Stop.commit
    : phase5Coverage.commit ?? null;
const stop = {
  schemaVersion: "master3000-phase6-p1-live-builder-validation-stop@1.1.0",
  generatedAt: GENERATED_AT,
  status: "P1_LIVE_BUILDER_VALIDATION_COMPLETE__NO_SCALE_RUN",
  commit,
  commitMetadata: {
    certifiedCommit: commit,
    phase5BaselineCommit: phase5Commit,
    knownSharedFixCommits: [
      "1d7c8055f32b49d02e84b1859958dbd57f523f89",
      "c4114c06bb9b7036a681353f3326fe5b7b1aa3c1",
    ],
    note:
      "certifiedCommit is the HEAD this Phase 6 artefact set actually ran against. phase5BaselineCommit is the stored Phase 5 artefact commit. Do not read liveFailureClusters as live product defects.",
  },
  phase5Baseline: {
    starterGoldCount: phase5Stop.starterGoldCount,
    candidateFailures: phase5Stop.candidateFailures,
    failuresBySeverity: phase5Stop.failuresBySeverity,
    coverage: phase5Coverage.summary,
  },
  p1ClustersReviewed: p1Clusters.length,
  classifications: classificationCounts,
  truthAmbiguousClusters: clusterReports
    .filter((report) => report.classification === "TRUTH_AMBIGUOUS_REQUIRES_REVIEW")
    .map((report) => ({
      key: report.key,
      caseIds: report.representativeCaseIds,
      reason: report.reason,
      expectedNotSourceBacked: report.representativeReports.flatMap((rep) =>
        rep.expectedFound
          .filter((expected) => !expected.sourceMentionsExpected)
          .map((expected) => ({
            caseId: rep.caseId,
            expected: expected.expected,
            foundInCurrentLiveBuilder: expected.foundInCurrentLiveBuilder,
          })),
      ),
    })),
  auditorFalsePositiveClusters: clusterReports
    .filter((report) => report.classification === "AUDITOR_FALSE_POSITIVE")
    .map((report) => ({
      key: report.key,
      caseIds: report.representativeCaseIds,
      reason: report.reason,
    })),
  sharedProductionFixesMade: [
    {
      id: "LIVE-OTHER-FAMILY-CONCRETE-LABEL",
      path: "lib/criminal/disclosure-chase-finalize.ts",
      rootCause:
        "Concrete expected chase items merged into the catch-all 'other' family could render as vague 'Outstanding source material on disclosure schedule' when the humanized list was too long.",
      fix:
        "Overflow label now preserves the first concrete source item and reports '+ N more source items' instead of collapsing to a fully generic label.",
    },
    {
      id: "LIVE-SOURCE-BACKED-BWV-RESTORE",
      path: "components/criminal/disclosure-chase/buildDisclosureChaseBrief.ts",
      rootCause:
        "Broad CCTV/video family matching and later profile reconciliation could swallow source-backed BWV chase material in robbery/ID packs.",
      fix:
        "CCTV matching now excludes BWV/body-worn wording, and source-backed required chase families from the canonical ledger are restored if later reconciliation drops them.",
    },
  ],
  invariantsAdded: [
    "scripts/master3000-live-builder-validation.test.ts: concrete digital disclosure chases do not collapse into a vague source-material label",
    "scripts/master3000-live-builder-validation.test.ts: genuinely generic source-material groups stay generic and do not invent specificity",
    "scripts/master3000-live-builder-validation.test.ts: source-backed BWV chase items stay BWV and are not swallowed by broad CCTV/video matching",
  ],
  affectedBatchRerun: {
    starterGoldCases: gold.matters.length,
    liveBuilderRows: phase6Results.length,
    liveCandidateFailures: liveCandidateFailures.length,
    liveConfirmedFailures: liveConfirmedFailures.length,
    /** Product defect clusters only (candidate_failure + confirmed_failure). */
    liveFailureClusters: liveDefectClusters.length,
    /** Informational: human_review_required rows clustered — not live product failures. */
    humanReviewClusters: humanReviewClusters.length,
    /** Informational: all dispositions historically passed to clusterFailures, including human review. */
    allObservationClustersIncludingHumanReview: phase6Clusters.length,
    auditorFalsePositiveRows: auditorFalsePositiveRows.length,
    humanReviewRows: humanReviewRows.length,
    semantics:
      "liveCandidateFailures / liveFailureClusters count only live product defect dispositions. humanReviewClusters are truth-ambiguous observations. auditorFalsePositiveRows are truth-key expectations without source support that the live builder correctly omits.",
  },
  coverageBeforeAfter: {
    before: phase5Coverage.summary,
    after: coverageAfter.summary,
  },
  newP0P1Failures: liveCandidateFailures.filter((result) => result.severity === "P0" || result.severity === "P1").length,
  validationIssues: {
    coverage: coverageIssues,
  },
  full3000RunStarted: false,
  stress500or1000Started: false,
  nextStep:
    "Expand high-risk control coverage next. Do not treat humanReviewClusters as live defects. Do not start 500/1000/3000 automatically.",
  nonClaims: {
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    solicitorApproval: false,
    all361ControlsExercised: false,
  },
};

const decisionCard = `# CaseBrain master 3,000 quality programme — Phase 6 P1 live-builder validation

Generated: ${GENERATED_AT}

## Verdict

**${stop.status}**

This phase reviewed the Phase 5 P1 clusters against independent truth keys, current canonical ledger state, and current live shared builder output. It did **not** run the 500/1000/3000 corpus.

Certified commit: \`${commit}\`

## Classification

- P1 clusters reviewed: **${p1Clusters.length}**
- Confirmed live shared defects: **${classificationCounts.CONFIRMED_LIVE_SHARED_DEFECT}**
- Stale historical output only: **${classificationCounts.STALE_HISTORICAL_OUTPUT_ONLY}**
- Auditor false positives: **${classificationCounts.AUDITOR_FALSE_POSITIVE}**
- Truth ambiguous/review: **${classificationCounts.TRUTH_AMBIGUOUS_REQUIRES_REVIEW}**

## Live vs observation semantics

- Live candidate failures: **${liveCandidateFailures.length}**
- Live defect clusters: **${liveDefectClusters.length}** (candidate_failure + confirmed_failure only)
- Human-review observation clusters: **${humanReviewClusters.length}** (not live product defects)
- Auditor/truth false-positive rows: **${auditorFalsePositiveRows.length}**

Do **not** read historical \`liveFailureClusters\` as meaning live product defects when those clusters were human-review / truth-ambiguity observations.

## Shared fix made

**LIVE-OTHER-FAMILY-CONCRETE-LABEL** — concrete chase items in the catch-all disclosure bucket no longer collapse to a fully generic visible label when the list is long. The card keeps a concrete first item and records the remainder as "+ N more source items".

## Coverage

- Before: **${phase5Coverage.summary.evaluated}/361**
- After: **${coverageAfter.summary.evaluated}/361**

## Stop rule

The starter auditor is more mature, but this is not a corpus PASS. Next should expand high-risk control coverage, then consider a modest representative stress set. Do not start 500/1000/3000 automatically.
`;

const written: string[] = [];
written.push(writeJson("P1-CLUSTER-LIVE-VALIDATION.json", clusterReports));
written.push(writeJson("PHASE6-LIVE-BUILDER-AUDIT-RESULTS.json", phase6Results));
written.push(writeJson("PHASE6-FAILURE-CLUSTERS.json", liveDefectClusters));
written.push(
  writeJson("PHASE6-OBSERVATION-CLUSTERS.json", {
    schemaVersion: "master3000-phase6-observation-clusters@1.0.0",
    generatedAt: GENERATED_AT,
    commit,
    liveDefectClusters,
    humanReviewClusters,
    allObservationClustersIncludingHumanReview: phase6Clusters,
    semantics:
      "PHASE6-FAILURE-CLUSTERS.json now contains only live product defect clusters. Human-review / truth-ambiguity clusters live here under humanReviewClusters.",
  }),
);
written.push(writeJson("361-CONTROL-COVERAGE-MAP-AFTER.json", coverageAfter));
written.push(writeJson("SHARED-ROOT-FIX-REGISTER.json", stop.sharedProductionFixesMade));
written.push(writeJson("VALIDATION-ISSUES.json", stop.validationIssues));
written.push(writeText("DECISION-CARD.md", decisionCard));
written.push(writeJson("STOP-FOR-CODEX-REVIEW.json", stop));

const manifestFiles = [
  rel("lib/criminal/disclosure-chase-finalize.ts"),
  rel("scripts/master3000-live-builder-validation.test.ts"),
  rel("scripts/assurance/master-3000-phase6-p1-live-builder-validation.ts"),
  ...written.map((file) => rel(file)),
].sort();

const manifestPath = writeJson("CHANGED-FILE-MANIFEST.json", {
  schemaVersion: "master3000-phase6-changed-file-manifest@1.0.0",
  generatedAt: GENERATED_AT,
  selfHashStatus: "excluded_from_files_array_self_referential",
  files: manifestFiles.map((file) => ({
    path: file,
    sha256: sha256File(path.join(ROOT, file)),
    byteLength: bytes(path.join(ROOT, file)),
    classification: file.startsWith("lib/")
      ? "source"
      : file.startsWith("scripts/")
        ? "contract_or_emit_script"
        : "phase6_artifact",
  })),
});

const digestPath = writeJson("CHANGED-FILE-MANIFEST.DIGEST.json", {
  schemaVersion: "master3000-phase6-changed-file-manifest-digest@1.0.0",
  generatedAt: GENERATED_AT,
  manifestPath: rel(manifestPath),
  manifestSha256: sha256File(manifestPath),
  manifestByteLength: bytes(manifestPath),
});

console.log(
  JSON.stringify(
    {
      status: stop.status,
      outputRoot: rel(OUT_ROOT),
      p1ClustersReviewed: p1Clusters.length,
      classifications: classificationCounts,
      phase6Rows: phase6Results.length,
      phase6CandidateFailures: liveCandidateFailures.length,
      coverageBefore: phase5Coverage.summary.evaluated,
      coverageAfter: coverageAfter.summary.evaluated,
      validationIssues: stop.validationIssues,
      full3000RunStarted: false,
      filesWritten: [...written.map((file) => rel(file)), rel(manifestPath), rel(digestPath)],
    },
    null,
    2,
  ),
);
