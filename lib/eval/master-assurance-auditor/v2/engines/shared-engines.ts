/**
 * Shared Stage-150 deterministic engines (packet-local only; no network).
 */

import type { CapturedOccurrence } from "../every-word/packet-local-capture";
import type { SharedEngineId, V2CandidateFinding } from "../every-word/types";
import { MAA_V2_CANDIDATE_SCHEMA } from "../every-word/types";
import crypto from "node:crypto";

export type EngineContext = {
  caseId: string;
  output: Record<string, unknown>;
  occurrences: CapturedOccurrence[];
  truth: Record<string, unknown> | null;
};

export type EngineHit = {
  engineId: SharedEngineId;
  handlerId: string;
  controlId: string;
  findingCode: string;
  occurrenceId: string;
  exactWording: string;
  wordingHash: string;
  candidateClass: V2CandidateFinding["candidateClass"];
  sourceAlignmentStatus: V2CandidateFinding["sourceAlignmentStatus"];
  plainEnglish: string;
  evidenceRefs: string[];
};

const PROTECTED_ACRONYMS = [
  "MG5",
  "MG6",
  "MG6C",
  "MG11",
  "BWV",
  "ANPR",
  "PTPH",
  "SFR",
  "PACE",
  "CCTV",
  "YJS",
  "NRM",
  "AFIS",
  "DNA",
];

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function cand(
  partial: Omit<EngineHit, "wordingHash"> & { exactWording: string },
): EngineHit {
  return { ...partial, wordingHash: sha256(partial.exactWording) };
}

/** Professional wording engine — deterministic string hygiene. */
export function runProfessionalWordingEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  for (const o of ctx.occurrences) {
    if (o.inclusion !== "included" || !o.exactFinalWording.trim()) continue;
    const t = o.exactFinalWording;
    if (/\{\{[a-zA-Z0-9_.]+\}\}/.test(t) || /\bTODO\b|\bFIXME\b/.test(t)) {
      hits.push(
        cand({
          engineId: "professional_wording",
          handlerId: "placeholder_or_dev_leak",
          controlId,
          findingCode: "WRD_PLACEHOLDER_OR_DEV",
          occurrenceId: o.occurrenceId,
          exactWording: t,
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Placeholder or developer marker on solicitor-visible wording.",
          evidenceRefs: [o.jsonPointer],
        }),
      );
    }
    if (/[A-Za-z]{2,}\/[A-Za-z0-9._-]+\.(ts|tsx|js|json|md)\b/.test(t) || /C:\\Users\\/.test(t)) {
      hits.push(
        cand({
          engineId: "professional_wording",
          handlerId: "filesystem_or_path_leak",
          controlId,
          findingCode: "WRD_PATH_LEAK",
          occurrenceId: o.occurrenceId,
          exactWording: t,
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Filesystem/path-like fragment on solicitor-visible wording.",
          evidenceRefs: [o.jsonPointer],
        }),
      );
    }
    if (/[A-Za-z]{3,}-\s*$/.test(t) || /\b[a-z]{2,}$/.test(t) && /[a-z]{1}$/.test(t.trim()) && t.trim().length > 40 && !/[.!?]"?$/.test(t.trim())) {
      // Mid-word hyphen cut heuristic — conservative
      if (/[A-Za-z]{3,}-\s*$/.test(t)) {
        hits.push(
          cand({
            engineId: "professional_wording",
            handlerId: "mid_truncation",
            controlId,
            findingCode: "WRD_MID_TRUNCATION",
            occurrenceId: o.occurrenceId,
            exactWording: t,
            candidateClass: "candidate_defect",
            sourceAlignmentStatus: "unresolved",
            plainEnglish: "Possible mid-word truncation.",
            evidenceRefs: [o.jsonPointer],
          }),
        );
      }
    }
    for (const acr of PROTECTED_ACRONYMS) {
      const broken = new RegExp(`\\b${acr[0]}${acr.slice(1).toLowerCase()}\\b`);
      // e.g. Mg11 — skip; detect spaced forms
      const spaced = acr.split("").join("\\s+");
      if (new RegExp(`\\b${spaced}\\b`, "i").test(t) && !t.includes(acr)) {
        // only if exact protected form missing but spaced variant present — rare
      }
      void broken;
    }
    if (/\bproves beyond (all )?doubt\b/i.test(t) || /\babsolutely proves\b/i.test(t)) {
      hits.push(
        cand({
          engineId: "professional_wording",
          handlerId: "absolute_proof",
          controlId,
          findingCode: "WRD_ABSOLUTE_PROOF",
          occurrenceId: o.occurrenceId,
          exactWording: t,
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Unsupported absolute-proof wording.",
          evidenceRefs: [o.jsonPointer],
        }),
      );
    }
  }
  return hits;
}

