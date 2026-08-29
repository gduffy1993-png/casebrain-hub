import { NextResponse } from "next/server";
import { collectWordingStrings } from "@/lib/criminal/collect-wording-strings";
import { integrityBlockedApiBody, type IntegrityRuleId } from "@/lib/criminal/solicitor-output-gate";
import { validateSolicitorSurface } from "@/lib/criminal/shared-solicitor-validator";
import { buildSolicitorFactRecord, type SolicitorFactRecord } from "@/lib/criminal/solicitor-fact-record";
import { renderSolicitorFacts, solicitorTextAssertsUnconfirmedFamily } from "@/lib/criminal/solicitor-fact-renderer";

/**
 * Central API exit gate: shared validator + typed integrity_blocked (200).
 * Optionally verifies canonical fingerprint consistency.
 * Leftover letter/PDF mouths: if they assert a family the fact record has not
 * confirmed, they do not speak — same blocked shape as before, plus optional factSheet.
 */
export function gatedJsonResponse(
  surfaceId: string,
  payload: unknown,
  opts?: {
    allegation?: string | null;
    bundleHay?: string | null;
    chargeWording?: string | null;
    status?: number;
    headers?: HeadersInit;
    canonicalFingerprint?: string | null;
    expectedCanonicalFingerprint?: string | null;
    factRecord?: SolicitorFactRecord | null;
  },
): NextResponse {
  const texts = collectWordingStrings(payload);
  const factRecord =
    opts?.factRecord ??
    (opts?.allegation || opts?.bundleHay || opts?.chargeWording
      ? buildSolicitorFactRecord({
          allegation: opts.allegation,
          chargeWording: opts.chargeWording,
          bundleHay: opts.bundleHay,
        })
      : null);
  const factSheet = factRecord ? renderSolicitorFacts(factRecord).chatFactSheet : null;

  if (texts.length && factRecord) {
    const leaks = texts.flatMap((t) => solicitorTextAssertsUnconfirmedFamily(t, factRecord));
    if (leaks.length) {
      const ruleIds: IntegrityRuleId[] = ["wrong_family.unsupported_template_leakage"];
      return NextResponse.json(
        {
          ...integrityBlockedApiBody(surfaceId, ruleIds),
          factSheet,
          containment: "solicitor_fact_record",
        },
        { status: 200, headers: opts?.headers },
      );
    }
  }

  if (texts.length) {
    const gated = validateSolicitorSurface({
      surfaceId,
      texts,
      allegation: opts?.allegation,
      bundleHay: opts?.bundleHay,
      chargeWording: opts?.chargeWording,
      mode: "api",
      data: { texts },
      canonicalFingerprint: opts?.canonicalFingerprint,
      expectedCanonicalFingerprint: opts?.expectedCanonicalFingerprint,
    });
    if (gated.status === "integrity_blocked") {
      const body = {
        ...integrityBlockedApiBody(surfaceId, gated.ruleIds),
        canonicalFingerprint: opts?.expectedCanonicalFingerprint ?? opts?.canonicalFingerprint ?? null,
        fingerprintMatch: gated.fingerprintMatch,
        ...(factSheet ? { factSheet, containment: "solicitor_fact_record" as const } : {}),
      };
      return NextResponse.json(body, {
        status: 200,
        headers: opts?.headers,
      });
    }
  }
  return NextResponse.json(payload, { status: opts?.status ?? 200, headers: opts?.headers });
}
