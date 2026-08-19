export const STARTER_GOLD_TARGET_MIN = 25;
export const STARTER_GOLD_TARGET_MAX = 50;

export const GOLD_TRUTH_SOURCE_TYPES = [
  "independent_truth_key",
  "source_pdf_pending_independent_truth",
  "documented_unavailable_or_unsupported",
] as const;

export type GoldTruthSourceType = (typeof GOLD_TRUTH_SOURCE_TYPES)[number];

export interface StarterGoldMatter {
  caseId: string;
  title: string;
  offenceFamily: string;
  profile: string;
  sourcePath: string;
  truthKeyPath: string;
  outputPath: string;
  sourceSha256: string;
  truthKeySha256: string;
  outputSha256: string;
  truthSourceType: GoldTruthSourceType;
  independentlyGrounded: boolean;
  strata: string[];
  evidenceItemCount: number;
  expectedChaseCount: number;
}

export interface StarterGoldManifest {
  schemaVersion: "casebrain-master3000-starter-gold-manifest@1.0.0";
  generatedAt: string;
  commit: string;
  targetRange: {
    min: typeof STARTER_GOLD_TARGET_MIN;
    max: typeof STARTER_GOLD_TARGET_MAX;
  };
  matters: StarterGoldMatter[];
  nonClaims: {
    fullGoldComplete: false;
    holdoutAudited: false;
    casebrainOutputUsedAsTruth: false;
    full3000Run: false;
  };
}

export interface HoldoutManifest {
  schemaVersion: "casebrain-master3000-holdout-candidate-manifest@1.0.0";
  generatedAt: string;
  commit: string;
  matters: StarterGoldMatter[];
  nonClaims: {
    audited: false;
    tunedAgainst: false;
    full3000Run: false;
  };
}

export interface ControlCoverageMapRow {
  controlId: string;
  family?: string;
  familyCode?: string;
  subfamily?: string;
  registryImplementationStatus?: string;
  registryCurrentlyRunnable?: boolean;
  starterGoldStatus:
    | "evaluated"
    | "unresolved"
    | "unavailable"
    | "not_exercised"
    | "not_in_registry";
  starterGoldCasesEvaluated: number;
  starterGoldCandidateFailures: number;
  starterGoldConfirmedFailures: number;
  limitation: string;
}

export interface ControlCoverageMap {
  schemaVersion: "casebrain-master3000-361-control-coverage-map@1.0.0";
  generatedAt: string;
  commit: string;
  totalControls: 361;
  rows: ControlCoverageMapRow[];
  summary: {
    evaluated: number;
    unresolved: number;
    unavailable: number;
    notExercised: number;
    notInRegistry: number;
  };
  nonClaims: {
    all361Exercised: false;
    starterGoldIsCorpusPass: false;
  };
}

export function validateStarterGoldManifest(manifest: StarterGoldManifest): string[] {
  const issues: string[] = [];
  if (manifest.schemaVersion !== "casebrain-master3000-starter-gold-manifest@1.0.0") {
    issues.push("bad starter gold schemaVersion");
  }
  if (manifest.matters.length < STARTER_GOLD_TARGET_MIN || manifest.matters.length > STARTER_GOLD_TARGET_MAX) {
    issues.push(`starter gold count must be ${STARTER_GOLD_TARGET_MIN}-${STARTER_GOLD_TARGET_MAX}`);
  }
  const ids = new Set<string>();
  const sourceHashes = new Set<string>();
  const strata = new Set<string>();
  for (const matter of manifest.matters) {
    if (ids.has(matter.caseId)) issues.push(`duplicate starter gold caseId: ${matter.caseId}`);
    ids.add(matter.caseId);
    if (!matter.independentlyGrounded) issues.push(`not independently grounded: ${matter.caseId}`);
    if (matter.truthSourceType !== "independent_truth_key") {
      issues.push(`starter gold matter must use independent truth key: ${matter.caseId}`);
    }
    if (!matter.sourceSha256 || !matter.truthKeySha256 || !matter.outputSha256) {
      issues.push(`missing digest on starter gold matter: ${matter.caseId}`);
    }
    if (sourceHashes.has(matter.sourceSha256)) issues.push(`duplicate source hash in starter gold: ${matter.caseId}`);
    sourceHashes.add(matter.sourceSha256);
    matter.strata.forEach((entry) => strata.add(entry));
  }
  if (strata.size < 20) issues.push(`starter gold diversity too thin: ${strata.size} strata`);
  if (
    manifest.nonClaims.fullGoldComplete ||
    manifest.nonClaims.holdoutAudited ||
    manifest.nonClaims.casebrainOutputUsedAsTruth ||
    manifest.nonClaims.full3000Run
  ) {
    issues.push("starter gold non-claims must remain false");
  }
  return issues;
}

export function validateHoldoutManifest(gold: StarterGoldManifest, holdout: HoldoutManifest): string[] {
  const issues: string[] = [];
  if (holdout.schemaVersion !== "casebrain-master3000-holdout-candidate-manifest@1.0.0") {
    issues.push("bad holdout schemaVersion");
  }
  const goldIds = new Set(gold.matters.map((matter) => matter.caseId));
  const holdoutIds = new Set<string>();
  for (const matter of holdout.matters) {
    if (goldIds.has(matter.caseId)) issues.push(`holdout overlaps starter gold: ${matter.caseId}`);
    if (holdoutIds.has(matter.caseId)) issues.push(`duplicate holdout caseId: ${matter.caseId}`);
    holdoutIds.add(matter.caseId);
    if (!matter.independentlyGrounded) issues.push(`holdout not independently grounded: ${matter.caseId}`);
  }
  if (holdout.nonClaims.audited || holdout.nonClaims.tunedAgainst || holdout.nonClaims.full3000Run) {
    issues.push("holdout non-claims must remain false");
  }
  return issues;
}

export function validateControlCoverageMap(map: ControlCoverageMap): string[] {
  const issues: string[] = [];
  if (map.schemaVersion !== "casebrain-master3000-361-control-coverage-map@1.0.0") {
    issues.push("bad control coverage schemaVersion");
  }
  if (map.totalControls !== 361) issues.push("coverage map totalControls must be 361");
  if (map.rows.length !== 361) issues.push(`coverage map must contain 361 rows, got ${map.rows.length}`);
  const ids = new Set<string>();
  for (const row of map.rows) {
    if (ids.has(row.controlId)) issues.push(`duplicate control row: ${row.controlId}`);
    ids.add(row.controlId);
    if (row.starterGoldStatus === "evaluated" && row.starterGoldCasesEvaluated < 1) {
      issues.push(`evaluated control has zero cases: ${row.controlId}`);
    }
    if (row.starterGoldStatus !== "evaluated" && row.starterGoldCandidateFailures > 0) {
      issues.push(`non-evaluated control has candidate failures: ${row.controlId}`);
    }
  }
  const summary = map.rows.reduce(
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
  if (JSON.stringify(summary) !== JSON.stringify(map.summary)) issues.push("coverage summary does not reconcile");
  if (map.nonClaims.all361Exercised || map.nonClaims.starterGoldIsCorpusPass) {
    issues.push("coverage map non-claims must remain false");
  }
  return issues;
}
