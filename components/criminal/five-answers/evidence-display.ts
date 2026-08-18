import type { EvidenceExistence } from "@/lib/criminal/five-answers/types";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import { sanitizeSolicitorVisibleText } from "@/lib/criminal/overview-presentation";

const KNOWN_EVIDENCE_FAMILY_RE =
  /mg6|unused schedule|schedule clarification|screenshot|message pack|whatsapp|sms|subscriber|attribution|\bsim\b|bwv|body\s*worn|bodycam|body-worn|custody|pace|detention|interview|recording|phone|mobile|download|digital|extraction|cctv|stills|camera|footage|master export/i;

function isMissingLike(existence: EvidenceExistence): boolean {
  return existence === "missing" || existence === "referred_only";
}

function isCheckBeforeReliance(existence: EvidenceExistence, hay: string): boolean {
  return (
    existence === "served" ||
    existence === "incomplete" ||
    existence === "not_safely_confirmed" ||
    /\b(?:served|on file|on papers|recorded as given)\b/i.test(hay)
  );
}

/**
 * OCR / pack-table mash that must not appear as solicitor-facing evidence labels.
 * Presentation only — does not change classification.
 */
export function isUnusableEvidenceDisplayLabel(label: string): boolean {
  const t = (label ?? "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 4) return true;
  if (/\bcontinuation\s*\d+/i.test(t) || /continuation\d+/i.test(t)) return true;
  if (/IssueCurrent|StatusCurrent|BundleStatus|FieldEntry|Issue\s*Current/i.test(t)) return true;
  if (/[a-z]\d{1,3}[A-Z]|[a-z]{3,}\d{2,}[A-Za-z]/i.test(t)) return true;
  if (/\b(?:page|note|list|tab|item)\s*\d{1,3}[A-Za-z]/i.test(t)) return true;
  if (/\bThe bundle is\b/i.test(t) && /continuation|disclosure note|IssueCurrent/i.test(t)) return true;
  if (/^do\s+not\s+(?:treat|say|state|rely)\b/i.test(t)) return true;
  // Truncated mid-clause fragments (e.g. "disclosure position before it is treated as")
  if (
    /\b(?:before|after|when|while|until|unless)\s+(?:it|they|this|that|he|she)\s+is\s+\w+\s+as\b/i.test(t) ||
    /\b(?:treated|regarded|taken)\s+as\s*$/i.test(t) ||
    /\b(?:position|note|status)\s+before\s+it\s+is\b/i.test(t) ||
    /\bposition\s+is\s+reserved\b/i.test(t) ||
    /\b(?:is|are|was|were|be|being|been|remains?|remain|appears?|appear|treated|regarded)\s*$/i.test(t)
  ) {
    return true;
  }
  if (/\b(?:as|the|a|an|of|to|for|and|or|with|without|before|after|when)\s*$/i.test(t)) return true;
  if (/^(?:against|compared with|compared to|before|after|pending)\b/i.test(t)) return true;
  if (/[.;:]\s*[—–-]\s*check\b/i.test(t)) return true;
  if (/\b[A-Za-z]+(?:Summary|Recorded|Current|Status|State)[A-Za-z]*\b/.test(t)) return true;
  const digits = (t.match(/\d/g) || []).length;
  if (digits >= 4 && t.length < 90 && !KNOWN_EVIDENCE_FAMILY_RE.test(t)) return true;
  return false;
}

/** UI-only human labels for evidence rows — does not change classification. */
export function humanizeEvidenceLabel(label: string, existence: EvidenceExistence): string {
  const raw = (label ?? "").trim();
  if (!raw) return "";
  const hay = raw.toLowerCase();
  const soup = isUnusableEvidenceDisplayLabel(raw);

  if (/mg6|unused schedule|schedule clarification/i.test(hay)) {
    if (isMissingLike(existence)) {
      return "MG6 unused material — outstanding disclosure";
    }
    return "MG6 disclosure schedule appears on file";
  }

  if (/screenshot|message pack|whatsapp|sms/i.test(hay)) {
    if (existence === "served") return "Screenshot / message pack served";
    if (isMissingLike(existence)) {
      return "Screenshot / message pack outstanding";
    }
    if (isCheckBeforeReliance(existence, hay)) return "Screenshot / message pack needs checking";
  }

  if (/subscriber|attribution|sim\b/i.test(hay)) {
    if (isMissingLike(existence)) return "Subscriber / attribution data outstanding";
    if (isCheckBeforeReliance(existence, hay)) return "Subscriber / attribution data needs checking";
  }

  if (/bwv|body\s*worn|bodycam|body-worn/i.test(hay)) {
    if (existence === "referred_only") return "BWV referred to, not served";
    if (existence === "missing") return "BWV outstanding";
    if (isCheckBeforeReliance(existence, hay)) return "BWV served";
    return "BWV needs checking";
  }

  if (/custody|pace|detention|rights and entitlements/i.test(hay)) {
    if (/extract|partial|mg11|schedule/i.test(hay) || existence === "referred_only") {
      return "Custody record extract only";
    }
    if (isMissingLike(existence)) return "Custody / PACE record outstanding";
    if (isCheckBeforeReliance(existence, hay)) return "Custody / PACE record on file";
  }

  if (/interview|recording/i.test(hay)) {
    if (isMissingLike(existence)) return "Interview recording outstanding";
    if (isCheckBeforeReliance(existence, hay)) return "Interview material on file";
  }

  if (/phone|mobile|download|digital|extraction/i.test(hay)) {
    if (/summary only|extraction summary|summary on file/i.test(hay)) {
      if (existence === "referred_only" || existence === "served") {
        return "Phone extraction summary only on file";
      }
    }
    if (existence === "served") return "Phone extraction summary on file";
    if (isMissingLike(existence)) {
      return "Full phone download outstanding";
    }
    if (isCheckBeforeReliance(existence, hay)) return "Phone / digital material needs checking";
  }

  if (/cctv|stills|camera|footage|master export/i.test(hay)) {
    if (/stills/i.test(hay) && isMissingLike(existence)) {
      return "CCTV stills without master export log";
    }
    if (existence === "referred_only") return "CCTV referred to, not served";
    if (existence === "missing") return "CCTV outstanding";
    if (existence === "served") return "CCTV served";
    if (isCheckBeforeReliance(existence, hay)) return "CCTV material needs checking";
  }

  // Known family keywords did not map — refuse OCR mash rather than showing glued pack text.
  if (soup) return "";

  const stripped = raw
    .replace(/\s*[—–-]\s*MG6[^\s]*/gi, "")
    .replace(/^MG6C?\/[A-Z0-9]+\s*[—–-]?\s*/i, "")
    .replace(/\bunused schedule clarification\b/gi, "unused material outstanding")
    .replace(/\bmg6\s*\/\s*unused schedule clarification\b/gi, "MG6 unused material outstanding")
    .trim();

  const out = stripped.length > 8 ? stripped : raw;
  return isUnusableEvidenceDisplayLabel(out) ? "" : out;
}

export function sanitizeProofLine(line: string): string {
  return sanitizeSolicitorVisibleText(
    line
      .replace(/^Unknown\s*[—–-]\s*/i, "")
      .replace(/\bsolicitor review required\b/gi, "")
      .replace(/\bdo not say\b/gi, "Do not overstate:")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

export type GotRightPreviewItem = {
  label: string;
  detail: string;
  priority: number;
};

/** Positive findings supported by papers for proof preview — presentation only. */
export function buildGotRightPreviewItems(rows: { label: string; existence: EvidenceExistence }[]): GotRightPreviewItem[] {
  const items: GotRightPreviewItem[] = [];
  const seen = new Set<string>();
  const hasFullDownloadMissing = rows.some(
    (r) => /full phone download/i.test(r.label) && r.existence === "missing",
  );

  for (const row of rows) {
    if (/statement of offence|charge sheet/i.test(row.label)) continue;
    if (
      row.existence === "referred_only" &&
      /phone extraction summary|summary only/i.test(row.label) &&
      hasFullDownloadMissing
    ) {
      continue;
    }

    const label = humanizeEvidenceLabel(row.label, row.existence);
    if (!label) continue;
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);

    if (row.existence === "served") {
      items.push({ label, detail: "Served on file", priority: 0 });
    } else if (["referred_only", "missing", "not_safely_confirmed", "unknown"].includes(row.existence)) {
      items.push({
        label,
        detail: `Correctly flagged — ${displayExistenceLabel(row.existence).toLowerCase()}`,
        priority: row.existence === "referred_only" ? 1 : 2,
      });
    }
  }
  return items.sort((a, b) => a.priority - b.priority).slice(0, 4);
}
