/**
 * H4 Criminal Bundle Simulator Library — manifest v1 seed cases (30).
 * Used by scripts/build-simulator-manifest-v1.ts — no bundle text here.
 * v1 locked — serious-case supplement is manifest-v1.1-cases.ts (+7).
 */
import { buildManifestCase, type SimulatorManifestCase } from "./manifest-types";

export type { SimulatorManifestCase };

function c(
  id: string,
  title: string,
  profile: string,
  family: string,
  mainIssue: string,
  trap: string,
  pdf: string,
  opts: Partial<SimulatorManifestCase> = {},
): SimulatorManifestCase {
  return buildManifestCase({
    caseId: id,
    title,
    profile,
    offenceFamily: family,
    mainIssue,
    redTeamTrapType: trap,
    pdfLayoutType: pdf,
    ...opts,
  });
}

export const SIMULATOR_MANIFEST_V1_CASES: SimulatorManifestCase[] = [
  c("sim-001", "Harassment — screenshots only", "harassment_digital_attribution", "harassment", "Attribution not safely proved", "messages_without_account_data", "clean_digital", {
    missingEvidence: ["subscriber data", "message export", "call logs"],
    mustNotSay: ["defendant sent messages as fact"],
    expectedChaseItems: ["phone/subscriber data", "message export"],
  }),
  c("sim-002", "Harassment — wrong second male", "harassment_digital_attribution", "harassment", "Attribution unclear", "wrong_second_male", "clean_digital", {
    uncertainEvidence: ["second male mentioned"],
    expectedChaseItems: ["subscriber/account data"],
  }),
  c("sim-003", "AEW — BWV referred only", "aew_bwv", "violence_aew", "BWV not safely served", "bwv_referred_only", "clean_digital", {
    referredOnlyEvidence: ["BWV"],
    mustNotSay: ["BWV shows assault"],
    expectedChaseItems: ["body-worn video full export"],
  }),
  c("sim-004", "AEW — custody/PACE missing", "custody_pace", "violence_aew", "PACE safeguards cannot be final", "custody_record_missing", "scanned_pdf", {
    referredOnlyEvidence: ["custody mention"],
    missingEvidence: ["full custody record", "interview recording"],
    expectedChaseItems: ["custody record", "interview recording/transcript"],
  }),
  c("sim-005", "Domestic assault — unsigned MG11", "violence_domestic", "violence_domestic", "Complainant account not final", "mg11_unsigned", "clean_digital", {
    referredOnlyEvidence: ["MG11 draft"],
    mustNotSay: ["final witness statement proves injury"],
  }),
  c("sim-006", "s18 — medical referred only", "violence_s18", "violence_s18", "Injury severity not proved on papers", "medical_referred_only", "clean_digital", {
    referredOnlyEvidence: ["medical evidence"],
    mustNotSay: ["GBH fully proved"],
  }),
  c("sim-007", "s20 — unsafe win wording trap", "violence_s20", "violence_s20", "Charge-fit needs review", "unsafe_win_language", "clean_digital", {
    blockingFailPatterns: ["case collapses", "guaranteed reduction", "charge will be dropped"],
  }),
  c("sim-008", "PWITS — missing continuity", "drugs_pwits", "drugs", "Continuity/lab missing", "drug_continuity_missing", "schedule_heavy", {
    missingEvidence: ["continuity", "lab report", "exhibit list"],
    expectedChaseItems: ["continuity", "lab analysis"],
  }),
  c("sim-009", "Possession — PWITS index bleed", "drugs_possession", "drugs", "Avoid PWITS route bleed", "wrong_family_pwits_bleed", "index_only", {
    mustNotSay: ["supply chain proved"],
    blockingFailPatterns: ["PWITS pressure without charge support"],
  }),
  c("sim-010", "Fraud — bank schedule absent", "fraud_account_control", "fraud", "Account control not proved", "bank_schedule_missing", "tables", {
    missingEvidence: ["bank schedules", "device extraction"],
    expectedChaseItems: ["account ownership", "bank schedules"],
  }),
  c("sim-011", "Perverting justice — fraud bleed", "perverting_justice", "perverting", "Route must stay provisional", "fraud_route_bleed", "mixed_offences", {
    blockingFailPatterns: ["fraud account-control route as final"],
  }),
  c("sim-012", "Robbery — CCTV missing", "robbery_id", "robbery", "ID/CCTV gap", "cctv_referred_only", "clean_digital", {
    referredOnlyEvidence: ["CCTV"],
    expectedChaseItems: ["CCTV full window", "ID procedure material"],
  }),
  c("sim-013", "Robbery — mixed defendant names", "robbery_id", "robbery", "Identity caution", "multi_defendant_names", "mixed_defendants", {
    uncertainEvidence: ["witness names conflict"],
    expectedSourceStateBadges: ["needs_review", "not_safely_confirmed"],
  }),
  c("sim-014", "Motoring SJP thin bundle", "motoring_sjp", "motoring", "Thin bundle — cautious output", "thin_bundle", "very_thin", {
    expectedSendability: "provisional_check_source",
    expectedSummaryRisk: "Early-stage — missing evidence",
  }),
  c("sim-015", "Motoring — fraud word bleed", "motoring_sjp", "motoring", "No fraud family bleed", "false_fraud_bleed", "clean_digital", {
    blockingFailPatterns: ["fraud account-control"],
  }),
  c("sim-016", "Sexual — ABE referred only", "sexual_abe", "sexual", "Strict caution — ABE absent", "abe_referred_only", "clean_digital", {
    referredOnlyEvidence: ["ABE interview"],
    mustNotSay: ["ABE confirms", "interview proves"],
    expectedSourceStateBadges: ["referred_only", "needs_review"],
  }),
  c("sim-017", "Youth/vulnerability marker", "youth_vulnerability", "generic", "Safeguarding needs review", "vulnerability_hint", "scanned_pdf", {
    expectedSourceStateBadges: ["needs_review", "provisional"],
    mustNotSay: ["legal advice on fitness"],
  }),
  c("sim-018", "OCR-poor scanned MG6", "generic_provisional", "generic", "No raw OCR in sendable copy", "ocr_poor_mg6", "bad_ocr", {
    blockingFailPatterns: ["=== SECTION:", "pipe fragments in CPS copy"],
  }),
  c("sim-019", "Weird index only", "generic_provisional", "generic", "Referred-only index trap", "index_only_bundle", "index_only", {
    referredOnlyEvidence: ["indexed material"],
    expectedSourceStateBadges: ["referred_only", "missing"],
  }),
  c("sim-020", "Duplicate conflicting MG11s", "violence_domestic", "violence_domestic", "Inconsistent accounts", "duplicate_mg11", "duplicate_pages", {
    uncertainEvidence: ["two MG11 versions"],
    mustNotSay: ["MG11 proves account as final fact"],
  }),
  c("sim-021", "Conflicting hearing dates", "generic_provisional", "generic", "Date review required", "conflicting_dates", "clean_digital", {
    uncertainEvidence: ["hearing date conflict"],
    expectedTodayIssue: "Date review — hearing date needs confirmation",
  }),
  c("sim-022", "Mixed offences in one PDF", "mixed_family", "mixed", "No wrong-family bleed", "mixed_offences_pdf", "mixed_offences", {
    blockingFailPatterns: ["drug continuity on harassment matter", "fraud route on violence-only charge"],
  }),
  c("sim-023", "Police jargon only", "generic_provisional", "generic", "Profile unclear/provisional", "jargon_only", "bad_ocr", {
    expectedSourceStateBadges: ["provisional", "needs_review"],
  }),
  c("sim-024", "Missing MG6 — chase still needed", "generic_provisional", "generic", "Chase MG6/unused schedule", "mg6_missing", "clean_digital", {
    missingEvidence: ["MG6", "unused schedule detail"],
    expectedChaseItems: ["MG6/unused schedule clarification"],
  }),
  c("sim-025", "BWV stills only", "aew_bwv", "violence_aew", "Chase full BWV export", "bwv_stills_only", "clean_digital", {
    servedEvidence: ["BWV stills/screenshots"],
    missingEvidence: ["full BWV export"],
    mustNotSay: ["full BWV served"],
  }),
  c("sim-026", "Custody extract only", "custody_pace", "violence_aew", "Full custody/PACE still outstanding", "custody_extract_only", "scanned_pdf", {
    servedEvidence: ["custody extract"],
    missingEvidence: ["full custody log", "interview recording"],
  }),
  c("sim-027", "Large complex fraud", "fraud_account_control", "fraud", "Needs review — not overconfident", "large_complex_bundle", "large_messy", {
    expectedSourceStateBadges: ["needs_review", "provisional"],
    expectedSendability: "needs_solicitor_review",
  }),
  c("sim-028", "Expert report mentioned only", "generic_provisional", "generic", "Chase expert report", "expert_mentioned_only", "schedule_heavy", {
    referredOnlyEvidence: ["expert report"],
    mustNotSay: ["expert confirms"],
  }),
  c("sim-029", "Bad metadata placeholder charge", "generic_provisional", "generic", "Metadata must not override charge", "placeholder_metadata", "placeholder_metadata", {
    uncertainEvidence: ["placeholder offence in metadata"],
  }),
  c("sim-030", "Late evidence re-run (future)", "generic_provisional", "generic", "Output may stale after upload", "late_evidence_rerun", "clean_digital", {
    polishOnlyWarnings: ["stale output until re-run diff (H5/H6)"],
    expectedSummaryRisk: "Provisional — may change when new evidence uploaded",
  }),
];
