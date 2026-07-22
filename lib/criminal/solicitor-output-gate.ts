/**
 * Central solicitor-output gate — single fail-closed path for UI + API surfaces.
 * Returns typed integrity_blocked (safe consumer state), never unexplained 500s for integrity.
 */

import { NextResponse } from "next/server";
import {
  evaluateMatterIntegrity,
  evaluateSentenceIntegrityOnly,
  evaluateTextIntegrity,
  type SolicitorIntegrityResult,
} from "@/lib/criminal/solicitor-output-integrity";
import {
  classifyWrongFamilyHits,
  resolveSolicitorOffenceFamily,
  type OffenceFamilyResolution,
  type SolicitorOffenceFamily,
} from "@/lib/criminal/solicitor-offence-family";
import {
  mapAuditScenarioFamilyToSolicitor,
  type StructuredProvenanceRef,
} from "@/lib/criminal/offence-family-concept-registry";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import {
  QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER,
  requiresQualifiedSolicitorReviewQueue,
} from "@/lib/criminal/solicitor-visible-sanitization";
import { sha256HexSlice } from "@/lib/shared/sha256-hex";

export type IntegrityGateStatus = "ok" | "degraded" | "integrity_blocked";

export type IntegrityRuleId =
  | "offence_family_uncertain"
  | "family_candidate_unproven"
  | "wrong_family.unsupported_template_leakage"
  | "sentence.raw_extraction_marker"
  | "sentence.truncated_fragment"
  | "sentence.malformed_punctuation"
  | "sentence.unresolved_placeholder"
  | "sentence.contradictory_clause"
  | "sentence.incomplete_sentence"
  | "sentence.bullet_label_concat"
  | "sentence.empty"
  | "matter_confidence_blocked"
  | "state_inconsistent"
  | "hearing_unknown"
  | "text_empty"
  | "qualified_solicitor_review_required";

export type GatedSolicitorPayload<T> = {
  status: IntegrityGateStatus;
  ok: boolean;
  canCopy: boolean;
  deepDetailAvailable: boolean;
  banner: string | null;
  /** Safe for logs / reports — no case text. */
  ruleIds: IntegrityRuleId[];
  surfaceId: string;
  /** Present when status === ok (or degraded for view-only soft paths). */
  data: T | null;
  integrity: SolicitorIntegrityResult;
};

export type GateSolicitorOutputInput = {
  surfaceId: string;
  /** Generated solicitor-facing strings to validate (not raw bundle pages). */
  texts: string[];
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
  /** Structured evidence IDs for conditional / mixed-family allowance. */
  evidence?: StructuredProvenanceRef[];
  auditFamily?: string | null;
  mode: "view" | "copy" | "export" | "api";
  /**
   * View/advanced: drop only leaked lines; keep remaining usable.
   * Copy/export/api ignore this and fail closed if any text leaks.
   */
  scopeBlockToAffectedTexts?: boolean;
};

const BANNER =
  "Solicitor review required — output integrity check failed.";

/**
 * Substantive solicitor-generated wording (advice, court, chase, strategy, disclosure).
 * Without resolved family context, copy/export/api modes must fail closed.
 */
export function isSubstantiveSolicitorWording(text: string): boolean {
  const t = text.trim();
  if (t.length < 24) return false;
  return /\b(court|cps|disclosure|advise|advice|plea|strategy|ask the court|client should|mitigation|bail|admission|not guilty|guilty|attribution|outstanding|chase|witness|mg11|mg6|timetable|adjournment|handover|prosecution|defence|solicitor|hearing prep|kill[- ]shot|weakness)\b/i.test(
    t,
  );
}

/**
 * Provisional status lines that are safe to copy even when primary offence family is fail-closed.
 * Does not weaken wrong-family leak or sentence integrity rules.
 */