/** Evidence / attribution engine — ESA H5 field checks. */
export function runEvidenceAttributionEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  const five = Array.isArray(ctx.output.fiveAnswersEvidenceRows)
    ? (ctx.output.fiveAnswersEvidenceRows as Record<string, unknown>[])
    : [];
  for (let i = 0; i < five.length; i++) {
    const row = five[i];
    const label = String(row.label ?? "");
    const existence = String(row.existence ?? "");
    const occ = ctx.occurrences.find(
      (o) => o.jsonPointer === `/fiveAnswersEvidenceRows/${i}/existence`,
    );
    if (!occ) continue;
    if (existence === "unreliable" || /unreliable/i.test(String(row.reliability ?? ""))) {
      const note = String(row.note ?? "");
      if (!note.trim()) {
        hits.push(
          cand({
            engineId: "evidence_attribution",
            handlerId: "reliability_reason_required",
            controlId,
            findingCode: "EVS_UNRELIABLE_WITHOUT_REASON",
            occurrenceId: occ.occurrenceId,
            exactWording: `${label}: ${existence}`,
            candidateClass: "candidate_defect",
            sourceAlignmentStatus: "unresolved",
            plainEnglish: "Unreliable/unreliability signal without source-bound reason note.",
            evidenceRefs: [occ.jsonPointer],
          }),
        );
      }
    }
  }
  return hits;
}

/** Chase / actionability engine. */
export function runChaseActionabilityEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  const gaps = (ctx.output.warningsAndGaps ?? null) as Record<string, unknown> | null;
  const chase = Array.isArray(gaps?.chaseItems) ? (gaps!.chaseItems as Record<string, unknown>[]) : [];
  chase.forEach((item, i) => {
    const draft = String(item.copySuggestion ?? "");
    const label = String(item.label ?? "");
    const occ = ctx.occurrences.find(
      (o) => o.jsonPointer === `/warningsAndGaps/chaseItems/${i}/copySuggestion`,
    );
    if (!occ) return;
    if (!draft.trim()) {
      hits.push(
        cand({
          engineId: "chase_actionability",
          handlerId: "empty_chase_draft",
          controlId,
          findingCode: "CHS_EMPTY_DRAFT",
          occurrenceId: occ.occurrenceId,
          exactWording: label,
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Chase item lacks copyable draft wording.",
          evidenceRefs: [occ.jsonPointer],
        }),
      );
    }
    if (/\ball (CCTV|evidence|disclosure)\b/i.test(draft) && draft.trim().split(/\s+/).length < 12) {
      hits.push(
        cand({
          engineId: "chase_actionability",
          handlerId: "broad_template_chase",
          controlId,
          findingCode: "CHS_BROAD_TEMPLATE",
          occurrenceId: occ.occurrenceId,
          exactWording: draft,
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Chase wording appears broad/template-like without specific item detail.",
          evidenceRefs: [occ.jsonPointer],
        }),
      );
    }
  });
  return hits;
}

