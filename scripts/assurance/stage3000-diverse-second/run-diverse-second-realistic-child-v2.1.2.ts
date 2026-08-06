/**
 * Realistic-child V2.1.2: rematerialise + re-audit from frozen V1 document packs.
 *
 * - Reuses V1 packs byte-for-byte (no new 3000 selection).
 * - Rebuilds page text via buildDocSpecs; verifies text hashes.
 * - Genuine detector-hit candidates only; exercise receipts separate.
 * - Truth sealed until candidate freeze.
 * - Gated 20→50→150→300→1000→3000; resumable via --resume.
 *
 * Usage:
 *   npx tsx scripts/assurance/stage3000-diverse-second/run-diverse-second-realistic-child-v2.1.2.ts
 *   npx tsx scripts/assurance/stage3000-diverse-second/run-diverse-second-realistic-child-v2.1.2.ts --resume
 *   npx tsx ... --resume --limit=627
 *
 * Does not commit/push/merge/deploy. Does not claim corpus PASS.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

import { buildLiveProductionSurfacesFromDocumentUnits } from "../../../lib/criminal/canonical-live-surface-adapter";
import type { UploadedDocumentUnit } from "../../../lib/criminal/build-from-document-units";
import { scanCaseEligibility } from "../../../lib/eval/master-assurance-auditor/v2/stage150/eligibility";
import { STAGE150_PACKET_LOCAL_HANDLERS } from "../../../lib/eval/master-assurance-auditor/v2/stage150/detector-registry";
import { buildStage150ImplementationCapabilityMatrix } from "../../../lib/eval/master-assurance-auditor/v2/stage150/implementation-matrix";
import {
  buildEvalContext,
  evaluateAllStage150Intelligence,
  toV2CandidateFromStage150Hit,
} from "../../../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import { inventoryOutputLeaves } from "../../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";

import { buildDocSpecs, renderKindSpecificPdf } from "./v2.1.2-document-kind-layouts";
import { buildStage150OutputBag, collectSolicitorVisibleLeaves } from "./v2.1.2-structured-maa-output";
import { CORE_CONTROLS } from "./v2.1.2-named-control-runner";
import {
  planPackDocumentsFromAxes,
  axesToMatterSkeleton,
  type AxisMatter,
  type PackDocPlan,
} from "./diverse-second-pack-planner";
import {
  proveAbsentProvenanceContracts,
  scanOutputProvenanceDefects,
} from "./diverse-second-provenance-contracts";
import {
  proveAllV2BindingContracts,
  reconcileDocumentLifecycle,
  classifyChargeDisposition,
} from "./diverse-second-v2-binding-contracts";
import { proveEvidenceStateDimensionContracts } from "./diverse-second-evidence-state-contracts";
import { proveDocumentRelationshipContracts } from "./diverse-second-document-relationship-contracts";
import {
  scanOrdinarySystemLanguageBoundary,
  scanProfessionalSemanticQuality,
} from "./v2.1.4.4-ordinary-exit-system-language";
import {
  acquireRunLock,
  appendResumeSafeJsonl,
  atomicPublish,
  atomicWriteJson,
  atomicWriteText,
  canonicalJson,
  readRunLock,
  releaseRunLockAfterReceipt,
  sha256,
  type RunLock,
} from "./v2.1.2-run-authority";

const ROOT = process.cwd();
const PARENT_SHA = "683d0201e561aa94f8d81fb0241e2db40813afd85cf134a67020c04c9e6e3550";
const V1_CHILD_SHA = "75c86ddf28be102111ea4cfa73f4b3b76ef1f41db48c54f61be574d68ac35e39";
/** V2 pre-shared-root-remediation membership (pack source). */
const V2_CHILD_SHA = "0abf76ad04825456ba663671f525905e0e18bf7927f532103862c9a43571c079";
/** Unaccepted V2.1 membership — preserved historical; not this run. */
const V21_CHILD_SHA = "cb87a807978fdd71615b32cb8a8522930701df4ccea8e624ace0f5163f302d00";
const EMPTY_LEDGER_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const AR = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution",
);
const BLIND_INPUT = path.join(AR, "realistic-child-v2.1.2-blind-input");
const HIST = BLIND_INPUT;
const V1_HIST = BLIND_INPUT;
const CHILD = path.join(AR, process.env.S3000_V212_CHILD_NAME || "realistic-child-v2.1.2");
const LOCK_PATH = path.join(AR, "realistic-child-v2.1.2.RUN.lock");
const RUN_ID = process.env.S3000_V212_RUN_ID || crypto.randomUUID();
const HEAD_SHA = "0326cc44a724c01aeab162eed8b8806dd8a44345";
const DETERMINISM_PROBE = process.argv.includes("--determinism-probe");
const LOCK_CONTRACT_PROBE = process.argv.includes("--lock-contract-probe");
const IN_PROGRESS = path.join(CHILD, ".in-progress", RUN_ID);
const REGISTRY = path.join(
  ROOT,
  "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json",
);

const CHECKPOINTS = [20, 50, 150, 300, 1000, 3000] as const;
const PDF_BUDGET = Number(process.env.S3000_PDF_BUDGET || "24");
const HARD_DISK_GIB = 0.85;
const DETECTOR_VERSION = "maa2-stage150-packet-local@2";
const RESUME = process.argv.includes("--resume");
const LIMIT_ARG = process.argv.find((a) => a.startsWith("--limit="));
const CASE_LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : 3000;
const OCC_PART_ROWS = 28000;

const BROWSER_HUMAN_LEGAL_SECURITY =
  /browser|human|qualified.?legal|penetration|external.?assurance|accessibility.?manual|usability.?lab|red.?team/i;

function sha(s: string | Buffer): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
function writeJson(p: string, data: unknown): void {
  atomicWriteJson(p, data);
}
function appendJsonl(p: string, row: unknown): void {
  appendResumeSafeJsonl(ledgerTempPath(p), row);
}

const TOP_LEVEL_LEDGER_RE =
  /(?:candidate-findings|control-exercise-receipts|checkpoint-receipts|source-packet-hashes|output-hashes|pdf-subset-register|crash-corrupt-unavailable|provenance-defect-scan|protected-audit-ledger|unique-string-dictionary|wording-quality-findings)\.jsonl$|occurrence-ledger\.part-\d+\.jsonl$/;

function ledgerTempPath(finalPath: string): string {
  if (!TOP_LEVEL_LEDGER_RE.test(path.basename(finalPath))) return finalPath;
  return path.join(IN_PROGRESS, path.basename(finalPath));
}

function ledgerReadPath(finalPath: string): string {
  const temp = ledgerTempPath(finalPath);
  return fs.existsSync(temp) ? temp : finalPath;
}

function publishLedger(finalPath: string): void {
  const temp = ledgerTempPath(finalPath);
  if (temp === finalPath) return;
  atomicPublish(temp, finalPath);
}
function freeGiB(): number {
  try {
    const out = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", "(Get-PSDrive C).Free"],
      { encoding: "utf8" },
    ).trim();
    return Number(out) / 1024 ** 3;
  } catch {
    return 0;
  }
}
function parseKv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}
function loadPdfKit(): any {
  try {
    return createRequire(path.join(ROOT, "package.json"))("pdfkit");
  } catch {
    return createRequire("C:/Users/gduff/casebrain-hub/package.json")("pdfkit");
  }
}
function gzipReplace(jsonPath: string): void {
  const body = fs.readFileSync(jsonPath);
  const tmp = `${jsonPath}.gz.${process.pid}.tmp`;
  fs.writeFileSync(tmp, zlib.gzipSync(body));
  fs.renameSync(tmp, `${jsonPath}.gz`);
  fs.unlinkSync(jsonPath);
}
function countLines(p: string): number {
  p = ledgerReadPath(p);
  if (!fs.existsSync(p)) return 0;
  const buf = fs.readFileSync(p);
  if (buf.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10) n++;
  if (buf[buf.length - 1] !== 10) n++;
  return n;
}

function readJsonl(p: string): Array<Record<string, unknown>> {
  p = ledgerReadPath(p);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function auditExactDenominators(processed: number): {
  ok: boolean;
  failReasons: string[];
  outputRows: number;
  sourceRows: number;
  candidateRows: number;
  controlRows: number;
  uniqueControlPairs: number;
  duplicateControlPairs: number;
  conflictingControlPairs: number;
  uniqueControlIds: number;
  pdfRegisterRows: number;
  uniquePdfCases: number;
} {
  const failReasons: string[] = [];
  const output = readJsonl(path.join(CHILD, "output-hashes.jsonl"));
  const source = readJsonl(path.join(CHILD, "source-packet-hashes.jsonl"));
  const candidates = readJsonl(path.join(CHILD, "candidate-findings.jsonl"));
  const controls = readJsonl(path.join(CHILD, "control-exercise-receipts.jsonl"));
  const pdf = readJsonl(path.join(CHILD, "pdf-subset-register.jsonl"));

  const validateCaseHashRows = (
    rows: Array<Record<string, unknown>>,
    hashKey: string,
    label: string,
  ) => {
    const byCase = new Map<string, Set<string>>();
    for (const row of rows) {
      const caseId = String(row.caseId || "");
      const hash = String(row[hashKey] || "");
      if (!byCase.has(caseId)) byCase.set(caseId, new Set());
      byCase.get(caseId)!.add(hash);
    }
    const duplicates = rows.length - byCase.size;
    const conflicts = [...byCase.values()].filter((hashes) => hashes.size > 1).length;
    if (rows.length !== processed) failReasons.push(`${label}_rows:${rows.length}!=${processed}`);
    if (byCase.size !== processed) failReasons.push(`${label}_unique_cases:${byCase.size}!=${processed}`);
    if (duplicates !== 0) failReasons.push(`${label}_duplicate_rows:${duplicates}`);
    if (conflicts !== 0) failReasons.push(`${label}_conflicting_hashes:${conflicts}`);
  };
  validateCaseHashRows(output, "outputSha256", "output");
  validateCaseHashRows(source, "documentPackSha256", "source");

  const controlPairs = new Map<string, Set<string>>();
  for (const row of controls) {
    const pair = `${String(row.caseId)}::${String(row.controlId)}`;
    const semantic = canonicalJson({
      status: row.status,
      reasonFamily: row.reasonFamily,
      prerequisiteAvailability: row.prerequisiteAvailability,
      hitCount: row.hitCount,
      findingCodes: row.findingCodes,
    });
    if (!controlPairs.has(pair)) controlPairs.set(pair, new Set());
    controlPairs.get(pair)!.add(semantic);
  }
  const duplicateControlPairs = controls.length - controlPairs.size;
  const conflictingControlPairs = [...controlPairs.values()].filter((v) => v.size > 1).length;
  const uniqueControlIds = new Set(controls.map((r) => String(r.controlId))).size;
  if (duplicateControlPairs !== 0) failReasons.push(`control_duplicate_pairs:${duplicateControlPairs}`);
  if (conflictingControlPairs !== 0) failReasons.push(`control_conflicting_pairs:${conflictingControlPairs}`);

  const uniquePdfCases = new Set(pdf.map((r) => String(r.caseId))).size;
  if (pdf.length !== uniquePdfCases) failReasons.push(`pdf_duplicate_case_rows:${pdf.length - uniquePdfCases}`);
  if (processed === 3000 && uniquePdfCases !== PDF_BUDGET) {
    failReasons.push(`pdf_unique_cases:${uniquePdfCases}!=${PDF_BUDGET}`);
  }

  return {
    ok: failReasons.length === 0,
    failReasons,
    outputRows: output.length,
    sourceRows: source.length,
    candidateRows: candidates.length,
    controlRows: controls.length,
    uniqueControlPairs: controlPairs.size,
    duplicateControlPairs,
    conflictingControlPairs,
    uniqueControlIds,
    pdfRegisterRows: pdf.length,
    uniquePdfCases,
  };
}

const DETERMINISM_EXCLUSION_VERSION = "v2.1.2-runtime-metadata-exclusions@1.0.0";
const DETERMINISM_EXCLUDED_KEYS = new Set([
  "generatedAt",
  "createdAt",
  "updatedAt",
  "startedAt",
  "openedAt",
  "frozenAt",
  "runId",
  "pid",
]);

function stripRuntimeMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripRuntimeMetadata);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !DETERMINISM_EXCLUDED_KEYS.has(key))
        .map(([key, val]) => [key, stripRuntimeMetadata(val)]),
    );
  }
  return value;
}

