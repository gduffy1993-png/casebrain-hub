/**
 * V2.1.2 named-control exercise runner for the Stage-3000 diverse second pilot.
 * Batch-9 controls invoke evaluateBatch9Control + buildBatch9ExerciseReceipt.
 * Phrase-probe controls are never claimed as named-evaluated.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { SourceLeaf } from "../../../lib/eval/master-assurance-auditor/v2/every-word/independent-leaf-inventory";
import {
  buildEvalContext,
  evaluateProfessionalWording,
  type Stage150EvalContext,
  type Stage150Hit,
} from "../../../lib/eval/master-assurance-auditor/v2/stage150/detectors";
import {
  BATCH9_SPEC_BY_ID,
  evaluateBatch9Control,
  buildBatch9ExerciseReceipt,
  BATCH9_BEHAVIOURAL_FIXTURE_MATRIX,
} from "../../../lib/eval/master-assurance-auditor/v2/stage150/batch9";

/** Same 15 core controls as V2.1.1. */
export const CORE_CONTROLS = [
  "MAA2-BND-02-INSTRUMENT-STATUS",
  "MAA2-BND-04-VERSION-PRECEDENCE",
  "MAA2-BND-05-MISSING-ATTACHMENTS",
  "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
  "MAA2-CHG-05-OPERATIVE-INSTRUMENT",
  "MAA2-ATR-01-DEFENDANT-SEPARATION",
  "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
  "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE",
  "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
  "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
  "MAA2-CHS-03-PROVENANCE-LINK",
  "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
  "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
  "MAA-COMPLETENESS",
  "MAA2-WRD-15-NO-ABSOLUTE-PROOF",
] as const;

export type CoreControlId = (typeof CORE_CONTROLS)[number];

const BATCH9_CORE = new Set<string>([
  "MAA2-BND-02-INSTRUMENT-STATUS",
  "MAA2-BND-04-VERSION-PRECEDENCE",
  "MAA2-BND-05-MISSING-ATTACHMENTS",
  "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
  "MAA2-CHG-05-OPERATIVE-INSTRUMENT",
  "MAA2-ATR-01-DEFENDANT-SEPARATION",
  "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE",
  "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
  "MAA2-CHS-02-SPECIFIC-ITEM-REQUEST",
  "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
  "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
]);

/** Structured named-control evaluators (ATR-02 / CHS-03) — not phrase probes. */
const STRUCTURED_NAMED = new Set<string>([
  "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
  "MAA2-CHS-03-PROVENANCE-LINK",
]);

const FOUNDATION_CONTRACT =
  "scripts/maa-v2-every-word-foundation-contracts.test.ts";
const V212_STRUCTURED_CONTRACT =
  "scripts/assurance/stage3000-diverse-second/v2.1.2-focused-contracts.test.ts";

export type NamedControlExerciseRow = {
  controlId: string;
  handlerModule: string;
  handlerFunction: string;
  handlerId: string | null;
  controlVersion: string | null;
  implementationStatus: string;
  exerciseStatus:
    | "evaluated"
    | "unresolved"
    | "not_exercised"
    | "probe_evaluated_named_control_not_exercised";
  applicable: boolean;
  applicableUnitCount: number;
  missingPrerequisiteReason: string | null;
  inputFieldRefs: string[];
  inputHashes: Record<string, string>;
  sourcePageRefs: string[];
  exitRefs: string[];
  findingIds: string[];
  findings: any[];
  contracts: {
    positive: string | null;
    negative: string | null;
    unavailable: string | null;
    mutation: string | null;
  };
  receiptNote: string;
};

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function repoRoot(): string {
  return process.cwd();
}

type RegistryControl = { controlId: string; version?: string };
type ImplHandler = {
  controlId: string;
  handlerId?: string;
  implementationStatus?: string;
  positiveContract?: string;
  negativeContract?: string;
};

let _registryById: Map<string, RegistryControl> | null = null;
let _implById: Map<string, ImplHandler> | null = null;

function loadRegistry(): Map<string, RegistryControl> {
  if (_registryById) return _registryById;
  const p = path.join(
    repoRoot(),
    "artifacts/casebrain-qa/assurance/master-auditor-v2/auditor-control-registry-v2.json",
  );
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { controls?: RegistryControl[] };
  _registryById = new Map((raw.controls ?? []).map((c) => [c.controlId, c]));
  return _registryById;
}

function loadImplMap(): Map<string, ImplHandler> {
  if (_implById) return _implById;
  const p = path.join(
    repoRoot(),
    "artifacts/casebrain-qa/assurance/master-auditor-v2/control-implementation-and-authority-map.json",
  );
  const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { handlers?: ImplHandler[] };
  _implById = new Map((raw.handlers ?? []).map((h) => [h.controlId, h]));
  return _implById;
}

