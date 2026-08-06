/**
 * SRC-07 / SRC-09 / SRC-12 / SRC-13 / SRC-17 — source/page provenance evaluators against
 * ocr-page-unit-receipts.json.
 *
 * No genuine ocr-page-unit-receipts.json has ever been materialised in this environment (the
 * heavy OCR/binary lane is out of scope for this repo checkout). Written against the schema
 * assumed below; exercised end-to-end in the contracts test with synthetic fixtures.
 *
 * Assumed schema:
 *   {
 *     "pageUnits": Array<{
 *       "pageId": string,
 *       "ocrTextSha256": string | null,
 *       "provenance": string | null,
 *       "redactionMasks": Array<{ maskId: string, reason: string | null }> | null,
 *       "passwordCorruptFlag": boolean
 *     }>,
 *     "paginationDiscontinuity": { "detected": boolean, "handledNote": string | null } | null,
 *     "attachmentInventory": { "declaredRefs": string[], "resolvedRefs": string[], "absentRefs": string[] } | null
 *   }
 */

import type { EssentialCaseInputs } from "../inputs/load-essential-inputs";
import type { EssentialControlId } from "../constants";
import type { EssentialControlResult, EssentialHit } from "../types";

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function notExercised(controlId: EssentialControlId, reason: string): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "not_exercised",
    applicable: false,
    missingInputReason: reason,
    evidenceRefs: [],
    hits: [],
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function evaluated(controlId: EssentialControlId, evidenceRefs: string[], hits: EssentialHit[]): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    evidenceRefs,
    hits,
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function unresolved(controlId: EssentialControlId, evidenceRefs: string[], reason: string): EssentialControlResult {
  return {
    controlId,
    namedControlExerciseStatus: "unresolved",
    applicable: true,
    missingInputReason: reason,
    evidenceRefs,
    hits: [],
    backing: "capture_receipt",
    phraseProbeUsed: false,
  };
}

function containsAcknowledgement(inputs: EssentialCaseInputs, needle: RegExp): boolean {
  const cb = inputs.casebrainOutput.value;
  if (!cb) return false;
  const haystacks: string[] = [];
  if (isObj(cb.courtNote) && typeof cb.courtNote.text === "string") haystacks.push(cb.courtNote.text);
  const wag = cb.warningsAndGaps;
  if (isObj(wag) && Array.isArray(wag.chaseItems)) {
    for (const item of wag.chaseItems) {
      if (isObj(item) && typeof item.copySuggestion === "string") haystacks.push(item.copySuggestion);
      if (isObj(item) && typeof item.label === "string") haystacks.push(item.label);
    }
  }
  return haystacks.some((h) => needle.test(h));
}

