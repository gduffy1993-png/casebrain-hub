/**
 * Batch-2 Stage-150 packet-local detectors (30 controls).
 * Deterministic; inventory-bound wording; no truth opening.
 */

import type { Stage150EvalContext, Stage150Hit } from "./detectors";
import { includedWordingLeaves } from "./detectors";

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}
function hit(
  partial: Omit<Stage150Hit, "exactWording"> & { exactWording?: string },
): Stage150Hit {
  return { ...partial, exactWording: partial.exactWording ?? "" };
}

export function evaluateBatch2Charge(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const wording = includedWordingLeaves(ctx.leaves);
  const court = wording.find((w) => w.ref === "/courtNote/text")?.text ?? "";
  const gaps = (ctx.output.warningsAndGaps ?? {}) as Record<string, unknown>;
  const dno = Array.isArray(gaps.doNotOverstate) ? (gaps.doNotOverstate as unknown[]) : [];

  for (const w of wording) {
    const t = w.text;
    if (w.ref === "/courtNote/text" && /\bdefinitive\s+charge\b/i.test(t) && !/\b(source|recorded|as\s+recorded|per\s+charge\s+sheet|indictment|mg\s?5)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "recorded_source_invisible",
          controlId: "MAA2-CHG-01-RECORDED-SOURCE-VISIBLE",
          findingCode: "CHG_RECORDED_SOURCE_INVISIBLE",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "unresolved",
          plainEnglish: "Charge presented without recorded-source cue.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(charge|count\s+\d+|offence)\b/i.test(t) && /[A-Za-z]{3,}-\s*$/.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "charge_truncated",
          controlId: "MAA2-CHG-04-COMPLETE-NOT-TRUNCATED",
          findingCode: "CHG_CHARGE_TRUNCATED",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Charge/offence wording appears mid-truncated.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(draft|amended)\b/i.test(t) && /\b(operative|final)\s+charge\b/i.test(t) && /\b(as\s+operative|is\s+operative|treated as\s+operative)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "draft_as_operative",
          controlId: "MAA2-CHG-05-OPERATIVE-INSTRUMENT",
          findingCode: "CHG_DRAFT_AS_OPERATIVE",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Draft/amended instrument treated as operative charge.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(amended|superseded|replaced)\b/i.test(t) && /\bcharge\b/i.test(t) && !/\b(history|notice|dated|by\s+formal)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "amendment_without_history",
          controlId: "MAA2-CHG-06-AMENDMENT-HISTORY",
          findingCode: "CHG_AMENDMENT_WITHOUT_HISTORY",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "unresolved",
          plainEnglish: "Amendment/supersession mentioned without history cue.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\bcount\s+(\d+)\b/i.test(t) && /\bcount\s+(\d+)\b/i.test(t)) {
      const nums = [...t.matchAll(/\bcount\s+(\d+)\b/gi)].map((m) => m[1]);
      if (nums.length >= 2 && new Set(nums).size !== nums.length && /\b(same|identical)\s+count\b/i.test(t)) {
        hits.push(
          hit({
            engineId: "charge_legal_state",
            handlerId: "count_number_collision",
            controlId: "MAA2-FID-02-COUNT-NUMBERS",
            findingCode: "FID_COUNT_NUMBER_COLLISION",
            occurrenceRef: w.ref,
            exactWording: t,
            candidateClass: "candidate_defect",
            plainEnglish: "Count-number collision / fidelity risk.",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
    if (/\b(particulars?\s+(missing|absent|TBC|incomplete)|charge\s+wording\s+incomplete)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "particulars_incomplete",
          controlId: "MAA2-FID-03-CHARGE-WORDING-PARTICULARS",
          findingCode: "FID_PARTICULARS_INCOMPLETE",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Charge particulars incomplete.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\bnow\s+served\b/i.test(t) &&
      /\bpreviously\s+not\b/i.test(t) &&
      !/\b(service\s+history|timeline\s+recorded|was\s+missing\s+then\s+served\s+on)\b/i.test(t)
    ) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "negation_stripped",
          controlId: "MAA2-FID-06-PRESERVE-NEGATIVES",
          findingCode: "FID_NEGATION_STRIPPED",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "human_review_required",
          plainEnglish: "Possible negation/history collapse on service language.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(alleged|possibly|apparently)\b/i.test(t) === false && /\b(is\s+guilty|proves|confirmed)\b/i.test(t) && /\b(allegation|alleged)\b/i.test(court)) {
      // qualifier stripped relative to court — soft
    }
    if (/\b(allegation|alleged)\b.{0,40}\b(is\s+proven|confirmed\s+fact)\b/i.test(t) && !/\b(remains\s+alleged)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "qualifier_stripped",
          controlId: "MAA2-FID-07-PRESERVE-QUALIFIERS",
          findingCode: "FID_QUALIFIER_STRIPPED",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Allegation qualifier collapsed toward proven fact.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(statement\s+of\s+facts?)\b/i.test(t) && /\b(as\s+admitted|agreed\s+facts)\b/i.test(t) && !/\b(not\s+agreed|disputed)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "charge_legal_state",
          handlerId: "statement_misclassified",
          controlId: "MAA2-LSL-01-STATEMENT-CLASSIFICATION",
          findingCode: "LSL_STATEMENT_MISCLASSIFIED",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "unresolved",
          plainEnglish: "Statement-of-facts language may be misclassified as agreed admissions.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }

  // CHG-10: charge warning inseparability (charge-specific, sibling to XEX-01)
  const chargeOnCourt = /\b(charge|count\s+\d+|allegation|offence)\b/i.test(court);
  const chargeWarn = dno.findIndex((t) => /\b(charge|count\s+\d+|allegation|offence\s+wording)\b/i.test(str(t)));
  if (chargeOnCourt && /\b(disputed|uncertain|verify)\b/i.test(court) && dno.length > 0 && chargeWarn < 0) {
    hits.push(
      hit({
        engineId: "charge_legal_state",
        handlerId: "charge_warning_inseparable",
        controlId: "MAA2-CHG-10-WARNING-INSEPARABLE",
        findingCode: "CHG_WARNING_INSEPARABLE",
        occurrenceRef: "/courtNote/text",
        exactWording: court,
        candidateClass: "candidate_defect",
        plainEnglish: "Disputed/uncertain charge without inseparable charge warning.",
        evidenceRefs: ["/courtNote/text", "/warningsAndGaps/doNotOverstate"],
      }),
    );
  }

  return hits;
}

export function evaluateBatch2Evidence(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const wording = includedWordingLeaves(ctx.leaves);
  const states = arr(ctx.output.evidenceStates);
  const five = arr(ctx.output.fiveAnswersEvidenceRows);

  for (const w of wording) {
    const t = w.text;
    if (/\b(draft|amended|superseded)\b/i.test(t) && /\b(operative\s+instrument|is\s+operative)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "instrument_status_collapse",
          controlId: "MAA2-BND-02-INSTRUMENT-STATUS",
          findingCode: "BND_INSTRUMENT_STATUS_COLLAPSE",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Instrument status collapsed (draft/amended treated as operative).",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\balias\b/i.test(t) && /\b(same\s+as|identical\s+to|is)\b.{0,30}\b(master|full|original)\b/i.test(t) && !/\b(distinct|separate|not\s+the)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "alias_unsafe_collapse",
          controlId: "MAA2-BND-07-ALIAS-SAFE-COLLAPSE",
          findingCode: "BND_ALIAS_UNSAFE_COLLAPSE",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Alias collapsed unsafely into master/full identity.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\bextract\b/i.test(t) && /\b(full\s+download|complete\s+file|entire\s+document)\b/i.test(t) && /\b(is|as|same)\b/i.test(t) && !/\b(not\s+the\s+full|partial\s+only)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "extract_as_full",
          controlId: "MAA2-BND-08-EXTRACT-VS-FULL",
          findingCode: "BND_EXTRACT_AS_FULL",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Extract treated as full download.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(complete(ly)?\s+disclosed|full\s+disclosure|disclosure\s+is\s+complete)\b/i.test(t) && /\b(partial|referred\s+only|missing)\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "complete_vs_partial",
          controlId: "MAA2-BND-12-COMPLETE-VS-PARTIAL-DISCLOSURE",
          findingCode: "BND_COMPLETE_VS_PARTIAL",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "candidate_defect",
          plainEnglish: "Complete disclosure claim conflicts with partial/missing cues.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }

  const quarantined = states.filter((r) => /quarantine/i.test(str(r.inferredSourceState) + " " + str(r.existenceLabel)));
  const served = states.filter((r) => /\bserved\b/i.test(str(r.inferredSourceState)) && !/quarantine/i.test(str(r.inferredSourceState)));
  // Also flag single-row conflict: quarantined state + served existenceLabel
  states.forEach((row, i) => {
    const state = str(row.inferredSourceState);
    const exist = str(row.existenceLabel);
    if (/quarantine/i.test(state) && /\bserved\b/i.test(exist)) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "quarantine_served_conflict",
          controlId: "MAA2-BND-14-QUARANTINED-CONFLICTING",
          findingCode: "BND_QUARANTINE_SERVED_CONFLICT",
          occurrenceRef: `/evidenceStates/${i}`,
          exactWording: `${state}/${exist}`,
          candidateClass: "candidate_defect",
          plainEnglish: "Evidence row marked quarantined while existenceLabel claims served.",
          evidenceRefs: [`/evidenceStates/${i}/inferredSourceState`, `/evidenceStates/${i}/existenceLabel`],
        }),
      );
    }
  });
  if (quarantined.length && served.length) {
    const sameLabel = quarantined.some((q) =>
      served.some((s) => str(q.label) && str(q.label) === str(s.label)),
    );
    if (sameLabel) {
      hits.push(
        hit({
          engineId: "document_relationship",
          handlerId: "quarantine_served_conflict",
          controlId: "MAA2-BND-14-QUARANTINED-CONFLICTING",
          findingCode: "BND_QUARANTINE_SERVED_CONFLICT",
          occurrenceRef: "/evidenceStates",
          exactWording: `quarantined=${quarantined.length}; served=${served.length}`,
          candidateClass: "candidate_defect",
          plainEnglish: "Same-label evidence marked both quarantined and served.",
          evidenceRefs: ["/evidenceStates"],
        }),
      );
    }
  }

  // Excluded row totals — if wording claims N items but rows differ materially
  for (const w of wording) {
    const m = w.text.match(/\b(\d+)\s+(items?|exhibits?|rows?)\b/i);
    if (m && states.length > 0) {
      const claimed = Number(m[1]);
      if (Number.isFinite(claimed) && Math.abs(claimed - states.length) >= 3 && /\b(total|all)\b/i.test(w.text)) {
        hits.push(
          hit({
            engineId: "document_relationship",
            handlerId: "excluded_row_totals",
            controlId: "MAA2-BND-15-EXCLUDED-ROW-TOTALS",
            findingCode: "BND_EXCLUDED_ROW_TOTALS",
            occurrenceRef: w.ref,
            exactWording: w.text,
            candidateClass: "unresolved",
            plainEnglish: "Stated totals diverge from visible evidenceState row count.",
            evidenceRefs: [w.ref, "/evidenceStates"],
          }),
        );
      }
    }
  }

  five.forEach((row, i) => {
    const existence = str(row.existence).toLowerCase();
    const reliability = str(row.reliability).toLowerCase();
    // Dimension separation: collapsing reliability into existence token
    if (existence && reliability && existence === reliability && /unreliable|missing|served/.test(existence) === false) {
      // same token ok for some; flag when reliability uses existence vocabulary incorrectly
    }
    if (/^(served|missing|referred_only)$/i.test(reliability) && existence && existence !== reliability) {
      hits.push(
        hit({
          engineId: "evidence_attribution",
          handlerId: "dimension_collapse",
          controlId: "MAA2-EVS-01-DIMENSION-SEPARATION",
          findingCode: "EVS_DIMENSION_COLLAPSE",
          occurrenceRef: `/fiveAnswersEvidenceRows/${i}/reliability`,
          exactWording: `${existence}/${reliability}`,
          candidateClass: "candidate_defect",
          plainEnglish: "Reliability field carries existence-state vocabulary — dimensions collapsed.",
          evidenceRefs: [
            `/fiveAnswersEvidenceRows/${i}/existence`,
            `/fiveAnswersEvidenceRows/${i}/reliability`,
          ],
        }),
      );
    }
    const note = str(row.note);
    if ((/unreliable/i.test(reliability) || /unreliable/i.test(existence)) && note.trim() && !/\b(source|exhibit|page|scan|ocr|attribution)\b/i.test(note)) {
      hits.push(
        hit({
          engineId: "evidence_attribution",
          handlerId: "limitation_not_source_linked",
          controlId: "MAA2-ATR-09-SOURCE-LINKED-LIMITATIONS",
          findingCode: "ATR_LIMITATION_NOT_SOURCE_LINKED",
          occurrenceRef: `/fiveAnswersEvidenceRows/${i}/note`,
          exactWording: note,
          candidateClass: "human_review_required",
          plainEnglish: "Limitation note present but not source-linked.",
          evidenceRefs: [`/fiveAnswersEvidenceRows/${i}/note`],
        }),
      );
    }
  });

  states.forEach((row, i) => {
    const blob = `${str(row.label)} ${str(row.evidenceAnchor)}`;
    if (/\b(other\s+matter|wrong\s+case|different\s+defendant)\b/i.test(blob) && /\b(applied|attributed)\b/i.test(blob)) {
      hits.push(
        hit({
          engineId: "evidence_attribution",
          handlerId: "defendant_bleed",
          controlId: "MAA2-ATR-08-NO-DEFENDANT-BLEED",
          findingCode: "ATR_DEFENDANT_BLEED",
          occurrenceRef: `/evidenceStates/${i}/evidenceAnchor`,
          exactWording: blob,
          candidateClass: "candidate_defect",
          plainEnglish: "Possible wrong-matter / defendant bleed attribution.",
          evidenceRefs: [`/evidenceStates/${i}/label`, `/evidenceStates/${i}/evidenceAnchor`],
        }),
      );
    }
  });

  return hits;
}

export function evaluateBatch2Chronology(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  for (const w of includedWordingLeaves(ctx.leaves)) {
    const t = w.text;
    if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(t) && /\b(GMT|BST|UTC)\b/.test(t) === false && /\b(time|at\s+\d{1,2}:\d{2})\b/i.test(t)) {
      hits.push(
        hit({
          engineId: "chronology_procedure",
          handlerId: "date_without_tz",
          controlId: "MAA2-CHR-01-EXACT-DATES-TZ",
          findingCode: "CHR_DATE_WITHOUT_TZ",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "unresolved",
          plainEnglish: "Date/time present without timezone identity.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\b(custody|detention|PACE)\b/i.test(t) &&
      /\b(interview)\b/i.test(t) &&
      /\b\d{1,2}:\d{2}\b/.test(t) &&
      !/\b(clock\s+reconciled|custody\s+record\s+times?\s+reconciled|times?\s+reconciled)\b/i.test(t)
    ) {
      hits.push(
        hit({
          engineId: "chronology_procedure",
          handlerId: "custody_interview_clock",
          controlId: "MAA2-CHR-04-CUSTODY-INTERVIEW-TIMING",
          findingCode: "CHR_CUSTODY_INTERVIEW_CLOCK",
          occurrenceRef: w.ref,
          exactWording: t,
          candidateClass: "human_review_required",
          plainEnglish: "Custody/interview timing without custody-clock reconciliation cue.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (/\b(hearing\s+notice|PTPH|plea\s+hearing)\b/i.test(t) && /\b(served|listed|vacated|adjourned)\b/i.test(t) && !/\b(lifecycle|status|current)\b/i.test(t)) {
      // soft cue when contradictory served+vacated
      if (/\bserved\b/i.test(t) && /\b(vacated|withdrawn)\b/i.test(t)) {
        hits.push(
          hit({
            engineId: "chronology_procedure",
            handlerId: "hearing_notice_lifecycle",
            controlId: "MAA2-CHR-05-HEARING-NOTICE-LIFECYCLE",
            findingCode: "CHR_HEARING_NOTICE_CONFLICT",
            occurrenceRef: w.ref,
            exactWording: t,
            candidateClass: "candidate_defect",
            plainEnglish: "Hearing-notice lifecycle conflict (served vs vacated).",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
    if (/\b(total\s+of\s+)?(\d+)\s+(pages?|documents?|exhibits?)\b/i.test(t)) {
      if (/\b(but|however|only)\b.{0,40}\b(\d+)\s+(pages?|documents?|exhibits?)\b/i.test(t)) {
        hits.push(
          hit({
            engineId: "chronology_procedure",
            handlerId: "evidence_totals_conflict",
            controlId: "MAA2-CHR-09-PAGE-DOC-EVIDENCE-TOTALS",
            findingCode: "CHR_EVIDENCE_TOTALS_CONFLICT",
            occurrenceRef: w.ref,
            exactWording: t,
            candidateClass: "unresolved",
            plainEnglish: "Conflicting page/document/exhibit totals in wording.",
            evidenceRefs: [w.ref],
          }),
        );
      }
    }
  }
  return hits;
}

export function evaluateBatch2CrossOutput(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const wording = includedWordingLeaves(ctx.leaves);
  const court = wording.find((w) => w.ref === "/courtNote/text")?.text ?? "";
  const gaps = (ctx.output.warningsAndGaps ?? {}) as Record<string, unknown>;
  const dno = Array.isArray(gaps.doNotOverstate) ? (gaps.doNotOverstate as unknown[]) : [];
  const states = arr(ctx.output.evidenceStates);

  const partialOnCourt = /\b(partial|referred\s+only|incomplete)\b/i.test(court);
  const partialWarn = dno.some((t) => /\b(partial|referred\s+only|incomplete|not\s+fully\s+served)\b/i.test(str(t)));
  if (partialOnCourt && dno.length > 0 && !partialWarn) {
    hits.push(
      hit({
        engineId: "cross_output_completeness",
        handlerId: "evidence_partial_warning_missing",
        controlId: "MAA2-XEX-02-EVIDENCE-PARTIAL-WARNING",
        findingCode: "XEX_EVIDENCE_PARTIAL_WARNING_MISSING",
        occurrenceRef: "/courtNote/text",
        exactWording: court,
        candidateClass: "candidate_defect",
        plainEnglish: "Partial/incomplete evidence on court without attached partial-evidence warning.",
        evidenceRefs: ["/courtNote/text", "/warningsAndGaps/doNotOverstate"],
      }),
    );
  }

  const quarantined = states.filter((r) => /quarantine/i.test(str(r.inferredSourceState) + str(r.existenceLabel)));
  if (quarantined.length > 0 && /\b(all\s+evidence\s+served|fully\s+served)\b/i.test(court)) {
    hits.push(
      hit({
        engineId: "cross_output_completeness",
        handlerId: "quarantine_vs_total",
        controlId: "MAA2-XEX-06-QUARANTINE-PARTIAL-TOTAL",
        findingCode: "XEX_QUARANTINE_VS_TOTAL",
        occurrenceRef: "/courtNote/text",
        exactWording: court,
        candidateClass: "candidate_defect",
        plainEnglish: "Quarantined evidence rows conflict with total/full-served court claim.",
        evidenceRefs: ["/courtNote/text", "/evidenceStates"],
      }),
    );
  }

  // XEX-08: unavailable exits — defect when wording claims API/PDF/composed_prose exit exercised
  for (const w of wording) {
    const claimsUnavailableExit = /\b(api\s+exit|pdf\s+export|composed\s+prose)\b/i.test(w.text);
    const claimsExercised =
      /\b(ready|safe\s+to\s+send)\b/i.test(w.text) ||
      (/\bexercised\b/i.test(w.text) && !/\bnot[_-\s]?exercised\b/i.test(w.text));
    if (claimsUnavailableExit && claimsExercised) {
      hits.push(
        hit({
          engineId: "cross_output_completeness",
          handlerId: "unavailable_exit_claimed",
          controlId: "MAA2-XEX-08-UNAVAILABLE-EXIT-NOT-EXERCISED",
          findingCode: "XEX_UNAVAILABLE_EXIT_CLAIMED",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "candidate_defect",
          plainEnglish: "Unavailable exit claimed as exercised — must remain not_exercised.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }

  return hits;
}

export function evaluateBatch2WordingChase(ctx: Stage150EvalContext): Stage150Hit[] {
  const hits: Stage150Hit[] = [];
  const wording = includedWordingLeaves(ctx.leaves);
  const seen = new Map<string, string>();
  for (const w of wording) {
    const norm = w.text.replace(/\s+/g, " ").trim().toLowerCase();
    if (norm.length >= 40) {
      if (seen.has(norm) && seen.get(norm) !== w.ref) {
        hits.push(
          hit({
            engineId: "professional_wording",
            handlerId: "duplicate_phrase",
            controlId: "MAA2-WRD-04-NO-DUPLICATE-PHRASES",
            findingCode: "WRD_DUPLICATE_PHRASE",
            occurrenceRef: w.ref,
            exactWording: w.text,
            candidateClass: "candidate_defect",
            plainEnglish: "Duplicate solicitor-visible phrase across surfaces.",
            evidenceRefs: [seen.get(norm)!, w.ref],
          }),
        );
      } else {
        seen.set(norm, w.ref);
      }
    }
    if (/\b(outrageous|slam-dunk|killer\s+point|destroyed\s+the\s+case|open[-\s]?and[-\s]?shut)\b/i.test(w.text)) {
      hits.push(
        hit({
          engineId: "professional_wording",
          handlerId: "hostile_sensational",
          controlId: "MAA2-WRD-12-NO-HOSTILE-SENSATIONAL",
          findingCode: "WRD_HOSTILE_SENSATIONAL",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "candidate_defect",
          plainEnglish: "Hostile or sensational wording on solicitor-visible surface.",
          evidenceRefs: [w.ref],
        }),
      );
    }
    if (
      /\b(internal\s+only|audit\s+trail|DEBUG|fixture|CaseBrain\s+internal|do\s+not\s+show\s+client)\b/i.test(
        w.text,
      )
    ) {
      hits.push(
        hit({
          engineId: "audience_context",
          handlerId: "internal_audit_leak",
          controlId: "MAA2-AUD-07-INTERNAL-AUDIT-NEVER-LEAK",
          findingCode: "AUD_INTERNAL_AUDIT_LEAK",
          occurrenceRef: w.ref,
          exactWording: w.text,
          candidateClass: "candidate_defect",
          plainEnglish: "Internal/audit language leaked onto solicitor-visible wording.",
          evidenceRefs: [w.ref],
        }),
      );
    }
  }

  const gaps = (ctx.output.warningsAndGaps ?? {}) as Record<string, unknown>;
  const chase = arr(gaps.chaseItems);
  const states = arr(ctx.output.evidenceStates);
  chase.forEach((item, i) => {
    const label = str(item.label);
    const draft = str(item.copySuggestion);
    const servedMatch = states.some(
      (s) =>
        /served/i.test(str(s.inferredSourceState)) &&
        label &&
        str(s.label).toLowerCase().includes(label.toLowerCase().slice(0, 12)),
    );
    if (servedMatch && /\b(please\s+serve|request\s+service|not\s+served)\b/i.test(draft + " " + label)) {
      hits.push(
        hit({
          engineId: "chase_actionability",
          handlerId: "chase_already_served",
          controlId: "MAA2-CHS-06-NO-ALIAS-OR-SERVED-DUP",
          findingCode: "CHS_ALREADY_SERVED_DUP",
          occurrenceRef: `/warningsAndGaps/chaseItems/${i}/label`,
          exactWording: label,
          candidateClass: "candidate_defect",
          plainEnglish: "Chase item appears to request already-served material.",
          evidenceRefs: [`/warningsAndGaps/chaseItems/${i}/label`, "/evidenceStates"],
        }),
      );
    }
  });

  return hits;
}

export function evaluateAllBatch2(ctx: Stage150EvalContext): Stage150Hit[] {
  return [
    ...evaluateBatch2Charge(ctx),
    ...evaluateBatch2Evidence(ctx),
    ...evaluateBatch2Chronology(ctx),
    ...evaluateBatch2CrossOutput(ctx),
    ...evaluateBatch2WordingChase(ctx),
  ];
}
