/**
 * Shared solicitor-facing display hygiene — normalize + de-dupe visible lines.
 * Presentation only: does not change chase/brain/guardian builders.
 */

/** Normalize visible copy — strips dev/eval tokens from solicitor-facing surfaces. */
export function sanitizeSolicitorVisibleText(text: string): string {
  if (!text.trim()) return text;
  return text
    .replace(/\bsource_unavailable\b/gi, "source not on file")
    .replace(/\bneeds_review\b/gi, "solicitor review")
    .replace(/\bcopy gate\b/gi, "wording guard")
    .replace(/\bNot assessable\b/g, "Not confirmed on papers")
    .replace(/\bWeak\b/g, "Limited on papers")
    .replace(/\bNeeds review\b/g, "Solicitor review")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Lowercase, strip punctuation noise, collapse whitespace. */
export function normalizeSolicitorLineKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Collapse immediate phrase repeats: "pre ptph pre ptph" → "pre ptph". */
export function collapseRepeatedPhrase(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return t;

  // Whole-string doubled ("Foo Foo" / "pre ptph pre ptph")
  const words = t.split(" ");
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const a = words.slice(0, half).join(" ");
    const b = words.slice(half).join(" ");
    if (a.toLowerCase() === b.toLowerCase()) {
      t = a;
    }
  }

  // Adjacent multi-word phrase repeats (2–5 tokens)
  for (let n = 5; n >= 2; n--) {
    const re = new RegExp(`\\b((?:\\S+\\s+){${n - 1}}\\S+)(?:\\s+\\1)\\b`, "gi");
    t = t.replace(re, "$1");
  }

  // Single-token doubles: "Crown Crown"
  t = t.replace(/\b(\S+)(?:\s+\1)+\b/gi, "$1");

  return t.replace(/\s+/g, " ").trim();
}

/** Court / hearing / stage header cells — collapse repeats without changing extraction. */
export function collapseHeaderCellDuplicates(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "";
  return collapseRepeatedPhrase(t);
}

export function solicitorLinesNearlyEqual(a: string, b: string): boolean {
  const ka = normalizeSolicitorLineKey(a);
  const kb = normalizeSolicitorLineKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const shorter = ka.length <= kb.length ? ka : kb;
  const longer = ka.length <= kb.length ? kb : ka;
  if (shorter.length >= 24 && longer.includes(shorter)) return true;
  return false;
}

export type DedupeSolicitorLinesOptions = {
  /** Drop lines that match or contain this exclude string (e.g. safe court line). */
  exclude?: string | null;
  /** Also drop lines that look like chase CTAs when a Chase link is already shown. */
  dropChaseAffordances?: boolean;
};

const CHASE_AFFORDANCE_RE =
  /^(open\s+chase\b|open\s+full\s+disclosure\s+chase|chase\s+outstanding\s+disclosure|view\s+full\s+disclosure\s+chase)/i;

export function isChaseAffordanceLine(line: string): boolean {
  return CHASE_AFFORDANCE_RE.test(line.trim());
}

/** Accordion-style generic chase labels that should not leave the Chase tab as preview copy. */
export function isGenericAdditionalSourceLabel(line: string): boolean {
  return /^additional\s+source[- ]material\s+issues?\b/i.test(line.trim());
}

/**
 * Polish a chase preview label for Overview/Today/Summary.
 * Returns null when the label is accordion chrome (show concrete gaps elsewhere).
 */
export function polishChasePreviewLabel(line: string): string | null {
  const t = sanitizeSolicitorVisibleText(line.trim());
  if (!t) return null;
  if (isGenericAdditionalSourceLabel(t)) return null;
  return t;
}

/**
 * Normalized solicitor list dedupe — keep first, drop near-duplicates / subset matches.
 * Preserves distinct evidence gaps (different keys).
 */
export function dedupeSolicitorLines(
  lines: string[],
  opts: DedupeSolicitorLinesOptions = {},
): string[] {
  const excludeKey = opts.exclude ? normalizeSolicitorLineKey(opts.exclude) : "";
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of lines) {
    let line = sanitizeSolicitorVisibleText((raw ?? "").trim());
    if (!line || line.length < 4) continue;
    line = collapseRepeatedPhrase(line);
    if (opts.dropChaseAffordances && isChaseAffordanceLine(line)) continue;

    const key = normalizeSolicitorLineKey(line);
    if (!key) continue;
    if (excludeKey && (key === excludeKey || key.includes(excludeKey.slice(0, 48)) || excludeKey.includes(key.slice(0, 48)))) {
      continue;
    }
    if (seen.has(key)) continue;

    const subsetDup = out.some((existing) => solicitorLinesNearlyEqual(existing, line));
    if (subsetDup) continue;

    seen.add(key);
    out.push(line);
  }

  return out;
}

/** Drop lines already shown in another section (near-equal match). */
export function excludeSolicitorLinesMatching(
  lines: string[],
  alreadyShown: string[],
): string[] {
  if (!alreadyShown.length) return dedupeSolicitorLines(lines);
  return dedupeSolicitorLines(lines).filter(
    (line) => !alreadyShown.some((shown) => solicitorLinesNearlyEqual(shown, line)),
  );
}

/** Group identical warning triggers into one line (keep first wording). */
export function groupIdenticalWarningLines(lines: string[]): string[] {
  return dedupeSolicitorLines(lines);
}
