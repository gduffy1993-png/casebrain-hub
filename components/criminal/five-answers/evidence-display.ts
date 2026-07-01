import type { EvidenceExistence } from "@/lib/criminal/five-answers/types";

/** UI-only human labels for evidence rows — does not change classification. */
export function humanizeEvidenceLabel(label: string, existence: EvidenceExistence): string {
  const hay = `${label}`.toLowerCase();

  if (/bwv|body\s*worn|bodycam|body-worn/i.test(hay)) {
    if (existence === "referred_only") return "BWV referred to, not served";
    if (existence === "missing") return "BWV outstanding";
    if (existence === "served") return "BWV served";
  }

  if (/custody|pace|detention/i.test(hay)) {
    if (/extract|partial|mg11|schedule/i.test(hay) || existence === "referred_only") {
      return "Custody record extract only";
    }
  }

  if (/interview|recording/i.test(hay) && (existence === "missing" || existence === "referred_only")) {
    return "Interview recording outstanding";
  }

  if (/phone|mobile|download|digital|extraction/i.test(hay)) {
    if (existence === "missing" || existence === "referred_only") {
      return "Full phone download outstanding";
    }
  }

  if (/cctv|camera|footage/i.test(hay)) {
    if (existence === "referred_only") return "CCTV referred to, not served";
    if (existence === "missing") return "CCTV outstanding";
  }

  const stripped = label
    .replace(/\s*[—–-]\s*MG6[^\s]*/gi, "")
    .replace(/^MG6C?\/[A-Z0-9]+\s*[—–-]?\s*/i, "")
    .replace(/\bunused schedule clarification\b/gi, "")
    .trim();

  return stripped.length > 8 ? stripped : label;
}

export function sanitizeProofLine(line: string): string {
  return line
    .replace(/^Unknown\s*[—–-]\s*/i, "")
    .replace(/\bsolicitor review required\b/gi, "")
    .replace(/\bdo not say\b/gi, "Do not overstate:")
    .replace(/\s{2,}/g, " ")
    .trim();
}