function pointerValue(output: Record<string, unknown>, pointer: string): unknown {
  if (!pointer.startsWith("/")) return undefined;
  const parts = pointer
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
  let cur: unknown = output;
  for (const part of parts) {
    if (cur == null) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(part);
      cur = Number.isInteger(idx) ? cur[idx] : undefined;
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

function hashInputs(output: Record<string, unknown>, refs: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ref of refs) {
    const v = pointerValue(output, ref);
    out[ref] = sha256(v === undefined ? "absent" : JSON.stringify(v));
  }
  return out;
}

function collectSourcePageRefs(output: Record<string, unknown>): string[] {
  const refs: string[] = [];
  const states = Array.isArray(output.evidenceStates) ? output.evidenceStates : [];
  states.forEach((row, i) => {
    if (row && typeof row === "object" && (row as any).pageIdentityKnown === true && typeof (row as any).sourcePage === "string") {
      refs.push(`/evidenceStates/${i}/sourcePage`);
    }
  });
  const instruments = Array.isArray(output.chargeInstruments) ? output.chargeInstruments : [];
  instruments.forEach((row, i) => {
    if (row && typeof row === "object" && typeof (row as any).sourcePage === "string") {
      refs.push(`/chargeInstruments/${i}/sourcePage`);
    }
  });
  return refs;
}

function collectExitRefs(output: Record<string, unknown>): string[] {
  const bag = output.exitPayloadReceipts;
  if (!bag || typeof bag !== "object") return [];
  return Object.keys(bag as object).map((k) => `/exitPayloadReceipts/${k}`);
}

function contractsFor(controlId: string): NamedControlExerciseRow["contracts"] {
  const spec = BATCH9_SPEC_BY_ID.get(controlId);
  if (spec) {
    return {
      positive: spec.contractRefs.positiveContract,
      negative: spec.contractRefs.negativeContract,
      unavailable: spec.contractRefs.unavailableContract,
      mutation: spec.contractRefs.mutationContract,
    };
  }
  const impl = loadImplMap().get(controlId);
  if (controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF") {
    return {
      positive: `${FOUNDATION_CONTRACT}#MAA2-WRD-15-NO-ABSOLUTE-PROOF_positive`,
      negative: `${FOUNDATION_CONTRACT}#MAA2-WRD-15-NO-ABSOLUTE-PROOF_negative`,
      unavailable: null,
      mutation: null,
    };
  }
  if (controlId === "MAA-COMPLETENESS") {
    return {
      positive: impl?.positiveContract ?? `${FOUNDATION_CONTRACT}#positive`,
      negative: impl?.negativeContract ?? `${FOUNDATION_CONTRACT}#negative`,
      unavailable: null,
      mutation: null,
    };
  }
  if (STRUCTURED_NAMED.has(controlId)) {
    return {
      positive: `${V212_STRUCTURED_CONTRACT}#${controlId}-positive`,
      negative: `${V212_STRUCTURED_CONTRACT}#${controlId}-negative`,
      unavailable: `${V212_STRUCTURED_CONTRACT}#${controlId}-unavailable`,
      mutation: `${V212_STRUCTURED_CONTRACT}#${controlId}-mutation`,
    };
  }
  return {
    positive: impl?.positiveContract ?? null,
    negative: impl?.negativeContract ?? null,
    unavailable: null,
    mutation: null,
  };
}

function mapBatch9ExerciseStatus(
  status: string,
): "evaluated" | "unresolved" | "not_exercised" {
  if (status === "evaluated" || status === "unresolved" || status === "not_exercised") {
    return status;
  }
  return "not_exercised";
}

function exerciseBatch9(
  ctx: Stage150EvalContext,
  controlId: string,
): {
  hits: Stage150Hit[];
  exerciseStatus: "evaluated" | "unresolved" | "not_exercised";
  applicable: boolean;
  applicableUnitCount: number;
  missingPrerequisiteReason: string | null;
  handlerId: string;
  receiptNote: string;
  inputFieldRefs: string[];
} {
  const spec = BATCH9_SPEC_BY_ID.get(controlId);
  if (!spec) {
    throw new Error(`CORE Batch-9 control missing BATCH9_SPEC: ${controlId}`);
  }
  const hits = evaluateBatch9Control(ctx, controlId);
  const receipt = buildBatch9ExerciseReceipt({ ctx, controlId, hits });
  return {
    hits,
    exerciseStatus: mapBatch9ExerciseStatus(receipt.namedControlExerciseStatus),
    applicable: receipt.applicableCase,
    applicableUnitCount: receipt.applicableRecordCount,
    missingPrerequisiteReason: receipt.missingInputReason,
    handlerId: spec.handlerId,
    receiptNote: receipt.note,
    inputFieldRefs: [...spec.exactPrerequisites],
  };
}

function exerciseWrd15(ctx: Stage150EvalContext): {
  hits: Stage150Hit[];
  exerciseStatus: "evaluated" | "unresolved" | "not_exercised";
  applicable: boolean;
  applicableUnitCount: number;
  missingPrerequisiteReason: string | null;
  handlerId: string;
  receiptNote: string;
  inputFieldRefs: string[];
} {
  const wordingLeaves = ctx.leaves.filter(
    (l) =>
      l.disposition === "included_solicitor_visible" &&
      typeof l.exactValue === "string" &&
      l.exactValue.trim().length > 0,
  );
  if (wordingLeaves.length === 0) {
    return {
      hits: [],
      exerciseStatus: "not_exercised",
      applicable: false,
      applicableUnitCount: 0,
      missingPrerequisiteReason: "No included solicitor-visible wording leaves to exercise absolute_proof_ban.",
      handlerId: "absolute_proof_ban",
      receiptNote: "MAA2-WRD-15 not exercised — no included wording leaves.",
      inputFieldRefs: ["included_solicitor_visible_leaves"],
    };
  }
  const all = evaluateProfessionalWording(ctx);
  const hits = all.filter(
    (h) => h.controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF" || h.handlerId === "absolute_proof_ban",
  );
  return {
    hits,
    exerciseStatus: "evaluated",
    applicable: true,
    applicableUnitCount: wordingLeaves.length,
    missingPrerequisiteReason: null,
    handlerId: "absolute_proof_ban",
    receiptNote: `absolute_proof_ban exercised on ${wordingLeaves.length} included wording leaf(ves); findings=${hits.length}.`,
    inputFieldRefs: wordingLeaves.map((l) => l.jsonPointer),
  };
}

function exerciseCompleteness(ctx: Stage150EvalContext): {
  hits: Stage150Hit[];
  exerciseStatus: "evaluated" | "unresolved" | "not_exercised";
  applicable: boolean;
  applicableUnitCount: number;
  missingPrerequisiteReason: string | null;
  handlerId: string;
  receiptNote: string;
  inputFieldRefs: string[];
} {
  const impl = loadImplMap().get("MAA-COMPLETENESS");
  const handlerId = impl?.handlerId ?? "professional_wording__MAA-COMPLETENESS";
  const applicableLeaves = ctx.leaves.filter(
    (l) =>
      l.disposition === "included_solicitor_visible" ||
      l.disposition === "included_structural_empty",
  );
  if (applicableLeaves.length === 0) {
    return {
      hits: [],
      exerciseStatus: "not_exercised",
      applicable: false,
      applicableUnitCount: 0,
      missingPrerequisiteReason: "No included wording/structural leaves for MAA-COMPLETENESS.",
      handlerId,
      receiptNote: "MAA-COMPLETENESS not exercised — no applicable leaves.",
      inputFieldRefs: [],
    };
  }
  const emptyLeaves = applicableLeaves.filter((l) => {
    // Optional structural empties / null blockedReason / internal fingerprint ledgers are NOT defects.
    if (l.disposition === "included_structural_empty") return false;
    if (/sourceTruthGuardian|fingerprint\/ledger|blockedReason$/i.test(l.jsonPointer)) return false;
    if (/\/(linkedRoutes|decisions|flags|coDefendants|relatedMaterialIds|sourceAnchors|evidenceAnchors)$/i.test(l.jsonPointer))
      return false;
    if (/\/chronologyEvents$/i.test(l.jsonPointer)) return false;
    if (/chargeCompleteness\/instruments$/i.test(l.jsonPointer)) return false;
    return (
      l.exactValue == null ||
      (typeof l.exactValue === "string" && l.exactValue.trim().length === 0)
    );
  });
  // Only solicitor-visible empties count as completeness hits.
  const solicitorEmpty = emptyLeaves.filter((l) => l.disposition === "included_solicitor_visible");
  const hits: Stage150Hit[] = solicitorEmpty.map((l) => ({
    engineId: "professional_wording",
    handlerId,
    controlId: "MAA-COMPLETENESS",
    findingCode: "V1_GENERIC",
    occurrenceRef: l.jsonPointer,
    exactWording: l.exactValue ?? "",
    candidateClass: "candidate_defect",
    plainEnglish: "Empty solicitor-visible wording leaf.",
    evidenceRefs: [l.jsonPointer],
  }));
  return {
    hits,
    exerciseStatus: "evaluated",
    applicable: true,
    applicableUnitCount: applicableLeaves.filter((l) => l.disposition === "included_solicitor_visible")
      .length,
    missingPrerequisiteReason: null,
    handlerId,
    receiptNote:
      solicitorEmpty.length === 0
        ? `MAA-COMPLETENESS clean evaluated on solicitor-visible leaves; structural empties excluded.`
        : `MAA-COMPLETENESS evaluated; emptySolicitorLeaves=${solicitorEmpty.length}.`,
    inputFieldRefs: applicableLeaves
      .filter((l) => l.disposition === "included_solicitor_visible")
      .map((l) => l.jsonPointer),
  };
}

function exerciseAtr02(ctx: Stage150EvalContext): {
  hits: Stage150Hit[];
  exerciseStatus: NamedControlExerciseRow["exerciseStatus"];
  applicable: boolean;
  applicableUnitCount: number;
  missingPrerequisiteReason: string | null;
  handlerId: string | null;
  receiptNote: string;
  inputFieldRefs: string[];
} {
  const graph = Array.isArray(ctx.output.attributionGraph)
    ? (ctx.output.attributionGraph as Array<Record<string, unknown>>)
    : [];
  if (graph.length === 0) {
    return {
      hits: [],
      exerciseStatus: "not_exercised",
      applicable: false,
      applicableUnitCount: 0,
      missingPrerequisiteReason:
        "attribution_graph_fields absent — ATR-02 named control requires attributionGraph[] with ownershipState/makerName/documentId",
      handlerId: "document_ownership_structured",
      receiptNote: "ATR-02 not_exercised: attributionGraph prerequisite missing.",
      inputFieldRefs: ["attribution_graph_fields", "/attributionGraph"],
    };
  }
  const hits: Stage150Hit[] = [];
  for (let i = 0; i < graph.length; i++) {
    const row = graph[i]!;
    const ownershipState = String(row.ownershipState ?? "");
    const makerName = String(row.makerName ?? "");
    const documentId = String(row.documentId ?? "");
    const ref = `/attributionGraph/${i}`;
    if (!documentId || !makerName) {
      hits.push({
        engineId: "evidence_attribution",
        handlerId: "document_ownership_structured",
        controlId: "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
        findingCode: "ATR_DOCUMENT_OWNERSHIP_INCOMPLETE",
        occurrenceRef: ref,
        exactWording: `${documentId}|${makerName}|${ownershipState}`,
        candidateClass: "unresolved",
        plainEnglish: "Attribution graph row missing documentId or makerName.",
        evidenceRefs: [ref],
      });
      continue;
    }
    if (/^(unclear|unknown|disputed|unattributed)$/i.test(ownershipState.trim())) {
      hits.push({
        engineId: "evidence_attribution",
        handlerId: "document_ownership_structured",
        controlId: "MAA2-ATR-02-DOCUMENT-OWNERSHIP",
        findingCode: "ATR_DOCUMENT_OWNERSHIP_UNCLEAR",
        occurrenceRef: ref,
        exactWording: `${documentId} ownershipState=${ownershipState}`,
        candidateClass: "unresolved",
        plainEnglish: "Document ownership/attribution unclear on attribution graph.",
        evidenceRefs: [ref, typeof row.sourcePage === "string" ? row.sourcePage : ref],
      });
    }
  }
  return {
    hits,
    exerciseStatus: "evaluated",
    applicable: true,
    applicableUnitCount: graph.length,
    missingPrerequisiteReason: null,
    handlerId: "document_ownership_structured",
    receiptNote: `ATR-02 evaluated on attributionGraph rows=${graph.length}; findings=${hits.length}.`,
    inputFieldRefs: graph.map((_, i) => `/attributionGraph/${i}`),
  };
}

function exerciseChs03(ctx: Stage150EvalContext): {
  hits: Stage150Hit[];
  exerciseStatus: NamedControlExerciseRow["exerciseStatus"];
  applicable: boolean;
  applicableUnitCount: number;
  missingPrerequisiteReason: string | null;
  handlerId: string | null;
  receiptNote: string;
  inputFieldRefs: string[];
} {
  const links = Array.isArray(ctx.output.chaseProvenanceLinks)
    ? (ctx.output.chaseProvenanceLinks as Array<Record<string, unknown>>)
    : [];
  const chase = Array.isArray((ctx.output as any)?.warningsAndGaps?.chaseItems)
    ? ((ctx.output as any).warningsAndGaps.chaseItems as Array<Record<string, unknown>>)
    : [];
  if (links.length === 0 && chase.length === 0) {
    return {
      hits: [],
      exerciseStatus: "not_exercised",
      applicable: false,
      applicableUnitCount: 0,
      missingPrerequisiteReason:
        "chase_to_evidence_provenance_links absent — CHS-03 requires chaseProvenanceLinks[] or chaseItems with provenance fields",
      handlerId: "chase_provenance_structured",
      receiptNote: "CHS-03 not_exercised: provenance link prerequisite missing.",
      inputFieldRefs: ["chase_to_evidence_provenance_links", "/chaseProvenanceLinks"],
    };
  }
  const denom = links.length > 0 ? links : chase;
  const hits: Stage150Hit[] = [];
  for (let i = 0; i < denom.length; i++) {
    const row = denom[i]!;
    const ref =
      links.length > 0
        ? `/chaseProvenanceLinks/${i}`
        : `/warningsAndGaps/chaseItems/${i}`;
    const linked =
      row.linkedEvidenceOccurrenceRef ??
      row.provenanceEvidenceRef ??
      row.evidenceUnitId ??
      null;
    const provenancePage = row.provenanceSourcePage ?? row.sourcePointer ?? row.sourceBasis ?? null;
    const label = String(row.chaseLabel ?? row.label ?? "");
    if (!linked || linked === "" || /\b(null|ghost|missing)\b/i.test(String(linked))) {
      hits.push({
        engineId: "chase_actionability",
        handlerId: "chase_provenance_structured",
        controlId: "MAA2-CHS-03-PROVENANCE-LINK",
        findingCode: "CHS_PROVENANCE_UNLINKED",
        occurrenceRef: ref,
        exactWording: label || String(row.requestId ?? ""),
        candidateClass: "unresolved",
        plainEnglish: "Chase item without linked evidence provenance reference.",
        evidenceRefs: [ref],
      });
    } else if (!provenancePage) {
      hits.push({
        engineId: "chase_actionability",
        handlerId: "chase_provenance_structured",
        controlId: "MAA2-CHS-03-PROVENANCE-LINK",
        findingCode: "CHS_PROVENANCE_PAGE_MISSING",
        occurrenceRef: ref,
        exactWording: `${label}|linked=${linked}`,
        candidateClass: "unresolved",
        plainEnglish: "Chase↔evidence link present but provenance source page missing.",
        evidenceRefs: [ref, String(linked)],
      });
    }
  }
  return {
    hits,
    exerciseStatus: "evaluated",
    applicable: true,
    applicableUnitCount: denom.length,
    missingPrerequisiteReason: null,
    handlerId: "chase_provenance_structured",
    receiptNote: `CHS-03 evaluated on provenance links/chase rows=${denom.length}; findings=${hits.length}.`,
    inputFieldRefs: denom.map((_, i) =>
      links.length > 0 ? `/chaseProvenanceLinks/${i}` : `/warningsAndGaps/chaseItems/${i}`,
    ),
  };
}

/**
 * Exercise the 15 CORE_CONTROLS against a structured Stage-150 output bag.
 */
export async function runNamedControlsForCase(args: {
  caseId: string;
  output: Record<string, unknown>;
  leaves: any[];
}): Promise<{ perControl: NamedControlExerciseRow[] }> {
  const leaves = args.leaves as SourceLeaf[];
  const ctx: Stage150EvalContext = {
    caseId: args.caseId,
    output: args.output,
    leaves,
  };
  const registry = loadRegistry();
  const implMap = loadImplMap();
  const sourcePageRefs = collectSourcePageRefs(args.output);
  const exitRefs = collectExitRefs(args.output);
  const perControl: NamedControlExerciseRow[] = [];

  for (const controlId of CORE_CONTROLS) {
    const reg = registry.get(controlId);
    const impl = implMap.get(controlId);
    let result: {
      hits: Stage150Hit[];
      exerciseStatus: NamedControlExerciseRow["exerciseStatus"];
      applicable: boolean;
      applicableUnitCount: number;
      missingPrerequisiteReason: string | null;
      handlerId: string | null;
      receiptNote: string;
      inputFieldRefs: string[];
      handlerModule: string;
      handlerFunction: string;
    };

    if (BATCH9_CORE.has(controlId)) {
      const r = exerciseBatch9(ctx, controlId);
      result = {
        ...r,
        handlerModule:
          "lib/eval/master-assurance-auditor/v2/stage150/batch9/evaluators.ts",
        handlerFunction: "evaluateBatch9Control",
      };
    } else if (controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF") {
      const r = exerciseWrd15(ctx);
      result = {
        ...r,
        handlerModule:
          "lib/eval/master-assurance-auditor/v2/stage150/detectors.ts",
        handlerFunction: "evaluateProfessionalWording",
      };
    } else if (controlId === "MAA-COMPLETENESS") {
      const r = exerciseCompleteness(ctx);
      result = {
        ...r,
        handlerModule:
          "scripts/assurance/stage3000-diverse-second/v2.1.2-named-control-runner.ts",
        handlerFunction: "exerciseCompleteness",
      };
    } else if (controlId === "MAA2-ATR-02-DOCUMENT-OWNERSHIP") {
      const r = exerciseAtr02(ctx);
      result = {
        ...r,
        handlerModule:
          "scripts/assurance/stage3000-diverse-second/v2.1.2-named-control-runner.ts",
        handlerFunction: "exerciseAtr02",
      };
    } else if (controlId === "MAA2-CHS-03-PROVENANCE-LINK") {
      const r = exerciseChs03(ctx);
      result = {
        ...r,
        handlerModule:
          "scripts/assurance/stage3000-diverse-second/v2.1.2-named-control-runner.ts",
        handlerFunction: "exerciseChs03",
      };
    } else {
      throw new Error(`Unhandled CORE control ${controlId} — refusing pilot-evaluator fallback.`);
    }

    const findings = result.hits.map((h) => ({
      controlId: h.controlId,
      handlerId: h.handlerId,
      findingCode: h.findingCode,
      occurrenceRef: h.occurrenceRef,
      exactWording: h.exactWording,
      candidateClass: h.candidateClass,
      plainEnglish: h.plainEnglish,
      evidenceRefs: h.evidenceRefs,
    }));
    const findingIds = findings.map(
      (f) => `${f.controlId}::${f.occurrenceRef}::${f.findingCode}`,
    );
    const inputBlob = JSON.stringify({
      controlId,
      refs: result.inputFieldRefs,
      applicableUnitCount: result.applicableUnitCount,
    });
    const contracts =
      controlId === "MAA2-ATR-02-DOCUMENT-OWNERSHIP" || controlId === "MAA2-CHS-03-PROVENANCE-LINK"
        ? {
            positive: `${V212_STRUCTURED_CONTRACT}#${controlId}-positive`,
            negative: `${V212_STRUCTURED_CONTRACT}#${controlId}-negative`,
            unavailable: `${V212_STRUCTURED_CONTRACT}#${controlId}-unavailable`,
            mutation: `${V212_STRUCTURED_CONTRACT}#${controlId}-mutation`,
          }
        : {
            positive: impl?.positiveContract ?? `${FOUNDATION_CONTRACT}#${controlId}`,
            negative: impl?.negativeContract ?? `${FOUNDATION_CONTRACT}#${controlId}`,
            unavailable: BATCH9_SPEC_BY_ID.get(controlId)?.contractRefs.unavailableContract ?? null,
            mutation: BATCH9_SPEC_BY_ID.get(controlId)?.contractRefs.mutationContract ?? null,
          };

    perControl.push({
      controlId,
      handlerModule: result.handlerModule,
      handlerFunction: result.handlerFunction,
      handlerId: result.handlerId ?? impl?.handlerId ?? null,
      controlVersion: reg?.version ?? null,
      implementationStatus: STRUCTURED_NAMED.has(controlId)
        ? "structured_named_evaluator_v2.1.2"
        : impl?.implementationStatus ?? (BATCH9_CORE.has(controlId) ? "batch9" : "unknown"),
      exerciseStatus: result.exerciseStatus,
      applicable: result.applicable,
      applicableUnitCount: result.applicableUnitCount,
      missingPrerequisiteReason: result.missingPrerequisiteReason,
      inputFieldRefs: result.inputFieldRefs,
      inputHashes: {
        inputFieldRefsSha256: sha256(inputBlob),
        findingsSha256: sha256(JSON.stringify(findings)),
      },
      sourcePageRefs,
      exitRefs,
      findingIds,
      findings,
      contracts,
      receiptNote: result.receiptNote,
    });
  }

  return { perControl };
}

/**
 * Behavioural contract proof using Batch-9 fixtures when available.
 * ATR-02 / CHS-03 use structured evaluator fixtures (not phrase probes).
 * Honest: missing fixtures → all false with explanatory detail.
 */
export function proveControlContracts(controlId: string): {
  positiveAlters: boolean;
  negativeAlters: boolean;
  unavailableAlters: boolean;
  mutationAlters: boolean;
  detail: string;
} {
  if (controlId === "MAA2-ATR-02-DOCUMENT-OWNERSHIP") {
    const positive = {
      attributionGraph: [
        {
          documentId: "doc-mg11-a",
          makerName: "Witness A",
          ownershipState: "assigned",
          sourcePage: "doc-mg11-a/page/1",
        },
      ],
    };
    const negative = {
      attributionGraph: [
        {
          documentId: "doc-mg11-a",
          makerName: "Witness A",
          ownershipState: "unclear",
          sourcePage: "doc-mg11-a/page/1",
        },
      ],
    };
    const unavailable = { attributionGraph: [] };
    const posHits = exerciseAtr02(buildEvalContext("atr02-pos", positive)).hits.length;
    const negHits = exerciseAtr02(buildEvalContext("atr02-neg", negative)).hits.length;
    const una = exerciseAtr02(buildEvalContext("atr02-una", unavailable));
    const mutOut = structuredClone(positive);
    (mutOut.attributionGraph[0] as any).ownershipState = "unclear";
    const mutHits = exerciseAtr02(buildEvalContext("atr02-mut", mutOut)).hits.length;
    return {
      positiveAlters: posHits === 0 && negHits > 0,
      negativeAlters: negHits > posHits,
      unavailableAlters: una.exerciseStatus === "not_exercised",
      mutationAlters: mutHits !== posHits,
      detail: `ATR-02 structured proof: pos=${posHits} neg=${negHits} una=${una.exerciseStatus} mut=${mutHits}`,
    };
  }
  if (controlId === "MAA2-CHS-03-PROVENANCE-LINK") {
    const positive = {
      chaseProvenanceLinks: [
        {
          requestId: "req-1",
          chaseLabel: "CCTV master",
          linkedEvidenceOccurrenceRef: "evidenceUnitId:eu-1",
          provenanceSourcePage: "doc-mg06/page/1",
          provenanceEvidenceRef: "evidenceUnitId:eu-1",
        },
      ],
    };
    const negative = {
      chaseProvenanceLinks: [
        {
          requestId: "req-1",
          chaseLabel: "CCTV master",
          linkedEvidenceOccurrenceRef: null,
          provenanceSourcePage: null,
          provenanceEvidenceRef: null,
        },
      ],
    };
    const unavailable = { chaseProvenanceLinks: [], warningsAndGaps: { chaseItems: [] } };
    const posHits = exerciseChs03(buildEvalContext("chs03-pos", positive)).hits.length;
    const negHits = exerciseChs03(buildEvalContext("chs03-neg", negative)).hits.length;
    const una = exerciseChs03(buildEvalContext("chs03-una", unavailable));
    const mutOut = structuredClone(positive);
    (mutOut.chaseProvenanceLinks[0] as any).linkedEvidenceOccurrenceRef = null;
    (mutOut.chaseProvenanceLinks[0] as any).provenanceEvidenceRef = null;
    (mutOut.chaseProvenanceLinks[0] as any).evidenceUnitId = null;
    const mutHits = exerciseChs03(buildEvalContext("chs03-mut", mutOut)).hits.length;
    return {
      positiveAlters: posHits === 0 && negHits > 0,
      negativeAlters: negHits > posHits,
      unavailableAlters: una.exerciseStatus === "not_exercised",
      mutationAlters: mutHits !== posHits,
      detail: `CHS-03 structured proof: pos=${posHits} neg=${negHits} una=${una.exerciseStatus} mut=${mutHits}`,
    };
  }

  if (controlId === "MAA2-WRD-15-NO-ABSOLUTE-PROOF") {
    const mkLeaves = (texts: string[]) =>
      texts.map((t, i) => ({
        leafId: `wrd-leaf-${i}`,
        caseId: "wrd-prove",
        packetRelativeFile: "casebrain-output.json" as const,
        jsonPointer: `/composedProse/line${i}`,
        arrayIndex: null,
        parentObjectIdentity: "/composedProse",
        originalDataType: "string" as const,
        exactValue: t,
        exactValueHash: sha256(t),
        disposition: "included_solicitor_visible" as const,
        dispositionReason: "fixture",
        surfaceId: "composed_prose",
        audience: "solicitor",
        exit: "copy" as const,
        copyable: true,
        blocked: false,
        solicitorVisible: true,
        finalWordingPresent: true,
      }));
    const posOut = { composedProse: { courtLine: "Allegation recorded; not proved on the papers." } };
    const negOut = {
      composedProse: { courtLine: "The disclosure absolutely proves the allegation beyond doubt." },
    };
    const unaOut = { composedProse: {} };
    const posCtx = buildEvalContext("wrd15-pos", posOut);
    posCtx.leaves = mkLeaves(["Allegation recorded; not proved on the papers."]) as any;
    const negCtx = buildEvalContext("wrd15-neg", negOut);
    negCtx.leaves = mkLeaves(["The disclosure absolutely proves the allegation beyond doubt."]) as any;
    const unaCtx = buildEvalContext("wrd15-una", unaOut);
    unaCtx.leaves = [];
    const pos = exerciseWrd15(posCtx);
    const neg = exerciseWrd15(negCtx);
    const una = exerciseWrd15(unaCtx);
    const mutOut = structuredClone(posOut);
    (mutOut.composedProse as any).courtLine = "This absolutely proves guilt beyond all doubt.";
    const mutCtx = buildEvalContext("wrd15-mut", mutOut);
    mutCtx.leaves = mkLeaves(["This absolutely proves guilt beyond all doubt."]) as any;
    const mut = exerciseWrd15(mutCtx);
    return {
      positiveAlters: pos.hits.length === 0 && neg.hits.length > 0,
      negativeAlters: neg.hits.length > pos.hits.length,
      unavailableAlters: una.exerciseStatus === "not_exercised",
      mutationAlters: mut.hits.length !== pos.hits.length,
      detail: `WRD-15 handler proof: pos=${pos.hits.length} neg=${neg.hits.length} una=${una.exerciseStatus} mut=${mut.hits.length}`,
    };
  }

  if (controlId === "MAA-COMPLETENESS") {
    // Corrected rule:
    // positive: populated solicitor-visible field → no finding
    // negative: empty required solicitor-visible field → finding
    // unavailable: no applicable field → not_exercised
    // mutation: populated required field changed to empty → finding
    const mkLeaf = (
      ptr: string,
      value: string | null,
      disposition: "included_solicitor_visible" | "included_structural_empty",
    ) => ({
      leafId: `comp-${ptr}-${disposition}-${value ?? "empty"}`,
      caseId: "comp-prove",
      packetRelativeFile: "casebrain-output.json" as const,
      jsonPointer: ptr,
      arrayIndex: null,
      parentObjectIdentity: "/",
      originalDataType: "string" as const,
      exactValue: value,
      exactValueHash: sha256(value ?? ""),
      disposition,
      dispositionReason: "fixture",
      surfaceId: "composed_prose",
      audience: "solicitor",
      exit: "copy" as const,
      copyable: true,
      blocked: false,
      solicitorVisible: true,
      finalWordingPresent: disposition === "included_solicitor_visible" && Boolean(value && value.trim()),
    });
    const posCtx = buildEvalContext("comp-pos", { composedProse: { courtLine: "Complete line." } });
    posCtx.leaves = [mkLeaf("/composedProse/courtLine", "Complete line.", "included_solicitor_visible")] as any;
    const negCtx = buildEvalContext("comp-neg", { composedProse: { courtLine: "" } });
    negCtx.leaves = [mkLeaf("/composedProse/courtLine", "", "included_solicitor_visible")] as any;
    const unaCtx = buildEvalContext("comp-una", {});
    unaCtx.leaves = [];
    const pos = exerciseCompleteness(posCtx);
    const neg = exerciseCompleteness(negCtx);
    const una = exerciseCompleteness(unaCtx);
    const mutCtx = buildEvalContext("comp-mut", { composedProse: { courtLine: "" } });
    mutCtx.leaves = [mkLeaf("/composedProse/courtLine", "", "included_solicitor_visible")] as any;
    const mut = exerciseCompleteness(mutCtx);
    return {
      positiveAlters: pos.hits.length === 0 && neg.hits.length > 0,
      negativeAlters: neg.hits.length > pos.hits.length,
      unavailableAlters: una.exerciseStatus === "not_exercised",
      mutationAlters: mut.hits.length !== pos.hits.length,
      detail: `COMPLETENESS handler proof: pos=${pos.hits.length} neg=${neg.hits.length} una=${una.exerciseStatus} mut=${mut.hits.length}`,
    };
  }

  const entry = BATCH9_BEHAVIOURAL_FIXTURE_MATRIX.get(controlId);
  if (!entry) {
    return {
      positiveAlters: false,
      negativeAlters: false,
      unavailableAlters: false,
      mutationAlters: false,
      detail: `No Batch-9 behavioural fixture for ${controlId} — cannot prove positive/negative/unavailable/mutation behavioural alteration.`,
    };
  }

  try {
    const posCtx = buildEvalContext(`prove-pos-${controlId}`, structuredClone(entry.positive.output));
    const negCtx = buildEvalContext(`prove-neg-${controlId}`, structuredClone(entry.negative.output));
    const unaCtx = buildEvalContext(
      `prove-una-${controlId}`,
      structuredClone(entry.unavailable.output),
    );

    const posHits = evaluateBatch9Control(posCtx, controlId);
    const negHits = evaluateBatch9Control(negCtx, controlId);
    const unaHits = evaluateBatch9Control(unaCtx, controlId);
    const posReceipt = buildBatch9ExerciseReceipt({
      ctx: posCtx,
      controlId,
      hits: posHits,
    });
    const negReceipt = buildBatch9ExerciseReceipt({
      ctx: negCtx,
      controlId,
      hits: negHits,
    });
    const unaReceipt = buildBatch9ExerciseReceipt({
      ctx: unaCtx,
      controlId,
      hits: unaHits,
    });

    const mutatedOutput = entry.mutation.mutate(structuredClone(entry.positive.output));
    const mutCtx = buildEvalContext(`prove-mut-${controlId}`, mutatedOutput);
    const mutHits = evaluateBatch9Control(mutCtx, controlId);
    const mutReceipt = buildBatch9ExerciseReceipt({
      ctx: mutCtx,
      controlId,
      hits: mutHits,
    });

    const positiveAlters =
      posReceipt.namedControlExerciseStatus === "evaluated" ||
      posReceipt.findingCount !== negReceipt.findingCount;
    const negativeAlters =
      negHits.length !== posHits.length ||
      negReceipt.findingCount !== posReceipt.findingCount ||
      negReceipt.findingCodes.join("|") !== posReceipt.findingCodes.join("|");
    const unavailableAlters =
      unaReceipt.namedControlExerciseStatus === "not_exercised" &&
      unaReceipt.namedControlExerciseStatus !== posReceipt.namedControlExerciseStatus;
    const mutationAlters =
      mutHits.length !== posHits.length ||
      mutReceipt.findingCount !== posReceipt.findingCount ||
      mutReceipt.namedControlExerciseStatus !== posReceipt.namedControlExerciseStatus ||
      mutReceipt.findingCodes.join("|") !== posReceipt.findingCodes.join("|");

    return {
      positiveAlters,
      negativeAlters,
      unavailableAlters,
      mutationAlters,
      detail:
        `Fixture-backed proof for ${controlId}: ` +
        `posFindings=${posReceipt.findingCount} (${posReceipt.namedControlExerciseStatus}), ` +
        `negFindings=${negReceipt.findingCount} (${negReceipt.namedControlExerciseStatus}), ` +
        `una=${unaReceipt.namedControlExerciseStatus}, ` +
        `mutFindings=${mutReceipt.findingCount} (${mutReceipt.namedControlExerciseStatus}).`,
    };
  } catch (err) {
    return {
      positiveAlters: false,
      negativeAlters: false,
      unavailableAlters: false,
      mutationAlters: false,
      detail: `Fixture present for ${controlId} but behavioural proof failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
