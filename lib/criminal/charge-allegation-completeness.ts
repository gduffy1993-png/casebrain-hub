/**
 * Charge / allegation completeness — structured result.
 *
 * Never hide recorded charge wording behind a generic replacement.
 * Never invent or autocomplete a statutory citation.
 * Charge + warning + required action remain inseparable when incomplete.
 */

import type { ChargeDocumentRole } from "@/lib/criminal/structured-charge-state";

/** Ends that indicate a statutory citation was cut mid-phrase. */
export const MID_STATUTE_TRUNCATION_RE =
  /\b(?:contrary to (?:section|s\.?)\s*[\d()A-Za-z./\-]+\s+of the|contrary to common)\s*$/i;

/** Hanging article/preposition after a statute opener. */
export const MID_STATUTE_HANGING_RE =
  /\b(?:Communications|Theft|Fraud|Sexual Offences|Serious Crime|Criminal (?:Damage|Justice|Law)|Children and Young Persons|Road Traffic|Misuse of Drugs)\s+Act\s*$/i;

export const INCOMPLETE_CHARGE_WARNING =
  "Status: The recorded charge wording appears incomplete and could not be safely completed from the available papers.";

export const INCOMPLETE_CHARGE_ACTION =
  "Action: Check the operative charge sheet or amendment record.";

/** Forbidden generic replacements that hide the recorded source text. */
export const FORBIDDEN_GENERIC_CHARGE_REPLACEMENTS = [
  "Charge wording incomplete on papers — solicitor review required",
  "Allegation under review",
  "Charge not on papers",
] as const;

export type ChargeCompletenessStatus =
  | "complete"
  | "rendering_truncation_recovered"
  | "source_incomplete"
  | "unresolved";

export type ChargeInstrumentSnapshot = {
  exactWording: string;
  documentRole: ChargeDocumentRole;
  label?: string | null;
};

export type ChargeCompletenessResult = {
  /** Exact recorded wording as captured — always retained, never discarded. */
  sourceChargeText: string;
  /** Text shown on solicitor surfaces (may equal source, or a recovered complete line). */
  displayedChargeText: string;
  completenessStatus: ChargeCompletenessStatus;
  /** Where a recovery came from, when status is rendering_truncation_recovered. */
  recoverySource: "canonical_offence_line" | "court_note_subject" | "operative_instrument" | null;
  provenance: string | null;
  warning: string | null;
  requiredAction: string | null;
  /** Amended / superseded / operative distinctions preserved. */
  instruments: ChargeInstrumentSnapshot[];
};

/**
 * True when text ends mid-word (renderer truncation), e.g. "...current pap".
 * Prefers detecting incomplete final tokens rather than legitimate short words.
 */
export function isMidWordSolicitorTruncation(text: string | null | undefined): boolean {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 12) return false;
  if (/[.!?]"?'?\s*$/.test(t)) return false;
  if (/\b(?:cps|mg11|mg6c?|ptph|bwv|cctv|dna|anpr|vrm|pfha|pwits|ltd|plc|uk|id)\.?\s*$/i.test(t)) {
    return false;
  }
  const last = (t.split(/\s+/).pop() ?? "").replace(/[^A-Za-z]/g, "");
  if (last.length < 3 || last.length > 12) return false;
  if (
    /^(pap|curren|outstandin|disclos|confirme|materia|evidenc|servic|safeguar|attribut|provisio|outstand)$/i.test(
      last,
    )
  ) {
    return true;
  }
  // Complete short legal/common words — never treat as mid-word cuts.
  if (
    /^(law|act|code|file|note|court|order|bail|plea|trial|jury|count|offence|offense|charge|papers|schedule|bundle|master|export|footage|statement|interview|transcript|defendant|complainant|prosecution|defence|defense|outstanding|available|required|confirmed|extracted|missing|served|referred|hearing|position|review|common|the|and|or|for|with|from|that|which|this|into|onto|upon|over|under|after|before|about|between)$/i.test(
      last,
    )
  ) {
    return false;
  }
  // Ends on a truncated alphabetic token that is not a complete common word ending.
  return (
    /^[A-Za-z]+$/.test(last) &&
    last.length <= 6 &&
    !/(?:ing|ed|ly|tion|sion|ment|ance|ence|ous|able|ible|ive|als?|ers?|ors?|ary|ory|ics?|ate|ures?|ants?|ents?|ness|ful|less|ships?|ity|ties|screenshots?)$/i.test(
      last,
    )
  );
}

