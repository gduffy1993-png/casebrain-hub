/**
 * Absolute / unsafe affirmative proof wording — must never be copyable solicitor prose.
 * "Must not say" / do-not-overstate lists may contain these phrases as warnings only.
 */

export const ABSOLUTE_PROOF_WORDING_RES = [
  /\bfully proved on current disclosure\b/i,
  /\bsafely confirms guilt\b/i,
  /\bguilt is proved\b/i,
  /\bwill be convicted\b/i,
  /\boutcome is certain\b/i,
] as const;

export function containsAbsoluteProofWording(text: string | null | undefined): boolean {
  const t = text ?? "";
  return ABSOLUTE_PROOF_WORDING_RES.some((re) => re.test(t));
}

/** True when the entire string is only absolute-proof / must-not-say content (not a warning list framing). */
export function isAbsoluteProofAffirmativeCopy(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (containsAbsoluteProofWording(t)) {
    // Warning lists that explicitly frame as do-not-say are still not copyable as affirmative prose
    // when the sole content is the banned phrase(s).
    const stripped = t
      .replace(/^•\s*/gm, "")
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (stripped.length <= 3 && stripped.every((l) => containsAbsoluteProofWording(l))) return true;
    // Any occurrence in affirmative defence-plan / summary / court / chase copy is blocked
    return true;
  }
  return false;
}
