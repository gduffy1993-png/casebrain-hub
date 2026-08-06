/**
 * Final solicitor-visible boundary — never emit mid-unit truncation on copyable surfaces.
 * Prefer complete semantic units; otherwise fail closed (review-required / not copyable).
 */

export type SolicitorBoundaryIssue =
  | "empty"
  | "mid_word_cut"
  | "mid_sentence_cut"
  | "incomplete_disclaimer"
  | "open_bracket"
  | "open_quote"
  | "hard_cap_unsafe"
  | "ellipsis_cut";

export type SolicitorBoundaryResult =
  | { ok: true; text: string; issues: [] }
  | { ok: false; text: null; issues: SolicitorBoundaryIssue[] };

const CLIENT_SAFE_DISCLAIMER_COMPLETE_RE =
  /\[CaseBrain — client-safe summary\.[^\]]*Not for court or CPS use\.\]\s*$/;
const CLIENT_SAFE_DISCLAIMER_STARTED_RE = /\[CaseBrain — client-safe summary\./i;
const COURT_LINE_DISCLAIMER_COMPLETE_RE =
  /\[CaseBrain — court line copy\.[^\]]*Confirm before addressing the court\.\]\s*$/;
const COURT_LINE_DISCLAIMER_STARTED_RE = /\[CaseBrain — court line copy\./i;

const LEGIT_ABBREV_END_RE =
  /\b(?:cps|mg11|mg6c?|ptph|bwv|cctv|dna|anpr|sfr|vrm|pfha|pwits|abe|s\.?\s*18|s\.?\s*20|e\.g|i\.e|etc|ltd|plc|uk|id)\.?\s*$/i;

/**
 * Detect incomplete required disclaimer suffixes (client-safe / court-line).
 * Catches the GOLD-11-039 class of FN: cut at 600 chars ending "...CPS us".
 */
export function hasIncompleteRequiredDisclaimer(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (CLIENT_SAFE_DISCLAIMER_STARTED_RE.test(t) && !CLIENT_SAFE_DISCLAIMER_COMPLETE_RE.test(t)) {
    return true;
  }
  if (COURT_LINE_DISCLAIMER_STARTED_RE.test(t) && !COURT_LINE_DISCLAIMER_COMPLETE_RE.test(t)) {
    return true;
  }
  // Partial trailing disclaimer without closing bracket
  if (/\bNot for court or CPS\s+us\s*$/i.test(t)) return true;
  if (/\bNot for court or CPS\s*$/i.test(t) && !/Not for court or CPS use\.\]\s*$/i.test(t)) {
    return true;
  }
  return false;
}

function unbalancedDelimiter(text: string, open: string, close: string): boolean {
  let depth = 0;
  for (const ch of text) {
    if (ch === open) depth += 1;
    else if (ch === close) depth = Math.max(0, depth - 1);
  }
  return depth > 0;
}

function looksLikeMidWordCut(text: string): boolean {
  const t = text.trim();
  if (t.length < 8) return false;
  if (/\.\.\.|…\s*$/.test(t)) return true;
  if (/[.!?]"?'?\]?\s*$/.test(t)) return false;
  if (LEGIT_ABBREV_END_RE.test(t)) return false;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  const last = (words[words.length - 1] ?? "").replace(/[^A-Za-z]/g, "");
  // Short stubs at end of long prose are almost always hard-cap cuts ("us", "th", "provis")
  if (last.length >= 2 && last.length <= 3 && t.length >= 80 && !/^(a|an|the|or|to|of|in|on|at|by|is|it|we|do|no|if|as|so|be)$/i.test(last)) {
    return true;
  }
  if (last.length < 4 || !/^[A-Za-z]+$/.test(last)) return false;
  const completeEnding =
    /(?:ing|ed|ly|tion|sion|ment|ance|ence|ous|able|ible|ive|als?|ers?|ests?|ness|ful|less|ships?|ity|ties|ures?|ants?|ents?|ors?|ary|ory|ics?|ate|ize|ise|screenshots?|outstanding|available|required|confirmed|extracted|missing|served|referred|hearing|defendant|complainant|instructions?|provisional|disclosure|summary|papers?|use)$/i;
  return !completeEnding.test(last);
}

function looksLikeMidSentenceCut(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[.!?]"?'?\]?\s*$/.test(t)) return false;
  if (LEGIT_ABBREV_END_RE.test(t)) return false;
  if (/[-–—:,;]\s*$/.test(t)) return true;
  if (/\b(?:and|or|that|which|the|to|of|for|with|from|including|including:|but|because|while|when|where|who|whom)\s*$/i.test(t)) {
    return true;
  }
  // Long prose without terminal punctuation
  if (t.length >= 120 && !/[.!?]\s*$/.test(t) && !/\]\s*$/.test(t)) return true;
  return false;
}

