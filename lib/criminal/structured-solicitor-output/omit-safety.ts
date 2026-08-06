/**
 * Neutral review-required message when substantive solicitor content cannot be reconstructed.
 * Never leave an empty gap for evidence / missing-material / required action / hearing / do-not-overstate.
 */

export const REVIEW_REQUIRED_NEUTRAL =
  "Solicitor review required — this item could not be safely reconstructed from structured fields. Check the source papers before relying on or omitting this point.";

export type SubstantiveOmitKind =
  | "evidence_item"
  | "missing_material_warning"
  | "required_action"
  | "hearing_qualification"
  | "do_not_overstate_warning"
  | "other_substantive"
  | "non_substantive";

/** Heuristic: does this legacy string look like substantive solicitor content? */
export function classifySubstantiveOmitKind(text: string): SubstantiveOmitKind {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length < 8) return "non_substantive";
  if (/\bdo not (?:say|overstate)|must not (?:say|overstate)|not safe to say\b/i.test(t)) {
    return "do_not_overstate_warning";
  }
  if (/\bhearing|deadline|timetable|ptph|listing|adjourn/i.test(t)) {
    return "hearing_qualification";
  }
  if (/\bplease (?:provide|confirm|chase)|kindly confirm|request(?:ed)? action|chase\b/i.test(t)) {
    return "required_action";
  }
  if (/\bmissing|outstanding|not served|awaited|to follow|referred only\b/i.test(t)) {
    return "missing_material_warning";
  }
  if (/\bmg11|mg6|evidence|exhibit|statement|screenshot|phone|bwv|cctv\b/i.test(t)) {
    return "evidence_item";
  }
  if (t.length >= 24) return "other_substantive";
  return "non_substantive";
}

/**
 * When disposition is safely_omitted, return display text that does not silently drop substance.
 */
export function displayForSafelyOmitted(legacy: string): {
  kind: SubstantiveOmitKind;
  display: string | null;
  silentLossPrevented: boolean;
} {
  const kind = classifySubstantiveOmitKind(legacy);
  if (kind === "non_substantive") {
    return { kind, display: null, silentLossPrevented: true };
  }
  return { kind, display: REVIEW_REQUIRED_NEUTRAL, silentLossPrevented: true };
}
