import { NextResponse } from "next/server";
import { collectWordingStrings } from "@/lib/criminal/collect-wording-strings";
import { integrityBlockedApiBody } from "@/lib/criminal/solicitor-output-gate";
import { validateSolicitorSurface } from "@/lib/criminal/shared-solicitor-validator";

/**
 * Central API exit gate: shared validator + typed integrity_blocked (200).
 * Optionally verifies canonical fingerprint consistency.
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
  },
): NextResponse {
  const texts = collectWordingStrings(payload);
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
      };
      return NextResponse.json(body, {
        status: 200,
        headers: opts?.headers,
      });
    }
  }
  return NextResponse.json(payload, { status: opts?.status ?? 200, headers: opts?.headers });
}
