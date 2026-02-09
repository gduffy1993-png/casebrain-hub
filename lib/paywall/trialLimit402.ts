/**
 * Consistent 402 response for trial limits.
 * Use everywhere a trial limit is hit: upload, intake create-case, analysis rerun/rebuild.
 */

import type { TrialStatus } from "./trialLimits";

export type TrialLimitReason = "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT";

const MESSAGES: Record<TrialLimitReason, string> = {
  TRIAL_EXPIRED:
    "Trial limit reached. Your trial has ended. Upgrade to continue.",
  DOC_LIMIT:
    "Trial limit reached: 10 documents. Upgrade to continue.",
  CASE_LIMIT:
    "Trial limit reached: 2 cases. Upgrade to continue.",
};

export type TrialLimit402Body = {
  error: string;
  code: TrialLimitReason;
  casesUsed?: number;
  casesLimit?: number;
  docsUsed?: number;
  docsLimit?: number;
  trialEndsAt?: string | null;
  upgrade?: { price: string };
};

/**
 * Build the JSON body for a 402 response when a trial limit is hit.
 * Same solicitor-style message everywhere; optional extra fields for UI.
 */
export function trialLimit402Body(
  reason: TrialLimitReason,
  trialStatus?: TrialStatus | null
): TrialLimit402Body {
  const body: TrialLimit402Body = {
    error: MESSAGES[reason],
    code: reason,
    upgrade: { price: "£39/user/month" },
  };
  if (trialStatus) {
    if (trialStatus.casesUsed != null) body.casesUsed = trialStatus.casesUsed;
    if (trialStatus.casesLimit != null) body.casesLimit = trialStatus.casesLimit;
    if (trialStatus.docsUsed != null) body.docsUsed = trialStatus.docsUsed;
    if (trialStatus.docsLimit != null) body.docsLimit = trialStatus.docsLimit;
    if (trialStatus.trialEndsAt != null) body.trialEndsAt = trialStatus.trialEndsAt;
  }
  return body;
}