export function isProvisionalStatusLine(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/\b(ask the court|plea|not guilty|guilty plea|mitigation|bail application|advise the client)\b/i.test(t)) {
    return false;
  }
  return (
    /\battribution remains outstanding\b/i.test(t) ||
    /\bnot safely (?:confirmed|extracted|recorded)\b/i.test(t) ||
    /\bhearing date not safely extracted\b/i.test(t) ||
    /\bevidence state:\s*provisional\b/i.test(t) ||
    /\bposition not safely recorded\b/i.test(t) ||
    /\breview papers\b/i.test(t)
  );
}

function redactDiagnostic(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return `len=${t.length};hash=${sha256HexSlice(t, 12)}`;
}

/**
 * Prefer structured audit-family mapping for matter-level resolution.
 * Text-hay failClosed alone must not claim the whole matter family is unresolved
 * when audit/scenario family is already known.
 */
export function resolveGateOffenceFamily(input: {
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
  auditFamily?: string | null;
}): OffenceFamilyResolution & { matterFamilyFromAudit: boolean } {
  const fromText = resolveSolicitorOffenceFamily({
    allegation: input.allegation,
    bundleHay: input.bundleHay,
    chargeWording: input.chargeWording,
  });
  const mapped = mapAuditScenarioFamilyToSolicitor(input.auditFamily);
  if (mapped && mapped !== ("unknown" as SolicitorOffenceFamily)) {
    return {
      family: mapped,
      confidence: !fromText.failClosed && fromText.family === mapped ? "high" : "low",
      failClosed: false,
      matterFamilyFromAudit: true,
      reason: fromText.failClosed
        ? "Matter family resolved from structured audit/scenario family; text-hay alone was insufficient."
        : fromText.reason,
    };
  }
  return { ...fromText, matterFamilyFromAudit: false };
}

