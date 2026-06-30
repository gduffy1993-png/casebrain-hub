import { detectTopic } from "./source-match";
import type { SourceMatch } from "./source-match";
import {
  hasJordanBwvAnchor,
  hasJordanCustodyAnchor,
  hasMg11AttributionAnchor,
  hasPhoneExtractionSummaryAnchor,
  hasScreenshotServedAnchor,
  hasShapeAnchor,
  hasSubscriberOutstandingAnchor,
  isCoDefendantSafetyLine,
  isMisplacedFamilyChaseLine,
} from "./case-shape-anchors";
import type {
  LineCategory,
  LineSourceProofRecord,
  LineSupportStatus,
  LineUsefulnessVerdict,
  LineVerdict,
  ReviewTier,
} from "./types";

type TierInput = {
  outputLine: string;
  outputSurface: string;
  lineCategory: LineCategory;
  claimType: string | null;
  evidenceItem: string | null;
  source: SourceMatch;
  supportStatus: LineSupportStatus;
  solicitorReviewRequired: boolean;
  usefulnessVerdict: LineUsefulnessVerdict;
  verdict: LineVerdict;
  gedReviewReasons: string[];
  derivationNote?: string | null;
};

export function isGenericSafetyGuardLine(input: Pick<TierInput, "outputLine" | "lineCategory" | "claimType" | "outputSurface">): boolean {
  if (input.lineCategory === "safety_warning") return true;
  if (input.claimType === "do_not_overstate") return true;
  if (/do_not_overstate|evidence_truth_rules|\/ warnings$/i.test(input.outputSurface)) return true;
  if (/^Do not (import|state|say|treat|rely|overstate|use)\b/i.test(input.outputLine)) return true;
  if (/^Do not treat\b/i.test(input.outputLine)) return true;
  if (isCoDefendantSafetyLine(input.outputLine)) return true;
  return false;
}

function topicFromInput(input: TierInput): ReturnType<typeof detectTopic> {
  return input.source.topic !== "unknown"
    ? input.source.topic
    : detectTopic(`${input.outputLine} ${input.evidenceItem ?? ""}`);
}

function isSafelyWordedCautiousFinding(input: TierInput): boolean {
  const lower = input.outputLine.toLowerCase();
  if (/^do not (state|say|treat|rely|overstate|import|use)\b/i.test(input.outputLine)) return true;
  const safePhrases =
    /referred|not attached|not safely|outstanding|extract only|summary only|partial|provisional|needs_review|unknown|chase|please provide|attribution disputed|disputed/i;
  const overclaim = /\b(proves|confirms|shows guilt|clearly demonstrates|defendant sent)\b/i;
  const falselyServed = /\bsafely served in full\b/i.test(lower) && !/\bnot safely served\b/i.test(lower);
  const fullDownloadClaim =
    /\bfull (phone )?(download|extraction)\b/i.test(lower) && !/\bsummary only|outstanding|not safely/i.test(lower);
  return safePhrases.test(lower) && !overclaim.test(lower) && !falselyServed && !fullDownloadClaim;
}

function hasPhoneShapeAnchor(snippet: string | null, hay: string): boolean {
  return hasShapeAnchor(snippet, hay);
}

