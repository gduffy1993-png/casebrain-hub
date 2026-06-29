import { labelMatchScore, normalizeLabel } from "./normalize";
import type { TruthKeyEvidenceItem } from "./types";

const GENERIC_LABEL_PATTERNS = [
  /^interview recording(?:\s*\/\s*transcript)?$/i,
  /^interview transcript$/i,
  /^body[- ]worn video(?:\s*\(bwv\))?$/i,
  /^cctv(?:\s+full window)?(?:\s*\/\s*master footage)?$/i,
];

export function isGenericEvidenceLabel(label: string): boolean {
  const trimmed = label.trim();
  if (GENERIC_LABEL_PATTERNS.some((re) => re.test(trimmed))) return true;
  const n = normalizeLabel(trimmed);
  return (
    n === "interview recording transcript" ||
    n === "interview recording" ||
    n === "body worn video bwv" ||
    n === "body worn video"
  );
}

export function truthItemIsCoDefendantOnly(item: TruthKeyEvidenceItem): boolean {
  if (item.correct_evidence_state !== "other_defendant_only") return false;
  const rel = (item.defendant_relevance ?? "").toLowerCase();
  if (rel.includes("co_defendant") || rel.includes("other")) return true;
  const t = item.evidence_item.toLowerCase();
  return t.includes("co-defendant") || t.includes("co defendant") || t.includes("other defendant");
}

export function extractCoDefendantAnchors(truthLabel: string): string[] {
  const anchors: string[] = [];
  const lower = truthLabel.toLowerCase();

  const named = /\bco-?defendant\s+([a-z][a-z'-]+(?:\s+[a-z][a-z'-]+)?)/i.exec(truthLabel);
  if (named?.[1]) anchors.push(normalizeLabel(named[1]));

  if (lower.includes("co-defendant") || lower.includes("co defendant")) anchors.push("co defendant");
  if (lower.includes("other defendant")) anchors.push("other defendant");

  return [...new Set(anchors.filter(Boolean))];
}

export function predictionTouchesCoDefendant(
  truthItem: TruthKeyEvidenceItem,
  predictionLabel: string,
  source?: string | null,
): boolean {
  const blob = normalizeLabel(`${predictionLabel} ${source ?? ""}`);
  if (!blob) return false;

  if (blob.includes("co defendant") || blob.includes("other defendant")) return true;

  for (const anchor of extractCoDefendantAnchors(truthItem.evidence_item)) {
    if (anchor.length >= 4 && blob.includes(anchor)) return true;
  }

  return false;
}

export function defendantRelevanceMatchBonus(
  truthItem: TruthKeyEvidenceItem,
  predictionLabel: string,
  source?: string | null,
): number {
  if (!truthItemIsCoDefendantOnly(truthItem)) {
    if (predictionTouchesCoDefendant(truthItem, predictionLabel, source)) return -0.25;
    return 0;
  }

  if (predictionTouchesCoDefendant(truthItem, predictionLabel, source)) return 0.35;
  if (isGenericEvidenceLabel(predictionLabel)) return -0.4;

  const score = labelMatchScore(truthItem.evidence_item, predictionLabel);
  if (score >= 0.75 && !isGenericEvidenceLabel(predictionLabel)) return 0.1;

  return -0.15;
}

export function isWrongDefendantBleedMatch(
  truthItem: TruthKeyEvidenceItem,
  predictionLabel: string | null,
  source?: string | null,
  matched = false,
): boolean {
  if (!truthItemIsCoDefendantOnly(truthItem)) return false;
  if (!predictionLabel || !matched) return false;

  if (predictionTouchesCoDefendant(truthItem, predictionLabel, source)) return true;
  if (isGenericEvidenceLabel(predictionLabel)) return false;

  return labelMatchScore(truthItem.evidence_item, predictionLabel) >= 0.82;
}
