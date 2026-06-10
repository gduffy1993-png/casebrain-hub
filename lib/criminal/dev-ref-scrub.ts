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
  // bare internal case codes (incl. glued bundle titles like TitleCB-THIN-2026-0011)
  /(?:\b|(?<=[A-Za-z]))CB-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/g,
  /\bTitle\s*CB-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/gi,
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

/** Extra scrub for user-visible quoted source lines (sourceBasis, chase anchors). */
const PUBLIC_DISPLAY_SCRUB_PATTERNS: RegExp[] = [
  /\b(?:gold|stress|fixture|eval)(?:\s+|-)?(?:pack|bundle|case|org|manifest)?\b/gi,
  /\bfrom\s+pilot\s+workflow\b/gi,
  /\bnot\s+served\s+on\s+this\s+export\b/gi,
  /\boutstanding\s+on\s+export\b/gi,
  /\bpilot-\d+\s+export\b/gi,
  /\bdisclosure\s+chase\s*\([^)]*\)/gi,
  /\|\s*pilot\s+bundle\s*\|/gi,
  /\bpilot\s+bundle\b/gi,
  /#+\s*[^\n]*/g,
  /\*\*[^*]+\*\*/g,
  /FICTIONAL TEST BUNDLE[^.\n]*/gi,
  /fictional\s+test\s+bundle[^.\n]*/gi,
];

const PUBLIC_DISPLAY_UNSAFE_PATTERNS: RegExp[] = [
  /(?:\b|(?<=[A-Za-z]))CB-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*/i,
  /\bPack\s+[A-Z]{1,2}\s*[—–-]\s*Case\s*\d+/i,
  /\b(?:gold|stress|fixture)\s+(?:pack|bundle|case)\b/i,
  /\beval[- ]?pack\b/i,
  /\bbundle[- ]?stress\b/i,
  /\bpilot\s+bundle\b/i,
];

/** Scrub dev/eval labels from a quoted source line shown in product UI. */
export function sanitizePublicDisplayLine(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  let t = scrubDevRefs(text);
  for (const re of PUBLIC_DISPLAY_SCRUB_PATTERNS) t = t.replace(re, " ");
  return t
    .replace(/^[-•]\s*/gm, "")
    .replace(/^Title\s*[-—–]\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[—–-]+\s*/g, "")
    .trim();
}

/** True when a display line is safe to show solicitors (no internal eval/dev labels). */
export function isSafePublicDisplayLine(text: string | null | undefined): boolean {
  const s = sanitizePublicDisplayLine(text);
  if (!s || s.length < 4) return false;
  if (containsDevRef(s)) return false;
  return !PUBLIC_DISPLAY_UNSAFE_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(s);
  });
}

/** Detect internal labels in product-visible proof-map / chase text (pre- or post-scrub). */
export function containsPublicDevLabel(text: string): boolean {
  const raw = text?.trim() ?? "";
  if (!raw) return false;
  if (containsDevRef(raw)) return true;
  return PUBLIC_DISPLAY_UNSAFE_PATTERNS.some((re) => {
    re.lastIndex = 0;
    return re.test(raw);
  });
}
