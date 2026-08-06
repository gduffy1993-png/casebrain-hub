/**
 * Batch-7 structured-control audit of remaining Stage-150 partials.
 * Compares control promise vs detector vs ESA inputs. Conservative — no over-promotion.
 */

import {
  STAGE150_PACKET_LOCAL_HANDLERS,
  type Stage150HandlerDef,
} from "./detector-registry";
import { BATCH5_IMPLEMENTED_IDS, BATCH6_IMPLEMENTED_IDS } from "./batch5-implemented";
import { BATCH6_RETURNED_IDS } from "./batch6-overpromotion-disposition";

export type Batch7AuditBucket =
  | "promotable_now"
  | "adapter_feasible"
  | "blocked_missing_adapter"
  | "phrase_probe"
  | "overpromise_narrow_probe"
  | "excluded_fid10"
  | "batch6_returned"
  | "returned_atr01"
  | "out_of_priority_string_quality";

export type Batch7AuditRow = {
  controlId: string;
  familyCode: string;
  detectorClassification: string | null;
  bucket: Batch7AuditBucket;
  fullSemanticPromise: string;
  currentDetectorBehaviour: string;
  esaInputsAvailable: string;
  missingAdapterOrRelationship: string | null;
  promotionBlockedReason: string | null;
};

const PROMOTABLE_NOW = new Set(["MAA2-EVS-01-DIMENSION-SEPARATION"]);

function family(id: string): string {
  return id.split("-")[1] ?? "UNK";
}

function classify(h: Stage150HandlerDef): Batch7AuditRow {
  const controlId = h.controlId;
  const familyCode = family(controlId);
  const detectorClassification = h.detectorClassification ?? null;

  if (controlId === "MAA2-FID-10-QUOTATION-FIDELITY") {
    return {
      controlId,
      familyCode,
      detectorClassification,
      bucket: "excluded_fid10",
      fullSemanticPromise: "Quotation fidelity with source-binding.",
      currentDetectorBehaviour: "Unresolved quotation candidates without new source-binding.",
      esaInputsAvailable: "included solicitor-visible wording only",
      missingAdapterOrRelationship: "source-page / provenance binding adapter",
      promotionBlockedReason: "FID-10 excluded — no new source-binding capability.",
    };
  }

  if (controlId === "MAA2-ATR-01-DEFENDANT-SEPARATION") {
    return {
      controlId,
      familyCode,
      detectorClassification: "unavailable_missing_adapter",
      bucket: "returned_atr01",
      fullSemanticPromise: "Defendant / co-defendant material must remain separated across all surfaces.",
      currentDetectorBehaviour:
        "Narrow partial probe on other_defendant_only + courtNote/doNotOverstate only — not full defendant separation.",
      esaInputsAvailable:
        "/fiveAnswersEvidenceRows/*/existence (other_defendant_only units); courtNote/doNotOverstate only",
      missingAdapterOrRelationship:
        "subjectDefendantId/personId; evidenceUnitId/sourceEvidenceId; cross-surface separation receipts",
      promotionBlockedReason:
        "Returned to partially_implemented: zero-unit cases not_exercised; MG labels ≠ unit identity; surfaces incomplete; missing person/evidence IDs.",
    };
  }

  if (BATCH6_RETURNED_IDS.has(controlId)) {
    return {
      controlId,
      familyCode,
      detectorClassification,
      bucket: "batch6_returned",
      fullSemanticPromise: h.ownershipNote,
      currentDetectorBehaviour: "Narrow probe retained; Batch-6 honesty return.",
      esaInputsAvailable: h.requiredInputs.join(", "),
      missingAdapterOrRelationship: "See Batch-6 overpromotion disposition requiredBeforePromotion",
      promotionBlockedReason: "Returned from Batch-6 over-promotion — must not re-promote on same narrow probe.",
    };
  }

  if (detectorClassification === "phrase_probe_only" || (PROMOTABLE_NOW.has(controlId) === false && /phrase/i.test(h.ownershipNote))) {
    if (detectorClassification === "phrase_probe_only") {
      return {
        controlId,
        familyCode,
        detectorClassification,
        bucket: "phrase_probe",
        fullSemanticPromise: h.ownershipNote,
        currentDetectorBehaviour: "Phrase/string cue probe only.",
        esaInputsAvailable: h.requiredInputs.join(", "),
        missingAdapterOrRelationship: "Structured state fields matching control promise",
        promotionBlockedReason: "phrase_probe_only — must not be promoted as named structured control.",
      };
    }
  }

  if (PROMOTABLE_NOW.has(controlId)) {
    return {
      controlId,
      familyCode,
      detectorClassification: "genuine_structured_detector",
      bucket: "promotable_now",
      fullSemanticPromise: "Existence and reliability dimensions must remain separate.",
      currentDetectorBehaviour:
        "Bidirectional domain-registry check: reliability↔existence token collapse (including same-token), out-of-domain tokens; valid separated pairs are safe negatives.",
      esaInputsAvailable: "/fiveAnswersEvidenceRows/*/existence,/fiveAnswersEvidenceRows/*/reliability",
      missingAdapterOrRelationship: null,
      promotionBlockedReason: null,
    };
  }

  // Priority structured-looking families with known ESA gaps
  // (phrase_probe_only already returned above; re-checked in buildBatch7Audit post-pass.)
  if (["CHG", "FID", "LSL", "CHR", "PRC"].includes(familyCode)) {
    return {
      controlId,
      familyCode,
      detectorClassification,
      bucket: "blocked_missing_adapter",
      fullSemanticPromise: h.ownershipNote,
      currentDetectorBehaviour: h.runtimePath,
      esaInputsAvailable: h.requiredInputs.join(", "),
      missingAdapterOrRelationship:
        familyCode === "CHR" || familyCode === "PRC"
          ? "Structured clocks / TZ / deadline ledger absent on ESA"
          : "Charge instrument / operative status / version graph fields absent on ESA",
      promotionBlockedReason: "Required structured fields absent on ESA — keep partially_implemented.",
    };
  }

  if (["XEX", "CHS", "PRI", "SRC", "BND", "ATR", "EVS", "DEF", "XPP", "AUD", "CTX"].includes(familyCode)) {
    const overpromise =
      familyCode === "CHS" ||
      familyCode === "XEX" ||
      familyCode === "PRI" ||
      familyCode === "BND" ||
      familyCode === "DEF" ||
      familyCode === "XPP" ||
      familyCode === "SRC" ||
      familyCode === "ATR" ||
      familyCode === "EVS";
    return {
      controlId,
      familyCode,
      detectorClassification,
      bucket: overpromise ? "overpromise_narrow_probe" : "blocked_missing_adapter",
      fullSemanticPromise: h.ownershipNote,
      currentDetectorBehaviour: h.runtimePath,
      esaInputsAvailable: h.requiredInputs.join(", "),
      missingAdapterOrRelationship:
        familyCode === "CHS"
          ? "chase_five_part_finding_schema / chase_to_evidence_provenance_links"
          : familyCode === "XEX"
            ? "Real view/copy/API/PDF exit sendability receipts"
            : familyCode === "SRC"
              ? "sourcePage/compiledPage/pageIdentityKnown"
              : familyCode === "EVS"
                ? "evidence_state_reason_taxonomy_fields (EVS-04) or other missing structured dims"
                : "Structured relationship / exit / inventory fields matching control name",
      promotionBlockedReason:
        "Control name promises more than current detector/ESA fields support — keep partially_implemented.",
    };
  }

  if (familyCode === "WRD") {
    return {
      controlId,
      familyCode,
      detectorClassification,
      bucket: "out_of_priority_string_quality",
      fullSemanticPromise: h.ownershipNote,
      currentDetectorBehaviour: h.runtimePath,
      esaInputsAvailable: "included solicitor-visible wording",
      missingAdapterOrRelationship: null,
      promotionBlockedReason:
        "String-quality family valid but out of Batch-7 structured priority (identity/attribution/exits).",
    };
  }

  return {
    controlId,
    familyCode,
    detectorClassification,
    bucket: "blocked_missing_adapter",
    fullSemanticPromise: h.ownershipNote,
    currentDetectorBehaviour: h.runtimePath,
    esaInputsAvailable: h.requiredInputs.join(", "),
    missingAdapterOrRelationship: "Unclassified ESA gap",
    promotionBlockedReason: "Not promotable in Batch-7 structured sweep.",
  };
}

