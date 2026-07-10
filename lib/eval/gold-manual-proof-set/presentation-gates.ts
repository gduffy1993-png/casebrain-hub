/**
 * Gold Manual Proof Set — presentation gates (reporting / pack assembly only).
 * Demote generic MG6 clutter and block off-family digital court templates.
 */

export function isGenericMg6ChaseLabel(label: string): boolean {
  return /mg6c?\s*clarification|mg6\s*\/\s*unused|schedule clarification|unused material/i.test(label);
}

/** Drop generic MG6/MG6C when substantive family chase exists; else keep one as last resort. */
export function demoteGenericMg6Chase<T extends { label: string }>(items: T[]): T[] {
  const substantive = items.filter((i) => !isGenericMg6ChaseLabel(i.label));
  const generic = items.filter((i) => isGenericMg6ChaseLabel(i.label));
  if (substantive.length > 0) return substantive;
  return generic.slice(0, 1);
}

export function isDigitalFamily(familyLabel: string): boolean {
  return /phone|harassment|social|subscriber|translated|message|encro|fraud|attribution|anpr|prison call|call log/.test(
    familyLabel.toLowerCase(),
  );
}

const DIGITAL_COURT_WORDING =
  /message\/account|screenshot|subscriber attribution|phone download|handle attribution|platform extraction|message extracts|encro/i;

/** Replace digital/message/account court wording on non-digital families. */
export function gateCourtLineForFamily(familyLabel: string, courtLine: string | null): string | null {
  if (!courtLine?.trim()) return courtLine;
  if (isDigitalFamily(familyLabel)) return courtLine;
  if (!DIGITAL_COURT_WORDING.test(courtLine)) return courtLine;

  const family = familyLabel.toLowerCase();
  if (/redaction/.test(family)) {
    return "The defence asks the court to record that redaction and unredacted schedule issues remain outstanding on the current papers.";
  }
  if (/restraining|domestic order|order breach/.test(family)) {
    return "The defence asks the court to record that sealed order and service-proof material remain outstanding on the current papers.";
  }
  if (/lab|continuity|drug/.test(family)) {
    return "The defence asks the court to record that lab continuity / SFR material remains outstanding on the current papers.";
  }
  if (/medical|injury/.test(family)) {
    return "The defence asks the court to record outstanding medical report material on the current papers.";
  }
  if (/charge mismatch/.test(family)) {
    return "The defence asks the court to record that charge wording, MG5 summary, and listing dates require alignment on the current papers.";
  }
  if (/custody|pace|youth|abe|cctv|bwv|motoring|ocr|layout/.test(family)) {
    return "The defence asks the court to record outstanding disclosure items on the current papers (provisional — solicitor review required).";
  }
  return "The defence asks the court to record outstanding disclosure items on the current papers (provisional — solicitor review required).";
}

/** True when charge-mismatch slot is polluted with Encro/handle/platform surfaces. */
export function chargeMismatchLooksLikeEncro(blob: string): boolean {
  const b = blob.toLowerCase();
  const hasChargeDrift =
    /charge.*(mismatch|drift|align|wording)|mg5.*(charge|offence|summary)|listing.*(date|conflict)|hearing date/.test(b);
  const hasEncroHandle =
    /encro|handle attribution|platform\s*\/\s*source|message extracts lc\/msg/.test(b);
  return hasEncroHandle && !hasChargeDrift;
}
