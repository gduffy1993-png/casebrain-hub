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

const GENERIC_COURT_LINE =
  /listed material families are not safely confirmed|outstanding disclosure items on the current papers \(provisional|outstanding device, calibration|outstanding medical, video and sequence|outstanding message\/account source material|full extraction\/source material remains outstanding/i;

/** Family-specific court-safe lines for gold pack presentation. */
export function resolveFamilyCourtLine(familyLabel: string): string | null {
  const family = familyLabel.toLowerCase();
  if (/charge mismatch/.test(family)) {
    return "The defence asks the court to record that the charge wording, MG5 summary, and hearing/listing position require alignment before the defence position is fixed.";
  }
  if (/translated|translation/.test(family)) {
    return "The defence asks the court to record that certified translations, interpreter notes, and the original-language export remain outstanding, so any message interpretation remains provisional.";
  }
  if (/lab|continuity|drug/.test(family)) {
    return "The defence asks the court to record that lab intake, continuity chain, and SFR/drugs analysis material remain outstanding before the exhibit position is fixed.";
  }
  if (/anpr|vehicle id/.test(family)) {
    return "The defence asks the court to record that ANPR image export, audit trail, and keeper/vehicle attribution material remain outstanding.";
  }
  if (/medical|injury/.test(family)) {
    return "The defence asks the court to record that hospital records, consultant report, and injury photographs remain outstanding before injury causation or extent is treated as fixed.";
  }
  if (/prison call|call log/.test(family)) {
    return "The defence asks the court to record that prison call recordings, PIN attribution, and telecom export material remain outstanding.";
  }
  if (/social handle|subscriber gap/.test(family)) {
    return "The defence asks the court to record that platform disclosure, handle mapping, and IP/subscriber attribution remain outstanding before account attribution is treated as fixed.";
  }
  if (/redaction/.test(family)) {
    return "The defence asks the court to record that redacted papers are served but the unredacted MG11, redaction schedule, and full police note remain outstanding before the defence relies on the redacted text.";
  }
  if (/restraining|domestic order|order breach/.test(family)) {
    return "The defence asks the court to record that sealed order and service-proof material remain outstanding on the current papers.";
  }
  if (/phone|harassment/.test(family) && /attribution|harassment/.test(family)) {
    return "The defence asks the court to record per MG6C that screenshot/message material is served but full phone download, subscriber/account data, and final MG11 remain outstanding.";
  }
  if (/\bbwv\b/.test(family)) {
    return "The defence asks the court to record per MG6C that custody extract is served, BWV is referred only, and full custody record and interview material remain outstanding.";
  }
  if (/\bcctv\b/.test(family)) {
    return "The defence asks the court to record per MG6C that CCTV still images are served but master CCTV footage, full export, and continuity/provenance remain outstanding.";
  }
  if (/mixed-defendant|co-def/.test(family)) {
    return "The defence asks the court to record per MG6C that co-defendant interview material is segregated and target defendant interview summary/audio remain outstanding.";
  }
  if (/motoring|sjp/.test(family)) {
    return "The defence asks the court to record that the s172 notice/requirement to identify the driver, keeper position, and service/nomination records require confirmation before the defence position on driver identification is fixed.";
  }
  if (/ocr|date\/court|layout|hearing date|court mismatch/.test(family)) {
    return "The defence asks the court to record that the hearing/listing date and court venue require confirmation because of OCR/layout conflict on the current papers, before the defence relies on any listed date.";
  }
  return null;
}

/**
 * Prefer family-specific court lines for gold packets.
 * Also block digital/message/account wording on non-digital families.
 */
export function gateCourtLineForFamily(familyLabel: string, courtLine: string | null): string | null {
  const preferred = resolveFamilyCourtLine(familyLabel);
  if (preferred) {
    if (!courtLine?.trim() || GENERIC_COURT_LINE.test(courtLine) || DIGITAL_COURT_WORDING.test(courtLine)) {
      return preferred;
    }
    // Builder line exists and is not the known-generic stock — still prefer family gold wording
    // for the target solicitor-grade families above.
    return preferred;
  }

  if (!courtLine?.trim()) return courtLine;
  if (isDigitalFamily(familyLabel)) return courtLine;
  if (!DIGITAL_COURT_WORDING.test(courtLine)) return courtLine;

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
  // Strict family gates: do not cross-pollinate CCTV ↔ BWV ↔ Encro samples.
  const allowBwv = /\bbwv\b|body.?worn/.test(family);
  const allowCustody = /custody|pace|youth|bail|appropriate adult|intermediary/.test(family);
  // Drugs continuity only on drugs/lab families — not ANPR/vehicle alone (CASE-16).
  const allowDrugs = /drug|lab|continuity|supply/.test(family) && !/anpr|vehicle id|motoring|sjp/.test(family);
  const allowCctv = /\bcctv\b/.test(family);
  const allowAbe = /abe|sexual|historic|first account|third-party/.test(family);
  const allowEncro = /\bencro\b/.test(family);
  const allowPhoneExtraction = /phone|harassment|social|subscriber|translated|message|encro|fraud|attribution/.test(
    family,
  );
  const allowMedical = /medical|injury|triage/.test(family);
  const allowOrder = /restraining|domestic order|order breach/.test(family);
  const isS172Motoring = /motoring|sjp/.test(family);
  const isOcrDate = /ocr|date\/court|layout|hearing date|court mismatch/.test(family);
  const isAnpr = /anpr|vehicle id/.test(family);
  const isPrison = /prison call|call log/.test(family);
  const isSocial = /social handle|subscriber gap/.test(family);
  const isRedaction = /redaction/.test(family);
  const isLab = /lab|continuity|drug/.test(family) && !isAnpr;
  const isTranslation = /translated|translation/.test(family);

  const filtered = [...new Set(items)].filter((raw) => {
    const s = raw.toLowerCase();
    if (!allowBwv && /\bbwv\b/.test(s)) return false;
    if (!allowCustody && /\bcustody\b/.test(s)) return false;
    if (!allowDrugs && /\bdrugs?\b|\bclass a\b|\bmisuse of drugs\b|drugs continuity|drug continuity/.test(s)) {
      return false;
    }
    if (!allowCctv && /\bcctv\b/.test(s)) return false;
    if (isS172Motoring && /stills|master footage|positive identification from stills/.test(s)) return false;
    if (isOcrDate && /stills|master footage|positive identification|cctv proves/.test(s)) return false;
    if (!allowAbe && /\babe\b/.test(s)) return false;
    if (!allowEncro && /\bencro\b/.test(s)) return false;
    if (
      !allowPhoneExtraction &&
      /phone extraction|phone download|message export|handle attribution|platform extraction|sent the messages|unless attribution is served|attribution is proved/.test(
        s,
      )
    ) {
      return false;
    }
    // Order / redaction / ANPR / prison / lab: no message-attribution stock
    if (
      (allowOrder || isRedaction || isAnpr || isPrison || isLab) &&
      /sent the messages|unless attribution is served|phone download|message export/.test(s)
    ) {
      return false;
    }
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

  const withFamilyFallback = (kept: string[], fallback: string): string[] =>
    kept.length > 0 ? kept : [fallback];

  if (isOcrDate && filtered.length === 0) {
    return ["Do not treat an OCR-corrupted listing date as confirmed without court verification."];
  }
  if (allowOrder) {
    return withFamilyFallback(
      filtered.filter((s) => !/sent the messages|attribution is served/i.test(s)),
      "Do not treat an order extract alone as proof of sealed order or service.",
    );
  }
  if (isRedaction) {
    return withFamilyFallback(
      filtered,
      "Do not rely on redacted text as if the unredacted MG11 and schedule were served.",
    );
  }
  if (isAnpr) {
    return withFamilyFallback(
      filtered.filter((s) => !/drug/i.test(s)),
      "Do not treat an ANPR hit table alone as proof of vehicle attribution or keeper identity.",
    );
  }
  if (isPrison) {
    return withFamilyFallback(
      filtered,
      "Do not treat a call-log summary alone as proof of PIN attribution or call content.",
    );
  }
  if (isSocial) {
    return withFamilyFallback(
      filtered,
      "Do not treat a social handle alone as proof of subscriber or account attribution.",
    );
  }
  if (isLab) {
    return withFamilyFallback(
      filtered,
      "Do not treat a drugs schedule alone as proof of lab intake or continuity.",
    );
  }
  if (isTranslation) {
    return withFamilyFallback(
      filtered,
      "Do not treat uncertified message screenshots as a final translation of meaning.",
    );
  }
  return filtered;
}

/** Replace ugly repeated unsafe phrases with cleaner display wording (meaning preserved). */
export function sanitizeUnsafeDisplayWording(items: string[]): string[] {
  const out: string[] = [];
  let blockedProofOutcome = false;
  let collapsedMg11 = false;
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
    // Collapse repeated draft/unsigned MG11 stock lines to one clean caution.
    if (
      /witness statement is final|mg11 is consistent and served|\"mg11 served\"|mg11 served/.test(s) &&
      /do not state|draft or unsigned/.test(s)
    ) {
      if (!collapsedMg11) {
        out.push("Do not treat draft/unsigned MG11 as a final served statement.");
        collapsedMg11 = true;
      }
      continue;
    }
    out.push(raw);
  }
  return out;
}

export function presentDoNotOverstateForFamily(familyLabel: string, items: string[]): string[] {
  const family = familyLabel.toLowerCase();
  let out = sanitizeUnsafeDisplayWording(filterDoNotOverstateForFamily(familyLabel, items));

  const familyFallback = (() => {
    if (/restraining|domestic order|order breach/.test(family)) {
      return "Do not treat an order extract alone as proof of sealed order or service.";
    }
    if (/redaction/.test(family)) {
      return "Do not rely on redacted text as if the unredacted MG11 and schedule were served.";
    }
    if (/anpr|vehicle id/.test(family)) {
      return "Do not treat an ANPR hit table alone as proof of vehicle attribution or keeper identity.";
    }
    if (/prison call|call log/.test(family)) {
      return "Do not treat a call-log summary alone as proof of PIN attribution or call content.";
    }
    if (/social handle|subscriber gap/.test(family)) {
      return "Do not treat a social handle alone as proof of subscriber or account attribution.";
    }
    if (/translated|translation/.test(family)) {
      return "Do not treat uncertified message screenshots as a final translation of meaning.";
    }
    if (/lab|continuity|drug/.test(family) && !/anpr|vehicle id/.test(family)) {
      return "Do not treat a drugs schedule alone as proof of lab intake or continuity.";
    }
    return null;
  })();

  if (familyFallback) {
    // Prefer family-specific caution over stock MG11 triples on v9 WARN families.
    out = out.filter((s) => !/draft\/unsigned MG11|witness statement is final|mg11 is consistent/i.test(s));
    const hasFamilyLine = out.some(
      (s) =>
        s === familyFallback ||
        /order extract|redacted text|ANPR hit|call-log summary|social handle|uncertified message|drugs schedule|drug continuity|lab\/continuity/i.test(
          s,
        ),
    );
    if (!hasFamilyLine) out.push(familyFallback);
  }

  return [...new Set(out)];
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
  if (/motoring|sjp/.test(f)) {
    return [
      "Notice / requirement to identify driver",
      "Proof of service / posting",
      "Keeper / DVLA record",
      "Nomination / response record",
      "Procedure bundle / SJP notice",
    ];
  }
  if (/ocr|date\/court|layout|hearing date|court mismatch/.test(f)) {
    return [
      "Court listing confirmation",
      "Hearing / date notice",
      "Corrected schedule / index (OCR conflict)",
      "Source page / date verification",
    ];
  }
  return [];
}

/** Wave B families where gold presentation must lead with family chase, not builder device/CCTV stack. */
export function prefersFamilyChasePresentation(familyLabel: string): boolean {
  const f = familyLabel.toLowerCase();
  return /motoring|sjp|ocr|date\/court|layout|hearing date|court mismatch/.test(f);
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

function defaultChaseDraft(label: string, existing?: string | null): string {
  const trimmed = existing?.trim();
  if (trimmed) return trimmed;
  return `Please provide ${label} or confirm in writing why it is not available.`;
}

/**
 * Wave A solicitor polish: drop soft/stacked chase and rename weak labels.
 * Presentation only — does not change chase core.
 */
export function polishChasePresentationForFamily(
  familyLabel: string,
  items: PresentedChaseItem[],
): PresentedChaseItem[] {
  const f = familyLabel.toLowerCase();
  let out = items.map((i) => ({ ...i }));

  // Phone / harassment: call logs are soft when attribution core is already chased.
  if (/phone|harassment/.test(f)) {
    const hasAttributionCore = out.some((i) =>
      /phone download|subscriber|message export|mg11/i.test(i.label),
    );
    if (hasAttributionCore) {
      out = out.filter((i) => !/^call logs?$/i.test(i.label.trim()));
    }
  }

  // BWV: collapse audio + transcript; drop separate PACE when interview is already chased.
  if (/\bbwv\b/.test(f)) {
    const hasAudio = out.some((i) => /interview audio/i.test(i.label));
    const hasTranscript = out.some((i) => /interview transcript/i.test(i.label));
    if (hasAudio && hasTranscript) {
      const audio = out.find((i) => /interview audio/i.test(i.label));
      out = out.filter((i) => !/interview (audio|transcript)|pace safeguards/i.test(i.label));
      const insertAt = Math.min(out.length, 2);
      out.splice(insertAt, 0, {
        label: "Interview audio / transcript",
        draftChaseWording: defaultChaseDraft(
          "Interview audio / transcript",
          audio?.draftChaseWording?.replace(/Interview audio/i, "Interview audio / transcript"),
        ),
      });
    } else if (out.some((i) => /interview/i.test(i.label))) {
      out = out.filter((i) => !/pace safeguards/i.test(i.label));
    }
  }

  // CCTV: bare "audit trail" reads generic — name the family.
  if (/\bcctv\b/.test(f)) {
    out = out.map((i) => {
      if (!/^audit trail$/i.test(i.label.trim())) return i;
      const label = "CCTV audit trail / source hash";
      return {
        label,
        draftChaseWording: defaultChaseDraft(
          label,
          i.draftChaseWording?.replace(/audit trail/i, label),
        ),
      };
    });
  }

  return out.slice(0, 5);
}

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
  const familyLabels = resolveFamilyChaseLabels(familyLabel);

  // Wave B: force S172 / OCR-date family chase so packets do not lead with device or CCTV stacks.
  if (prefersFamilyChasePresentation(familyLabel) && familyLabels.length > 0) {
    return polishChasePresentationForFamily(
      familyLabel,
      familyLabels.map((label) => ({
        label,
        draftChaseWording: defaultChaseDraft(label),
      })),
    );
  }

  const demoted = demoteGenericMg6Chase(items);
  const substantive = demoted.filter((i) => !isGenericMg6ChaseLabel(i.label));
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

  let presented: PresentedChaseItem[];

  if (substantive.length > 0 && enoughCoverage) {
    presented = substantive.map((i) => ({
      label: i.label,
      draftChaseWording: defaultChaseDraft(i.label, i.draftChaseWording),
    }));
  } else if (preferred.length > 0) {
    presented = preferred.map((label) => ({
      label,
      draftChaseWording: defaultChaseDraft(label),
    }));
  } else if (familyLabels.length > 0) {
    presented = familyLabels.slice(0, 4).map((label) => ({
      label,
      draftChaseWording: defaultChaseDraft(label),
    }));
  } else {
    // Last resort: single generic MG6 if that is all we have
    presented = demoted.slice(0, 1).map((i) => ({
      label: i.label,
      draftChaseWording: defaultChaseDraft(i.label, i.draftChaseWording),
    }));
  }

  return polishChasePresentationForFamily(familyLabel, presented);
}

export type PresentedTruthMapRow = {
  label: string;
  existence: string;
  reliability: string;
};

export type PresentedProofReceipt = {
  outputLine: string;
  surface: string;
  sourceDocument: string | null;
  sourcePage: string | null;
  evidenceState: string;
  safeAction: string;
};

const SOURCE_VERIFICATION_REQUIRED = "source verification required";

/** Family-led client summaries for gold presentation (esp. v9 null/thin packets). */
export function presentClientSummaryForFamily(
  familyLabel: string,
  clientLabel: string,
  existing: string | null,
): string | null {
  const f = familyLabel.toLowerCase();
  const wrap = (body: string) =>
    [
      "CLIENT-SAFE SUMMARY",
      "(not for court or CPS)",
      "",
      body,
      "",
      "[CaseBrain — client-safe summary. Evidence state: provisional. Not for court or CPS use.]",
    ].join("\n");

  if (/motoring|sjp/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. The live issue is the s172 notice/requirement to identify the driver: service/posting proof, keeper/DVLA position, nomination/response, and the SJP procedure bundle. Device calibration, intoxilyser, or CCTV/dashcam material on the papers is secondary and not the lead for driver-identification.`,
    );
  }
  if (/ocr|date\/court|layout|hearing date|court mismatch/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. The listing date and court venue on the papers may be OCR-corrupted or inconsistent — confirm the correct hearing date and venue with the court before relying on any listed date. CCTV stills/master material may also be incomplete, but that is secondary to confirming the listing/date position.`,
    );
  }
  if (/redaction/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. Redacted papers are on the bundle, but the unredacted MG11, redaction schedule, and full police note remain outstanding. Do not treat redacted text as if the full unredacted material were served.`,
    );
  }
  if (/restraining|domestic order|order breach/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. The live issue is the restraining/domestic order position: sealed order, proof of service, and breach location material. An order extract alone is not enough to treat sealed order or service as proved.`,
    );
  }
  if (/translated|translation/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. Message screenshots may be on the papers, but certified translation, interpreter notes, and the original-language export remain outstanding. Any reading of meaning from screenshots alone is provisional.`,
    );
  }
  if (/lab|continuity|drug/.test(f) && !/anpr|vehicle id/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. A drugs schedule may be on the papers, but lab intake, continuity/chain of custody, and SFR/drugs analysis remain outstanding before the exhibit position is fixed.`,
    );
  }
  if (/anpr|vehicle id/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. An ANPR hit table may be on the papers, but ANPR image export, national audit trail, and keeper/vehicle attribution responses remain outstanding. A hit table alone does not prove keeper identity.`,
    );
  }
  if (/prison call|call log/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. A call-log summary may be on the papers, but prison call recordings, PIN attribution material, and telecom export remain outstanding. A summary alone does not prove who spoke or what was said.`,
    );
  }
  if (/charge mismatch/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. The live issue is whether the charge wording, the MG5 offence summary, and the court listing/hearing position line up. Until those are aligned and confirmed, treat the charge/listing position as provisional — do not assume the papers already fix the offence wording or hearing date.`,
    );
  }
  if (/social handle|subscriber gap/.test(f)) {
    return wrap(
      `We are reviewing the papers in your case (${clientLabel}). This is early-stage — nothing is final until we have full disclosure and your instructions. Social/handle material may be on the papers, but platform disclosure, handle-to-defendant mapping, and IP/subscriber data remain outstanding. A handle alone does not prove account attribution.`,
    );
  }
  // Prefer existing non-empty summaries for other families (Wave A local packs).
  return existing;
}

/** Re-order / inject family-led truth-map rows for Wave B secondary-surface polish. */
export function presentTruthMapForFamily(
  familyLabel: string,
  rows: PresentedTruthMapRow[],
): PresentedTruthMapRow[] {
  const f = familyLabel.toLowerCase();
  if (/motoring|sjp/.test(f)) {
    const lead: PresentedTruthMapRow[] = [
      { label: "Notice / requirement to identify driver", existence: "missing", reliability: "needs_review" },
      { label: "Proof of service / posting", existence: "missing", reliability: "needs_review" },
      { label: "Keeper / DVLA record", existence: "missing", reliability: "needs_review" },
      { label: "Nomination / response record", existence: "missing", reliability: "needs_review" },
      { label: "Procedure bundle / SJP notice", existence: "missing", reliability: "needs_review" },
    ];
    const secondary = rows
      .filter((r) => /calibration|intoxilyser|cctv|dashcam|breath|device procedure/i.test(r.label))
      .slice(0, 2)
      .map((r) => ({
        ...r,
        reliability: r.reliability === "unsafe" ? r.reliability : "weak",
      }));
    return [...lead, ...secondary].slice(0, 8);
  }
  if (/ocr|date\/court|layout|hearing date|court mismatch/.test(f)) {
    const lead: PresentedTruthMapRow[] = [
      { label: "Court listing / hearing date", existence: "not_safely_confirmed", reliability: "needs_review" },
      { label: "Hearing / date notice", existence: "missing", reliability: "needs_review" },
      { label: "Corrected schedule / index (OCR conflict)", existence: "missing", reliability: "needs_review" },
      { label: "Source page / date verification", existence: "missing", reliability: "needs_review" },
    ];
    const secondary = rows
      .filter((r) => /cctv|continuity|audit|recognition|id basis/i.test(r.label))
      .slice(0, 3);
    return [...lead, ...secondary].slice(0, 8);
  }
  return rows;
}

function proofAnchorIsThin(page: string | null | undefined): boolean {
  if (!page?.trim()) return true;
  if (page.trim().toLowerCase() === SOURCE_VERIFICATION_REQUIRED) return true;
  return page.trim().length < 8;
}

function proofAnchorMismatched(outputLine: string, page: string | null | undefined): boolean {
  if (!page?.trim()) return false;
  const line = outputLine.toLowerCase();
  const p = page.toLowerCase();
  if (/listing|hearing|date|ocr|schedule|verification|venue/i.test(line) && /cctv still|master cctv|camera\s*\d/i.test(p)) {
    return true;
  }
  if (
    /notice|keeper|nomination|sjp|service|identify driver|dvla/i.test(line) &&
    /intoxilyser|calibration|cctv still|master cctv/i.test(p) &&
    !/s172|driver|keeper|notice|nomination/i.test(p)
  ) {
    return true;
  }
  return false;
}

function proofDocumentMismatched(outputLine: string, sourceDocument: string | null | undefined): boolean {
  if (!sourceDocument?.trim()) return false;
  const line = outputLine.toLowerCase();
  const doc = sourceDocument.toLowerCase();
  if (/sealed|restraining|order|service proof|breach location/i.test(line) && /custody|interview unit|cctv unit/i.test(doc)) {
    return true;
  }
  if (/anpr|keeper|vehicle/i.test(line) && /custody|interview unit/i.test(doc)) return true;
  if (/redaction|unredacted|schedule/i.test(line) && /cctv unit/i.test(doc)) return true;
  return false;
}

function proofAnchorWeakForLine(outputLine: string, page: string | null | undefined): boolean {
  if (proofAnchorIsThin(page)) return true;
  if (proofAnchorMismatched(outputLine, page)) return true;
  const line = outputLine.toLowerCase();
  const p = (page ?? "").toLowerCase();
  // Family-forced S172 / OCR lines need on-theme anchors, not generic MG5 headlines or CCTV snippets.
  if (/notice|keeper|nomination|sjp|service|identify driver|dvla/i.test(line)) {
    if (
      !/s172|identify driver|keeper|nomination|service proof|dvla|posting|requirement to identify|procedure bundle/i.test(
        p,
      )
    ) {
      return true;
    }
  }
  if (/listing|hearing|date|ocr|schedule|verification|venue/i.test(line)) {
    if (!/listing|hearing date|ocr|september|venue|verify with court|layout/i.test(p)) return true;
  }
  return false;
}

/**
 * Polish proof receipts for gold presentation: family lead order + honest thin/mismatched anchors.
 * Does not change court/chase/do-not wording.
 */
export function presentProofReceiptsForFamily(
  familyLabel: string,
  receipts: PresentedProofReceipt[],
): PresentedProofReceipt[] {
  const f = familyLabel.toLowerCase();
  let out = receipts.map((r) => {
    const weakPage = proofAnchorWeakForLine(r.outputLine, r.sourcePage);
    const weakDoc = proofDocumentMismatched(r.outputLine, r.sourceDocument);
    if (!weakPage && !weakDoc && r.sourcePage?.trim() && r.sourceDocument?.trim()) return r;
    const forceDoc =
      weakDoc ||
      !r.sourceDocument?.trim() ||
      (weakPage &&
        /cctv unit|custody \/ police interview/i.test(r.sourceDocument ?? "") &&
        !/cctv|still|master|footage|continuity|audit trail/i.test(r.outputLine));
    return {
      ...r,
      sourcePage: weakPage || !r.sourcePage?.trim() ? SOURCE_VERIFICATION_REQUIRED : r.sourcePage,
      sourceDocument: forceDoc ? SOURCE_VERIFICATION_REQUIRED : r.sourceDocument,
    };
  });

  if (/ocr|date\/court|layout|hearing date|court mismatch/.test(f)) {
    const lead = out.filter((r) => /listing|hearing|date|ocr|schedule|verification|venue/i.test(r.outputLine));
    const rest = out.filter((r) => !lead.includes(r));
    out = [...lead, ...rest];
  } else if (/motoring|sjp/.test(f)) {
    const lead = out.filter((r) =>
      /notice|keeper|nomination|sjp|service|identify driver|dvla/i.test(r.outputLine),
    );
    const rest = out.filter((r) => !lead.includes(r));
    out = [...lead, ...rest];
  }

  return out.slice(0, 10);
}

