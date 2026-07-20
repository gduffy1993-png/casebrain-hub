/**
 * Shared solicitor-output integrity gate.
 * Fail closed for copy + deep surfaces when family, sentence, provenance or state checks fail.
 */

import {
  findWrongFamilyTerms,
  resolveSolicitorOffenceFamily,
  type OffenceFamilyResolution,
} from "@/lib/criminal/solicitor-offence-family";
import {
  assessSolicitorSentence,
  type SentenceIntegrityIssue,
} from "@/lib/criminal/solicitor-sentence-composer";
import type { SolicitorMatterStateVm } from "@/lib/criminal/solicitor-matter-state";
import type { SolicitorHearingStatus } from "@/lib/criminal/solicitor-hearing-status";
import type { SendabilityLevel } from "@/lib/criminal/matter-confidence/matter-confidence-types";

export type IntegrityLevel = "ok" | "degraded" | "blocked";

export type SolicitorIntegrityReasonCode =
  | "offence_family_uncertain"
  | "wrong_family_term"
  | "sentence_integrity"
  | "matter_confidence_blocked"
  | "state_inconsistent"
  | "hearing_unknown"
  | "text_empty";

export type SolicitorIntegrityReason = {
  code: SolicitorIntegrityReasonCode;
  detail: string;
};

export type SolicitorIntegrityResult = {
  level: IntegrityLevel;
  reasons: SolicitorIntegrityReason[];
  /** Clipboard / export copy allowed only when true. */
  canCopy: boolean;
  /** Deep drawers / expanded draft tools available only when true. */
  deepDetailAvailable: boolean;
  /** Short solicitor-facing banner. */
  banner: string | null;
  offenceFamily: OffenceFamilyResolution;
};

export type EvaluateTextIntegrityInput = {
  text: string;
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
  /** Pre-resolved family; otherwise derived from hay. */
  offenceFamily?: OffenceFamilyResolution;
};

export type EvaluateMatterIntegrityInput = {
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
  matterLevel?: SendabilityLevel | null;
  sampleTexts?: string[];
  matterState?: SolicitorMatterStateVm | null;
  /** Optional second fingerprint from another surface — must match. */
  alternateStateFingerprint?: string | null;
  hearing?: SolicitorHearingStatus | null;
};

const DEEP_UNAVAILABLE =
  "Deep output unavailable — solicitor review required before expanding copyable drafts.";

const COPY_BLOCKED =
  "Copy disabled — output failed integrity checks (family, sentence, or source state).";

function sentenceIssueDetail(issues: SentenceIntegrityIssue[]): string {
  return `Sentence integrity failed: ${issues.join(", ")}.`;
}

export function evaluateSentenceIntegrityOnly(text: string): SolicitorIntegrityResult {
  const offenceFamily = resolveSolicitorOffenceFamily({});
  const reasons: SolicitorIntegrityReason[] = [];
  const sentence = assessSolicitorSentence(text);
  if (!sentence.ok) {
    reasons.push({
      code: sentence.issues.includes("empty") ? "text_empty" : "sentence_integrity",
      detail: sentenceIssueDetail(sentence.issues),
    });
  }
  // Do not fail-closed on unknown family when no allegation/hay was supplied.
  return finalizeIntegrity(
    reasons,
    { ...offenceFamily, failClosed: false, confidence: "low", reason: "Family not assessed for this line." },
  );
}

export function evaluateTextIntegrity(input: EvaluateTextIntegrityInput): SolicitorIntegrityResult {
  const offenceFamily =
    input.offenceFamily ??
    resolveSolicitorOffenceFamily({
      allegation: input.allegation,
      bundleHay: input.bundleHay,
      chargeWording: input.chargeWording,
    });

  const reasons: SolicitorIntegrityReason[] = [];

  if (offenceFamily.failClosed) {
    reasons.push({
      code: "offence_family_uncertain",
      detail: offenceFamily.reason,
    });
  }

  const sentence = assessSolicitorSentence(input.text);
  if (!sentence.ok) {
    reasons.push({
      code: sentence.issues.includes("empty") ? "text_empty" : "sentence_integrity",
      detail: sentenceIssueDetail(sentence.issues),
    });
  }

  const wrong = findWrongFamilyTerms(input.text, offenceFamily, input.bundleHay ?? "");
  if (wrong.length) {
    reasons.push({
      code: "wrong_family_term",
      detail: `Wrong-family concepts: ${wrong.join(", ")}.`,
    });
  }

  return finalizeIntegrity(reasons, offenceFamily);
}

