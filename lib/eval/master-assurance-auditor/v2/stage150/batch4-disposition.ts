/**
 * Batch-4 disposition of the remaining 55 specified-not-implemented Stage-150 controls.
 * Counts are not forced — dispositions arise from adapter availability vs ESA inputs.
 */

export type Batch4Lane =
  | "stage150_essential_implement"
  | "stage300_heavy_binary_ocr"
  | "stage300_semantic_model"
  | "stage300_human_external"
  | "esa_unavailable_without_adapter";

export type Batch4Disposition = {
  controlId: string;
  familyCode: string;
  priorBlocker: string;
  lane: Batch4Lane;
  essentialBeforeStage150: boolean;
  esaSufficientInputs: boolean;
  adapterId: string | null;
  implementInBatch4: boolean;
  preciseReason: string;
};

const d = (
  controlId: string,
  familyCode: string,
  priorBlocker: string,
  lane: Batch4Lane,
  adapterId: string | null,
  implementInBatch4: boolean,
  preciseReason: string,
  esaSufficientInputs = false,
): Batch4Disposition => ({
  controlId,
  familyCode,
  priorBlocker,
  lane,
  essentialBeforeStage150:
    lane === "stage150_essential_implement" || lane === "esa_unavailable_without_adapter",
  esaSufficientInputs,
  adapterId,
  implementInBatch4,
  preciseReason,
});

/**
 * All 55 remaining SNI controls from Batch-3 blocked list.
 * `implementInBatch4=true` means adapter foundation scaffolding was targeted — NOT that a
 * partially_implemented_detector exists. See batch4-control-classification.ts for honesty status.
 */
