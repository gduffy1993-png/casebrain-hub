/**
 * Stage-300 v2 output-only candidate triage (pre-truth-open) — REVIEW BLOCKER remediation
 * rewrite.
 *
 * Fixes REVIEW BLOCKER #2: the previous version mapped ANY `backing !== "production"` candidate
 * straight to `harness_or_materialisation_defect`, which collapsed every one of the 322 fresh
 * candidates (150 VDR receipt-hash-mismatch findings + ~162 specialty CB-omission/BA6-harness
 * findings) into a single root cause — even though those findings have genuinely different
 * ownership:
 *   - a stale/mismatched receipt PIN (vdr-run-receipt.json vs the casebrain-output.json actually
 *     loaded) IS a harness/materialisation problem — the receipt itself is wrong or stale;
 *   - a Batch-A six evaluator hit against specialty-bags-harness.json's OWN content (BA6_* codes)
 *     is also a harness-only finding — it never inspects CaseBrain's emitted output;
 *   - but a `*-CB-SPECIALTY-OMISSION` finding says CaseBrain's OWN production output field is
 *     null while an independent harness expectation exists — that is a documented, real product
 *     gap (CaseBrain does not emit specialty fields), not a harness defect. It gets a dedicated
 *     disposition (`product_gap_pending_source_validation`) so it is never silently 3-way
 *     conflated with either "confirmed defect" or "harness defect";
 *   - a `*-CB-SPECIALTY-UNEXPECTED-EMIT` finding says CaseBrain's OWN production output
 *     contradicts the honesty policy (it emitted specialty content when it should not have) —
 *     that IS a confirmed CaseBrain defect;
 *   - AUD/XPP findings are stored inside a capture-receipt CONTAINER (audience-packs.json) but
 *     their PAYLOAD is production-derived real audience wording — container type alone must
 *     never decide ownership for this family.
 *
 * `containerKind` (the file/backing type — production | harness_expectation | capture_receipt)
 * is now explicitly separated from `payloadOrigin` (what the actual content represents:
 * genuine production-derived wording vs a harness-only expected-state surface vs receipt
 * metadata/pins). Ownership disposition is decided from findingCode pattern + candidateClass +
 * payloadOrigin — never from containerKind alone.
 */

import type { EssentialCandidate } from "../essential/types";
import type { V2Disposition } from "./constants";

export type ContainerKind = EssentialCandidate["backing"];
export type PayloadOrigin =
  | "production_content"
  | "harness_expectation_content"
  | "receipt_metadata"
  | "unknown";

export type V2TriageRow = {
  candidateId: string;
  caseId: string;
  controlId: string;
  findingCode: string;
  /** The file/backing type the finding was sourced from — never used alone to decide ownership. */
  containerKind: ContainerKind;
  /** What the actual content represents — decides ownership together with findingCode/candidateClass. */
  payloadOrigin: PayloadOrigin;
  disposition: V2Disposition;
  reason: string;
  /** Grouping key for the unique-root-cause register — never collapse distinct causes into one. */
  sharedCause: string;
  truthOpened: false;
};

const VDR_STALE_RECEIPT_RE = /SHA-MISMATCH|PIN-MISMATCH|SHA-MISSING|COMPLETENESS-CLAIMED-BUT-EMPTY/;
const BATCH_A_HARNESS_OWN_FINDING_RE = /^BA6_/;
const CB_SPECIALTY_OMISSION_RE = /-CB-SPECIALTY-OMISSION$/;
const CB_SPECIALTY_UNEXPECTED_EMIT_RE = /-CB-SPECIALTY-UNEXPECTED-EMIT$/;
const AUD_XPP_CONTROL_RE = /^MAA2-(AUD|XPP)-/;

function row(
  c: EssentialCandidate,
  fields: Pick<V2TriageRow, "containerKind" | "payloadOrigin" | "disposition" | "reason" | "sharedCause">,
): V2TriageRow {
  return {
    candidateId: c.candidateId,
    caseId: c.caseId,
    controlId: c.controlId,
    findingCode: c.findingCode,
    truthOpened: false,
    ...fields,
  };
}