export function isPositiveSourceBackedFinding(input: TierInput): boolean {
  const topic = topicFromInput(input);
  const snippet = input.source.sourceSnippet;
  const hay = `${input.outputLine} ${input.evidenceItem ?? ""}`;

  if (!snippet || input.source.adjacentMismatch) return false;
  if (input.verdict === "FAIL" || input.supportStatus === "unsupported" || input.supportStatus === "blocked") {
    return false;
  }

  if (
    input.lineCategory === "evidence_state" &&
    topic === "bwv" &&
    hasJordanBwvAnchor(snippet) &&
    isSafelyWordedCautiousFinding(input)
  ) {
    return true;
  }
  if (
    input.lineCategory === "evidence_state" &&
    topic === "custody" &&
    hasJordanCustodyAnchor(snippet) &&
    isSafelyWordedCautiousFinding(input)
  ) {
    return true;
  }

  if (
    (topic === "phone" || topic === "mg11" || topic === "mg6" || topic === "encro" || topic === "cctv" || topic === "abe") &&
    hasPhoneShapeAnchor(snippet, hay) &&
    isSafelyWordedCautiousFinding(input)
  ) {
    return true;
  }

  if (
    hasScreenshotServedAnchor(snippet) &&
    /screenshot/i.test(hay) &&
    isSafelyWordedCautiousFinding(input)
  ) {
    return true;
  }

  if (topic === "bwv" && hasJordanBwvAnchor(snippet) && isSafelyWordedCautiousFinding(input)) {
    return true;
  }
  if (topic === "custody" && hasJordanCustodyAnchor(snippet) && isSafelyWordedCautiousFinding(input)) {
    return true;
  }

  if (
    input.lineCategory === "chase_request" &&
    (topic === "bwv" || topic === "custody" || topic === "phone" || topic === "mg6" || topic === "encro" || topic === "cctv" || topic === "abe") &&
    input.source.evidenceItemInSnippet &&
    !input.source.genericSourceOnly &&
    (hasJordanBwvAnchor(snippet) ||
      hasJordanCustodyAnchor(snippet) ||
      hasPhoneShapeAnchor(snippet, hay)) &&
    /please provide|chase|outstanding|referred|not attached|summary only/i.test(input.outputLine)
  ) {
    return true;
  }

  if (
    input.lineCategory === "court_note" &&
    snippet &&
    topic === "bwv" &&
    hasJordanBwvAnchor(snippet) &&
    /outstanding|not safely|referred|extract|limited|provisional|chase/i.test(input.outputLine)
  ) {
    return true;
  }
  if (
    input.lineCategory === "court_note" &&
    snippet &&
    topic === "custody" &&
    hasJordanCustodyAnchor(snippet) &&
    /outstanding|not safely|referred|extract|limited|provisional|chase/i.test(input.outputLine)
  ) {
    return true;
  }
  if (
    input.lineCategory === "court_note" &&
    snippet &&
    (topic === "phone" || topic === "mg6" || topic === "mg11" || topic === "encro" || topic === "cctv" || topic === "abe") &&
    hasPhoneShapeAnchor(snippet, hay) &&
    /outstanding|not safely|referred|extract|limited|provisional|chase|attribution|message|subscriber/i.test(
      input.outputLine,
    )
  ) {
    return true;
  }

  if (
    input.lineCategory === "export_line" &&
    snippet &&
    (hasJordanBwvAnchor(snippet) ||
      hasJordanCustodyAnchor(snippet) ||
      hasPhoneShapeAnchor(snippet, hay)) &&
    /outstanding|referred|not attached|extract only|summary only|chase|attribution disputed/i.test(input.outputLine) &&
    !/\bcctv\b/i.test(input.outputLine)
  ) {
    return true;
  }

  return false;
}

function isBlockingReviewReason(input: TierInput): boolean {
  if (
    (input.source.reviewReason === "bundle_does_not_mention_cctv" ||
      input.source.reviewReason === "bundle_does_not_mention_cad" ||
      input.source.reviewReason === "bundle_does_not_mention_phone_extraction") &&
    isMisplacedFamilyChaseLine(input.outputLine, input.lineCategory)
  ) {
    return false;
  }
  const reasons = [
    input.source.reviewReason,
    ...input.gedReviewReasons,
  ].filter(Boolean);
  return reasons.some((r) =>
    [
      "bundle_does_not_mention_cctv",
      "bundle_does_not_mention_cad",
      "full_extraction_overclaim",
      "handle_attribution_overclaim",
      "encro_overclaim",
      "abe_overclaim",
      "cctv_stills_overclaim",
      "other_defendant_bleed",
    ].includes(r as string),
  );
}

export function assignReviewTier(input: TierInput): ReviewTier {
  if (isGenericSafetyGuardLine(input)) return "generic_safety_guard";

  if (input.verdict === "FAIL") return "blocking_review";
  if (input.supportStatus === "unsupported" || input.supportStatus === "blocked") return "blocking_review";
  if (input.usefulnessVerdict === "wrong_or_overstated") return "blocking_review";
  if (isBlockingReviewReason(input)) return "blocking_review";
  if (input.source.adjacentMismatch && !["strategic_review", "contradiction_or_risk"].includes(input.lineCategory)) {
    return "blocking_review";
  }

  if (isPositiveSourceBackedFinding(input)) return "clean_source_backed";

  const noUsableSource =
    !input.source.sourceSnippet ||
    input.source.sourceStrength === "no_anchor" ||
    input.supportStatus === "source_unavailable";

  if (noUsableSource && input.lineCategory !== "strategic_review") {
    return "source_review";
  }

  if (
    input.source.genericSourceOnly &&
    ["chase_request", "court_note", "client_summary", "export_line", "evidence_claim"].includes(input.lineCategory)
  ) {
    return "source_review";
  }

  if (input.gedReviewReasons.includes("generic_source_only")) return "source_review";
  if (input.gedReviewReasons.includes("source_unavailable")) return "source_review";
  if (input.gedReviewReasons.includes("meaningful_line_without_anchor")) return "source_review";
  if (input.source.sourceStrength === "weak" && !input.source.sourceSnippet) return "source_review";

  if (input.lineCategory === "strategic_review" || input.lineCategory === "contradiction_or_risk") {
    return input.source.sourceSnippet ? "solicitor_caution" : "source_review";
  }

  if (
    input.source.sourceSnippet &&
    (input.supportStatus === "partially_supported" ||
      input.supportStatus === "referred_only" ||
      input.supportStatus === "missing" ||
      input.supportStatus === "incomplete" ||
      input.source.sourceStrength === "schedule_only")
  ) {
    return "solicitor_caution";
  }

  if (input.solicitorReviewRequired) return "solicitor_caution";

  if (input.source.sourceSnippet && input.supportStatus === "supported") return "clean_source_backed";

  return "solicitor_caution";
}

