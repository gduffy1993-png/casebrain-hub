/**
 * Shared solicitor sentence composer — reject malformed / truncated / raw extraction prose.
 * Presentation integrity only; does not change Brain builders.
 */

import { isRawChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";
import { collapseRepeatedPhrase, sanitizeSolicitorVisibleText } from "@/lib/criminal/solicitor-display-dedupe";
import { assessSolicitorVisibleBoundary } from "@/lib/criminal/solicitor-visible-boundary";

export type SentenceIntegrityIssue =
  | "empty"
  | "raw_extraction_marker"
  | "unresolved_placeholder"
  | "truncated_fragment"
  | "malformed_punctuation"
  | "bullet_label_concat"
  | "contradictory_clause"
  | "incomplete_sentence";

export type SentenceComposeResult = {
  ok: boolean;
  text: string | null;
  issues: SentenceIntegrityIssue[];
};

/** Word tokens keep \b; brace/angle placeholders must not rely on \b (non-word edges). */
const PLACEHOLDER_RE =
  /(?:\b(?:TODO|TBD|FIXME|PLACEHOLDER|lorem ipsum)\b|\[(?:TODO|insert)[^\]]*\]|\{\{[^}]+\}\}|\{[A-Z][A-Z0-9_]{2,}\}|<<[^>]+>>)/i;

const RAW_MARKER_RE = /\|\s*\d+(?:\s*-\s*\d+)?\s*\||\|\s*\*\*|#{2,}|^\s*\d+\s*\|\s*$/m;

const MALFORMED_PUNCT_RE = /\.;|;\.|,\.|\.{2,}|;;+|::+/;

const TRUNCATED_RE =
  /\b(?:and|or|that|which|the|to|of|for|with|from|including|including:)\s*$/i;

const ELLIPSIS_END_RE = /(?:\.{3}|…)\s*$/;

/** Legitimate abbreviations / acronyms — do not flag as truncation. */
const LEGIT_ABBREV_END_RE =
  /\b(?:cps|mg11|mg6c?|ptph|bwv|cctv|dna|anpr|vrm|pfha|pwits|s\.?\s*18|s\.?\s*20|e\.g|i\.e|etc|ltd|plc|uk|id)\.?\s*$/i;

/** Complete-looking English endings — mid-word cuts like "outstan" fail this. */
const COMPLETE_WORD_END_RE =
  /(?:ing|ed|ly|tion|sion|ment|ance|ence|ous|able|ible|ive|als?|ers?|ests?|ness|ful|less|ships?|ity|ties|ures?|ants?|ents?|ors?|ary|ory|ics?|ate|ize|ise|ous|screenshots?|outstanding|available|required|confirmed|extracted|missing|served|referred|hearing|defendant|complainant)$/i;

