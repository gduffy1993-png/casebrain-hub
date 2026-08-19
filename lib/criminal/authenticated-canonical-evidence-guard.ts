import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";

/**
 * Authenticated solicitor Overview / Hearing / Export expect reconciled canonical
 * evidence from bundle-source. The chase-derived `evidenceRowsOverride === undefined`
 * path remains only for explicit legacy/eval callers of buildFiveAnswersView.
 *
 * CB-HIST-AUTHENTICATED-CANONICAL-FAILURE-MUST-NOT-FALLBACK-TO-CHASE-TRUTH
 */
export type AuthenticatedCanonicalAuthority =
  | "pending"
  | "ready"
  | "unavailable";

export type ResolveAuthenticatedCanonicalEvidenceInput = {
  /** True while the authenticated bundle-source request is in flight. */
  bundleLoading: boolean;
  /**
   * Canonical payload from a successful bundle-source response.
   * - object (including empty evidence) → ready
   * - null/undefined after load → unavailable (do not chase-fallback)
   */
  canonical: unknown;
  /** Projection of reconciled rows when canonical is present. */
  evidenceRowsFromCanonical: FiveAnswersEvidenceRow[];
};

export type ResolveAuthenticatedCanonicalEvidenceResult = {
  authority: AuthenticatedCanonicalAuthority;
  /**
   * - pending / unavailable → undefined (must NOT be passed into buildFiveAnswersView
   *   as a silent chase-fallback on the authenticated path; UI must suppress/degrade)
   * - ready → rows or authoritative []
   */
  evidenceRowsOverride: FiveAnswersEvidenceRow[] | undefined;
  /**
   * When true, solicitor-facing Overview/Hearing/Export must not call
   * buildFiveAnswersView / buildHearingMode / buildExportPack with chase-derived evidence.
   */
  suppressChaseDerivedEvidence: boolean;
};

export function resolveAuthenticatedCanonicalEvidenceAuthority(
  input: ResolveAuthenticatedCanonicalEvidenceInput,
): ResolveAuthenticatedCanonicalEvidenceResult {
  if (input.bundleLoading) {
    return {
      authority: "pending",
      evidenceRowsOverride: undefined,
      suppressChaseDerivedEvidence: true,
    };
  }

  if (input.canonical != null && typeof input.canonical === "object") {
    return {
      authority: "ready",
      evidenceRowsOverride: input.evidenceRowsFromCanonical,
      suppressChaseDerivedEvidence: false,
    };
  }

  return {
    authority: "unavailable",
    evidenceRowsOverride: undefined,
    suppressChaseDerivedEvidence: true,
  };
}
