import type { FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import type { FamilyProofCard, FamilyProofCardId } from "@/lib/criminal/proof-receipt/types";
import {
  dedupeSolicitorLines,
  sanitizeSolicitorVisibleText,
} from "@/lib/criminal/solicitor-display-dedupe";

export { sanitizeSolicitorVisibleText } from "@/lib/criminal/solicitor-display-dedupe";

function isDigitalHarassmentContext(bundleHay: string, allegation: string): boolean {
  const hay = `${allegation} ${bundleHay}`.toLowerCase();
  return (
    /harassment|protection from harassment/i.test(hay) &&
    /screenshot|phone|message|whatsapp|sms|subscriber|attribution|mg6|mg11|extraction|digital|handset/i.test(
      hay,
    )
  );
}

export function dedupePresentationLines(lines: string[]): string[] {
  return dedupeSolicitorLines(lines);
}

export function dedupeEvidenceRowsByLabel(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  const seen = new Set<string>();
  const out: FiveAnswersEvidenceRow[] = [];
  for (const row of rows) {
    const key = row.label.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

const FAMILY_BUNDLE_REQUIREMENTS: Record<FamilyProofCardId, RegExp> = {
  phone_attribution: /phone|subscriber|handset|whatsapp|sms|message|extraction|screenshot|attribution/i,
  cctv_stills_vs_master: /\bcctv\b|stills|footage|camera/i,
  bwv_referred_only: /bwv|body[-\s]?worn|bodycam/i,
  co_defendant_only: /co-?defendant|other defendant|joint enterprise|wrong defendant/i,
  youth_safeguards: /youth|yjs|appropriate adult|under 18|vulnerability assessment/i,
  medical_report_missing: /medical|injury|gbh|fme|triage|hospital/i,
  encro_handle: /encro|handle mapping|platform extraction|shadow-/i,
  motoring_calibration:
    /breath|intoxilyser|intox|specimen analysis|speed(?:ing)?|road traffic|drink.?drive|calibration certificate|dangerous driving|motoring/i,
  bail_restraining_order: /bail|restraining order|non-molestation|dvpo|breach of bail/i,
  expert_evidence_missing: /expert|forensic|dna|fingerprint|cell site|pathology|sfr|lab report/i,
};

function bundleHaySupportsFamily(id: FamilyProofCardId, bundleHay: string, allegation: string): boolean {
  const context = `${allegation} ${bundleHay}`.toLowerCase();
  const required = FAMILY_BUNDLE_REQUIREMENTS[id];
  if (!required.test(context)) return false;

  if (id === "motoring_calibration") {
    const motoringCue =
      /breath|intoxilyser|intox|specimen|speed(?:ing)?|road traffic|drink.?drive|motoring|dangerous driving/i.test(
        context,
      );
    if (!motoringCue) return false;
  }

  if (id === "medical_report_missing" && isDigitalHarassmentContext(bundleHay, allegation)) {
    if (!/injury|gbh|assault|medical|hospital|triage|fme/i.test(context)) return false;
  }

  if (id === "encro_handle" && isDigitalHarassmentContext(bundleHay, allegation)) {
    if (!/encro|handle mapping|platform extraction|shadow-/i.test(context)) return false;
  }

  return true;
}

/** Drop family review cards when bundle/charge shape does not support that material family. */
export function filterFamilyProofCardsForBundle(
  cards: FamilyProofCard[],
  bundleHay: string,
  allegation = "",
): FamilyProofCard[] {
  const seen = new Set<FamilyProofCardId>();
  const out: FamilyProofCard[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    if (!bundleHaySupportsFamily(card.id, bundleHay, allegation)) continue;
    seen.add(card.id);
    out.push({
      ...card,
      whyShown: sanitizeSolicitorVisibleText(card.whyShown),
      safeSummary: sanitizeSolicitorVisibleText(card.safeSummary),
      linkedLabels: card.linkedLabels.map((label) => sanitizeSolicitorVisibleText(label)),
    });
  }
  return out.slice(0, 6);
}

export function gapEvidenceRows(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  return rows.filter((r) =>
    ["referred_only", "missing", "unknown", "not_safely_confirmed"].includes(r.existence),
  );
}

export function servedEvidenceRows(rows: FiveAnswersEvidenceRow[]): FiveAnswersEvidenceRow[] {
  return rows.filter((r) => r.existence === "served");
}

export function countEvidenceStates(rows: FiveAnswersEvidenceRow[]): {
  served: number;
  referred: number;
  missing: number;
} {
  let served = 0;
  let referred = 0;
  let missing = 0;
  for (const row of rows) {
    if (row.existence === "served") served += 1;
    else if (row.existence === "referred_only") referred += 1;
    else if (row.existence === "missing" || row.existence === "unknown" || row.existence === "not_safely_confirmed") {
      missing += 1;
    }
  }
  return { served, referred, missing };
}

/** Short solicitor-facing status — prefer one provisional badge; do not surface "Needs review" stack. */
export function overviewStatusLabel(level: string | null | undefined): {
  label: string;
  variant: "success" | "warning" | "secondary" | "danger";
} {
  switch (level) {
    case "safe":
      return { label: "Source-linked", variant: "success" };
    case "provisional":
    case "needs_review":
      return { label: "Provisional — source-linked", variant: "secondary" };
    case "blocked":
      return { label: "Blocked — review required", variant: "danger" };
    default:
      return { label: "Provisional — source-linked", variant: "secondary" };
  }
}

/** Cap blocked wording examples for the Overview safe-wording card. */
export function overviewBlockedExamples(lines: string[], max = 2): string[] {
  return dedupePresentationLines(lines).slice(0, max);
}

/**
 * Risk Flags pointer — keep Not Safe to Say as the detailed block; avoid repeating those lines.
 */
export function overviewRiskFlagPointers(notSafeLines: string[]): string[] {
  if (!notSafeLines.length) return [];
  const hay = notSafeLines.join(" ").toLowerCase();
  if (/attribution|mg11|witness statement|message/i.test(hay)) {
    return ["Attribution and MG11 status need review — see Not safe to say."];
  }
  return ["Wording risks need review — see Not safe to say."];
}
