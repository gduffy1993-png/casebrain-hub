/**
 * Master Assurance Auditor orchestrator — manifest, ledger, controls, checkpoint/resume.
 * No live application wiring. Stage sizing is corpus-plan driven (never Math.min faked).
 */

import fs from "node:fs";
import path from "node:path";
import { hashFileIfExists, hashJsonFile } from "./case-loader";
import { evaluateCalibrationGate } from "./calibration";
import { runAllControls } from "./controls/run-all-controls";
import {
  CORPUS_PLAN_VERSION,
  resolveCorpusForStage,
} from "./corpus-plan";
import { buildControlExerciseRecords } from "./exercise-accounting";
import { corpusHashFromEntryHashes, sha256Hex, wordingHash } from "./hashes";
import {
  deriveHumanRateKnowledge,
  loadHumanDispositionBatch,
  type HumanDispositionBatch,
} from "./human-dispositions";
import {
  deriveSafetyFnKnowledge,
  ensureKnownFnRegisterOnDisk,
  loadKnownFnRegister,
} from "./known-fn-register";
import { MIGRATION_REGISTER } from "./migration-register";
import { MASTER_CONTROL_REGISTRY } from "./control-registry";
import {
  verifyStage50FreezeHash,
  DEFAULT_STAGE50_FREEZE_DIR,
  STAGE50_SAMPLE_POLICY_VERSION,
  type Stage50SampleFreeze,
} from "./esa-stage50-sample-freeze";
import {
  buildCalibrationMarkdown,
  buildCoverageReport,
  buildCrossExitMatrix,
  buildCrossSurfaceMatrix,
  buildRemediationGrouping,
  buildReviewBatches,
  buildStage50RunReport,
  summariseFindings,
  writeJson,
  writeJsonl,
  writeText,
} from "./reports";
import { assertFindingsValid } from "./validators";
import type {
  CalibrationStage,
  CorpusResolution,
  EvidenceLedger,
  HumanRateKnowledge,
  InputManifest,
  MasterAuditorCheckpoint,
  MasterAuditorFinding,
  MasterAuditorRunResult,
  SafetyFnKnowledge,
  SavedCaseMaterialisation,
} from "./types";
import {
  MASTER_AUDITOR_PIPELINE_VERSION,
  MASTER_AUDITOR_SCHEMA_VERSION,
} from "./types";

export const DEFAULT_OUT_ROOT = path.join(
  "artifacts",
  "casebrain-qa",
  "assurance",
  "master-auditor-v1",
);

export function createRunId(stage: CalibrationStage): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `maa-${stage}-${stamp}`;
}

export function buildInputManifest(input: {
  runId: string;
  stage: CalibrationStage;
  corpusRoot: string;
  cases: SavedCaseMaterialisation[];
  resolution: CorpusResolution;
}): InputManifest {
  const entries = input.cases.map((c) => {
    const goldActual = path.join(c.packetPath, "actual-summary.json");
    const goldExpected = path.join(c.packetPath, "expected.json");
    const esaOutput = path.join(c.packetPath, "casebrain-output.json");
    const esaTruth = path.join(c.packetPath, "truth-key.json");
    const esaBundle = path.join(c.packetPath, "bundle-text.md");

    // ESA packets: actual = casebrain-output, expected = truth-key, bundle = bundle-text
    // Gold packets: actual-summary / expected.json (unchanged)
    if (fs.existsSync(esaOutput)) {
      return {
        caseId: c.caseId,
        sourceCaseId: c.sourceCaseId,
        packetPath: c.packetPath.replace(/\\/g, "/"),
        actualHash: hashJsonFile(esaOutput),
        expectedHash: fs.existsSync(esaTruth) ? hashJsonFile(esaTruth) : null,
        bundleHash: hashFileIfExists(esaBundle),
      };
    }
    return {
      caseId: c.caseId,
      sourceCaseId: c.sourceCaseId,
      packetPath: c.packetPath.replace(/\\/g, "/"),
      actualHash: fs.existsSync(goldActual) ? hashJsonFile(goldActual) : sha256Hex(""),
      expectedHash: fs.existsSync(goldExpected) ? hashJsonFile(goldExpected) : null,
      bundleHash: hashFileIfExists(c.inputBundlePath),
    };
  });
  return {
    schemaVersion: MASTER_AUDITOR_SCHEMA_VERSION,
    runId: input.runId,
    createdAt: new Date().toISOString(),
    stage: input.stage,
    corpusRoot: input.corpusRoot.replace(/\\/g, "/"),
    planVersion: input.resolution.planVersion,
    adapterId: input.resolution.adapterId,
    requiredUniqueCases: input.resolution.requiredUniqueCases,
    membership: input.resolution.membership,
    entries,
    corpusHash: corpusHashFromEntryHashes(entries.map((e) => e.actualHash)),
    denominators: input.resolution.denominators,
  };
}

