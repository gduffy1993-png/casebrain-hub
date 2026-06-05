import type { ExplanationConfidenceTag } from "@/lib/eval/casebrain-auditor/explanation-fidelity-types";

export const FORBIDDEN_UI_PHRASES = [
  "this wins",
  "crown collapses",
  "crown cannot prove",
  "proves innocence",
  "guaranteed",
  "case fails",
] as const;

const INTERNAL_LEAK_PATTERNS = [
  /\bpp-[a-z0-9-]+\b/i,
  /artifacts\/[^\s"'<>]+/i,
  /[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json)/i,
  /\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/i,
  /\bproof map\b/i,
  /\beval pack\b/i,
  /\bgold pack\b/i,
  /\bstrategy-fidelity\b/i,
  /\bviolence_gbh\b/i,
  /\bgeneric_provisional\b/i,
  /\bdata-testid\b/i,
] as const;

const INTERNAL_REASON_PREFIXES = [
  "forbidden phrasing",
  "forbidden phrasing detected",
  "forbidden phrasing in battleboard",
  "forbidden phrasing in war room",
] as const;

export function lintReasoningV2PublicText(text: string): string[] {
  const issues: string[] = [];
  const lower = text.toLowerCase();
  for (const phrase of FORBIDDEN_UI_PHRASES) {
    if (lower.includes(phrase)) issues.push(`forbidden phrase: ${phrase}`);
  }
  for (const re of INTERNAL_LEAK_PATTERNS) {
    const m = text.match(re);
    if (m) issues.push(`internal leak: ${m[0]}`);
  }
  return issues;
}

export function sanitizeReasoningPublicText(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  let out = text
    .replace(/\(proof map:\s*[^)]+\)/gi, "")
    .replace(/\bpp-[a-z0-9-]+\b/gi, "")
    .replace(/\b(bundle|pack|corpus|eval|artifact)[-_][a-z0-9-]+\b/gi, "")
    .replace(/\b(violence_gbh|generic_provisional|robbery_id|pwits|motoring)\b/gi, "")
    .replace(/artifacts\/[^\s"'<>]+/gi, "")
    .replace(/[A-Za-z]:\\[^\s"'<>]+\.(pdf|txt|json)/gi, "")
    .replace(/\bproof map\b/gi, "source papers")
    .replace(/\s{2,}/g, " ")
    .trim();

  for (const phrase of FORBIDDEN_UI_PHRASES) {
    if (out.toLowerCase().includes(phrase)) {
      return "Solicitor review required — automated wording check flagged this line.";
    }
  }
  return out;
}

export function sanitizeHumanReviewReason(reason: string): string {
  const lower = reason.trim().toLowerCase();
  if (INTERNAL_REASON_PREFIXES.some((p) => lower.startsWith(p) || lower.includes(p))) {
    return "Automated wording check flagged solicitor review — verify before reliance.";
  }
  return sanitizeReasoningPublicText(reason);
}

export function toProductConfidence(
  tag: ExplanationConfidenceTag,
): "on_papers" | "likely" | "provisional" | "needs_solicitor_review" | "insufficient" {
  switch (tag) {
    case "settled":
      return "on_papers";
    case "likely":
      return "likely";
    case "needs_solicitor_review":
      return "needs_solicitor_review";
    case "not_enough_information":
      return "insufficient";
    default:
      return "provisional";
  }
}

export function confidenceLabel(confidence: ReturnType<typeof toProductConfidence>): string {
  switch (confidence) {
    case "on_papers":
      return "On papers";
    case "likely":
      return "Likely on papers";
    case "needs_solicitor_review":
      return "Solicitor review";
    case "insufficient":
      return "Insufficient on papers";
    default:
      return "Provisional";
  }
}
