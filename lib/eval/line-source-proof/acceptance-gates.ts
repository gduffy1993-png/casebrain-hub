/**
 * 30-case proof-ledger acceptance gates (audit layer only).
 */
import { bundleMentionsFamily, polishProductCasing } from "./ledger-display";
import type { LineSourceProofReport } from "./types";

export type AcceptanceGateResult = {
  gate: string;
  passed: boolean;
  detail: string;
  severity: "blocking" | "warning";
};

export type CaseAcceptanceReport = {
  caseId: string;
  passed: boolean;
  blocked: boolean;
  gates: AcceptanceGateResult[];
  warningCount: number;
};

const BLEED_CHECKS: Array<{ family: string; lineRe: RegExp; label: string }> = [
  { family: "phone", lineRe: /platform extraction/i, label: "platform extraction" },
  { family: "abe", lineRe: /\babe\b|achieving best evidence/i, label: "ABE" },
  { family: "encro", lineRe: /\bencro\b|shadow-\d+/i, label: "Encro" },
  { family: "cad", lineRe: /\bcad\b|\b999\b/i, label: "CAD/999" },
];

function meaningfulLines(report: LineSourceProofReport) {
  return report.lines.filter((l) => l.usefulnessVerdict !== "excluded");
}

/** Safety guards and do-not-say lines may name families absent from the bundle — not bleed. */
function isWrongFamilyBleedCandidate(line: LineSourceProofReport["lines"][number]): boolean {
  if (line.reviewTier === "generic_safety_guard") return false;
  if (line.lineCategory === "safety_warning") return false;
  if (line.claimType === "do_not_overstate") return false;
  const text = (line.humanOutputLine ?? line.outputLine).toLowerCase();
  if (/do not import|do not say|must not|not shown|would have said|overclaim|unsafe trap/.test(text)) return false;
  return true;
}

function claimsServedInFull(text: string): boolean {
  const t = text.toLowerCase();
  if (/not safely served|not served in full|not fully served|referred to but not|not attached|outstanding|missing/.test(t)) {
    return false;
  }
  return /\bsafely served\b|\bserved in full\b|\bfully served\b/.test(t);
}

function claimsAvailableDespiteMissing(text: string): boolean {
  const t = text.toLowerCase();
  if (
    /not safely confirmed|not fully served|not safely served|not available|not confirmed|not on file|outstanding|referred to but not|— missing\b|\bmissing —/.test(
      t,
    )
  ) {
    return false;
  }
  return /\bavailable on file\b|\bsafely confirmed\b|\bfully served\b/.test(t);
}

