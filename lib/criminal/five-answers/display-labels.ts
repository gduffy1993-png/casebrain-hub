import type { EvidenceExistence, EvidenceReliability } from "./types";
import { evidenceExistenceLabel, evidenceReliabilityLabel } from "./evidence-trace";
import { sanitizeSolicitorVisibleText } from "@/lib/criminal/overview-presentation";
import type { ProofSupportLevel } from "@/lib/criminal/proof-receipt/types";

/** UI-only label for primary surfaces — does not change underlying existence enum. */
export function displayExistenceLabel(existence: EvidenceExistence): string {
  if (existence === "not_safely_confirmed") return "Incomplete";
  if (existence === "unknown") return "Not safely confirmed";
  return sanitizeSolicitorVisibleText(evidenceExistenceLabel(existence));
}

/** Proof receipt support column — solicitor-facing. */
export function displayProofSupportLevel(level: ProofSupportLevel): string {
  return sanitizeSolicitorVisibleText(level);
}

/** Reliability column for truth map / trace — hides dev tokens. */
export function displayReliabilityLabel(reliability: EvidenceReliability): string {
  switch (reliability) {
    case "weak":
      return "Limited on papers";
    case "needs_review":
      return "Solicitor review";
    default:
      return sanitizeSolicitorVisibleText(evidenceReliabilityLabel(reliability));
  }
}

/** Plain “can rely?” column for truth map — presentation only. */
export function displayCanRelyLabel(reliability: EvidenceReliability): string {
  switch (reliability) {
    case "unsafe":
    case "inference_only":
      return "No";
    case "weak":
    case "needs_review":
      return "Check first";
    case "contested":
      return "Contested";
    case "strong":
      return "Review first";
    default:
      return "Check first";
  }
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

export function displayCopyBody(text: string, footer?: string | null): string {
  const t = text.trim();
  let body = t;
  if (footer?.trim() && t.endsWith(footer.trim())) {
    body = t.slice(0, -footer.trim().length).trim();
  } else {
    const marker = "\n\n[CaseBrain —";
    const idx = t.indexOf(marker);
    if (idx > 0) body = t.slice(0, idx).trim();
  }
  return sanitizeSolicitorVisibleText(body);
}
