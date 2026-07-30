/**
 * Honest Batch-4 reclassification of the 55 former-SNI controls (48 adapter-targeted + 7 deferred).
 * A control is partially_implemented_detector only when every detector bar criterion is met.
 * Family adapter presence alone never upgrades a control.
 */

export type Batch4HonestyStatus =
  | "partially_implemented_detector"
  | "adapter_foundation_only"
  | "specified_not_implemented"
  | "deferred_stage300";

export type Batch4ControlClassification = {
  controlId: string;
  familyCode: string;
  status: Batch4HonestyStatus;
  denominatorUnit: DenominatorUnit;
  reason: string;
  hasControlSpecificRuntimeLogic: boolean;
  emitsFindingFromAcceptedNonSyntheticInputs: boolean;
  hasRealValidator: boolean;
  hasPositiveContract: boolean;
  hasMultipleSafeNegativeContracts: boolean;
  hasUnavailableInputContract: boolean;
  contractIdsResolve: boolean;
};

export type DenominatorUnit =
  | "case"
  | "surface"
  | "version_pair"
  | "affected_sentence"
  | "authority_proposition"
  | "citation"
  | "run_receipt"
  | "artefact_receipt"
  | "audience_surface_set"
  | "perspective_surface_set"
  | "procedural_event"
  | "calc_ledger"
  | "source_binary";

const BAR_FAIL =
  "Fails partially_implemented_detector bar: no control-specific positive + multiple safe-negative + unavailable contracts with resolving IDs; schema/adapter/family probe ≠ detector.";

function row(
  controlId: string,
  familyCode: string,
  status: Batch4HonestyStatus,
  denominatorUnit: DenominatorUnit,
  reason: string,
  partialFlags?: Partial<
    Pick<
      Batch4ControlClassification,
      | "hasControlSpecificRuntimeLogic"
      | "emitsFindingFromAcceptedNonSyntheticInputs"
      | "hasRealValidator"
      | "hasPositiveContract"
      | "hasMultipleSafeNegativeContracts"
      | "hasUnavailableInputContract"
      | "contractIdsResolve"
    >
  >,
): Batch4ControlClassification {
  return {
    controlId,
    familyCode,
    status,
    denominatorUnit,
    reason,
    hasControlSpecificRuntimeLogic: partialFlags?.hasControlSpecificRuntimeLogic ?? false,
    emitsFindingFromAcceptedNonSyntheticInputs:
      partialFlags?.emitsFindingFromAcceptedNonSyntheticInputs ?? false,
    hasRealValidator: partialFlags?.hasRealValidator ?? false,
    hasPositiveContract: partialFlags?.hasPositiveContract ?? false,
    hasMultipleSafeNegativeContracts: partialFlags?.hasMultipleSafeNegativeContracts ?? false,
    hasUnavailableInputContract: partialFlags?.hasUnavailableInputContract ?? false,
    contractIdsResolve: partialFlags?.contractIdsResolve ?? false,
  };
}

/**
 * Exact classification for every Batch-4-scoped control (55).
 * Counts are derived — not targeted.
 */
