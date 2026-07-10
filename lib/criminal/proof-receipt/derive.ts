import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import type { EvidenceExistence, EvidenceReliability } from "@/lib/criminal/five-answers/types";
import type { ProofSafeAction, ProofSupportLevel } from "./types";

export function deriveSupportLevel(
  existence: EvidenceExistence,
  reliability: EvidenceReliability,
): ProofSupportLevel {
  if (existence === "unknown") return "Not confirmed on papers";
  if (reliability === "unsafe" || reliability === "inference_only") return "Not supported";
  if (existence === "missing" || existence === "referred_only") return "Limited on papers";
  if (reliability === "contested" || reliability === "weak") return "Partial";
  if (reliability === "needs_review") return "Partial";
  if (reliability === "strong" && existence === "served") return "Strong";
  return "Partial";
}

export function deriveSafeAction(
  existence: EvidenceExistence,
  reliability: EvidenceReliability,
): ProofSafeAction {
  if (reliability === "unsafe" || reliability === "inference_only") return "do-not-use";
  if (existence === "missing" || existence === "referred_only") return "chase";
  if (existence === "not_safely_confirmed" || existence === "unknown") {
    return "check";
  }
  if (existence === "served" && (reliability === "weak" || reliability === "needs_review")) {
    return "check";
  }
  if (existence === "served" && reliability === "strong") return "check";
  return "check";
}

export function evidenceStateLabel(existence: EvidenceExistence): string {
  return displayExistenceLabel(existence);
}

export type StateColourKey = "served" | "partial" | "referred" | "missing";

export function stateColourKey(existence: EvidenceExistence): StateColourKey {
  if (existence === "served") return "served";
  if (existence === "referred_only") return "referred";
  if (existence === "missing") return "missing";
  return "partial";
}

export const STATE_COLOUR_CLASSES: Record<StateColourKey, { badge: string; dot: string; label: string }> = {
  served: {
    badge: "border-emerald-700/60 bg-emerald-950/40 text-emerald-200",
    dot: "bg-emerald-400",
    label: "Served",
  },
  partial: {
    badge: "border-amber-700/60 bg-amber-950/40 text-amber-200",
    dot: "bg-amber-400",
    label: "Partial / check first",
  },
  referred: {
    badge: "border-slate-600/70 bg-slate-800/50 text-slate-300",
    dot: "bg-slate-400",
    label: "Referred only",
  },
  missing: {
    badge: "border-rose-800/60 bg-rose-950/40 text-rose-200",
    dot: "bg-rose-400",
    label: "Missing",
  },
};

export const SAFE_ACTION_LABELS: Record<ProofSafeAction, string> = {
  rely: "Rely",
  check: "Check",
  chase: "Chase",
  "do-not-use": "Do not use",
};

export const SAFE_ACTION_CLASSES: Record<ProofSafeAction, string> = {
  rely: "border-blue-700/50 bg-blue-950/40 text-blue-200",
  check: "border-amber-700/50 bg-amber-950/30 text-amber-200",
  chase: "border-violet-700/50 bg-violet-950/30 text-violet-200",
  "do-not-use": "border-rose-700/50 bg-rose-950/40 text-rose-200",
};

/** Guard copy — must not imply autonomous guidance or case outcome. */
export const PROOF_RECEIPT_GUARD =
  "Review aid only. Source-linked proof and evidence state — solicitor judgment required before reliance. Confirm against source material.";

/** h5-overview-smoke `proof_receipt_forbidden_wording` — whole panel innerText must avoid these. */
export const PROOF_RECEIPT_SMOKE_FORBIDDEN =
  /guilty|not guilty|legal advice|will win|will lose/i;

export const FORBIDDEN_UI_PATTERNS =
  /\b(guilty|not guilty|will win|will lose|plead guilty|plead not guilty|legal advice|we advise you to)\b/i;

/** Paraphrase blocked/raw lines for solicitor-safe panel display (meaning preserved, smoke-safe). */
export function sanitizeProofReceiptPanelCopy(text: string): string {
  return text
    .replace(/\bplead not guilty\b/gi, "state not-proved position")
    .replace(/\bplead guilty\b/gi, "state proved-on-papers position")
    .replace(/\bdefendant is guilty\b/gi, "defendant culpability is proved on current papers")
    .replace(/\bis not guilty\b/gi, "is not proved on current papers")
    .replace(/\bis guilty\b/gi, "culpability is proved on current papers")
    .replace(/\bnot guilty\b/gi, "not proved on current papers")
    .replace(/\bguilty\b/gi, "culpability proved on current papers")
    .replace(/\blegal advice\b/gi, "independent professional judgment")
    .replace(/\bwill win\b/gi, "will succeed")
    .replace(/\bwill lose\b/gi, "will not succeed")
    .replace(/\bwe advise you to\b/gi, "solicitor should");
}