/** Collect rule IDs from integrity + wrong-family classification (no sensitive text). */
export function collectIntegrityRuleIds(
  texts: string[],
  allegation?: string | null,
  bundleHay?: string | null,
  chargeWording?: string | null,
  mode: GateSolicitorOutputInput["mode"] = "view",
  evidence?: StructuredProvenanceRef[],
  auditFamily?: string | null,
): {
  ruleIds: IntegrityRuleId[];
  integrity: SolicitorIntegrityResult;
  /** Indices of texts with unsupported family leakage (scoped block). */
  leakedTextIndexes: number[];
} {
  const offenceFamily = resolveGateOffenceFamily({
    allegation,
    bundleHay,
    chargeWording,
    auditFamily,
  });
  const hasFamilyContext = Boolean(
    (allegation && allegation.trim()) ||
      (bundleHay && bundleHay.trim()) ||
      (chargeWording && chargeWording.trim()) ||
      offenceFamily.matterFamilyFromAudit,
  );
  const ruleIds = new Set<IntegrityRuleId>();
  const leakedTextIndexes: number[] = [];
  const familyOpts = {
    evidence: evidence ?? [],
    allegation,
    chargeWording,
    auditFamily,
  };

  const requiresFamily = mode === "copy" || mode === "export" || mode === "api";

  // Matter-level unresolved only when neither audit nor text-hay resolves a family.
  if (hasFamilyContext && offenceFamily.failClosed && requiresFamily) {
    const needsResolvedFamily = texts.some(
      (t) => isSubstantiveSolicitorWording(t) && !isProvisionalStatusLine(t),
    );
    if (needsResolvedFamily) {
      ruleIds.add("offence_family_uncertain");
    }
  }

  const substantiveWithoutFamily =
    !hasFamilyContext &&
    requiresFamily &&
    texts.some((t) => isSubstantiveSolicitorWording(t) && !isProvisionalStatusLine(t));
  if (substantiveWithoutFamily) {
    ruleIds.add("offence_family_uncertain");
  }

  texts.forEach((text, textIndex) => {
    if (!text?.trim()) {
      ruleIds.add("text_empty");
      return;
    }
    const sentence = assessSolicitorSentence(text);
    for (const issue of sentence.issues) {
      if (issue === "empty") ruleIds.add("sentence.empty");
      else if (issue === "raw_extraction_marker") ruleIds.add("sentence.raw_extraction_marker");
      else if (issue === "truncated_fragment") ruleIds.add("sentence.truncated_fragment");
      else if (issue === "malformed_punctuation") ruleIds.add("sentence.malformed_punctuation");
      else if (issue === "unresolved_placeholder") ruleIds.add("sentence.unresolved_placeholder");
      else if (issue === "contradictory_clause") ruleIds.add("sentence.contradictory_clause");
      else if (issue === "incomplete_sentence") ruleIds.add("sentence.incomplete_sentence");
      else if (issue === "bullet_label_concat") ruleIds.add("sentence.bullet_label_concat");
    }

    if (hasFamilyContext) {
      const hits = classifyWrongFamilyHits(text, offenceFamily, bundleHay ?? "", familyOpts);
      const leaked = hits.some((h) => h.kind === "unsupported_template_leakage");
      if (leaked) {
        ruleIds.add("wrong_family.unsupported_template_leakage");
        leakedTextIndexes.push(textIndex);
      }
    }

    if (requiresFamily && requiresQualifiedSolicitorReviewQueue(text)) {
      ruleIds.add("qualified_solicitor_review_required");
    }
  });

  let integrity: SolicitorIntegrityResult;
  if (substantiveWithoutFamily) {
    integrity = {
      level: "blocked",
      reasons: [
        {
          code: "offence_family_uncertain",
          detail: "Copyable/exportable solicitor wording requires resolved offence family.",
        },
      ],
      canCopy: false,
      deepDetailAvailable: false,
      banner: BANNER,
      offenceFamily: { ...offenceFamily, failClosed: true },
    };
  } else if (hasFamilyContext) {
    integrity =
      texts.length === 1
        ? evaluateTextIntegrity({
            text: texts[0] ?? "",
            allegation,
            bundleHay,
            chargeWording,
            offenceFamily,
          })
        : evaluateMatterIntegrity({
            allegation,
            bundleHay,
            chargeWording,
            sampleTexts: texts,
          });
    const hasUnsupported = ruleIds.has("wrong_family.unsupported_template_leakage");
    if (!hasUnsupported) {
      integrity.reasons = integrity.reasons.filter((r) => r.code !== "wrong_family_term");
    }
  } else {
    integrity = evaluateSentenceIntegrityOnly(texts.filter(Boolean).join("\n") || " ");
  }

  const hard = [...ruleIds].some(
    (r) =>
      r === "offence_family_uncertain" ||
      r === "family_candidate_unproven" ||
      r === "wrong_family.unsupported_template_leakage" ||
      r === "qualified_solicitor_review_required" ||
      r.startsWith("sentence.") ||
      r === "text_empty" ||
      r === "matter_confidence_blocked" ||
      r === "state_inconsistent",
  );

  if (hard && integrity.level === "ok") {
    integrity.level = "blocked";
    integrity.canCopy = false;
    integrity.deepDetailAvailable = false;
    integrity.banner = ruleIds.has("qualified_solicitor_review_required")
      ? QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER
      : BANNER;
  }

  return { ruleIds: [...ruleIds], integrity, leakedTextIndexes };
}

/**
 * Gate solicitor wording centrally.
 * - copy/export/api: any leak / hard rule → blocked, data null, canCopy false
 * - view (scoped): drop only leaked lines; keep remaining texts as degraded usable output
 *   so one optional advanced line does not wipe the whole matter view
 */