export const BATCH4_CONTROL_CLASSIFICATIONS: Batch4ControlClassification[] = [
  // --- Deferred Stage-300 (7) ---
  row(
    "MAA2-SRC-07-REDACTION-DETECT",
    "SRC",
    "deferred_stage300",
    "source_binary",
    "Stage-300 heavy binary/OCR lane. Adapter schema only; ESA lacks original binaries.",
  ),
  row(
    "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
    "SRC",
    "deferred_stage300",
    "source_binary",
    "Stage-300 pagination continuity needs page-unit OCR evidence absent on ESA.",
  ),
  row(
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
    "SRC",
    "deferred_stage300",
    "source_binary",
    "Stage-300 attachment inventory vs binary refs; not inventable from wording.",
  ),
  row(
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
    "SRC",
    "deferred_stage300",
    "source_binary",
    "Stage-300 extracted-text provenance binding requires source-binary/OCR receipts.",
  ),
  row(
    "MAA2-FID-11-SEMANTIC-ALIGNMENT",
    "FID",
    "deferred_stage300",
    "case",
    "Stage-300 semantic model / external assurance lane — not packet-local Stage-150.",
  ),
  row(
    "MAA2-ATR-04-ACCOUNT-DEVICE-USER",
    "ATR",
    "deferred_stage300",
    "case",
    "Stage-300 human/external device-account attribution — not on ESA.",
  ),
  row(
    "MAA2-ATR-05-POSSESSION-USE-KNOWLEDGE",
    "ATR",
    "deferred_stage300",
    "case",
    "Stage-300 possession/use/knowledge distinctions need structured attribution beyond ESA.",
  ),

  // --- ELD-01–14: synthetic-only adapter; family calculator ≠ per-control detector ---
  row(
    "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Adapter eld_source_change_drafting + ELD schema only; evaluateBatch4 returns [] unconditionally for this id. Synthetic fixtures alone. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
    "ELD",
    "adapter_foundation_only",
    "affected_sentence",
    `Shares classifyWordingOutcomes with ELD-10; adapter refuses non-synthetic version pairs → not Stage-150 exercisable from accepted live inputs. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-ELD-03-STALE-DRAFT-MARKING",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Uses detectStaleDrafting on synthetic pairs only; no resolving per-control contracts. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Shares ELD-03 staleLeaksAcrossExits path; synthetic-only; not independently contracted. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `assessReceiptPreservation on synthetic pairs only; no unavailable/positive/negative contract resolution. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] after adapter presence — no control-specific detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] after adapter presence — approval-receipt detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] — revision-history detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] — audience-redraft truth lock not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
    "ELD",
    "adapter_foundation_only",
    "affected_sentence",
    `Shares ELD-02 path; synthetic-only adapter blocks non-synthetic pairs. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] — provenance qualification detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] — cross-exit propagation detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] — rollback detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
    "ELD",
    "adapter_foundation_only",
    "version_pair",
    `Unconditional return [] — actor/time/source/approval audit detector not implemented. ${BAR_FAIL}`,
  ),

  // --- LEG / LSL / XEX currency ---
  row(
    "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
    "LSL",
    "adapter_foundation_only",
    "authority_proposition",
    `Pinned registry adapter schema only; no category-set coverage detector (returns []). Schema ≠ authority taxonomy. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-01-OFFICIAL-AUTHORITY-SOURCE",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Adapter reads officialSource fields; no control-specific finding emitter (returns []). ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-02-JURISDICTION",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Adapter stores jurisdiction; no jurisdiction-mismatch detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-03-EFFECTIVE-DATE",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Adapter stores effectiveDate; no effective-date honesty detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-05-RETRIEVAL-DATE",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Adapter stores retrievalDate; no retrieval-date detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-06-REGISTRY-VERSION-ID",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Adapter stores registryVersionId; no version-id detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-07-AUTHORITY-TYPE-DISTINCTION",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Adapter stores authorityType; no type-distinction detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-LEG-08-CURRENCY-WARNING",
    "LEG",
    "adapter_foundation_only",
    "authority_proposition",
    `Thin stale→warning heuristic on fixture bags; shared with XEX-04; lacks resolving multi-negative/unavailable contracts. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true, emitsFindingFromAcceptedNonSyntheticInputs: true },
  ),
  row(
    "MAA2-LEG-10-NO-PROPOSITION-WITHOUT-SOURCE",
    "LEG",
    "adapter_foundation_only",
    "citation",
    `Thin contrary-to citation heuristic; not a full validator/contract suite. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true, emitsFindingFromAcceptedNonSyntheticInputs: true },
  ),
  row(
    "MAA2-XEX-04-LEGAL-CURRENCY-WARNING",
    "XEX",
    "adapter_foundation_only",
    "authority_proposition",
    `Shares LEG-08 family path — not an independent control detector with own contracts. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true, emitsFindingFromAcceptedNonSyntheticInputs: true },
  ),

  // --- PRC ---
  row(
    "MAA2-PRC-03-YOUTH-STATE",
    "PRC",
    "adapter_foundation_only",
    "procedural_event",
    `Presence-null check on youthState only; not a youth-state honesty detector with contracts. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-PRC-04-FITNESS-PARTICIPATION",
    "PRC",
    "adapter_foundation_only",
    "procedural_event",
    `Presence-null check on fitnessParticipation only. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-PRC-07-DISCLOSURE-PII-STATE",
    "PRC",
    "adapter_foundation_only",
    "procedural_event",
    `Presence-null check on disclosurePiiState only. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),

  // --- CHR ---
  row(
    "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
    "CHR",
    "adapter_foundation_only",
    "calc_ledger",
    `dob_age_calc_ledger adapter present; CHR-06 returns [] with no age computation detector. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
    "CHR",
    "adapter_foundation_only",
    "calc_ledger",
    `Empty calcInputs presence check only — not calibrated calc-input honesty detector. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),

  // --- AUD ---
  row(
    "MAA2-AUD-02-CLIENT-PLAIN",
    "AUD",
    "adapter_foundation_only",
    "audience_surface_set",
    `Multi-audience adapter bag only; no client-plain surface comparison detector (returns []). ${BAR_FAIL}`,
  ),
  row(
    "MAA2-AUD-03-COURT-PRECISE",
    "AUD",
    "adapter_foundation_only",
    "audience_surface_set",
    `Adapter foundation only; court-precise detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-AUD-04-CPS-SPECIFIC",
    "AUD",
    "adapter_foundation_only",
    "audience_surface_set",
    `Adapter foundation only; CPS-specific detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-AUD-05-SUPERVISOR-RISK",
    "AUD",
    "adapter_foundation_only",
    "audience_surface_set",
    `Adapter foundation only; supervisor-risk detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-AUD-08-INDEPENDENT-AUDIENCE-TESTS",
    "AUD",
    "adapter_foundation_only",
    "audience_surface_set",
    `Counts audiences≥2 only — not independent audience test suite with contracts. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),

  // --- XPP ---
  row(
    "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
    "XPP",
    "adapter_foundation_only",
    "perspective_surface_set",
    `Perspective adapter bag only; defence-solicitor perspective detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-XPP-02-PROSECUTION-CHALLENGE",
    "XPP",
    "adapter_foundation_only",
    "perspective_surface_set",
    `Adapter foundation only; prosecution-challenge detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
    "XPP",
    "adapter_foundation_only",
    "perspective_surface_set",
    `Adapter foundation only; judicial-neutrality detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-XPP-04-CLIENT-COMPREHENSION",
    "XPP",
    "adapter_foundation_only",
    "perspective_surface_set",
    `Adapter foundation only; client-comprehension detector not implemented. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
    "XPP",
    "adapter_foundation_only",
    "perspective_surface_set",
    `Adapter foundation only; supervisor-risk perspective detector not implemented. ${BAR_FAIL}`,
  ),

  // --- VDR ---
  row(
    "MAA2-VDR-01-SOURCE-CASE-HASHES",
    "VDR",
    "adapter_foundation_only",
    "run_receipt",
    `Empty sourceCaseHashes bag check only; not a run/artefact receipt reproducibility detector suite. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
    "VDR",
    "adapter_foundation_only",
    "run_receipt",
    `Empty frozenMembershipOrder check only. ${BAR_FAIL}`,
    { hasControlSpecificRuntimeLogic: true },
  ),
  row(
    "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
    "VDR",
    "adapter_foundation_only",
    "run_receipt",
    `Adapter stores commit/build fields; detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
    "VDR",
    "adapter_foundation_only",
    "artefact_receipt",
    `Adapter stores version pins; detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-VDR-05-MODEL-PROMPT-VERSION",
    "VDR",
    "adapter_foundation_only",
    "artefact_receipt",
    `Adapter optional modelPromptVersion; detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
    "VDR",
    "adapter_foundation_only",
    "artefact_receipt",
    `Adapter stores exactFindingIds; detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
    "VDR",
    "adapter_foundation_only",
    "artefact_receipt",
    `Adapter stores timestampsDispositions; detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
    "VDR",
    "adapter_foundation_only",
    "artefact_receipt",
    `Adapter stores beforeAfterMap; detector returns []. ${BAR_FAIL}`,
  ),
  row(
    "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
    "VDR",
    "adapter_foundation_only",
    "artefact_receipt",
    `Adapter stores addedRemovedRetained; detector returns []. ${BAR_FAIL}`,
  ),
];

