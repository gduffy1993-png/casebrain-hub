/**
 * Safe promotion: PRACTITIONER_CONSIDERATION → SOURCE_FACT / SAFE_DERIVATION
 * only when the papers themselves support the factual claim.
 *
 * The source causes promotion — never the playbook alone.
 */

import type { SafePromotionRequest, SafePromotionResult } from "./types";

function n(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const FAMILY_PATTERNS: Array<{
  family: string;
  outstandingRe: RegExp;
  servedRe: RegExp;
  mentionRe: RegExp;
}> = [
  {
    family: "bwv",
    outstandingRe: /\bbwv\b.{0,40}(outstanding|not served|missing|awaited)/i,
    servedRe: /\bbwv\b.{0,40}(served|on file|provided)/i,
    mentionRe: /\bbwv\b|body[-\s]?worn/i,
  },
  {
    family: "999",
    outstandingRe: /\b999\b.{0,40}(outstanding|not served|missing|awaited|audio)/i,
    servedRe: /\b999\b.{0,40}(served|on file|provided)/i,
    mentionRe: /\b999\b/,
  },
  {
    family: "medical",
    outstandingRe: /\b(medical|injury report)\b.{0,40}(outstanding|not served|missing|awaited)/i,
    servedRe: /\b(medical|injury report)\b.{0,40}(served|on file|provided)/i,
    mentionRe: /\bmedical\b|\binjury\b/,
  },
  {
    family: "cctv_master",
    outstandingRe: /\bcctv\b.{0,60}(master|full|export).{0,40}(outstanding|not served|missing|awaited)/i,
    servedRe: /\bcctv\b.{0,60}(master|full|export).{0,40}(served|on file)/i,
    mentionRe: /\bcctv\b/,
  },
  {
    family: "interview_transcript",
    outstandingRe: /\b(interview|transcript)\b.{0,40}(outstanding|not served|missing|awaited)/i,
    servedRe: /\b(interview transcript|full transcript)\b.{0,40}(served|on file)/i,
    mentionRe: /\binterview\b|\btranscript\b/,
  },
];

/**
 * Attempt promotion of an advisory consideration into factual language.
 * Returns promoted:false unless source text explicitly supports the claim.
 */
export function attemptSafePromotion(req: SafePromotionRequest): SafePromotionResult {
  const source = n(req.sourceText);
  const label = n(req.proposedFactLabel);

  if (!source.trim()) {
    return {
      promoted: false,
      supportClass: "PRACTITIONER_CONSIDERATION",
      reason: "No source text supplied — playbook alone cannot promote.",
    };
  }

  for (const pat of FAMILY_PATTERNS) {
    const labelHitsFamily =
      label.includes(pat.family.replace("_", " ")) ||
      (pat.family === "bwv" && /\bbwv\b|body/.test(label)) ||
      (pat.family === "cctv_master" && /\bcctv\b/.test(label)) ||
      (pat.family === "interview_transcript" && /\binterview|transcript\b/.test(label)) ||
      (pat.family === "999" && /\b999\b/.test(label)) ||
      (pat.family === "medical" && /\bmedical|injury\b/.test(label));

    if (!labelHitsFamily) continue;

    if (/\boutstanding|missing|not served|awaited\b/.test(label) && pat.outstandingRe.test(req.sourceText)) {
      return {
        promoted: true,
        supportClass: "SOURCE_FACT",
        reason: `Source explicitly supports outstanding/missing language for ${pat.family}.`,
      };
    }
    if (/\bserved|on file\b/.test(label) && pat.servedRe.test(req.sourceText)) {
      return {
        promoted: true,
        supportClass: "SOURCE_FACT",
        reason: `Source explicitly supports served language for ${pat.family}.`,
      };
    }
    if (pat.mentionRe.test(req.sourceText) && /\bcheck|confirm|consider|status\b/.test(label)) {
      return {
        promoted: true,
        supportClass: "SAFE_DERIVATION",
        reason: `Source mentions ${pat.family}; status-check language is a safe derivation, not an invented outstanding counter.`,
      };
    }

    return {
      promoted: false,
      supportClass: "PRACTITIONER_CONSIDERATION",
      reason: `Source does not explicitly establish the proposed ${pat.family} fact — remain advisory.`,
    };
  }

  return {
    promoted: false,
    supportClass: "PRACTITIONER_CONSIDERATION",
    reason: "No matching source-backed family pattern for promotion.",
  };
}

/**
 * Hard rule: offence type / playbook keys alone never promote evidence facts.
 */
export function offenceTypeCannotCreateEvidenceTruth(
  offenceType: string,
  proposedEvidenceFact: string,
): boolean {
  const o = n(offenceType);
  const f = n(proposedEvidenceFact);
  if (!o || !f) return true;
  // If the "source" is only the offence label, promotion is forbidden.
  const offenceOnly = o === f || f.includes(o) || o.includes("affray") || o.includes("assault");
  return offenceOnly;
}
