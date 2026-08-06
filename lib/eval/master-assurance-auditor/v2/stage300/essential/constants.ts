/**
 * Stage-300 essential-control execution bridge — constants.
 *
 * Smallest honest blocking set (43 controls) from
 * artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-execution-readiness-plan/stage300-essential-control-register.json
 * ("count": 43). Never broaden this list ad hoc — it is the exact register set:
 * heavy_pdf_ocr_binary(5) + structured_charge_instruments(1) + chronology_competing_timestamps(5) +
 * cross_exit_cross_audience(9) + evidence_locked_drafting_version(9 VDR + 14 ELD) = 43.
 *
 * This module never opens truth-key.json, never imports the Stage-150 candidate ledger, and never
 * repairs CaseBrain. Baseline pin and Stage-150 pins are re-exported from the existing v1
 * stage300/calibration/constants module so both lineages share one source of truth for the pins —
 * never recomputed to match.
 */

import {
  STAGE150_CANDIDATE_FREEZE_SHA256_PIN,
  STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN,
  STAGE300_CALIBRATION_BASELINE,
} from "../calibration/constants";

/** HEAD must stay pinned at this baseline for the essential-43 bridge + v2 calibration work. */
export const ESSENTIAL_BRIDGE_BASELINE_COMMIT = STAGE300_CALIBRATION_BASELINE;

/** Re-exported — never recomputed. Preserved nested inside v2 freeze artefacts. */
export const STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN_V2 = STAGE150_ORDERED_MEMBERSHIP_SHA256_PIN;
export const STAGE150_CANDIDATE_FREEZE_SHA256_PIN_V2 = STAGE150_CANDIDATE_FREEZE_SHA256_PIN;

export const ESSENTIAL_SCHEMA_VERSION = "maa-v2-stage300-essential-43@1.0.0" as const;
export const ESSENTIAL_EVALUATOR_VERSION = "maa-v2-stage300-essential-evaluators@1.0.0" as const;
export const ESSENTIAL_INPUT_LOADER_VERSION = "maa-v2-stage300-essential-input-loader@1.0.0" as const;
export const SOLICITOR_QUALITY_SCHEMA_VERSION = "maa-v2-stage300-solicitor-quality@1.0.0" as const;
export const EXECUTION_BRIDGE_TRACE_SCHEMA_VERSION = "maa-v2-stage300-execution-bridge-trace@1.0.0" as const;
export const PIPELINE_V2_SCHEMA_VERSION = "maa-v2-stage300-calibration-run-v2@1.0.0" as const;

/** NEW artefact root — never overwrites v1 (`stage300-calibration-run/`) or the historical snapshot. */
export const ARTEFACT_ROOT_V2 =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v2" as const;

export const ESSENTIAL_CONTROL_REGISTER_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-execution-readiness-plan/stage300-essential-control-register.json" as const;

export const NEW150_ARTIFACT_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-new-150-control-coverage" as const;
export const NEW150_POPULATION_MANIFEST_REL = `${NEW150_ARTIFACT_ROOT}/new-150-population-manifest.json` as const;
export const NEW150_V1_HISTORICAL_WORK_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run-v1-historical/work" as const;
export const NEW150_V1_CURRENT_WORK_ROOT =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage300-calibration-run/work" as const;

export const STAGE150_FROZEN_POPULATION_MANIFEST_REL =
  "artifacts/casebrain-qa/assurance/master-auditor-v2/stage150-calibration-run/frozen-population-manifest.json" as const;

/** Per-case input filenames this bridge loads. truth-key.json is deliberately never in this list. */
export const ESSENTIAL_INPUT_FILENAMES = {
  casebrainOutput: "casebrain-output.json",
  specialtyBagsHarness: "specialty-bags-harness.json",
  vdrRunReceipt: "vdr-run-receipt.json",
  audiencePacks: "audience-packs.json",
  eldVersionPair: "eld-version-pair.json",
  ocrPageUnitReceipts: "ocr-page-unit-receipts.json",
  structuredCasePacket: "structured-case-packet.json",
} as const;

export const NEVER_OPENED_FILENAME = "truth-key.json" as const;

// ---------------------------------------------------------------------------------------------
// The 43 essential control IDs (exact order from the register's byTheme groupings).
// ---------------------------------------------------------------------------------------------

