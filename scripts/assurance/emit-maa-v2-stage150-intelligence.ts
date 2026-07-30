/**
 * Emit MAA V2 Stage-150 intelligence artefacts.
 *
 * - Implements/records packet-local detectors, schemas, adapters, contracts
 * - Runs 499-case eligibility scan only (no audit verdicts, no truth opening, no sample selection)
 * - Recalculates Stage-150 readiness honestly (gates remain false)
 * - Stops uncommitted for Codex review
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-intelligence.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

import { DEFAULT_ESA_CORPUS_ROOT, ESA_REQUIRED_FILES } from "../../lib/eval/master-assurance-auditor/esa-adapter";
import { buildV2Controls } from "../../lib/eval/master-assurance-auditor/v2/assemble";
import {
  buildStage150DetectorImplementationMap,
  buildStage150Exerciseability,
  buildStage150ExecutionReadinessGate,
  buildStage150MinimumDenominators,
  buildRelationshipAudit,
  auditEsaPopulationInputCapability,
  collectExecutionReadinessBundle,
} from "../../lib/eval/master-assurance-auditor/v2/execution-readiness";
import {
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
} from "../../lib/eval/master-assurance-auditor/v2/schema";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { allPartialHandlers } from "../../lib/eval/master-assurance-auditor/v2/every-word/control-handler-registry";
import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  STAGE150_PARTIAL_IDS,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { scanCaseEligibility } from "../../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import {
  STAGE150_INTELLIGENCE_FAMILIES,
  STAGE150_OWNERSHIP_EDGES,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/ownership-map";
import { ELD_DEPENDENCY_SPEC } from "../../lib/eval/master-assurance-auditor/v2/stage150/eld-dependency-spec";
import { buildCoverageGapRegister } from "../../lib/eval/master-assurance-auditor/v2/stage150/coverage-gap";
import { STAGE150_INPUT_ADAPTERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/input-adapters";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";

const OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-intelligence",
);

const BASELINE = "6095cdde4289e60958230a5315a755cd9ba6cef1";

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function gitBlobIdAt(commit: string, filePath: string): { blobId: string | null; objectType: string | null; note: string } {
  try {
    const out = execSync(`git ls-tree ${commit} -- "${filePath}"`, { encoding: "utf8" }).trim();
    if (!out) return { blobId: null, objectType: null, note: "Path not in tree at that commit." };
    const m = out.match(/^\d+\s+(\S+)\s+([0-9a-f]+)\t/);
    if (!m) return { blobId: null, objectType: null, note: `Unparseable ls-tree: ${out}` };
    if (m[1] !== "blob") return { blobId: null, objectType: m[1], note: `objectType=${m[1]}` };
    return { blobId: m[2], objectType: "blob", note: "blob" };
  } catch (e) {
    return { blobId: null, objectType: null, note: String(e) };
  }
}

function workingTreeStatus(filePath: string): { dirtyVsHead: boolean; untracked: boolean; porcelain: string } {
  try {
    const porcelain = execSync(`git status --porcelain -- "${filePath}"`, { encoding: "utf8" }).trim();
    return { dirtyVsHead: porcelain.length > 0, untracked: porcelain.startsWith("??"), porcelain };
  } catch {
    return { dirtyVsHead: false, untracked: false, porcelain: "" };
  }
}

function listUniqueValidDirs(corpusRoot: string): Array<{ caseId: string; packetPath: string }> {
  const abs = path.isAbsolute(corpusRoot) ? corpusRoot : path.join(process.cwd(), corpusRoot);
  const dirs = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const out: Array<{ caseId: string; packetPath: string }> = [];
  for (const name of dirs) {
    const dir = path.join(abs, name);
    const missing = ESA_REQUIRED_FILES.filter((f) => !fs.existsSync(path.join(dir, f)));
    if (missing.length) continue;
    out.push({ caseId: name, packetPath: dir });
  }
  return out;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson("stage150-implementation-capability-matrix.json", matrix);

  const ownership = {
    schemaVersion: "stage150-ownership-dedup-graph@1.0.0",
    intelligenceFamilies: STAGE150_INTELLIGENCE_FAMILIES,
    edges: STAGE150_OWNERSHIP_EDGES,
    ownerControlIds: [...new Set(STAGE150_OWNERSHIP_EDGES.map((e) => e.ownerControlId))],
    rule: "Related controls may consume an owner finding but must not duplicate the occurrence.",
  };
  writeJson("stage150-ownership-dedup-graph.json", ownership);

  writeJson("stage150-eld-dependency-specification.json", ELD_DEPENDENCY_SPEC);
  writeJson("stage150-input-adapters.json", {
    schemaVersion: "stage150-input-adapters@1.0.0",
    adapters: STAGE150_INPUT_ADAPTERS,
  });

  writeJson("stage150-packet-local-handlers.json", {
    schemaVersion: "stage150-packet-local-handlers@1.0.0",
    handlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    handlers: STAGE150_PACKET_LOCAL_HANDLERS,
    allPartialHandlerCount: allPartialHandlers().length,
  });

  // --- 499 eligibility scan (no verdicts, no truth open, no sample selection) ---
  const corpusRoot = DEFAULT_ESA_CORPUS_ROOT;
  const uniqueValid = listUniqueValidDirs(corpusRoot);
  if (uniqueValid.length !== 499) {
    throw new Error(`Expected 499 unique-valid trio packets, found ${uniqueValid.length}`);
  }

  const perCase = uniqueValid.map((c) => scanCaseEligibility(c.caseId, c.packetPath));
  const truthOpenedCount = perCase.filter((c) => c.truthOpened !== false).length;
  if (truthOpenedCount !== 0) {
    throw new Error("Eligibility scan opened truth — forbidden");
  }

  const eligibleByControl: Record<string, number> = {};
  const missingReasonByControl: Record<string, Record<string, number>> = {};
  const receiptStatusByControl: Record<string, { evaluated: number; unresolved: number; not_exercised: number }> =
    {};
  for (const h of STAGE150_PACKET_LOCAL_HANDLERS) {
    eligibleByControl[h.controlId] = 0;
    missingReasonByControl[h.controlId] = {};
    receiptStatusByControl[h.controlId] = { evaluated: 0, unresolved: 0, not_exercised: 0 };
  }
  let inventoryIdentityFailures = 0;
  let includedWordingTotal = 0;
  for (const c of perCase) {
    if (c.inventoryReconciliation && !c.inventoryReconciliation.identity) inventoryIdentityFailures += 1;
    includedWordingTotal += c.includedSolicitorVisibleWordingCount;
    for (const id of c.eligibleControlIds) {
      eligibleByControl[id] = (eligibleByControl[id] ?? 0) + 1;
    }
    for (const r of c.receipts) {
      const st = receiptStatusByControl[r.controlId] ?? (receiptStatusByControl[r.controlId] = {
        evaluated: 0,
        unresolved: 0,
        not_exercised: 0,
      });
      st[r.status] += 1;
      if (r.status === "not_exercised" && r.missingInputReason) {
        const bucket =
          missingReasonByControl[r.controlId] ?? (missingReasonByControl[r.controlId] = {});
        bucket[r.missingInputReason] = (bucket[r.missingInputReason] ?? 0) + 1;
      }
    }
  }

  const observedStates = new Set<string>();
  for (const c of perCase.slice(0, 50)) {
    const p = path.join(c.packetPath, "casebrain-output.json");
    if (!fs.existsSync(p)) continue;
    const output = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    const states = Array.isArray(output.evidenceStates)
      ? (output.evidenceStates as Record<string, unknown>[])
      : [];
    for (const s of states) {
      if (typeof s.inferredSourceState === "string") observedStates.add(s.inferredSourceState);
    }
  }

  const eligibilityReport = {
    schemaVersion: "stage150-499-eligibility-report@1.1.0",
    generatedAt: new Date().toISOString(),
    baselineCommit: BASELINE,
    populationUniqueValid: uniqueValid.length,
    casesScanned: perCase.length,
    auditVerdictsProduced: false,
    truthOpened: false,
    stage150SampleSelected: false,
    stage150ControlsRun: false,
    packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    exactPrerequisites: true,
    emptyHitsDoNotImplyPass: true,
    eligibleCountsPerControl: eligibleByControl,
    receiptStatusCountsPerControl: receiptStatusByControl,
    missingInputReasonsPerControl: missingReasonByControl,
    casesWithCasebrainOutput: perCase.filter((c) => c.hasCasebrainOutput).length,
    casesWithTruthKeyFilePresent: perCase.filter((c) => c.truthKeyFilePresent).length,
    inventory: {
      meanIncludedSolicitorVisibleWording: includedWordingTotal / perCase.length,
      identityFailures: inventoryIdentityFailures,
      note: "Wording controls bind to accepted complete solicitor-visible inventory (included_solicitor_visible).",
    },
    note:
      "Exact per-control prerequisites. Missing inputs → not_exercised. Empty hits ≠ PASS. No Stage-150 sample selection.",
    caseDigestSha256: sha256(
      perCase.map((c) => `${c.caseId}:${c.eligibleControlIds.length}`).join("\n"),
    ),
  };
  writeJson("stage150-499-eligibility-report.json", eligibilityReport);

  // Per-case / per-control receipts (evaluated | unresolved | not_exercised)
  writeJson("stage150-499-control-receipts.json", {
    schemaVersion: "stage150-499-control-receipts@1.0.0",
    emptyHitsDoNotImplyPass: true,
    truthOpened: false,
    auditVerdictsProduced: false,
    cases: perCase.map((c) => ({
      caseId: c.caseId,
      inventoryReconciliation: c.inventoryReconciliation,
      includedSolicitorVisibleWordingCount: c.includedSolicitorVisibleWordingCount,
      receipts: c.receipts,
    })),
  });

  writeJson("stage150-499-eligibility-case-index.json", {
    schemaVersion: "stage150-499-eligibility-case-index@1.1.0",
    cases: perCase.map((c) => ({
      caseId: c.caseId,
      hasCasebrainOutput: c.hasCasebrainOutput,
      truthKeyFilePresent: c.truthKeyFilePresent,
      truthOpened: false,
      eligibleControlCount: c.eligibleControlIds.length,
      eligibleControlIds: c.eligibleControlIds,
      notExercisedControlIds: c.notExercisedControlIds,
      unresolvedControlIds: c.unresolvedControlIds,
      evaluatedControlIds: c.evaluatedControlIds,
      receiptSample: c.receipts
        .filter((r) => r.status === "not_exercised" || r.hitCount > 0)
        .slice(0, 8),
    })),
  });

  writeJson("stage150-inventory-reconciliation-summary.json", {
    schemaVersion: "stage150-inventory-reconciliation@1.0.0",
    identityFailures: inventoryIdentityFailures,
    meanIncludedSolicitorVisibleWording: includedWordingTotal / perCase.length,
    sample: perCase.slice(0, 20).map((c) => ({
      caseId: c.caseId,
      reconciliation: c.inventoryReconciliation,
    })),
  });

  const coverageGap = buildCoverageGapRegister({
    observedEvidenceStates: [...observedStates],
    observedExits: ["view", "copy"],
    eligibleByControl,
  });
  writeJson("stage150-coverage-gap-register.json", coverageGap);

  // --- Honest readiness recalculation ---
  const controls = buildV2Controls();
  const detectorMap = buildStage150DetectorImplementationMap(controls);
  const annotatedDetectorMap = {
    ...detectorMap,
    schemaVersion: "stage150-detector-implementation-map@1.1.0",
    packetLocalPartialHandlerCount: STAGE150_PARTIAL_IDS.size,
    packetLocalPartialControlIds: [...STAGE150_PARTIAL_IDS].sort(),
    rows: detectorMap.rows.map((r) => {
      const partial = STAGE150_PARTIAL_IDS.has(r.controlId);
      return {
        ...r,
        packetLocalHandlerStatus: partial ? "partially_implemented" : r.implementationStatus,
        substantiveDetector: false,
        runnableOnCurrentEsaCorpus: false,
        countsAsFullyExercised: false,
        reason: partial
          ? "Packet-local detector + contracts exist; partially_implemented is blocking — not Stage-150 executable."
          : r.reason,
      };
    }),
    implementedSubstantiveDetectorCount: 0,
  };
  writeJson("stage150-detector-implementation-map.json", annotatedDetectorMap);

  const exerciseability = buildStage150Exerciseability(controls);
  const denominators = buildStage150MinimumDenominators(controls, 499);
  // Fill observed eligible counts for packet-local handlers only (still PENDING_APPROVAL minima)
  const denominatorsObserved = {
    ...denominators,
    schemaVersion: "stage150-minimum-denominators@1.1.0",
    rows: denominators.rows.map((r) => ({
      ...r,
      eligiblePopulation: {
        ...r.eligiblePopulation,
        observedEligibleForPacketLocalHandler:
          eligibleByControl[r.controlId] ?? null,
        resolvedEligibleCount: "PENDING_OBSERVATION",
      },
      blockedUntilApproval: true,
    })),
  };
  writeJson("stage150-minimum-denominators.json", denominatorsObserved);

  const relationships = buildRelationshipAudit(controls);
  const esa = auditEsaPopulationInputCapability();
  // Avoid truth content reliance beyond exists in esa audit — already established

  const gate = buildStage150ExecutionReadinessGate({
    controls,
    detectorMap: annotatedDetectorMap as ReturnType<typeof buildStage150DetectorImplementationMap>,
    exerciseability,
    denominators: denominatorsObserved as ReturnType<typeof buildStage150MinimumDenominators>,
    relationships,
    esaAudit: esa,
  });
  if (gate.stage150SampleSelectionAllowed || gate.stage150ExecutionAllowed || gate.overallAllowed) {
    throw new Error("Stage-150 gates must remain false");
  }
  writeJson("stage150-execution-readiness-gate.json", gate);
  writeJson("stage150-control-exerciseability.json", exerciseability);

  const totals = {
    schemaVersion: "stage150-implementation-totals@1.0.0",
    stage150ControlCount: matrix.totals.stage150ControlCount,
    partially_implemented: matrix.totals.partially_implemented,
    specified_not_implemented: matrix.totals.specified_not_implemented,
    implemented: matrix.totals.implemented,
    other: matrix.totals.other,
    packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    eldNonRunnable: 14,
    note: "partially_implemented remains blocking and never counts as fully exercised.",
  };
  writeJson("stage150-implementation-totals.json", totals);

  // Build / tsc baselines — capture commands run separately; record placeholders here
  let buildLog = "";
  let tscLog = "";
  try {
    buildLog = execSync("npx tsc --noEmit --pretty false 2>&1", {
      encoding: "utf8",
      cwd: process.cwd(),
      timeout: 300000,
    });
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    tscLog = `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`;
  }
  writeJson("typescript-baseline.json", {
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit",
    exitCode: tscLog ? 1 : 0,
    stdoutSha256: sha256(buildLog || tscLog),
    excerpt: (buildLog || tscLog).slice(0, 4000),
  });

  const headCommit = (() => {
    try {
      return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
      return BASELINE;
    }
  })();

  const brain1Files = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
  ];
  const guardianFiles = [
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const describeProtected = (label: string, files: string[]) =>
    files.map((p) => {
      const atBaseline = gitBlobIdAt(BASELINE, p);
      const atHead = gitBlobIdAt(headCommit, p);
      const wt = workingTreeStatus(p);
      return {
        group: label,
        path: p,
        exists: fs.existsSync(path.join(process.cwd(), p)),
        baselineCommit: BASELINE,
        baselineBlobId: atBaseline.blobId,
        headCommit,
        headBlobId: atHead.blobId,
        blobUnchanged: atBaseline.blobId != null && atBaseline.blobId === atHead.blobId,
        dirtyVsHead: wt.dirtyVsHead,
        note: atBaseline.note,
      };
    });

  const protectedCompare = {
    schemaVersion: "stage150-brain1-guardian-blob-compare@1.0.0",
    applicationBehaviourChanged: false,
    brain1: describeProtected("Brain 1", brain1Files),
    guardian: describeProtected("Guardian", guardianFiles),
    freezeHashStage50: FREEZE_HASH_STAGE50,
    freezePath:
      "artifacts/casebrain-qa/assurance/master-auditor-v1/esa-stage50-sample-freeze/STAGE-50-SAMPLE-FREEZE.json",
  };
  writeJson("brain1-guardian-blob-compare.json", protectedCompare);

  const brain1Ok = protectedCompare.brain1.every((r) => r.blobUnchanged && !r.dirtyVsHead);
  const guardianOk = protectedCompare.guardian.every((r) => r.blobUnchanged && !r.dirtyVsHead);

  // Contract results placeholder — filled by test runner writing alongside
  writeJson("stage150-contract-results.json", {
    schemaVersion: "stage150-contract-results@1.0.0",
    note: "Populated/verified by scripts/maa-v2-stage150-intelligence-contracts.test.ts",
    expectedHandlerContracts: STAGE150_PACKET_LOCAL_HANDLERS.map((h) => ({
      controlId: h.controlId,
      positiveContract: h.positiveContract,
      negativeContract: h.negativeContract,
      unavailableVerdict: h.unavailableVerdict,
    })),
  });

  const plan = {
    schemaVersion: "stage150-intelligence-implementation-plan@1.0.0",
    auditedStage150ControlCount: matrix.totals.stage150ControlCount,
    userMentioned147Note:
      "Registry declares 161 Stage-150 controls (user mentioned 147); matrix uses registry count.",
    families: STAGE150_INTELLIGENCE_FAMILIES,
    ownershipEdges: STAGE150_OWNERSHIP_EDGES,
    packetLocalHandlersImplemented: STAGE150_PACKET_LOCAL_HANDLERS.length,
    remainingSpecifiedNotImplemented:
      matrix.totals.specified_not_implemented + matrix.totals.other,
  };
  writeJson("stage150-implementation-plan.json", plan);

  const stop = {
    schemaVersion: "maa-v2-stage150-intelligence-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 intelligence implementation (no freeze/run)",
    status: "STAGE150_INTELLIGENCE_IMPLEMENTATION_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    baselineCommit: BASELINE,
    headCommit,
    pr: 65,
    registryVersion: MAA_V2_REGISTRY_VERSION,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    programmePassSupported: false,
    stage150Started: false,
    stage150SampleFrozen: false,
    stage150ControlsRun: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    overallAllowed: false,
    applicationBehaviourChanged: false,
    committed: false,
    pushed: false,
    merged: false,
    deployed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    totals,
    eligibility: {
      populationUniqueValid: eligibilityReport.populationUniqueValid,
      casesScanned: eligibilityReport.casesScanned,
      truthOpened: false,
      auditVerdictsProduced: false,
      sampleSelected: false,
    },
    readinessGateBlockingReasons: gate.blockingReasons,
    brain1BlobUnchanged: brain1Ok,
    guardianBlobUnchanged: guardianOk,
    blockers: [
      "implementedSubstantiveDetectorCount < stage150ControlCount (0 of 161 fully implemented)",
      "partially_implemented packet-local handlers remain blocking",
      "Stage-150 denominator minima PENDING_APPROVAL",
      "ELD (14) / LEG / VDR / heavy SRC adapters absent",
      "adapterReadinessComplete=false",
      "full multi-exit matrix (api/pdf/composed_prose) absent on ESA",
    ],
    nextSafeCommand:
      "After Codex accept: do not freeze/run Stage 150; next unit is further detector coverage + denominator approval — or commit this uncommitted intelligence unit if accepted.",
    reviewAsks: [
      "Confirm packet-local handlers are real evaluators with positive/negative/unavailable contracts, not status-only changes.",
      "Confirm 499 eligibility scan opened no truth and produced no audit verdicts.",
      "Confirm Stage-150 selection/execution gates remain false.",
      "Confirm ELD 14 remain specified_not_implemented.",
      "Confirm Brain 1 / Guardian blobs unchanged vs baseline tip.",
    ],
    deliverables: [
      "stage150-implementation-plan.json",
      "stage150-implementation-capability-matrix.json",
      "stage150-ownership-dedup-graph.json",
      "stage150-eld-dependency-specification.json",
      "stage150-input-adapters.json",
      "stage150-packet-local-handlers.json",
      "stage150-coverage-gap-register.json",
      "stage150-499-eligibility-report.json",
      "stage150-499-control-receipts.json",
      "stage150-499-eligibility-case-index.json",
      "stage150-inventory-reconciliation-summary.json",
      "stage150-implementation-totals.json",
      "stage150-detector-implementation-map.json",
      "stage150-execution-readiness-gate.json",
      "stage150-control-exerciseability.json",
      "stage150-minimum-denominators.json",
      "stage150-contract-results.json",
      "typescript-baseline.json",
      "brain1-guardian-blob-compare.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
    remediation: {
      exactPrerequisites: true,
      emptyHitsDoNotImplyPass: true,
      inventoryBound: true,
      promptInjectionNotOnSrc13: true,
      xex01ChargeWarningOnly: true,
      honestUnknownPageNotDefect: true,
    },
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  // Mirror readiness gate note at v2 root without overwriting foundation STOP
  const rootGatePath = path.join(
    process.cwd(),
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json",
  );
  fs.writeFileSync(rootGatePath, JSON.stringify(gate, null, 2) + "\n", "utf8");

  console.log(
    JSON.stringify(
      {
        out: OUT.replace(/\\/g, "/"),
        stage150Controls: totals.stage150ControlCount,
        partially_implemented: totals.partially_implemented,
        specified_not_implemented: totals.specified_not_implemented,
        eligibilityCases: eligibilityReport.casesScanned,
        truthOpened: false,
        gates: {
          sample: gate.stage150SampleSelectionAllowed,
          exec: gate.stage150ExecutionAllowed,
        },
        brain1Ok,
        guardianOk,
      },
      null,
      2,
    ),
  );

  void collectExecutionReadinessBundle;
}

main();