export const BATCH4_DISPOSITIONS: Batch4Disposition[] = [
  // --- SRC: Stage 300 heavy ---
  d("MAA2-SRC-07-REDACTION-DETECT", "SRC", "source_binary_ocr_adapter_absent", "stage300_heavy_binary_ocr", "heavy_source_document_evidence", false, "Requires original binaries + OCR/visual metadata; ESA packets lack source binaries. Adapter schema built for Stage-300; Stage-150 remains SNI."),
  d("MAA2-SRC-09-PAGINATION-DISCONTINUITY", "SRC", "source_binary_ocr_adapter_absent", "stage300_heavy_binary_ocr", "heavy_source_document_evidence", false, "Pagination continuity needs page-unit OCR evidence absent on ESA H5."),
  d("MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS", "SRC", "source_binary_ocr_adapter_absent", "stage300_heavy_binary_ocr", "heavy_source_document_evidence", false, "Attachment-absence vs binary inventory needs heavy source adapter; not inventable from wording."),
  d("MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE", "SRC", "source_binary_ocr_adapter_absent", "stage300_heavy_binary_ocr", "heavy_source_document_evidence", false, "Extracted-text provenance binding requires source-binary/OCR receipts."),

  // --- FID semantic ---
  d("MAA2-FID-11-SEMANTIC-ALIGNMENT", "FID", "semantic_alignment_model_adapter_absent", "stage300_semantic_model", null, false, "Semantic alignment needs an approved model adapter / external assurance lane — not packet-local Stage-150."),

  // --- LSL taxonomy ---
  d("MAA2-LSL-05-CATEGORY-SET-COVERAGE", "LSL", "legal_category_taxonomy_adapter_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Legal category-set coverage against pinned taxonomy/registry; ESA absent → not_exercised."),

  // --- ATR device/possession ---
  d("MAA2-ATR-04-ACCOUNT-DEVICE-USER", "ATR", "device_account_attribution_adapter_absent", "stage300_human_external", "device_account_attribution", false, "Device/account/user attribution needs forensic/device records or human judgment — not on ESA."),
  d("MAA2-ATR-05-POSSESSION-USE-KNOWLEDGE", "ATR", "possession_knowledge_adapter_absent", "stage300_human_external", "possession_knowledge", false, "Possession/use/knowledge distinctions need structured attribution beyond ESA wording."),

  // --- CHR calc ---
  d("MAA2-CHR-06-AGE-AT-OFFENCE-HEARING", "CHR", "dob_age_calc_adapter_absent", "stage150_essential_implement", "dob_age_calc_ledger", true, "Stage-150 essential chronology honesty; DOB/age calc ledger adapter + fail-closed when DOB fields absent."),
  d("MAA2-CHR-12-TRANSPARENT-CALC-INPUTS", "CHR", "calc_input_ledger_adapter_absent", "stage150_essential_implement", "dob_age_calc_ledger", true, "Requires transparent calc-input ledger; implement with same adapter, not_exercised without ledger."),

  // --- LEG + XEX currency ---
  d("MAA2-LEG-01-OFFICIAL-AUTHORITY-SOURCE", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Pinned local authority registry adapter; ESA absent → not_exercised."),
  d("MAA2-LEG-02-JURISDICTION", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Jurisdiction check against pinned registry."),
  d("MAA2-LEG-03-EFFECTIVE-DATE", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Effective-date check against pinned registry."),
  d("MAA2-LEG-05-RETRIEVAL-DATE", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Retrieval-date metadata on pinned authority records."),
  d("MAA2-LEG-06-REGISTRY-VERSION-ID", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Registry version identity required."),
  d("MAA2-LEG-07-AUTHORITY-TYPE-DISTINCTION", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Authority-type distinction fields on pinned registry."),
  d("MAA2-LEG-08-CURRENCY-WARNING", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Currency warning when registry marks stale authority."),
  d("MAA2-LEG-10-NO-PROPOSITION-WITHOUT-SOURCE", "LEG", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Legal proposition must cite pinned authority source id."),
  d("MAA2-XEX-04-LEGAL-CURRENCY-WARNING", "XEX", "pinned_authority_registry_absent", "stage150_essential_implement", "pinned_legal_authority_registry", true, "Cross-exit legal currency warning uses same pinned registry."),

  // --- PRC structured ---
  d("MAA2-PRC-03-YOUTH-STATE", "PRC", "structured_youth_state_adapter_absent", "stage150_essential_implement", "structured_procedural_party_state", true, "Youth-state structured fields; ESA typically absent → not_exercised."),
  d("MAA2-PRC-04-FITNESS-PARTICIPATION", "PRC", "structured_fitness_adapter_absent", "stage150_essential_implement", "structured_procedural_party_state", true, "Fitness/participation structured fields; fail closed when absent."),
  d("MAA2-PRC-07-DISCLOSURE-PII-STATE", "PRC", "structured_pii_disclosure_adapter_absent", "stage150_essential_implement", "structured_procedural_party_state", true, "Disclosure/PII state records required."),

  // --- AUD multi-audience ---
  d("MAA2-AUD-02-CLIENT-PLAIN", "AUD", "multi_audience_exit_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Client-plain audience surface comparison; ESA single-audience → not_exercised."),
  d("MAA2-AUD-03-COURT-PRECISE", "AUD", "multi_audience_exit_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Court-precise audience surface."),
  d("MAA2-AUD-04-CPS-SPECIFIC", "AUD", "multi_audience_exit_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "CPS-specific audience surface."),
  d("MAA2-AUD-05-SUPERVISOR-RISK", "AUD", "multi_audience_exit_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Supervisor-risk audience surface."),
  d("MAA2-AUD-08-INDEPENDENT-AUDIENCE-TESTS", "AUD", "multi_audience_exit_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Independent audience tests require ≥2 audience surfaces."),

  // --- XPP perspectives ---
  d("MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE", "XPP", "multi_perspective_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Defence-solicitor perspective records."),
  d("MAA2-XPP-02-PROSECUTION-CHALLENGE", "XPP", "multi_perspective_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Prosecution-challenge perspective records."),
  d("MAA2-XPP-03-JUDICIAL-NEUTRALITY", "XPP", "multi_perspective_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Judicial-neutrality perspective records."),
  d("MAA2-XPP-04-CLIENT-COMPREHENSION", "XPP", "multi_perspective_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Client-comprehension perspective records."),
  d("MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE", "XPP", "multi_perspective_adapter_absent", "stage150_essential_implement", "multi_audience_perspective", true, "Supervisor-risk perspective records."),

  // --- VDR reproducibility ---
  d("MAA2-VDR-01-SOURCE-CASE-HASHES", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Source/case hashes from versioned deterministic receipt bag."),
  d("MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Frozen membership order fields."),
  d("MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Pinned CaseBrain commit/build identity."),
  d("MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Schema/registry/detector version pins."),
  d("MAA2-VDR-05-MODEL-PROMPT-VERSION", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Model/prompt version pins when present; else not_exercised."),
  d("MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Exact output/finding-id ledger."),
  d("MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Timestamp + disposition ledger."),
  d("MAA2-VDR-08-BEFORE-AFTER-MAPPING", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Before/after finding map."),
  d("MAA2-VDR-09-ADDED-REMOVED-RETAINED", "VDR", "frozen_run_reproducibility_adapter_absent", "stage150_essential_implement", "versioned_deterministic_receipts", true, "Added/removed/retained finding sets."),

  // --- ELD ---
  d("MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Wire ELD foundation calculators via source-change drafting adapter; synthetic fixtures for contracts; ESA → not_exercised."),
  d("MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Affected-sentence calculation on version pairs."),
  d("MAA2-ELD-03-STALE-DRAFT-MARKING", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Stale draft marking via ELD stale detector."),
  d("MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Stale blocked across exit matrix."),
  d("MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Receipt preservation / no silent rewrite."),
  d("MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Before/after change reason on revision ledger."),
  d("MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Solicitor approval receipts before external exits."),
  d("MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Rejected/superseded revision history."),
  d("MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Audience redraft must not change underlying truth nodes."),
  d("MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Unaffected sentences byte-identical across versions."),
  d("MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Uncertain provenance → qualified/unresolved outcome."),
  d("MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Cross-exit propagation completeness."),
  d("MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Rollback on superseded source."),
  d("MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT", "ELD", "eld_adapter_absent", "stage150_essential_implement", "eld_source_change_drafting", true, "Actor/time/source/approval audit trail."),
];

if (BATCH4_DISPOSITIONS.length !== 55) {
  throw new Error(`Batch4 dispositions must cover 55 SNI (got ${BATCH4_DISPOSITIONS.length})`);
}

export const BATCH4_SELECTED = BATCH4_DISPOSITIONS.filter((x) => x.implementInBatch4);
export const BATCH4_REMAINING_SNI = BATCH4_DISPOSITIONS.filter((x) => !x.implementInBatch4);

export const BATCH4_DISPOSITION_BY_ID: Record<string, Batch4Disposition> = Object.fromEntries(
  BATCH4_DISPOSITIONS.map((x) => [x.controlId, x]),
);

export function batch4DispositionCounts(): Record<Batch4Lane, number> {
  const init: Record<Batch4Lane, number> = {
    stage150_essential_implement: 0,
    stage300_heavy_binary_ocr: 0,
    stage300_semantic_model: 0,
    stage300_human_external: 0,
    esa_unavailable_without_adapter: 0,
  };
  for (const row of BATCH4_DISPOSITIONS) init[row.lane] += 1;
  return init;
}
