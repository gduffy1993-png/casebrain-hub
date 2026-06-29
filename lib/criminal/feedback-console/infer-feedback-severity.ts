import type { TrustFeedbackKind, TrustFeedbackSeverity } from "@/lib/criminal/trust/feedback/trust-feedback-types";

const BLOCKING: ReadonlySet<TrustFeedbackKind> = new Set(["unsafe", "wrong"]);

const WARNING: ReadonlySet<TrustFeedbackKind> = new Set([
  "missing_issue",
  "missing_evidence",
  "bad_source",
  "overstated",
  "needs_rewrite",
]);

export function inferFeedbackSeverity(kind: TrustFeedbackKind): TrustFeedbackSeverity {
  if (BLOCKING.has(kind)) return "blocking";
  if (WARNING.has(kind)) return "warning";
  return "polish";
}