export function gateSolicitorOutput<T extends { texts: string[] }>(
  input: GateSolicitorOutputInput & { data: T },
): GatedSolicitorPayload<T> {
  const { ruleIds, integrity, leakedTextIndexes } = collectIntegrityRuleIds(
    input.texts,
    input.allegation,
    input.bundleHay,
    input.chargeWording,
    input.mode,
    input.evidence,
    input.auditFamily,
  );

  const sentenceOrEmptyHard = ruleIds.some(
    (r) => r.startsWith("sentence.") || r === "text_empty" || r === "offence_family_uncertain",
  );
  const familyLeak = ruleIds.includes("wrong_family.unsupported_template_leakage");
  const scopeView =
    input.mode === "view" &&
    (input.scopeBlockToAffectedTexts !== false) &&
    familyLeak &&
    !sentenceOrEmptyHard &&
    leakedTextIndexes.length > 0 &&
    leakedTextIndexes.length < input.texts.length;

  if (scopeView) {
    const keptTexts = input.texts.filter((_, i) => !leakedTextIndexes.includes(i));
    return {
      status: "degraded",
      ok: true,
      canCopy: false,
      deepDetailAvailable: false,
      banner: "Some wording was withheld — unsupported offence-family concepts on this surface.",
      ruleIds,
      surfaceId: input.surfaceId,
      data: { ...input.data, texts: keptTexts },
      integrity: {
        ...integrity,
        level: "degraded",
        canCopy: false,
        banner: "Some wording was withheld — unsupported offence-family concepts on this surface.",
      },
    };
  }

  const blocked =
    integrity.level === "blocked" ||
    ruleIds.includes("wrong_family.unsupported_template_leakage") ||
    ruleIds.includes("offence_family_uncertain") ||
    ruleIds.includes("qualified_solicitor_review_required") ||
    ruleIds.some((r) => r.startsWith("sentence.") || r === "text_empty");

  const degraded = !blocked && integrity.level === "degraded";

  if (blocked) {
    const banner = ruleIds.includes("qualified_solicitor_review_required")
      ? QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER
      : BANNER;
    return {
      status: "integrity_blocked",
      ok: false,
      canCopy: false,
      deepDetailAvailable: false,
      banner,
      ruleIds,
      surfaceId: input.surfaceId,
      data: null,
      integrity: {
        ...integrity,
        level: "blocked",
        canCopy: false,
        deepDetailAvailable: false,
        banner,
      },
    };
  }

  return {
    status: degraded ? "degraded" : "ok",
    ok: true,
    canCopy: integrity.canCopy,
    deepDetailAvailable: integrity.deepDetailAvailable,
    banner: integrity.banner,
    ruleIds,
    surfaceId: input.surfaceId,
    data: input.data,
    integrity,
  };
}

/** API JSON body — typed integrity_blocked, no case text, not a 500. */
export function integrityBlockedApiBody(surfaceId: string, ruleIds: IntegrityRuleId[]) {
  return {
    ok: false as const,
    status: "integrity_blocked" as const,
    surfaceId,
    banner: BANNER,
    ruleIds,
    data: null,
    canCopy: false,
  };
}

export function integrityBlockedResponse(surfaceId: string, ruleIds: IntegrityRuleId[]) {
  return NextResponse.json(integrityBlockedApiBody(surfaceId, ruleIds), { status: 200 });
}

/**
 * Wrap already-built solicitor text fields for an API route.
 * Returns either a blocked response or null (caller continues with original payload).
 */
export function maybeIntegrityBlockedResponse(input: {
  surfaceId: string;
  texts: string[];
  allegation?: string | null;
  bundleHay?: string | null;
  chargeWording?: string | null;
}): NextResponse | null {
  const gated = gateSolicitorOutput({
    surfaceId: input.surfaceId,
    texts: input.texts,
    allegation: input.allegation,
    bundleHay: input.bundleHay,
    chargeWording: input.chargeWording,
    mode: "api",
    data: { texts: input.texts },
  });
  if (gated.status === "integrity_blocked") {
    return integrityBlockedResponse(input.surfaceId, gated.ruleIds);
  }
  return null;
}

/** Redacted log line — fixture/surface/rule only. */
export function integrityAuditLog(input: {
  fixtureId?: string;
  surfaceId: string;
  ruleIds: IntegrityRuleId[];
  sampleText?: string;
}): string {
  const parts = [
    `surface=${input.surfaceId}`,
    input.fixtureId ? `fixture=${input.fixtureId}` : null,
    `rules=${input.ruleIds.join(",") || "none"}`,
    input.sampleText ? `diag=${redactDiagnostic(input.sampleText)}` : null,
  ].filter(Boolean);
  return `[solicitor-integrity] ${parts.join(" ")}`;
}