export function buildEvidenceLedger(input: {
  runId: string;
  manifest: InputManifest;
  findings: { findingId: string; caseId: string; supportingHash: string }[];
}): EvidenceLedger {
  const entries = [
    ...input.manifest.entries.flatMap((e) => {
      const esaOutput = path.join(e.packetPath, "casebrain-output.json");
      const isEsa = fs.existsSync(esaOutput);
      const actualPath = isEsa
        ? `${e.packetPath}/casebrain-output.json`
        : `${e.packetPath}/actual-summary.json`;
      const expectedPath = isEsa
        ? `${e.packetPath}/truth-key.json`
        : `${e.packetPath}/expected.json`;
      return [
        {
          ref: `actual:${e.caseId}`,
          caseId: e.caseId,
          kind: "surface" as const,
          path: actualPath,
          contentHash: e.actualHash,
          recordedAt: input.manifest.createdAt,
        },
        ...(e.expectedHash
          ? [
              {
                ref: `expected:${e.caseId}`,
                caseId: e.caseId,
                kind: "expected" as const,
                path: expectedPath,
                contentHash: e.expectedHash,
                recordedAt: input.manifest.createdAt,
              },
            ]
          : []),
        ...(e.bundleHash
          ? [
              {
                ref: `bundle:${e.caseId}`,
                caseId: e.caseId,
                kind: "bundle" as const,
                path: isEsa ? `${e.packetPath}/bundle-text.md` : null,
                contentHash: e.bundleHash,
                recordedAt: input.manifest.createdAt,
              },
            ]
          : []),
      ];
    }),
    ...input.findings.map((f) => ({
      ref: `finding:${f.findingId}`,
      caseId: f.caseId,
      kind: "finding_support" as const,
      path: null,
      contentHash: f.supportingHash,
      recordedAt: new Date().toISOString(),
    })),
  ];
  return {
    schemaVersion: MASTER_AUDITOR_SCHEMA_VERSION,
    runId: input.runId,
    entries,
  };
}

export function validateManifestHashes(manifest: InputManifest): {
  ok: boolean;
  failures: string[];
} {
  const failures: string[] = [];
  for (const e of manifest.entries) {
    const esaOutput = path.join(e.packetPath, "casebrain-output.json");
    const esaTruth = path.join(e.packetPath, "truth-key.json");
    const esaBundle = path.join(e.packetPath, "bundle-text.md");
    const goldActual = path.join(e.packetPath, "actual-summary.json");

    if (fs.existsSync(esaOutput)) {
      const h = hashJsonFile(esaOutput);
      if (h !== e.actualHash) failures.push(`output hash drift ${e.caseId}`);
      if (e.expectedHash) {
        if (!fs.existsSync(esaTruth)) {
          failures.push(`missing truth-key ${esaTruth}`);
        } else if (hashJsonFile(esaTruth) !== e.expectedHash) {
          failures.push(`truth-key hash drift ${e.caseId}`);
        }
      }
      if (e.bundleHash) {
        const bh = hashFileIfExists(esaBundle);
        if (bh !== e.bundleHash) failures.push(`bundle hash drift ${e.caseId}`);
      }
      continue;
    }

    if (!fs.existsSync(goldActual)) {
      failures.push(`missing actual ${goldActual}`);
      continue;
    }
    const h = hashJsonFile(goldActual);
    if (h !== e.actualHash) failures.push(`actual hash drift ${e.caseId}`);
  }
  const recomputed = corpusHashFromEntryHashes(manifest.entries.map((e) => e.actualHash));
  if (recomputed !== manifest.corpusHash) failures.push("corpusHash mismatch");
  if (manifest.membership.length !== manifest.entries.length) {
    failures.push("membership/entries length mismatch");
  }
  if (
    manifest.stage !== "50" &&
    manifest.membership.length !== manifest.denominators.uniqueCases
  ) {
    failures.push("membership/denominator uniqueCases mismatch");
  }
  const memberIds = new Set(manifest.membership.map((m) => m.caseId));
  if (memberIds.size !== manifest.membership.length) {
    failures.push("duplicate case membership in manifest");
  }
  // Membership order must match entries order (frozen order)
  for (let i = 0; i < manifest.membership.length; i++) {
    if (manifest.membership[i]?.caseId !== manifest.entries[i]?.caseId) {
      failures.push(`membership/entries order mismatch at index ${i}`);
      break;
    }
  }
  return { ok: failures.length === 0, failures };
}

