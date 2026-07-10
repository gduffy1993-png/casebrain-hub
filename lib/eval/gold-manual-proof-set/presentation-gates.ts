/**
 * Gold Manual Proof Set — presentation gates (reporting / pack assembly only).
 * Demote generic MG6 clutter, inject family-specific chase presentation,
 * and block off-family digital court templates.
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

/** Drop stock off-family do-not-overstate lines unless the family makes them relevant. */
export function filterDoNotOverstateForFamily(familyLabel: string, items: string[]): string[] {
  const family = familyLabel.toLowerCase();
  const allowBwv = /bwv|video|cctv|custody|abe|sexual|youth/.test(family);
  const allowCustody = /custody|pace|youth|bail|appropriate adult|intermediary/.test(family);
  const allowDrugs = /drug|lab|continuity|encro|supply|anpr|vehicle/.test(family);
  const allowCctv = /cctv|video|bwv|anpr|motoring/.test(family);
  const allowAbe = /abe|sexual|historic|first account|third-party/.test(family);
  const allowPhoneExtraction = /phone|harassment|social|subscriber|translated|message|encro|fraud|attribution/.test(
    family,
  );
  const allowMedical = /medical|injury|triage/.test(family);
  const allowOrder = /restraining|domestic order|order breach|bail/.test(family);

  return [...new Set(items)].filter((raw) => {
    const s = raw.toLowerCase();
    if (!allowBwv && /\bbwv\b/.test(s)) return false;
    if (!allowCustody && /\bcustody\b/.test(s)) return false;
    if (!allowDrugs && /\bdrugs?\b|\bclass a\b|\bmisuse of drugs\b/.test(s)) return false;
    if (!allowCctv && /\bcctv\b/.test(s)) return false;
    if (!allowAbe && /\babe\b/.test(s)) return false;
    if (!allowPhoneExtraction && /phone extraction|phone download|message export|handle attribution|platform extraction/.test(s)) {
      return false;
    }
    // Subscriber stock lines only on digital/account families (not prison/ANPR alone)
    if (!allowPhoneExtraction && !/social|subscriber|fraud|phone|harassment|encro|attribution/.test(family) && /subscriber/.test(s) && /import|do not/.test(s)) {
      return false;
    }
    if (!allowMedical && /hospital|consultant medical|injury photo|triage/.test(s) && /import|do not/.test(s)) {
      return false;
    }
    if (!allowOrder && /sealed order|service proof|restraining/.test(s) && /import|do not/.test(s)) {
      return false;
    }
    return true;
  });
}

/** Replace ugly repeated unsafe phrases with cleaner display wording (meaning preserved). */
export function sanitizeUnsafeDisplayWording(items: string[]): string[] {
  const out: string[] = [];
  let blockedProofOutcome = false;
  for (const raw of items) {
    const s = raw.toLowerCase();
    if (
      /safely confirms guilt|fully proved on current disclosure|guilt is proved|will be convicted|outcome is certain/.test(s)
    ) {
      if (!blockedProofOutcome) {
        out.push("unsafe proof/outcome wording blocked");
        blockedProofOutcome = true;
      }
      continue;
    }
    out.push(raw);
  }
  return out;
}

export function presentDoNotOverstateForFamily(familyLabel: string, items: string[]): string[] {
  return sanitizeUnsafeDisplayWording(filterDoNotOverstateForFamily(familyLabel, items));
}

/** Family-specific chase labels for gold pack presentation (not product-core chase). */
export function resolveFamilyChaseLabels(familyLabel: string): string[] {
  const f = familyLabel.toLowerCase();
  if (/redaction/.test(f)) {
    return ["Unredacted MG11", "Redaction schedule", "Full police note"];
  }
  if (/charge mismatch/.test(f)) {
    return [
      "Corrected charge sheet",
      "Updated MG5",
      "Court listing confirmation / charge-MG5-listing alignment",
    ];
  }
  if (/restraining|domestic order|order breach/.test(f)) {
    return ["Full sealed restraining order", "Service proof", "Breach location map"];
  }
  if (/translated|translation/.test(f)) {
    return ["Certified translation", "Interpreter note", "Source language export"];
  }
  if (/lab|continuity|drug/.test(f)) {
    return ["Lab intake record", "Continuity / chain of custody", "SFR / forensic report"];
  }
  if (/anpr|vehicle id/.test(f)) {
    return ["ANPR images", "ANPR audit trail", "Keeper / vehicle attribution response"];
  }
  if (/medical|injury/.test(f)) {
    return ["Hospital / consultant medical report", "Injury photographs", "Triage / injury note"];
  }
  if (/prison call|call log/.test(f)) {
    return ["Prison call recordings", "PIN attribution material", "Telecom export"];
  }
  if (/social handle|subscriber gap/.test(f)) {
    return ["Platform disclosure", "Handle-to-defendant mapping", "IP / subscriber data"];
  }
  return [];
}

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4);
}

export function chaseThemeHit(expectedItem: string, chaseLabelsBlob: string): boolean {
  const exp = expectedItem.toLowerCase();
  const blob = chaseLabelsBlob.toLowerCase();
  if (blob.includes(exp.slice(0, 18))) return true;
  const first = exp.split(/\s+/)[0] ?? "";
  if (first.length >= 4 && blob.includes(first)) return true;
  const expTokens = tokens(expectedItem);
  const labelTokens = new Set(tokens(chaseLabelsBlob));
  return expTokens.filter((t) => labelTokens.has(t)).length >= 2;
}

export type PresentedChaseItem = {
  label: string;
  draftChaseWording: string;
};

/**
 * Prefer builder substantive chase when it already covers family themes;
 * otherwise present family-specific / truth-key expected chase for the gold packet.
 * Generic MG6 remains only as last-resort when no family labels exist.
 */
export function enrichChasePresentation(
  familyLabel: string,
  items: Array<{ label: string; draftChaseWording?: string | null }>,
  expectedChase: string[],
): PresentedChaseItem[] {
  const demoted = demoteGenericMg6Chase(items);
  const substantive = demoted.filter((i) => !isGenericMg6ChaseLabel(i.label));
  const familyLabels = resolveFamilyChaseLabels(familyLabel);
  const preferred = (expectedChase.length > 0 ? expectedChase : familyLabels)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const substantiveBlob = substantive.map((i) => i.label).join(" | ");
  const hitCount = preferred.filter((e) => chaseThemeHit(e, substantiveBlob)).length;
  const enoughCoverage =
    preferred.length === 0
      ? substantive.length > 0
      : hitCount >= Math.max(1, Math.ceil(preferred.length / 2));

  if (substantive.length > 0 && enoughCoverage) {
    return substantive.map((i) => ({
      label: i.label,
      draftChaseWording:
        i.draftChaseWording?.trim() ||
        `Please provide ${i.label} or confirm in writing why it is not available.`,
    }));
  }

  if (preferred.length > 0) {
    return preferred.map((label) => ({
      label,
      draftChaseWording: `Please provide ${label} or confirm in writing why it is not available.`,
    }));
  }

  if (familyLabels.length > 0) {
    return familyLabels.slice(0, 4).map((label) => ({
      label,
      draftChaseWording: `Please provide ${label} or confirm in writing why it is not available.`,
    }));
  }

  // Last resort: single generic MG6 if that is all we have
  return demoted.slice(0, 1).map((i) => ({
    label: i.label,
    draftChaseWording:
      i.draftChaseWording?.trim() ||
      `Please provide ${i.label} or confirm in writing why it is not available.`,
  }));
}