function looksLikeMidWordTruncation(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (ELLIPSIS_END_RE.test(t)) return true;
  if (/[.!?]"?'?\s*$/.test(t)) return false;
  if (LEGIT_ABBREV_END_RE.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 3) return false;
  const last = (words[words.length - 1] ?? "").replace(/[^A-Za-z]/g, "");
  if (last.length < 4 || !/^[A-Za-z]+$/.test(last)) return false;
  return !COMPLETE_WORD_END_RE.test(last);
}

const CONTRADICTORY_RE =
  /\b(?:is\s+)?served\b.{0,40}\bnot served\b|\bnot served\b.{0,40}\b(?:is\s+)?served\b|\b(?:final|complete)\b.{0,40}\b(?:draft|unsigned)\b|\b(?:draft|unsigned)\b.{0,40}\b(?:final|complete)\b/i;

const BULLET_CONCAT_RE = /(?:^|\n)\s*[-•*]\s+.+(?:\n\s*[-•*]\s+.+)+/;

function stripPagePipes(raw: string): string {
  return raw
    .replace(/\s*\|\s*\d+(?:\s*-\s*\d+)?\s*\|/gi, " ")
    .replace(/\s*\|\s*\d+\s*\|/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function assessSolicitorSentence(raw: string | null | undefined): SentenceComposeResult {
  const issues: SentenceIntegrityIssue[] = [];
  let text = (raw ?? "").trim();
  if (!text) {
    return { ok: false, text: null, issues: ["empty"] };
  }

  if (isRawChaseFragmentLabel(text) || RAW_MARKER_RE.test(text)) {
    issues.push("raw_extraction_marker");
  }
  if (PLACEHOLDER_RE.test(text)) {
    issues.push("unresolved_placeholder");
  }
  if (MALFORMED_PUNCT_RE.test(text) || /\.;/.test(text)) {
    issues.push("malformed_punctuation");
  }
  if (BULLET_CONCAT_RE.test(text) && text.includes("\n")) {
    issues.push("bullet_label_concat");
  }
  if (CONTRADICTORY_RE.test(text)) {
    issues.push("contradictory_clause");
  }
  if (
    ((TRUNCATED_RE.test(text) || /[-–—:]\s*$/.test(text)) && !LEGIT_ABBREV_END_RE.test(text)) ||
    looksLikeMidWordTruncation(text)
  ) {
    issues.push("truncated_fragment");
  }
  if (/\([^\)]*$/.test(text)) {
    issues.push("incomplete_sentence");
  }

  // Final post-transformation boundary (disclaimer mid-cut, short stubs like "CPS us", open brackets).
  const boundary = assessSolicitorVisibleBoundary(text);
  if (
    boundary.issues.includes("incomplete_disclaimer") ||
    boundary.issues.includes("mid_word_cut") ||
    boundary.issues.includes("open_bracket") ||
    boundary.issues.includes("hard_cap_unsafe")
  ) {
    if (!issues.includes("truncated_fragment")) issues.push("truncated_fragment");
    if (boundary.issues.includes("incomplete_disclaimer") || boundary.issues.includes("open_bracket")) {
      if (!issues.includes("incomplete_sentence")) issues.push("incomplete_sentence");
    }
  }

  text = stripPagePipes(text);
  text = collapseRepeatedPhrase(sanitizeSolicitorVisibleText(text));
  text = text.replace(MALFORMED_PUNCT_RE, ".").replace(/\s+/g, " ").trim();

  // Re-check boundary after transformation — composition must validate the final string.
  const finalBoundary = assessSolicitorVisibleBoundary(text);
  if (!finalBoundary.ok) {
    if (
      finalBoundary.issues.includes("incomplete_disclaimer") ||
      finalBoundary.issues.includes("mid_word_cut") ||
      finalBoundary.issues.includes("mid_sentence_cut")
    ) {
      if (!issues.includes("truncated_fragment")) issues.push("truncated_fragment");
    }
    if (finalBoundary.issues.includes("incomplete_disclaimer") || finalBoundary.issues.includes("open_bracket")) {
      if (!issues.includes("incomplete_sentence")) issues.push("incomplete_sentence");
    }
  }

  const ok = issues.length === 0 && Boolean(text);
  return { ok, text: ok ? text : text || null, issues };
}

/**
 * Compose a solicitor-facing sentence from structured parts.
 * Never joins bullet labels into a single prose line.
 */
export function composeSolicitorSentence(parts: {
  subject?: string | null;
  predicate?: string | null;
  qualifier?: string | null;
}): SentenceComposeResult {
  const bits = [parts.subject, parts.predicate, parts.qualifier]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (!bits.length) return { ok: false, text: null, issues: ["empty"] };
  // Reject if any part looks like a bullet cluster
  if (bits.some((b) => /^[-•*]/.test(b) || b.includes("\n-"))) {
    return { ok: false, text: null, issues: ["bullet_label_concat"] };
  }
  return assessSolicitorSentence(bits.join(" "));
}

/** Keep only sentences that pass integrity; drop the rest. */
export function composeSolicitorLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const result = assessSolicitorSentence(line);
    if (result.ok && result.text) out.push(result.text);
  }
  return out;
}

export function sentenceHasIntegrityFailure(text: string): boolean {
  return !assessSolicitorSentence(text).ok;
}
