import { NextResponse } from "next/server";
import { collectWordingStrings } from "@/lib/criminal/collect-wording-strings";
import {
  integrityBlockedApiBody,
  gateSolicitorOutput,
} from "@/lib/criminal/solicitor-output-gate";

/**
 * Central API exit gate: if wording fails integrity, return typed integrity_blocked (200).
 * Otherwise return the original payload unchanged.
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
  },
): NextResponse {
  const texts = collectWordingStrings(payload);
  if (texts.length) {
    const gated = gateSolicitorOutput({
      surfaceId,
      texts,
      allegation: opts?.allegation,
      bundleHay: opts?.bundleHay,
      chargeWording: opts?.chargeWording,
      mode: "api",
      data: { texts },
    });
    if (gated.status === "integrity_blocked") {
      return NextResponse.json(integrityBlockedApiBody(surfaceId, gated.ruleIds), {
        status: 200,
        headers: opts?.headers,
      });
    }
  }
  return NextResponse.json(payload, { status: opts?.status ?? 200, headers: opts?.headers });
}