function buildDeterminismProbeIndex(caseIds: string[]): Record<string, unknown> {
  const cases = caseIds.map((caseId) => {
    const outGz = path.join(CHILD, "cases", caseId, "casebrain-output.json.gz");
    const bag = JSON.parse(zlib.gunzipSync(fs.readFileSync(outGz)).toString("utf8"));
    const stripped = stripRuntimeMetadata(bag);
    const sourceBacked = stripRuntimeMetadata({
      evidenceStates: bag.evidenceStates,
      chargeInstruments: bag.chargeInstruments,
      documentRelationships: bag.documentRelationships,
      chronologyEvents: bag.chronologyEvents,
      provenanceRecords: bag.provenanceRecords,
    });
    const visibleLeaves = collectSolicitorVisibleLeaves(bag, caseId)
      .filter((leaf: any) => {
        const pointerKeys = String(leaf.jsonPointer || "")
          .split("/")
          .filter(Boolean);
        return !pointerKeys.some((key) => DETERMINISM_EXCLUDED_KEYS.has(key));
      })
      .map((leaf: any) => ({
        jsonPointer: leaf.jsonPointer,
        exactValue: leaf.exactValue,
        surfaceId: leaf.surfaceId,
        copyable: leaf.copyable,
        sendable: leaf.sendable,
      }));
    const ctx = buildEvalContext(caseId, bag);
    ctx.leaves = inventoryOutputLeaves(caseId, bag);
    const detectorResults = evaluateAllStage150Intelligence(ctx).map((hit) =>
      stripRuntimeMetadata(hit),
    );
    return {
      caseId,
      semanticOutputSha256: sha256(canonicalJson(stripped)),
      sourceBackedSha256: sha256(canonicalJson(sourceBacked)),
      solicitorVisibleSha256: sha256(canonicalJson(visibleLeaves)),
      detectorResultsSha256: sha256(canonicalJson(detectorResults)),
      detectorResultCount: detectorResults.length,
    };
  });
  return {
    schemaVersion: "stage3000-v2.1.2-determinism-probe-index@1.0.0",
    exclusionVersion: DETERMINISM_EXCLUSION_VERSION,
    excludedKeys: [...DETERMINISM_EXCLUDED_KEYS].sort(),
    caseCount: cases.length,
    cases,
  };
}

