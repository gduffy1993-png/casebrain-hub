/**
 * Negation-aware evidence-family mention detection for legal intelligence.
 *
 * Distinguishes:
 *   - absent: family never mentioned
 *   - negated: papers say the material does not exist ("No BWV. No CCTV.")
 *   - mentioned: existence / referral (may still have a service gap)
 *
 * Invariants (conceptual):
 *   NEGATED_EVIDENCE_MENTION_MUST_NOT_TRIGGER_POSITIVE_FAMILY_CONSIDERATION
 *   NEGATED_SERVICE_STATUS_MUST_NOT_HIDE_EXISTING_EVIDENCE
 */

import {
  familySupport,
  type ChaseGateFamily,
  type FamilySupport,
} from "@/lib/criminal/chase-source-gate";

export type EvidenceMentionStatus = FamilySupport;

/**
 * Strip non-indicating interview phrases before familySupport so
 * "Interview recording not mentioned." does not count as a positive mention.
 */
function scrubNonIndicatingInterviewPhrases(sourceText: string): string {
  return sourceText
    .replace(/\binterview\s+(?:recording\s+)?not\s+mentioned\b/gi, " ")
    .replace(/\bno\s+mention\s+of\s+(?:an?\s+)?interview\b/gi, " ");
}

export function evidenceMentionStatus(
  family: ChaseGateFamily,
  sourceText: string,
): EvidenceMentionStatus {
  const text =
    family === "interview" ? scrubNonIndicatingInterviewPhrases(sourceText) : sourceText;
  return familySupport(family, text);
}

/** True when papers affirmatively engage the family (not absent, not negated). */
export function familyPositivelyMentioned(
  family: ChaseGateFamily,
  sourceText: string,
): boolean {
  return evidenceMentionStatus(family, sourceText) === "mentioned";
}

/**
 * Service-gap language for a positively mentioned family.
 * Must not treat negation ("No CCTV") as a service gap.
 */
export function familyHasServiceIssue(
  family: ChaseGateFamily,
  sourceText: string,
): boolean {
  if (evidenceMentionStatus(family, sourceText) !== "mentioned") return false;
  const hay = sourceText;
  const label =
    family === "cctv"
      ? /cctv|footage|dashcam|camera/i
      : family === "bwv"
        ? /bwv|body[-\s]?worn/i
        : family === "interview"
          ? /interview|roti|rovi|transcript/i
          : null;
  if (!label) return /\b(outstanding|not served|partial|awaited)\b/i.test(hay);
  const lines = hay.split(/\r?\n/);
  return lines.some((line) => {
    if (!label.test(line)) return false;
    if (/\bno\s+(?:cctv|bwv|body[-\s]?worn|footage)\b/i.test(line)) return false;
    if (/\binterview\s+(?:recording\s+)?not\s+mentioned\b/i.test(line)) return false;
    return /\b(outstanding|not served|partial|awaited|continuity)\b/i.test(line);
  });
}
