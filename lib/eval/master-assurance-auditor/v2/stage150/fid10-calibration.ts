/**
 * FID-10 quotation provenance calibration.
 * Occurrence-aware classification — not regex / length alone.
 * Zero automatic confirmed-defect decisions.
 *
 * Exact provenance never comes from the quotation text itself.
 */

import crypto from "node:crypto";
import type { SourceLeaf } from "../every-word/independent-leaf-inventory";
import { includedWordingLeaves } from "./detectors";

export type Fid10Family =
  | "substantive_quote_needs_provenance"
  | "heading_label_formatting"
  | "provenance_in_linked_field"
  | "qualified_unknown_provenance"
  | "detector_false_positive"
  | "genuinely_unresolved";

export type Fid10Classified = {
  ref: string;
  text: string;
  family: Fid10Family;
  emitUnresolvedCandidate: boolean;
  reason: string;
  linkedSourceFields: string[];
  exactProvenanceExists: boolean;
};

/** Meta-warning surfaces that wrap forbidden phrases in quotes — not substantive quotations. */
export function isDoNotOverstateSurface(ref: string): boolean {
  return (
    /^\/warningsAndGaps\/doNotOverstate\/\d+$/.test(ref) ||
    /^\/warningsAndGaps\/hardRules\/\d+$/.test(ref)
  );
}