/** Charge / legal-state — allegation/fact heuristics on court + do-not-overstate. */
export function runChargeLegalStateEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  for (const o of ctx.occurrences) {
    if (o.surfaceId !== "court_line" && o.surfaceId !== "do_not_overstate") continue;
    const t = o.exactFinalWording;
    if (/\bthe defendant (stole|assaulted|murdered|committed)\b/i.test(t) && !/\balleg/i.test(t)) {
      hits.push(
        cand({
          engineId: "charge_legal_state",
          handlerId: "allegation_to_fact",
          controlId,
          findingCode: "LSL_ALLEGE_TO_FACT",
          occurrenceId: o.occurrenceId,
          exactWording: t,
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Possible allegation stated as established fact without qualifier.",
          evidenceRefs: [o.jsonPointer],
        }),
      );
    }
  }
  return hits;
}

/** Source/provenance — page identity / unknown discipline on evidence anchors. */
export function runSourceProvenanceEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  const states = Array.isArray(ctx.output.evidenceStates)
    ? (ctx.output.evidenceStates as Record<string, unknown>[])
    : [];
  states.forEach((row, i) => {
    const anchor = row.evidenceAnchor;
    if (anchor === "p.1" || anchor === "p.null" || anchor === "1" || anchor === "null") {
      const occ = ctx.occurrences.find(
        (o) => o.jsonPointer === `/evidenceStates/${i}/evidenceAnchor`,
      );
      if (!occ) return;
      hits.push(
        cand({
          engineId: "source_provenance",
          handlerId: "synthetic_page_anchor",
          controlId,
          findingCode: "SRC_SYNTHETIC_PAGE",
          occurrenceId: occ.occurrenceId,
          exactWording: String(anchor),
          candidateClass: "candidate_defect",
          sourceAlignmentStatus: "unresolved",
          plainEnglish: "Synthetic or null page identity should remain unknown, not defaulted.",
          evidenceRefs: [occ.jsonPointer],
        }),
      );
    }
  });
  return hits;
}

/**
 * Detect wording that treats stills/clips as the served master or full footage.
 * Distinguishing stills served from master missing is NOT a collapse.
 */
export function detectsStillMasterCollapse(exact: string): boolean {
  const t = exact.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return false;

  // Explicit contrast / master absent — not a collapse
  const distinguishes =
    /\b(stills?|clips?|stills?\s+served|clips?\s+served)\b/.test(t) &&
    /\bmaster\b/.test(t) &&
    /\b(missing|absent|not\s+served|unserved|unavailable|referred\s+only|continuity\s+missing|timeline\s+and\s+continuity\s+missing)\b/.test(
      t,
    );
  if (distinguishes) return false;

  // Em-dash / hyphen contrast: "stills served — master … missing"
  if (
    /\b(stills?|clips?)\b[^.]{0,40}\bserved\b/.test(t) &&
    /[—–\-]/.test(exact) &&
    /\bmaster\b/.test(t) &&
    /\b(missing|absent|referred)\b/.test(t)
  ) {
    return false;
  }

  // Collapse: stills/clips asserted as master / full footage
  if (
    /\b(stills?|clips?)\b.{0,40}\b(are|is|as)\b.{0,40}\b(the\s+)?(full|master)\b.{0,20}\b(cctv|footage|recording|video)?\b/.test(
      t,
    )
  ) {
    return true;
  }
  if (/\b(full|master)\s+(cctv|footage|recording|video)\s+served\b/.test(t) && /\b(stills?|clips?)\b/.test(t)) {
    // "master footage served" co-mentioned with stills without distinguishing absence → candidate
    if (!/\b(stills?|clips?).{0,30}\b(only|not\s+master|not\s+full)\b/.test(t)) {
      return true;
    }
  }
  if (/\bserved\s+(as\s+)?(the\s+)?(master|full)\b/.test(t) && /\b(stills?|clips?)\b/.test(t)) {
    return true;
  }
  return false;
}

