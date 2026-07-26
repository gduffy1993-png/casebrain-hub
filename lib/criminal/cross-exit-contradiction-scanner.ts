/**
 * Cross-exit contradiction scanner.
 *
 * Every solicitor-facing exit (Control Room, War Room, Disclosure Chase, Strategy,
 * copy, export, API, PDF, composed prose) must be a view of one canonical state. This
 * scanner fails when an exit materially contradicts that state or another exit:
 * - asserting material is served when canonical state says missing/incomplete;
 * - chasing material canonical state says is already served under a supported alias;
 * - using medical evidence to establish identification or intent;
 * - recommending action the canonical evidence state does not support;
 * - dropping a limitation (CCTV visibility, clock discrepancy) that must survive;
 * - disagreeing about the hearing lifecycle;
 * - rendering an impossible page reference.
 */

import { containsSyntheticPageReference } from "@/lib/criminal/finding-provenance";
import {
  canonicalStateForLabel,
  type CanonicalEvidenceState,
} from "@/lib/criminal/evidence-state-canonical";

export type ExitName =
  | "control_room"
  | "war_room"
  | "disclosure_chase"
  | "strategy"
  | "key_facts"
  | "truth_map"
  | "export"
  | "copy"
  | "api"
  | "pdf"
  | "composed_prose";

export type ExitSnapshot = {
  exit: ExitName;
  /** Solicitor-visible prose produced by this exit. */
  texts: string[];
  /** Limitations this exit carries alongside its prose. */
  limitations?: string[];
  hearing?: { status: string | null; dateIso: string | null } | null;
};

export type CrossExitCanonicalContext = {
  evidence: CanonicalEvidenceState;
  /** Limitations that must appear on every exit that is allowed to speak at all. */
  requiredLimitations: string[];
  /** Canonical support for high-consequence assertions. */
  support: {
    identification: boolean;
    intent: boolean;
    pleaAdvice: boolean;
    medicalInjury: boolean;
  };
  hearing?: { status: string | null; dateIso: string | null } | null;
};

export type CrossExitContradiction = {
  code:
    | "served_state_contradicted"
    | "missing_state_contradicted"
    | "alias_rechased"
    | "medical_overreach"
    | "unsupported_recommendation"
    | "limitation_dropped"
    | "hearing_lifecycle_disagreement"
    | "synthetic_page_reference";
  exit: ExitName;
  /** The other exit involved, for disagreements between exits. */
  otherExit?: ExitName;
  subject: string;
  detail: string;
  excerpt: string | null;
};

export type CrossExitScanResult = {
  ok: boolean;
  contradictions: CrossExitContradiction[];
};

const SERVED_ASSERTION =
  /\b(?:has been served|is served|already served|now served|is on file|has been provided|has been disclosed|is available|is complete)\b/i;
const MISSING_ASSERTION =
  /\b(?:is missing|not served|has not been served|remains outstanding|is outstanding|is absent|not provided)\b/i;
const REQUEST_ASSERTION =
  /\b(?:please (?:provide|serve|disclose)|we request|request(?:ing)? (?:service|disclosure) of|chase|outstanding request)\b/i;

const MEDICAL_TO_IDENTIFICATION =
  /\bmedical\b[^.]{0,120}?\b(identif\w+|who\s+(?:the\s+)?(?:assailant|attacker|suspect)|confirms?\s+the\s+defendant)\b/i;
const MEDICAL_TO_INTENT = /\bmedical\b[^.]{0,120}?\bintent\w*\b/i;
const IDENTIFICATION_TO_MEDICAL =
  /\bidentif\w+[^.]{0,120}?\b(?:supported|established|proved|confirmed)\s+by\s+(?:the\s+)?medical\b/i;
const INTENT_TO_MEDICAL =
  /\bintent\w*[^.]{0,120}?\b(?:supported|established|proved|confirmed)\s+by\s+(?:the\s+)?medical\b/i;

const STRONG_IDENTIFICATION =
  /\bidentification\b[^.]{0,60}?\b(?:is|remains|appears)\s+(?:strong|compelling|robust|reliable|sound)\b/i;
const STRONG_INTENT = /\bintent\w*\b[^.]{0,60}?\b(?:is|remains)\s+(?:clear|established|proved|strong)\b/i;
const PLEA_ACTION =
  /\b(?:advise|recommend|suggest|consider)\b[^.]{0,80}?\b(?:guilty plea|plea of guilty|entering a plea|plea action|basis of plea)\b/i;

function excerptFor(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index == null) return text.slice(0, 160);
  const start = Math.max(0, m.index - 40);
  return text.slice(start, Math.min(text.length, m.index + m[0].length + 60)).trim();
}

function mentionsLabel(text: string, label: string): boolean {
  const tokens = label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4);
  if (!tokens.length) return text.toLowerCase().includes(label.toLowerCase());
  // Require the distinctive tokens so "recording" alone cannot match "CCTV recording".
  return tokens.every((t) => text.toLowerCase().includes(t));
}

