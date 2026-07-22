/**
 * Solicitor-facing sanitization helpers (Phase 11 remediation).
 * Strip internal/debug metadata; humanize enums; proportionate blocked previews;
 * queue legally sensitive formulas for qualified review.
 */

import { humanizeChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";
import { REVIEW_REQUIRED_NEUTRAL } from "@/lib/criminal/structured-solicitor-output";
import { preserveProtectedAcronyms } from "@/lib/criminal/solicitor-visible-quality";

const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const BUILDER_RE =
  /\b(CaseBrain H5|Brain 1|presentation builders|no Brain|builder(?:Name)?|audit family seed|fixtureId|GOLD-11|phase1[01]_|surface id|canCopy|gate status|integrity_blocked|ruleIds?|consumer|NOT USABLE)\b/i;
const FIXTURE_ID_RE =
  /^(?:cb-(?:fresh|found)-\d+|demo-audit-\d+|sc-[0-9a-f]+|messy-pdf-v\d+|pilot-\d+|proof-pack-\d+|CASE-\d+|SYN-[A-Z0-9-]+)\b/i;

const EVIDENCE_STATE_LABELS: Record<string, string> = {
  served: "Served",
  referred_only: "Referred only",
  referred: "Referred",
  missing: "Missing",
  incomplete: "Incomplete",
  not_safely_confirmed: "Not safely confirmed",
  unknown: "Unknown",
  needs_review: "Needs review",
  outstanding: "Outstanding",
  not_started: "Not started",
};

/** True when a walked string is internal/debug and must not appear as solicitor copy. */
export function isInternalNonSolicitorString(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return true;
  if (ISO_TS_RE.test(t)) return true;
  if (BUILDER_RE.test(t)) return true;
  if (isFixtureIdLike(t)) return true;
  if (/^Needs review before relying$/i.test(t)) return true;
  if (/^generic$/i.test(t)) return true;
  if (/^[a-f0-9]{12,64}$/i.test(t)) return true;
  if (t.length <= 3) return true;
  if (/^[a-z]+_[a-z0-9_]+$/i.test(t) && EVIDENCE_STATE_LABELS[t.toLowerCase()]) return true;
  return false;
}

export function isFixtureIdLike(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (FIXTURE_ID_RE.test(t)) return true;
  if (/^cb-(?:fresh|found)-\d+/i.test(t)) return true;
  if (/\b(taylor-brookes|jordan-hale|cb-found-\d+|cb-fresh-\d+)\b/i.test(t) && t.length < 80) {
    return !/\s{2,}/.test(t) && t.split(/\s+/).length <= 3;
  }
  return false;
}

/** Humanize underscore-delimited implementation enums for solicitor display. */
export function humanizeEvidenceState(raw: string | null | undefined): string {
  const t = (raw ?? "").trim();
  if (!t) return "Unknown";
  const mapped = EVIDENCE_STATE_LABELS[t.toLowerCase()];
  if (mapped) return mapped;
  if (/_/.test(t)) {
    return t
      .split(/_+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return solicitorDisplayLabel(t);
}

/** Capitalize chase / evidence labels for solicitor display (e.g. unredacted mg11 → Unredacted MG11). */
export function solicitorDisplayLabel(raw: string): string {
  const human = humanizeChaseFragmentLabel(raw).trim() || raw.trim();
  const cased = preserveProtectedAcronyms(human).replace(/^\w/, (c) => c.toUpperCase());
  return preserveProtectedAcronyms(cased);
}

/**
 * Legally sensitive formulas that must not be freely copied without qualified solicitor review.
 * Includes Theft Act / MG6C record formulas in headers as well as court lines.
 */
export function requiresQualifiedSolicitorReviewQueue(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (/\brecord per\s+MG6C\b/i.test(t)) return true;
  if (/\bTheft Act\b/i.test(t)) return true;
  return false;
}

export const QUALIFIED_SOLICITOR_REVIEW_QUEUE_BANNER =
  "Queued for qualified solicitor review — legally sensitive wording is not available for free copy/export.";

export const NEUTRAL_SOLICITOR_BLOCKED_BANNER =
  "Copy and send are unavailable for this output. Review the source papers before relying on or sending this content.";

/** Correct known solicitor-facing prose defects at display time. */
export function sanitizeSolicitorProse(text: string): string {
  return preserveProtectedAcronyms(
    text
      .replace(
        /\bRedacted papers are on the bundle\b/gi,
        "Redacted papers are recorded as served on the papers",
      )
      .replace(
        /\bunsafe proof\/outcome wording blocked\b/gi,
        "Do not treat incomplete or blocked proof wording as a concluded outcome. Check the source papers before relying on identity or offence findings.",
      )
      .replace(/\bfoundation\s+SJP\b/gi, "Single Justice Procedure listing")
      .replace(/\bfoundation\s+First appearance\b/gi, "first appearance listing")
      .replace(/\bfraud hero\b/gi, "fraud case profile")
      .replace(
        /\bRedacted papers are recorded as served on the papers\b/gi,
        "Redacted papers have been served",
      )
      .replace(
        /\bRedacted papers are on the bundle\b/gi,
        "Redacted papers have been served",
      )
      .replace(/\bAdditional source-material(?:\s+on\s+(?:file|the\s+file))?\b/gi, "Further papers on the file")
      .replace(/\badditional source material\b/gi, "further papers")
      // Defective further-papers template → natural prose (no second "still chase" fragment)
      .replace(
        /\bFurther papers on the file appears?\b(?:\s+outstanding)?(?:\s+on\s+(?:the\s+)?(?:current\s+)?file)?(?:\s*[—–-]\s*solicitor to confirm relevance before fixing(?: the)? hearing position\.?)?(?:\s*[—–-]\s*still chase if disclosure-relevant\.?)?/gi,
        "Further papers appear to be outstanding. Confirm their relevance before fixing the hearing position.",
      )
      .replace(
        /\bFurther papers appear(?:s)? outstanding on the (?:current )?file(?:\s*[—–-]\s*solicitor to confirm relevance before fixing(?: the)? hearing position\.?)?(?:\s*[—–-]\s*still chase if disclosure-relevant\.?)?/gi,
        "Further papers appear to be outstanding. Confirm their relevance before fixing the hearing position.",
      )
      .replace(
        /(\bFurther papers appear to be outstanding\. Confirm their relevance before fixing the hearing position\.)(?:\s*[—–-]\s*still chase if disclosure-relevant\.?)/gi,
        "$1",
      )
      // BWV / footage pipe or em-dash fragments → natural prose
      .replace(
        /\bBWV\s*\/\s*footage\s*(?:\||—|–|-)\s*not served\s*(?:\||—|–|-)\s*log only;\s*clip outstanding\b/gi,
        "BWV/footage is not served. Only a log entry is available; the clip remains outstanding.",
      )
      // Nested / simple client-name parentheses → natural phrasing (trim nested name)
      .replace(/\bin your case \(([^(]+?)\s*\(([^)]+)\)\)/gi, (_, name: string, detail: string) => {
        return `for ${String(name).trim()} (${String(detail).trim()})`;
      })
      .replace(/\bin your case \(([^()]+)\)/gi, "for $1")
      // Leading unexplained hyphen on a line
      .replace(/(^|\n)\s*[-–—]\s+(?=[A-Za-z])/g, "$1")
      // Pipe-delimited preview fragments (not path separators like MG6C/SX/02)
      .replace(
        /\b([A-Za-z][\w /-]{1,40})\s*\|\s*([A-Za-z][\w /-]{1,80}(?:;\s*[A-Za-z][\w /-]{1,40})?)\b/g,
        "$1 — $2",
      )
      .replace(/\breferred_only\b/g, "Referred only")
      .replace(/\bnot_safely_confirmed\b/g, "Not safely confirmed")
      .replace(/\bneeds_review\b/g, "Needs review")
      .replace(/\bnot_started\b/g, "Not started")
      // Collapse accidental doubled spaces (preserve newlines)
      .replace(/[^\S\n]{2,}/g, " ")
      .replace(/ +([)\].,;:])/g, "$1"),
  );
}

export function inferBlockedItemLabel(text: string, index: number): string {
  const n = index + 1;
  if (isFixtureIdLike(text)) return `Internal case identifier (not for solicitor copy) (${n})`;
  if (/chase|MG6|disclosure|unused schedule|please provide/i.test(text)) {
    return `Disclosure chase request (${n})`;
  }
  if (/attribution|outstanding|not safely/i.test(text)) return `Evidence-status wording (${n})`;
  if (/ask the court|court to record|defence asks/i.test(text)) return `Court-facing application wording (${n})`;
  if (/client-safe|we are reviewing/i.test(text)) return `Client-safe summary wording (${n})`;
  if (/defensive force|PWITS|wrong.?family/i.test(text)) return `Cross-family containment probe (${n})`;
  if (/truncat|outstan$/i.test(text)) return `Incomplete / truncated wording (${n})`;
  if (/\{\{|MISSING_ITEM|placeholder/i.test(text)) return `Unresolved placeholder wording (${n})`;
  if (/served screenshot|message pack|subscriber/i.test(text)) return `Disclosure status wording (${n})`;
  return `Solicitor copy candidate — review required (${n})`;
}

export function humanBlockReason(ruleIds: string[] | undefined, fallback?: string): string {
  const ids = ruleIds ?? [];
  if (ids.includes("qualified_solicitor_review_required")) {
    return "Legally sensitive formula — queued for qualified solicitor review.";
  }
  if (ids.includes("sentence.truncated_fragment")) {
    return "Text appears truncated or incomplete and must not be copied.";
  }
  if (ids.includes("sentence.unresolved_placeholder")) {
    return "Unresolved placeholder text must not be copied.";
  }
  if (ids.includes("wrong_family.unsupported_template_leakage")) {
    return "Wrong offence-family wording was blocked.";
  }
  if (ids.includes("family_candidate_unproven")) {
    return "This wording could not be proven compatible with the resolved offence family for free copy.";
  }
  if (ids.includes("offence_family_uncertain")) {
    return "Offence family could not be safely resolved for this matter, so free copy is unavailable.";
  }
  if (ids.some((r) => r.startsWith("sentence."))) {
    return "Wording failed sentence integrity checks and must not be copied.";
  }
  return (
    fallback ??
    "Output failed integrity checks. Review the source papers before relying on or sending this content."
  );
}

/** Matter-family resolved vs unresolved contradiction (cross-surface). */
export const MATTER_FAMILY_RESOLVED_PHRASE = "Offence family resolved for this matter";
export const MATTER_FAMILY_UNRESOLVED_PHRASES = [
  "Offence family is not safely resolved",
  "Offence family not safely resolved",
  "Offence family could not be safely resolved for this matter",
] as const;

export function hasMatterFamilyResolvedUnresolvedContradiction(texts: string[]): boolean {
  const joined = texts.join("\n\n");
  const resolved = new RegExp(MATTER_FAMILY_RESOLVED_PHRASE, "i").test(joined);
  const unresolved = MATTER_FAMILY_UNRESOLVED_PHRASES.some((p) =>
    new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(joined),
  );
  return resolved && unresolved;
}

/** Proportionate blocked preview: label + reason, never unsafe source text. */
export function formatBlockedCopyPreview(input: {
  itemLabel: string;
  reason: string;
}): string {
  return [`Item: ${input.itemLabel}`, "Status: Copy unavailable", `Reason: ${input.reason}`].join("\n");
}

export function solicitorVisibleGatedCopy(input: {
  text: string;
  canCopy: boolean;
  blockedBanner?: string | null;
  queueForQualifiedReview?: boolean;
  itemLabel?: string;
  ruleIds?: string[];
  itemIndex?: number;
}): { display: string; canCopy: boolean; gateStatus: string } {
  if (input.queueForQualifiedReview || requiresQualifiedSolicitorReviewQueue(input.text)) {
    const label = input.itemLabel ?? inferBlockedItemLabel(input.text, input.itemIndex ?? 0);
    return {
      display: formatBlockedCopyPreview({
        itemLabel: label,
        reason: humanBlockReason(["qualified_solicitor_review_required"]),
      }),
      canCopy: false,
      gateStatus: "qualified_solicitor_review_queue",
    };
  }
  if (!input.canCopy) {
    const label = input.itemLabel ?? inferBlockedItemLabel(input.text, input.itemIndex ?? 0);
    const reason = humanBlockReason(
      input.ruleIds,
      input.blockedBanner?.includes("integrity")
        ? NEUTRAL_SOLICITOR_BLOCKED_BANNER
        : input.blockedBanner ?? REVIEW_REQUIRED_NEUTRAL,
    );
    return {
      display: formatBlockedCopyPreview({ itemLabel: label, reason }),
      canCopy: false,
      gateStatus: "integrity_blocked",
    };
  }
  if (isFixtureIdLike(input.text) || isInternalNonSolicitorString(input.text)) {
    return {
      display: formatBlockedCopyPreview({
        itemLabel: inferBlockedItemLabel(input.text, input.itemIndex ?? 0),
        reason: "Internal identifier or debug text is not solicitor-facing content.",
      }),
      canCopy: false,
      gateStatus: "internal_stripped",
    };
  }
  return { display: sanitizeSolicitorProse(input.text), canCopy: true, gateStatus: "ok" };
}

export function dedupeSolicitorLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = solicitorDisplayLabel(raw);
    const key = label.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}
