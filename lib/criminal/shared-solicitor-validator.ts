/**
 * Phase 6 shared solicitor surface validator.
 * Every substantive surface validates wording + optional canonical fingerprint.
 */

import {
  gateSolicitorOutput,
  type GateSolicitorOutputInput,
  type GatedSolicitorPayload,
  type IntegrityRuleId,
} from "@/lib/criminal/solicitor-output-gate";
import { assertSameCanonicalFingerprint } from "@/lib/criminal/canonical-matter-state";
import {
  canUseSolicitorApiResponse,
  isIntegrityBlockedPayload,
  solicitorUiStateFromApiBody,
} from "@/lib/criminal/integrity-blocked-consumer";

export const SHARED_SOLICITOR_VALIDATOR_VERSION = "1.0.0" as const;

export type SharedValidatorInput<T extends { texts: string[] }> = GateSolicitorOutputInput & {
  data: T;
  /** Fingerprint the surface claims to have consumed. */
  canonicalFingerprint?: string | null;
  /** Authoritative fingerprint from CanonicalMatterStateV1. */
  expectedCanonicalFingerprint?: string | null;
};

export type SharedValidatorResult<T extends { texts: string[] }> = GatedSolicitorPayload<T> & {
  validatorVersion: typeof SHARED_SOLICITOR_VALIDATOR_VERSION;
  fingerprintMatch: boolean | null;
  fingerprintRule: "ok" | "mismatch" | "not_supplied";
};

/**
 * Validate solicitor wording for a surface.
 * Fingerprint mismatch → integrity_blocked (state_inconsistent).
 */
export function validateSolicitorSurface<T extends { texts: string[] }>(
  input: SharedValidatorInput<T>,
): SharedValidatorResult<T> {
  const gated = gateSolicitorOutput(input);

  let fingerprintMatch: boolean | null = null;
  let fingerprintRule: SharedValidatorResult<T>["fingerprintRule"] = "not_supplied";

  if (input.canonicalFingerprint && input.expectedCanonicalFingerprint) {
    fingerprintMatch = assertSameCanonicalFingerprint(
      input.canonicalFingerprint,
      input.expectedCanonicalFingerprint,
    );
    fingerprintRule = fingerprintMatch ? "ok" : "mismatch";
  }

  if (fingerprintRule === "mismatch") {
    const ruleIds: IntegrityRuleId[] = [...new Set([...gated.ruleIds, "state_inconsistent" as IntegrityRuleId])];
    return {
      status: "integrity_blocked",
      ok: false,
      canCopy: false,
      deepDetailAvailable: false,
      banner: "Solicitor review required — matter state fingerprint mismatch across surfaces.",
      ruleIds,
      surfaceId: input.surfaceId,
      data: null,
      integrity: {
        ...gated.integrity,
        level: "blocked",
        canCopy: false,
        deepDetailAvailable: false,
        banner: "Solicitor review required — matter state fingerprint mismatch across surfaces.",
      },
      validatorVersion: SHARED_SOLICITOR_VALIDATOR_VERSION,
      fingerprintMatch: false,
      fingerprintRule,
    };
  }

  return {
    ...gated,
    validatorVersion: SHARED_SOLICITOR_VALIDATOR_VERSION,
    fingerprintMatch,
    fingerprintRule,
  };
}

/** Consumer contract checks for HTTP-200 integrity_blocked bodies. */
export function assertConsumerRejectsIntegrityBlocked(body: unknown): boolean {
  return isIntegrityBlockedPayload(body) && !canUseSolicitorApiResponse(body) && !solicitorUiStateFromApiBody(body).usable;
}
