/**
 * Proof Ledger display helpers — solicitor-readable summaries only (no product mutation).
 */
import {
  applyHumanOutputPreview,
  isChaseWordingLine,
  isServedMaterialLabel,
  labelFromMg6Snippet,
  pickOutstandingMg6Label,
} from "./present-labels";

const FRAGMENT_RE =
  /^(?:not (?:yet )?served\.?|outstanding — not on bundle\.?|referred on MG6 — export not served\.?|not attached\.?|extract only\.?|summary only\.?)$/i;

export function polishProductCasing(text: string): string {
  return text
    .replace(/\bcCTV\b/g, "CCTV")
    .replace(/\bbWV\b/g, "BWV")
    .replace(/\bcAD\b/g, "CAD")
    .replace(/\bmG6\b/gi, "MG6")
    .replace(/\bmG11\b/gi, "MG11")
    .replace(/\bmG5\b/gi, "MG5")
    .replace(/\bmG6C\b/gi, "MG6C")
    .replace(/\bPlease provide cCTV\b/g, "Please provide CCTV")
    .replace(/\bPlease provide mG6\b/gi, "Please provide MG6")
    .replace(/\bcctv\b/g, (m, offset, s) => {
      const prev = s.slice(Math.max(0, offset - 1), offset);
      return prev === "/" || prev === "\\" ? m : "CCTV";
    })
    .replace(/\bbwv\b/g, "BWV")
    .replace(/\bcad\b/g, (m, offset, s) => {
      const prev = s.slice(Math.max(0, offset - 1), offset);
      return prev === "/" ? m : "CAD";
    });
}

export function isUsefulSummaryBullet(text: string): boolean {
  const t = text.trim();
  if (!t || t.length < 18) return false;
  if (FRAGMENT_RE.test(t)) return false;
  if (/^Outstanding:$/i.test(t)) return false;
  return true;
}

export function bundleMentionsFamily(bundleText: string, family: string): boolean {
  const b = bundleText.toLowerCase();
  const maps: Record<string, RegExp> = {
    abe: /\babe\b|achieving best evidence|first account|mg11.*complainant/i,
    bwv: /\bbwv\b|body[-\s]?worn/i,
    cad: /\b999\b|\bcad\b/i,
    cctv: /\bcctv\b|stills?\b/i,
    encro: /\bencro\b|shadow-\d+|handle mapping/i,
    phone: /\bphone\b|\bmobile\b|handset|subscriber|extraction/i,
    drugs: /\bclass [abc] drugs?\b|drugs continuity/i,
    custody: /\bcustody\b|\bpace\b/i,
  };
  return maps[family]?.test(b) ?? false;
}

/** Drop global must-not-say traps whose topic is absent from this bundle. */
export function trapMentionsIrrelevantTopic(trapLine: string, bundleText: string): boolean {
  const lower = trapLine.toLowerCase();
  if (/\babe\b/i.test(lower) && !bundleMentionsFamily(bundleText, "abe")) return true;
  if (/\bbwv\b|body[-\s]?worn/i.test(lower) && !bundleMentionsFamily(bundleText, "bwv")) return true;
  if (/\bcad\b|\b999\b/i.test(lower) && !bundleMentionsFamily(bundleText, "cad")) return true;
  if (/drugs continuity/i.test(lower) && !bundleMentionsFamily(bundleText, "drugs")) return true;
  if (/phone extraction|pwits phone|phone attribution/i.test(lower) && !bundleMentionsFamily(bundleText, "phone")) return true;
  if (/fraud account/i.test(lower) && !/\bfraud\b/i.test(bundleText)) return true;
  if (/custody safeguards/i.test(lower) && !bundleMentionsFamily(bundleText, "custody")) return true;
  return false;
}

