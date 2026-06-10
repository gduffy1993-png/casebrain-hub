/**
 * Scrub internal dev/eval reference codes from solicitor-facing display strings.
 *
 * Eval bundles carry internal refs (CB-INJECT-2026-0001, "Pack R — Case 01",
 * pp-gold-1, bundle-stress-…) which must never surface in pilot UI, even when a
 * source line is otherwise quotable (e.g. an MG6 exhibit row). This strips the
 * ref fragment while preserving the rest of the line, so useful anchors survive.
 */
const DEV_REF_FRAGMENT_PATTERNS: RegExp[] = [
  // "listed in bundle reference CB-XXXX" → "listed in bundle"
  /\s*reference\s+CB-[A-Za-z0-9-]+\b/gi,
  // bare internal case codes: CB-INJECT-2026-0001, CB-AA-MESSY-0014, CB-Z-500-ROB-0009
  /\bCB-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b/g,
  // pack/case headers: "Pack R — Case 01 —"
  /\bPack\s+[A-Z]{1,2}\s*[—–-]\s*Case\s*\d+\s*[—–-]?\s*/gi,
  // eval artefact ids aligned with the supervisor queue sanitizer policy
  /\bpp-[a-z0-9-]+\b/gi,
  /\b(?:eval|bundle|pack|corpus|artifact)[-_][a-z0-9][a-z0-9-]*\b/gi,
  // eval file banners if a whole line is quoted
  /fictional\s+casebrain\s+evaluation\s+file[^.\n]*/gi,
  /fictional\s+evaluation\s+pdf[^.\n]*/gi,
];

export function scrubDevRefs(text: string): string {
  let t = text;
  for (const re of DEV_REF_FRAGMENT_PATTERNS) t = t.replace(re, " ");
  return t
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/[—–-]\s*$/g, "")
    .trim();
}

/** True when a string still carries an internal dev/eval reference. */
export function containsDevRef(text: string): boolean {
  return DEV_REF_FRAGMENT_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(text);
  });
}

/** Safe case title for solicitor-facing headers after dev-ref scrub. */
export function safeSolicitorCaseTitle(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Criminal matter — review required";
  const scrubbed = scrubDevRefs(t).replace(/^[—–-]+\s*/g, "").trim();
  if (!scrubbed || containsDevRef(scrubbed)) return "Criminal matter — review required";
  return scrubbed;
}