/** Resume validates prior corpus membership + hashes before continuing. */
export function validateResume(input: {
  outDir: string;
  resolution: CorpusResolution;
}): { ok: boolean; reason: string | null } {
  const stopPath = path.join(input.outDir, "STOP-FOR-CODEX-REVIEW.json");
  const manifestPath = path.join(input.outDir, "INPUT-MANIFEST.json");
  if (!fs.existsSync(manifestPath)) {
    return { ok: true, reason: null }; // fresh run
  }
  const prior = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as InputManifest;
  const hashCheck = validateManifestHashes(prior);
  if (!hashCheck.ok) {
    return { ok: false, reason: `Resume hash validation failed: ${hashCheck.failures.join("; ")}` };
  }
  const priorIds = prior.membership.map((m) => m.caseId).sort().join(",");
  const nextIds = input.resolution.membership.map((m) => m.caseId).sort().join(",");
  if (prior.stage === input.resolution.stage && priorIds !== nextIds) {
    return {
      ok: false,
      reason: "Resume corpus membership differs from prior manifest for the same stage",
    };
  }
  if (fs.existsSync(stopPath)) {
    const stop = JSON.parse(fs.readFileSync(stopPath, "utf8")) as MasterAuditorCheckpoint;
    if (stop.status === "STOP_FOR_CODEX_REVIEW") {
      return {
        ok: false,
        reason: "Resume blocked: checkpoint already STOP_FOR_CODEX_REVIEW",
      };
    }
  }
  return { ok: true, reason: null };
}

export function tryLoadCheckpoint(outDir: string): MasterAuditorCheckpoint | null {
  const p = path.join(outDir, "STOP-FOR-CODEX-REVIEW.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8")) as MasterAuditorCheckpoint;
}

function emptyExercises(reason: string): import("./types").ControlExerciseRecord[] {
  return buildControlExerciseRecords({ cases: [], findings: [] }).map((e) => ({
    ...e,
    notExercisedReason: reason,
  }));
}

