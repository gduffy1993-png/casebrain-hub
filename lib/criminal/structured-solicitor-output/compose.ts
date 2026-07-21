/**
 * Assess + compose structured solicitor output (Phase 5).
 */

import { humanizeChaseFragmentLabel, isRawChaseFragmentLabel } from "@/lib/criminal/disclosure-chase-finalize";
import { collapseRepeatedPhrase, sanitizeSolicitorVisibleText } from "@/lib/criminal/solicitor-display-dedupe";
import {
  STRUCTURED_SOLICITOR_OUTPUT_VERSION,
  type EvidenceExistenceState,
  type StructuredComposeResult,
  type StructuredComposerErrorCode,
  type StructuredFieldRejection,
  type StructuredSolicitorOutputV1,
} from "./schema";

const PLACEHOLDER_RE =
  /\b(?:TODO|TBD|FIXME|\[insert[^\]]*\]|\{[^}]+\}|<<[^>]+>>|PLACEHOLDER|lorem ipsum)\b/i;

const RAW_MARKER_RE = /\|\s*\d+(?:\s*-\s*\d+)?\s*\||\|\s*\*\*|#{2,}|^\s*\d+\s*\|\s*$/m;

const MALFORMED_PUNCT_RE = /\.;|;\.|,\.|\.{2,}|;;+|::+/;

/** Hanging connectors — not legitimate abbreviations. */
const TRUNCATED_RE =
  /\b(?:and|or|that|which|the|to|of|for|with|from|including|including:)\s*$/i;

/** Ends that look like abbreviations / case acronyms — do not treat as truncation. */
const LEGIT_ABBREV_END_RE =
  /\b(?:cps|mg11|mg6c?|ptph|bwv|cctv|dna|anpr|vrm|pfha|pwits|s\.?\s*18|s\.?\s*20|e\.g|i\.e|etc|ltd|plc|uk|id)\.?\s*$/i;

const CONTRADICTORY_RE =
  /\b(?:is\s+)?served\b.{0,40}\bnot served\b|\bnot served\b.{0,40}\b(?:is\s+)?served\b|\b(?:final|complete)\b.{0,40}\b(?:draft|unsigned)\b|\b(?:draft|unsigned)\b.{0,40}\b(?:final|complete)\b/i;

const PIPE_JOIN_RE = /\s\|\s.+\s\|\s|\s\|\|\s/;

