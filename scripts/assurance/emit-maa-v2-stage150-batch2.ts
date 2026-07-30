/**
 * Emit MAA V2 Stage-150 Priority Intelligence Batch 2 artefacts.
 *
 * Jobs: FID-10 calibration · 30 new partial detectors · multi-exit map · 499 shadow
 * No Stage-150 freeze/run · no programme PASS · stop uncommitted for Codex review
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-stage150-batch2.ts
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
import {
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
} from "../../lib/eval/master-assurance-auditor/v2/schema";
import { FREEZE_HASH_STAGE50 } from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import { allPartialHandlers } from "../../lib/eval/master-assurance-auditor/v2/every-word/control-handler-registry";
import {
  STAGE150_BATCH1_HANDLERS,
  STAGE150_PACKET_LOCAL_HANDLERS,
  STAGE150_PARTIAL_IDS,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { STAGE150_BATCH2_HANDLERS } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch2-registry";
import { BATCH2_SELECTED_30 } from "../../lib/eval/master-assurance-auditor/v2/stage150/batch2-selection";
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
import {
  classifyAllFid10Candidates,
  fid10TextHash,
  formerFid10Disposition,
  type Fid10Family,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/fid10-calibration";
import { inventoryOutputLeaves } from "../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import {
  buildEvalContext,
  evaluateControl,
  reconcileInventory,
} from "../../lib/eval/master-assurance-auditor/v2/stage150/detectors";

const OUT = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2",
);

const BASELINE = "17361223248b41d719c8de2b98c1eaf2cb4125f6";
const FID10_BEFORE = {
  unresolvedCandidateOccurrences: 915,
  casesWithUnresolvedCandidates: 474,
  populationUniqueValid: 499,
  source:
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-intelligence/stage150-fid10-calibration-disclosure.json",
};

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function gitBlobIdAt(commit: string, filePath: string): { blobId: string | null; note: string } {
  try {
    const out = execSync(`git ls-tree ${commit} -- "${filePath}"`, { encoding: "utf8" }).trim();
    if (!out) return { blobId: null, note: "Path not in tree" };
    const m = out.match(/^\d+\s+(\S+)\s+([0-9a-f]+)\t/);
    if (!m || m[1] !== "blob") return { blobId: null, note: out };
    return { blobId: m[2], note: "blob" };
  } catch (e) {
    return { blobId: null, note: String(e) };
  }
}

function workingTreeStatus(filePath: string): { dirtyVsHead: boolean; porcelain: string } {
  try {
    const porcelain = execSync(`git status --porcelain -- "${filePath}"`, { encoding: "utf8" }).trim();
    return { dirtyVsHead: porcelain.length > 0, porcelain };
  } catch {
    return { dirtyVsHead: false, porcelain: "" };
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

function capUniqueStrings(values: string[], max = 50): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const key = v.replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= max) break;
  }
  return out;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const started = Date.now();

  if (STAGE150_BATCH1_HANDLERS.length !== 25) {
    throw new Error(`Expected 25 batch-1 handlers, got ${STAGE150_BATCH1_HANDLERS.length}`);
  }
  if (STAGE150_BATCH2_HANDLERS.length !== 30) {
    throw new Error(`Expected 30 batch-2 handlers, got ${STAGE150_BATCH2_HANDLERS.length}`);
  }
  if (STAGE150_PACKET_LOCAL_HANDLERS.length !== 55) {
    throw new Error(`Expected 55 packet-local handlers, got ${STAGE150_PACKET_LOCAL_HANDLERS.length}`);
  }

  writeJson("batch2-selected-30.json", {
    schemaVersion: "stage150-batch2-selected-30@1.0.0",
    baselineCommit: BASELINE,
    count: BATCH2_SELECTED_30.length,
    controls: BATCH2_SELECTED_30,
  });

  const matrix = buildStage150ImplementationCapabilityMatrix();
  writeJson("stage150-implementation-capability-matrix.json", matrix);

  writeJson("stage150-ownership-dedup-graph.json", {
    schemaVersion: "stage150-ownership-dedup-graph@1.1.0",
    intelligenceFamilies: STAGE150_INTELLIGENCE_FAMILIES,
    edges: STAGE150_OWNERSHIP_EDGES,
    ownerControlIds: [...new Set(STAGE150_OWNERSHIP_EDGES.map((e) => e.ownerControlId))],
    rule: "Related controls may consume an owner finding but must not duplicate the occurrence.",
  });

  writeJson("stage150-packet-local-handlers.json", {
    schemaVersion: "stage150-packet-local-handlers@1.1.0",
    batch1Count: STAGE150_BATCH1_HANDLERS.length,
    batch2Count: STAGE150_BATCH2_HANDLERS.length,
    handlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    handlers: STAGE150_PACKET_LOCAL_HANDLERS,
    allPartialHandlerCount: allPartialHandlers().length,
  });

  const corpusRoot = DEFAULT_ESA_CORPUS_ROOT;
  const uniqueValid = listUniqueValidDirs(corpusRoot);
  if (uniqueValid.length !== 499) {
    throw new Error(`Expected 499 unique-valid trio packets, found ${uniqueValid.length}`);
  }

  // Exit capability: one receipt per packet over the real 499 population (no representative packet).
  console.log("499 exit-capability receipts…");
  const exitReceipts: CaseExitCapabilityReceipt[] = [];
  for (let i = 0; i < uniqueValid.length; i++) {
    const c = uniqueValid[i];
    if (i % 50 === 0) console.log(`  exits ${i}/${uniqueValid.length}`);
    const output = JSON.parse(
      fs.readFileSync(path.join(c.packetPath, "casebrain-output.json"), "utf8"),
    ) as Record<string, unknown>;
    exitReceipts.push(buildCaseExitCapabilityReceipt(c.caseId, output));
  }
  fs.writeFileSync(
    path.join(OUT, "esa-499-exit-capability-receipts.jsonl"),
    exitReceipts.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf8",
  );
  const exitMap = buildEsaMultiExitCapabilityMapFromReceipts({ receipts: exitReceipts });
  writeJson("esa-multi-exit-capability-map.json", exitMap);

  // --- FID-10 calibration pass (occurrence-aware; zero confirmed defects) ---
  console.log("FID-10 calibration scan…");
  const familyCounts: Record<Fid10Family, number> = {
    substantive_quote_needs_provenance: 0,
    heading_label_formatting: 0,
    provenance_in_linked_field: 0,
    qualified_unknown_provenance: 0,
    detector_false_positive: 0,
    genuinely_unresolved: 0,
  };
  const remainingUnresolved: Array<{ caseId: string; ref: string; family: Fid10Family; reason: string; textPreview: string }> =
    [];
  const dispositionLines: string[] = [];
  const fpSamples: string[] = [];
  const remainingSamples: string[] = [];
  const casesWithEmit = new Set<string>();
  const casesWithAnyQuote = new Set<string>();
  let quoteOccurrenceTotal = 0;
  let emitUnresolvedTotal = 0;
  const stringDenom = new Set<string>();
  const templateDenom = new Set<string>();
  const caseDenom = new Set<string>();

  for (let i = 0; i < uniqueValid.length; i++) {
    const c = uniqueValid[i];
    if (i % 50 === 0) console.log(`  FID-10 ${i}/${uniqueValid.length}`);
    const output = JSON.parse(
      fs.readFileSync(path.join(c.packetPath, "casebrain-output.json"), "utf8"),
    ) as Record<string, unknown>;
    const leaves = inventoryOutputLeaves(c.caseId, output);
    const classified = classifyAllFid10Candidates({ leaves, output });

    for (const row of classified) {
      quoteOccurrenceTotal += 1;
      familyCounts[row.family] += 1;
      casesWithAnyQuote.add(c.caseId);
      caseDenom.add(c.caseId);
      stringDenom.add(row.text.replace(/\s+/g, " ").trim().toLowerCase());
      const tmpl = row.text
        .replace(/\b\d+\b/g, "#")
        .replace(/[A-Z]{2,}\d+/g, "ID")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .slice(0, 120);
      templateDenom.add(tmpl);

      const former = formerFid10Disposition({ ref: row.ref, text: row.text });
      dispositionLines.push(
        JSON.stringify({
          caseId: c.caseId,
          surfaceReference: row.ref,
          exactTextHash: fid10TextHash(row.text),
          textPreview: row.text.slice(0, 200),
          formerDisposition: former,
          newDisposition: row.family,
          emitUnresolvedCandidate: row.emitUnresolvedCandidate,
          reason: row.reason,
          linkedSourceFields: row.linkedSourceFields,
          exactProvenanceExists: row.exactProvenanceExists,
        }),
      );

      if (row.family === "detector_false_positive" || row.family === "heading_label_formatting") {
        fpSamples.push(row.text);
      }
      if (row.emitUnresolvedCandidate) {
        emitUnresolvedTotal += 1;
        casesWithEmit.add(c.caseId);
        remainingUnresolved.push({
          caseId: c.caseId,
          ref: row.ref,
          family: row.family,
          reason: row.reason,
          textPreview: row.text.slice(0, 160),
        });
        remainingSamples.push(row.text);
      }
    }
  }

  fs.writeFileSync(
    path.join(OUT, "stage150-fid10-occurrence-dispositions.jsonl"),
    dispositionLines.join("\n") + (dispositionLines.length ? "\n" : ""),
    "utf8",
  );

  const fid10After = {
    unresolvedCandidateOccurrences: emitUnresolvedTotal,
    casesWithUnresolvedCandidates: casesWithEmit.size,
    populationUniqueValid: 499,
    quoteOccurrenceTotal,
    casesWithAnyQuoteSurface: casesWithAnyQuote.size,
  };

  const fid10Report = {
    schemaVersion: "stage150-fid10-calibration-report@1.0.0",
    controlId: "MAA2-FID-10-QUOTATION-FIDELITY",
    baselineCommit: BASELINE,
    confirmedApplicationDefects: false,
    automaticConfirmedDefectDecisions: 0,
    before: FID10_BEFORE,
    after: fid10After,
    beforeAfterCandidateMap: {
      beforeUnresolvedOccurrences: FID10_BEFORE.unresolvedCandidateOccurrences,
      afterUnresolvedOccurrences: fid10After.unresolvedCandidateOccurrences,
      deltaOccurrences: fid10After.unresolvedCandidateOccurrences - FID10_BEFORE.unresolvedCandidateOccurrences,
      beforeCases: FID10_BEFORE.casesWithUnresolvedCandidates,
      afterCases: fid10After.casesWithUnresolvedCandidates,
      deltaCases: fid10After.casesWithUnresolvedCandidates - FID10_BEFORE.casesWithUnresolvedCandidates,
      reclassifiedAsNonEmit:
        FID10_BEFORE.unresolvedCandidateOccurrences - fid10After.unresolvedCandidateOccurrences,
    },
    denominators: {
      occurrence: quoteOccurrenceTotal,
      uniqueString: stringDenom.size,
      uniqueTemplate: templateDenom.size,
      casesWithQuoteSurface: caseDenom.size,
      population: 499,
    },
    familyCounts,
    falsePositiveFamilies: {
      detector_false_positive: familyCounts.detector_false_positive,
      heading_label_formatting: familyCounts.heading_label_formatting,
      provenance_in_linked_field: familyCounts.provenance_in_linked_field,
      qualified_unknown_provenance: familyCounts.qualified_unknown_provenance,
      sampleUniqueStrings: capUniqueStrings(fpSamples, 50),
    },
    remainingUnresolvedCandidates: {
      count: remainingUnresolved.length,
      cases: casesWithEmit.size,
      sampleUniqueStrings: capUniqueStrings(remainingSamples, 50),
      sampleOccurrences: remainingUnresolved.slice(0, 50),
    },
    rules: {
      emptyHitsDoNotImplyPass: true,
      unresolvedIsNotDefect: true,
      zeroAutomaticConfirmedDefects: true,
      stage150ExecutionAllowed: false,
    },
  };
  writeJson("stage150-fid10-calibration-report.json", fid10Report);
  writeJson("stage150-fid10-before-after-map.json", fid10Report.beforeAfterCandidateMap);
  writeJson("stage150-fid10-remaining-unresolved.json", {
    schemaVersion: "stage150-fid10-remaining-unresolved@1.0.0",
    count: remainingUnresolved.length,
    cases: casesWithEmit.size,
    candidates: remainingUnresolved,
  });
  writeJson("stage150-fid10-fp-families.json", fid10Report.falsePositiveFamilies);

  // --- 499 eligibility / calibration shadow (55 partials) ---
  console.log("499 eligibility shadow (55 partials)…");
  const perCase = uniqueValid.map((c, i) => {
    if (i % 50 === 0) console.log(`  eligibility ${i}/${uniqueValid.length}`);
    return scanCaseEligibility(c.caseId, c.packetPath);
  });
  if (perCase.some((c) => c.truthOpened !== false)) {
    throw new Error("Eligibility scan opened truth — forbidden");
  }

  const eligibleByControl: Record<string, number> = {};
  const missingReasonByControl: Record<string, Record<string, number>> = {};
  const receiptStatusByControl: Record<
    string,
    { evaluated: number; unresolved: number; not_exercised: number }
  > = {};
  for (const h of STAGE150_PACKET_LOCAL_HANDLERS) {
    eligibleByControl[h.controlId] = 0;
    missingReasonByControl[h.controlId] = {};
    receiptStatusByControl[h.controlId] = { evaluated: 0, unresolved: 0, not_exercised: 0 };
  }

  let inventoryIdentityFailures = 0;
  let includedWordingTotal = 0;
  let totalReceipts = 0;
  const candidateStringsByControl: Record<string, string[]> = {};
  const reviewStrings: string[] = [];

  for (const c of perCase) {
    if (c.inventoryReconciliation && !c.inventoryReconciliation.identity) inventoryIdentityFailures += 1;
    includedWordingTotal += c.includedSolicitorVisibleWordingCount;
    totalReceipts += c.receipts.length;
    for (const id of c.eligibleControlIds) {
      eligibleByControl[id] = (eligibleByControl[id] ?? 0) + 1;
    }
    for (const r of c.receipts) {
      const st =
        receiptStatusByControl[r.controlId] ??
        (receiptStatusByControl[r.controlId] = { evaluated: 0, unresolved: 0, not_exercised: 0 });
      st[r.status] += 1;
      if (r.status === "not_exercised" && r.missingInputReason) {
        const bucket = missingReasonByControl[r.controlId] ?? (missingReasonByControl[r.controlId] = {});
        bucket[r.missingInputReason] = (bucket[r.missingInputReason] ?? 0) + 1;
      }
      if (r.hitCount > 0) {
        for (const code of r.findingCodes) {
          const key = `${r.controlId}::${code}`;
          (candidateStringsByControl[key] ??= []).push(`${r.caseId}:${code}`);
          reviewStrings.push(`${r.controlId}|${code}|${r.caseId}`);
        }
      }
    }
  }

  if (totalReceipts !== 499 * 55) {
    throw new Error(`Expected ${499 * 55} receipts, got ${totalReceipts}`);
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

  const receiptTotals = {
    evaluated: Object.values(receiptStatusByControl).reduce((a, b) => a + b.evaluated, 0),
    unresolved: Object.values(receiptStatusByControl).reduce((a, b) => a + b.unresolved, 0),
    not_exercised: Object.values(receiptStatusByControl).reduce((a, b) => a + b.not_exercised, 0),
    total: totalReceipts,
  };

  const eligibilityReport = {
    schemaVersion: "stage150-499-eligibility-report@1.2.0",
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
    receiptTotals,
    eligibleCountsPerControl: eligibleByControl,
    receiptStatusCountsPerControl: receiptStatusByControl,
    missingInputReasonsPerControl: missingReasonByControl,
    casesWithCasebrainOutput: perCase.filter((c) => c.hasCasebrainOutput).length,
    casesWithTruthKeyFilePresent: perCase.filter((c) => c.truthKeyFilePresent).length,
    inventory: {
      meanIncludedSolicitorVisibleWording: includedWordingTotal / perCase.length,
      identityFailures: inventoryIdentityFailures,
      note: "Wording controls bind to accepted complete solicitor-visible inventory.",
    },
    caseDigestSha256: sha256(perCase.map((c) => `${c.caseId}:${c.eligibleControlIds.length}`).join("\n")),
  };
  writeJson("stage150-499-eligibility-report.json", eligibilityReport);

  writeJson("stage150-499-control-receipts.json", {
    schemaVersion: "stage150-499-control-receipts@1.1.0",
    emptyHitsDoNotImplyPass: true,
    truthOpened: false,
    auditVerdictsProduced: false,
    receiptTotals,
    cases: perCase.map((c) => ({
      caseId: c.caseId,
      inventoryReconciliation: c.inventoryReconciliation,
      includedSolicitorVisibleWordingCount: c.includedSolicitorVisibleWordingCount,
      receipts: c.receipts,
    })),
  });

  writeJson("stage150-499-eligibility-case-index.json", {
    schemaVersion: "stage150-499-eligibility-case-index@1.2.0",
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
    })),
  });

  writeJson("stage150-inventory-reconciliation-summary.json", {
    schemaVersion: "stage150-inventory-reconciliation@1.1.0",
    identityFailures: inventoryIdentityFailures,
    meanIncludedSolicitorVisibleWording: includedWordingTotal / perCase.length,
    sample: perCase.slice(0, 20).map((c) => ({
      caseId: c.caseId,
      reconciliation: c.inventoryReconciliation,
    })),
  });

  // Candidate / review batches capped at 50 unique strings
  const candidateBatches: Array<{ batchId: string; controlFindingKey: string; uniqueStrings: string[] }> = [];
  let batchN = 1;
  for (const [key, vals] of Object.entries(candidateStringsByControl).sort()) {
    const unique = capUniqueStrings(vals, 50);
    candidateBatches.push({
      batchId: `batch-${String(batchN).padStart(3, "0")}`,
      controlFindingKey: key,
      uniqueStrings: unique,
    });
    batchN += 1;
  }
  writeJson("stage150-candidate-review-batches.json", {
    schemaVersion: "stage150-candidate-review-batches@1.0.0",
    capUniqueStrings: 50,
    batchCount: candidateBatches.length,
    batches: candidateBatches,
    reviewSampleUniqueStrings: capUniqueStrings(reviewStrings, 50),
  });

  const coverageGap = buildCoverageGapRegister({
    observedEvidenceStates: [...observedStates],
    observedExits: exitMap.exits
      .filter((e) => e.exercisableCount > 0 || e.partialCount > 0)
      .map((e) => e.exit),
    eligibleByControl,
  });
  writeJson("stage150-coverage-gap-register.json", {
    ...coverageGap,
    multiExitNote:
      "Capability map aggregated from 499 packet-local receipts — absent API/PDF/browser artefacts never listed as evidenceObserved.",
    updatedForBatch2: true,
  });

  const controls = buildV2Controls();
  const detectorMap = buildStage150DetectorImplementationMap(controls);
  const annotatedDetectorMap = {
    ...detectorMap,
    schemaVersion: "stage150-detector-implementation-map@1.2.0",
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
  const denominatorsObserved = {
    ...denominators,
    schemaVersion: "stage150-minimum-denominators@1.2.0",
    rows: denominators.rows.map((r) => ({
      ...r,
      eligiblePopulation: {
        ...r.eligiblePopulation,
        observedEligibleForPacketLocalHandler: eligibleByControl[r.controlId] ?? null,
        resolvedEligibleCount: "PENDING_OBSERVATION",
      },
      blockedUntilApproval: true,
    })),
  };
  writeJson("stage150-minimum-denominators.json", denominatorsObserved);

  const relationships = buildRelationshipAudit(controls);
  const esa = auditEsaPopulationInputCapability();
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
    schemaVersion: "stage150-implementation-totals@1.1.0",
    stage150ControlCount: matrix.totals.stage150ControlCount,
    old: {
      partially_implemented: 25,
      specified_not_implemented: 136,
      implemented: 0,
    },
    new: {
      partially_implemented: matrix.totals.partially_implemented,
      specified_not_implemented: matrix.totals.specified_not_implemented,
      implemented: matrix.totals.implemented,
      other: matrix.totals.other,
    },
    packetLocalHandlerCount: STAGE150_PACKET_LOCAL_HANDLERS.length,
    batch1: 25,
    batch2: 30,
    eldNonRunnable: 14,
    note: "partially_implemented remains blocking and never counts as fully exercised.",
  };
  writeJson("stage150-implementation-totals.json", totals);

  let tscOk = true;
  let tscExcerpt = "";
  try {
    tscExcerpt = execSync("npx tsc --noEmit --pretty false 2>&1", {
      encoding: "utf8",
      cwd: process.cwd(),
      timeout: 300000,
    });
  } catch (e: unknown) {
    tscOk = false;
    const err = e as { stdout?: string; stderr?: string; message?: string };
    tscExcerpt = `${err.stdout ?? ""}${err.stderr ?? ""}${err.message ?? ""}`;
  }
  writeJson("typescript-baseline.json", {
    schemaVersion: "stage150-typescript-baseline@1.0.0",
    command: "npx tsc --noEmit",
    exitCode: tscOk ? 0 : 1,
    stdoutSha256: sha256(tscExcerpt),
    excerpt: tscExcerpt.slice(0, 4000),
  });

  const headCommit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
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
        baselineCommit: BASELINE,
        baselineBlobId: atBaseline.blobId,
        headCommit,
        headBlobId: atHead.blobId,
        blobUnchanged: atBaseline.blobId != null && atBaseline.blobId === atHead.blobId,
        dirtyVsHead: wt.dirtyVsHead,
      };
    });
  const protectedCompare = {
    schemaVersion: "stage150-brain1-guardian-blob-compare@1.0.0",
    applicationBehaviourChanged: false,
    brain1: describeProtected("Brain 1", brain1Files),
    guardian: describeProtected("Guardian", guardianFiles),
    freezeHashStage50: FREEZE_HASH_STAGE50,
  };
  writeJson("brain1-guardian-blob-compare.json", protectedCompare);
  const brain1Ok = protectedCompare.brain1.every((r) => r.blobUnchanged && !r.dirtyVsHead);
  const guardianOk = protectedCompare.guardian.every((r) => r.blobUnchanged && !r.dirtyVsHead);

  writeJson("stage150-contract-results.json", {
    schemaVersion: "stage150-contract-results@1.1.0",
    note: "Verified by scripts/maa-v2-stage150-batch2-contracts.test.ts + intelligence contracts",
    expectedHandlerContracts: STAGE150_PACKET_LOCAL_HANDLERS.map((h) => ({
      controlId: h.controlId,
      positiveContract: h.positiveContract,
      negativeContract: h.negativeContract,
      unavailableVerdict: h.unavailableVerdict,
    })),
  });

  // Changed-file inventory for this unit (paths only; no secrets)
  const changedFiles = [
    "lib/eval/master-assurance-auditor/v2/stage150/fid10-calibration.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/detector-registry.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch2-selection.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch2-registry.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/multi-exit-map.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/ownership-map.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/eligibility.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix.ts",
    "lib/eval/master-assurance-auditor/v2/stage150/index.ts",
    "scripts/assurance/emit-maa-v2-stage150-batch2.ts",
    "scripts/maa-v2-stage150-batch2-contracts.test.ts",
    "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-batch2/",
  ];

  const stop = {
    schemaVersion: "maa-v2-stage150-batch2-stop@1.0.0",
    title: "STOP FOR CODEX REVIEW — MAA V2 Priority Intelligence Batch 2",
    status: "STAGE150_BATCH2_UNCOMMITTED",
    createdAt: new Date().toISOString(),
    elapsedMs: Date.now() - started,
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
    selected30: BATCH2_SELECTED_30,
    implementationTotals: totals,
    fid10: {
      before: FID10_BEFORE,
      after: fid10After,
      familyCounts,
      remainingUnresolved: remainingUnresolved.length,
      automaticConfirmedDefects: 0,
    },
    receiptTotals,
    candidateFamilies: Object.keys(candidateStringsByControl).sort(),
    multiExit: {
      populationDenominator: exitMap.populationDenominator,
      receiptCount: exitReceipts.length,
      exits: exitMap.exits.map((e) => ({
        exit: e.exit,
        populationDenominator: e.populationDenominator,
        exercisableCount: e.exercisableCount,
        partialCount: e.partialCount,
        notExercisedCount: e.notExercisedCount,
        evidenceObserved: e.evidenceObservedUnion,
        evidenceRequired: e.evidenceRequired,
        evidenceMissing: e.evidenceMissingUnion,
        missingAdapterCounts: e.missingAdapterCounts,
      })),
    },
    readinessGateBlockingReasons: gate.blockingReasons,
    brain1BlobUnchanged: brain1Ok,
    guardianBlobUnchanged: guardianOk,
    typescriptExitCode: tscOk ? 0 : 1,
    blockers: [
      "implementedSubstantiveDetectorCount = 0 of 161 (partials blocking)",
      "Stage-150 denominator minima PENDING_APPROVAL",
      "ELD (14) / LEG / VDR / heavy SRC adapters absent",
      "api/pdf/composed_prose exits not_exercised — missing adapters",
      remainingUnresolved.length > 0
        ? `FID-10 remaining unresolved candidates: ${remainingUnresolved.length} (not confirmed defects)`
        : "FID-10 residual unresolved candidates cleared after calibration",
      "adapterReadinessComplete=false",
    ],
    changedFiles,
    nextSafeCommand:
      "After Codex accept: do not freeze/run Stage 150; commit Batch 2 only if accepted.",
    reviewAsks: [
      "Confirm exact 30 selected controls and reasons.",
      "Confirm FID-10 before/after with zero automatic confirmed defects.",
      "Confirm 499×55 receipts; empty hits ≠ PASS; truthOpened=false.",
      "Confirm multi-exit map never invents absent exits.",
      "Confirm Stage-150 gates remain false; Brain1/Guardian unchanged.",
    ],
    deliverables: [
      "batch2-selected-30.json",
      "esa-multi-exit-capability-map.json",
      "esa-499-exit-capability-receipts.jsonl",
      "stage150-fid10-calibration-report.json",
      "stage150-fid10-occurrence-dispositions.jsonl",
      "stage150-fid10-before-after-map.json",
      "stage150-fid10-remaining-unresolved.json",
      "stage150-fid10-fp-families.json",
      "stage150-499-eligibility-report.json",
      "stage150-499-control-receipts.json",
      "stage150-499-eligibility-case-index.json",
      "stage150-candidate-review-batches.json",
      "stage150-coverage-gap-register.json",
      "stage150-implementation-totals.json",
      "STOP-FOR-CODEX-REVIEW.json",
    ],
  };
  writeJson("STOP-FOR-CODEX-REVIEW.json", stop);

  // Mirror gate without overwriting foundation STOP
  fs.writeFileSync(
    path.join(process.cwd(), "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-execution-readiness-gate.json"),
    JSON.stringify(gate, null, 2) + "\n",
    "utf8",
  );

  console.log(
    JSON.stringify(
      {
        out: OUT.replace(/\\/g, "/"),
        partially_implemented: totals.new.partially_implemented,
        specified_not_implemented: totals.new.specified_not_implemented,
        fid10Before: FID10_BEFORE.unresolvedCandidateOccurrences,
        fid10After: fid10After.unresolvedCandidateOccurrences,
        receipts: receiptTotals,
        gatesFalse: !gate.stage150SampleSelectionAllowed && !gate.stage150ExecutionAllowed,
        brain1Ok,
        guardianOk,
        tscOk,
      },
      null,
      2,
    ),
  );

  void reconcileInventory;
}

main();
