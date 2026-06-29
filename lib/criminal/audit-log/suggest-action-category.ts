import { isBadOutputCandidateKind } from "@/lib/criminal/trust/feedback/trust-feedback-sanitize";
import type { TrustFeedbackRecord } from "@/lib/criminal/trust/feedback/trust-feedback-types";
import type { AuditActionCategory } from "./audit-log-types";

/** Client/server-safe triage hints — does not alter live output or persist state. */
export function suggestAuditActionCategories(record: TrustFeedbackRecord): AuditActionCategory[] {
  const out = new Set<AuditActionCategory>();

  if (record.feedbackKind === "useful" || record.feedbackKind === "good_for_court") {
    out.add("no_action");
  }

  if (
    record.feedbackKind === "unclear" ||
    record.feedbackKind === "needs_rewrite" ||
    record.feedbackKind === "overstated"
  ) {
    out.add("wording_polish");
  }

  if (
    record.feedbackKind === "bad_source" ||
    record.feedbackKind === "missing_evidence" ||
    record.sourceState === "referred_only" ||
    record.sourceState === "missing" ||
    record.sourceState === "not_safely_confirmed"
  ) {
    out.add("source_state_issue");
  }

  if (record.tab === "export_pack" || record.exportId || record.exportType) {
    out.add("export_issue");
  }

  if (
    record.feedbackKind === "unsafe" ||
    record.feedbackKind === "wrong" ||
    record.feedbackKind === "overstated" ||
    record.feedbackKind === "missing_evidence"
  ) {
    out.add("possible_false_served");
  }

  if (record.note && /co-?defendant|other defendant|wrong defendant/i.test(record.note)) {
    out.add("wrong_defendant_bleed");
  }

  if (record.note && /wrong (offence|family|charge)|family bleed/i.test(record.note)) {
    out.add("wrong_family_bleed");
  }

  if (isBadOutputCandidateKind(record.feedbackKind)) {
    out.add("add_to_bad_output_memory");
  }

  if (record.severity === "blocking" || record.feedbackKind === "unsafe") {
    out.add("add_to_simulator_or_golden_pack");
  }

  if (!out.size) out.add("no_action");

  return [...out];
}
