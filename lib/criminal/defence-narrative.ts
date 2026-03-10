/**
 * Phase 6 (optional): Defence Narrative (DNB)
 * Builds a short "defence in brief" from strategy snapshot data.
 */

export type DefenceNarrativeInput = {
  offenceLabel?: string;
  primaryStrategy?: string;
  /** First 1–2 leverage points from burden map (e.g. "Challenge – gaps in evidence") */
  keyLeverage?: string[];
  /** Recorded/committed position text (optional) */
  positionSummary?: string;
};

/**
 * Returns a short defence narrative paragraph for display or export.
 */
export function buildDefenceNarrative(input: DefenceNarrativeInput): string {
  const { offenceLabel, primaryStrategy, keyLeverage, positionSummary } = input;
  const parts: string[] = [];

  if (offenceLabel) {
    parts.push(`This case concerns ${offenceLabel}.`);
  }

  if (positionSummary && positionSummary.trim().length > 0) {
    const summary = positionSummary.trim().length > 280
      ? positionSummary.trim().slice(0, 277) + "..."
      : positionSummary.trim();
    parts.push(`The defence position: ${summary}`);
  } else if (primaryStrategy) {
    const approach = primaryStrategy.replace(/_/g, " ");
    parts.push(`The primary approach is ${approach}.`);
  }

  if (keyLeverage && keyLeverage.length > 0) {
    const leverage = keyLeverage.slice(0, 2).join("; ");
    parts.push(`Key leverage: ${leverage}.`);
  }

  if (parts.length === 0) {
    return "Run strategy analysis and record a position to see your defence narrative here.";
  }

  return parts.join(" ");
}
