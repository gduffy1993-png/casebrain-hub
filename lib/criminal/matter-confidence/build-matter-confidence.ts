import type {
  EvidenceCoverage,
  MatterConfidenceInput,
  MatterConfidenceLevel,
  MatterConfidenceResult,
  SafeCourtLineStatus,
  SendabilityLevel,
  SourceStateKind,
} from "./matter-confidence-types";

/** H3 hard rule: lines without source state cannot be marked safe to send (matter-level default). */
export const H3_SOURCE_STATE_SEND_RULE =
  "If a line cannot show source state, it cannot be marked safe to send.";

function labelForLevel(level: MatterConfidenceLevel): string {
  switch (level) {
    case "safe":
      return "Safe for solicitor review";
    case "provisional":
      return "Provisional — source-linked";
    case "needs_review":
      return "Needs review before relying";
    case "blocked":
      return "Blocked — papers not ready";
  }
}

function evidenceCoverage(input: MatterConfidenceInput, level: MatterConfidenceLevel): EvidenceCoverage {
  if (level === "blocked" || input.bundleHealth === "unknown") return "unclear";
  if (input.bundleHealth === "thin" || (input.missingMaterialCount ?? 0) >= 3) return "thin";
  if ((input.missingMaterialCount ?? 0) >= 1) return "partial";
  if (input.documentCount >= 2 && input.bundleHealth === "ready") return "good";
  return "partial";
}

function safeCourtLineStatus(
  input: MatterConfidenceInput,
  level: MatterConfidenceLevel,
): SafeCourtLineStatus {
  if (level === "blocked") return "not_generated";
  if (!input.hasSafeCourtLine) return "needs_review";
  if (level === "needs_review" || level === "provisional") return "needs_review";
  return "available";
}

function sendabilityForTab(
  level: MatterConfidenceLevel,
  tab: "chase" | "summary",
): SendabilityLevel {
  if (level === "blocked") return "blocked";
  if (level === "needs_review") return "needs_solicitor_review";
  if (level === "provisional") return "provisional_check_source";
  return tab === "chase" ? "needs_solicitor_review" : "provisional_check_source";
}

function deriveLevel(input: MatterConfidenceInput): MatterConfidenceLevel {
  if (input.documentCount === 0) {
    return "blocked";
  }
  if (
    input.combinedTextLength !== undefined &&
    input.combinedTextLength === 0 &&
    input.documentCount > 0
  ) {
    return "blocked";
  }
  if (input.bundleHealth === "unknown") {
    return "blocked";
  }
  if (
    input.humanReviewRequired ||
    input.solicitorReviewRequired ||
    (input.missingMaterialCount ?? 0) >= 3 ||
    (input.contradictionCount ?? 0) >= 2
  ) {
    return "needs_review";
  }
  if (
    input.bundleHealth === "thin" ||
    input.genericProvisional ||
    (input.missingMaterialCount ?? 0) >= 1
  ) {
    return "provisional";
  }
  if (
    input.bundleHealth === "ready" &&
    !input.genericProvisional &&
    (input.missingMaterialCount ?? 0) === 0 &&
    !input.humanReviewRequired
  ) {
    return "safe";
  }
  return "provisional";
}

function tabReadiness(
  level: MatterConfidenceLevel,
): Pick<MatterConfidenceResult, "chaseReadiness" | "summaryReadiness"> {
  if (level === "blocked") {
    return { chaseReadiness: "blocked", summaryReadiness: "blocked" };
  }
  if (level === "needs_review") {
    return { chaseReadiness: "provisional", summaryReadiness: "provisional" };
  }
  if (level === "provisional") {
    return { chaseReadiness: "provisional", summaryReadiness: "provisional" };
  }
  return { chaseReadiness: "ready", summaryReadiness: "provisional" };
}

function buildSourceBadges(input: MatterConfidenceInput, level: MatterConfidenceLevel): SourceStateKind[] {
  const badges: SourceStateKind[] = [];
  if (level === "blocked") {
    badges.push("not_safely_confirmed", "needs_review");
    return badges;
  }
  badges.push("provisional");
  if (input.bundleHealth === "thin" || (input.missingMaterialCount ?? 0) > 0) {
    badges.push("missing");
  }
  if ((input.missingMaterialCount ?? 0) > 0) {
    badges.push("referred_only");
  }
  if (level === "needs_review") {
    badges.push("needs_review");
  }
  if (input.documentCount >= 1 && input.bundleHealth === "ready") {
    badges.push("served");
  }
  return [...new Set(badges)];
}

/** Priority for visible matter-header badges (max 3). Matter status badge is separate. */
const BADGE_DISPLAY_PRIORITY: SourceStateKind[] = [
  "not_safely_confirmed",
  "needs_review",
  "missing",
  "referred_only",
  "provisional",
  "served",
];

export function prioritizeSourceBadges(
  all: SourceStateKind[],
  maxVisible = 4,
): { visible: SourceStateKind[]; overflow: SourceStateKind[] } {
  const unique = [...new Set(all)];
  const ordered = BADGE_DISPLAY_PRIORITY.filter((b) => unique.includes(b));
  for (const b of unique) {
    if (!ordered.includes(b)) ordered.push(b);
  }
  return {
    visible: ordered.slice(0, maxVisible),
    overflow: ordered.slice(maxVisible),
  };
}

export function buildMatterConfidence(input: MatterConfidenceInput): MatterConfidenceResult {
  const level = deriveLevel(input);
  const tab = tabReadiness(level);

  const mainIssue =
    level === "blocked"
      ? "No usable prosecution papers on file yet."
      : (input.missingMaterialCount ?? 0) >= 2
        ? "Disclosure completeness and outstanding source material."
        : input.genericProvisional
          ? "Offence/profile provisional — chase disclosure before fixing position."
          : "Source truth and safe provisional positioning.";

  const nextBestAction =
    level === "blocked"
      ? "Upload served prosecution papers before using Today, Chase, or Summary."
      : (input.missingMaterialCount ?? 0) >= 1
        ? "Chase outstanding disclosure and record provisional hearing position."
        : "Review served papers and confirm client instructions before court.";

  const doNotRelyYetReason =
    level === "blocked"
      ? "No bundle text or documents on file."
      : level === "needs_review"
        ? "Human review or material gaps flagged on current papers."
        : level === "provisional"
          ? "Position remains provisional until served source material is complete."
          : null;

  const sourceBadges = buildSourceBadges(input, level);
  const { visible: sourceBadgesVisible, overflow: sourceBadgesOverflow } =
    prioritizeSourceBadges(sourceBadges);

  return {
    level,
    label: labelForLevel(level),
    mainIssue,
    evidenceCoverage: evidenceCoverage(input, level),
    nextBestAction,
    doNotRelyYetReason,
    safeCourtLineStatus: safeCourtLineStatus(input, level),
    chaseSendability: sendabilityForTab(level, "chase"),
    summarySendability: sendabilityForTab(level, "summary"),
    ...tab,
    safeCourtLineAvailable: level !== "blocked" && Boolean(input.hasSafeCourtLine),
    sourceBadges,
    sourceBadgesVisible,
    sourceBadgesOverflow,
  };
}