export function assessSolicitorVisibleBoundary(raw: string | null | undefined): {
  ok: boolean;
  issues: SolicitorBoundaryIssue[];
} {
  const text = (raw ?? "").trim();
  const issues: SolicitorBoundaryIssue[] = [];
  if (!text) {
    return { ok: false, issues: ["empty"] };
  }
  if (hasIncompleteRequiredDisclaimer(text)) issues.push("incomplete_disclaimer");
  if (unbalancedDelimiter(text, "(", ")") || unbalancedDelimiter(text, "[", "]") || /\([^\)]*$/.test(text)) {
    issues.push("open_bracket");
  }
  if (/(?:^|[^\\])"(?:[^"\\]|\\.)*$/.test(text) || /(?:^|[^\\])'(?:[^'\\]|\\.)*$/.test(text)) {
    // Only flag obvious open quote on long copyable prose endings mid-quote
    if (/["'][^"']{0,40}$/.test(text) && !/["']\s*$/.test(text.split(/\s+/).pop() ?? "")) {
      /* soft */
    }
    if (/"[^"]*$/.test(text) || /'[^']*$/.test(text)) issues.push("open_quote");
  }
  if (looksLikeMidWordCut(text)) issues.push("mid_word_cut");
  if (looksLikeMidSentenceCut(text)) issues.push("mid_sentence_cut");
  if (/(?:\.{3}|…)\s*$/.test(text) && text.length >= 40) issues.push("ellipsis_cut");
  return { ok: issues.length === 0, issues: [...new Set(issues)] };
}

/**
 * Prefer complete semantic units within an optional soft budget.
 * Never returns a mid-word / mid-disclaimer cut. If the only way to fit the
 * budget would be an unsafe cut, fail closed.
 */
export function finalizeSolicitorVisibleProse(
  raw: string | null | undefined,
  opts?: { maxChars?: number },
): SolicitorBoundaryResult {
  const original = (raw ?? "").trim();
  if (!original) return { ok: false, text: null, issues: ["empty"] };

  const maxChars = opts?.maxChars;
  let candidate = original;

  if (typeof maxChars === "number" && maxChars > 0 && candidate.length > maxChars) {
    // Prefer last complete paragraph / sentence / disclaimer within budget
    const window = candidate.slice(0, maxChars);
    const para = window.lastIndexOf("\n\n");
    const sentence = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
      window.lastIndexOf(".]"),
    );
    let cut = -1;
    if (para >= Math.floor(maxChars * 0.5)) cut = para;
    else if (sentence >= Math.floor(maxChars * 0.5)) cut = sentence + 1;
    if (cut < 0) {
      return { ok: false, text: null, issues: ["hard_cap_unsafe"] };
    }
    candidate = window.slice(0, cut).trim();
    // If we dropped a started disclaimer, fail closed rather than emit partial
    if (CLIENT_SAFE_DISCLAIMER_STARTED_RE.test(original) && !CLIENT_SAFE_DISCLAIMER_COMPLETE_RE.test(candidate)) {
      return { ok: false, text: null, issues: ["incomplete_disclaimer", "hard_cap_unsafe"] };
    }
  }

  const assessed = assessSolicitorVisibleBoundary(candidate);
  if (!assessed.ok) {
    return { ok: false, text: null, issues: assessed.issues as SolicitorBoundaryIssue[] };
  }
  return { ok: true, text: candidate, issues: [] };
}

/** Assert final post-transformation string is safe at copy/display/export/API boundary. */
export function assertCopyableSolicitorText(text: string): SolicitorBoundaryResult {
  return finalizeSolicitorVisibleProse(text);
}
