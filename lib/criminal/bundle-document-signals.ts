/**
 * Shared bundle document-type signals for fidelity checks and tooling.
 * Pattern-based only — no per-case tuning.
 */

export const BUNDLE_DOCUMENT_TYPE_PATTERNS: Record<string, RegExp> = {
  cover: /=== SECTION: COVER\b|Crown Prosecution Service — Case papers|^\s*# Crown Prosecution Service/im,
  index: /=== SECTION: (?:INDEX|COVER_INDEX)\b|^\s*INDEX\b|^\s*#\s*Bundle index\b|^\s*#\s*INDEX\b/im,
  charge_sheet:
    /\bcharge sheet\b|=== SECTION: CHARGE|statement of offence\b|^##\s*CHARGES\b|\bCOUNT\s+\d+\s*:/im,
  mg5: /\bmg5\b|=== SECTION: MG5\b|case summary \(fictional\)|prosecution case summary/i,
  mg6: /\bmg6[a-z]?\b|=== SECTION: MG6\b|unused material schedule|schedule of (?:initial )?disclosure/i,
  mg11:
    /\bmg11\b|=== SECTION: MG11\b|#\s*witness statement\b|witness statement \(fictional\)|witness statement \(complainant\)|^##\s*WITNESS STATEMENTS\b|\bWITNESS\s+\d+\s*:/im,
  cctv: /\bcctv\b|cctv schedule|stills description/i,
  bwv: /\bbwv\b|body[-\s]?worn\b/i,
  cad: /\bcad\b/i,
  "999": /\b999\b|emergency services were called/i,
  interview: /\bpace interview\b|interview record\b|interview under caution\b/i,
  medical: /\bmedical report\b|hospital records\b|a&e\b|MRI\b/i,
  custody: /\bcustody record\b/i,
};

export function detectBundleDocumentTypes(text: string): string[] {
  const found: string[] = [];
  for (const [type, re] of Object.entries(BUNDLE_DOCUMENT_TYPE_PATTERNS)) {
    if (re.test(text)) found.push(type);
  }
  return found;
}
