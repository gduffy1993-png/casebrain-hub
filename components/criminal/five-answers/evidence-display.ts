import type { EvidenceExistence } from "@/lib/criminal/five-answers/types";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";

/** UI-only human labels for evidence rows — does not change classification. */
export function humanizeEvidenceLabel(label: string, existence: EvidenceExistence): string {
  const hay = `${label}`.toLowerCase();

  if (/mg6|unused schedule|schedule clarification/i.test(hay)) {
    if (existence === "missing" || existence === "referred_only") {
      return "MG6 unused material — outstanding disclosure";
    }
    return "MG6 disclosure schedule on file";
  }

  if (/screenshot|message pack|whatsapp|sms/i.test(hay)) {
    if (existence === "served") return "Screenshot / message pack served";
    if (existence === "missing" || existence === "referred_only") {
      return "Screenshot / message pack outstanding";
    }
  }

  if (/subscriber|attribution|sim\b/i.test(hay) && (existence === "missing" || existence === "referred_only")) {
    return "Subscriber / attribution data outstanding";
  }

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
    if (/summary only|extraction summary|summary on file/i.test(hay)) {
      if (existence === "referred_only" || existence === "served") {
        return "Phone extraction summary only on file";
      }
    }
    if (existence === "served") return "Phone extraction summary on file";
    if (existence === "missing" || existence === "referred_only") {
      return "Full phone download outstanding";
    }
  }

  if (/cctv|stills|camera|footage|master export/i.test(hay)) {
    if (/stills/i.test(hay) && (existence === "missing" || existence === "referred_only")) {
      return "CCTV stills without master export log";
    }
    if (existence === "referred_only") return "CCTV referred to, not served";
    if (existence === "missing") return "CCTV outstanding";
    if (existence === "served") return "CCTV served";
  }

  const stripped = label
    .replace(/\s*[—–-]\s*MG6[^\s]*/gi, "")
    .replace(/^MG6C?\/[A-Z0-9]+\s*[—–-]?\s*/i, "")
    .replace(/\bunused schedule clarification\b/gi, "unused material outstanding")
    .replace(/\bmg6\s*\/\s*unused schedule clarification\b/gi, "MG6 unused material outstanding")
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

export type GotRightPreviewItem = {
  label: string;
  detail: string;
  priority: number;
};

/** Positive source-backed findings for proof preview — presentation only. */
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
