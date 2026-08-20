/**
 * Principled solicitor-facing display projection for Overview.
 * Strips internal/debug leakage and applies negative-first phrasing for not-established claims.
 * Presentation only — does not change underlying truth.
 */

import { sanitizeSolicitorVisibleText } from "@/lib/criminal/solicitor-display-dedupe";
import { humanizeRemainingSnakeCaseTokens } from "@/lib/criminal/solicitor-visible-sanitization";

const INTERNAL_ID_PREFIX_RE =
  /^(?:signal|consider|move|fight|rls|playbook|offence|family|ev|chase|warn|ne|check|fact):/i;

const INTERNAL_VOCAB_RE =
  /\b(?:SOURCE_FACT|SAFE_DERIVATION|PRACTITIONER_CONSIDERATION|supportClass|allowedSurfaces|canonicalTriggers|offenceShapeOnly|recoverySource|familyId|bundleHay)\b/gi;

const STALE_WRAPPER_RE =
  /duplicated\s+old\s+summary\s+wrapper|internal\s+evidence\s+id|debug\s+family|stale\s+migration\s+label/gi;

/** Strip developer / migration / epistemic-enum leakage from solicitor-visible copy. */
export function projectSolicitorDisplayText(raw: string | null | undefined): string {
  let t = (raw ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  t = t.replace(INTERNAL_ID_PREFIX_RE, "");
  t = t.replace(INTERNAL_VOCAB_RE, "");
  t = t.replace(STALE_WRAPPER_RE, "");
  // Sanitize snake_case tokens before humanizing so replacements like needs_review still match.
  t = sanitizeSolicitorVisibleText(t);
  t = t.replace(/[_-]{2,}/g, " ");
  t = humanizeRemainingSnakeCaseTokens(t);
  t = sanitizeSolicitorVisibleText(t);
  return t.replace(/\s{2,}/g, " ").trim().replace(/^[:\-·]\s*/, "");
}

/**
 * Negative-first title for not-established claims.
 * Never lead with "X outstanding — not established".
 */
export function projectNotEstablishedTitle(label: string): string {
  const clean = projectSolicitorDisplayText(label);
  if (!clean) return "Material not established on papers";

  // Strip affirmative outstanding/missing framing from the title itself.
  let title = clean
    .replace(/\b(?:is\s+)?(?:outstanding|missing|not\s+served|referred)\b/gi, "")
    .replace(/\s*[—–-]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Soft family normalisation for common invent classes.
  if (/999|control[-\s]?room|cad/i.test(clean)) {
    title = "999 / control-room material";
  } else if (/\bbwv\b|body[-\s]?worn/i.test(clean)) {
    title = "BWV";
  } else if (/self[-\s]?defence|first[-\s]?contact/i.test(clean)) {
    title = "Self-defence / first contact";
  } else if (/medical|hospital|injury report/i.test(clean)) {
    title = "Medical evidence";
  } else if (/continuity|export\s+log/i.test(clean)) {
    title = "Continuity / export";
  } else if (/interview/i.test(clean) && /modalit|recording|transcript|summary/i.test(clean)) {
    title = "Interview modality";
  } else if (/phone|handset|download|attribution/i.test(clean)) {
    title = "Phone / digital material";
  }

  if (!title || title.length < 3) {
    title = clean.replace(/\boutstanding\b/gi, "").trim() || "Material not established on papers";
  }
  return title;
}

/**
 * Negative-first body for not-established claims.
 * Solicitor must not scan the first clause as a positive outstanding fact.
 */
export function projectNotEstablishedSummary(label: string, reason: string): string {
  const why = projectSolicitorDisplayText(reason);
  const base =
    "The current papers do not establish this material as outstanding or as a live case position.";
  if (!why) return base;
  // Avoid repeating an affirmative outstanding lead-in.
  if (/^.{0,40}\boutstanding\b/i.test(why) && /not\s+established/i.test(why)) {
    return base;
  }
  return `${base} ${why}`.replace(/\s{2,}/g, " ").trim();
}

/** Compact Document · page line when exact anchors exist; else keep exact provenance line. */
export function projectSourceLine(parts: {
  documentTitle?: string | null;
  pageLabel?: string | null;
  fallback?: string | null;
}): string {
  const doc = projectSolicitorDisplayText(parts.documentTitle ?? "");
  const page = projectSolicitorDisplayText(parts.pageLabel ?? "");
  if (doc && page) return `${doc} · ${page}`;
  if (doc) return doc;
  const fb = projectSolicitorDisplayText(parts.fallback ?? "");
  return fb || "Source not precisely anchored on current papers";
}

export function isInternalLookingIssueTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  if (INTERNAL_ID_PREFIX_RE.test(t)) return true;
  if (/\b(?:SOURCE_FACT|SAFE_DERIVATION|PRACTITIONER_CONSIDERATION)\b/.test(t)) return true;
  if (/^[a-z0-9]+(?:_[a-z0-9]+){2,}$/.test(t)) return true;
  if (/duplicated\s+old\s+summary/i.test(t)) return true;
  return false;
}
