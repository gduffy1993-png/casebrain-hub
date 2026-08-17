/** UI-only copy softening — does not change export/builder output. */
export function softenPilotReviewCopy(text: string): string {
  return text
    .replace(/\s*[—–-]\s*solicitor review required\.?/gi, "")
    .replace(/\bsolicitor review required before (relying|sending)\b/gi, "check before $1")
    .replace(/\bsolicitor review required\b/gi, "check before relying")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** UI-only wording for blocked/deferred solicitor surfaces. Keeps the safety gate, removes backend language. */
export function solicitorReadyGateCopy(text: string | null | undefined): string {
  const raw = (text ?? "").trim();
  if (!raw) {
    return "More detailed drafting is held back until the source position is clearer.";
  }

  if (
    /\bintegrity checks?\b/i.test(raw) ||
    /\bfailed integrity\b/i.test(raw) ||
    /\boffence family\b/i.test(raw) ||
    /\bdeep output unavailable\b/i.test(raw)
  ) {
    return "More detailed drafting is held back until the source position is clearer.";
  }

  return softenPilotReviewCopy(raw)
    .replace(/\bCopy disabled\b/gi, "Copy held back")
    .replace(/\bnot legal advice\b/gi, "source-linked review note")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** UI-only footer copy — one quiet safety reminder instead of repeated defensive disclaimers. */
export function pilotSafetyFooterCopy(kind: "pilot" | "saved" = "pilot"): string {
  return kind === "pilot"
    ? "Source-linked · conditional where papers are incomplete"
    : "Provisional display from saved case data";
}