function normaliseLimitation(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function scanCrossExitConsistency(
  exits: ExitSnapshot[],
  context: CrossExitCanonicalContext,
): CrossExitScanResult {
  const contradictions: CrossExitContradiction[] = [];

  for (const exit of exits) {
    for (const text of exit.texts) {
      if (!text?.trim()) continue;

      if (containsSyntheticPageReference(text)) {
        contradictions.push({
          code: "synthetic_page_reference",
          exit: exit.exit,
          subject: "page reference",
          detail: "Exit renders a page reference that cannot exist",
          excerpt: text.slice(0, 160),
        });
      }

      for (const item of context.evidence.items) {
        if (!mentionsLabel(text, item.label)) continue;

        if (
          (item.state === "missing" || item.state === "incomplete") &&
          SERVED_ASSERTION.test(text)
        ) {
          contradictions.push({
            code: "served_state_contradicted",
            exit: exit.exit,
            subject: item.label,
            detail: `Canonical state is ${item.state.replace(/_/g, " ")} but this exit asserts the material is served or complete`,
            excerpt: excerptFor(text, SERVED_ASSERTION),
          });
        }

        if (item.state === "served" && MISSING_ASSERTION.test(text)) {
          contradictions.push({
            code: "missing_state_contradicted",
            exit: exit.exit,
            subject: item.label,
            detail: "Canonical state is served but this exit asserts the material is missing",
            excerpt: excerptFor(text, MISSING_ASSERTION),
          });
        }

        if (item.state === "served" && REQUEST_ASSERTION.test(text)) {
          contradictions.push({
            code: "alias_rechased",
            exit: exit.exit,
            subject: item.label,
            detail: "Material already on file under a supported alias is being requested again",
            excerpt: excerptFor(text, REQUEST_ASSERTION),
          });
        }
      }

      if (
        MEDICAL_TO_IDENTIFICATION.test(text) ||
        IDENTIFICATION_TO_MEDICAL.test(text)
      ) {
        contradictions.push({
          code: "medical_overreach",
          exit: exit.exit,
          subject: "identification",
          detail: "Medical evidence is used to support identification",
          excerpt: excerptFor(
            text,
            MEDICAL_TO_IDENTIFICATION.test(text) ? MEDICAL_TO_IDENTIFICATION : IDENTIFICATION_TO_MEDICAL,
          ),
        });
      }
      if (MEDICAL_TO_INTENT.test(text) || INTENT_TO_MEDICAL.test(text)) {
        contradictions.push({
          code: "medical_overreach",
          exit: exit.exit,
          subject: "intent",
          detail: "Medical evidence is used to support intent",
          excerpt: excerptFor(text, MEDICAL_TO_INTENT.test(text) ? MEDICAL_TO_INTENT : INTENT_TO_MEDICAL),
        });
      }

      if (STRONG_IDENTIFICATION.test(text) && !context.support.identification) {
        contradictions.push({
          code: "unsupported_recommendation",
          exit: exit.exit,
          subject: "identification",
          detail: "Identification is called strong without canonical support",
          excerpt: excerptFor(text, STRONG_IDENTIFICATION),
        });
      }
      if (STRONG_INTENT.test(text) && !context.support.intent) {
        contradictions.push({
          code: "unsupported_recommendation",
          exit: exit.exit,
          subject: "intent",
          detail: "Intent is called established without canonical support",
          excerpt: excerptFor(text, STRONG_INTENT),
        });
      }
      if (PLEA_ACTION.test(text) && !context.support.pleaAdvice) {
        contradictions.push({
          code: "unsupported_recommendation",
          exit: exit.exit,
          subject: "plea",
          detail: "Plea action is suggested without canonical support",
          excerpt: excerptFor(text, PLEA_ACTION),
        });
      }
    }

    const carried = (exit.limitations ?? []).map(normaliseLimitation);
    for (const required of context.requiredLimitations) {
      const needle = normaliseLimitation(required);
      if (!needle) continue;
      const present =
        carried.some((c) => c.includes(needle) || needle.includes(c)) ||
        exit.texts.some((t) => normaliseLimitation(t).includes(needle));
      if (!present) {
        contradictions.push({
          code: "limitation_dropped",
          exit: exit.exit,
          subject: required.slice(0, 60),
          detail: "A limitation that must survive every exit is absent from this exit",
          excerpt: null,
        });
      }
    }
  }

  contradictions.push(...scanHearingLifecycle(exits, context));

  return { ok: contradictions.length === 0, contradictions };
}

function scanHearingLifecycle(
  exits: ExitSnapshot[],
  context: CrossExitCanonicalContext,
): CrossExitContradiction[] {
  const stated = exits.filter((e) => e.hearing);
  if (stated.length < 1) return [];

  const out: CrossExitContradiction[] = [];
  const reference = context.hearing ?? stated[0]!.hearing!;
  const referenceExit = context.hearing ? null : stated[0]!.exit;

  for (const exit of stated) {
    const h = exit.hearing!;
    const statusDiffers =
      (h.status ?? null) !== (reference.status ?? null) &&
      Boolean(h.status) &&
      Boolean(reference.status);
    const dateDiffers =
      (h.dateIso ?? null) !== (reference.dateIso ?? null) &&
      Boolean(h.dateIso) &&
      Boolean(reference.dateIso);
    if (!statusDiffers && !dateDiffers) continue;
    out.push({
      code: "hearing_lifecycle_disagreement",
      exit: exit.exit,
      ...(referenceExit ? { otherExit: referenceExit } : {}),
      subject: "hearing",
      detail: `Hearing lifecycle disagrees with canonical state (${h.status ?? "no status"} / ${h.dateIso ?? "no date"} vs ${reference.status ?? "no status"} / ${reference.dateIso ?? "no date"})`,
      excerpt: null,
    });
  }
  return out;
}

/** Convenience assertion used by contracts and by production guards. */
export function assertNoCrossExitContradictions(
  exits: ExitSnapshot[],
  context: CrossExitCanonicalContext,
): CrossExitScanResult {
  const result = scanCrossExitConsistency(exits, context);
  return result;
}
