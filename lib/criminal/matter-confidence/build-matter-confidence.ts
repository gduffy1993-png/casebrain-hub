import type {
  MatterConfidenceInput,
  MatterConfidenceLevel,
  MatterConfidenceResult,
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
  // Matter-level SAFE is rare — still requires solicitor review before court.
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

  return {
    level,
    label: labelForLevel(level),
    mainIssue,
    nextBestAction,
    doNotRelyYetReason,
    ...tab,
    safeCourtLineAvailable: level !== "blocked",
    sourceBadges: buildSourceBadges(input, level),
  };
}
