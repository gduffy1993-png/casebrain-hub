/**
 * Solicitor-signal mute — drop low-value clutter that crowds Overview/Chase
 * when real disclosure gaps already exist. Presentation-only; no invent gate.
 */

export function isGenericSolicitorClutterLabel(label: string): boolean {
  const t = (label || "").replace(/\s+/g, " ").trim();
  if (!t) return false;
  return (
    /^exhibit mapping\s*\/\s*provenance$/i.test(t) ||
    /^digital disclosure schedule item$/i.test(t) ||
    /mg6c?\s*clarification|mg6\s*\/\s*unused|unused schedule clarification/i.test(t) ||
    /^(?:additional|other)\s+source[- ]material(?:\s+issues?)?(?:\s*\(\d+\s*on file\))?$/i.test(t) ||
    /^outstanding source material on disclosure schedule$/i.test(t)
  );
}

/** PDF/index chrome that should never dump into Chase "Merged from file". */
export function isChaseMergedChromeLine(line: string): boolean {
  const t = (line || "").replace(/\s+/g, " ").trim();
  if (!t) return true;
  if (isGenericSolicitorClutterLabel(t)) return true;
  return (
    /^further papers on the file$/i.test(t) ||
    /^additional source-material issues?\b/i.test(t) ||
    /^other source-material items?\b/i.test(t) ||
    /^issues for review\b/i.test(t) ||
    /^items marked\b/i.test(t) ||
    /^call data is\b/i.test(t) ||
    /^entries\.?$/i.test(t) ||
    /^o0?\d+[a-z]/i.test(t) ||
    /^charge sheet\b/i.test(t) ||
    /^mg5\s+case summary$/i.test(t) ||
    /^case initiation\b/i.test(t) ||
    /^interview\s*\/\s*account$/i.test(t) ||
    /outstandingcontinuity awaited/i.test(t) ||
    /\|\s*\d+\s*\|/.test(t)
  );
}

/** Keep solicitor-useful merge siblings; drop chrome / clutter dumps. */
export function sanitizeChaseMergedFrom(mergedFrom: string[] | null | undefined): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of mergedFrom ?? []) {
    const t = (raw || "").replace(/\s+/g, " ").trim();
    if (!t || isChaseMergedChromeLine(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 6) break;
  }
  return out;
}

/**
 * True when draft chase wording talks about MG6/schedule clutter but the
 * visible card label is a different family (e.g. MG11 detail showing MG6 draft).
 */
export function draftMisalignedToLabel(label: string, draft: string): boolean {
  const draftMg6 = /mg6\s*\/\s*unused|unused schedule clarification|digital disclosure schedule/i.test(
    draft || "",
  );
  if (!draftMg6) return false;
  return !/mg6|schedule clarification|digital disclosure schedule/i.test(label || "");
}

/**
 * Drop generic exhibit/MG6/schedule clutter when substantive chase rows exist.
 * If everything left is clutter, return empty — a fake last-resort exhibit/MG6
 * row confuses solicitors more than a quiet board on thin papers.
 */
export function demoteSolicitorClutter<T>(
  items: T[],
  getLabel: (item: T) => string,
): T[] {
  return items.filter((i) => !isGenericSolicitorClutterLabel(getLabel(i)));
}

/**
 * Drop PDF/index chrome and strategy narrative that leaked into Evidence Anchor
 * (e.g. "Call data is partial; one co-defendant blames another." on a custody card).
 */
export function sanitizeSolicitorEvidenceAnchor(
  anchor: string | null | undefined,
): string | null {
  const t = (anchor || "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (isChaseMergedChromeLine(t)) return null;
  if (/co-defendant blames|one (?:co-)?defendant blames/i.test(t)) return null;
  if (/^further review of the papers\b/i.test(t)) return null;
  if (/^the prosecution case is that\b/i.test(t)) return null;
  // Live Dunn residual: admin "Directions sought: …" leaked as Evidence Anchor.
  if (/^directions sought:/i.test(t)) return null;
  return t;
}

/** Collapse duplicate attention titles (e.g. two digital schedule rows). */
export function dedupeSolicitorAttentionByTitle<T extends { title: string }>(items: T[]): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