function stripPagePipes(raw: string): string {
  return raw
    .replace(/\s*\|\s*\d+(?:\s*-\s*\d+)?\s*\|/gi, " ")
    .replace(/\s*\|\s*\d+\s*\|/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapIssueToCode(issue: string): StructuredComposerErrorCode {
  switch (issue) {
    case "empty":
      return "field.empty";
    case "raw_extraction_marker":
      return "field.raw_extraction_marker";
    case "unresolved_placeholder":
      return "field.unresolved_placeholder";
    case "truncated_fragment":
      return "field.truncated_fragment";
    case "malformed_punctuation":
      return "field.malformed_punctuation";
    case "bullet_label_concat":
      return "field.bullet_label_concat";
    case "contradictory_clause":
      return "field.contradictory_clause";
    case "incomplete_sentence":
      return "field.incomplete_sentence";
    default:
      return "field.partial_sentence";
  }
}

/**
 * Field-level assess — preserves legitimate abbreviations; never treats acronyms as truncation.
 */
export function assessStructuredField(
  raw: string | null | undefined,
  field: StructuredFieldRejection["field"],
): { ok: boolean; text: string | null; rejections: StructuredFieldRejection[] } {
  const rejections: StructuredFieldRejection[] = [];
  let text = (raw ?? "").trim();
  if (!text) {
    return { ok: true, text: null, rejections: [] }; // empty optional field is ok
  }

  if (isRawChaseFragmentLabel(text) || RAW_MARKER_RE.test(text)) {
    rejections.push({
      field,
      code: "field.raw_extraction_marker",
      detail: "Raw extraction / page-pipe marker",
    });
  }
  if (PLACEHOLDER_RE.test(text)) {
    rejections.push({
      field,
      code: "field.unresolved_placeholder",
      detail: "Unresolved placeholder",
    });
  }
  if (MALFORMED_PUNCT_RE.test(text)) {
    rejections.push({
      field,
      code: "field.malformed_punctuation",
      detail: "Malformed punctuation",
    });
  }
  if (PIPE_JOIN_RE.test(text)) {
    rejections.push({
      field,
      code: "field.pipe_join_forbidden",
      detail: "Pipe-joined bullet cluster forbidden",
    });
  }
  if (CONTRADICTORY_RE.test(text)) {
    rejections.push({
      field,
      code: "field.contradictory_clause",
      detail: "Contradictory served/missing language",
    });
  }
  const truncSuspect =
    (TRUNCATED_RE.test(text) || /[-–—:]\s*$/.test(text)) && !LEGIT_ABBREV_END_RE.test(text);
  if (truncSuspect) {
    rejections.push({
      field,
      code: "field.truncated_fragment",
      detail: "Partial / truncated sentence",
    });
  }
  if (/\([^\)]*$/.test(text)) {
    rejections.push({
      field,
      code: "field.incomplete_sentence",
      detail: "Unclosed parenthesis / incomplete sentence",
    });
  }
  if (/^["'].{0,200}$/.test(text) && !/[.!?]"?\s*$/.test(text) && text.length < 12) {
    rejections.push({
      field,
      code: "field.speculative_quotation",
      detail: "Incomplete or speculative quotation",
    });
  }

  text = stripPagePipes(text);
  text = collapseRepeatedPhrase(sanitizeSolicitorVisibleText(text));
  text = text.replace(MALFORMED_PUNCT_RE, ".").replace(/\s+/g, " ").trim();

  const ok = rejections.length === 0 && Boolean(text);
  return { ok, text: ok ? text : text || null, rejections };
}

export type BuildStructuredInput = {
  subject?: string | null;
  evidenceState?: EvidenceExistenceState | null;
  sourceEvidenceId?: string | null;
  whyItMatters?: string | null;
  requestedAction?: string | null;
  hearingDeadlineState?: string | null;
  safetyQualification?: string | null;
  sourceQuotation?: string | null;
  kind?: StructuredSolicitorOutputV1["kind"];
};

/**
 * Build a structured object from fields; reject bad fields with stable codes.
 * Does not invent or complete source quotations.
 */
export function buildStructuredSolicitorOutput(input: BuildStructuredInput): {
  output: StructuredSolicitorOutputV1;
  rejections: StructuredFieldRejection[];
} {
  const rejections: StructuredFieldRejection[] = [];
  const take = (field: StructuredFieldRejection["field"], raw: string | null | undefined) => {
    const r = assessStructuredField(raw, field);
    rejections.push(...r.rejections);
    return r.ok ? r.text : null;
  };

  if (input.sourceQuotation?.trim()) {
    const q = input.sourceQuotation.trim();
    // Never modify/complete quotations — only accept if already assess-clean and complete.
    const aq = assessStructuredField(q, "sourceQuotation");
    if (!aq.ok || !/[.!?]"?\s*$/.test(q)) {
      rejections.push({
        field: "sourceQuotation",
        code: "field.speculative_quotation",
        detail: "Source quotation incomplete or failing integrity — omitted (not completed)",
      });
    }
  }

  const subject = take("subject", input.subject);
  // Never use source excerpts as headings: if subject looks like a long quote, reject.
  if (subject && subject.length > 80 && /^["']/.test(subject)) {
    rejections.push({
      field: "subject",
      code: "field.source_excerpt_as_heading",
      detail: "Source excerpt cannot be used as subject/heading",
    });
  }

  const output: StructuredSolicitorOutputV1 = {
    schemaVersion: STRUCTURED_SOLICITOR_OUTPUT_VERSION,
    subject: subject && !(subject.length > 80 && /^["']/.test(subject)) ? subject : null,
    evidenceState: input.evidenceState ?? null,
    sourceEvidenceId: input.sourceEvidenceId?.trim() || null,
    whyItMatters: take("whyItMatters", input.whyItMatters),
    requestedAction: take("requestedAction", input.requestedAction),
    hearingDeadlineState: take("hearingDeadlineState", input.hearingDeadlineState),
    safetyQualification: take("safetyQualification", input.safetyQualification),
    sourceQuotation: (() => {
      const q = input.sourceQuotation?.trim();
      if (!q) return null;
      const aq = assessStructuredField(q, "sourceQuotation");
      if (!aq.ok || !/[.!?]"?\s*$/.test(q)) return null;
      return q; // verbatim — not rewritten
    })(),
    kind: input.kind ?? "generic",
  };

  return { output, rejections };
}

/**
 * Render structured output to prose.
 * Rules: never join arbitrary bullets with punctuation; never pipe-join labels.
 */
export function renderStructuredSolicitorOutput(output: StructuredSolicitorOutputV1): StructuredComposeResult {
  const rejections: StructuredFieldRejection[] = [];
  const sentences: string[] = [];

  if (output.kind === "court_line" && output.subject) {
    const stateBit =
      output.evidenceState && output.evidenceState !== "served"
        ? ` remains ${output.evidenceState.replace(/_/g, " ")} on the current papers`
        : " remains outstanding on the current papers";
    const line = `The defence asks the court to record that ${output.subject.charAt(0).toLowerCase()}${output.subject.slice(1)}${stateBit} and should be disclosed on a timetable.`;
    const a = assessStructuredField(line, "rendered");
    if (a.ok && a.text) sentences.push(a.text);
    else rejections.push(...a.rejections);
  } else if (output.kind === "cps_chase" && output.subject) {
    const action =
      output.requestedAction ??
      `Please provide ${output.subject.toLowerCase()}. This material appears outstanding on the current file and may be relevant to preparation — conditional on what is ultimately served. Kindly confirm expected service date.`;
    const a = assessStructuredField(action, "rendered");
    if (a.ok && a.text) sentences.push(a.text);
    else rejections.push(...a.rejections);
  } else {
    if (output.subject) {
      const a = assessStructuredField(output.subject, "subject");
      if (a.ok && a.text) sentences.push(a.text);
      else rejections.push(...a.rejections);
    }
    if (output.requestedAction) {
      const a = assessStructuredField(output.requestedAction, "requestedAction");
      if (a.ok && a.text) sentences.push(a.text);
      else rejections.push(...a.rejections);
    }
    if (output.whyItMatters) {
      const a = assessStructuredField(output.whyItMatters, "whyItMatters");
      if (a.ok && a.text) sentences.push(a.text);
      else rejections.push(...a.rejections);
    }
  }

  if (output.safetyQualification) {
    const a = assessStructuredField(output.safetyQualification, "safetyQualification");
    if (a.ok && a.text) sentences.push(a.text);
    else rejections.push(...a.rejections);
  }

  if (output.hearingDeadlineState) {
    const a = assessStructuredField(output.hearingDeadlineState, "hearingDeadlineState");
    if (a.ok && a.text) sentences.push(`Hearing / deadline: ${a.text}`);
    else rejections.push(...a.rejections);
  }

  // Quotation on its own line — never as heading, never completed
  if (output.sourceQuotation) {
    sentences.push(output.sourceQuotation);
  }

  if (!sentences.length) {
    return {
      ok: false,
      text: null,
      output,
      rejections: [
        ...rejections,
        { field: "rendered", code: "compose.no_usable_fields", detail: "No usable fields to render" },
      ],
      disposition: "safely_omitted",
    };
  }

  // Join with newlines / spaces between complete sentences — never ", " across bullet labels
  const text = sentences.join(" ");
  const final = assessStructuredField(text, "rendered");
  if (!final.ok || !final.text) {
    return {
      ok: false,
      text: null,
      output,
      rejections: [...rejections, ...final.rejections],
      disposition: "still_blocked",
    };
  }

  return {
    ok: true,
    text: final.text,
    output,
    rejections,
    disposition: "reconstructed",
  };
}

export function composeStructuredSolicitorOutput(input: BuildStructuredInput): StructuredComposeResult {
  const { output, rejections } = buildStructuredSolicitorOutput(input);
  const rendered = renderStructuredSolicitorOutput(output);
  return {
    ...rendered,
    rejections: [...rejections, ...rendered.rejections],
  };
}

/**
 * Migrate a legacy free-text string into structured output when possible.
 * Does NOT count "hidden by gate" as repaired — returns explicit disposition.
 */
export function migrateLegacySolicitorString(
  legacy: string,
  opts: {
    kind: StructuredSolicitorOutputV1["kind"];
    evidenceState?: EvidenceExistenceState | null;
    sourceEvidenceId?: string | null;
  },
): StructuredComposeResult {
  const raw = (legacy ?? "").trim();
  if (!raw) {
    return {
      ok: false,
      text: null,
      output: null,
      rejections: [{ field: "rendered", code: "field.empty", detail: "Empty legacy string" }],
      disposition: "safely_omitted",
    };
  }

  const pre = assessStructuredField(raw, "rendered");
  if (pre.ok && pre.text) {
    // Already clean — wrap as subject/action without speculative rewrite
    return composeStructuredSolicitorOutput({
      subject: opts.kind === "court_line" || opts.kind === "cps_chase" ? extractSubjectFromLegacy(pre.text) : pre.text,
      requestedAction: opts.kind === "cps_chase" ? pre.text : null,
      evidenceState: opts.evidenceState,
      sourceEvidenceId: opts.sourceEvidenceId,
      kind: opts.kind,
      safetyQualification: "Solicitor review required before reliance or sending.",
    });
  }

  // Truncated / partial sentences: never invent completions — safely omit.
  const wasTruncated = pre.rejections.some((r) => r.code === "field.truncated_fragment");
  if (wasTruncated) {
    return {
      ok: false,
      text: null,
      output: null,
      rejections: pre.rejections,
      disposition: "safely_omitted",
    };
  }

  // Attempt reconstruction from raw markers only
  const humanized = humanizeChaseFragmentLabel(raw);
  const cleanedLabel = stripPagePipes(humanized || raw)
    .replace(PLACEHOLDER_RE, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedLabel || cleanedLabel.length < 8) {
    return {
      ok: false,
      text: null,
      output: null,
      rejections: pre.rejections.length
        ? pre.rejections
        : [{ field: "rendered", code: "compose.legacy_passthrough_rejected", detail: "Cannot reconstruct" }],
      disposition: "safely_omitted",
    };
  }

  // If still has raw markers after humanize, omit rather than invent
  const again = assessStructuredField(cleanedLabel, "subject");
  if (!again.ok || !again.text) {
    // Raw marker that humanized to a clean subject may still fail other checks — try subject-only humanize
    const subjectOnly = assessStructuredField(humanizeChaseFragmentLabel(stripPagePipes(raw)), "subject");
    if (subjectOnly.ok && subjectOnly.text && subjectOnly.text.length >= 8) {
      const reconstructed = composeStructuredSolicitorOutput({
        subject: subjectOnly.text,
        evidenceState: opts.evidenceState ?? "not_safely_confirmed",
        sourceEvidenceId: opts.sourceEvidenceId,
        kind: opts.kind,
        whyItMatters: "Material appears outstanding on the current file — conditional on what is ultimately served.",
        requestedAction:
          opts.kind === "cps_chase"
            ? `Please provide ${subjectOnly.text.toLowerCase()}. Kindly confirm expected service date.`
            : null,
        safetyQualification: "Reconstructed from structured fields — solicitor review required.",
      });
      return {
        ...reconstructed,
        disposition: reconstructed.ok ? "reconstructed" : "still_blocked",
      };
    }
    return {
      ok: false,
      text: null,
      output: null,
      rejections: again.rejections,
      disposition: pre.rejections.some((r) => r.code === "field.raw_extraction_marker")
        ? "safely_omitted"
        : "still_blocked",
    };
  }

  const reconstructed = composeStructuredSolicitorOutput({
    subject: again.text,
    evidenceState: opts.evidenceState ?? "not_safely_confirmed",
    sourceEvidenceId: opts.sourceEvidenceId,
    kind: opts.kind,
    whyItMatters: "Material appears outstanding on the current file — conditional on what is ultimately served.",
    requestedAction:
      opts.kind === "cps_chase"
        ? `Please provide ${again.text.toLowerCase()}. Kindly confirm expected service date.`
        : null,
    safetyQualification: "Reconstructed from structured fields — solicitor review required.",
  });

  return {
    ...reconstructed,
    disposition: reconstructed.ok ? "reconstructed" : "still_blocked",
  };
}

function extractSubjectFromLegacy(text: string): string {
  const court = text.match(
    /(?:asks the court to record|ask the court to record)\s+that\s+(.+?)(?:\s+remains|\s+appears|\s+should|[.;]|$)/i,
  );
  if (court?.[1]) return court[1].replace(/^the\s+/i, "").trim();
  const please = text.match(/please provide\s+(.+?)(?:\.|$)/i);
  if (please?.[1]) return please[1].trim();
  return text.length > 72 ? text.slice(0, 72).trim() : text;
}