export function needsGedReviewList(tier: ReviewTier): boolean {
  return tier === "blocking_review" || tier === "source_review" || tier === "solicitor_caution";
}

const TIER_LABELS: Record<ReviewTier, string> = {
  blocking_review: "BLOCKING REVIEW",
  source_review: "SOURCE REVIEW",
  solicitor_caution: "SOLICITOR CAUTION",
  clean_source_backed: "CLEAN SOURCE-BACKED",
  generic_safety_guard: "GENERIC SAFETY GUARD",
};

export function tierLabel(tier: ReviewTier): string {
  return TIER_LABELS[tier];
}

export function refineAfterTier(input: TierInput, tier: ReviewTier): {
  solicitorReviewRequired: boolean;
  usefulnessVerdict: LineUsefulnessVerdict;
  verdict: LineVerdict;
  gedReviewReasons: string[];
} {
  let { solicitorReviewRequired, usefulnessVerdict, verdict, gedReviewReasons } = input;

  if (tier === "generic_safety_guard") {
    solicitorReviewRequired = false;
    usefulnessVerdict = "correct_and_useful";
    verdict = "PASS";
    gedReviewReasons = [];
    return { solicitorReviewRequired, usefulnessVerdict, verdict, gedReviewReasons };
  }

  if (tier === "clean_source_backed") {
    solicitorReviewRequired = false;
    usefulnessVerdict = "correct_and_useful";
    verdict = "PASS";
    gedReviewReasons = gedReviewReasons.filter(
      (r) => !["solicitor_review_required", "meaningful_line_without_anchor"].includes(r),
    );
    return { solicitorReviewRequired, usefulnessVerdict, verdict, gedReviewReasons };
  }

  if (tier === "blocking_review") {
    solicitorReviewRequired = true;
    if (verdict !== "FAIL") verdict = "FAIL";
    if (usefulnessVerdict === "correct_and_useful") usefulnessVerdict = "wrong_or_overstated";
    return { solicitorReviewRequired, usefulnessVerdict, verdict, gedReviewReasons };
  }

  if (tier === "source_review") {
    solicitorReviewRequired = true;
    if (verdict === "PASS") verdict = "WARNING";
    if (usefulnessVerdict === "correct_and_useful") usefulnessVerdict = "solicitor_review_required";
    return { solicitorReviewRequired, usefulnessVerdict, verdict, gedReviewReasons };
  }

  solicitorReviewRequired = true;
  if (verdict === "PASS") verdict = "WARNING";
  if (usefulnessVerdict === "correct_and_useful" && input.supportStatus !== "supported") {
    usefulnessVerdict = "safe_but_not_actionable";
  }
  return { solicitorReviewRequired, usefulnessVerdict, verdict, gedReviewReasons };
}

export function summarizeTiers(lines: LineSourceProofRecord[]) {
  const meaningful = lines.filter((l) => l.usefulnessVerdict !== "excluded");
  const byTier = (tier: ReviewTier) => meaningful.filter((l) => l.reviewTier === tier).length;
  const gedReview = meaningful.filter((l) => needsGedReviewList(l.reviewTier));

  return {
    blockingReview: byTier("blocking_review"),
    unsupportedOutput: meaningful.filter(
      (l) =>
        l.supportStatus === "unsupported" ||
        l.supportStatus === "blocked" ||
        l.gedReviewReasons.some((r) =>
          ["bundle_does_not_mention_cctv", "bundle_does_not_mention_cad", "full_extraction_overclaim", "other_defendant_bleed"].includes(r),
        ),
    ).length,
    sourceReviewWarnings: byTier("source_review"),
    solicitorCaution: byTier("solicitor_caution"),
    cleanSourceBacked: byTier("clean_source_backed"),
    genericSafetyGuards: byTier("generic_safety_guard"),
    positiveCorrect: meaningful.filter((l) => l.usefulnessVerdict === "correct_and_useful").length,
    gedReviewCount: gedReview.length,
    byTier: Object.fromEntries(
      (["blocking_review", "source_review", "solicitor_caution", "clean_source_backed", "generic_safety_guard"] as const).map(
        (t) => [t, byTier(t)],
      ),
    ),
  };
}