export function evaluateSrcFamily(inputs: EssentialCaseInputs): EssentialControlResult[] {
  const raw = inputs.ocrPageUnitReceipts.value;
  const controlIds: EssentialControlId[] = [
    "MAA2-SRC-07-REDACTION-DETECT",
    "MAA2-SRC-09-PAGINATION-DISCONTINUITY",
    "MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS",
    "MAA2-SRC-13-PASSWORD-CORRUPT",
    "MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE",
  ];

  if (!raw) {
    return controlIds.map((id) =>
      notExercised(
        id,
        "ocr-page-unit-receipts.json absent for this case — heavy PDF/OCR/binary lane receipts are out of scope for this repo checkout; source/page provenance controls not_exercised (honest).",
      ),
    );
  }
  if (!isObj(raw)) {
    return controlIds.map((id) => notExercised(id, "ocr-page-unit-receipts.json present but not a JSON object — unresolved schema, fail-closed."));
  }

  const pageUnits = Array.isArray(raw.pageUnits) ? (raw.pageUnits as Array<Record<string, unknown>>) : null;
  const results: EssentialControlResult[] = [];

  // SRC-07 redactionMasks presence/handling
  if (!pageUnits) {
    results.push(unresolved("MAA2-SRC-07-REDACTION-DETECT", ["/pageUnits"], "pageUnits absent."));
  } else {
    const hits: EssentialHit[] = [];
    pageUnits.forEach((pu, i) => {
      const masks = Array.isArray(pu.redactionMasks) ? (pu.redactionMasks as Array<Record<string, unknown>>) : null;
      if (masks) {
        masks.forEach((m, j) => {
          if (typeof m.reason !== "string" || m.reason.trim() === "") {
            hits.push({
              findingCode: "MAA2-SRC-07-REDACTION-MASK-NO-REASON",
              occurrenceRef: `/pageUnits/${i}/redactionMasks/${j}`,
              exactWording: "",
              plainEnglish: `Page unit ${i} redaction mask ${j} has no reason recorded.`,
              evidenceRefs: [`/pageUnits/${i}/redactionMasks/${j}`],
              candidateClass: "candidate_defect",
            });
          }
        });
      }
    });
    results.push(evaluated("MAA2-SRC-07-REDACTION-DETECT", ["/pageUnits"], hits));
  }

  // SRC-09 paginationDiscontinuity
  {
    const pd = isObj(raw.paginationDiscontinuity) ? raw.paginationDiscontinuity : null;
    if (!pd) results.push(unresolved("MAA2-SRC-09-PAGINATION-DISCONTINUITY", ["/paginationDiscontinuity"], "paginationDiscontinuity absent."));
    else {
      const hits: EssentialHit[] =
        pd.detected === true && (typeof pd.handledNote !== "string" || pd.handledNote.trim() === "")
          ? [
              {
                findingCode: "MAA2-SRC-09-DISCONTINUITY-UNHANDLED",
                occurrenceRef: "/paginationDiscontinuity",
                exactWording: "",
                plainEnglish: "paginationDiscontinuity.detected=true but no handledNote — discontinuity surfaced silently.",
                evidenceRefs: ["/paginationDiscontinuity"],
                candidateClass: "candidate_defect",
              },
            ]
          : [];
      results.push(evaluated("MAA2-SRC-09-PAGINATION-DISCONTINUITY", ["/paginationDiscontinuity"], hits));
    }
  }

  // SRC-12 attachmentInventory absent-refs
  {
    const ai = isObj(raw.attachmentInventory) ? raw.attachmentInventory : null;
    if (!ai) results.push(unresolved("MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS", ["/attachmentInventory"], "attachmentInventory absent."));
    else {
      const absentRefs = Array.isArray(ai.absentRefs) ? (ai.absentRefs as string[]) : [];
      const hits: EssentialHit[] =
        absentRefs.length > 0 && !containsAcknowledgement(inputs, /outstanding|absent|missing|not available/i)
          ? [
              {
                findingCode: "MAA2-SRC-12-ABSENT-REFS-UNACKNOWLEDGED",
                occurrenceRef: "/attachmentInventory/absentRefs",
                exactWording: absentRefs.join(","),
                plainEnglish: `${absentRefs.length} absent attachment ref(s) recorded but not reflected anywhere in the CaseBrain output's solicitor-visible text (courtNote/chase copy).`,
                evidenceRefs: ["/attachmentInventory/absentRefs"],
                candidateClass: "candidate_defect",
              },
            ]
          : [];
      results.push(evaluated("MAA2-SRC-12-ATTACHMENTS-ABSENT-REFS", ["/attachmentInventory"], hits));
    }
  }

  // SRC-13 passwordCorruptFlag
  if (!pageUnits) {
    results.push(unresolved("MAA2-SRC-13-PASSWORD-CORRUPT", ["/pageUnits"], "pageUnits absent."));
  } else {
    const flagged = pageUnits.filter((pu) => pu.passwordCorruptFlag === true);
    const hits: EssentialHit[] =
      flagged.length > 0 && !containsAcknowledgement(inputs, /password|corrupt|unreadable|could not (be )?extract/i)
        ? [
            {
              findingCode: "MAA2-SRC-13-PASSWORD-CORRUPT-UNACKNOWLEDGED",
              occurrenceRef: "/pageUnits",
              exactWording: "",
              plainEnglish: `${flagged.length} page unit(s) flagged passwordCorruptFlag=true but not acknowledged in solicitor-visible output.`,
              evidenceRefs: ["/pageUnits"],
              candidateClass: "candidate_defect",
            },
          ]
        : [];
    results.push(evaluated("MAA2-SRC-13-PASSWORD-CORRUPT", ["/pageUnits"], hits));
  }

  // SRC-17 pageUnits ocrTextSha256 provenance
  if (!pageUnits) {
    results.push(unresolved("MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE", ["/pageUnits"], "pageUnits absent."));
  } else {
    const hits: EssentialHit[] = [];
    pageUnits.forEach((pu, i) => {
      const shaOk = typeof pu.ocrTextSha256 === "string" && pu.ocrTextSha256.trim().length > 0;
      const provOk = typeof pu.provenance === "string" && pu.provenance.trim().length > 0;
      if (!shaOk || !provOk) {
        hits.push({
          findingCode: "MAA2-SRC-17-PAGE-UNIT-PROVENANCE-INCOMPLETE",
          occurrenceRef: `/pageUnits/${i}`,
          exactWording: "",
          plainEnglish: `Page unit ${i} missing ${!shaOk ? "ocrTextSha256" : ""}${!shaOk && !provOk ? " and " : ""}${!provOk ? "provenance" : ""}.`,
          evidenceRefs: [`/pageUnits/${i}`],
          candidateClass: "candidate_defect",
        });
      }
    });
    results.push(evaluated("MAA2-SRC-17-EXTRACTED-TEXT-PROVENANCE", ["/pageUnits"], hits));
  }

  return results;
}