export function parseMg6cScheduleRows(bundleText: string): string[] {
  const mg6 = bundleText.match(/MG6C[\s\S]*?(?=\n===|\n#{1,3}\s|$)/i)?.[0] ?? "";
  const rows: string[] = [];
  for (const line of mg6.split("\n")) {
    const t = line.trim();
    if (/^MG6C\//i.test(t)) rows.push(t);
  }
  return rows;
}

export function humaniseMg6cRow(row: string): string {
  const fromSnippet = labelFromMg6Snippet(row);
  if (fromSnippet) return fromSnippet;
  const m = row.match(/^MG6C\/\w+\s*[—–-]\s*(.+)$/i);
  if (m) return m[1].trim();
  return row;
}

export function stripMachineStateSuffix(line: string): string {
  return line
    .replace(/:\s*not_safely_confirmed\s*\/\s*unsafe\b/gi, "")
    .replace(/:\s*not_safely_confirmed\s*\/\s*needs_review\b/gi, "")
    .replace(/:\s*served\s*\/\s*needs_review\b/gi, "")
    .replace(/:\s*unknown\s*\/\s*needs_review\b/gi, "")
    .replace(/:\s*missing\s*\/\s*needs_review\b/gi, "")
    .replace(/:\s*Unknown\s*\/\s*Needs review\b/gi, "")
    .replace(/\s*—\s*unknown\b/gi, "")
    .replace(/\s*\/\s*needs_review\b/gi, "")
    .trim();
}

export function labelFromBundleContext(bundleText: string, outputLine: string): string | null {
  if (!/\bmg6\b.*\bunused\b|schedule clarification/i.test(outputLine)) return null;
  const isChase = isChaseWordingLine(outputLine);
  if (isChase) {
    return pickOutstandingMg6Label(bundleText, outputLine);
  }
  const rows = parseMg6cScheduleRows(bundleText);
  const hay = outputLine.toLowerCase();

  const topicPairs: Array<{ lineRe: RegExp; rowRe: RegExp }> = [
    { lineRe: /cctv|stills|footage|master/i, rowRe: /cctv|stills|\/mas\b/i },
    { lineRe: /encro|handle|shadow/i, rowRe: /\/enc|\/han|encro|handle/i },
    { lineRe: /platform/i, rowRe: /\/pla|platform extraction/i },
    { lineRe: /\bbwv\b|body.worn/i, rowRe: /\/bwv|body.worn/i },
    { lineRe: /custody|pace/i, rowRe: /custody|pace|\/011/i },
    { lineRe: /continuity/i, rowRe: /\/con|continuity/i },
    { lineRe: /\babe\b/i, rowRe: /\/abe|\babe\b/i },
    { lineRe: /co-?def/i, rowRe: /\/co-|co-defendant/i },
  ];

  for (const { lineRe, rowRe } of topicPairs) {
    if (!lineRe.test(hay)) continue;
    const row = rows.find((r) => rowRe.test(r));
    if (row) return humaniseMg6cRow(row);
  }

  const served = rows.find((r) => /served on bundle/i.test(r));
  if (served) return humaniseMg6cRow(served);
  const outstanding = rows.find((r) => /outstanding|referred|not attached/i.test(r));
  if (outstanding) return humaniseMg6cRow(outstanding);
  return null;
}

export function humaniseLedgerLine(
  line: string,
  bundleText: string,
  humanEvidenceLabel?: string | null,
  lineCategory?: string,
): string {
  const isChase = isChaseWordingLine(line, lineCategory);
  let label = humanEvidenceLabel ?? null;
  if (label && isChase && isServedMaterialLabel(label)) {
    label = pickOutstandingMg6Label(bundleText, line) ?? label;
  }
  let out = label ? applyHumanOutputPreview(line, label, { isChase }) : line;
  out = stripMachineStateSuffix(out);
  if (/\bmg6\s*\/\s*unused schedule/i.test(out)) {
    const resolved =
      pickOutstandingMg6Label(bundleText, out) ??
      labelFromBundleContext(bundleText, out) ??
      (isChase ? pickOutstandingMg6Label(bundleText, line) : null);
    if (resolved) out = applyHumanOutputPreview(out, resolved, { isChase });
  }
  out = out.replace(
    / — Additional source-material appears outstanding on the current file — solicitor to confirm relevance before fixing hearing position\.?/gi,
    "",
  );
  out = out.replace(/\s*—\s*still chase if disclosure-relevant\.?/gi, "");
  out = out.replace(/\n\n\[CaseBrain —[^\]]+\]/g, "");
  out = out.replace(/\n\[CaseBrain —[^\]]+\]/g, "");
  out = out.replace(/^Allegation:\s*/i, "");
  out = out.replace(/^Next action:\s*/i, "");
  // Chase must not request already-served material
  if (/\bplease provide\b/i.test(out) && /\bserved on bundle\b/i.test(out)) {
    const fallback = pickOutstandingMg6Label(bundleText, line);
    if (fallback) {
      out = out.replace(/please provide[^.\n]+/i, `Please provide ${fallback}`);
    }
  }
  return polishProductCasing(out.trim());
}

export function evidenceItemInBundle(item: string, bundleText: string): boolean {
  const itemLower = item.toLowerCase();
  const bundle = bundleText.toLowerCase();

  const topicChecks: Array<{ itemRe: RegExp; bundleRe: RegExp }> = [
    { itemRe: /\babe\b/i, bundleRe: /\babe\b/i },
    { itemRe: /co-?def/i, bundleRe: /co-?def/i },
    { itemRe: /platform extraction/i, bundleRe: /platform extraction/i },
    { itemRe: /handle mapping/i, bundleRe: /handle mapping/i },
    { itemRe: /master cctv|master footage|full time window/i, bundleRe: /master|footage/i },
    { itemRe: /\bcctv\b|stills/i, bundleRe: /\bcctv\b|stills/i },
    { itemRe: /continuity/i, bundleRe: /continuity/i },
    { itemRe: /subscriber/i, bundleRe: /subscriber/i },
    { itemRe: /\bbwv\b|body.worn/i, bundleRe: /\bbwv\b|body.worn/i },
    { itemRe: /mg11|complainant|first account/i, bundleRe: /mg11|complainant|first account/i },
    { itemRe: /custody|pace/i, bundleRe: /custody|pace/i },
    { itemRe: /encro/i, bundleRe: /encro/i },
  ];

  for (const { itemRe, bundleRe } of topicChecks) {
    if (itemRe.test(item)) return bundleRe.test(bundle);
  }

  const tokens = itemLower.split(/[\s—–\-()/]+/).filter((t) => t.length >= 6);
  return tokens.some((t) => bundle.includes(t));
}

export function humaniseEvidenceItemLabel(item: string, bundleText: string): string {
  const itemLower = item.toLowerCase();
  for (const row of parseMg6cScheduleRows(bundleText)) {
    const rowLower = row.toLowerCase();
    const tokens = itemLower.split(/[\s—–\-()/]+/).filter((t) => t.length >= 5);
    if (tokens.some((t) => rowLower.includes(t))) {
      return humaniseMg6cRow(row);
    }
  }
  return humaniseLedgerLine(item, bundleText);
}

export function sourceLedEvidenceGaps(bundleText: string, truthKey: import("../evidence-state-audit/types").EvidenceStateTruthKey): string[] {
  const gaps: string[] = [];
  for (const row of parseMg6cScheduleRows(bundleText)) {
    if (!/outstanding|referred|not attached|extract only|summary only|not served/i.test(row)) continue;
    const label = humaniseMg6cRow(row);
    if (isUsefulSummaryBullet(label)) gaps.push(label);
  }
  for (const item of truthKey.evidenceItems) {
    if (
      !item.chase_needed &&
      item.correct_evidence_state !== "missing" &&
      item.correct_evidence_state !== "referred_only"
    ) {
      continue;
    }
    if (!evidenceItemInBundle(item.evidence_item, bundleText)) continue;
    const label = humaniseEvidenceItemLabel(item.evidence_item, bundleText);
    const state = item.correct_evidence_state.replace(/_/g, " ");
    const gapLabel = label.includes(state) ? label : `${label} (${state})`;
    gaps.push(gapLabel);
  }
  return [...new Set(gaps)].filter(isUsefulSummaryBullet).slice(0, 8);
}
