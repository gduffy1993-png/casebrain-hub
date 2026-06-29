import type { EvidenceExistence, EvidenceReliability } from "./types";
import { evidenceExistenceLabel, evidenceReliabilityLabel } from "./evidence-trace";

/** UI-only label for primary surfaces — does not change underlying existence enum. */
export function displayExistenceLabel(existence: EvidenceExistence): string {
  if (existence === "unknown") return "Not safely confirmed";
  return evidenceExistenceLabel(existence);
}

export function displayRelianceLabel(reliability: EvidenceReliability): string {
  switch (reliability) {
    case "unsafe":
    case "inference_only":
      return "Do not rely yet";
    case "weak":
    case "needs_review":
      return "Check before reliance";
    case "contested":
      return "Contested — review";
    case "strong":
      return "Review before reliance";
    default:
      return evidenceReliabilityLabel(reliability);
  }
}

export function displayTruthMapAction(
  existence: EvidenceExistence,
  reliability: EvidenceReliability,
): string {
  if (existence === "missing" || existence === "referred_only") return "Chase";
  if (existence === "not_safely_confirmed" || existence === "unknown") return "Chase";
  if (reliability === "unsafe" || reliability === "inference_only") return "Chase";
  if (existence === "served" && reliability === "needs_review") return "Check";
  return "Review";
}

/** Strip copy-safe footer from displayed court/CPS text (clipboard keeps full text). */
export function displayCopyBody(text: string, footer?: string | null): string {
  const t = text.trim();
  if (footer?.trim() && t.endsWith(footer.trim())) {
    return t.slice(0, -footer.trim().length).trim();
  }
  const marker = "\n\n[CaseBrain —";
  const idx = t.indexOf(marker);
  if (idx > 0) return t.slice(0, idx).trim();
  return t;
}
