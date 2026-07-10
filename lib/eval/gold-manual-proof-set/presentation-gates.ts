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
    return "The defence asks the court to record that redaction and unredacted schedule issues remain outstanding on the current papers.";
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
  const allowDrugs = /drug|lab|continuity|supply|anpr|vehicle/.test(family);
  const allowCctv = /\bcctv\b|anpr|motoring/.test(family);
  const allowAbe = /abe|sexual|historic|first account|third-party/.test(family);
  const allowEncro = /\bencro\b/.test(family);
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
    if (!allowEncro && /\bencro\b/.test(s)) return false;
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
