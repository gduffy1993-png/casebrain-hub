/**
 * Shared labelled smoke-pack / front-sheet extractor.
 *
 * Only explicit `Label: value` fields are trusted facts. Narrative names,
 * witness lines, and demo-title matching are ignored. Output stays provisional.
 */

export type SmokePackFrontSheet = {
  detected: boolean;
  defendantName: string | null;
  caseTitle: string | null;
  court: string | null;
  stage: string | null;
  courtStage: string | null;
  exactChargeWording: string | null;
  offenceFamily: string | null;
  proofPressure: string | null;
  outstandingMaterial: string | null;
  outstandingItems: string[];
  solicitorReviewRequired: boolean;
  provisional: true;
};

export type SmokePackChaseDraft = {
  id: string;
  label: string;
  whyItMatters: string;
  evidenceAnchor: string;
  draftChaseWording: string;
};

const NEXT_LABEL_RE = /^[A-Z][A-Za-z0-9 /.&'-]{1,48}:\s+\S/;
const STOP_CONTINUATION_RE =
  /^(?:FICTIONAL|COVER|CHARGE|MG5|MG6|INTERVIEW|PAGE|CaseBrain|This |If |Solicitor|Safe strategy|Helpful|Crown version|Key evidence|Served material|=====)\b/i;

function normalizeScan(text: string): string {
  return (text ?? "")
    .replace(/\r/g, "\n")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#+\s+/gm, "");
}

function cleanValue(raw: string): string | null {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t || t.length < 2) return null;
  if (/^(?:n\/a|none|unknown|—|-|\?)$/i.test(t)) return null;
  return t.length > 400 ? `${t.slice(0, 397)}…` : t;
}

function labelledPersonName(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.replace(/\s+/g, " ").trim();
  if (!/^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){1,3}$/.test(t)) return null;
  if (/\b(?:Court|Charge|Police|Defendant|Witness|Statement|Crown)\b/.test(t)) return null;
  return t;
}

function isContinuationLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^[=-]{3,}/.test(t)) return false;
  if (NEXT_LABEL_RE.test(t)) return false;
  if (STOP_CONTINUATION_RE.test(t)) return false;
  return true;
}

function extractLabeledBlock(scan: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^\\s*(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:\\-–]\\s*(.+)$`, "im");
    const m = scan.match(re);
    if (!m?.[1] || m.index === undefined) continue;
    const extra: string[] = [];
    const after = scan.slice(m.index + m[0].length);
    for (const raw of after.split("\n")) {
      if (!raw.trim()) {
        if (extra.length) break;
        continue;
      }
      if (!isContinuationLine(raw)) break;
      extra.push(raw.trim());
      if (`${m[1]} ${extra.join(" ")}`.length > 400) break;
    }
    const joined = cleanValue([m[1], ...extra].join(" "));
    if (joined) return joined;
  }
  return null;
}

function splitCourtStage(raw: string | null): { court: string | null; stage: string | null } {
  if (!raw) return { court: null, stage: null };
  const parts = raw
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    return { court: cleanValue(parts[0]!), stage: cleanValue(parts.slice(1).join(" / ")) };
  }
  if (/\b(?:Crown Court|Magistrates(?:'|\u2019)? Court|\bCourt)\b/i.test(raw)) {
    return { court: cleanValue(raw), stage: null };
  }
  return { court: null, stage: cleanValue(raw) };
}

function splitOutstandingItems(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/\s*;\s*/)
    .map((part) => part.replace(/\s+/g, " ").replace(/[.]+$/g, "").trim())
    .filter((part) => part.length >= 8)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

export function looksLikeSmokePackFrontSheet(text: string): boolean {
  const hay = normalizeScan(text);
  const hasExactCharge = /^\s*Exact charge wording\s*:/im.test(hay);
  const hasCourtStage = /^\s*Court\s*\/\s*stage\s*:/im.test(hay);
  const hasSmokeBanner =
    /\bCharge Coverage Smoke Pack\b/i.test(hay) || /\bCOVER\s*\/\s*CASE HEADER\b/i.test(hay);
  return (hasExactCharge && hasCourtStage) || (hasSmokeBanner && (hasExactCharge || hasCourtStage));
}

export function smokePackRequiresSolicitorReview(text: string): boolean {
  return /\b(?:fictional|evaluation|not a real case|solicitor review|unknown|this should not be overstated)\b/i.test(
    text ?? "",
  );
}

export function extractSmokePackFrontSheet(text: string): SmokePackFrontSheet {
  const empty: SmokePackFrontSheet = {
    detected: false,
    defendantName: null,
    caseTitle: null,
    court: null,
    stage: null,
    courtStage: null,
    exactChargeWording: null,
    offenceFamily: null,
    proofPressure: null,
    outstandingMaterial: null,
    outstandingItems: [],
    solicitorReviewRequired: smokePackRequiresSolicitorReview(text),
    provisional: true,
  };
  const hay = normalizeScan(text).replace(/^\s*Court\s*\/\s*stage\s*:/gim, "Court/stage:");
  if (!looksLikeSmokePackFrontSheet(hay)) return empty;

  const courtStage = extractLabeledBlock(hay, ["Court/stage", "Court / stage"]);
  const { court, stage } = splitCourtStage(courtStage);
  const outstandingMaterial = extractLabeledBlock(hay, ["Outstanding material"]);

  return {
    detected: true,
    defendantName: labelledPersonName(extractLabeledBlock(hay, ["Defendant", "Defendant name", "Defendant(s)"])),
    caseTitle: extractLabeledBlock(hay, ["Case title"]),
    court,
    stage,
    courtStage,
    exactChargeWording: extractLabeledBlock(hay, ["Exact charge wording"]),
    offenceFamily: extractLabeledBlock(hay, ["Offence family"]),
    proofPressure: extractLabeledBlock(hay, ["Proof pressure"]),
    outstandingMaterial,
    outstandingItems: splitOutstandingItems(outstandingMaterial),
    solicitorReviewRequired: true,
    provisional: true,
  };
}

export function smokePackOutstandingChaseDrafts(text: string): SmokePackChaseDraft[] {
  const sheet = extractSmokePackFrontSheet(text);
  if (!sheet.detected || !sheet.outstandingItems.length || !sheet.outstandingMaterial) return [];
  return sheet.outstandingItems.map((label, index) => ({
    id: `source-confirm-smoke-outstanding-${index + 1}`,
    label,
    whyItMatters:
      "The front sheet labels this as outstanding source material — keep it on review/chase until the papers confirm service.",
    evidenceAnchor: `Outstanding material: ${sheet.outstandingMaterial}`,
    draftChaseWording: `Please serve or confirm the status of: ${label}.`,
  }));
}