/**
 * True when text looks like a charge/allegation/court-line cut mid-statutory provision.
 * Never treats a complete "… of the Communications Act 2003" as truncated.
 */
export function isMidStatuteChargeTruncation(text: string | null | undefined): boolean {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t || t.length < 24) return false;
  if (MID_STATUTE_TRUNCATION_RE.test(t)) return true;
  if (MID_STATUTE_HANGING_RE.test(t)) return true;
  if (/\bof the\s*$/i.test(t) && /\b(?:contrary to|section|s\.?\s*\d)/i.test(t)) return true;
  return false;
}

export function isIncompleteRecordedChargeText(text: string | null | undefined): boolean {
  return isMidStatuteChargeTruncation(text) || isMidWordSolicitorTruncation(text);
}

export function isForbiddenGenericChargeReplacement(text: string | null | undefined): boolean {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return (FORBIDDEN_GENERIC_CHARGE_REPLACEMENTS as readonly string[]).some(
    (g) => t === g || t.toLowerCase() === g.toLowerCase(),
  );
}

/**
 * Extract the offence/charge subject from a complete court-line of the form:
 * "The defence asks the court to record that <subject> remains …"
 * Returns null when the court line is itself mid-statute truncated or does not match.
 */
export function extractChargeSubjectFromCourtLine(courtLine: string | null | undefined): string | null {
  const t = (courtLine ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  // Allow truncated trailing status ("… current pap") — still recover the subject when complete.
  const m = t.match(/^The defence asks the court to record that\s+(.+?)\s+remains\b/i);
  if (!m?.[1]) return null;
  const subject = m[1].trim();
  if (!subject || isIncompleteRecordedChargeText(subject)) return null;
  if (/^The defence asks the court to record that\b/i.test(subject)) return null;
  return subject;
}

/**
 * Prefer a complete shorter source-backed display over mid-word / mid-sentence truncation.
 * Never invent statutory citations — only trims to a complete already-present clause.
 */
export function preferCompleteShorterSolicitorSentence(text: string | null | undefined): string {
  const raw = (text ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  if (!isIncompleteRecordedChargeText(raw) && !/\bcurrent pap(?!ers)\b/i.test(raw)) return raw;

  const fromCourt = extractChargeSubjectFromCourtLine(raw);
  if (fromCourt) return fromCourt;

  let t = raw
    .replace(/^The defence asks the court to record that\s+/i, "")
    .replace(/\s+remains\s+(?:not safely confirmed|outstanding|provisional|referred only|missing|incomplete).*$/i, "")
    .trim();
  if (t && !isIncompleteRecordedChargeText(t) && !/\bcurrent pap(?!ers)\b/i.test(t)) return t;

  // Drop a trailing mid-word token (e.g. "pap") and trailing dangling connectors.
  const words = raw.split(/\s+/);
  while (words.length > 3) {
    const candidate = words.join(" ").replace(/[,:;.—–-]+$/u, "").trim();
    if (!isIncompleteRecordedChargeText(candidate) && !/\bcurrent pap(?!ers)\b/i.test(candidate)) {
      return candidate;
    }
    words.pop();
  }
  return raw;
}

function normalise(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function isCompleteChargeLine(text: string): boolean {
  return (
    text.length > 0 &&
    !isIncompleteRecordedChargeText(text) &&
    !isForbiddenGenericChargeReplacement(text) &&
    !/^The defence asks the court to record that\b/i.test(text)
  );
}

/**
 * Compose displayed charge with inseparable warning + action when incomplete.
 * Complete / recovered charges return displayed text alone.
 */
export function formatChargeWithInseparableWarning(result: ChargeCompletenessResult): string {
  if (result.completenessStatus === "complete" || result.completenessStatus === "rendering_truncation_recovered") {
    return result.displayedChargeText;
  }
  const parts = [result.displayedChargeText];
  if (result.warning) parts.push(result.warning);
  if (result.requiredAction) parts.push(result.requiredAction);
  return parts.filter(Boolean).join("\n\n");
}

/**
 * Structured charge completeness resolution.
 *
 * - Always retains sourceChargeText (exact recorded wording).
 * - Recovers from canonical / court / operative instrument when available.
 * - When unrecovered, displays the exact incomplete recorded wording — never a generic hide.
 * - Never invents statutory citations.
 */
export function resolveChargeCompleteness(args: {
  recordedChargeText?: string | null;
  canonicalOffenceLine?: string | null;
  courtNoteText?: string | null;
  instruments?: ChargeInstrumentSnapshot[] | null;
  provenance?: string | null;
}): ChargeCompletenessResult {
  const recorded = normalise(args.recordedChargeText);
  const canonical = normalise(args.canonicalOffenceLine);
  const instruments = (args.instruments ?? []).map((i) => ({
    exactWording: normalise(i.exactWording),
    documentRole: i.documentRole,
    label: i.label ?? null,
  }));
  const operative = instruments.find(
    (i) => i.documentRole === "operative" && isCompleteChargeLine(i.exactWording),
  );
  const fromCourt = extractChargeSubjectFromCourtLine(args.courtNoteText);

  const sourceChargeText =
    recorded ||
    canonical ||
    fromCourt ||
    operative?.exactWording ||
    instruments.find((i) => i.exactWording)?.exactWording ||
    "";

  const base = {
    sourceChargeText,
    provenance: args.provenance ?? null,
    instruments,
  };

  // 1) Recorded wording is already complete (not a nested court-line, not mid-word cut).
  if (recorded && isCompleteChargeLine(recorded)) {
    return {
      ...base,
      displayedChargeText: recorded,
      completenessStatus: "complete",
      recoverySource: null,
      warning: null,
      requiredAction: null,
    };
  }

  const recordedLooksLikeRendererTruncation =
    Boolean(recorded) &&
    (isIncompleteRecordedChargeText(recorded) || /^The defence asks the court to record that\b/i.test(recorded));

  // 2) Renderer/capture truncation with a complete canonical recovery — never invent citations.
  if (canonical && isCompleteChargeLine(canonical)) {
    return {
      ...base,
      sourceChargeText: recorded || sourceChargeText,
      displayedChargeText: canonical,
      completenessStatus: recordedLooksLikeRendererTruncation
        ? "rendering_truncation_recovered"
        : "complete",
      recoverySource: "canonical_offence_line",
      warning: null,
      requiredAction: null,
      provenance:
        args.provenance ??
        "Recovered from canonical offence / charge sheet line (source-backed; not invented).",
    };
  }

  if (fromCourt && isCompleteChargeLine(fromCourt)) {
    return {
      ...base,
      sourceChargeText: recorded || sourceChargeText,
      displayedChargeText: fromCourt,
      completenessStatus: recordedLooksLikeRendererTruncation
        ? "rendering_truncation_recovered"
        : "complete",
      recoverySource: "court_note_subject",
      warning: null,
      requiredAction: null,
      provenance:
        args.provenance ??
        "Recovered subject extracted from complete court-note line (source-backed; not invented).",
    };
  }

  if (operative && isCompleteChargeLine(operative.exactWording)) {
    return {
      ...base,
      sourceChargeText: recorded || sourceChargeText,
      displayedChargeText: operative.exactWording,
      completenessStatus: recordedLooksLikeRendererTruncation
        ? "rendering_truncation_recovered"
        : "complete",
      recoverySource: "operative_instrument",
      warning: null,
      requiredAction: null,
      provenance:
        args.provenance ??
        `Recovered from ${operative.documentRole} instrument (source-backed; not invented).`,
    };
  }

  // Prefer a complete shorter source-backed sentence over displaying mid-word truncation alone.
  // Mid-statute incomplete sources without recovery still keep exact recorded wording visible.
  const midWordOrCourtSlice =
    isMidWordSolicitorTruncation(recorded) ||
    /\bcurrent pap(?!ers)\b/i.test(recorded) ||
    (/^The defence asks the court to record that\b/i.test(recorded) &&
      isIncompleteRecordedChargeText(recorded));

  if (recordedLooksLikeRendererTruncation && midWordOrCourtSlice) {
    const shorterFromRecorded = preferCompleteShorterSolicitorSentence(recorded);
    if (
      shorterFromRecorded &&
      shorterFromRecorded !== recorded &&
      !isIncompleteRecordedChargeText(shorterFromRecorded) &&
      !/^The defence asks the court to record that\b/i.test(shorterFromRecorded)
    ) {
      return {
        ...base,
        sourceChargeText: recorded || sourceChargeText,
        displayedChargeText: shorterFromRecorded,
        completenessStatus: "rendering_truncation_recovered",
        recoverySource: "court_note_subject",
        warning: null,
        requiredAction: null,
        provenance:
          args.provenance ??
          "Recovered complete shorter subject from truncated court-line / renderer slice (source-backed; not invented).",
      };
    }
  }

  if (recordedLooksLikeRendererTruncation && fromCourt && !isIncompleteRecordedChargeText(fromCourt)) {
    return {
      ...base,
      sourceChargeText: recorded || sourceChargeText,
      displayedChargeText: fromCourt,
      completenessStatus: "rendering_truncation_recovered",
      recoverySource: "court_note_subject",
      warning: null,
      requiredAction: null,
      provenance: args.provenance ?? "Recovered complete shorter subject from court note after renderer truncation.",
    };
  }

  // 3) No complete alternative — display exact incomplete recorded wording (never generic hide).
  //    Mid-word renderer cuts still prefer a complete shorter already-present clause when available.
  if (sourceChargeText.length > 0) {
    const incomplete = isIncompleteRecordedChargeText(sourceChargeText) || !isCompleteChargeLine(sourceChargeText);
    const preferShorter =
      isMidWordSolicitorTruncation(sourceChargeText) || /\bcurrent pap(?!ers)\b/i.test(sourceChargeText);
    const shorter = preferShorter ? preferCompleteShorterSolicitorSentence(sourceChargeText) : sourceChargeText;
    const displayed =
      preferShorter &&
      shorter &&
      shorter !== sourceChargeText &&
      !isIncompleteRecordedChargeText(shorter)
        ? shorter
        : sourceChargeText;
    const recoveredShorter = displayed !== sourceChargeText;
    return {
      ...base,
      sourceChargeText,
      displayedChargeText: displayed,
      completenessStatus: recoveredShorter
        ? "rendering_truncation_recovered"
        : incomplete
          ? "source_incomplete"
          : "complete",
      recoverySource: recoveredShorter ? "court_note_subject" : null,
      warning: recoveredShorter ? null : incomplete ? INCOMPLETE_CHARGE_WARNING : null,
      requiredAction: recoveredShorter ? null : incomplete ? INCOMPLETE_CHARGE_ACTION : null,
      provenance:
        args.provenance ??
        (recoveredShorter
          ? "Display prefers complete shorter source-backed wording; exact recorded text retained in sourceChargeText."
          : incomplete
            ? "Recorded charge text retained exactly; no safe completion available."
            : null),
    };
  }

  // 4) Nothing recorded — unresolved, still no generic replacement string as "charge".
  return {
    ...base,
    sourceChargeText: "",
    displayedChargeText: "",
    completenessStatus: "unresolved",
    recoverySource: null,
    warning: INCOMPLETE_CHARGE_WARNING,
    requiredAction: INCOMPLETE_CHARGE_ACTION,
    provenance: args.provenance ?? "No recorded charge wording on papers.",
  };
}

/**
 * Back-compat string helper — returns displayedChargeText only.
 * Prefer resolveChargeCompleteness for production surfaces.
 */
export function resolveCompleteChargeAllegation(args: {
  offenceLine?: string | null;
  courtNoteText?: string | null;
  fallback?: string | null;
  recordedChargeText?: string | null;
}): string {
  const result = resolveChargeCompleteness({
    recordedChargeText: args.recordedChargeText ?? args.fallback ?? null,
    canonicalOffenceLine: args.offenceLine ?? null,
    courtNoteText: args.courtNoteText ?? null,
  });
  return result.displayedChargeText;
}