export function triageEssentialCandidateV2(args: {
  candidate: EssentialCandidate;
  projectionOnly: boolean;
}): V2TriageRow {
  const c = args.candidate;

  // 1) Stage-150 Cohort-A projection-only rows never confirm a CaseBrain defect.
  if (args.projectionOnly) {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "unknown",
      disposition: "projection_only_not_exercised",
      reason: "Stage-150 Cohort-A projection-only row — never confirms a CaseBrain defect.",
      sharedCause: "PROJECTION_ONLY",
    });
  }

  // 2) Solicitor-quality/every-word subjective wording — never auto-confirmed.
  if (c.candidateClass === "professional_wording_review_required") {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "production_content",
      disposition: "professional_wording_review_required",
      reason: "Solicitor-quality/every-word wording candidate — subjective wording is never auto-confirmed as a CaseBrain defect; routed for professional wording review.",
      sharedCause: `WORDING_REVIEW:${c.findingCode}`,
    });
  }

  // 3) Not a defect signal at all.
  if (c.candidateClass === "not_exercised" || c.candidateClass === "pass_candidate") {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "unknown",
      disposition: "safe_qualified_output",
      reason: `candidateClass=${c.candidateClass} is not a defect signal.`,
      sharedCause: `NOT_A_DEFECT:${c.controlId}`,
    });
  }

  // 4) Stale/mismatched receipt PIN — genuinely about the receipt itself, not CaseBrain's own
  // production emitter (e.g. MAA2-VDR-01-CASEBRAIN-OUTPUT-SHA-MISMATCH / *-PIN-MISMATCH /
  // *-SHA-MISSING / *-COMPLETENESS-CLAIMED-BUT-EMPTY).
  if (VDR_STALE_RECEIPT_RE.test(c.findingCode)) {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "receipt_metadata",
      disposition: "harness_or_materialisation_defect",
      reason: `findingCode=${c.findingCode} is a stale/mismatched capture-receipt PIN (vdr-run-receipt.json) — the receipt/materialisation itself is wrong or stale, independent of what casebrain-output.json actually contains.`,
      sharedCause: `VDR_STALE_RECEIPT:${c.findingCode}`,
    });
  }

  // 5) Batch-A six evaluator hit against specialty-bags-harness.json's OWN content (findingCode
  // begins BA6_ and is not one of the CB-SPECIALTY-* cross-check codes below) — this evaluates
  // the harness bag's internal legal-state/derived-numeric content only; it never inspects
  // CaseBrain's own emitted output.
  if (
    BATCH_A_HARNESS_OWN_FINDING_RE.test(c.findingCode) &&
    !CB_SPECIALTY_OMISSION_RE.test(c.findingCode) &&
    !CB_SPECIALTY_UNEXPECTED_EMIT_RE.test(c.findingCode)
  ) {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "harness_expectation_content",
      disposition: "harness_or_materialisation_defect",
      reason: `findingCode=${c.findingCode} is a Batch-A six evaluator finding against specialty-bags-harness.json's own legal-state/derived-numeric content only — not a CaseBrain output omission.`,
      sharedCause: `BATCH_A_HARNESS:${c.findingCode}`,
    });
  }

  // 6) CB specialty-emitter omission vs a valid independent harness expectation — a documented
  // product gap (CaseBrain does not emit legalStateTaxonomy/dobAgeCalcLedger/proceduralPartyState
  // on production output), pending validation that the harness expectation itself is
  // source-correct. Never harness_or_materialisation_defect (that would blame the wrong side)
  // and never silently confirmed_casebrain_defect (the harness expectation has not itself been
  // independently source-validated in this environment).
  if (CB_SPECIALTY_OMISSION_RE.test(c.findingCode)) {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "production_content",
      disposition: "product_gap_pending_source_validation",
      reason: `findingCode=${c.findingCode} — casebrain-output.json's own specialty field is null/absent while an independent specialty-bags-harness.json expectation exists. This is CaseBrain's own production omission (a documented product gap), pending validation that the harness expectation is itself source-correct — never collapsed into a harness/materialisation defect.`,
      sharedCause: `PRODUCT_GAP_SPECIALTY_OMISSION:${c.controlId}`,
    });
  }

  // 7) CB specialty-emitter unexpectedly emits content on production while honesty policy
  // requires the field to remain absent — a confirmed contradiction on CaseBrain's own output.
  if (CB_SPECIALTY_UNEXPECTED_EMIT_RE.test(c.findingCode)) {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "production_content",
      disposition: "confirmed_casebrain_defect",
      reason: `findingCode=${c.findingCode} — casebrain-output.json unexpectedly emits specialty content contrary to the documented honesty policy; confirmable from CaseBrain's own output alone.`,
      sharedCause: `CONFIRMED_SPECIALTY_UNEXPECTED_EMIT:${c.controlId}`,
    });
  }

  // 8) AUD/XPP findings: the CONTAINER is audience-packs.json (a capture-receipt file), but the
  // PAYLOAD is production-derived real audience wording. Container type alone must never decide
  // ownership here — classify by the finding's own nature (candidateClass), never by backing.
  if (AUD_XPP_CONTROL_RE.test(c.controlId)) {
    if (c.candidateClass === "contradiction") {
      return row(c, {
        containerKind: c.backing,
        payloadOrigin: "production_content",
        disposition: "confirmed_casebrain_defect",
        reason: `findingCode=${c.findingCode} — audience-packs.json payload is production-derived audience wording; the container being a capture-receipt file never re-labels a real contradiction as a harness defect.`,
        sharedCause: `AUD_XPP_CONFIRMED:${c.findingCode}`,
      });
    }
    if (c.candidateClass === "candidate_defect") {
      return row(c, {
        containerKind: c.backing,
        payloadOrigin: "production_content",
        disposition: "confirmed_casebrain_defect",
        reason: `findingCode=${c.findingCode} — objective audience-pack defect (empty/generic/non-distinct/leaked/relabelled wording) on production-derived audience content; the audience-packs.json capture container never re-labels this as a harness defect.`,
        sharedCause: `AUD_XPP_CONFIRMED:${c.findingCode}`,
      });
    }
    if (c.candidateClass === "omission") {
      return row(c, {
        containerKind: c.backing,
        payloadOrigin: "unknown",
        disposition: "unresolved_source_or_provenance",
        reason: `findingCode=${c.findingCode} — AUD/XPP omission candidate; provenance not yet independently confirmed in this environment.`,
        sharedCause: `AUD_XPP_UNRESOLVED:${c.findingCode}`,
      });
    }
    // Fall through to the generic rules below for any other AUD/XPP candidateClass.
  }

  // 9) Generic fallback — backing!==production and none of the specific patterns above matched:
  // genuinely about a capture-receipt/harness surface (eld-version-pair.json /
  // ocr-page-unit-receipts.json / an unmatched vdr-run-receipt.json / specialty-bags-harness.json
  // finding), not CaseBrain's own production emitter.
  if (c.backing !== "production") {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: c.backing === "harness_expectation" ? "harness_expectation_content" : "receipt_metadata",
      disposition: "harness_or_materialisation_defect",
      reason: `backing=${c.backing} — finding is about a capture-receipt/harness surface (vdr-run-receipt.json / eld-version-pair.json / ocr-page-unit-receipts.json / specialty-bags-harness.json), not CaseBrain's own production emitter.`,
      sharedCause: `HARNESS_GENERIC:${c.controlId}:${c.findingCode}`,
    });
  }

  // 10) backing=production from here on.
  if (c.candidateClass === "contradiction") {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "production_content",
      disposition: "confirmed_casebrain_defect",
      reason: "backing=production and candidateClass=contradiction — CaseBrain output itself conflicts with an independent expectation; confirmable from output alone.",
      sharedCause: `PRODUCTION_CONTRADICTION:${c.controlId}:${c.findingCode}`,
    });
  }
  if (c.candidateClass === "omission") {
    return row(c, {
      containerKind: c.backing,
      payloadOrigin: "unknown",
      disposition: "unresolved_source_or_provenance",
      reason: "Omission candidate depends on an independent harness expectation whose real-world schema has never been validated in this environment — not auto-confirmed; pending harness materialisation review.",
      sharedCause: `PRODUCTION_OMISSION:${c.controlId}:${c.findingCode}`,
    });
  }

  return row(c, {
    containerKind: c.backing,
    payloadOrigin: "production_content",
    disposition: "confirmed_casebrain_defect",
    reason: "backing=production, output-only triage on genuine casebrain-output.json: unclassified candidate_defect.",
    sharedCause: `PRODUCTION_UNCLASSIFIED:${c.controlId}:${c.findingCode}`,
  });
}

