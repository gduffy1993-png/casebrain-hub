/**
 * Disclaimer completeness helpers for FN-INCOMPLETE-DISCLAIMER (GOLD-11-039 class).
 *
 * Non-copyable containment is recorded separately from completeness status —
 * a blocked surface must not be conflated with a truncated or absent disclaimer.
 */

import { hasIncompleteRequiredDisclaimer } from "@/lib/criminal/solicitor-visible-boundary";

export type DisclaimerStatus = "complete" | "truncated" | "absent";

export type DisclaimerAssessment = {
  status: DisclaimerStatus;
  kind: "client" | "court" | "other" | "none";
  detail: string;
  matchedPhrase: string | null;
  /** True when the surface is not copyable — record separately from status. */
  nonCopyableContainment: boolean;
};

const CLIENT_COMPLETE =
  /\[CaseBrain — client-safe summary\.[^\]]*Not for court or CPS use\.\]\s*$/;
const COURT_COMPLETE =
  /\[CaseBrain — court line copy\.[^\]]*Confirm before addressing the court\.\]\s*$/;
const CLIENT_STARTED = /\[CaseBrain — client-safe summary\./i;
const COURT_STARTED = /\[CaseBrain — court line copy\./i;

export function assessDisclaimerCompleteness(
  text: string,
  opts?: { canCopy?: boolean },
): DisclaimerAssessment {
  const t = (text ?? "").trim();
  const nonCopyableContainment = opts?.canCopy === false;
  if (!t) {
    return {
      status: "absent",
      kind: "none",
      detail: "empty text",
      matchedPhrase: null,
      nonCopyableContainment,
    };
  }
  if (CLIENT_COMPLETE.test(t)) {
    const m = t.match(CLIENT_COMPLETE);
    return {
      status: "complete",
      kind: "client",
      detail: "complete client-safe disclaimer",
      matchedPhrase: m?.[0] ?? null,
      nonCopyableContainment,
    };
  }
  if (COURT_COMPLETE.test(t)) {
    const m = t.match(COURT_COMPLETE);
    return {
      status: "complete",
      kind: "court",
      detail: "complete court-line disclaimer",
      matchedPhrase: m?.[0] ?? null,
      nonCopyableContainment,
    };
  }
  if (hasIncompleteRequiredDisclaimer(t) || (CLIENT_STARTED.test(t) && !CLIENT_COMPLETE.test(t))) {
    const m = t.match(/\[CaseBrain — client-safe summary\.[^\]]*/i);
    return {
      status: "truncated",
      kind: "client",
      detail: "client-safe disclaimer started but not completed",
      matchedPhrase: m?.[0] ?? t.slice(-120),
      nonCopyableContainment,
    };
  }
  if (COURT_STARTED.test(t) && !COURT_COMPLETE.test(t)) {
    const m = t.match(/\[CaseBrain — court line copy\.[^\]]*/i);
    return {
      status: "truncated",
      kind: "court",
      detail: "court-line disclaimer started but not completed",
      matchedPhrase: m?.[0] ?? t.slice(-120),
      nonCopyableContainment,
    };
  }
  if (
    /not for court or cps/i.test(t) &&
    !CLIENT_COMPLETE.test(t) &&
    CLIENT_STARTED.test(t) === false
  ) {
    return {
      status: "truncated",
      kind: "client",
      detail: "partial audience disclaimer without complete CaseBrain suffix",
      matchedPhrase: t.slice(-120),
      nonCopyableContainment,
    };
  }
  return {
    status: "absent",
    kind: "none",
    detail: "no CaseBrain client/court disclaimer present",
    matchedPhrase: null,
    nonCopyableContainment,
  };
}