export function evaluateMatterIntegrity(input: EvaluateMatterIntegrityInput): SolicitorIntegrityResult {
  const offenceFamily = resolveSolicitorOffenceFamily({
    allegation: input.allegation,
    bundleHay: input.bundleHay,
    chargeWording: input.chargeWording,
  });

  const reasons: SolicitorIntegrityReason[] = [];

  if (offenceFamily.failClosed) {
    reasons.push({
      code: "offence_family_uncertain",
      detail: offenceFamily.reason,
    });
  }

  if (input.matterLevel === "blocked") {
    reasons.push({
      code: "matter_confidence_blocked",
      detail: "Matter confidence is blocked — source state unclear.",
    });
  }

  if (
    input.matterState &&
    input.alternateStateFingerprint &&
    input.matterState.fingerprint !== input.alternateStateFingerprint
  ) {
    reasons.push({
      code: "state_inconsistent",
      detail: "Evidence/chase counts disagree across surfaces.",
    });
  }

  if (input.hearing?.kind === "unknown") {
    // Unknown hearing is degraded for deep tools, not always hard-block copy of unrelated text.
    reasons.push({
      code: "hearing_unknown",
      detail: "Hearing status could not be resolved consistently.",
    });
  }

  for (const text of input.sampleTexts ?? []) {
    const textResult = evaluateTextIntegrity({
      text,
      allegation: input.allegation,
      bundleHay: input.bundleHay,
      chargeWording: input.chargeWording,
      offenceFamily,
    });
    for (const r of textResult.reasons) {
      if (!reasons.some((x) => x.code === r.code && x.detail === r.detail)) {
        reasons.push(r);
      }
    }
  }

  return finalizeIntegrity(reasons, offenceFamily);
}

function finalizeIntegrity(
  reasons: SolicitorIntegrityReason[],
  offenceFamily: OffenceFamilyResolution,
): SolicitorIntegrityResult {
  const hard = reasons.filter((r) =>
    [
      "offence_family_uncertain",
      "wrong_family_term",
      "sentence_integrity",
      "matter_confidence_blocked",
      "state_inconsistent",
      "text_empty",
    ].includes(r.code),
  );
  const soft = reasons.filter((r) => r.code === "hearing_unknown");

  let level: IntegrityLevel = "ok";
  if (hard.length) level = "blocked";
  else if (soft.length) level = "degraded";

  // Copy only when hard integrity passes. Soft issues (e.g. hearing unknown) degrade deep tools.
  const canCopy = level !== "blocked";
  const deepDetailAvailable = level === "ok";

  let banner: string | null = null;
  if (level === "blocked") {
    banner = reasons.some((r) => r.code === "offence_family_uncertain")
      ? "Solicitor review required — offence family not safely mapped."
      : COPY_BLOCKED;
  } else if (level === "degraded") {
    banner = DEEP_UNAVAILABLE;
  }

  return {
    level,
    reasons,
    canCopy,
    deepDetailAvailable,
    banner,
    offenceFamily,
  };
}

export const SOLICITOR_DEEP_UNAVAILABLE_MESSAGE = DEEP_UNAVAILABLE;
export const SOLICITOR_COPY_BLOCKED_MESSAGE = COPY_BLOCKED;

/** Apply integrity override onto an existing copy-safe result. */
export function applyIntegrityToCopyGate(
  canCopy: boolean,
  blockedReason: string | null,
  integrity: SolicitorIntegrityResult | null | undefined,
): { canCopy: boolean; blockedReason: string | null } {
  if (!integrity) return { canCopy, blockedReason };
  if (!integrity.canCopy) {
    return {
      canCopy: false,
      blockedReason: integrity.banner ?? blockedReason ?? COPY_BLOCKED,
    };
  }
  return { canCopy, blockedReason };
}