export async function runMasterAssuranceAuditor(options: {
  stage?: CalibrationStage;
  corpusRoot?: string;
  outRoot?: string;
  runId?: string;
  resume?: boolean;
  humanDispositionPaths?: string[];
  knownFnRegisterPath?: string;
}): Promise<MasterAuditorRunResult> {
  const stage: CalibrationStage = options.stage ?? "20";
  const runId = options.runId ?? createRunId(stage);
  const outDir = path.join(options.outRoot ?? DEFAULT_OUT_ROOT, runId);
  fs.mkdirSync(outDir, { recursive: true });
  const startedAt = new Date().toISOString();

  // Stage 50: verify authorised freeze hash BEFORE resolving/running controls.
  let freezeVerifyBefore: ReturnType<typeof verifyStage50FreezeHash> | null = null;
  let freezeDoc: Stage50SampleFreeze | null = null;
  if (stage === "50") {
    freezeVerifyBefore = verifyStage50FreezeHash({
      expectedHash: "4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832",
      expectedPolicyVersion: STAGE50_SAMPLE_POLICY_VERSION,
    });
    if (!freezeVerifyBefore.ok) {
      throw new Error(
        `Stage-50 freeze hash verification FAILED before run: ${freezeVerifyBefore.failures.join("; ")}`,
      );
    }
    freezeDoc = JSON.parse(
      fs.readFileSync(
        path.join(DEFAULT_STAGE50_FREEZE_DIR, "STAGE-50-SAMPLE-FREEZE.json"),
        "utf8",
      ),
    ) as Stage50SampleFreeze;
  }

  const { resolution, cases } = resolveCorpusForStage({
    stage,
    corpusRootOverride: options.corpusRoot,
  });

  // Stage 50: enforce exact frozen membership order — no substitute/add/remove.
  if (stage === "50" && freezeDoc && freezeVerifyBefore) {
    const expectedIds = freezeDoc.membership.map((m) => m.caseId);
    const actualIds = cases.map((c) => c.caseId);
    if (actualIds.length !== 50 || expectedIds.length !== 50) {
      throw new Error(
        `Stage-50 case count mismatch: freeze=${expectedIds.length} loaded=${actualIds.length}`,
      );
    }
    for (let i = 0; i < 50; i++) {
      if (actualIds[i] !== expectedIds[i]) {
        throw new Error(
          `Stage-50 frozen order violated at index ${i}: expected ${expectedIds[i]}, got ${actualIds[i]}`,
        );
      }
    }
    if (resolution.membership.length !== 50) {
      throw new Error("Stage-50 resolution membership is not exactly 50");
    }
  }

  if (options.resume) {
    const resumeCheck = validateResume({ outDir, resolution });
    if (!resumeCheck.ok) {
      throw new Error(resumeCheck.reason ?? "Resume validation failed");
    }
  }

  const fnPath = ensureKnownFnRegisterOnDisk(options.knownFnRegisterPath);
  const safetyFn: SafetyFnKnowledge = deriveSafetyFnKnowledge(
    loadKnownFnRegister(fnPath),
    fnPath.replace(/\\/g, "/"),
  );

  const dispositionBatches: HumanDispositionBatch[] = [];
  for (const p of options.humanDispositionPaths ?? []) {
    if (fs.existsSync(p)) dispositionBatches.push(loadHumanDispositionBatch(p));
  }
  const humanRates: HumanRateKnowledge = deriveHumanRateKnowledge(dispositionBatches);

  if (resolution.refused) {
    const gate = evaluateCalibrationGate({
      stage,
      casesProcessed: 0,
      expectedCases: resolution.requiredUniqueCases,
      crashCount: 0,
      corruptRecordCount: 0,
      manifestValid: false,
      hashesValid: false,
      corpusRefused: true,
      corpusRefuseReason: resolution.refuseReason,
      controls: emptyExercises(resolution.refuseReason ?? "refused"),
      findings: [],
      safetyFn,
      humanRates,
    });
    const checkpoint: MasterAuditorCheckpoint = {
      status: "REFUSED",
      programmePassSupported: false,
      doNot: ["claim_programme_PASS", "start_stage_50", "start_stage_150", "start_stage_300", "start_stage_3000"],
      runId,
      pipelineVersion: MASTER_AUDITOR_PIPELINE_VERSION,
      stageCompleted: stage,
      nextCommand: `npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=${stage}`,
      startedAt,
      stoppedAt: new Date().toISOString(),
      corpus: resolution,
      safetyFn,
      humanRates,
      totals: {
        cases: 0,
        uniqueCases: 0,
        surfaces: 0,
        findings: 0,
        defects: 0,
        containment: 0,
        unresolved: 0,
        pass: 0,
        notExercised: 0,
        detectorFalsePositives: humanRates.detectorFalsePositiveCount || null,
        designFindings: 0,
        controlsFullyExercised: 0,
        controlsPartiallyExercised: 0,
        controlsNotExercised: MASTER_CONTROL_REGISTRY.length,
      },
      controls: emptyExercises(resolution.refuseReason ?? "refused"),
      gate,
      preserved: ["brain1", "guardian", "ledger", "phase11", "malik-evidence"],
      artefactPaths: ["STOP-FOR-CODEX-REVIEW.json", "CORPUS-RESOLUTION.json"],
    };
    writeJson(path.join(outDir, "CORPUS-RESOLUTION.json"), resolution);
    writeJson(path.join(outDir, "STOP-FOR-CODEX-REVIEW.json"), checkpoint);
    throw new Error(resolution.refuseReason ?? "Corpus refused for stage");
  }

  const corpusRoot =
    options.corpusRoot ??
    (stage === "50"
      ? "artifacts/evidence-state-audit-local"
      : resolution.membership[0]?.packetPath.split("/cases/")[0] ??
        "artifacts/casebrain-qa/gold-manual-proof-set-v1");
  const manifest = buildInputManifest({
    runId,
    stage,
    corpusRoot,
    cases,
    resolution,
  });
  // Stage-50 freeze: denominators.uniqueCases is the frozen sample size (50).
  if (stage === "50") {
    manifest.denominators = {
      ...manifest.denominators,
      uniqueCases: cases.length,
      surfaces: cases.reduce((n, c) => n + c.surfaces.length, 0),
    };
  }
  const hashCheck = validateManifestHashes(manifest);

  let crashCount = 0;
  let corruptRecordCount = 0;
  let findings: MasterAuditorFinding[] = [];
  let exercises = emptyExercises("pending");
  try {
    const result = runAllControls(cases);
    findings = result.findings;
    exercises = result.exercises;
    assertFindingsValid(findings);
  } catch (err) {
    crashCount = 1;
    findings = [];
    exercises = emptyExercises(`crash: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (crashCount === 0) {
    const again = runAllControls(cases).findings;
    const a = new Set(findings.map((f) => f.findingId));
    const b = new Set(again.map((f) => f.findingId));
    if (a.size !== b.size || [...a].some((id) => !b.has(id))) {
      corruptRecordCount += 1;
    }
  }

  const ledger = buildEvidenceLedger({ runId, manifest, findings });
  const summary = summariseFindings(findings);
  const gate = evaluateCalibrationGate({
    stage,
    casesProcessed: resolution.uniqueCaseCount,
    expectedCases: resolution.requiredUniqueCases,
    crashCount,
    corruptRecordCount,
    manifestValid: hashCheck.ok,
    hashesValid: hashCheck.ok,
    corpusRefused: false,
    corpusRefuseReason: null,
    controls: exercises,
    findings,
    safetyFn,
    humanRates,
  });

  const remediation = buildRemediationGrouping(findings);
  const { batches, indexMarkdown } = buildReviewBatches(findings);
  const crossExit = buildCrossExitMatrix(findings);
  const crossSurface = buildCrossSurfaceMatrix(findings);
  const stoppedAt = new Date().toISOString();

  const fully = exercises.filter((c) => c.status === "fully_exercised").length;
  const partial = exercises.filter((c) => c.status === "partially_exercised").length;
  const notEx = exercises.filter((c) => c.status === "not_exercised").length;

  const checkpoint: MasterAuditorCheckpoint = {
    status: "STOP_FOR_CODEX_REVIEW",
    programmePassSupported: false,
    doNot: [
      "commit",
      "push",
      "merge",
      "deploy",
      "claim_programme_PASS",
      "start_stage_150",
      "start_stage_300",
      "start_stage_3000",
      "remediate",
      "rerun_malik",
      ...(stage === "50" ? [] : ["start_stage_50"]),
    ],
    runId,
    pipelineVersion: MASTER_AUDITOR_PIPELINE_VERSION,
    stageCompleted: stage,
    nextCommand:
      stage === "50"
        ? "npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=150  # refused until Codex clearance — do not run"
        : "npx tsx scripts/assurance/run-master-assurance-auditor.ts --stage=50  # refused until corpus plan + Codex clearance",
    startedAt,
    stoppedAt,
    corpus: resolution,
    safetyFn,
    humanRates,
    totals: {
      cases: cases.length,
      uniqueCases: resolution.uniqueCaseCount,
      surfaces: cases.reduce((n, c) => n + c.surfaces.length, 0),
      findings: findings.length,
      defects: summary.byVerdict.defect,
      containment: summary.byVerdict.containment,
      unresolved: summary.byVerdict.unresolved,
      pass: summary.byVerdict.pass,
      notExercised: summary.byVerdict.not_exercised,
      detectorFalsePositives:
        humanRates.knowledgeState === "reviewed_samples"
          ? humanRates.detectorFalsePositiveCount
          : null,
      designFindings: summary.designFindings,
      controlsFullyExercised: fully,
      controlsPartiallyExercised: partial,
      controlsNotExercised: notEx,
    },
    controls: exercises,
    gate,
    preserved: [
      "brain1",
      "guardian",
      "bundle-truth-ledger",
      "phase11",
      "scale3000-run-v1",
      "malik-evidence",
      "occurrence-ledger",
      "gold-manual-proof-set-v1-source-packets",
      "esa-stage50-sample-freeze",
      "maa-20-stage20-evidence",
    ],
    artefactPaths: [
      "INPUT-MANIFEST.json",
      "CORPUS-RESOLUTION.json",
      "EVIDENCE-LEDGER.json",
      "findings.jsonl",
      "control-registry.json",
      "migration-register.json",
      "coverage-report.md",
      stage === "50" ? "calibration-50-report.md" : "calibration-20-report.md",
      "remediation-grouping.json",
      "cross-exit-matrix.json",
      "cross-surface-matrix.json",
      "fp-fn-calibration-record.json",
      "before-after-baseline.json",
      "freeze-hash-validation.json",
      "alignment-receipts.jsonl",
      "review-batches/",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
  };

  const fpFnRecord = {
    schemaVersion: MASTER_AUDITOR_SCHEMA_VERSION,
    safetyFn,
    humanRates,
    note:
      "Detector FPs are never auto-labeled. Rates exist only after blinded reviewed dispositions are imported. Safety-FN count is null while known-fn register remains unreviewed.",
    knownFalsePositiveClasses: [
      {
        id: "FP-BOUNDARY-BULLET-HEADER",
        disposition: "suppressed_by_profile",
        source: "scale3000 v1 boundary_mid_sentence_cut → detector_false_positive",
        control: "MAA-COMPLETENESS",
      },
    ],
    knownFalseNegativeClasses: safetyFn.entries,
  };

  const beforeAfter = {
    schemaVersion: MASTER_AUDITOR_SCHEMA_VERSION,
    pipelineVersion: MASTER_AUDITOR_PIPELINE_VERSION,
    corpusPlanVersion: CORPUS_PLAN_VERSION,
    stage,
    uniqueCases: resolution.uniqueCaseCount,
    findings: findings.length,
    programmePassSupported: false,
  };

  writeJson(path.join(outDir, "INPUT-MANIFEST.json"), manifest);
  writeJson(path.join(outDir, "CORPUS-RESOLUTION.json"), resolution);
  writeJson(path.join(outDir, "EVIDENCE-LEDGER.json"), ledger);
  writeJsonl(path.join(outDir, "findings.jsonl"), findings);
  writeJson(path.join(outDir, "control-registry.json"), MASTER_CONTROL_REGISTRY);
  writeJson(path.join(outDir, "migration-register.json"), MIGRATION_REGISTER);
  writeText(path.join(outDir, "coverage-report.md"), buildCoverageReport(exercises));
  writeJson(path.join(outDir, "remediation-grouping.json"), remediation);
  writeJson(path.join(outDir, "cross-exit-matrix.json"), crossExit);
  writeJson(path.join(outDir, "cross-surface-matrix.json"), crossSurface);
  writeJson(path.join(outDir, "fp-fn-calibration-record.json"), fpFnRecord);
  writeJson(path.join(outDir, "before-after-baseline.json"), beforeAfter);

  // Source/output/truth alignment receipts (separate hashes; no conflation)
  const alignmentReceipts = manifest.entries.map((e) => ({
    caseId: e.caseId,
    packetPath: e.packetPath,
    outputHash: e.actualHash,
    truthHash: e.expectedHash,
    bundleHash: e.bundleHash,
    alignedIdentity: true,
    note: "output=casebrain-output.json (or gold actual); truth=truth-key/expected; bundle separate",
  }));
  writeJsonl(path.join(outDir, "alignment-receipts.jsonl"), alignmentReceipts);

  // Stage-50 freeze hash verification AFTER run (must still match authorised hash)
  let freezeVerifyAfter: ReturnType<typeof verifyStage50FreezeHash> | null = null;
  if (stage === "50") {
    freezeVerifyAfter = verifyStage50FreezeHash({
      expectedHash: "4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832",
      expectedPolicyVersion: STAGE50_SAMPLE_POLICY_VERSION,
    });
    writeJson(path.join(outDir, "freeze-hash-validation.json"), {
      authorisedHash: "4e73e4d48d6aad4851f7dec3f424a8f6ae13e1cdb95e62bdd1ac73f449050832",
      policyVersion: STAGE50_SAMPLE_POLICY_VERSION,
      before: freezeVerifyBefore,
      after: freezeVerifyAfter,
      processedCaseIdsInOrder: cases.map((c) => c.caseId),
      freezeCaseIdsInOrder: freezeDoc?.membership.map((m) => m.caseId) ?? [],
      orderMatch:
        !!freezeDoc &&
        cases.every((c, i) => c.caseId === freezeDoc!.membership[i]?.caseId),
      manifestHashOk: hashCheck.ok,
      manifestFailures: hashCheck.failures,
    });
    if (!freezeVerifyAfter.ok) {
      throw new Error(
        `Stage-50 freeze hash verification FAILED after run: ${freezeVerifyAfter.failures.join("; ")}`,
      );
    }
  }

  writeJson(path.join(outDir, "hashes.json"), {
    runId,
    corpusHash: manifest.corpusHash,
    findingsHash: sha256Hex(findings.map((f) => f.findingId).sort().join("\n")),
    wordingSampleHash: wordingHash(findings[0]?.exactWording ?? ""),
    membershipHash: sha256Hex(manifest.membership.map((m) => m.caseId).join("\n")),
    orderedMembershipHash:
      freezeDoc?.orderedMembershipHash ??
      sha256Hex(manifest.membership.map((m) => m.caseId).join("\n")),
  });

  // Stage-20 totals for descriptive comparison (different corpus — not identity compare)
  let stage20Totals: Record<string, number> | null = null;
  const stage20Stop = path.join(
    options.outRoot ?? DEFAULT_OUT_ROOT,
    "maa-20-2026-07-29T18-08-29-011Z",
    "STOP-FOR-CODEX-REVIEW.json",
  );
  if (fs.existsSync(stage20Stop)) {
    const s20 = JSON.parse(fs.readFileSync(stage20Stop, "utf8")) as MasterAuditorCheckpoint;
    stage20Totals = {
      pass: s20.totals.pass,
      defect: s20.totals.defects,
      unresolved: s20.totals.unresolved,
      containment: s20.totals.containment,
      not_exercised: s20.totals.notExercised,
      findings: s20.totals.findings,
      cases: s20.totals.cases,
    };
  }

  if (stage === "50" && freezeDoc && freezeVerifyBefore && freezeVerifyAfter) {
    writeText(
      path.join(outDir, "calibration-50-report.md"),
      buildStage50RunReport({
        checkpoint,
        cases,
        findings,
        remediation,
        freeze: freezeDoc,
        freezeVerifyBefore,
        freezeVerifyAfter,
        hashCheck,
        crashCount,
        corruptRecordCount,
        stage20Totals,
      }),
    );
  } else {
    writeText(
      path.join(outDir, "calibration-20-report.md"),
      buildCalibrationMarkdown({
        checkpoint,
        cases,
        findings,
        remediation,
        fpFnNotes: [
          `Safety-FN knowledge: ${safetyFn.knowledgeState} (knownSafetyCriticalFn=${String(safetyFn.knownSafetyCriticalFn)})`,
          `Human rates: ${humanRates.knowledgeState} (confirmation=${String(humanRates.humanConfirmationRate)}, fp=${String(humanRates.detectorFalsePositiveRate)})`,
          "Defects require actual CaseBrain exactWording; expected inventory labels live in expectedWording only.",
          "Control exercise: fully/partial/not — not_exercised-only lanes are not fully exercised.",
          "Detector FP not auto-counted; blank human fields stay blank.",
        ],
      }),
    );
  }

  const batchDir = path.join(outDir, "review-batches");
  writeText(path.join(batchDir, "INDEX.md"), indexMarkdown);
  batches.forEach((batch, i) => {
    writeJson(path.join(batchDir, `batch-${String(i + 1).padStart(3, "0")}.json`), {
      batchIndex: i + 1,
      humanReviewDisposition: null,
      items: batch,
    });
  });

  writeJson(path.join(outDir, "STOP-FOR-CODEX-REVIEW.json"), checkpoint);
  writeJson(path.join(options.outRoot ?? DEFAULT_OUT_ROOT, "LATEST-STOP.json"), {
    runId,
    outDir: outDir.replace(/\\/g, "/"),
    status: checkpoint.status,
    programmePassSupported: false,
    stageCompleted: stage,
  });

  return {
    runId,
    stage,
    cases,
    findings,
    manifest,
    ledger,
    controls: exercises,
    gate,
    checkpoint,
    outDir,
  };
}