export function runAcceptanceGates(report: LineSourceProofReport, bundleText: string): CaseAcceptanceReport {
  const gates: AcceptanceGateResult[] = [];
  const meaningful = meaningfulLines(report);
  const c = report.proofLedger.counts;
  const summary = report.summary;

  gates.push({
    gate: "zero_emitted_fail",
    passed: summary.fail === 0,
    detail: `emitted FAIL=${summary.fail}`,
    severity: "blocking",
  });

  gates.push({
    gate: "zero_emitted_unsupported",
    passed: c.emittedUnsupported === 0 && summary.proofChainCoverage.outputUnsupported === 0,
    detail: `emittedUnsupported=${c.emittedUnsupported}, outputUnsupported=${summary.proofChainCoverage.outputUnsupported}`,
    severity: "blocking",
  });

  const wrongFamily: string[] = [];
  for (const line of meaningful) {
    if (!isWrongFamilyBleedCandidate(line)) continue;
    const text = polishProductCasing(line.humanOutputLine ?? line.outputLine);
    for (const { family, lineRe, label } of BLEED_CHECKS) {
      if (lineRe.test(text) && !bundleMentionsFamily(bundleText, family)) {
        wrongFamily.push(`${line.id}: ${label}`);
      }
    }
  }
  gates.push({
    gate: "zero_wrong_family_bleed",
    passed: wrongFamily.length === 0,
    detail: wrongFamily.length ? wrongFamily.slice(0, 5).join("; ") : "none",
    severity: "blocking",
  });

  const courtInCps = report.proofLedger.surfaceSafety.filter(
    (s) => s.surface === "cps_chase" && /court|submission|your honour/i.test(s.issue),
  );
  gates.push({
    gate: "zero_court_wording_in_cps_chase",
    passed: courtInCps.length === 0,
    detail: courtInCps.length ? `${courtInCps.length} issues` : "none",
    severity: "blocking",
  });

  const referredAsServed = meaningful.filter((l) => {
    const text = (l.humanOutputLine ?? l.outputLine).toLowerCase();
    const state = (l.evidenceState ?? "").toLowerCase();
    if (/referred_only|missing|incomplete/.test(state) && claimsServedInFull(text)) {
      return true;
    }
    if (
      l.lineCategory === "chase_request" &&
      /\bplease provide\b/i.test(text) &&
      /\bserved\b/i.test(text) &&
      !/not served|outstanding|referred|not attached|not available/.test(text)
    ) {
      return true;
    }
    return false;
  });
  gates.push({
    gate: "zero_referred_treated_as_served",
    passed: referredAsServed.length === 0,
    detail: referredAsServed.length ? `${referredAsServed.length} lines` : "none",
    severity: "blocking",
  });

  const missingAsAvailable = meaningful.filter((l) => {
    const state = (l.evidenceState ?? "").toLowerCase();
    const text = l.humanOutputLine ?? l.outputLine;
    return state === "missing" && claimsAvailableDespiteMissing(text);
  });
  gates.push({
    gate: "zero_missing_treated_as_available",
    passed: missingAsAvailable.length === 0,
    detail: missingAsAvailable.length ? `${missingAsAvailable.length} lines` : "none",
    severity: "blocking",
  });

  const incompleteAsComplete = meaningful.filter((l) => {
    const state = (l.evidenceState ?? "").toLowerCase();
    const text = (l.humanOutputLine ?? l.outputLine).toLowerCase();
    return /incomplete|partial|extract only|summary only/.test(state) && /\bcomplete\b|\bfully served\b|\bsafely served in full\b/.test(text);
  });
  gates.push({
    gate: "zero_incomplete_treated_as_complete",
    passed: incompleteAsComplete.length === 0,
    detail: incompleteAsComplete.length ? `${incompleteAsComplete.length} lines` : "none",
    severity: "blocking",
  });

  gates.push({
    gate: "suppressions_logged",
    passed: c.suppressedCandidates > 0 || meaningful.length < 30,
    detail: `suppressed=${c.suppressedCandidates}`,
    severity: "warning",
  });

  gates.push({
    gate: "missing_expected_logged",
    passed: true,
    detail: `missingExpected=${c.missingExpectedOutputs}`,
    severity: "warning",
  });

  gates.push({
    gate: "false_suppressions_visible",
    passed: true,
    detail: `possibleFalseSuppressions=${c.possibleFalseSuppressions}`,
    severity: "warning",
  });

  const summaryCasing = [
    ...report.proofLedger.solicitorSummary.whatCaseBrainGotRight,
    ...report.proofLedger.solicitorSummary.whatWasRewrittenSafely,
    ...report.proofLedger.solicitorSummary.mainEvidenceGaps,
  ].filter((t) => /\bcCTV\b|\bmG6\b/.test(t));
  gates.push({
    gate: "summary_casing_polish",
    passed: summaryCasing.length === 0,
    detail: summaryCasing.length ? `${summaryCasing.length} bullets with cCTV/mG6` : "clean",
    severity: "warning",
  });

  const proofModeHonest =
    report.proofChainAppendix.caseProofMode === "pdf_and_text"
      ? report.proofChainAppendix.originalPdfAvailable
      : report.proofChainAppendix.caseProofMode === "text_only_controlled";
  gates.push({
    gate: "proof_mode_honest",
    passed: proofModeHonest,
    detail: `mode=${report.proofChainAppendix.caseProofMode}, pdf=${report.proofChainAppendix.originalPdfAvailable}`,
    severity: "blocking",
  });

  const blockingFails = gates.filter((g) => g.severity === "blocking" && !g.passed);
  const warningCount = summary.warning + gates.filter((g) => g.severity === "warning" && !g.passed).length;

  return {
    caseId: report.caseId,
    passed: blockingFails.length === 0,
    blocked: blockingFails.length > 0,
    gates,
    warningCount,
  };
}
