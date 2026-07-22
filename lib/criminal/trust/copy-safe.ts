import type { SendabilityLevel, SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import {
  applyIntegrityToCopyGate,
  evaluateSentenceIntegrityOnly,
  evaluateTextIntegrity,
  type SolicitorIntegrityResult,
} from "@/lib/criminal/solicitor-output-integrity";

export type CopyKind = "cps_chase" | "court_line" | "client_summary";

export type CopySafeInput = {
  text: string;
  kind: CopyKind;
  sourceState: SourceStateKind | null;
  sourceLabel?: string | null;
  matterLevel?: SendabilityLevel;
  /** Optional precomputed integrity; otherwise text is assessed against allegation/hay. */
  integrity?: SolicitorIntegrityResult | null;
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
};

export type CopySafeResult = {
  sendability: SendabilityLevel;
  sendabilityLabel: string;
  canCopy: boolean;
  footer: string;
  textForClipboard: string;
  blockedReason: string | null;
};

const SENDABILITY_LABELS: Record<SendabilityLevel, string> = {
  safe_to_send: "Safe to send",
  needs_solicitor_review: "Needs solicitor review",
  blocked: "Blocked — source state unclear",
  provisional_check_source: "Provisional — check source before sending",
};

function sendabilityFromSourceState(sourceState: SourceStateKind | null): SendabilityLevel {
  if (!sourceState) {
    return "blocked";
  }
  switch (sourceState) {
    case "served":
      return "needs_solicitor_review";
    case "referred_only":
    case "missing":
    case "not_safely_confirmed":
    case "needs_review":
      return "provisional_check_source";
    case "provisional":
      return "provisional_check_source";
    default:
      return "blocked";
  }
}

function courtLineInCpsChase(text: string, kind: CopyKind): boolean {
  if (kind !== "cps_chase") return false;
  return /\bask the court to record\b/i.test(text);
}

function buildFooter(kind: CopyKind, sourceState: SourceStateKind | null, sourceLabel?: string | null): string {
  const state = sourceState ? sourceState.replace(/_/g, " ") : "not confirmed";
  const src = sourceLabel?.trim() ? ` Source: ${sourceLabel.trim()}.` : "";
  if (kind === "cps_chase") {
    return `[CaseBrain — CPS chase copy. Evidence state: ${state}.${src} Solicitor review required before sending.]`;
  }
  if (kind === "court_line") {
    return `[CaseBrain — court line copy. Evidence state: ${state}.${src} Confirm before addressing the court.]`;
  }
  return `[CaseBrain — client-safe summary. Evidence state: ${state}.${src} Not for court or CPS use.]`;
}

/** Infer source state from chase item fields (H3 chunk 1 — heuristic, no Brain change). */
export function inferChaseItemSourceState(input: {
  label: string;
  source: string;
  baseStatus: string;
  evidenceAnchor?: string | null;
}): SourceStateKind {
  const hay = `${input.label} ${input.source} ${input.evidenceAnchor ?? ""}`.toLowerCase();
  if (/\boutstanding|not served|missing|partial|limited on export\b/.test(hay)) {
    return "missing";
  }
  if (/\breferred|mentioned but|not safely|confirm on file\b/.test(hay)) {
    return "referred_only";
  }
  if (input.baseStatus === "received") {
    return "served";
  }
  return "provisional";
}

export function buildCopySafeResult(input: CopySafeInput): CopySafeResult {
  const sendability =
    input.matterLevel && input.matterLevel !== "safe_to_send"
      ? input.matterLevel
      : sendabilityFromSourceState(input.sourceState);

  let blockedReason: string | null = null;
  if (!input.sourceState) {
    blockedReason = "Source state not shown for this line.";
  }
  if (courtLineInCpsChase(input.text, input.kind)) {
    blockedReason = "Court wording must not appear in CPS chase copy.";
  }

  const effectiveSendability: SendabilityLevel = blockedReason ? "blocked" : sendability;
  let canCopy = effectiveSendability !== "blocked";
  let reason = blockedReason;

  const integrity =
    input.integrity ??
    (input.allegation || input.bundleHay || input.chargeWording
      ? evaluateTextIntegrity({
          text: input.text,
          allegation: input.allegation,
          bundleHay: input.bundleHay,
          chargeWording: input.chargeWording,
        })
      : evaluateSentenceIntegrityOnly(input.text));
  const gated = applyIntegrityToCopyGate(canCopy, reason, integrity);
  canCopy = gated.canCopy;
  reason = gated.blockedReason;
  const finalSendability: SendabilityLevel = !canCopy ? "blocked" : effectiveSendability;

  const footer = buildFooter(input.kind, input.sourceState, input.sourceLabel);
  const body = input.text.trim();
  const textForClipboard = canCopy ? `${body}\n\n${footer}` : body;

  return {
    sendability: finalSendability,
    sendabilityLabel: SENDABILITY_LABELS[finalSendability],
    canCopy,
    footer,
    textForClipboard,
    blockedReason: reason,
  };
}
