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
} from "@/lib/criminal/solicitor-offence-family";
import { assessSolicitorSentence } from "@/lib/criminal/solicitor-sentence-composer";
import { createHash } from "node:crypto";

export type IntegrityGateStatus = "ok" | "degraded" | "integrity_blocked";

export type IntegrityRuleId =
  | "offence_family_uncertain"
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
  | "text_empty";

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
  mode: "view" | "copy" | "export" | "api";
};

const BANNER =
  "Solicitor review required — output integrity check failed.";

function redactDiagnostic(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return `len=${t.length};hash=${createHash("sha256").update(t).digest("hex").slice(0, 12)}`;
}

/** Collect rule IDs from integrity + wrong-family classification (no sensitive text). */
export function collectIntegrityRuleIds(
  texts: string[],
  allegation?: string | null,
  bundleHay?: string | null,
  chargeWording?: string | null,
): { ruleIds: IntegrityRuleId[]; integrity: SolicitorIntegrityResult } {
  const hasFamilyContext = Boolean(
    (allegation && allegation.trim()) ||
      (bundleHay && bundleHay.trim()) ||
      (chargeWording && chargeWording.trim()),
  );
  const offenceFamily = resolveSolicitorOffenceFamily({ allegation, bundleHay, chargeWording });
  const ruleIds = new Set<IntegrityRuleId>();

  if (hasFamilyContext && offenceFamily.failClosed) {
    ruleIds.add("offence_family_uncertain");
  }

  for (const text of texts) {
    if (!text?.trim()) {
      ruleIds.add("text_empty");
      continue;
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
      const hits = classifyWrongFamilyHits(text, offenceFamily, bundleHay ?? "");
      for (const hit of hits) {
        if (hit.kind === "unsupported_template_leakage") {
          ruleIds.add("wrong_family.unsupported_template_leakage");
        }
      }
    }
  }

  const integrity = hasFamilyContext
    ? texts.length === 1
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
        })
    : evaluateSentenceIntegrityOnly(texts.filter(Boolean).join("\n") || " ");

  if (hasFamilyContext) {
    const hasUnsupported = ruleIds.has("wrong_family.unsupported_template_leakage");
    if (!hasUnsupported) {
      integrity.reasons = integrity.reasons.filter((r) => r.code !== "wrong_family_term");
    }
  }

  const hard = [...ruleIds].some(
    (r) =>
      r === "offence_family_uncertain" ||
      r === "wrong_family.unsupported_template_leakage" ||
      r.startsWith("sentence.") ||
      r === "text_empty" ||
      r === "matter_confidence_blocked" ||
      r === "state_inconsistent",
  );

  if (hard && integrity.level === "ok") {
    integrity.level = "blocked";
    integrity.canCopy = false;
    integrity.deepDetailAvailable = false;
    integrity.banner = BANNER;
  }

  return { ruleIds: [...ruleIds], integrity };
}

/**
 * Gate solicitor wording centrally.
 * - copy/export/api: blocked → data null, canCopy false
 * - view: blocked → data null + banner (safe empty UI state)
 */
export function gateSolicitorOutput<T extends { texts: string[] }>(
  input: GateSolicitorOutputInput & { data: T },
): GatedSolicitorPayload<T> {
  const { ruleIds, integrity } = collectIntegrityRuleIds(
    input.texts,
    input.allegation,
    input.bundleHay,
    input.chargeWording,
  );

  const blocked =
    integrity.level === "blocked" ||
    ruleIds.includes("wrong_family.unsupported_template_leakage") ||
    ruleIds.includes("offence_family_uncertain") ||
    ruleIds.some((r) => r.startsWith("sentence.") || r === "text_empty");

  const degraded = !blocked && integrity.level === "degraded";

  if (blocked) {
    return {
      status: "integrity_blocked",
      ok: false,
      canCopy: false,
      deepDetailAvailable: false,
      banner: BANNER,
      ruleIds,
      surfaceId: input.surfaceId,
      data: null,
      integrity: {
        ...integrity,
        level: "blocked",
        canCopy: false,
        deepDetailAvailable: false,
        banner: BANNER,
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