export function summariseV2Triage(rows: V2TriageRow[]): { total: number; byDisposition: Record<V2Disposition, number> } {
  const byDisposition = {} as Record<V2Disposition, number>;
  for (const r of rows) byDisposition[r.disposition] = (byDisposition[r.disposition] ?? 0) + 1;
  return { total: rows.length, byDisposition };
}

export type WordingTriageRow = {
  caseId: string;
  findingCode: string;
  surface: string;
  occurrenceRef: string;
  disposition: V2Disposition;
  reason: string;
  sharedCause: string;
};

/**
 * Triage one solicitor-quality wording hit. Separate from `triageEssentialCandidateV2` because
 * `SolicitorQualityHit` is not an `EssentialCandidate` (the solicitor-quality ledger is an
 * additional, non-essential-43 ledger — see `essential/solicitor-quality.ts` header) — but it
 * gets the same triage discipline: subjective wording is never auto-confirmed, and objective
 * hits (candidate_defect / contradiction) are not silently downgraded to a lesser disposition.
 */
export function triageSolicitorQualityHit(hit: {
  caseId: string;
  findingCode: string;
  surface: string;
  occurrenceRef: string;
  candidateClass: "professional_wording_review_required" | "candidate_defect" | "contradiction";
}): WordingTriageRow {
  if (hit.candidateClass === "professional_wording_review_required") {
    return {
      caseId: hit.caseId,
      findingCode: hit.findingCode,
      surface: hit.surface,
      occurrenceRef: hit.occurrenceRef,
      disposition: "professional_wording_review_required",
      reason: "Subjective wording-quality judgement call — never auto-confirmed as a CaseBrain defect; routed for professional wording review.",
      sharedCause: `WORDING_REVIEW:${hit.findingCode}`,
    };
  }
  return {
    caseId: hit.caseId,
    findingCode: hit.findingCode,
    surface: hit.surface,
    occurrenceRef: hit.occurrenceRef,
    disposition: "confirmed_casebrain_defect",
    reason: `Objective wording defect (candidateClass=${hit.candidateClass}) on genuinely-exercised solicitor-visible production wording — confirmable without further review.`,
    sharedCause: `WORDING_OBJECTIVE:${hit.findingCode}`,
  };
}