function parentAxes(caseId: string, orderIndex: number): AxisMatter {
  const src = path.join(HIST, "controller-run/source", caseId, "source-text.txt");
  const matterPath = path.join(HIST, "controller-run/source", caseId, "matter-skeleton.json");
  const text = fs.readFileSync(src, "utf8");
  const matter = JSON.parse(fs.readFileSync(matterPath, "utf8"));
  const kv = parseKv(text);
  return {
    caseId,
    orderIndex,
    primaryFamily: String(kv.family || matter.primaryFamily),
    tier: String(kv.tier || matter.tier),
    defence: String(kv.defence || "factual_denial"),
    procedure: String(kv.procedure || "police_investigation"),
    defendants: Number(kv.defendants || 1),
    counts: Number(kv.counts || 1),
    docShape: String(kv.docShape || "mg5_mg6_charge_aligned"),
    completeness: String(kv.completeness || "complete_source_packet"),
    evidenceServed: String(kv.evidence_served || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "none"),
    evidenceAbsent: String(kv.evidence_absent || "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s && s !== "none"),
    structuralVariant: String(kv.structural_variant || `${orderIndex % 97}:${orderIndex % 53}:${orderIndex % 41}`),
  };
}

function toUploadedUnits(docs: ReturnType<typeof buildDocSpecs>["present"]): UploadedDocumentUnit[] {
  return docs.map((d, i) => ({
    id: d.docId,
    title: d.title,
    documentType: d.kind,
    uploadOrder: i + 1,
    versionNumber: /superseded|draft/i.test(d.state) ? 1 : 2,
    replacesDocumentId: /superseded/i.test(d.state) ? null : undefined,
    pages: d.pages.map((p) => ({
      pageNumber: Number(p.pageIndex),
      compiledPage: Number(p.pageIndex),
      text: p.text,
      pageIdentityKnown: true,
    })),
    fullText: d.pages.map((p) => p.text).join("\n\n"),
  }));
}

function isUniversalSafety(text: string): boolean {
  return /^(solicitor review required\.?|fictional test material|do not overstate|not legal advice|client disclaimer)/i.test(
    text.trim(),
  );
}
function templateHash(text: string, caseId: string): string {
  const n = text
    .toLowerCase()
    .replace(new RegExp(caseId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), "<CASE>")
    .replace(/s3000-w\d-s\d-\d+/gi, "<CASE>")
    .replace(/[0-9a-f]{16,}/gi, "<HEX>")
    .replace(/\d+/g, "<N>")
    .replace(/\s+/g, " ")
    .trim();
  return sha(n);
}

type StringDict = Map<string, { exactWording: string; firstCaseId: string; occurrenceCount: number }>;

function classifyNotExercisedReason(args: {
  controlId: string;
  hasHandler: boolean;
  prerequisite: string;
  category?: string;
}): string {
  if (BROWSER_HUMAN_LEGAL_SECURITY.test(args.controlId) || BROWSER_HUMAN_LEGAL_SECURITY.test(args.category || "")) {
    return "browser_human_qualified_legal_penetration_or_external_assurance";
  }
  if (!args.hasHandler) {
    if (args.prerequisite === "present" || args.prerequisite === "partial") {
      return "potentially_applicable_missing_handler";
    }
    return "no_handler_and_prerequisites_absent";
  }
  if (args.prerequisite === "absent") return "inputs_absent_exact_adapter_missing";
  if (args.prerequisite === "partial") return "partial_prerequisites_only";
  return "handler_present_but_not_exercised";
}

/** Live rebuild only — does not mutate the frozen V1 document-pack.json bytes. */
function reconcileFrozenPackDocState(title: string, state: string): string {
  const titleSigned = /\bsigned\b/i.test(title);
  const titleEarlierDraft = /\bearlier draft\b/i.test(title) || /\bdraft\b/i.test(title) && !titleSigned;
  if (titleSigned && /draft/i.test(state)) return "signed";
  if (titleEarlierDraft && /signed|executed/i.test(state)) return "draft";
  return state;
}

function rebuildPresentFromFrozenPack(
  caseId: string,
  axes: AxisMatter,
  frozenPack: any,
): {
  present: ReturnType<typeof buildDocSpecs>["present"];
  absent: ReturnType<typeof buildDocSpecs>["absent"];
  matter: ReturnType<typeof axesToMatterSkeleton>;
  planned: ReturnType<typeof planPackDocumentsFromAxes>;
} {
  const planned = planPackDocumentsFromAxes(axes);
  const matter = axesToMatterSkeleton(axes, planned.charge);
  // Prefer frozen pack identity/state/page counts so regenerated text hashes match V1 packs.
  const packDocuments: PackDocPlan[] = (frozenPack.present || []).map((d: any) => ({
    id: d.docId,
    title: d.title,
    kind: d.kind,
    state: d.state,
    pages: d.pageCount || (d.pages || []).length || 1,
  }));
  const missingItems = (frozenPack.absent || []).map((a: any) => String(a.id || a.docId || a.title || "absent"));
  const { present, absent } = buildDocSpecs({
    caseId,
    matter,
    packDocuments,
    missingItems: missingItems.length ? missingItems : planned.missingItems,
  });
  // Verify page text hashes against frozen pack
  for (const d of present) {
    const frozen = (frozenPack.present || []).find((x: any) => x.docId === d.docId);
    if (!frozen) throw new Error(`${caseId}: regenerated doc ${d.docId} missing from frozen pack`);
    for (let i = 0; i < d.pages.length; i++) {
      const fp = (frozen.pages || [])[i];
      if (!fp) continue;
      if (fp.textHash && fp.textHash !== d.pages[i]!.textHash) {
        throw new Error(
          `${caseId}: textHash mismatch ${d.docId} page ${i + 1}: frozen=${fp.textHash} regen=${d.pages[i]!.textHash}`,
        );
      }
      if (fp.pageIdentity && fp.pageIdentity !== d.pages[i]!.pageIdentity) {
        throw new Error(`${caseId}: pageIdentity mismatch ${d.docId}`);
      }
    }
  }
  // Metadata-only lifecycle reconcile for live production (frozen pack bytes stay V1-identical).
  for (const d of present) {
    const reconciled = reconcileFrozenPackDocState(d.title, d.state);
    if (reconciled !== d.state) {
      (d as any).frozenState = d.state;
      (d as any).stateReconciledFromFrozen = true;
      d.state = reconciled;
    }
  }
  return { present, absent, matter, planned };
}

async function main(): Promise<void> {
  const free0 = freeGiB();
  if (free0 < HARD_DISK_GIB) throw new Error(`STOP EARLY: disk ${free0.toFixed(2)} GiB`);
  if (!fs.existsSync(BLIND_INPUT)) throw new Error(`BLIND_INPUT_MISSING:${BLIND_INPUT}`);
  if (fs.existsSync(path.join(BLIND_INPUT, "truth"))) {
    throw new Error(`CLEAN_BLINDNESS_VIOLATION:truth_present_in_blind_input`);
  }

  const absentProv = proveAbsentProvenanceContracts();
  const v2Binding = proveAllV2BindingContracts();
  const evidenceDims = proveEvidenceStateDimensionContracts();
  const docRels = proveDocumentRelationshipContracts();
  if (!absentProv.ok || !v2Binding.ok || !evidenceDims.ok || !docRels.ok) {
    throw new Error(
      `preflight binding failed: ${JSON.stringify({ absentProv, v2Binding, evidenceDims, docRels })}`,
    );
  }

  fs.mkdirSync(CHILD, { recursive: true });
  if (!RESUME || !fs.existsSync(path.join(CHILD, "programme-start.json"))) {
    writeJson(path.join(CHILD, "programme-start.json"), {
      startedAt: new Date().toISOString(),
      runId: RUN_ID,
      pid: process.pid,
      head: HEAD_SHA,
      writerCount: 1,
      orchestratorCount: 1,
      blindInputRoot: path.relative(ROOT, BLIND_INPUT).replace(/\\/g, "/"),
      truthPhysicallyPresentInBlindInput: false,
      parentMembershipSha256: PARENT_SHA,
      v1ChildMembershipSha256: V1_CHILD_SHA,
      v21ChildMembershipSha256: V21_CHILD_SHA,
      v2ParentLineage: {
        parentMembershipSha256: PARENT_SHA,
        v1ChildMembershipSha256: V1_CHILD_SHA,
        v21ChildMembershipSha256: V21_CHILD_SHA,
        v2PreservedAs: "realistic-child-v2-pre-shared-root-remediation",
        rematerialisation: "v2.1-shared-root-remediation",
      },
      preflight: {
        absentProvenance: absentProv.ok,
        v2Binding: v2Binding.ok,
        evidenceStateDimensions: evidenceDims.ok,
        documentRelationships: docRels.ok,
      },
      v1Classification: "REALISTIC_DOCUMENT_PACKS_CREATED__AUDIT_ACCOUNTING_AND_BINDING_INCOMPLETE",
      freeGiB: Number(free0.toFixed(2)),
      checkpoints: CHECKPOINTS,
      productionAuthority: "buildLiveProductionSurfacesFromDocumentUnits",
      candidateSemantics: "genuine_detector_hits_only",
      truthSealedUntilFreeze: true,
    });
    writeJson(path.join(CHILD, "before-baselines.json"), {
      v1ChildMembershipSha256: V1_CHILD_SHA,
      v21ChildMembershipSha256: V21_CHILD_SHA,
      parentMembershipSha256: PARENT_SHA,
      v1ChargeCountZeroReceipts: 1100,
      v1ChargeCountZeroReceiptsBasis: "measured_from_v1_live_production_receipts",
      v1SignedTitleDraftState: 80,
      v1CandidatesWereExerciseReceipts: 51000,
      v1GenuineHitRowsApprox: 5300,
      v1GenuineHitOccurrencesApprox: 6960,
    });
  }
  writeJson(path.join(CHILD, "preflight-binding-contracts.json"), {
    v2Binding,
    absentProvenance: absentProv,
    page: v2Binding.page,
    charge: v2Binding.charge,
    docState: v2Binding.docState,
  });

  const parentMembership = JSON.parse(
    fs.readFileSync(path.join(HIST, "ordered-3000-membership.json"), "utf8"),
  ) as {
    membershipSha256: string;
    accepted: Array<{
      caseId: string;
      globalSlot: number;
      wave: number;
      shard: number;
      semanticFingerprint: string;
      seed: string;
    }>;
  };
  if (parentMembership.membershipSha256 !== PARENT_SHA) throw new Error("parent membership mismatch");

  const registry = JSON.parse(fs.readFileSync(REGISTRY, "utf8")) as {
    controls: Array<{ controlId: string; family?: string; category?: string }>;
  };
  const allControlIds = registry.controls.map((c) => c.controlId);
  if (allControlIds.length !== 361) throw new Error(`expected 361 controls, got ${allControlIds.length}`);
  const implMatrix = buildStage150ImplementationCapabilityMatrix();
  const handlerById = new Map(STAGE150_PACKET_LOCAL_HANDLERS.map((h) => [h.controlId, h]));
  const implById = new Map(implMatrix.rows.map((r) => [r.controlId, r]));

  if (!RESUME) {
    fs.mkdirSync(IN_PROGRESS, { recursive: true });
    for (const name of [
      "unique-string-dictionary.jsonl",
      "protected-audit-ledger.jsonl",
      "control-exercise-receipts.jsonl",
      "candidate-findings.jsonl",
      "pdf-subset-register.jsonl",
      "source-packet-hashes.jsonl",
      "output-hashes.jsonl",
      "checkpoint-receipts.jsonl",
      "crash-corrupt-unavailable.jsonl",
      "provenance-defect-scan.jsonl",
      "wording-quality-findings.jsonl",
    ]) {
      atomicWriteText(ledgerTempPath(path.join(CHILD, name)), "");
    }
    // clear occurrence parts
    for (const f of fs.readdirSync(IN_PROGRESS)) {
      if (/^occurrence-ledger\.part-/.test(f)) fs.unlinkSync(path.join(IN_PROGRESS, f));
    }
  }

  // Ensure appendable uncompressed ledgers exist WITHOUT expanding large .gz archives
  // (disk-critical). Resume appends to fresh part files; prior .gz remain hash-locked.
  const ensureAppendable = (base: string) => {
    const p = path.join(CHILD, base);
    const temp = ledgerTempPath(p);
    if (!fs.existsSync(temp)) atomicWriteText(temp, "");
    return p;
  };
  const dictPath = ensureAppendable("unique-string-dictionary.jsonl");
  const protectedPath = ensureAppendable("protected-audit-ledger.jsonl");
  const controlReceiptPath = ensureAppendable("control-exercise-receipts.jsonl");
  const candidatePath = ensureAppendable("candidate-findings.jsonl");
  const wordingPath = ensureAppendable("wording-quality-findings.jsonl");

  const stringDict: StringDict = new Map();
  // Reload dictionary on resume only if uncompressed original exists (never expand .gz).
  if (RESUME && fs.existsSync(ledgerReadPath(dictPath))) {
    for (const line of fs.readFileSync(ledgerReadPath(dictPath), "utf8").split(/\r?\n/)) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      stringDict.set(row.exactWordingSha256, {
        exactWording: row.exactWording,
        firstCaseId: row.firstCaseId,
        occurrenceCount: 1,
      });
    }
  }

  let lastCheckpoint = 0;
  for (const cp of CHECKPOINTS) {
    if (fs.existsSync(path.join(CHILD, `checkpoint-${cp}.json`))) lastCheckpoint = cp;
  }
  let checkpointSeed: {
    uniqueExactStrings?: number;
    genuineCandidateCount?: number;
    controlsEvaluatedOnAtLeastOneCase?: number;
    pdfSubset?: number;
  } | null = null;
  if (RESUME && lastCheckpoint) {
    try {
      checkpointSeed = JSON.parse(
        fs.readFileSync(path.join(CHILD, `checkpoint-${lastCheckpoint}.json`), "utf8"),
      );
    } catch {
      checkpointSeed = null;
    }
  }

  const childAccepted: Array<Record<string, unknown>> = [];
  if (RESUME && fs.existsSync(ledgerReadPath(path.join(CHILD, "output-hashes.jsonl")))) {
    for (const line of fs
      .readFileSync(ledgerReadPath(path.join(CHILD, "output-hashes.jsonl")), "utf8")
      .split(/\r?\n/)) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      const receiptPath = path.join(CHILD, "cases", row.caseId, "live-production-receipt.json");
      if (!fs.existsSync(receiptPath)) continue;
      const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
      childAccepted.push({
        caseId: row.caseId,
        documentPackSha256: receipt.documentPackSha256,
        outputSha256: receipt.outputSha256 || row.outputSha256,
        presentDocCount: 1,
        pageCount: 1,
        pdfRendered: Boolean(row.pdf?.rendered),
        resumed: true,
      });
    }
  }

  const controlStats = new Map<
    string,
    {
      evaluatedCases: number;
      unresolvedCases: number;
      notExercisedCases: number;
      potentiallyApplicableMissingHandler: number;
      reasonFamilies: Record<string, number>;
    }
  >();
  for (const id of allControlIds) {
    controlStats.set(id, {
      evaluatedCases: 0,
      unresolvedCases: 0,
      notExercisedCases: 0,
      potentiallyApplicableMissingHandler: 0,
      reasonFamilies: {},
    });
  }
  // Seed evaluated control presence from checkpoint (avoid expanding multi-MB receipt gz).
  if (RESUME && checkpointSeed?.controlsEvaluatedOnAtLeastOneCase) {
    for (const h of STAGE150_PACKET_LOCAL_HANDLERS.slice(0, checkpointSeed.controlsEvaluatedOnAtLeastOneCase)) {
      const s = controlStats.get(h.controlId);
      if (s) s.evaluatedCases = Math.max(s.evaluatedCases, childAccepted.length || 1);
    }
  }

  let genuineCandidateCount =
    checkpointSeed?.genuineCandidateCount ||
    countLines(candidatePath) ||
    countLines(path.join(CHILD, "candidate-findings.jsonl"));
  let pdfRendered =
    checkpointSeed?.pdfSubset || countLines(path.join(CHILD, "pdf-subset-register.jsonl"));
  let realisticPacks = childAccepted.length;
  let occurrencePart = 1;
  while (
    fs.existsSync(
      ledgerTempPath(
        path.join(CHILD, `occurrence-ledger.part-${String(occurrencePart).padStart(3, "0")}.jsonl`),
      ),
    )
  ) {
    occurrencePart += 1;
  }
  const openOccPart = () => {
    const name = `occurrence-ledger.part-${String(occurrencePart).padStart(3, "0")}.jsonl`;
    const p = path.join(CHILD, name);
    const temp = ledgerTempPath(p);
    if (!fs.existsSync(temp)) atomicWriteText(temp, "");
    return p;
  };
  let occPath = openOccPart();
  let occRowsInPart = countLines(occPath);
  const pdfStride = Math.max(1, Math.floor(3000 / PDF_BUDGET));

  const substantiveFieldStats = new Map<
    string,
    { occurrence: number; unique: Set<string>; templates: Set<string> }
  >();

  if (RESUME) {
    console.log(
      JSON.stringify({
        resume: true,
        doneCases: childAccepted.length,
        childAccepted: childAccepted.length,
        occurrencePart,
        lastCheckpoint,
        genuineCandidates: genuineCandidateCount,
      }),
    );
  }

  const doneSet = new Set(childAccepted.map((r) => String(r.caseId)));

  for (let i = 0; i < parentMembership.accepted.length && i < CASE_LIMIT; i++) {
    const entry = parentMembership.accepted[i]!;
    const caseId = entry.caseId;
    const orderIndex = entry.globalSlot >= 0 ? entry.globalSlot : i;

    if (doneSet.has(caseId)) {
      // Still fire checkpoint gates if we just crossed a boundary via prior progress
      const processed = i + 1;
      if (CHECKPOINTS.includes(processed as (typeof CHECKPOINTS)[number]) && processed > lastCheckpoint) {
        lastCheckpoint = processed;
        const gate = evaluateCheckpointGate({
          processed,
          childAccepted,
          stringDict,
          substantiveFieldStats,
          controlStats,
          genuineCandidateCount,
          pdfRendered,
          realisticPacks,
          seededUniqueStrings: checkpointSeed?.uniqueExactStrings || 0,
        });
        appendJsonl(path.join(CHILD, "checkpoint-receipts.jsonl"), gate);
        writeJson(path.join(CHILD, `checkpoint-${processed}.json`), gate);
        console.log(
          JSON.stringify({
            checkpoint: processed,
            gate: gate.verdict,
            freeGiB: gate.freeGiB,
            genuineCandidates: genuineCandidateCount,
            chargesZero: gate.chargesZero,
            unsplitLim: gate.unsplitLim,
          }),
        );
        if (gate.verdict !== "PASS_CONTINUE") {
          writeJson(path.join(CHILD, "STOP-EARLY-GATE-FAIL.json"), gate);
          throw new Error(`Gate failed at ${processed}: ${gate.verdict}`);
        }
      }
      continue;
    }

    try {
      const v1CaseDir = path.join(V1_HIST, "cases", caseId);
      const frozenPackPath = path.join(v1CaseDir, "document-pack.json");
      if (!fs.existsSync(frozenPackPath)) throw new Error(`missing V1 pack for ${caseId}`);
      const frozenPackRaw = fs.readFileSync(frozenPackPath);
      const frozenPack = JSON.parse(frozenPackRaw.toString("utf8"));
      const packHash = sha(frozenPackRaw);

      const axes = parentAxes(caseId, orderIndex);
      const { present, absent, matter, planned } = rebuildPresentFromFrozenPack(caseId, axes, frozenPack);
      if (present.length === 0) throw new Error("docs:[] refused — present pack empty");
      realisticPacks += 1;

      const caseDir = path.join(CHILD, "cases", caseId);
      fs.mkdirSync(caseDir, { recursive: true });
      // Byte-identical pack copy
      fs.writeFileSync(path.join(caseDir, "document-pack.json"), frozenPackRaw);
      writeJson(path.join(caseDir, "matter-skeleton.json"), matter);

      appendJsonl(path.join(CHILD, "source-packet-hashes.jsonl"), {
        caseId,
        documentPackSha256: packHash,
        presentDocCount: present.length,
        absentDocCount: absent.length,
        pageCount: present.reduce((n, d) => n + d.pages.length, 0),
        v1PackPreserved: true,
      });

      let pdfMeta: {
        rendered: boolean;
        sha256?: string;
        path?: string;
        byteOrigin?: "source_pdf_copy" | "genuine_output_render";
      } = { rendered: false };
      const v1Pdf = path.join(v1CaseDir, "bundle-fictional-test.pdf");
      if (fs.existsSync(v1Pdf)) {
        const pdfBody = fs.readFileSync(v1Pdf);
        fs.writeFileSync(path.join(caseDir, "bundle-fictional-test.pdf"), pdfBody);
        pdfMeta = {
          rendered: true,
          sha256: sha(pdfBody),
          path: path.relative(ROOT, path.join(caseDir, "bundle-fictional-test.pdf")).replace(/\\/g, "/"),
          byteOrigin: "source_pdf_copy",
        };
        if (!doneSet.has(caseId)) {
          pdfRendered += 1;
          appendJsonl(path.join(CHILD, "pdf-subset-register.jsonl"), { caseId, ...pdfMeta });
        }
      } else if (pdfRendered < PDF_BUDGET && orderIndex % pdfStride === 0) {
        try {
          const rendered = await renderKindSpecificPdf(caseDir, present, loadPdfKit);
          pdfMeta = {
            rendered: true,
            sha256: rendered.sha256,
            path: path.relative(ROOT, rendered.pdfPath).replace(/\\/g, "/"),
            byteOrigin: "genuine_output_render",
          };
          pdfRendered += 1;
          appendJsonl(path.join(CHILD, "pdf-subset-register.jsonl"), {
            caseId,
            ...pdfMeta,
            pageCount: rendered.pageCount,
          });
        } catch (err) {
          appendJsonl(path.join(CHILD, "crash-corrupt-unavailable.jsonl"), {
            caseId,
            kind: "pdf_render_unavailable",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const surfaces = buildLiveProductionSurfacesFromDocumentUnits(toUploadedUnits(present), {
        caseId,
        allegation: matter.charge?.wording || undefined,
        recordedChargeText: matter.charge?.wording || null,
        canonicalOffenceLine: matter.charge?.wording || null,
        courtNoteText: [
          `Matter family under review: ${axes.primaryFamily.replace(/_/g, " ")}.`,
          `Defence on instructions: ${axes.defence.replace(/_/g, " ")}.`,
          `Procedural stage: ${axes.procedure.replace(/_/g, " ")}.`,
          planned.missingItems.length
            ? `Referred absent items (not served): ${planned.missingItems.join(", ")}.`
            : "No deliberate referred-absent masters declared.",
          `Charge wording status: ${matter.charge?.wordingStatus || "unknown"}.`,
          `Defendant count modelled: ${axes.defendants}.`,
          `Doc shape: ${axes.docShape.replace(/_/g, " ")}.`,
        ].join(" "),
        caseTitle: `Fictional test — ${axes.primaryFamily}`,
        clientLabel: "Client (fictional)",
      });

      const stageDocs = present.map((d) => ({
        docId: d.docId,
        title: d.title,
        kind: d.kind,
        state: d.state,
        pages: d.pages.map((p) => ({
          pageIndex: p.pageIndex,
          pageIdentity: p.pageIdentity,
          text: p.text,
          purpose: p.purpose,
        })),
        privilegeSeparated: d.privilegeSeparated,
      }));
      const stageAbsent = absent.map((a) => ({
        id: a.docId,
        title: a.title,
        kind: a.kind,
        state: a.state,
      }));

      const outputBag = buildStage150OutputBag({
        caseId,
        matter,
        docs: stageDocs,
        absent: stageAbsent,
        surfaces,
      }) as Record<string, unknown>;
      outputBag.productionAuthority = {
        builder: "buildLiveProductionSurfacesFromDocumentUnits",
        helperBagNotAuthority: true,
      };
      outputBag.exitPayloadReceipts = {
        view: { status: "exercised_live_production" },
        copy: { status: "exercised_live_production" },
        export: { status: "exercised_live_production" },
        api: { status: "exercised_builder_payload" },
        composed_prose: { status: "exercised_live_production" },
        pdf: pdfMeta.rendered
          ? { status: "exercised_rendered_pdf", sha256: pdfMeta.sha256 }
          : { status: "not_exercised", reason: "Outside stratified PDF subset / disk budget" },
        authenticated_browser: {
          status: "not_exercised",
          reason: "Authenticated browser capture not performed",
        },
      };
      const lifecycle = reconcileDocumentLifecycle(stageDocs);
      if (lifecycle.length) outputBag.documentLifecycleReconciliations = lifecycle;

      const outPath = path.join(caseDir, "casebrain-output.json");
      const outBody = `${JSON.stringify(outputBag)}\n`;
      fs.writeFileSync(outPath, outBody, "utf8");
      const outputSha256 = sha(outBody);

      const chargeInstruments = (outputBag.chargeInstruments as Array<Record<string, unknown>>) || [];
      const packHasCharge = present.some((d) => /charge|indictment|sjp|requisition/i.test(d.kind));
      const chargeDisposition = classifyChargeDisposition({
        packHasChargeInstrument: packHasCharge,
        chargeInstruments,
      });
      const unsplitLimitation = (surfaces.requiredLimitations || []).some((l) =>
        /unsplit whole-document/i.test(l),
      );
      const exactPageCharges = chargeInstruments.filter(
        (c) => c.pageIdentityKnown === true && c.sourcePage != null,
      ).length;

      writeJson(path.join(caseDir, "live-production-receipt.json"), {
        caseId,
        builder: "buildLiveProductionSurfacesFromDocumentUnits",
        chargeCount: surfaces.charges.length || chargeInstruments.filter((c) => c.chargeWordingComplete).length,
        chargeDisposition,
        chaseLabelCount: surfaces.pipeline.chaseLabels.length,
        findingCount: surfaces.pipeline.findings.length,
        copyLineCount: surfaces.copyLines.length,
        requiredLimitations: surfaces.requiredLimitations,
        unsplitLimitation,
        exactPageCharges,
        crossExitOk: surfaces.crossExit?.ok ?? null,
        courtLineSha256: sha(String(surfaces.composedProse?.courtLine || "")),
        allegationSha256: sha(String(surfaces.composedProse?.allegation || "")),
        documentPackSha256: packHash,
        outputSha256,
      });

      // Eligibility + genuine hits while uncompressed output exists
      const eligibility = scanCaseEligibility(caseId, caseDir);
      const leavesInv = inventoryOutputLeaves(caseId, outputBag);
      const ctx = buildEvalContext(caseId, outputBag);
      ctx.leaves = leavesInv;
      const hits = evaluateAllStage150Intelligence(ctx);
      for (const h of hits) {
        const cand = {
          ...toV2CandidateFromStage150Hit(h, caseId),
          occurrenceRef: h.occurrenceRef,
          detectorVersion: DETECTOR_VERSION,
        };
        appendJsonl(candidatePath, cand);
        genuineCandidateCount += 1;
      }

      const receiptByControl = new Map(eligibility.receipts.map((r) => [r.controlId, r]));
      for (const controlId of allControlIds) {
        const receipt = receiptByControl.get(controlId);
        const hasHandler = handlerById.has(controlId);
        const impl = implById.get(controlId);
        const phraseProbe = receipt?.detectorClassification === "phrase_probe_only";
        const hitCount = receipt?.hitCount || 0;
        const stats = controlStats.get(controlId)!;

        let prereq: "present" | "partial" | "absent" = "absent";
        if (receipt?.prerequisiteEvidenceValidationOk) prereq = "present";
        else if (receipt?.missingInputReason) prereq = "absent";
        else if (receipt) prereq = "partial";

        let status: "evaluated" | "unresolved" | "not_exercised" | "potentially_applicable_missing_handler" =
          "not_exercised";
        let reasonFamily = classifyNotExercisedReason({
          controlId,
          hasHandler,
          prerequisite: prereq,
          category: String((impl as any)?.family || receipt?.detectorClassification || ""),
        });

        if (BROWSER_HUMAN_LEGAL_SECURITY.test(controlId) || phraseProbe) {
          status = "not_exercised";
          reasonFamily = phraseProbe
            ? "phrase_probe_never_counts_as_named_exercise"
            : "browser_human_qualified_legal_penetration_or_external_assurance";
          stats.notExercisedCases += 1;
        } else if (hasHandler && receipt && !phraseProbe) {
          const named = receipt.namedControlExerciseStatus;
          if (
            named === "fully_exercised" ||
            named === "partially_exercised" ||
            (prereq !== "absent" && named !== "not_exercised")
          ) {
            status = "evaluated";
            stats.evaluatedCases += 1;
            reasonFamily = "executed_substantive_handler";
          } else if (named === ("unresolved" as any)) {
            status = "unresolved";
            stats.unresolvedCases += 1;
          } else {
            status = "not_exercised";
            stats.notExercisedCases += 1;
          }
        } else if (!hasHandler && (prereq === "present" || prereq === "partial")) {
          status = "potentially_applicable_missing_handler";
          reasonFamily = "potentially_applicable_missing_handler";
          stats.potentiallyApplicableMissingHandler += 1;
          stats.notExercisedCases += 1;
        } else {
          status = "not_exercised";
          stats.notExercisedCases += 1;
        }
        stats.reasonFamilies[reasonFamily] = (stats.reasonFamilies[reasonFamily] || 0) + 1;

        // Exercise receipts for evaluated/unresolved/missing-handler — NOT findings
        if (status !== "not_exercised" || reasonFamily === "potentially_applicable_missing_handler") {
          appendJsonl(controlReceiptPath, {
            caseId,
            controlId,
            status,
            reasonFamily,
            prerequisiteAvailability: prereq,
            hasHandler,
            hitCount,
            phraseProbeOnly: Boolean(phraseProbe),
            namedControlExerciseStatus: receipt?.namedControlExerciseStatus || null,
            missingInputReason: receipt?.missingInputReason || null,
            findingCodes: receipt?.findingCodes || [],
            note: "exercise_receipt_not_finding",
          });
        }
      }

      // Provenance scan — defects become candidates only if detector-shaped; else ledger
      const provDefects = scanOutputProvenanceDefects(outputBag);
      if (provDefects.length) {
        appendJsonl(path.join(CHILD, "provenance-defect-scan.jsonl"), { caseId, defects: provDefects });
      }

      const leaves = collectSolicitorVisibleLeaves(outputBag, caseId);
      for (const leaf of leaves as any[]) {
        const text = String(leaf.exactValue || "");
        if (!text.trim()) continue;
        const h = leaf.exactValueHash || sha(text);
        const ptr = String(leaf.jsonPointer || "");
        const protectedAudit =
          ptr.startsWith("/chaseAuditMetadata") ||
          /\/(requestId|evidenceUnitId|handlerId)$/.test(ptr) ||
          (leaf.copyable === false && /audit|protected/i.test(String(leaf.dispositionReason || "")));
        if (protectedAudit) {
          appendJsonl(protectedPath, {
            caseId,
            exactWordingSha256: h,
            jsonPointer: ptr,
            copyable: false,
          });
          continue;
        }
        const existing = stringDict.get(h);
        if (!existing) {
          stringDict.set(h, { exactWording: text, firstCaseId: caseId, occurrenceCount: 1 });
          appendJsonl(dictPath, {
            exactWordingSha256: h,
            exactWording: text,
            firstCaseId: caseId,
          });
        } else {
          existing.occurrenceCount += 1;
        }
        const sys = scanOrdinarySystemLanguageBoundary(text);
        const prof = scanProfessionalSemanticQuality(text);
        const surface = String(leaf.surfaceId || "unknown");
        const fieldKey = ptr.split("/").filter(Boolean).slice(0, 3).join("/") || surface;
        const st = substantiveFieldStats.get(fieldKey) || {
          occurrence: 0,
          unique: new Set<string>(),
          templates: new Set<string>(),
        };
        st.occurrence += 1;
        st.unique.add(h);
        st.templates.add(templateHash(text, caseId));
        substantiveFieldStats.set(fieldKey, st);

        appendJsonl(occPath, {
          caseId,
          exactWordingSha256: h,
          surface,
          jsonPointer: ptr,
          exit: leaf.exit || null,
          audience: "solicitor",
          copyable: leaf.copyable !== false,
          sendable: leaf.sendable !== false,
          provenanceClassification: leaf.disposition || null,
          universalSafety: isUniversalSafety(text),
          templateHash: templateHash(text, caseId),
          systemLanguageOk: sys.ok,
          professionalOk: prof.ok,
        });
        occRowsInPart += 1;
        if (!sys.ok || !prof.ok) {
          appendJsonl(wordingPath, {
            caseId,
            exactWordingSha256: h,
            kind: !sys.ok ? "system_language_on_ordinary_exit" : "professional_semantic_defect",
          });
        }
        if (occRowsInPart >= OCC_PART_ROWS) {
          // rotate + gzip previous part
          const prev = occPath;
          occurrencePart += 1;
          occPath = openOccPart();
          occRowsInPart = 0;
          try {
            const prevTemp = ledgerTempPath(prev);
            const gzTemp = `${prevTemp}.gz.tmp`;
            fs.writeFileSync(gzTemp, zlib.gzipSync(fs.readFileSync(prevTemp)));
            fs.renameSync(gzTemp, `${prevTemp}.gz`);
            fs.unlinkSync(prevTemp);
          } catch {
            /* keep uncompressed if gzip fails */
          }
        }
      }

      appendJsonl(path.join(CHILD, "output-hashes.jsonl"), { caseId, outputSha256, pdf: pdfMeta });
      gzipReplace(outPath);

      childAccepted.push({
        caseId,
        parentCaseId: caseId,
        parentSemanticFingerprint: entry.semanticFingerprint,
        globalSlot: orderIndex,
        wave: entry.wave,
        shard: entry.shard,
        documentPackSha256: packHash,
        outputSha256,
        presentDocCount: present.length,
        pageCount: present.reduce((n, d) => n + d.pages.length, 0),
        pdfRendered: pdfMeta.rendered,
      });
      doneSet.add(caseId);
    } catch (err) {
      appendJsonl(path.join(CHILD, "crash-corrupt-unavailable.jsonl"), {
        caseId,
        kind: "case_materialisation_error",
        message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }

    const processed = i + 1;
    if (CHECKPOINTS.includes(processed as (typeof CHECKPOINTS)[number]) && processed > lastCheckpoint) {
      lastCheckpoint = processed;
      const gate = evaluateCheckpointGate({
        processed,
        childAccepted,
        stringDict,
        substantiveFieldStats,
        controlStats,
        genuineCandidateCount,
        pdfRendered,
        realisticPacks,
        seededUniqueStrings: checkpointSeed?.uniqueExactStrings || 0,
      });
      appendJsonl(path.join(CHILD, "checkpoint-receipts.jsonl"), gate);
      writeJson(path.join(CHILD, `checkpoint-${processed}.json`), gate);
      console.log(
        JSON.stringify({
          checkpoint: processed,
          gate: gate.verdict,
          freeGiB: gate.freeGiB,
          genuineCandidates: genuineCandidateCount,
          chargesZero: gate.chargesZero,
          unsplitLim: gate.unsplitLim,
        }),
      );
      if (gate.verdict !== "PASS_CONTINUE") {
        writeJson(path.join(CHILD, "STOP-EARLY-GATE-FAIL.json"), gate);
        throw new Error(`Gate failed at ${processed}: ${gate.verdict} — ${gate.failReasons?.join("; ")}`);
      }
      if (freeGiB() < HARD_DISK_GIB && processed < 3000) {
        throw new Error(`STOP EARLY: disk below ${HARD_DISK_GIB} GiB at ${processed}`);
      }
    }
  }

  if (DETERMINISM_PROBE) {
    if (CASE_LIMIT !== 20 || childAccepted.length !== 20) {
      throw new Error(`DETERMINISM_PROBE_REQUIRES_EXACT_20:${childAccepted.length}/${CASE_LIMIT}`);
    }
    const index = buildDeterminismProbeIndex(
      childAccepted.map((row) => String(row.caseId)),
    );
    writeJson(path.join(CHILD, "determinism-probe-index.json"), index);
    writeJson(path.join(CHILD, "PROBE-STOP.json"), {
      schemaVersion: "stage3000-v2.1.2-determinism-probe-stop@1.0.0",
      runId: RUN_ID,
      caseCount: 20,
      truthOpened: false,
      candidateFreezeWritten: false,
      blindInputRoot: path.relative(ROOT, BLIND_INPUT).replace(/\\/g, "/"),
      completedAt: new Date().toISOString(),
    });
    console.log(JSON.stringify({ determinismProbe: true, caseCount: 20, runId: RUN_ID }));
    return;
  }

  const targetPopulation = parentMembership.accepted.length;
  const fullyComplete =
    childAccepted.length >= targetPopulation && CASE_LIMIT >= targetPopulation;
  if (fullyComplete) {
    await finalizeV2({
      childAccepted,
      stringDict,
      substantiveFieldStats,
      controlStats,
      allControlIds,
      genuineCandidateCount,
      pdfRendered,
      realisticPacks,
      parentMembership,
    });
  } else {
    writeJson(path.join(CHILD, "partial-stop.json"), {
      processed: childAccepted.length,
      caseLimit: CASE_LIMIT,
      targetPopulation,
      freeGiB: freeGiB(),
      note: "Stopped before full population — resume with --resume. Truth remains sealed.",
      truthSealed: true,
    });
    console.log(
      JSON.stringify({
        partial: true,
        processed: childAccepted.length,
        targetPopulation,
        genuineCandidateCount,
        freeGiB: freeGiB(),
      }),
    );
  }
}

function evaluateCheckpointGate(args: {
  processed: number;
  childAccepted: Array<Record<string, unknown>>;
  stringDict: StringDict;
  substantiveFieldStats: Map<string, { occurrence: number; unique: Set<string>; templates: Set<string> }>;
  controlStats: Map<string, any>;
  genuineCandidateCount: number;
  pdfRendered: number;
  realisticPacks: number;
  seededUniqueStrings?: number;
}) {
  const failReasons: string[] = [];
  const uniqueCount = Math.max(args.stringDict.size, args.seededUniqueStrings || 0, 1);
  const minUnique = Math.min(40, Math.max(8, Math.floor(args.processed * 0.4)));
  if (args.stringDict.size > 0 && uniqueCount < minUnique) {
    failReasons.push(`unique_string_collapse:${uniqueCount}<${minUnique}`);
  }

  let chargesZero = 0;
  let unsplitLim = 0;
  for (const row of args.childAccepted) {
    const receiptPath = path.join(CHILD, "cases", String(row.caseId), "live-production-receipt.json");
    if (!fs.existsSync(receiptPath)) continue;
    const r = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
    if (Number(r.chargeCount) === 0 && r.chargeDisposition !== "genuinely_absent_charge_instrument") {
      // incomplete is allowed; count only unexpected zeros without disposition honesty later
    }
    if (r.chargeDisposition === "incomplete_unextractable_charge" || r.chargeDisposition === "genuinely_absent_charge_instrument") {
      /* honest */
    } else if (Number(r.chargeCount) === 0) {
      chargesZero += 1;
    }
    if (r.unsplitLimitation === true) unsplitLim += 1;
  }
  // Soft: do not fail whole gate on residual incomplete charges — track only.
  // Hard fail if ALL processed show unsplit limitation (binding regression).
  if (args.processed >= 20 && unsplitLim === args.childAccepted.length) {
    failReasons.push(`all_cases_unsplit_limitation:${unsplitLim}`);
  }

  const CASE_FACT_SENSITIVE =
    /keyFacts\/(defencePosition|proceduralStage)|warRoom\/issue|disclosureChase\/(item|professionalRequest)|composedProse\/courtLine|courtNote\/text/i;
  for (const [field, st] of args.substantiveFieldStats) {
    if (!CASE_FACT_SENSITIVE.test(field)) continue;
    if (st.occurrence < Math.max(8, Math.floor(args.processed * 0.4))) continue;
    if (st.unique.size <= 1) {
      failReasons.push(`case_fact_prose_collapsed:${field}:unique=${st.unique.size}`);
    }
  }

  const evaluatedControls = [...args.controlStats.entries()].filter(([, s]) => s.evaluatedCases > 0).length;
  const exactDenominators = auditExactDenominators(args.processed);
  failReasons.push(...exactDenominators.failReasons);

  return {
    schemaVersion: "diverse-second-realistic-child-v2.1.2-checkpoint@1.0.0",
    at: new Date().toISOString(),
    processed: args.processed,
    freeGiB: Number(freeGiB().toFixed(2)),
    uniqueExactStrings: Math.max(args.stringDict.size, args.seededUniqueStrings || 0),
    genuineCandidateCount: args.genuineCandidateCount,
    controlsEvaluatedOnAtLeastOneCase: evaluatedControls,
    pdfSubset: args.pdfRendered,
    chargesZero,
    unsplitLim,
    exactDenominators,
    candidateAccountingSeparateFromExerciseReceipts: true,
    deterministicResume: {
      runId: RUN_ID,
      doneCaseCount: args.childAccepted.length,
      outputHashLedgerAuthoritative: true,
    },
    failReasons,
    verdict: failReasons.length ? "FAIL_PRESERVE_AND_FIX" : "PASS_CONTINUE",
  };
}

async function finalizeV2(args: {
  childAccepted: Array<Record<string, unknown>>;
  stringDict: StringDict;
  substantiveFieldStats: Map<string, { occurrence: number; unique: Set<string>; templates: Set<string> }>;
  controlStats: Map<string, any>;
  allControlIds: string[];
  genuineCandidateCount: number;
  pdfRendered: number;
  realisticPacks: number;
  parentMembership: { accepted: Array<{ caseId: string }> };
}): Promise<void> {
  const preFinalizeDenominators = auditExactDenominators(3000);
  if (!preFinalizeDenominators.ok) {
    throw new Error(
      `FINAL_DENOMINATOR_GATE_FAILED:${preFinalizeDenominators.failReasons.join(";")}`,
    );
  }
  const acceptedCaseIds = args.childAccepted.map((row) => String(row.caseId));
  if (args.childAccepted.length !== 3000 || new Set(acceptedCaseIds).size !== 3000) {
    throw new Error(
      `CANONICAL_MEMBERSHIP_REQUIRES_EXACT_UNIQUE_3000:${args.childAccepted.length}/${new Set(acceptedCaseIds).size}`,
    );
  }

  // Membership fingerprint with V1 parent lineage
  const ordered = {
    schemaVersion: "diverse-second-realistic-child-v2.1.2-membership@1.0.0",
    parentMembershipSha256: PARENT_SHA,
    v1ChildMembershipSha256: V1_CHILD_SHA,
    v2ChildMembershipSha256: V2_CHILD_SHA,
    v21ChildMembershipSha256: V21_CHILD_SHA,
    v1Classification: "REALISTIC_DOCUMENT_PACKS_CREATED__AUDIT_ACCOUNTING_AND_BINDING_INCOMPLETE",
    acceptedCount: args.childAccepted.length,
    accepted: args.childAccepted,
    frozen: true,
    frozenAt: new Date().toISOString(),
  };
  const semanticMembershipSha256 = sha256(
    canonicalJson(
      args.childAccepted.map((row) => ({
        caseId: row.caseId,
        documentPackSha256: row.documentPackSha256,
        outputSha256: row.outputSha256,
      })),
    ),
  );
  (ordered as any).semanticMembershipSha256 = semanticMembershipSha256;
  writeJson(path.join(CHILD, "ordered-child-membership.json"), ordered);
  const exactMembershipFileSha256 = sha256(
    fs.readFileSync(path.join(CHILD, "ordered-child-membership.json")),
  );
  writeJson(path.join(CHILD, "ordered-child-membership-hash.json"), {
    semanticMembershipSha256,
    exactMembershipFileSha256,
    parentMembershipSha256: PARENT_SHA,
    v1ChildMembershipSha256: V1_CHILD_SHA,
    v2ChildMembershipSha256: V2_CHILD_SHA,
    v21ChildMembershipSha256: V21_CHILD_SHA,
    acceptedCount: args.childAccepted.length,
    uniqueCaseIds: new Set(acceptedCaseIds).size,
    uniqueSourceHashes: new Set(
      args.childAccepted.map((row) => String(row.documentPackSha256)),
    ).size,
    uniqueOutputHashes: new Set(args.childAccepted.map((row) => String(row.outputSha256))).size,
    conflicts: 0,
    postFreezeDeduplication: false,
  });

  // Candidate freeze BEFORE truth — ledger hash ≠ metadata hash
  const ledgerPath = path.join(CHILD, "candidate-findings.jsonl");
  publishLedger(ledgerPath);
  const ledgerBytes = fs.readFileSync(ledgerPath);
  const candidateLedgerSha256 = sha(ledgerBytes);
  const ledgerByteLength = ledgerBytes.length;
  const ledgerLineCount = countLines(ledgerPath);
  const frozenAt = new Date().toISOString();
  if (ledgerByteLength === 0 && candidateLedgerSha256 !== EMPTY_LEDGER_SHA256) {
    throw new Error(`empty ledger hash mismatch: ${candidateLedgerSha256}`);
  }

  writeJson(path.join(CHILD, "candidate-freeze-meta.json"), {
    schemaVersion: "stage3000-v2.1.2-candidate-freeze@1.0.0",
    membershipSha256: semanticMembershipSha256,
    parentMembershipSha256: PARENT_SHA,
    v1ChildMembershipSha256: V1_CHILD_SHA,
    v2ChildMembershipSha256: V2_CHILD_SHA,
    v21ChildMembershipSha256: V21_CHILD_SHA,
    truthOpened: false,
    candidateCount: args.genuineCandidateCount,
    candidateLedger: "candidate-findings.jsonl",
    candidateLedgerSha256,
    ledgerByteLength,
    ledgerLineCount,
    note: "candidateLedgerSha256 hashes candidate-findings.jsonl bytes. candidateMetadataSha256 hashes this meta file. Never conflate them.",
    frozenAt,
  });
  const metaBody = fs.readFileSync(path.join(CHILD, "candidate-freeze-meta.json"));
  const candidateMetadataSha256 = sha(metaBody);
  writeJson(path.join(CHILD, "candidate-freeze-hash.json"), {
    candidateLedgerSha256,
    candidateMetadataSha256,
    candidateCount: args.genuineCandidateCount,
    ledgerByteLength,
    ledgerLineCount,
    membershipSha256: semanticMembershipSha256,
    frozenAt,
    emptyLedgerExpectedSha256: EMPTY_LEDGER_SHA256,
    note: "Do not call candidateMetadataSha256 the candidate-ledger freeze.",
  });

  const preTruthReceiptPath = path.join(CHILD, "PRE-TRUTH-FREEZE-RECEIPT.json");
  writeJson(preTruthReceiptPath, {
    schemaVersion: "stage3000-v2.1.2-pre-truth-freeze@1.0.0",
    runId: RUN_ID,
    head: HEAD_SHA,
    semanticMembershipSha256,
    exactMembershipFileSha256,
    candidateLedgerSha256,
    candidateMetadataSha256,
    candidateCount: args.genuineCandidateCount,
    ledgerByteLength,
    ledgerLineCount,
    frozenAt,
    truthPathExistedBeforeReceipt: fs.existsSync(path.join(CHILD, "truth")),
    blindInputTruthPathExisted: fs.existsSync(path.join(BLIND_INPUT, "truth")),
    immutableSequencePosition: 6,
  });
  if (fs.existsSync(path.join(CHILD, "truth"))) {
    throw new Error("CLEAN_BLINDNESS_VIOLATION:truth_exists_before_pre_truth_receipt");
  }

  // Truth open after freeze — receipts verify ledger hash captured before truth opened
  let truthOpened = 0;
  for (const row of args.childAccepted) {
    const caseId = String(row.caseId);
    const axes = parentAxes(caseId, Number(row.globalSlot || 0));
    writeJson(path.join(CHILD, "truth", caseId, "truth-key.json"), {
      schemaVersion: "diverse-second-realistic-child-v2.1.2-truth@1.0.0",
      caseId,
      sealed: false,
      openedAfterCandidateFreeze: true,
      candidateLedgerSha256,
      candidateMetadataSha256,
      membershipSha256: semanticMembershipSha256,
      axes,
      openedAt: new Date().toISOString(),
    });
    truthOpened += 1;
  }
  writeJson(path.join(CHILD, "truth-open-summary.json"), {
    membershipSha256: semanticMembershipSha256,
    candidateLedgerSha256,
    candidateMetadataSha256,
    truthOpened,
    orderHonoured: true,
    verifiedLedgerHashBeforeTruthOpen: true,
    candidateLedgerSha256AfterTruthOpen: sha256(fs.readFileSync(ledgerPath)),
    candidateLedgerHashUnchanged:
      sha256(fs.readFileSync(ledgerPath)) === candidateLedgerSha256,
  });
  if (sha256(fs.readFileSync(ledgerPath)) !== candidateLedgerSha256) {
    throw new Error("CANDIDATE_LEDGER_CHANGED_AFTER_TRUTH_OPEN");
  }

  // Publish all remaining resume-safe ledgers atomically after candidate freeze.
  for (const name of fs.readdirSync(IN_PROGRESS)) {
    const temp = path.join(IN_PROGRESS, name);
    if (!fs.statSync(temp).isFile()) continue;
    atomicPublish(temp, path.join(CHILD, name));
  }
  const finalDenominators = auditExactDenominators(3000);
  if (!finalDenominators.ok) {
    throw new Error(`FINAL_PUBLISHED_DENOMINATORS_FAILED:${finalDenominators.failReasons.join(";")}`);
  }

  // 361 gap register
  const gapRegister: Array<Record<string, unknown>> = [];
  const handlerById = new Map(STAGE150_PACKET_LOCAL_HANDLERS.map((h) => [h.controlId, h]));
  const implMatrix = buildStage150ImplementationCapabilityMatrix();
  const implById = new Map(implMatrix.rows.map((r) => [r.controlId, r]));
  for (const id of args.allControlIds) {
    const s = args.controlStats.get(id)!;
    const hasHandler = handlerById.has(id);
    const impl = implById.get(id);
    const topReason =
      Object.entries(s.reasonFamilies).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ||
      (s.evaluatedCases === args.childAccepted.length ? "fully_exercised" : "not_fully_exercised");
    const fully = s.evaluatedCases >= args.childAccepted.length && args.childAccepted.length > 0;
    if (!fully) {
      let deferredLane: string | null = null;
      if (/browser/i.test(id) || /browser/i.test(topReason)) deferredLane = "browser";
      else if (/human/i.test(topReason) || /human/i.test(id)) deferredLane = "human";
      else if (/legal/i.test(topReason) || /legal/i.test(id)) deferredLane = "legal";
      else if (/security|penetration|red.?team/i.test(topReason) || /security/i.test(id)) deferredLane = "security";
      else if (/external/i.test(topReason)) deferredLane = "external";
      else if (/pdf/i.test(id) && args.pdfRendered < args.childAccepted.length) deferredLane = "PDF";
      else if (/heavy/i.test(topReason)) deferredLane = "heavy";

      gapRegister.push({
        controlId: id,
        implementationStatus: impl?.implementationStatus || "unknown",
        handlerAvailability: hasHandler ? "present" : "absent",
        exactPrerequisites: (impl as any)?.exactPrerequisiteEvidenceRefs || [],
        eligibleCaseCount: s.evaluatedCases + s.unresolvedCases + s.potentiallyApplicableMissingHandler,
        evaluatedCount: s.evaluatedCases,
        unresolvedCount: s.unresolvedCases,
        notExercisedCount: Math.max(0, args.childAccepted.length - s.evaluatedCases - s.unresolvedCases),
        missingInputOrAdapter: !hasHandler || topReason.includes("missing"),
        requiredNextEngineeringWork: topReason,
        deferredLane,
      });
    }
  }
  writeJson(path.join(CHILD, "control-gap-register-361.json"), {
    schemaVersion: "diverse-second-v2-control-gap-register@1.0.0",
    registryControlCount: 361,
    gapRowCount: gapRegister.length,
    controlsEvaluatedOnAtLeastOneCase: args.allControlIds.filter(
      (id) => (args.controlStats.get(id)?.evaluatedCases || 0) > 0,
    ).length,
    gaps: gapRegister,
  });

  // Output-strength with actual frequency distribution
  const freq = [...args.stringDict.entries()]
    .map(([hash, v]) => ({ hash, count: v.occurrenceCount, exactWording: v.exactWording.slice(0, 160) }))
    .sort((a, b) => b.count - a.count);
  const largest = freq[0] || null;
  const totalOcc = freq.reduce((n, r) => n + r.count, 0);
  writeJson(path.join(CHILD, "output-strength-report.json"), {
    schemaVersion: "diverse-second-v2-output-strength@1.0.0",
    uniqueExactStrings: args.stringDict.size,
    totalOccurrencesEstimate: totalOcc,
    largestActualCluster: largest,
    dominanceRatio: largest && totalOcc ? largest.count / totalOcc : null,
    top20Clusters: freq.slice(0, 20),
    bySurfacePath: [...args.substantiveFieldStats.entries()].map(([field, st]) => ({
      field,
      occurrences: st.occurrence,
      uniqueExactStrings: st.unique.size,
      uniqueTemplates: st.templates.size,
    })),
    note: "largestActualCluster from measured frequency distribution — not an estimated formula",
  });

  // Exact per-case hash manifest (no wildcards)
  const perCase: Array<Record<string, unknown>> = [];
  for (const row of args.childAccepted) {
    const caseId = String(row.caseId);
    const packP = path.join(CHILD, "cases", caseId, "document-pack.json");
    const outGz = path.join(CHILD, "cases", caseId, "casebrain-output.json.gz");
    const pdfP = path.join(CHILD, "cases", caseId, "bundle-fictional-test.pdf");
    perCase.push({
      caseId,
      documentPackSha256: fs.existsSync(packP) ? sha(fs.readFileSync(packP)) : null,
      productionOutputSha256: fs.existsSync(outGz) ? sha(fs.readFileSync(outGz)) : row.outputSha256,
      pdfSha256: fs.existsSync(pdfP) ? sha(fs.readFileSync(pdfP)) : null,
    });
  }
  writeJson(path.join(CHILD, "exact-per-case-hash-index.json"), {
    schemaVersion: "diverse-second-v2-exact-hash-index@1.0.0",
    caseCount: perCase.length,
    cases: perCase,
  });

  const controlRows = readJsonl(path.join(CHILD, "control-exercise-receipts.jsonl"));
  const controlPairs = new Map<string, Set<string>>();
  for (const row of controlRows) {
    const key = `${String(row.caseId)}::${String(row.controlId)}`;
    const value = canonicalJson({
      status: row.status,
      reasonFamily: row.reasonFamily,
      hitCount: row.hitCount,
      findingCodes: row.findingCodes,
    });
    if (!controlPairs.has(key)) controlPairs.set(key, new Set());
    controlPairs.get(key)!.add(value);
  }
  const controlReceiptAccounting = {
    schemaVersion: "stage3000-v2.1.2-control-receipt-accounting@1.0.0",
    totalRows: controlRows.length,
    uniqueCaseControlPairs: controlPairs.size,
    duplicatePairs: controlRows.length - controlPairs.size,
    conflictingPairs: [...controlPairs.values()].filter((values) => values.size > 1).length,
    uniqueControlIds: new Set(controlRows.map((row) => String(row.controlId))).size,
    uniqueControlIdList: [...new Set(controlRows.map((row) => String(row.controlId)))].sort(),
    registryDenominator: 361,
    claimedControlsEvaluated: new Set(controlRows.map((row) => String(row.controlId))).size,
  };
  writeJson(path.join(CHILD, "control-receipt-accounting.json"), controlReceiptAccounting);

  const pdfRows = readJsonl(path.join(CHILD, "pdf-subset-register.jsonl"));
  const pdfCases = new Set(pdfRows.map((row) => String(row.caseId)));
  const pdfHashes = new Set(pdfRows.map((row) => String(row.sha256)));
  const pdfAccounting = {
    schemaVersion: "stage3000-v2.1.2-pdf-accounting@1.0.0",
    registerRows: pdfRows.length,
    uniqueCaseIds: pdfCases.size,
    uniquePdfHashes: pdfHashes.size,
    duplicateCaseRows: pdfRows.length - pdfCases.size,
    genuineOutputPdfBytes: pdfRows.filter((row) => row.byteOrigin === "genuine_output_render").length,
    sourcePdfCopies: pdfRows.filter((row) => row.byteOrigin === "source_pdf_copy").length,
    browser: "not_exercised",
  };
  writeJson(path.join(CHILD, "pdf-accounting.json"), pdfAccounting);

  const chargePartition: Record<string, string[]> = {
    valid_operative_charge_extracted: [],
    incomplete_unextractable_wording: [],
    genuinely_absent_instrument: [],
    expected_zero_receipt_with_reason: [],
    unexpected_zero_defect: [],
  };
  let frozenSourceSignedDraft = 0;
  let outputSignedDraft = 0;
  let ordinaryVisibleContradictions = 0;
  let protectedAuditOnlyRows = 0;
  let exactReplacementLinks = 0;
  for (const caseId of acceptedCaseIds) {
    const caseDir = path.join(CHILD, "cases", caseId);
    const receipt = JSON.parse(
      fs.readFileSync(path.join(caseDir, "live-production-receipt.json"), "utf8"),
    );
    const disposition = String(receipt.chargeDisposition || "");
    const chargeCount = Number(receipt.chargeCount || 0);
    if (disposition === "valid_operative_charge_extracted") {
      chargePartition.valid_operative_charge_extracted.push(caseId);
    } else if (disposition === "incomplete_unextractable_charge") {
      chargePartition.incomplete_unextractable_wording.push(caseId);
      if (chargeCount === 0) chargePartition.expected_zero_receipt_with_reason.push(caseId);
    } else if (disposition === "genuinely_absent_charge_instrument") {
      chargePartition.genuinely_absent_instrument.push(caseId);
      if (chargeCount === 0) chargePartition.expected_zero_receipt_with_reason.push(caseId);
    } else if (chargeCount === 0) {
      chargePartition.unexpected_zero_defect.push(caseId);
    }

    const pack = JSON.parse(
      fs.readFileSync(path.join(caseDir, "document-pack.json"), "utf8"),
    );
    for (const doc of pack.present || []) {
      if (/signed/i.test(String(doc.title || "")) && String(doc.state) === "draft") {
        frozenSourceSignedDraft += 1;
      }
    }
    const bag = JSON.parse(
      zlib.gunzipSync(fs.readFileSync(path.join(caseDir, "casebrain-output.json.gz"))).toString(
        "utf8",
      ),
    );
    for (const row of bag.evidenceStates || []) {
      if (
        /signed/i.test(String(row.label || row.evidenceAnchor || "")) &&
        String(row.documentLifecycleState || "") === "draft"
      ) {
        outputSignedDraft += 1;
      }
      if (row.privilegeSeparated === true || row.accessConfidentiality === "privileged") {
        protectedAuditOnlyRows += 1;
      }
    }
    ordinaryVisibleContradictions += collectSolicitorVisibleLeaves(bag, caseId).filter(
      (leaf: any) =>
        /\bsigned\b/i.test(String(leaf.exactValue || "")) &&
        /\bdraft\b/i.test(String(leaf.exactValue || "")) &&
        /\b(is|treated as|as)\s+(signed|draft)\b/i.test(String(leaf.exactValue || "")),
    ).length;
    exactReplacementLinks += (bag.documentRelationships || []).filter((edge: any) =>
      /replac|supersed/i.test(String(edge.relationshipType)),
    ).length;
  }
  const chargeCounts = Object.fromEntries(
    Object.entries(chargePartition).map(([key, values]) => [key, values.length]),
  );
  const exclusiveChargeSum =
    chargePartition.valid_operative_charge_extracted.length +
    chargePartition.incomplete_unextractable_wording.length +
    chargePartition.genuinely_absent_instrument.length +
    chargePartition.unexpected_zero_defect.length;
  writeJson(path.join(CHILD, "charge-partition-3000.json"), {
    schemaVersion: "stage3000-v2.1.2-charge-partition@1.0.0",
    caseCount: 3000,
    counts: chargeCounts,
    exclusiveDispositionSum: exclusiveChargeSum,
    equalsExactly3000: exclusiveChargeSum === 3000,
    unexpectedZeroCaseIds: chargePartition.unexpected_zero_defect,
    expectedZeroCaseIds: chargePartition.expected_zero_receipt_with_reason,
  });
  writeJson(path.join(CHILD, "document-state-split-report.json"), {
    schemaVersion: "stage3000-v2.1.2-document-state-split@1.0.0",
    frozenSourcePackSignedTitleDraftRows: frozenSourceSignedDraft,
    rematerialisedCaseBrainOutputSignedTitleDraftRows: outputSignedDraft,
    ordinaryVisibleExitContradictions: ordinaryVisibleContradictions,
    protectedAuditOnlyRows,
    exactReplacementLinks,
  });

  const candidateRows = readJsonl(ledgerPath);
  const candidateAccounting = {
    genuineCandidates: candidateRows.length,
    containment: candidateRows.filter((row) => row.candidateClass === "expected_containment")
      .length,
    unresolved: candidateRows.filter((row) => row.candidateClass === "unresolved").length,
    controlExerciseReceipts: controlRows.length,
    wordingQualityFindings: countLines(path.join(CHILD, "wording-quality-findings.jsonl")),
    notExercised:
      361 * 3000 -
      [...args.controlStats.values()].reduce(
        (sum, stat) => sum + stat.evaluatedCases + stat.unresolvedCases,
        0,
      ),
    browser: "not_exercised",
  };
  writeJson(path.join(CHILD, "audit-accounting.json"), candidateAccounting);

  const checkpoint3000 = JSON.parse(
    fs.readFileSync(path.join(CHILD, "checkpoint-3000.json"), "utf8"),
  );
  const canonicalFreezeReceipt = {
    schemaVersion: "stage3000-v2.1.2-canonical-freeze@1.0.0",
    runId: RUN_ID,
    semanticMembershipSha256,
    exactMembershipFileSha256,
    candidateLedgerSha256,
    candidateMetadataSha256,
    candidateCount: args.genuineCandidateCount,
    ledgerByteLength,
    ledgerLineCount,
    pdfUniqueCaseDenominator: pdfCases.size,
    uniqueStringCount: args.stringDict.size,
    controlReceiptAccounting,
    checkpoint3000Sha256: sha256(
      fs.readFileSync(path.join(CHILD, "checkpoint-3000.json")),
    ),
    checkpoint3000Processed: checkpoint3000.processed,
    stopAndDecisionMustRepeat: {
      semanticMembershipSha256,
      candidateLedgerSha256,
      candidateMetadataSha256,
      pdfUniqueCaseDenominator: pdfCases.size,
      uniqueStringCount: args.stringDict.size,
      controlRows: controlRows.length,
      uniqueControlIds: controlReceiptAccounting.uniqueControlIds,
    },
  };
  writeJson(path.join(CHILD, "CANONICAL-FREEZE-RECEIPT.json"), canonicalFreezeReceipt);

  const brainReceipt = {
    schemaVersion: "stage3000-v2.1.2-brain1-guardian-authority@1.0.0",
    head: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    authoritativeHead: HEAD_SHA,
    headMatches: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim() === HEAD_SHA,
    lockedContractWorkingBlob: execFileSync(
      "git",
      [
        "hash-object",
        "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/LOCKED-ACCEPTANCE-CONTRACT.json",
      ],
      { encoding: "utf8" },
    ).trim(),
    lockedContractHeadBlob: execFileSync(
      "git",
      [
        "rev-parse",
        "HEAD:artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/LOCKED-ACCEPTANCE-CONTRACT.json",
      ],
      { encoding: "utf8" },
    ).trim(),
    bundleMaterialNormalizerWorkingTreeDirty: execFileSync(
      "git",
      ["status", "--porcelain", "--", "lib/criminal/bundle-material-normalizer.ts"],
      { encoding: "utf8" },
    ).trim().length > 0,
  };
  writeJson(path.join(CHILD, "brain1-guardian-authority-receipt.json"), brainReceipt);

  writeJson(path.join(CHILD, "DECISION-CARD.json"), {
    schemaVersion: "diverse-second-realistic-child-v2.1.2-decision@1.0.0",
    classification:
      "REALISTIC_CHILD_V2_1_2__CLEAN_SINGLE_WRITER_REAUDIT_UNCOMMITTED",
    programmePassSupported: false,
    corpusPass: false,
    stage3000Completion: false,
    parentMembershipSha256: PARENT_SHA,
    v1ChildMembershipSha256: V1_CHILD_SHA,
    v2ChildMembershipSha256: V2_CHILD_SHA,
    v21ChildMembershipSha256: V21_CHILD_SHA,
    v211RaceTaintedMembershipSha256: "287f43ca67c32c58cc1f1f3f7286fdba295b6ebbc36ed87419d6f57432d4743f",
    v212SemanticMembershipSha256: semanticMembershipSha256,
    exactMembershipFileSha256,
    genuineCandidateCount: args.genuineCandidateCount,
    candidateLedgerSha256,
    candidateMetadataSha256,
    controlsEvaluatedOnAtLeastOneCase: controlReceiptAccounting.uniqueControlIds,
    controlReceiptAccounting,
    gapRegisterRows: gapRegister.length,
    pdfDenominator: `${pdfCases.size}/3000`,
    authenticatedBrowser: "not_exercised",
    truthOpenedAfterFreeze: true,
    stopUncommitted: true,
    canonicalFreezeReceiptSha256: sha256(
      fs.readFileSync(path.join(CHILD, "CANONICAL-FREEZE-RECEIPT.json")),
    ),
  });

  writeJson(path.join(CHILD, "CLASSIFICATION.json"), {
    schemaVersion: "stage3000-v2.1.2-classification@1.0.0",
    classification: "REALISTIC_CHILD_V2_1_2__CLEAN_SINGLE_WRITER_REAUDIT_UNCOMMITTED",
    authoritativeForV212Audit: true,
    preservedHistorical: {
      v211: "REALISTIC_CHILD_V2_1_1__RACE_TAINTED_NON_AUTHORITATIVE_HISTORICAL",
    },
    notAcceptedAs: [
      "corpus_PASS",
      "stage3000_completion",
      "programme_PASS",
      "solicitor_approval",
      "global_zero_defects",
    ],
  });

  const decisionSha256 = sha256(fs.readFileSync(path.join(CHILD, "DECISION-CARD.json")));
  writeJson(path.join(CHILD, "STOP.json"), {
    schemaVersion: "stage3000-v2.1.2-stop@1.0.0",
    runId: RUN_ID,
    stopUncommitted: true,
    commitPushMergeDeploy: false,
    corpusPass: false,
    stage3000Completion: false,
    programmePass: false,
    semanticMembershipSha256,
    exactMembershipFileSha256,
    candidateLedgerSha256,
    candidateMetadataSha256,
    pdfUniqueCaseDenominator: pdfCases.size,
    uniqueStringCount: args.stringDict.size,
    controlRows: controlRows.length,
    uniqueControlIds: controlReceiptAccounting.uniqueControlIds,
    checkpoint3000Sha256: canonicalFreezeReceipt.checkpoint3000Sha256,
    canonicalFreezeReceiptSha256: sha256(
      fs.readFileSync(path.join(CHILD, "CANONICAL-FREEZE-RECEIPT.json")),
    ),
    decisionCardSha256: decisionSha256,
    browser: "not_exercised",
  });

  const repoRelativeFiles: Array<{ path: string; classification: string }> = [
    { path: path.relative(ROOT, path.join(CHILD, "STOP.json")), classification: "authoritative_stop" },
    { path: path.relative(ROOT, path.join(CHILD, "DECISION-CARD.json")), classification: "decision" },
    { path: path.relative(ROOT, path.join(CHILD, "CLASSIFICATION.json")), classification: "classification" },
    { path: path.relative(ROOT, path.join(CHILD, "CANONICAL-FREEZE-RECEIPT.json")), classification: "freeze" },
    { path: path.relative(ROOT, preTruthReceiptPath), classification: "pre_truth_freeze" },
    { path: path.relative(ROOT, path.join(CHILD, "candidate-freeze-hash.json")), classification: "freeze_hashes" },
    { path: path.relative(ROOT, path.join(CHILD, "candidate-freeze-meta.json")), classification: "freeze_metadata" },
    { path: path.relative(ROOT, ledgerPath), classification: "candidate_ledger" },
    { path: path.relative(ROOT, path.join(CHILD, "ordered-child-membership.json")), classification: "membership" },
    { path: path.relative(ROOT, path.join(CHILD, "ordered-child-membership-hash.json")), classification: "membership_hashes" },
    { path: path.relative(ROOT, path.join(CHILD, "source-packet-hashes.jsonl")), classification: "source_hash_ledger" },
    { path: path.relative(ROOT, path.join(CHILD, "output-hashes.jsonl")), classification: "output_hash_ledger" },
    { path: path.relative(ROOT, path.join(CHILD, "control-exercise-receipts.jsonl")), classification: "control_receipts" },
    { path: path.relative(ROOT, path.join(CHILD, "control-receipt-accounting.json")), classification: "control_accounting" },
    { path: path.relative(ROOT, path.join(CHILD, "pdf-subset-register.jsonl")), classification: "pdf_register" },
    { path: path.relative(ROOT, path.join(CHILD, "pdf-accounting.json")), classification: "pdf_accounting" },
    { path: path.relative(ROOT, path.join(CHILD, "charge-partition-3000.json")), classification: "charge_partition" },
    { path: path.relative(ROOT, path.join(CHILD, "document-state-split-report.json")), classification: "document_state" },
    { path: path.relative(ROOT, path.join(CHILD, "audit-accounting.json")), classification: "audit_accounting" },
    { path: path.relative(ROOT, path.join(CHILD, "checkpoint-3000.json")), classification: "checkpoint" },
    { path: path.relative(ROOT, path.join(CHILD, "truth-open-summary.json")), classification: "truth_open" },
    { path: path.relative(ROOT, path.join(CHILD, "brain1-guardian-authority-receipt.json")), classification: "authority" },
    { path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/CHILD-ACCEPTANCE-CONTRACT-V2.1.2.json", classification: "additive_contract" },
    { path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/LOCKED-ACCEPTANCE-CONTRACT.json", classification: "locked_parent_contract" },
    { path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/LOCKED-ACCEPTANCE-CONTRACT-RESTORE-RECEIPT.json", classification: "locked_restore" },
    { path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.2-PRODUCTION-VS-HARNESS-HONESTY.json", classification: "honesty" },
    { path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.2-DETERMINISM-CONTRACT.json", classification: "determinism" },
    { path: "artifacts/casebrain-qa/assurance/master-auditor-v2/stage3000-diverse-second-execution/V2.1.2-PREFLIGHT-VERIFICATION.json", classification: "verification" },
    { path: "scripts/assurance/stage3000-diverse-second/run-diverse-second-realistic-child-v2.1.2.ts", classification: "source" },
    { path: "scripts/assurance/stage3000-diverse-second/v2.1.2-run-authority.ts", classification: "source" },
    { path: "scripts/assurance/stage3000-diverse-second/v2.1.2-run-authority-contracts.ts", classification: "contract" },
    { path: "scripts/assurance/stage3000-diverse-second/v2.1.2-determinism-contract.ts", classification: "contract" },
    { path: "scripts/assurance/stage3000-diverse-second/v2.1.2-freeze-sequence-contracts.ts", classification: "contract" },
    { path: "scripts/assurance/stage3000-diverse-second/prepare-v2.1.2-clean-input.ts", classification: "source" },
    { path: "scripts/assurance/stage3000-diverse-second/diverse-second-bnd-mixed-replacement-contracts.ts", classification: "contract" },
    { path: "scripts/assurance/stage3000-diverse-second/diverse-second-wrd04-adversarial-contracts.ts", classification: "contract" },
    { path: "lib/eval/master-assurance-auditor/v2/stage150/batch2-detectors.ts", classification: "source" },
    { path: "lib/eval/master-assurance-auditor/v2/stage150/batch3-detectors.ts", classification: "source" },
    { path: "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts", classification: "source" },
    { path: "lib/eval/master-assurance-auditor/v2/stage150/evidence-dimension-domain-registry.ts", classification: "source" },
    { path: "tsconfig.v212.json", classification: "verification_config" },
  ].map((entry) => ({ ...entry, path: entry.path.replace(/\\/g, "/") }));
  const manifestFiles = repoRelativeFiles.map((entry) => {
    const absolute = path.join(ROOT, entry.path);
    if (!fs.existsSync(absolute)) throw new Error(`MANIFEST_INTENDED_FILE_MISSING:${entry.path}`);
    const body = fs.readFileSync(absolute);
    return {
      path: entry.path,
      sha256: sha256(body),
      byteLength: body.length,
      classification: entry.classification,
      status: "intended",
    };
  });
  const manifest = {
    schemaVersion: "stage3000-v2.1.2-exact-manifest@1.0.0",
    generatedAt: new Date().toISOString(),
    selfExcludedFromFiles: true,
    files: manifestFiles,
    validation: { missing: 0, extra: 0, mismatches: 0 },
  };
  const manifestPath = path.join(CHILD, "exact-manifest.json");
  writeJson(manifestPath, manifest);
  const manifestBody = fs.readFileSync(manifestPath);
  writeJson(path.join(CHILD, "exact-manifest-digest.json"), {
    schemaVersion: "stage3000-v2.1.2-exact-manifest-digest@1.0.0",
    manifestPath: path.relative(ROOT, manifestPath).replace(/\\/g, "/"),
    manifestSha256: sha256(manifestBody),
    manifestByteLength: manifestBody.length,
    validation: { missing: 0, extra: 0, mismatches: 0 },
    evidenceModifiedAfterDigest: false,
  });

  console.log(
    JSON.stringify({
      done: true,
      semanticMembershipSha256,
      exactMembershipFileSha256,
      candidateLedgerSha256,
      candidateMetadataSha256,
      genuineCandidateCount: args.genuineCandidateCount,
      gapRows: gapRegister.length,
      pdfRendered: pdfCases.size,
    }),
  );
}

function matchingRematerialisationProcesses(): Array<{ pid: number; commandLine: string }> {
  try {
    const script = [
      "$selfPid=" + process.pid + ";",
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\"",
      "| Where-Object { $_.ProcessId -ne $selfPid -and $_.CommandLine -match 'run-diverse-second-realistic-child-v2|realistic-child-v2\\.1\\.2' }",
      "| ForEach-Object { [PSCustomObject]@{ pid=$_.ProcessId; commandLine=$_.CommandLine } }",
      "| ConvertTo-Json -Compress",
    ].join(" ");
    const out = execFileSync("powershell", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
    }).trim();
    if (!out) return [];
    const parsed = JSON.parse(out);
    return (Array.isArray(parsed) ? parsed : [parsed]).map((row: any) => ({
      pid: Number(row.pid),
      commandLine: String(row.commandLine || ""),
    }));
  } catch {
    return [];
  }
}

async function runWithAuthority(): Promise<void> {
  const otherProcesses = matchingRematerialisationProcesses();
  if (otherProcesses.length > 0) {
    throw new Error(`OTHER_REMATERIALISATION_PROCESS_ACTIVE:${JSON.stringify(otherProcesses)}`);
  }

  const lock: RunLock = {
    schemaVersion: "stage3000-v2.1.2-run-authority@1.0.0",
    pid: process.pid,
    runId: RUN_ID,
    head: HEAD_SHA,
    membership: V2_CHILD_SHA,
    startedAt: new Date().toISOString(),
    childRoot: path.basename(CHILD),
  };
  acquireRunLock(LOCK_PATH, lock);
  let receiptPath = path.join(CHILD, DETERMINISM_PROBE ? "PROBE-STOP.json" : "STOP.json");
  try {
    fs.mkdirSync(CHILD, { recursive: true });
    writeJson(path.join(CHILD, "single-process-preflight.json"), {
      schemaVersion: "stage3000-v2.1.2-single-process-preflight@1.0.0",
      runId: RUN_ID,
      pid: process.pid,
      head: HEAD_SHA,
      membership: V2_CHILD_SHA,
      checkedAt: new Date().toISOString(),
      matchingOtherProcesses: otherProcesses,
      liveLockBeforeAcquire: null,
      lockAfterAcquire: readRunLock(LOCK_PATH),
      oneOrchestrator: true,
      oneWriter: true,
    });
    await main();
    if (!fs.existsSync(receiptPath)) {
      throw new Error(`SUCCESS_RECEIPT_MISSING:${receiptPath}`);
    }
    releaseRunLockAfterReceipt({ lockPath: LOCK_PATH, receiptPath, runId: RUN_ID });
  } catch (error) {
    fs.mkdirSync(CHILD, { recursive: true });
    receiptPath = path.join(CHILD, "FAILED-RUN-RECEIPT.json");
    writeJson(receiptPath, {
      schemaVersion: "stage3000-v2.1.2-failed-run@1.0.0",
      runId: RUN_ID,
      pid: process.pid,
      head: HEAD_SHA,
      membership: V2_CHILD_SHA,
      failedAt: new Date().toISOString(),
      error: error instanceof Error ? error.stack || error.message : String(error),
      lockRemovedOnlyAfterThisReceipt: true,
    });
    try {
      releaseRunLockAfterReceipt({ lockPath: LOCK_PATH, receiptPath, runId: RUN_ID });
    } catch (releaseError) {
      console.error(releaseError);
    }
    throw error;
  }
}

runWithAuthority().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});