if (BATCH4_CONTROL_CLASSIFICATIONS.length !== 55) {
  throw new Error(
    `Batch4 classifications must cover 55 controls (got ${BATCH4_CONTROL_CLASSIFICATIONS.length})`,
  );
}

export const BATCH4_CLASSIFICATION_BY_ID: Record<string, Batch4ControlClassification> =
  Object.fromEntries(BATCH4_CONTROL_CLASSIFICATIONS.map((c) => [c.controlId, c]));

export function batch4HonestyStatusCounts(): Record<Batch4HonestyStatus, number> {
  const init: Record<Batch4HonestyStatus, number> = {
    partially_implemented_detector: 0,
    adapter_foundation_only: 0,
    specified_not_implemented: 0,
    deferred_stage300: 0,
  };
  for (const c of BATCH4_CONTROL_CLASSIFICATIONS) init[c.status] += 1;
  return init;
}

/** The 48 formerly claimed as Batch-4 "implemented" partials — all adapter_foundation_only. */
export const BATCH4_FORTY_EIGHT = BATCH4_CONTROL_CLASSIFICATIONS.filter(
  (c) => c.status !== "deferred_stage300",
);

export function assertBatch4FortyEightHonesty(): void {
  if (BATCH4_FORTY_EIGHT.length !== 48) {
    throw new Error(`Expected 48 non-deferred Batch-4 controls, got ${BATCH4_FORTY_EIGHT.length}`);
  }
  const realDetectors = BATCH4_FORTY_EIGHT.filter(
    (c) => c.status === "partially_implemented_detector",
  );
  if (realDetectors.length !== 0) {
    throw new Error(
      `Honesty gate: claimed partially_implemented_detector=${realDetectors.length} but remediation expects 0 until contracts resolve`,
    );
  }
}