export type UniqueRootCauseEntry = {
  rootCauseId: string;
  sharedCause: string;
  disposition: V2Disposition;
  occurrenceCount: number;
  controlIds: string[];
  findingCodes: string[];
  exampleCandidateIds: string[];
  exampleCaseIds: string[];
};

/**
 * Group triage rows into unique root causes by (sharedCause, disposition) — the direct fix for
 * REVIEW BLOCKER #3 (reporting previously collapsed every root into one blob). Never collapses
 * distinct sharedCause/disposition pairs into the same root.
 */
export function buildUniqueRootCauseRegister(rows: V2TriageRow[]): UniqueRootCauseEntry[] {
  const byKey = new Map<string, V2TriageRow[]>();
  for (const r of rows) {
    const key = `${r.sharedCause}::${r.disposition}`;
    const bucket = byKey.get(key) ?? [];
    bucket.push(r);
    byKey.set(key, bucket);
  }
  const entries: UniqueRootCauseEntry[] = [];
  let i = 0;
  for (const [key, bucket] of byKey.entries()) {
    i += 1;
    const [sharedCause, disposition] = key.split("::");
    entries.push({
      rootCauseId: `ROOT-${String(i).padStart(4, "0")}-${sharedCause.replace(/[^A-Za-z0-9]/g, "_").slice(0, 40)}`,
      sharedCause,
      disposition: disposition as V2Disposition,
      occurrenceCount: bucket.length,
      controlIds: [...new Set(bucket.map((r) => r.controlId))],
      findingCodes: [...new Set(bucket.map((r) => r.findingCode))],
      exampleCandidateIds: bucket.slice(0, 5).map((r) => r.candidateId),
      exampleCaseIds: [...new Set(bucket.slice(0, 20).map((r) => r.caseId))].slice(0, 5),
    });
  }
  return entries.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
}
