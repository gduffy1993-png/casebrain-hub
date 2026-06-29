import type { TrustFeedbackKind } from "@/lib/criminal/trust/feedback/trust-feedback-types";

/** H5 Feedback Console kinds — superset of legacy Today/Chase/Summary kinds. */
export type H5FeedbackKind = TrustFeedbackKind;

export const H5_FEEDBACK_KINDS: ReadonlyArray<{ value: H5FeedbackKind; label: string; group: "issue" | "positive" }> = [
  { value: "useful", label: "Useful", group: "positive" },
  { value: "wrong", label: "Wrong", group: "issue" },
  { value: "unsafe", label: "Unsafe", group: "issue" },
  { value: "missing_evidence", label: "Missing evidence", group: "issue" },
  { value: "overstated", label: "Overstated", group: "issue" },
  { value: "unclear", label: "Unclear", group: "issue" },
  { value: "needs_rewrite", label: "Needs rewrite", group: "issue" },
  { value: "good_for_court", label: "Good for court", group: "positive" },
  { value: "good_for_cps_chase", label: "Good for CPS chase", group: "positive" },
  { value: "good_for_client_explanation", label: "Good for client", group: "positive" },
] as const;
