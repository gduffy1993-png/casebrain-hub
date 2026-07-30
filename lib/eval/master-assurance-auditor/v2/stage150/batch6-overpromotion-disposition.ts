/**
 * Batch-6 honesty disposition — controls returned from over-promotion.
 * Narrow probes must not be treated as full named-control implementation.
 */

export type Batch6ReturnedDisposition = {
  controlId: string;
  implementationStatus: "partially_implemented";
  detectorClassification: "phrase_probe_only" | "genuine_structured_detector" | "genuine_string_quality_detector";
  promotionBlockedReason: string;
  requiredBeforePromotion: string;
};

/**
 * Six controls incorrectly promoted in Batch-6 draft — returned to partial.
 * Must not appear in BATCH6_IMMUTABLE_PROMOTION_REGISTRY.
 */
export const BATCH6_RETURNED_TO_PARTIAL: readonly Batch6ReturnedDisposition[] = [
  {
    controlId: "MAA2-LSL-03-NO-SUBMISSION-TO-FINDING",
    implementationStatus: "partially_implemented",
    detectorClassification: "phrase_probe_only",
    promotionBlockedReason:
      "phrase_probe_only — current detector matches wording cues only; cannot prove submission→finding collapse as a named control.",
    requiredBeforePromotion:
      "Represent submission state and judicial finding state separately and compare them; wording-only probe is insufficient for promotion.",
  },
  {
    controlId: "MAA2-FID-09-NO-SILENT-CORRECTION",
    implementationStatus: "partially_implemented",
    detectorClassification: "phrase_probe_only",
    promotionBlockedReason:
      "phrase_probe_only — current detector matches silent-correction phrasing only; no version/receipt comparison.",
    requiredBeforePromotion:
      "Compare earlier and later wording/version records and detect an unreceipted change; admission phrasing alone is insufficient.",
  },
  {
    controlId: "MAA2-XEX-07-NO-SAFE-VIEW-UNSAFE-COPY",
    implementationStatus: "partially_implemented",
    detectorClassification: "genuine_structured_detector",
    promotionBlockedReason:
      "partial — export reviewFooter is not the copy exit; view vs copy sendability receipts are not compared.",
    requiredBeforePromotion:
      "Compare actual view and copy exit payload/sendability receipts. Export footer must not be treated as the copy exit.",
  },
  {
    controlId: "MAA2-PRI-01-NO-IMPORTANT-OMISSION",
    implementationStatus: "partially_implemented",
    detectorClassification: "genuine_structured_detector",
    promotionBlockedReason:
      "partial — empty fiveAnswers alone is only a narrow probe, not a required-information inventory across surfaces.",
    requiredBeforePromotion:
      "Compare a required-information inventory with all applicable output surfaces (view/copy/export/API/composed prose).",
  },
  {
    controlId: "MAA2-XEX-01-CHARGE-WARNING-ATTACHED",
    implementationStatus: "partially_implemented",
    detectorClassification: "genuine_structured_detector",
    promotionBlockedReason:
      "partial — court wording + doNotOverstate cue is not structured charge-dispute state across exits.",
    requiredBeforePromotion:
      "Check structured charge-dispute state and attached warning across view/copy/export/API/composed prose.",
  },
  {
    controlId: "MAA2-SRC-10-SOURCE-VS-COMPILED-PAGE",
    implementationStatus: "partially_implemented",
    detectorClassification: "genuine_string_quality_detector",
    promotionBlockedReason:
      "partial — evidenceAnchor wording is only a probe; distinct sourcePage/compiledPage/pageIdentityKnown fields are absent.",
    requiredBeforePromotion:
      "Compare distinct structured sourcePage, compiledPage and pageIdentityKnown fields. evidenceAnchor wording alone is insufficient.",
  },
] as const;

export const BATCH6_RETURNED_IDS: ReadonlySet<string> = new Set(
  BATCH6_RETURNED_TO_PARTIAL.map((r) => r.controlId),
);

/** Only these Batch-6 controls meet the acceptance bar for immutable promotion. */
export const BATCH6_PROMOTED_CONTROL_IDS: readonly string[] = [
  "MAA2-EVS-02-STATE-ENUM",
  "MAA2-EVS-03-RELIABILITY-REASON-REQUIRED",
] as const;