export const SRC_ESSENTIAL_IDS = [
  "MAA2-SRC-07-REDACTION-DETECT",
  "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
  "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
  "MAA2-SRC-13-PASSWORD-CORRUPT",
  "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
] as const;

export const LSL_ESSENTIAL_IDS = ["MAA2-LSL-05-CATEGORY-SET-COVERAGE"] as const;

export const CHR_PRC_ESSENTIAL_IDS = [
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
  "MAA2-PRC-03-YOUTH-STATE",
  "MAA2-PRC-04-FITNESS-PARTICIPATION",
  "MAA2-PRC-07-DISCLOSURE-PII-STATE",
] as const;

export const AUD_XPP_ESSENTIAL_IDS = [
  "MAA2-AUD-02-CLIENT-PLAIN",
  "MAA2-AUD-03-COURT-PRECISE",
  "MAA2-AUD-04-CPS-SPECIFIC",
  "MAA2-AUD-05-SUPERVISOR-RISK",
  "MAA2-XPP-01-DEFENCE-SOLICITOR-PERSPECTIVE",
  "MAA2-XPP-02-PROSECUTION-CHALLENGE",
  "MAA2-XPP-03-JUDICIAL-NEUTRALITY",
  "MAA2-XPP-04-CLIENT-COMPREHENSION",
  "MAA2-XPP-05-SUPERVISOR-RISK-PERSPECTIVE",
] as const;

export const VDR_ESSENTIAL_IDS = [
  "MAA2-VDR-01-SOURCE-CASE-HASHES",
  "MAA2-VDR-02-FROZEN-MEMBERSHIP-ORDER",
  "MAA2-VDR-03-CASEBRAIN-COMMIT-BUILD",
  "MAA2-VDR-04-SCHEMA-REGISTRY-DETECTOR-VERSIONS",
  "MAA2-VDR-05-MODEL-PROMPT-VERSION",
  "MAA2-VDR-06-EXACT-OUTPUTS-FINDING-IDS",
  "MAA2-VDR-07-TIMESTAMPS-DISPOSITIONS",
  "MAA2-VDR-08-BEFORE-AFTER-MAPPING",
  "MAA2-VDR-09-ADDED-REMOVED-RETAINED",
] as const;

export const ELD_ESSENTIAL_IDS = [
  "MAA2-ELD-01-SOURCE-FACT-CONCLUSION-SENTENCE-RECEIPTS",
  "MAA2-ELD-02-SOURCE-CHANGE-AFFECTED-SENTENCES",
  "MAA2-ELD-03-STALE-DRAFT-MARKING",
  "MAA2-ELD-04-STALE-BLOCKED-ACROSS-EXITS",
  "MAA2-ELD-05-NO-SILENT-REWRITE-OR-DELETE",
  "MAA2-ELD-06-BEFORE-AFTER-CHANGE-REASON",
  "MAA2-ELD-07-SOLICITOR-APPROVAL-BEFORE-EXTERNAL",
  "MAA2-ELD-08-REJECTED-SUPERSEDED-REVISION-HISTORY",
  "MAA2-ELD-09-AUDIENCE-REDRAFT-UNCHANGED-TRUTH",
  "MAA2-ELD-10-UNAFFECTED-SENTENCES-BYTE-IDENTICAL",
  "MAA2-ELD-11-UNCERTAIN-PROVENANCE-QUALIFIED",
  "MAA2-ELD-12-CROSS-EXIT-PROPAGATION-COMPLETE",
  "MAA2-ELD-13-ROLLBACK-SUPERSEDED-SOURCE",
  "MAA2-ELD-14-ACTOR-TIME-SOURCE-APPROVAL-AUDIT",
] as const;

export const ESSENTIAL_43_IDS = [
  ...SRC_ESSENTIAL_IDS,
  ...LSL_ESSENTIAL_IDS,
  ...CHR_PRC_ESSENTIAL_IDS,
  ...AUD_XPP_ESSENTIAL_IDS,
  ...VDR_ESSENTIAL_IDS,
  ...ELD_ESSENTIAL_IDS,
] as const;

export type EssentialControlId = (typeof ESSENTIAL_43_IDS)[number];

