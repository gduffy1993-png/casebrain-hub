/**
 * A case may not wear another case's identity.
 *
 * Two shapes of the same root:
 * - a demo pack name in this matter's title must not force that pack when the papers
 *   already name a different offence family (Marcus Vale fraud pack vs Marcus Andrew Vale robbery)
 * - a chase/court line must not cite a CB-TB matter reference that is not on these papers
 */

export type OffenceFamilyHint =
  | "fraud"
  | "drugs"
  | "robbery"
  | "violence"
  | "murder"
  | "burglary"
  | "harassment"
  | "theft"
  | "bladed";

export function offenceFamilyHint(text: string): OffenceFamilyHint | null {
  const t = text.trim();
  if (!t) return null;
  if (/\bmurder\b/i.test(t)) return "murder";
  if (/\brobbery\b/i.test(t)) return "robbery";
  if (/\b(pwits|intent\s+to\s+supply|class\s*[abc]\s+drug|controlled drug)\b/i.test(t)) return "drugs";
  if (/\b(fraud|false representation)\b/i.test(t)) return "fraud";
  if (/\b(harassment|stalking)\b/i.test(t)) return "harassment";
  if (/\b(bladed|pointed article|s\.?\s*139)\b/i.test(t)) return "bladed";
  if (/\bburglary\b/i.test(t)) return "burglary";
  if (/\b(assault|gbh|abh|wounding|oapa|affray|emergency worker)\b/i.test(t)) return "violence";
  if (/\btheft\b/i.test(t)) return "theft";
  return null;
}

export function isUnusableAllegationLabel(label: string): boolean {
  return /\b(offence wording not safely extracted|unknown|add charge sheet)\b/i.test(label);
}

/** True when the papers name an offence family the demo pack does not. */
export function demoPackConflictsWithSourceAllegation(
  sourceAllegation: string | null | undefined,
  demoAllegation: string,
): boolean {
  const source = sourceAllegation?.trim() ?? "";
  if (!source || isUnusableAllegationLabel(source)) return false;
  const sourceFamily = offenceFamilyHint(source);
  const demoFamily = offenceFamilyHint(demoAllegation);
  return sourceFamily !== null && demoFamily !== null && sourceFamily !== demoFamily;
}

const MATTER_REF_RE = /\bCB-TB-\d+\b/gi;

export function collectMatterRefTokens(text: string): Set<string> {
  const out = new Set<string>();
  const re = new RegExp(MATTER_REF_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.add(m[0].toUpperCase());
  }
  return out;
}

export function foreignMatterRefs(ownedText: string, claimedText: string): string[] {
  const own = collectMatterRefTokens(ownedText);
  return [...collectMatterRefTokens(claimedText)].filter((ref) => !own.has(ref)).sort();
}
