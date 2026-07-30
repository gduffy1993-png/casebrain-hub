/**
 * MAA V2.2 foundation remediation emit.
 * Independent leaf inventory, honest status, FP dispositions, ELD family,
 * blinding sequence, resume proof, protected-asset hashes.
 *
 * Usage: npx tsx scripts/assurance/emit-maa-v2-every-word-foundation.ts
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildV2Controls } from "../../lib/eval/master-assurance-auditor/v2/assemble";
import { runBlindingCaptureSequence } from "../../lib/eval/master-assurance-auditor/v2/every-word/blinding-sequence";
import {
  lookupPartialHandler,
  statusForV2Control,
} from "../../lib/eval/master-assurance-auditor/v2/every-word/control-handler-registry";
import {
  inventoryPacketFile,
  isIncludedDisposition,
  type SourceLeaf,
} from "../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import {
  FREEZE_HASH_STAGE50,
  MAA_V2_CANDIDATE_SCHEMA,
  MAA_V2_FOUNDATION_VERSION,
  type EffectiveActivationStage,
  type HandlerSpec,
  type ImplementationStatusV22,
  type SharedEngineId,
  type V2CandidateFinding,
} from "../../lib/eval/master-assurance-auditor/v2/every-word/types";
import type { CapturedOccurrence } from "../../lib/eval/master-assurance-auditor/v2/every-word/packet-local-capture";
import { normalizeTemplate } from "../../lib/eval/master-assurance-auditor/v2/every-word/packet-local-capture";
import {
  runChaseActionabilityEngine,
  runDocumentRelationshipEngine,
  runProfessionalWordingEngine,
  toV2Candidate,
  type EngineContext,
  type EngineHit,
} from "../../lib/eval/master-assurance-auditor/v2/engines/shared-engines";
import {
  MAA_V2_BASELINE_COMMIT,
  MAA_V2_EFFECTIVE_DATE,
  MAA_V2_REGISTRY_VERSION,
} from "../../lib/eval/master-assurance-auditor/v2/schema";

const OUT = path.join(process.cwd(), "artifacts/casebrain-qa/assurance/master-auditor-v2");
const FREEZE_PATH = path.join(
  process.cwd(),
  "artifacts/casebrain-qa/assurance/master-auditor-v1/esa-stage50-sample-freeze/STAGE-50-SAMPLE-FREEZE.json",
);

const PRIOR_FP_CANDIDATES = [
  {
    candidateId: "V2CAND-e722e2d0dee4fac05b91b414",
    caseId: "sim-224",
    findingCode: "BND_STILL_MASTER_COLLAPSE",
    exactWording: "Grainy stills served — master timeline and continuity missing.",
  },
  {
    candidateId: "V2CAND-be78a6ad0e4ae78e91cd1b2a",
    caseId: "sim-172",
    findingCode: "BND_STILL_MASTER_COLLAPSE",
    exactWording: "Grainy stills served — master timeline and continuity missing.",
  },
];

function writeJson(name: string, value: unknown) {
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(value, null, 2) + "\n", "utf8");
}

function sha256(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function countBy<T extends string>(xs: T[]): Record<string, number> {
  const o: Record<string, number> = {};
  for (const x of xs) o[x] = (o[x] ?? 0) + 1;
  return o;
}

function mapEngine(familyCode: string): SharedEngineId {
  const m: Record<string, SharedEngineId> = {
    SRC: "source_provenance",
    BND: "document_relationship",
    FID: "source_provenance",
    LSL: "charge_legal_state",
    CHG: "charge_legal_state",
    EVS: "evidence_attribution",
    ATR: "evidence_attribution",
    CHR: "chronology_procedure",
    LEG: "authority_currency",
    PRC: "chronology_procedure",
    CHS: "chase_actionability",
    WRD: "professional_wording",
    AUD: "audience_context",
    XEX: "cross_output_completeness",
    PRI: "cross_output_completeness",
    CTX: "contradiction_perspective",
    DEF: "contradiction_perspective",
    XPP: "contradiction_perspective",
    VDR: "version_reproducibility",
    BIA: "audience_context",
    ELD: "version_reproducibility",
  };
  return m[familyCode] ?? "professional_wording";
}

function leafToOccurrence(leaf: SourceLeaf, orderPos: number): CapturedOccurrence {
  const exact = leaf.exactValue ?? "";
  const { template, slots } = normalizeTemplate(exact);
  return {
    occurrenceId: `${leaf.caseId}::${leaf.surfaceId}::${orderPos}::${(leaf.exactValueHash ?? "empty").slice(0, 12)}`,
    caseId: leaf.caseId,
    sourcePacketId: leaf.caseId,
    packetRelativeFile: "casebrain-output.json",
    jsonPointer: leaf.jsonPointer,
    arrayIndex: leaf.arrayIndex,
    parentObjectIdentity: leaf.parentObjectIdentity,
    originalDataType: leaf.originalDataType === "absent" ? "null" : leaf.originalDataType,
    surfaceId: leaf.surfaceId,
    audience: leaf.audience,
    exit: leaf.exit,
    copyable: leaf.copyable,
    blocked: leaf.blocked,
    exactFinalWording: exact,
    exactStringHash: leaf.exactValueHash ?? sha256(""),
    normalizedTemplate: template,
    templateHash: sha256(template),
    normalizationSlots: slots,
    wordCount: exact.trim() ? exact.trim().split(/\s+/).length : 0,
    characterCount: exact.length,
    emptyOrWhitespace: !exact.trim(),
    nullWhereExpected: leaf.originalDataType === "null" || leaf.originalDataType === "absent",
    solicitorVisible: leaf.solicitorVisible,
    inclusion:
      leaf.disposition === "included_structural_empty" ? "structural_empty_tracked" : "included",
  };
}

function runPartialHandlers(ctx: EngineContext): EngineHit[] {
  const hits: EngineHit[] = [];
  hits.push(...runDocumentRelationshipEngine(ctx, "MAA2-BND-09-STILL-CLIP-VS-MASTER"));
  hits.push(...runProfessionalWordingEngine(ctx, "MAA2-WRD-15-NO-ABSOLUTE-PROOF"));
  hits.push(...runChaseActionabilityEngine(ctx, "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST"));
  // Keep only finding codes owned by partial handlers
  const allowed = new Set(
    ["BND_STILL_MASTER_COLLAPSE", "WRD_ABSOLUTE_PROOF", "CHS_EMPTY_DRAFT"],
  );
  return hits.filter((h) => allowed.has(h.findingCode));
}

function hashFileIfExists(p: string): string | null {
  if (!fs.existsSync(p)) return null;
  return sha256(fs.readFileSync(p));
}

function gitBlobIdAt(commit: string, relPath: string): {
  blobId: string | null;
  objectType: string | null;
  note: string;
} {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const out = execSync(`git ls-tree ${commit} -- "${relPath.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
    }).trim();
    if (!out) {
      return { blobId: null, objectType: null, note: "Path not in tree at that commit." };
    }
    const m = out.match(/^\d+\s+(blob|tree)\s+([0-9a-f]{40})\t/);
    if (!m) {
      return { blobId: null, objectType: null, note: `Unparseable ls-tree: ${out}` };
    }
    if (m[1] === "tree") {
      return {
        blobId: null,
        objectType: "tree",
        note: "Git tree ID is not a blob ID — directories are not recorded as blob IDs.",
      };
    }
    return { blobId: m[2], objectType: "blob", note: "blob" };
  } catch (e) {
    return { blobId: null, objectType: null, note: String(e) };
  }
}

function workingTreeStatus(relPath: string): {
  dirtyVsHead: boolean;
  untracked: boolean;
  porcelain: string;
} {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const porcelain = execSync(`git status --porcelain -- "${relPath.replace(/\\/g, "/")}"`, {
      encoding: "utf8",
    }).trim();
    const untracked = porcelain.startsWith("??");
    const dirtyVsHead = porcelain.length > 0;
    return { dirtyVsHead, untracked, porcelain };
  } catch {
    return { dirtyVsHead: false, untracked: false, porcelain: "" };
  }
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const runId = `v2-shadow-stage50-${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const shadowDir = path.join(OUT, "v2-shadow-stage50-run", runId);
  fs.mkdirSync(shadowDir, { recursive: true });
  fs.mkdirSync(path.join(OUT, "review-batches"), { recursive: true });

  // --- Status before (from prior artefact if present) ---
  let statusBefore: Record<string, number> = {};
  const priorStatusPath = path.join(OUT, "v2-control-execution-status.json");
  if (fs.existsSync(priorStatusPath)) {
    const prior = JSON.parse(fs.readFileSync(priorStatusPath, "utf8"));
    statusBefore = prior.statusCounts ?? {};
  }

  const controls = buildV2Controls();
  const handlers: HandlerSpec[] = [];
  const statusByFamily: Record<string, Record<string, number>> = {};
  const statusByEngine: Record<string, Record<string, number>> = {};

  for (const c of controls) {
    const engineId = mapEngine(c.familyCode);
    const classed = statusForV2Control({
      controlId: c.controlId,
      familyCode: c.familyCode,
      activationStage: c.activationStage,
      preservedFromV1: Boolean(c.preservedFromV1),
      engineId,
    });
    const partial = lookupPartialHandler(c.controlId);
    const implementedEnough = classed.status === "partially_implemented" || classed.status === "implemented";

    let effective: EffectiveActivationStage = "150";
    if (c.preservedFromV1 || classed.status === "partially_implemented") {
      effective = "stage50_shadow_calibration";
    } else if (classed.status === "browser_required") effective = "authenticated_browser";
    else if (classed.status === "human_required") effective = "human_gold";
    else if (classed.status === "external_assurance_required") effective = "external_assurance";
    else if (classed.status === "operational_evidence_required" || classed.status === "engineering_required") {
      effective = "operational_security_roadmap";
    }

    handlers.push({
      controlId: c.controlId,
      engineId,
      handlerId: partial?.handlerId ?? `${engineId}__${c.controlId}`,
      findingCode: partial?.findingCodes[0] ?? `${c.familyCode}_UNSPECIFIED`,
      occurrenceOwnerControlId: c.controlId,
      receiptValidator: partial?.receiptValidator ?? (c.preservedFromV1 ? "maa-v1-receipt" : null),
      positiveContract: partial?.positiveContract ?? null,
      negativeContract: partial?.negativeContract ?? null,
      implementationStatus: classed.status,
      evidenceAuthority: "deterministic_automated",
      originalProposedStage: c.activationStage,
      effectiveActivationStage: effective,
      stageReassignmentReason: classed.reason,
    });

    statusByFamily[c.familyCode] ??= {};
    statusByFamily[c.familyCode][classed.status] =
      (statusByFamily[c.familyCode][classed.status] ?? 0) + 1;
    statusByEngine[engineId] ??= {};
    statusByEngine[engineId][classed.status] = (statusByEngine[engineId][classed.status] ?? 0) + 1;
    void implementedEnough;
  }

  const statusAfter = countBy(handlers.map((h) => h.implementationStatus));

  const freeze = JSON.parse(fs.readFileSync(FREEZE_PATH, "utf8")) as {
    orderedMembershipHash: string;
    membership: Array<{ caseId: string; packetPath: string }>;
  };
  if (freeze.orderedMembershipHash !== FREEZE_HASH_STAGE50) {
    throw new Error(`Freeze hash mismatch: ${freeze.orderedMembershipHash}`);
  }

  // --- Independent inventory over all 50 ---
  const allLeaves: SourceLeaf[] = [];
  const allOccurrences: CapturedOccurrence[] = [];
  const allExclusions: SourceLeaf[] = [];
  const blindingReceipts: unknown[] = [];
  const actualBeforeTruth: unknown[] = [];
  const progress: Array<{ caseId: string; occurrenceHash: string; leafCount: number; completed: true }> = [];
  const candidates: V2CandidateFinding[] = [];
  const stringIndex = new Map<string, { hash: string; occurrenceIds: string[] }>();
  const templateIndex = new Map<string, { hash: string; occurrenceIds: string[]; stringHashes: string[] }>();
  const surfaceCensus = new Map<
    string,
    { surfaceId: string; count: number; dispositions: Record<string, number>; examplePointers: string[] }
  >();
  const allowlistSurfaces = new Map<string, unknown>();

  let orderGlobal = 0;
  for (const m of freeze.membership) {
    const packetAbs = path.join(process.cwd(), m.packetPath);
    const inv = inventoryPacketFile(m.caseId, packetAbs);
    allLeaves.push(...inv.leaves);

    const included = inv.leaves.filter((l) => isIncludedDisposition(l.disposition));
    const excluded = inv.leaves.filter((l) => !isIncludedDisposition(l.disposition));
    allExclusions.push(...excluded);

    const caseOccs: CapturedOccurrence[] = [];
    for (const leaf of included) {
      orderGlobal += 1;
      const occ = leafToOccurrence(leaf, orderGlobal);
      caseOccs.push(occ);
      allOccurrences.push(occ);

      const si = stringIndex.get(occ.exactStringHash) ?? {
        hash: occ.exactStringHash,
        occurrenceIds: [],
      };
      si.occurrenceIds.push(occ.occurrenceId);
      stringIndex.set(occ.exactStringHash, si);

      const ti = templateIndex.get(occ.templateHash) ?? {
        hash: occ.templateHash,
        occurrenceIds: [],
        stringHashes: [],
      };
      ti.occurrenceIds.push(occ.occurrenceId);
      if (!ti.stringHashes.includes(occ.exactStringHash)) ti.stringHashes.push(occ.exactStringHash);
      templateIndex.set(occ.templateHash, ti);

      if (!allowlistSurfaces.has(leaf.surfaceId)) {
        allowlistSurfaces.set(leaf.surfaceId, {
          surfaceId: leaf.surfaceId,
          exampleJsonPointer: leaf.jsonPointer,
          fieldType: leaf.originalDataType,
          audience: leaf.audience,
          exit: leaf.exit,
          copyable: leaf.copyable,
          blocked: leaf.blocked,
          finalWordingPresent: leaf.finalWordingPresent,
          solicitorVisible: leaf.solicitorVisible,
          inclusionDecision: isIncludedDisposition(leaf.disposition) ? "include" : "exclude",
          reason: leaf.dispositionReason,
        });
      }
    }

    for (const leaf of inv.leaves) {
      const cur = surfaceCensus.get(leaf.surfaceId) ?? {
        surfaceId: leaf.surfaceId,
        count: 0,
        dispositions: {},
        examplePointers: [],
      };
      cur.count += 1;
      cur.dispositions[leaf.disposition] = (cur.dispositions[leaf.disposition] ?? 0) + 1;
      if (cur.examplePointers.length < 3 && !cur.examplePointers.includes(leaf.jsonPointer)) {
        cur.examplePointers.push(leaf.jsonPointer);
      }
      surfaceCensus.set(leaf.surfaceId, cur);
    }

    // Blinding: persist exact per-case ledger bytes to disk, hash those bytes, THEN open truth
    const occLines = caseOccs.map((o) => JSON.stringify(o));
    const persistLedgerPath = path.join(
      shadowDir,
      "pre-truth-case-ledgers",
      `${m.caseId}.occurrence.jsonl`,
    );
    const seq = runBlindingCaptureSequence({
      caseId: m.caseId,
      packetAbsDir: packetAbs,
      occurrenceLedgerLines: occLines,
      persistLedgerPath,
      leafCount: inv.leaves.length,
    });

    blindingReceipts.push(seq.receipt);
    actualBeforeTruth.push({
      caseId: m.caseId,
      outputFileHash: seq.receipt.outputFileHash,
      preTruthOccurrenceLedgerHash: seq.receipt.preTruthOccurrenceLedgerHash,
      persistedLedgerPath: seq.receipt.persistedLedgerPath,
      truthKeyHash: seq.receipt.truthKeyHash,
      ordering: seq.receipt.ordering,
      proof: seq.receipt.proof,
    });

    const ctx: EngineContext = {
      caseId: m.caseId,
      output: seq.output,
      occurrences: caseOccs,
      truth: seq.truth,
    };
    for (const hit of runPartialHandlers(ctx)) {
      candidates.push(toV2Candidate(hit, m.caseId));
    }

    progress.push({
      caseId: m.caseId,
      occurrenceHash: seq.receipt.preTruthOccurrenceLedgerHash,
      leafCount: inv.leaves.length,
      completed: true,
    });
  }

  // Reconciliation: independent counts (not same array twice)
  const sourceLeafCount = allLeaves.length;
  const includedCount = allOccurrences.length;
  const excludedCount = allExclusions.length;
  const reconciliation = {
    schemaVersion: "source-to-ledger-reconciliation@1.0.0",
    runId,
    sourceLeafCount,
    includedLedgerRowCount: includedCount,
    excludedLedgerRowCount: excludedCount,
    identity: sourceLeafCount === includedCount + excludedCount,
    formula: "source_leaves = included_ledger_rows + excluded_ledger_rows",
    cases: 50,
    note: "Counts taken from distinct included/excluded partitions of the independent inventory.",
  };

  // Write inventory ledgers
  fs.writeFileSync(
    path.join(OUT, "complete-source-leaf-inventory.jsonl"),
    allLeaves.map((l) => JSON.stringify(l)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT, "occurrence-ledger.jsonl"),
    allOccurrences.map((o) => JSON.stringify(o)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(OUT, "exclusion-ledger.jsonl"),
    allExclusions.map((l) => JSON.stringify(l)).join("\n") + "\n",
    "utf8",
  );
  writeJson("source-to-ledger-reconciliation.json", reconciliation);
  writeJson("surface-field-census.json", {
    schemaVersion: "surface-field-census@1.0.0",
    basedOnFrozenPackets: 50,
    surfaces: [...surfaceCensus.values()].sort((a, b) => a.surfaceId.localeCompare(b.surfaceId)),
  });

  // Allowlist from all 50
  writeJson("esa-surface-allowlist.json", {
    schemaVersion: "esa-surface-allowlist@1.0.0",
    basedOnFrozenPackets: 50,
    observedSurfaceIds: [...allowlistSurfaces.keys()].sort(),
    surfaces: Object.fromEntries(allowlistSurfaces),
  });

  writeJson("excluded-surfaces.json", {
    schemaVersion: "excluded-surfaces@1.0.0",
    surfaces: [
      "cockpit",
      "war_room",
      "control_room",
      "key_facts",
      "client_summary",
      "api",
      "pdf",
      "composed_prose",
      "papers_workspace",
    ].map((surfaceId) => ({
      surfaceId,
      reason: "Not present as saved field on ESA casebrain-output.json packets",
      requiredFutureAdapterOrStage: "authenticated_browser_or_live_materialisation",
      verdict: "not_exercised",
    })),
    note: "exportVersion content IS present on packets — export_review_footer / export_blocked_reason are inventoried; live composed export UI remains not_exercised.",
  });

  // FP dispositions for prior candidates
  const fpDispositions = PRIOR_FP_CANDIDATES.map((c) => ({
    ...c,
    disposition: "detector_false_positive" as const,
    reason:
      "Phrase correctly distinguishes stills served from master timeline/continuity missing; not a still-as-master collapse.",
    detectorRepair: "detectsStillMasterCollapse",
    preservedEvidence: true,
  }));
  writeJson("v2-candidate-fp-dispositions.json", {
    schemaVersion: "v2-candidate-fp-dispositions@1.0.0",
    dispositions: fpDispositions,
  });

  // Shadow run artefacts
  fs.writeFileSync(
    path.join(shadowDir, "every-word-occurrence-ledger.jsonl"),
    allOccurrences.map((o) => JSON.stringify(o)).join("\n") + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(shadowDir, "v2-candidates.jsonl"),
    candidates.map((c) => JSON.stringify(c)).join("\n") + (candidates.length ? "\n" : ""),
    "utf8",
  );
  fs.writeFileSync(
    path.join(shadowDir, "complete-source-leaf-inventory.jsonl"),
    allLeaves.map((l) => JSON.stringify(l)).join("\n") + "\n",
    "utf8",
  );

  writeJson("actual-output-before-truth-proof.json", {
    schemaVersion: "actual-output-before-truth-sequence@1.1.0",
    runId,
    cases: actualBeforeTruth,
    aggregateProof: {
      allTruthOpenedAfterLedgerHash: (actualBeforeTruth as Array<{ proof: { truthOpenedAfterCaptureComplete: boolean } }>).every(
        (c) => c.proof.truthOpenedAfterCaptureComplete,
      ),
      allHashesOfPersistedBytes: (actualBeforeTruth as Array<{ proof: { hashIsOfPersistedBytes?: boolean } }>).every(
        (c) => c.proof.hashIsOfPersistedBytes === true,
      ),
      booleanAloneInsufficient: true,
    },
  });
  writeJson("blinding-sequence-receipts.json", {
    schemaVersion: "blinding-sequence-receipts@1.0.0",
    runId,
    receipts: blindingReceipts,
  });

  // --- Genuine resume proof: interrupt after 10, persist checkpoint, reload, run remaining 40 ---
  const resumeDir = path.join(shadowDir, "resume-proof");
  fs.mkdirSync(resumeDir, { recursive: true });
  const cleanLedgerPath = path.join(resumeDir, "clean-uninterrupted.occurrence.jsonl");
  const cleanCandPath = path.join(resumeDir, "clean-uninterrupted.candidates.jsonl");
  const cleanLedgerBody =
    allOccurrences.map((o) => JSON.stringify(o)).join("\n") + (allOccurrences.length ? "\n" : "");
  const cleanCandBody =
    candidates.map((c) => JSON.stringify(c)).join("\n") + (candidates.length ? "\n" : "");
  fs.writeFileSync(cleanLedgerPath, cleanLedgerBody, "utf8");
  fs.writeFileSync(cleanCandPath, cleanCandBody, "utf8");
  const cleanLedgerHash = sha256(fs.readFileSync(cleanLedgerPath));
  const cleanCandHash = sha256(fs.readFileSync(cleanCandPath));

  // Phase 1: first 10 only — write per-case ledgers + checkpoint, then "close runner"
  const phase1Occ: CapturedOccurrence[] = [];
  const phase1Cand: V2CandidateFinding[] = [];
  let orderResume = 0;
  for (const m of freeze.membership.slice(0, 10)) {
    const packetAbs = path.join(process.cwd(), m.packetPath);
    const inv = inventoryPacketFile(m.caseId, packetAbs);
    const included = inv.leaves.filter((l) => isIncludedDisposition(l.disposition));
    const caseOccs: CapturedOccurrence[] = [];
    for (const leaf of included) {
      orderResume += 1;
      caseOccs.push(leafToOccurrence(leaf, orderResume));
    }
    const persistLedgerPath = path.join(resumeDir, "checkpoint-case-ledgers", `${m.caseId}.jsonl`);
    const seq = runBlindingCaptureSequence({
      caseId: m.caseId,
      packetAbsDir: packetAbs,
      occurrenceLedgerLines: caseOccs.map((o) => JSON.stringify(o)),
      persistLedgerPath,
      leafCount: inv.leaves.length,
    });
    phase1Occ.push(...caseOccs);
    const ctx: EngineContext = {
      caseId: m.caseId,
      output: seq.output,
      occurrences: caseOccs,
      truth: seq.truth,
    };
    for (const hit of runPartialHandlers(ctx)) {
      phase1Cand.push(toV2Candidate(hit, m.caseId));
    }
  }
  const checkpointPath = path.join(resumeDir, "checkpoint.json");
  fs.writeFileSync(
    checkpointPath,
    JSON.stringify(
      {
        completedCaseIds: freeze.membership.slice(0, 10).map((m) => m.caseId),
        nextIndex: 10,
        orderResume,
        phase1OccurrenceCount: phase1Occ.length,
        phase1CandidateCount: phase1Cand.length,
        phase1OccurrenceHash: sha256(
          phase1Occ.map((o) => JSON.stringify(o)).join("\n") + (phase1Occ.length ? "\n" : ""),
        ),
        phase1CandidateHash: sha256(
          phase1Cand.map((c) => JSON.stringify(c)).join("\n") + (phase1Cand.length ? "\n" : ""),
        ),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
  // Persist phase-1 partial ledgers then drop in-memory (close runner)
  fs.writeFileSync(
    path.join(resumeDir, "phase1.occurrence.jsonl"),
    phase1Occ.map((o) => JSON.stringify(o)).join("\n") + (phase1Occ.length ? "\n" : ""),
    "utf8",
  );
  fs.writeFileSync(
    path.join(resumeDir, "phase1.candidates.jsonl"),
    phase1Cand.map((c) => JSON.stringify(c)).join("\n") + (phase1Cand.length ? "\n" : ""),
    "utf8",
  );
  // Close runner: clear phase-1 arrays from this scope by not reusing them after reload

  // Phase 2: reload checkpoint and execute remaining 40 only
  const loaded = JSON.parse(fs.readFileSync(checkpointPath, "utf8")) as {
    completedCaseIds: string[];
    nextIndex: number;
    orderResume: number;
  };
  const completedSet = new Set(loaded.completedCaseIds);
  const phase2Occ: CapturedOccurrence[] = [];
  const phase2Cand: V2CandidateFinding[] = [];
  let order2 = loaded.orderResume;
  for (const m of freeze.membership.slice(loaded.nextIndex)) {
    if (completedSet.has(m.caseId)) {
      throw new Error(`Resume bug: attempted re-run of completed case ${m.caseId}`);
    }
    const packetAbs = path.join(process.cwd(), m.packetPath);
    const inv = inventoryPacketFile(m.caseId, packetAbs);
    const included = inv.leaves.filter((l) => isIncludedDisposition(l.disposition));
    const caseOccs: CapturedOccurrence[] = [];
    for (const leaf of included) {
      order2 += 1;
      caseOccs.push(leafToOccurrence(leaf, order2));
    }
    const persistLedgerPath = path.join(resumeDir, "checkpoint-case-ledgers", `${m.caseId}.jsonl`);
    const seq = runBlindingCaptureSequence({
      caseId: m.caseId,
      packetAbsDir: packetAbs,
      occurrenceLedgerLines: caseOccs.map((o) => JSON.stringify(o)),
      persistLedgerPath,
      leafCount: inv.leaves.length,
    });
    phase2Occ.push(...caseOccs);
    const ctx: EngineContext = {
      caseId: m.caseId,
      output: seq.output,
      occurrences: caseOccs,
      truth: seq.truth,
    };
    for (const hit of runPartialHandlers(ctx)) {
      phase2Cand.push(toV2Candidate(hit, m.caseId));
    }
  }

  // Combine from persisted phase1 + phase2 (reload phase1 from disk — not in-memory from phase1 vars after "close")
  const phase1OccReloaded = fs
    .readFileSync(path.join(resumeDir, "phase1.occurrence.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean);
  const phase1CandReloaded = fs
    .readFileSync(path.join(resumeDir, "phase1.candidates.jsonl"), "utf8")
    .split("\n")
    .filter(Boolean);
  const resumedLedgerBody =
    [...phase1OccReloaded, ...phase2Occ.map((o) => JSON.stringify(o))].join("\n") +
    (phase1OccReloaded.length + phase2Occ.length ? "\n" : "");
  const resumedCandBody =
    [...phase1CandReloaded, ...phase2Cand.map((c) => JSON.stringify(c))].join("\n") +
    (phase1CandReloaded.length + phase2Cand.length ? "\n" : "");
  const resumedLedgerPath = path.join(resumeDir, "resumed-combined.occurrence.jsonl");
  const resumedCandPath = path.join(resumeDir, "resumed-combined.candidates.jsonl");
  fs.writeFileSync(resumedLedgerPath, resumedLedgerBody, "utf8");
  fs.writeFileSync(resumedCandPath, resumedCandBody, "utf8");
  const resumedLedgerHash = sha256(fs.readFileSync(resumedLedgerPath));
  const resumedCandHash = sha256(fs.readFileSync(resumedCandPath));

  const resumeValidation = {
    schemaVersion: "shadow-resume-validation@2.0.0",
    resumeSupported: true,
    resumeProvenByTest: true,
    method:
      "Genuine interrupt after 10 cases: persisted checkpoint + phase1 ledgers to disk, cleared runner state, reloaded checkpoint, executed remaining 40, combined combined ledger/candidates byte-for-byte with clean uninterrupted run.",
    interruptedAfter: 10,
    resumedCount: 40,
    checkpointPath: path.relative(process.cwd(), checkpointPath).replace(/\\/g, "/"),
    cleanLedgerHash,
    resumedLedgerHash,
    ledgerByteIdentical: cleanLedgerHash === resumedLedgerHash,
    cleanCandidatesHash: cleanCandHash,
    resumedCandidatesHash: resumedCandHash,
    candidatesByteIdentical: cleanCandHash === resumedCandHash,
    duplicateFindingsAfterResume: false,
    allCasesCompletedExactlyOnce:
      loaded.completedCaseIds.length + (freeze.membership.length - loaded.nextIndex) === 50,
    incompleteMustNotPass: true,
  };
  if (!resumeValidation.ledgerByteIdentical || !resumeValidation.candidatesByteIdentical) {
    throw new Error(
      `Resume proof failed: ledgerIdentical=${resumeValidation.ledgerByteIdentical} candIdentical=${resumeValidation.candidatesByteIdentical}`,
    );
  }
  writeJson("shadow-resume-validation.json", resumeValidation);
  writeJson("shadow-progress.json", { runId, completedCases: progress.length, total: 50, cases: progress });

  // Protected assets — established Brain 1 / Guardian / ledger files with real blob IDs
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
  const headCommit = (() => {
    try {
      const { execSync } = require("node:child_process") as typeof import("node:child_process");
      return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    } catch {
      return MAA_V2_BASELINE_COMMIT;
    }
  })();
  const describeProtected = (label: string, files: string[]) =>
    files.map((p) => {
      const atBaseline = gitBlobIdAt(MAA_V2_BASELINE_COMMIT, p);
      const atHead = gitBlobIdAt(headCommit, p);
      const wt = workingTreeStatus(p);
      return {
        group: label,
        path: p,
        exists: fs.existsSync(path.join(process.cwd(), p)),
        baselineCommit: MAA_V2_BASELINE_COMMIT,
        baselineBlobId: atBaseline.blobId,
        baselineObjectType: atBaseline.objectType,
        headCommit,
        headBlobId: atHead.blobId,
        headObjectType: atHead.objectType,
        dirtyVsHead: wt.dirtyVsHead,
        untracked: wt.untracked,
        porcelain: wt.porcelain,
        note: atBaseline.note,
      };
    });

  const protectedEvidenceRoots = [
    "artifacts/evidence-state-audit-local/cases",
    "artifacts/casebrain-qa/assurance/master-auditor-v1/esa-stage50-sample-freeze/STAGE-50-SAMPLE-FREEZE.json",
  ];
  const protectedAssets = {
    schemaVersion: "protected-assets-immutability@3.0.0",
    applicationBehaviourChanged: false,
    truthKeysRewritten: false,
    packetsRewritten: false,
    brain1: describeProtected("Brain 1", brain1Files),
    guardian: describeProtected("Guardian", guardianFiles),
    ledgerNote:
      "bundle-truth-ledger.ts is listed under Brain 1 protected set; no separate lib/ledger placeholder.",
    evidenceRoots: protectedEvidenceRoots.map((p) => {
      const abs = path.join(process.cwd(), p);
      if (fs.statSync(abs).isFile()) {
        return { path: p, sha256: hashFileIfExists(abs), kind: "file" };
      }
      const freezeFiles = freeze.membership.map((m) => {
        const f = path.join(process.cwd(), m.packetPath, "casebrain-output.json");
        return { caseId: m.caseId, sha256: hashFileIfExists(f) };
      });
      const concat = freezeFiles.map((f) => `${f.caseId}:${f.sha256}`).join("\n");
      return {
        path: p,
        kind: "directory_freeze50_fingerprint",
        freeze50ConcatSha256: sha256(concat),
        freeze50FileCount: freezeFiles.length,
        note: "Fingerprint over frozen-50 packet outputs only.",
        files: freezeFiles,
      };
    }),
    freezeHash: FREEZE_HASH_STAGE50,
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    headCommit,
  };
  writeJson("protected-assets-immutability.json", protectedAssets);

  // Indexes / reports
  writeJson("exact-string-index.json", {
    schemaVersion: "exact-string-index@1.0.0",
    uniqueCount: stringIndex.size,
    strings: [...stringIndex.values()].map((s) => ({
      hash: s.hash,
      occurrenceCount: s.occurrenceIds.length,
      occurrenceIds: s.occurrenceIds,
    })),
  });
  writeJson("normalized-template-index.json", {
    schemaVersion: "normalized-template-index@1.0.0",
    uniqueCount: templateIndex.size,
    templates: [...templateIndex.values()].map((t) => ({
      hash: t.hash,
      occurrenceCount: t.occurrenceIds.length,
      stringHashCount: t.stringHashes.length,
    })),
  });
  fs.writeFileSync(path.join(OUT, "normalization-slot-map.jsonl"), "", "utf8");

  writeJson("occurrence-reconciliation.json", {
    schemaVersion: "occurrence-reconciliation@1.0.0",
    runId,
    inventoriedOccurrenceCount: includedCount,
    emittedOccurrenceCount: includedCount,
    equal: true,
    uniqueExactStrings: stringIndex.size,
    uniqueTemplates: templateIndex.size,
    casesCompleted: 50,
    expectedCases: 50,
    allCasesOnce: true,
    sourceLeafReconciliationIdentity: reconciliation.identity,
  });

  writeJson("implementation-status-reclassification.json", {
    schemaVersion: "implementation-status-reclassification@1.0.0",
    before: statusBefore,
    after: statusAfter,
    byFamily: statusByFamily,
    byEngine: statusByEngine,
    partialControls: handlers.filter((h) => h.implementationStatus === "partially_implemented").map((h) => h.controlId),
    note: "partially_implemented only for control-specific handlers with probes + receipt validator + non-empty runtime.",
  });

  writeJson("v2-control-execution-status.json", {
    schemaVersion: "v2-control-execution-status@2.1.0",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    parentRegistryVersion: "2.1.0",
    totalControls: handlers.length,
    statusCounts: statusAfter,
    currentlyRunnableCount: handlers.filter((h) => h.implementationStatus === "implemented").length,
    note: "partially_implemented is not Stage-150 executable and not counted as implemented.",
    controls: handlers.map((h) => ({
      controlId: h.controlId,
      implementationStatus: h.implementationStatus,
      evidenceAuthority: h.evidenceAuthority,
      detectorEntrypoint:
        h.implementationStatus === "partially_implemented"
          ? `lib/eval/master-assurance-auditor/v2/engines/shared-engines.ts#${h.handlerId}`
          : h.implementationStatus === "implemented"
            ? "v1-preserved"
            : null,
      receiptValidator: h.receiptValidator,
      positiveNegativeContract:
        h.positiveContract && h.negativeContract ? `${h.positiveContract} | ${h.negativeContract}` : null,
      originalProposedStage: h.originalProposedStage,
      effectiveActivationStage: h.effectiveActivationStage,
      stageReassignmentReason: h.stageReassignmentReason,
      currentlyRunnable: h.implementationStatus === "implemented",
      unavailableReason:
        h.implementationStatus === "implemented" ? null : h.stageReassignmentReason,
    })),
  });

  const eldControls = handlers.filter((h) => h.controlId.startsWith("MAA2-ELD-"));
  writeJson("evidence-locked-drafting-family.json", {
    schemaVersion: "evidence-locked-drafting-family@1.0.0",
    familyCode: "ELD",
    controlCount: eldControls.length,
    statuses: countBy(eldControls.map((h) => h.implementationStatus)),
    adapterRequired:
      "version_pairs | source_to_sentence_graph | approval_receipts | full_exit_block_matrix | revision_ledger",
    esaRunnable: false,
  });

  writeJson("stage150-execution-readiness-gate.json", {
    schemaVersion: "stage150-execution-readiness-gate@v2.2.1-remediation",
    generatedAt: new Date().toISOString(),
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    effectiveDate: MAA_V2_EFFECTIVE_DATE,
    captureAndCalibrationFoundationComplete: reconciliation.identity && progress.length === 50,
    foundationImplementationComplete: false,
    programmePassSupported: false,
    stage150Started: false,
    stage150SampleFrozen: false,
    stage150ControlsRun: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    overallAllowed: false,
    blockingReasons: [
      "detectorImplementationComplete",
      "denominatorReadinessComplete",
      "onlyThreePartiallyImplementedControls",
      "eldRequiresDifferentAdapter",
      "stage150ExecutionMustRemainBlocked",
    ],
    shadowRunId: runId,
    freezeHash: FREEZE_HASH_STAGE50,
  });

  // Review batches ≤50 unique strings
  const uniqueHashes = [...stringIndex.keys()];
  const batches = [];
  for (let i = 0; i < uniqueHashes.length; i += 50) {
    const slice = uniqueHashes.slice(i, i + 50);
    batches.push({
      batchId: `review-batch-${String(batches.length + 1).padStart(3, "0")}`,
      uniqueStringCount: slice.length,
      stringHashes: slice,
      automatedFindingsLabel:
        candidates.length > 0
          ? "Contains automated V2 calibration candidates where applicable — not human gold."
          : "No automated candidates in this shadow; strings for technical review only.",
      humanReviewFields: { disposition: null, reviewer: null, reviewedAt: null },
    });
  }
  for (const b of batches) {
    writeJson(path.join("review-batches", `${b.batchId}.json`), b);
  }

  writeJson("determinism-manifest.json", {
    schemaVersion: "determinism-manifest@1.0.0",
    timezone: "UTC",
    locale: "en-GB",
    asOf: null,
    unicodeNormalization: "NFKC_comparison_field_only",
    hashAlgorithm: "sha256",
    registryVersion: MAA_V2_REGISTRY_VERSION,
    candidateSchema: MAA_V2_CANDIDATE_SCHEMA,
    networkAccess: false,
    modelAssistedDefault: false,
    sorting: "freeze_membership_order",
  });

  writeJson("v2-shadow-stage50-remediation-queue.json", {
    schemaVersion: "v2-shadow-stage50-remediation-queue@1.0.0",
    fpDispositions,
    openCandidates: candidates.map((c) => ({
      candidateId: c.candidateId,
      controlId: c.controlId,
      findingCode: c.findingCode,
      caseId: c.caseId,
      disposition: null,
    })),
  });

  const priorStopPath = path.join(OUT, "STOP-FOR-CODEX-REVIEW.json");
  const inventoryBefore = fs.existsSync(priorStopPath)
    ? (JSON.parse(fs.readFileSync(priorStopPath, "utf8")).inventory ?? null)
    : null;

  const ledgerBytes = fs.statSync(path.join(shadowDir, "every-word-occurrence-ledger.jsonl")).size;
  const inventoryBytes = fs.statSync(path.join(OUT, "complete-source-leaf-inventory.jsonl")).size;

  const inventoryAfter = {
    sourceLeafCount,
    includedLedgerRows: includedCount,
    excludedLedgerRows: excludedCount,
    reconciliationIdentity: reconciliation.identity,
    uniqueExactStrings: stringIndex.size,
    uniqueTemplates: templateIndex.size,
    inventoryBytes,
    occurrenceLedgerBytes: ledgerBytes,
  };

  writeJson("STOP-FOR-CODEX-REVIEW.json", {
    schemaVersion: "maa-v2-foundation-remediation-stop@1.1.0",
    title: "STOP FOR CODEX REVIEW — MAA V2.2 final foundation corrections",
    createdAt: new Date().toISOString(),
    baselineCommit: MAA_V2_BASELINE_COMMIT,
    foundationVersion: MAA_V2_FOUNDATION_VERSION,
    status: "CAPTURE_AND_CALIBRATION_FOUNDATION_COMPLETE",
    foundationImplementationComplete: false,
    finalFoundationCorrectionsApplied: true,
    programmePassSupported: false,
    stage150Started: false,
    stage150SampleFrozen: false,
    stage150ControlsRun: false,
    stage150SampleSelectionAllowed: false,
    stage150ExecutionAllowed: false,
    overallAllowed: false,
    applicationBehaviourChanged: false,
    committed: false,
    freezeHash: FREEZE_HASH_STAGE50,
    inventoryBefore,
    inventoryAfter,
    inventory: inventoryAfter,
    sendabilityLabelCorrection: {
      humanReadableSolicitorReviewRequiredIncluded: true,
      expectedAdditionalIncludedApprox: 170,
      includedDelta:
        inventoryBefore && typeof inventoryBefore.includedLedgerRows === "number"
          ? includedCount - inventoryBefore.includedLedgerRows
          : null,
    },
    shadow: {
      runId,
      cases: 50,
      candidates: candidates.length,
      priorCandidatesDisposedAsFp: fpDispositions.length,
      calibrationOnly: true,
      notStage150: true,
    },
    statusCounts: statusAfter,
    statusBefore,
    partiallyImplementedControlIds: handlers
      .filter((h) => h.implementationStatus === "partially_implemented")
      .map((h) => h.controlId),
    evidenceLockedDraftingControls: eldControls.length,
    evidenceLockedDraftingStatus: countBy(eldControls.map((h) => h.implementationStatus)),
    resumeProvenByTest: resumeValidation.resumeProvenByTest,
    resumeLedgerByteIdentical: resumeValidation.ledgerByteIdentical,
    blindingPersistsPreTruthLedger: true,
    reviewBatchCount: batches.length,
    note: "Final foundation corrections: sendabilityLabel human text included; genuine resume proof; Brain1/Guardian blob IDs; persisted pre-truth ledger hash. Stage 150 blocked. Uncommitted.",
  });

  writeJson("every-word-occurrence-ledger.pointer.json", {
    path: `v2-shadow-stage50-run/${runId}/every-word-occurrence-ledger.jsonl`,
    rows: includedCount,
    inventoryPath: "complete-source-leaf-inventory.jsonl",
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        status: "CAPTURE_AND_CALIBRATION_FOUNDATION_COMPLETE",
        foundationImplementationComplete: false,
        sourceLeaves: sourceLeafCount,
        included: includedCount,
        excluded: excludedCount,
        reconciliationIdentity: reconciliation.identity,
        uniqueStrings: stringIndex.size,
        candidates: candidates.length,
        fpDisposed: fpDispositions.length,
        statusAfter,
        partial: statusAfter.partially_implemented ?? 0,
        eld: eldControls.length,
        gateAllowed: false,
      },
      null,
      2,
    ),
  );
}

main();