export const ESSENTIAL_43_COUNT = 43 as const;
if (ESSENTIAL_43_IDS.length !== ESSENTIAL_43_COUNT) {
  throw new Error(
    `ESSENTIAL_43_IDS length drifted from register: expected ${ESSENTIAL_43_COUNT}, got ${ESSENTIAL_43_IDS.length}`,
  );
}

export type EssentialFamily = "SPECIALTY" | "AUD_XPP" | "VDR" | "ELD" | "SRC";

export function essentialFamilyOf(controlId: EssentialControlId): EssentialFamily {
  if ((LSL_ESSENTIAL_IDS as readonly string[]).includes(controlId)) return "SPECIALTY";
  if ((CHR_PRC_ESSENTIAL_IDS as readonly string[]).includes(controlId)) return "SPECIALTY";
  if ((AUD_XPP_ESSENTIAL_IDS as readonly string[]).includes(controlId)) return "AUD_XPP";
  if ((VDR_ESSENTIAL_IDS as readonly string[]).includes(controlId)) return "VDR";
  if ((ELD_ESSENTIAL_IDS as readonly string[]).includes(controlId)) return "ELD";
  return "SRC";
}

export type NamedControlExerciseStatus = "evaluated" | "unresolved" | "not_exercised";
export type EssentialBacking = "production" | "harness_expectation" | "capture_receipt";

export const SOLICITOR_QUALITY_GENERIC_PHRASES = [
  "Evidence issue identified. Solicitor review required.",
  "Charge requires verification",
  "Evidence missing",
  "Review required",
  "Chase papers",
  "Position provisional",
] as const;

export const SOLICITOR_QUALITY_MIN_SPECIFIC_LENGTH = 40 as const;

/**
 * Additional wording-quality detection constants for the v2 review-remediation solicitor-quality
 * rewrite (`essential/solicitor-quality.ts`). Additive — never removes/narrows the original
 * SOLICITOR_QUALITY_GENERIC_PHRASES / SOLICITOR_QUALITY_MIN_SPECIFIC_LENGTH pair above, which
 * remain in force for the SOQ_* codes.
 */
export const WORDING_PLACEHOLDER_TOKENS = [
  "TBD",
  "TODO",
  "N/A",
  "n/a",
  "Lorem ipsum",
  "[insert]",
  "PLACEHOLDER",
  "XXX",
  "FIXME",
  "<unknown>",
  "undefined",
] as const;

export const WORDING_INTERNAL_FIXTURE_TOKENS_RE =
  /\b(findingId|engineId|handlerId|detectorClassification|controlRoom|internal[_\s-]?only|phraseProbe|candidateId|debug|console\.(log|error|warn)|stack\s?trace|synthetic[_\s-]?fixture|contract[_\s-]?fixture|Stage-300|stage-300|stage300|Format notes|control-coverage materialisation|Coverage (?:family|tag)|matter token|specialty_[a-z0-9_]+|ocr_binary_heavy|demo-audit|s150-[a-z0-9_-]+|s300-[a-z0-9_-]+|S300-[a-z0-9_-]+|UQ-[a-z0-9_-]+|filesystem|node_modules|\\\\artifacts\\|\/artifacts\/)\b/i;

export const WORDING_ABSOLUTE_PROOF_RE =
  /\b(proves conclusively|definitely (guilty|innocent)|100% (certain|guaranteed)|beyond (any )?doubt|guaranteed to (succeed|convict|acquit)|conclusively establishes|irrefutable proof|undeniably (guilty|innocent))\b/i;

export const WORDING_DANGLING_TRAILING_WORDS = [
  "and",
  "the",
  "to",
  "of",
  "a",
  "an",
  "in",
  "on",
  "with",
  "for",
  "as",
  "by",
  "or",
  "but",
  "that",
  "which",
  "is",
  "was",
  "at",
] as const;

export const WORDING_REASON_CONJUNCTION_RE =
  /\b(because|due to|given that|as a result of|owing to|on the (basis|grounds) that|since)\b/i;

export const WORDING_NEXT_STEP_OR_MATERIALITY_RE =
  /\b(please|by \d|before \d|contact|serve|disclose|confirm in writing|provide|this means|as a result|therefore|meaning that|solicitor (should|must|will need to)|next step|action required)\b/i;