/** Document relationship — still/clip/master collapse only (not distinguish-and-mark-missing). */
export function runDocumentRelationshipEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  const ownerControlId = "MAA2-BND-09-STILL-CLIP-VS-MASTER";
  for (const o of ctx.occurrences) {
    if (!detectsStillMasterCollapse(o.exactFinalWording)) continue;
    hits.push(
      cand({
        engineId: "document_relationship",
        handlerId: "still_as_master_collapse",
        controlId: ownerControlId,
        findingCode: "BND_STILL_MASTER_COLLAPSE",
        occurrenceId: o.occurrenceId,
        exactWording: o.exactFinalWording,
        candidateClass: "candidate_defect",
        sourceAlignmentStatus: "unresolved",
        plainEnglish:
          "Wording treats stills/clips as the served master or full footage without distinguishing units.",
        evidenceRefs: [o.jsonPointer],
      }),
    );
  }
  return hits;
}

/** Cross-output completeness — empty required sections. */
export function runCrossOutputCompletenessEngine(ctx: EngineContext, controlId: string): EngineHit[] {
  const hits: EngineHit[] = [];
  const five = Array.isArray(ctx.output.fiveAnswersEvidenceRows)
    ? ctx.output.fiveAnswersEvidenceRows
    : [];
  if (five.length === 0) {
    const syntheticOcc = ctx.occurrences[0];
    if (syntheticOcc) {
      hits.push(
        cand({
          engineId: "cross_output_completeness",
          handlerId: "missing_truth_map",
          controlId,
          findingCode: "XEX_MISSING_TRUTH_MAP",
          occurrenceId: syntheticOcc.occurrenceId,
          exactWording: "",
          candidateClass: "unresolved",
          sourceAlignmentStatus: "not_exercised",
          plainEnglish: "No fiveAnswersEvidenceRows present on packet.",
          evidenceRefs: ["/fiveAnswersEvidenceRows"],
        }),
      );
    }
  }
  return hits;
}

/** Engines that cannot run on ESA text → not_exercised markers. */
export function runUnavailableOnEsaEngine(
  controlId: string,
  engineId: SharedEngineId,
  handlerId: string,
  reason: string,
  ctx: EngineContext,
): EngineHit[] {
  const o = ctx.occurrences[0];
  if (!o) return [];
  return [
    cand({
      engineId,
      handlerId,
      controlId,
      findingCode: "ESA_PREREQUISITE_ABSENT",
      occurrenceId: o.occurrenceId,
      exactWording: "",
      candidateClass: "not_exercised",
      sourceAlignmentStatus: "not_exercised",
      plainEnglish: reason,
      evidenceRefs: ["esa-surface-allowlist"],
    }),
  ];
}

export function toV2Candidate(hit: EngineHit, caseId: string): V2CandidateFinding {
  return {
    schemaVersion: MAA_V2_CANDIDATE_SCHEMA,
    candidateId: `V2CAND-${sha256(`${hit.controlId}|${hit.occurrenceId}|${hit.findingCode}`).slice(0, 24)}`,
    controlId: hit.controlId,
    engineId: hit.engineId,
    handlerId: hit.handlerId,
    findingCode: hit.findingCode,
    caseId,
    occurrenceId: hit.occurrenceId,
    exactWording: hit.exactWording,
    wordingHash: hit.wordingHash,
    sourceAlignmentStatus: hit.sourceAlignmentStatus,
    confidenceBasis: "deterministic",
    candidateClass: hit.candidateClass,
    requiredReviewer:
      hit.candidateClass === "human_review_required"
        ? "human_solicitor"
        : hit.candidateClass === "not_exercised"
          ? "none"
          : "codex",
    v1Relationship: null,
    evidenceRefs: hit.evidenceRefs,
    plainEnglish: hit.plainEnglish,
    humanDisposition: null,
    humanReviewer: null,
    humanReviewedAt: null,
    isV1Finding: false,
    calibrationOnly: true,
  };
}