export function buildBatch7Audit(): {
  schemaVersion: string;
  baselineCommit: string;
  remainingPartialCount: number;
  rows: Batch7AuditRow[];
  bucketCounts: Record<string, number>;
  promotableNow: string[];
} {
  const priorImplemented = new Set([...BATCH5_IMPLEMENTED_IDS, ...BATCH6_IMPLEMENTED_IDS]);
  const rows = STAGE150_PACKET_LOCAL_HANDLERS.filter(
    (h) => !priorImplemented.has(h.controlId),
  ).map(classify);

  // Re-apply phrase_probe from handler when set (overrides family defaults)
  for (const row of rows) {
    const h = STAGE150_PACKET_LOCAL_HANDLERS.find((x) => x.controlId === row.controlId)!;
    if (h.detectorClassification === "phrase_probe_only" && row.bucket !== "batch6_returned" && row.bucket !== "excluded_fid10") {
      row.bucket = "phrase_probe";
      row.promotionBlockedReason =
        "phrase_probe_only — must not be promoted as named structured control.";
    }
  }

  const bucketCounts: Record<string, number> = {};
  for (const r of rows) bucketCounts[r.bucket] = (bucketCounts[r.bucket] ?? 0) + 1;

  return {
    schemaVersion: "batch7-structured-audit@1.0.0",
    baselineCommit: "200c3e4d79ac7e1a837a538a723445d7e9c3884f",
    remainingPartialCount: rows.length,
    rows: rows.sort((a, b) => a.controlId.localeCompare(b.controlId)),
    bucketCounts,
    promotableNow: rows.filter((r) => r.bucket === "promotable_now").map((r) => r.controlId),
  };
}