export function isDoNotStateMetaQuote(text: string): boolean {
  const t = text.trim();
  return /^\s*Do not state\s+[“”"]/i.test(t) || /^\s*Do not invent\b/i.test(t);
}

/**
 * Known heading/label schema roles — exemption depends on field reference + role,
 * never on quotation length alone.
 */
export function isKnownHeadingLabelRef(ref: string): boolean {
  return (
    /\/(sectionTitle|columnHeader|heading|uiLabel|fieldHeading)$/.test(ref) ||
    /\/(sectionTitle|columnHeader|heading|uiLabel|fieldHeading)\//.test(ref) ||
    /^\/exportVersion\/(headings|sectionTitles|columnHeaders)\//.test(ref) ||
    /^\/ui\/(headings|labels)\//.test(ref) ||
    /^\/layout\/sectionTitles\//.test(ref)
  );
}

/** Formatting pattern allowed only after known heading/label ref is confirmed. */
export function isHeadingLabelFormatting(ref: string, text: string): boolean {
  if (!isKnownHeadingLabelRef(ref)) return false;
  const t = text.trim();
  if (/^[“"][^“”"\n]{1,80}[”"],?\s*$/.test(t)) return true;
  if (/^[“"][^“”"]{1,40}[”"]\s*,\s*$/.test(t)) return true;
  return false;
}

/** Status / disclosure qualifiers — honest limitation language (does not erase substantive quotes). */
export function isQualifiedUnknownProvenance(text: string): boolean {
  return /\b(requested|not\s+(served|in\s+bundle)|awaited|outstanding|partial\b.{0,20}\bonly|continuity\s+outstanding|do\s+not\s+invent)\b/i.test(
    text,
  );
}

/** Evidence-state tokens alone are NOT source provenance. */
export function isEvidenceStateOnlyToken(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(served|referred|referred_only|missing|incomplete|quarantined|disputed)(\s|$)/i.test(t);
}

/** Generic role/org labels are not source bindings. */
export function isGenericRoleOrOrgLabel(text: string): boolean {
  return /\b(CPS|disclosure\s+officer|officer\s+in\s+the\s+case|OIC)\b/i.test(text.trim()) &&
    !/\bsourceEvidenceId\b/i.test(text) &&
    !/\bpage\s+\d+\b/i.test(text) &&
    !/\bdocument\s+id\b/i.test(text);
}

/** Free narrative mentioning MG/CCTV — not a stable binding. */
export function isNarrativeMentionOnly(text: string): boolean {
  const t = text.trim();
  if (t.length > 80) return true;
  if (/\b(tests?|suggests?|checklist|says|tension|vs\.?|versus|requested)\b/i.test(t)) return true;
  return false;
}

/**
 * Stable ID-like token (not prose). Used for sourceEvidenceId / documentId fields.
 */
export function isStableIdToken(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 64) return false;
  if (/\s{2,}/.test(t)) return false;
  if (isNarrativeMentionOnly(t)) return false;
  if (isGenericRoleOrOrgLabel(t)) return false;
  // ID-like: alphanumeric / hyphen / underscore / slash segments
  return /^[A-Za-z0-9][A-Za-z0-9._:/_-]{1,63}$/.test(t);
}

/**
 * Exact page / paragraph reference.
 */
export function hasExactPageOrParagraphRef(text: string): boolean {
  return /\bpage\s+\d+\b/i.test(text) || /\bp\.?\s*\d+\b/i.test(text) || /\bpara(graph)?\s+\d+\b/i.test(text);
}

/**
 * Evaluate whether a SEPARATE structured field value is an exact provenance binding.
 * Quotation text must never be passed here for self-certification.
 */
export function isExactStructuredProvenanceValue(args: {
  fieldKey: string;
  value: string;
  siblingValues?: Record<string, string>;
}): boolean {
  const { fieldKey, value, siblingValues = {} } = args;
  const v = value.trim();
  if (!v || isEvidenceStateOnlyToken(v)) return false;
  if (isGenericRoleOrOrgLabel(v)) return false;

  const key = fieldKey.toLowerCase();

  if (key === "sourceevidenceid" || key.endsWith("/sourceevidenceid")) {
    return isStableIdToken(v);
  }
  if (
    key === "sourcedocumentid" ||
    key.endsWith("/sourcedocumentid") ||
    key === "documentid" ||
    key.endsWith("/documentid")
  ) {
    return isStableIdToken(v);
  }

  // Page alone is insufficient; needs document id/title/type sibling
  if (key === "page" || key === "pagenumber" || key.endsWith("/page") || key.endsWith("/pagenumber")) {
    const doc =
      siblingValues.sourceDocumentId ||
      siblingValues.sourceDocumentTitle ||
      siblingValues.sourceDocumentType ||
      siblingValues.documentId ||
      "";
    if (!doc.trim()) return false;
    if (isNarrativeMentionOnly(doc)) return false;
    return /^\d+$/.test(v) || hasExactPageOrParagraphRef(`page ${v}`);
  }

  // Title/type alone is insufficient — need page/paragraph sibling
  if (
    key === "sourcedocumenttitle" ||
    key === "sourcedocumenttype" ||
    key.endsWith("/sourcedocumenttitle") ||
    key.endsWith("/sourcedocumenttype")
  ) {
    const page = siblingValues.page || siblingValues.pageNumber || "";
    if (!page.trim()) return false;
    if (isNarrativeMentionOnly(v)) return false;
    return hasExactPageOrParagraphRef(`page ${page}`) || /^\d+$/.test(page.trim());
  }

  // evidenceAnchor: only strict exhibit/doc + page forms — never free narrative
  if (key === "evidenceanchor" || key.endsWith("/evidenceanchor")) {
    if (isNarrativeMentionOnly(v)) return false;
    // Strict: "exhibit MG11 page 4" / "MG11 p.4" / "doc:ID page 3"
    return (
      /^(exhibit\s+)?[A-Z]{1,5}\d{1,4}[A-Za-z]?\s+(page|p\.?)\s*\d+\b/i.test(v) ||
      /^doc(ument)?[:\s-]+[A-Za-z0-9._/-]+\s+(page|p\.?|para(graph)?)\s*\d+\b/i.test(v)
    );
  }

  // Generic "source" / "note" narrative fields never certify alone
  if (key === "source" || key.endsWith("/source") || key === "note" || key.endsWith("/note")) {
    return false;
  }

  return false;
}

/** @deprecated Do not use on quotation text — retained name for callers that must not self-certify. */
export function hasExactProvenanceBinding(_text: string): boolean {
  // Quotation text must never self-certify. Always false.
  return false;
}

export function extractQuotedSpans(text: string): string[] {
  const spans: string[] = [];
  const re = /[“"]([^“”"]{8,})[”"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) != null) {
    spans.push(m[1]);
  }
  return spans;
}

export function hasSubstantiveQuotedSpan(text: string): boolean {
  return extractQuotedSpans(text).some((s) => {
    const words = s.trim().split(/\s+/).filter(Boolean);
    if (words.length >= 4) return true;
    if (words.length >= 2 && /\d/.test(s)) return true;
    return false;
  });
}

function siblingsFromRow(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

/**
 * Collect exact provenance only from independent structured sibling fields.
 * Never treats the quotation leaf text as a binding.
 */
function collectLinkedProvenance(args: {
  ref: string;
  text: string;
  output: Record<string, unknown>;
}): { fields: string[]; exact: boolean } {
  const fields: string[] = [];
  let exact = false;
  // Intentionally ignore args.text for exactness — no self-certification.
  void args.text;

  const mState = args.ref.match(/^\/evidenceStates\/(\d+)(?:\/|$)/);
  if (mState) {
    const i = Number(mState[1]);
    const rows = Array.isArray(args.output.evidenceStates)
      ? (args.output.evidenceStates as Record<string, unknown>[])
      : [];
    const row = rows[i] ?? {};
    const sib = siblingsFromRow(row);
    const candidates: Array<[string, string, string]> = [
      [`/evidenceStates/${i}/sourceEvidenceId`, "sourceEvidenceId", sib.sourceEvidenceId ?? ""],
      [`/evidenceStates/${i}/sourceDocumentId`, "sourceDocumentId", sib.sourceDocumentId ?? ""],
      [`/evidenceStates/${i}/sourceDocumentTitle`, "sourceDocumentTitle", sib.sourceDocumentTitle ?? ""],
      [`/evidenceStates/${i}/sourceDocumentType`, "sourceDocumentType", sib.sourceDocumentType ?? ""],
      [`/evidenceStates/${i}/page`, "page", sib.page ?? ""],
      [`/evidenceStates/${i}/pageNumber`, "pageNumber", sib.pageNumber ?? ""],
      [`/evidenceStates/${i}/evidenceAnchor`, "evidenceAnchor", sib.evidenceAnchor ?? ""],
      [`/evidenceStates/${i}/source`, "source", sib.source ?? ""],
    ];
    for (const [ptr, key, val] of candidates) {
      if (!val) continue;
      fields.push(ptr);
      if (isExactStructuredProvenanceValue({ fieldKey: key, value: val, siblingValues: sib })) {
        exact = true;
      }
    }
  }

  const mFive = args.ref.match(/^\/fiveAnswersEvidenceRows\/(\d+)(?:\/|$)/);
  if (mFive) {
    const i = Number(mFive[1]);
    const rows = Array.isArray(args.output.fiveAnswersEvidenceRows)
      ? (args.output.fiveAnswersEvidenceRows as Record<string, unknown>[])
      : [];
    const row = rows[i] ?? {};
    const sib = siblingsFromRow(row);
    const candidates: Array<[string, string, string]> = [
      [`/fiveAnswersEvidenceRows/${i}/sourceEvidenceId`, "sourceEvidenceId", sib.sourceEvidenceId ?? ""],
      [`/fiveAnswersEvidenceRows/${i}/sourceDocumentId`, "sourceDocumentId", sib.sourceDocumentId ?? ""],
      [`/fiveAnswersEvidenceRows/${i}/evidenceAnchor`, "evidenceAnchor", sib.evidenceAnchor ?? ""],
      [`/fiveAnswersEvidenceRows/${i}/page`, "page", sib.page ?? ""],
      [`/fiveAnswersEvidenceRows/${i}/note`, "note", sib.note ?? ""],
    ];
    for (const [ptr, key, val] of candidates) {
      if (!val) continue;
      fields.push(ptr);
      if (isExactStructuredProvenanceValue({ fieldKey: key, value: val, siblingValues: sib })) {
        exact = true;
      }
    }
  }

  return { fields: [...new Set(fields)], exact };
}

/**
 * Classify a wording leaf for FID-10.
 * Returns whether an unresolved candidate should still be emitted.
 */
export function classifyFid10Quotation(args: {
  ref: string;
  text: string;
  output: Record<string, unknown>;
}): Fid10Classified {
  const { ref, text, output } = args;
  const empty = {
    linkedSourceFields: [] as string[],
    exactProvenanceExists: false,
  };

  if (!/[“”"]/.test(text) || text.replace(/[^“”"]/g, "").length < 2) {
    return {
      ref,
      text,
      family: "detector_false_positive",
      emitUnresolvedCandidate: false,
      reason: "No paired quotation marks.",
      ...empty,
    };
  }

  if (isDoNotOverstateSurface(ref) || isDoNotStateMetaQuote(text)) {
    return {
      ref,
      text,
      family: "detector_false_positive",
      emitUnresolvedCandidate: false,
      reason: "Do-not-overstate / hard-rule meta-quote — not a substantive quotation.",
      ...empty,
    };
  }

  if (isHeadingLabelFormatting(ref, text)) {
    return {
      ref,
      text,
      family: "heading_label_formatting",
      emitUnresolvedCandidate: false,
      reason: "Known heading/label schema role with formatting quotation pattern.",
      ...empty,
    };
  }

  const linked = collectLinkedProvenance({ ref, text, output });
  if (linked.exact) {
    return {
      ref,
      text,
      family: "provenance_in_linked_field",
      emitUnresolvedCandidate: false,
      reason:
        "Exact provenance from independent structured binding (sourceEvidenceId / document ID + page / stable anchor).",
      linkedSourceFields: linked.fields,
      exactProvenanceExists: true,
    };
  }

  const substantive = hasSubstantiveQuotedSpan(text);
  if (substantive) {
    return {
      ref,
      text,
      family: "substantive_quote_needs_provenance",
      emitUnresolvedCandidate: true,
      reason:
        "Substantive quoted span without independent structured provenance — unresolved candidate only (not a confirmed defect).",
      linkedSourceFields: linked.fields,
      exactProvenanceExists: false,
    };
  }

  if (isQualifiedUnknownProvenance(text) && !substantive) {
    return {
      ref,
      text,
      family: "qualified_unknown_provenance",
      emitUnresolvedCandidate: false,
      reason: "Qualified unknown/outstanding status wording without substantive quotation.",
      linkedSourceFields: linked.fields,
      exactProvenanceExists: false,
    };
  }

  return {
    ref,
    text,
    family: "genuinely_unresolved",
    emitUnresolvedCandidate: true,
    reason: "Quoted material without clear family — unresolved candidate only.",
    linkedSourceFields: linked.fields,
    exactProvenanceExists: false,
  };
}

export function classifyAllFid10Candidates(args: {
  leaves: SourceLeaf[];
  output: Record<string, unknown>;
}): Fid10Classified[] {
  const out: Fid10Classified[] = [];
  for (const w of includedWordingLeaves(args.leaves)) {
    if (!/[“”"]/.test(w.text) || w.text.replace(/[^“”"]/g, "").length < 2) continue;
    out.push(classifyFid10Quotation({ ref: w.ref, text: w.text, output: args.output }));
  }
  return out;
}

export function fid10TextHash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/** Former Batch-2 (incorrect) length-based heading rule — for disposition before/after only. */
export function formerHeadingByLengthAlone(text: string): boolean {
  const t = text.trim();
  if (/^[“"][^“”"\n]{1,80}[”"],?\s*$/.test(t)) return true;
  if (/^[“"][^“”"]{1,40}[”"]\s*,\s*$/.test(t)) return true;
  return false;
}

export function formerFid10Disposition(args: {
  ref: string;
  text: string;
}): Fid10Family {
  const { ref, text } = args;
  if (!/[“”"]/.test(text) || text.replace(/[^“”"]/g, "").length < 2) return "detector_false_positive";
  if (isDoNotOverstateSurface(ref) || isDoNotStateMetaQuote(text)) return "detector_false_positive";
  if (formerHeadingByLengthAlone(text)) return "heading_label_formatting";
  if (isQualifiedUnknownProvenance(text)) return "qualified_unknown_provenance";
  if (/\b(source|exhibit|mg\s?\d|statement|page\s+\d+|interview)\b/i.test(text)) {
    return "provenance_in_linked_field";
  }
  if (text.match(/[“"]([^“”"]{12,})[”"]/)) return "substantive_quote_needs_provenance";
  return "genuinely_unresolved";
}
