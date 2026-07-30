/**
 * Emit MAA V2 Stage-150 Intelligence Batch 3 artefacts.
 *
 * Jobs: FID-10 19-candidate source dispositions · 51 new partial detectors ·
 * 499×106 eligibility · denominator/readiness refresh · STOP for Codex.
 *
 * No Stage-150 freeze/run · no CaseBrain repair · no commit/push · no programme PASS.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch3.ts
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
} from "../../lib/eval/master-assurance-auditor/v2/execution-readiness";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import {
  STAGE150_BATCH1_HANDLERS,
  STAGE150_PACKET_LOCAL_HANDLERS,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { STAGE150_BATCH2_HANDLERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch2-registry";
import { STAGE150_BATCH3_HANDLERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch3-registry";
import {
  BATCH3_SELECTED,
  BATCH3_BLOCKED_REMAINING_SNI,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch3-selection";
import {
  BATCH3_CONTROL_CLASSIFICATIONS,
  classificationCounts,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/batch3-control-classification";
import { scanCaseEligibility } from "../../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import {
  STAGE150_INTELLIGENCE_FAMILIES,
  STAGE150_OWNERSHIP_EDGES,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/ownership-map";
import { buildCoverageGapRegister } from "../../lib/eval/master-assurance-auditor/v2/stage150/coverage-gap";
import { buildStage150ImplementationCapabilityMatrix } from "../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import {
  buildCaseExitCapabilityReceipt,
  buildEsaMultiExitCapabilityMapFromReceipts,
  type CaseExitCapabilityReceipt,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/multi-exit-map";
import { ELD_DEPENDENCY_SPEC } from "../../lib/eval/master-assurance-auditor/v2/stage150/eld-dependency-spec";
import { ELD_FOUNDATION_STATUS } from "../../lib/eval/master-assurance-auditor/v2/eld";
import { STAGE150_INPUT_ADAPTERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/input-adapters";

const BASELINE = "d92e28c25a1dcc239f3c0d434174cc45851fd908";
const OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch3",
);
const DENOM_OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/denominator-readiness",
);
const ROOT = process.cwd();

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(dir: string, name: string, value: unknown) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function listUniqueValidDirs(corpusRoot: string): Array<{ caseId: string; packetPath: string }> {
  const abs = path.isAbsolute(corpusRoot) ? corpusRoot : path.join(ROOT, corpusRoot);
  const dirs = fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const out: Array<{ caseId: string; packetPath: string }> = [];
  const seen = new Set<string>();
  for (const name of dirs) {
    const packetPath = path.join(abs, name);
    const ok = ESA_REQUIRED_FILES.every((f) => fs.existsSync(path.join(packetPath, f)));
    if (!ok) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ caseId: name, packetPath });
  }
  return out;
}

function gitBlobIdAt(commit: string, filePath: string): string | null {
  try {
    const out = execSync(`git ls-tree ${commit} -- "${filePath}"`, { encoding: "utf8" }).trim();
    const m = out.match(/^\d+\s+blob\s+([0-9a-f]+)\t/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function listFilesRecursive(absDir: string): string[] {
  if (!fs.existsSync(absDir)) return [];
  const out: string[] = [];
  const stack = [absDir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(p);
      else if (ent.isFile()) out.push(p);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const started = Date.now();

  if (STAGE150_BATCH1_HANDLERS.length !== 25) throw new Error("batch1 != 25");
  if (STAGE150_BATCH2_HANDLERS.length !== 30) throw new Error("batch2 != 30");
  if (STAGE150_BATCH3_HANDLERS.length !== BATCH3_SELECTED.length) {
    throw new Error(`batch3 handlers ${STAGE150_BATCH3_HANDLERS.length} != ${BATCH3_SELECTED.length}`);
  }
  if (STAGE150_PACKET_LOCAL_HANDLERS.length !== 25 + 30 + BATCH3_SELECTED.length) {
    throw new Error(
      `Expected ${25 + 30 + BATCH3_SELECTED.length} packet-local handlers, got ${STAGE150_PACKET_LOCAL_HANDLERS.length}`,
    );
  }
  if (BATCH3_SELECTED.length + BATCH3_BLOCKED_REMAINING_SNI.length !== 106) {
    throw new Error("Batch3 selection+blocked must cover prior 106 SNI");
  }

  // Ensure FID-10 source review artefacts exist
  const freezePath = path.join(OUT, "stage150-fid10-output-freeze-receipt.json");
  const dispPath = path.join(OUT, "stage150-fid10-source-dispositions.json");
  if (!fs.existsSync(freezePath) || !fs.existsSync(dispPath)) {
    throw new Error("Run emit-maa-v2-stage150-batch3-fid10-source-review.ts first");
  }
  const fid10Source = JSON.parse(fs.readFileSync(dispPath, "utf8")) as {
    units: Record<string, number>;
    dispositionCounts: Record<string, number>;
    rootCauseFamilies: unknown[];
    freezeDigestSha256: string;
  };

  writeJson(OUT, "batch3-selected.json", {
    schemaVersion: "stage150-batch3-selected@1.1.0",
    baselineCommit: BASELINE,
    count: BATCH3_SELECTED.length,
    controls: BATCH3_SELECTED,
    blockedRemainingSni: BATCH3_BLOCKED_REMAINING_SNI,
  });

  const matrixBefore = {
    partially_implemented: 55,
    specified_not_implemented: 106,
    implemented: 0,
  };
  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson(OUT, "stage150-implementation-capability-matrix.json", matrix);
  writeJson(OUT, "stage150-implementation-totals.json", {
    schemaVersion: "stage150-implementation-totals@1.2.0",
    stage150ControlCount: matrix.totals.stage150ControlCount,
    before: matrixBefore,
    after: {
      partially_implemented: matrix.totals.partially_implemented,
      specified_not_implemented: matrix.totals.specified_not_implemented,
      implemented: matrix.totals.implemented,
      other: matrix.totals.other,
    },
    packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    batch1: 25,
    batch2: 30,
    batch3: BATCH3_SELECTED.length,
    eldNonRunnable: 14,
    note: "partially_implemented remains blocking and never counts as fully exercised.",
  });

  writeJson(OUT, "stage150-ownership-dedup-graph.json", {
    schemaVersion: "stage150-ownership-dedup-graph@1.2.0",
    intelligenceFamilies: STAGE150_INTELLIGENCE_FAMILIES,
    edges: STAGE150_OWNERSHIP_EDGES,
    ownerControlIds: [...new Set(STAGE150_OWNERSHIP_EDGES.map((e) => e.ownerControlId))],
    rule: "Related controls may consume an owner finding but must not duplicate the occurrence.",
  });

  writeJson(OUT, "stage150-packet-local-handlers.json", {
    schemaVersion: "stage150-packet-local-handlers@1.2.0",
    batch1Count: 25,
    batch2Count: 30,
    batch3Count: BATCH3_SELECTED.length,
    handlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    handlers: STAGE150_PACKET_LOCAL_HANDLERS,
  });

  writeJson(OUT, "stage150-exact-dependency-input-map.json", {
    schemaVersion: "stage150-exact-dependency-input-map@1.1.0",
    baselineCommit: BASELINE,
    adapters: STAGE150_INPUT_ADAPTERS,
    perControlRequiredInputs: STAGE150_PACKET_LOCAL_HANDLERS.map((h) => ({
      controlId: h.controlId,
      probeRequiredInputs: h.requiredInputs,
      namedControlRequiredInputs: h.namedControlRequiredInputs ?? h.requiredInputs,
      detectorClassification: h.detectorClassification ?? null,
      capabilityScope: h.capabilityScope ?? null,
      exercisedInvariant: h.exercisedInvariant ?? null,
      unexercisedInvariant: h.unexercisedInvariant ?? null,
      exactPrerequisiteEvidenceRefs: h.exactPrerequisiteEvidenceRefs ?? h.requiredInputs,
      unavailableVerdict: h.unavailableVerdict,
    })),
    batch3Classifications: BATCH3_CONTROL_CLASSIFICATIONS,
    batch3ClassificationCounts: classificationCounts(),
    blockedControls: BATCH3_BLOCKED_REMAINING_SNI,
  });

  writeJson(OUT, "stage150-batch3-control-reclassifications.json", {
    schemaVersion: "stage150-batch3-control-reclassifications@1.0.0",
    baselineCommit: BASELINE,
    counts: classificationCounts(),
    controls: BATCH3_CONTROL_CLASSIFICATIONS,
    rule:
      "phrase_probe_only may evaluate a narrow wording probe; namedControlExerciseStatus stays not_exercised until exact structured prerequisites exist. Never conflate probe evaluation with full named-control exercise.",
  });

  const corpusRoot = DEFAULT_ESA_CORPUS_ROOT;
  const uniqueValid = listUniqueValidDirs(corpusRoot);
  if (uniqueValid.length !== 499) {
    throw new Error(`Expected 499 unique-valid trio packets, found ${uniqueValid.length}`);
  }

  // Reuse exit map from batch2 artefacts if present; else rebuild
  const batch2ExitMapPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2/esa-multi-exit-capability-map.json",
  );
  const batch2ExitReceiptsPath = path.join(
    ROOT,
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2/esa-499-exit-capability-receipts.jsonl",
  );
  let exitMap: ReturnType<typeof buildEsaMultiExitCapabilityMapFromReceipts>;
  if (fs.existsSync(batch2ExitReceiptsPath)) {
    const receipts = fs
      .readFileSync(batch2ExitReceiptsPath, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => JSON.parse(l) as CaseExitCapabilityReceipt);
    exitMap = buildEsaMultiExitCapabilityMapFromReceipts({ receipts });
  } else {
    console.log("499 exit-capability receipts…");
    const exitReceipts: CaseExitCapabilityReceipt[] = [];
    for (const c of uniqueValid) {
      const output = JSON.parse(
        fs.readFileSync(path.join(c.packetPath, "casebrain-output.json"), "utf8"),
      ) as Record<string, unknown>;
      exitReceipts.push(buildCaseExitCapabilityReceipt(c.caseId, output));
    }
    exitMap = buildEsaMultiExitCapabilityMapFromReceipts({ receipts: exitReceipts });
  }
  writeJson(OUT, "esa-multi-exit-capability-map.json", exitMap);

  console.log(`499 eligibility shadow (${STAGE150_PACKET_LOCAL_HANDLERS.length} partials)…`);
  const perCase = uniqueValid.map((c, i) => {
    if (i % 50 === 0) console.log(`  eligibility ${i}/${uniqueValid.length}`);
    return scanCaseEligibility(c.caseId, c.packetPath);
  });
  if (perCase.some((c) => c.truthOpened !== false)) {
    throw new Error("Eligibility scan opened truth — forbidden");
  }

  const handlerCount = STAGE150_PACKET_LOCAL_HANDLERS.length;
  const eligibleByControl: Record<string, number> = {};
  const missingReasonByControl: Record<string, Record<string, number>> = {};
  const namedMissingReasonByControl: Record<string, Record<string, number>> = {};
  const receiptStatusByControl: Record<
    string,
    { evaluated: number; unresolved: number; not_exercised: number }
  > = {};
  const namedExerciseByControl: Record<
    string,
    { fully_exercised: number; partially_exercised: number; not_exercised: number }
  > = {};
  for (const h of STAGE150_PACKET_LOCAL_HANDLERS) {
    eligibleByControl[h.controlId] = 0;
    missingReasonByControl[h.controlId] = {};
    namedMissingReasonByControl[h.controlId] = {};
    receiptStatusByControl[h.controlId] = { evaluated: 0, unresolved: 0, not_exercised: 0 };
    namedExerciseByControl[h.controlId] = {
      fully_exercised: 0,
      partially_exercised: 0,
      not_exercised: 0,
    };
  }

  let totalReceipts = 0;
  for (const c of perCase) {
    totalReceipts += c.receipts.length;
    for (const id of c.eligibleControlIds) {
      eligibleByControl[id] = (eligibleByControl[id] ?? 0) + 1;
    }
    for (const r of c.receipts) {
      const st = receiptStatusByControl[r.controlId]!;
      st[r.probeStatus] += 1;
      namedExerciseByControl[r.controlId]![r.namedControlExerciseStatus] += 1;
      if (r.probeStatus === "not_exercised" && r.missingInputReason) {
        const bucket = missingReasonByControl[r.controlId]!;
        bucket[r.missingInputReason] = (bucket[r.missingInputReason] ?? 0) + 1;
      }
      if (r.namedControlExerciseStatus === "not_exercised" && r.namedControlMissingInputReason) {
        const bucket = namedMissingReasonByControl[r.controlId]!;
        bucket[r.namedControlMissingInputReason] =
          (bucket[r.namedControlMissingInputReason] ?? 0) + 1;
      }
    }
  }
  if (totalReceipts !== 499 * handlerCount) {
    throw new Error(`Expected ${499 * handlerCount} receipts, got ${totalReceipts}`);
  }

  const observedStates = new Set<string>();
  for (const c of perCase.slice(0, 80)) {
    const p = path.join(c.packetPath, "casebrain-output.json");
    const output = JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>;
    const states = Array.isArray(output.evidenceStates)
      ? (output.evidenceStates as Record<string, unknown>[])
      : [];
    for (const s of states) {
      if (typeof s.inferredSourceState === "string") observedStates.add(s.inferredSourceState);
    }
  }

  const probeTotals = {
    evaluated: Object.values(receiptStatusByControl).reduce((a, b) => a + b.evaluated, 0),
    unresolved: Object.values(receiptStatusByControl).reduce((a, b) => a + b.unresolved, 0),
    not_exercised: Object.values(receiptStatusByControl).reduce((a, b) => a + b.not_exercised, 0),
    total: totalReceipts,
  };
  const namedControlExerciseTotals = {
    fully_exercised: Object.values(namedExerciseByControl).reduce((a, b) => a + b.fully_exercised, 0),
    partially_exercised: Object.values(namedExerciseByControl).reduce(
      (a, b) => a + b.partially_exercised,
      0,
    ),
    not_exercised: Object.values(namedExerciseByControl).reduce((a, b) => a + b.not_exercised, 0),
    total: totalReceipts,
  };
  // Back-compat alias: receiptTotals = probeTotals (probe ≠ named exercise)
  const receiptTotals = probeTotals;

  writeJson(OUT, "stage150-499-eligibility-report.json", {
    schemaVersion: "stage150-499-eligibility-report@1.4.0",
    generatedAt: new Date().toISOString(),
    baselineCommit: BASELINE,
    populationUniqueValid: 499,
    packetLocalHandlerCount: handlerCount,
    auditVerdictsProduced: false,
    truthOpened: false,
    stage150SampleSelected: false,
    stage150ControlsRun: false,
    emptyHitsDoNotImplyPass: true,
    probeVsNamedControlSeparation: true,
    receiptTotals,
    probeTotals,
    namedControlExerciseTotals,
    eligibleCountsPerControl: eligibleByControl,
    receiptStatusCountsPerControl: receiptStatusByControl,
    namedExerciseCountsPerControl: namedExerciseByControl,
    missingInputReasonsPerControl: missingReasonByControl,
    namedControlMissingInputReasonsPerControl: namedMissingReasonByControl,
  });

  writeJson(OUT, "stage150-499-control-receipts.json", {
    schemaVersion: "stage150-499-control-receipts@1.3.0",
    emptyHitsDoNotImplyPass: true,
    truthOpened: false,
    probeVsNamedControlSeparation: true,
    receiptTotals,
    probeTotals,
    namedControlExerciseTotals,
    cases: perCase.map((c) => ({
      caseId: c.caseId,
      inventoryReconciliation: c.inventoryReconciliation,
      includedSolicitorVisibleWordingCount: c.includedSolicitorVisibleWordingCount,
      eligibleControlIds: c.eligibleControlIds,
      namedPartiallyExercisedControlIds: c.namedPartiallyExercisedControlIds,
      namedNotExercisedControlIds: c.namedNotExercisedControlIds,
      receipts: c.receipts,
    })),
  });

  const coverageGap = buildCoverageGapRegister({
    observedEvidenceStates: [...observedStates],
    observedExits: exitMap.exits
      .filter((e) => e.exercisableCount > 0 || e.partialCount > 0)
      .map((e) => e.exit),
    eligibleByControl,
  });
  writeJson(OUT, "stage150-coverage-gap-register.json", {
    ...coverageGap,
    batch3BlockedAdapters: BATCH3_BLOCKED_REMAINING_SNI,
  });

  const annotatedDetectorMap = buildStage150DetectorImplementationMap();
  writeJson(OUT, "stage150-detector-implementation-map.json", annotatedDetectorMap);
  const denominatorsObserved = buildStage150MinimumDenominators();
  writeJson(OUT, "stage150-minimum-denominators.json", denominatorsObserved);
  const exerciseability = buildStage150Exerciseability();
  writeJson(OUT, "stage150-control-exerciseability.json", exerciseability);
  const controlsAll = buildV2Controls();
  const relationships = buildRelationshipAudit(controlsAll);
  const esa = auditEsaPopulationInputCapability();
  const gate = buildStage150ExecutionReadinessGate({
    controls: controlsAll,
    detectorMap: annotatedDetectorMap,
    exerciseability,
    denominators: denominatorsObserved,
    relationships,
    esaAudit: esa,
  });
  if (gate.stage150SampleSelectionAllowed || gate.stage150ExecutionAllowed || gate.overallAllowed) {
    throw new Error("Stage-150 gates must remain false");
  }
  writeJson(OUT, "stage150-execution-readiness-gate.json", {
    ...gate,
    batch3Note: "Batch-3 partials do not unlock Stage-150 freeze/run.",
  });

  // Denominator proposals — FID-10 remains BLOCKED_UNRESOLVED_PROVENANCE (source review done; binding remediation not applied)
  const controls150 = buildV2Controls().filter(
    (c) => c.activationStage === "150" || c.currentActivationStage === "150",
  );
  const perControl = controls150.map((c) => {
    const partial = STAGE150_PACKET_LOCAL_HANDLERS.some((h) => h.controlId === c.controlId);
    const blocked = BATCH3_BLOCKED_REMAINING_SNI.find((b) => b.controlId === c.controlId);
    const isFid10 = c.controlId === "MAA2-FID-10-QUOTATION-FIDELITY";
    const isEld = c.familyCode === "ELD";
    let approvalState:
      | "PENDING_APPROVAL"
      | "BLOCKED_MISSING_INPUT"
      | "BLOCKED_UNRESOLVED_PROVENANCE"
      | "PENDING_SOURCE_REVIEW"
      | "BLOCKED_DETECTOR_NOISE" = "BLOCKED_MISSING_INPUT";
    if (isFid10) approvalState = "BLOCKED_UNRESOLVED_PROVENANCE";
    else if (isEld || blocked) approvalState = "BLOCKED_MISSING_INPUT";
    else if (partial) approvalState = "PENDING_APPROVAL";
    return {
      controlId: c.controlId,
      familyCode: c.familyCode,
      implementationStatus: isEld || blocked
        ? "specified_not_implemented"
        : partial
          ? "partially_implemented"
          : "specified_not_implemented",
      approvalState,
      proposalStatus: "PROPOSED_PENDING_CODEX_REVIEW",
      frozenRunAllowed: false,
      calibrationRunAllowed: false,
      blocker: blocked?.blocker ?? (isFid10 ? "unresolved_provenance_binding" : null),
      note: isFid10
        ? "Source review complete for 19 candidates; structured provenance remediation not applied; still calibration blocker."
        : blocked
          ? `Blocked: ${blocked.blocker}`
          : partial
            ? "Packet-local partial detector present; denominators PENDING_APPROVAL."
            : "No packet-local handler.",
    };
  });

  const approvalCounts = {
    PENDING_APPROVAL: perControl.filter((r) => r.approvalState === "PENDING_APPROVAL").length,
    BLOCKED_MISSING_INPUT: perControl.filter((r) => r.approvalState === "BLOCKED_MISSING_INPUT")
      .length,
    BLOCKED_UNRESOLVED_PROVENANCE: perControl.filter(
      (r) => r.approvalState === "BLOCKED_UNRESOLVED_PROVENANCE",
    ).length,
    PENDING_SOURCE_REVIEW: 0,
    BLOCKED_DETECTOR_NOISE: 0,
    APPROVED_FOR_CALIBRATION: 0,
    APPROVED_FOR_FROZEN_RUN: 0,
  };

  writeJson(DENOM_OUT, "per-control-denominator-proposal.json", {
    schemaVersion: "per-control-denominator-proposal@1.2.0",
    baselineCommit: BASELINE,
    rows: perControl,
    approvalCounts,
    note: "Batch-3 regenerate; approvals remain PENDING / blocked. No denominator approval.",
  });
  writeJson(DENOM_OUT, "approval-blocker-register.json", {
    schemaVersion: "approval-blocker-register@1.2.0",
    baselineCommit: BASELINE,
    approvalCounts,
    fid10Blocker: {
      controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
      state: "BLOCKED_UNRESOLVED_PROVENANCE",
      sourceReviewComplete: true,
      dispositionCounts: fid10Source.dispositionCounts,
      confirmedDefects: false,
      note: "Source dispositions recorded; CaseBrain not repaired; binding remediation register pending shared fix.",
    },
    eldBlocker: {
      controls: 14,
      state: "BLOCKED_MISSING_INPUT",
      adapters: ELD_DEPENDENCY_SPEC.requiredAdapters.map((a) => a.adapterId),
    },
    batch3Blocked: BATCH3_BLOCKED_REMAINING_SNI,
  });
  writeJson(DENOM_OUT, "eligibility-vs-denominator-matrix.json", {
    schemaVersion: "eligibility-vs-denominator-matrix@1.2.0",
    packetLocalHandlerCount: 106,
    receiptTotals,
    fid10SourceUnits: fid10Source.units,
  });
  writeJson(DENOM_OUT, "stage150-blinded-selection-policy.json", {
    schemaVersion: "stage150-selection-key-custody@1.0.0",
    selectionPerformed: false,
    freezePerformed: false,
    note: "150-case policy remains design only — do not select cases in this unit.",
  });

  const headCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  const protectedFiles = [
    "lib/criminal/strategy-fight-engine.ts",
    "lib/criminal/strategy-fight-engine-generators.ts",
    "lib/criminal/get-aggressive-defense.ts",
    "lib/criminal/strategy-battleboard.ts",
    "lib/criminal/strategy-routes.ts",
    "lib/criminal/bundle-truth-ledger.ts",
    "lib/criminal/bundle-material-normalizer.ts",
    "lib/criminal/source-truth-guardian/fingerprint.ts",
    "lib/criminal/source-truth-guardian/guardian.ts",
    "lib/criminal/source-truth-guardian/index.ts",
    "lib/criminal/source-truth-guardian/types.ts",
  ];
  const blobCompare = protectedFiles.map((p) => {
    const b = gitBlobIdAt(BASELINE, p);
    const h = gitBlobIdAt(headCommit, p);
    return { path: p, baselineBlobId: b, headBlobId: h, blobUnchanged: b != null && b === h };
  });
  writeJson(OUT, "brain1-guardian-blob-compare.json", {
    baselineCommit: BASELINE,
    headCommit,
    rows: blobCompare,
    allUnchanged: blobCompare.every((r) => r.blobUnchanged),
  });

  let tscOk = true;
  let tscExcerpt = "";
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false 2>&1", {
      encoding: "utf8",
      cwd: ROOT,
      timeout: 300000,
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string; message?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}`;
  }
  const stage150Errs = (tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/stage150[^\n]*/g) ?? [])
    .length;
  writeJson(OUT, "typescript-baseline.json", {
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });
  writeJson(OUT, "typescript-delta.json", {
    schemaVersion: "stage150-typescript-delta@1.0.0",
    baselineCommit: BASELINE,
    comparison: "Batch-3 vs accepted integrated tip",
    currentStdoutSha256: sha(tscExcerpt),
    stage150PathErrors: stage150Errs,
    multiExitAdapterPathErrors: (
      tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/multi-exit-adapters[^\n]*/g) ?? []
    ).length,
    eldPathErrors: (tscExcerpt.match(/lib\/eval\/master-assurance-auditor\/v2\/eld[^\n]*/g) ?? [])
      .length,
    note: "Repo-wide tsc may remain non-zero on unrelated paths; Batch-3 stage150 path errors must be 0.",
  });

  const stop = {
    schemaVersion: "maa-v2-stage150-batch3-stop@1.1.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Stage-150 Intelligence Batch 3 (remediated)",
    status: "STAGE150_BATCH3_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
    baselineCommit: BASELINE,
    headCommit,
    remediation: {
      probeVsNamedControlSeparation: true,
      controlSpecificNamedPrerequisites: true,
      exactPrerequisiteEvidenceRefsValidated: true,
      batch3ClassificationCounts: classificationCounts(),
      note:
        "Probe evaluation ≠ named-control exercise. Control-specific named prerequisites replace shared family bags. exactPrerequisiteEvidenceRefs are validated with evidence paths + field summaries; absent prerequisites fail closed to named not_exercised. Contextual phrase probes without source/context comparison remain phrase_probe_only.",
    },
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    programmePassSupported: false,
    applicationBehaviourChanged: false,
    caseBrainRepaired: false,
    committed: false,
    pushed: false,
    merged: false,
    deployed: false,
    freezeHashStage50Preserved: FREEZE_HASH_STAGE50,
    implementationTotals: {
      before: matrixBefore,
      after: {
        partially_implemented: matrix.totals.partially_implemented,
        specified_not_implemented: matrix.totals.specified_not_implemented,
        implemented: matrix.totals.implemented,
      },
    },
    fid10SourceReview: {
      freezeReceipt: "stage150-fid10-output-freeze-receipt.json",
      freezeDigestSha256: fid10Source.freezeDigestSha256,
      units: fid10Source.units,
      dispositionCounts: fid10Source.dispositionCounts,
      rootCauseFamilies: fid10Source.rootCauseFamilies,
      duplicatePolicy:
        "Retain every solicitor-visible surface occurrence; link duplicates via duplicateOfFindingId/groupId — never delete.",
      caseBrainRepaired: false,
    },
    newControls: BATCH3_SELECTED.map((c) => c.controlId),
    batch3ControlReclassifications: BATCH3_CONTROL_CLASSIFICATIONS.map((c) => ({
      controlId: c.controlId,
      classification: c.classification,
    })),
    blockedRemainingSni: BATCH3_BLOCKED_REMAINING_SNI,
    receiptTotals,
    probeTotals,
    namedControlExerciseTotals,
    exitCapability: exitMap.exits.map((e) => ({
      exit: e.exit,
      populationDenominator: e.populationDenominator,
      exercisableCount: e.exercisableCount,
      partialCount: e.partialCount,
      notExercisedCount: e.notExercisedCount,
    })),
    approvalCounts,
    eldStatus: ELD_FOUNDATION_STATUS.foundationStatus,
    protectedAssets: {
      brain1GuardianBlobUnchanged: blobCompare.every((r) => r.blobUnchanged),
      rows: blobCompare,
    },
    typescript: { exitCode: tscOk ? 0 : 1, stage150PathErrors: stage150Errs },
    blockers: [
      "partially_implemented remains blocking (0 fully implemented of 161)",
      `FID-10 BLOCKED_UNRESOLVED_PROVENANCE after source review (${fid10Source.units.occurrenceCount} occurrences retained; duplicates linked, not deleted; no CaseBrain repair)`,
      `${BATCH3_BLOCKED_REMAINING_SNI.length} SNI controls honestly blocked on missing adapters`,
      `namedControlExercise not_exercised receipts: ${namedControlExerciseTotals.not_exercised} (probe evaluated ≠ named exercised)`,
      "denominator minima PENDING_APPROVAL / not complete",
      "Stage-150 selection/execution gates false",
      "api/pdf/composed_prose/authenticated_browser not_exercised without structured receipts",
    ],
  };
  writeJson(OUT, "STOP-FOR-CODEX-REVIEW.json", stop);
  writeJson(DENOM_OUT, "STOP-FOR-CODEX-REVIEW.json", {
    ...stop,
    title: "STOP FOR CODEX REVIEW — Denominator readiness after Batch 3",
  });

  // Exact manifest
  const roots = [
    "lib/eval/master-assurance-auditor/v2/stage150",
    "lib/eval/master-assurance-auditor/v2/multi-exit-adapters",
    "lib/eval/master-assurance-auditor/v2/eld",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch3",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/denominator-readiness",
  ];
  const files = new Set<string>();
  for (const r of roots) for (const f of listFilesRecursive(path.join(ROOT, r))) files.add(f);
  for (const rel of [
    "scripts/assurance/emit-maa-v2-stage150-batch3.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch3-fid10-source-review.ts",
    "scripts/maa-v2-stage150-batch3-contracts.test.ts",
  ]) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) files.add(abs);
  }
  const entries = [...files]
    .map((abs) => {
      const relativePath = path.relative(ROOT, abs).split(path.sep).join("/");
      if (relativePath.endsWith("integrated-exact-file-manifest.json")) return null;
      if (relativePath.includes("stage150-batch3/integrated-exact-file-manifest.json")) return null;
      const buf = fs.readFileSync(abs);
      const classification = relativePath.startsWith("lib/")
        ? "source_lib"
        : relativePath.endsWith(".test.ts")
          ? "contract_test"
          : relativePath.startsWith("scripts/")
            ? "emit_script"
            : relativePath.includes("STOP-FOR-CODEX")
              ? "checkpoint"
              : "programme_evidence";
      return { relativePath, sha256: sha(buf), byteLength: buf.byteLength, classification };
    })
    .filter(Boolean)
    .sort((a, b) => a!.relativePath.localeCompare(b!.relativePath)) as Array<{
    relativePath: string;
    sha256: string;
    byteLength: number;
    classification: string;
  }>;
  for (const e of entries) {
    if (/[*?]/.test(e.relativePath)) throw new Error(`wildcard path: ${e.relativePath}`);
  }
  const manifest = {
    schemaVersion: "maa-v2-batch3-exact-file-manifest@1.0.0",
    baselineCommit: BASELINE,
    rule: "Literal relative paths only — SHA-256 + classification. No wildcards.",
    entryCount: entries.length,
    entries,
    digestSha256: sha(entries.map((e) => `${e.relativePath}|${e.sha256}|${e.classification}`).join("\n")),
  };
  writeJson(OUT, "integrated-exact-file-manifest.json", manifest);

  console.log(
    JSON.stringify(
      {
        out: OUT.replace(/\\/g, "/"),
        before: matrixBefore,
        after: matrix.totals,
        batch3New: BATCH3_SELECTED.length,
        blockedSni: BATCH3_BLOCKED_REMAINING_SNI.length,
        fid10Dispositions: fid10Source.dispositionCounts,
        receipts: receiptTotals,
        manifestEntries: manifest.entryCount,
        gates: { sample: false, exec: false, programmePass: false },
        tscStage150Errors: stage150Errs,
        brain1Ok: blobCompare.every((r) => r.blobUnchanged),
      },
      null,
      2,
    ),
  );
  void auditEsaPopulationInputCapability;
}

main();
