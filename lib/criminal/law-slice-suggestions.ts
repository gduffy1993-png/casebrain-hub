/**
 * Phase 5: Suggest relevant law slices for the case (offence type + phase).
 * Used by LawSliceSuggestions component on the Strategy tab.
 */

/** Display labels for law slices in the corpus */
export const LAW_SLICE_LABELS = [
  "Offence elements",
  "CPIA 1996",
  "PACE Code D",
  "PACE Codes A/B/C/E",
  "Sentencing guidelines",
  "Evidence",
  "Procedure",
  "Case law principles",
] as const;

export type LawSliceLabel = (typeof LAW_SLICE_LABELS)[number];

/**
 * Returns 4–5 suggested law slice labels for this case so the UI can prompt "ask about these".
 * Deterministic from offence type and phase; no API call.
 */
export function getSuggestedLawSlices(
  offenceType: string | undefined | null,
  phase: number
): LawSliceLabel[] {
  const type = (offenceType ?? "").toLowerCase();
  const suggestions: LawSliceLabel[] = [];

  // Always relevant: offence elements (AR/MR for this offence)
  suggestions.push("Offence elements");

  // Disclosure and procedure in phase 2+
  if (phase >= 2) {
    suggestions.push("CPIA 1996");
    suggestions.push("Procedure");
  }

  // Sentencing when in phase 3
  if (phase >= 3) {
    suggestions.push("Sentencing guidelines");
  }

  // Identification often in dispute (theft, assault, robbery, sexual, violence, public order, drugs)
  const idRelevant =
    /theft|burglary|robbery|assault|rape|sexual|s18|s20|s47|affray|violent|riot|harassment|stalking|drug|poa_|obstruction|resisting|identification/.test(
      type
    ) || type === "other";
  if (idRelevant && !suggestions.includes("PACE Code D")) {
    suggestions.push("PACE Code D");
  }

  // Custody/interview (most criminal cases)
  if (phase >= 2 && suggestions.length < 6) {
    suggestions.push("PACE Codes A/B/C/E");
  }

  // Evidence (hearsay, bad character, confessions) for trial prep
  if (phase >= 2 && !suggestions.includes("Evidence")) {
    suggestions.push("Evidence");
  }

  // Case law principles (general)
  if (!suggestions.includes("Case law principles") && suggestions.length < 6) {
    suggestions.push("Case law principles");
  }

  return suggestions.slice(0, 6);
}
