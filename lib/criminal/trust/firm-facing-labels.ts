import type { SendabilityLevel } from "@/lib/criminal/matter-confidence/matter-confidence-types";

/** H5 firm-facing sendability wording — presentation only. */
export const FIRM_SENDABILITY_LABELS: Record<SendabilityLevel, string> = {
  safe_to_send: "Copy suggestion — solicitor review required",
  needs_solicitor_review: "Solicitor review required",
  blocked: "Not for sending until reviewed",
  provisional_check_source: "Provisional — check source before sending",
};

export const SOURCE_BACKED_COURT_NOTE_LABEL = "Source-backed court note";
export const COPY_SUGGESTION_LABEL = "Copy suggestion";
