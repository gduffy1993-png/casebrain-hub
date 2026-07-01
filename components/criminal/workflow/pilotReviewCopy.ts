/** UI-only copy softening — does not change export/builder output. */
export function softenPilotReviewCopy(text: string): string {
  return text
    .replace(/\s*[—–-]\s*solicitor review required\.?/gi, "")
    .replace(/\bsolicitor review required before (relying|sending)\b/gi, "check before $1")
    .replace(/\bsolicitor review required\b/gi, "check before relying")
    .replace(/\s{2,}/g, " ")
    .trim();
}
