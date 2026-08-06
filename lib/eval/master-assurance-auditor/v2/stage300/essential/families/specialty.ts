/**
 * Specialty family — LSL-05 / CHR-06 / CHR-12 / PRC-03 / PRC-04 / PRC-07 ("the Batch-A six").
 *
 * Two independent layers, never merged into CaseBrain output:
 *  1. Harness expected-state layer — Batch-A six evaluators run against fields taken from
 *     specialty-bags-harness.json ONLY (legalStateTaxonomy / dobAgeCalcLedger /
 *     proceduralPartyState). That file is an independent source-side expectation.
 *     When the relevant harness bag is present, named exercise is possible.
 *  2. Production honesty layer — CaseBrain specialty fields must remain null/absent.
 *     Omission (harness expects state; CB emits nothing) and contradiction (CB unexpectedly
 *     emits specialty content) are recorded as harness_expectation-backed candidates.
 *
 * Never write harness bags onto casebrain-output.json.
 */

import { evaluateAllBatchASix, type BatchAEvaluatorResult } from "../../batch-a/evaluators/evaluate";
import type { EssentialCaseInputs } from "../inputs/load-essential-inputs";
import type { EssentialControlId } from "../constants";
import type { EssentialControlResult, EssentialHit } from "../types";

const PRODUCT_GAP_NOTE =
  "Product gap retained: CaseBrain does not emit legalStateTaxonomy / dobAgeCalcLedger / proceduralPartyState / derivedNumericClaims on production output.";

const CONTROL_CB_FIELD: Record<string, string> = {
  "MAA2-LSL-05-CATEGORY-SET-COVERAGE": "legalStateTaxonomy",
  "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING": "dobAgeCalcLedger",
  "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS": "dobAgeCalcLedger",
  "MAA2-PRC-03-YOUTH-STATE": "proceduralPartyState",
  "MAA2-PRC-04-FITNESS-PARTICIPATION": "proceduralPartyState",
  "MAA2-PRC-07-DISCLOSURE-PII-STATE": "proceduralPartyState",
};

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function toEssentialResult(
  controlId: EssentialControlId,
  batchAResult: BatchAEvaluatorResult,
  harnessPresent: boolean,
  cbField: string,
  cbValue: unknown,
): EssentialControlResult {
  const hits: EssentialHit[] = batchAResult.hits.map((h) => ({
    findingCode: h.findingCode,
    occurrenceRef: h.occurrenceRef,
    exactWording: h.exactWording,
    plainEnglish: h.plainEnglish,
    evidenceRefs: h.evidenceRefs,
    candidateClass: "candidate_defect",
  }));

  let missingInputReason = batchAResult.missingInputReason;
  let backing: EssentialControlResult["backing"] = "harness_expectation";

  if (!harnessPresent) {
    missingInputReason = `${missingInputReason ? `${missingInputReason}; ` : ""}specialty-bags-harness.json absent — ${PRODUCT_GAP_NOTE}`;
    backing = "production";
  } else if (batchAResult.applicable && batchAResult.namedControlExerciseStatus !== "not_exercised") {
    // Harness bag present and evaluator exercised against independent expected-state surface.
    if (cbValue == null) {
      hits.push({
        findingCode: `${controlId}-CB-SPECIALTY-OMISSION`,
        occurrenceRef: `/${cbField}`,
        exactWording: "",
        plainEnglish: `Independent specialty-bags-harness expectation exercises ${controlId}, but casebrain-output.json.${cbField} is null/absent — CaseBrain specialty emitter product gap (omission vs independent expected state).`,
        evidenceRefs: [`/${cbField}`, "specialty-bags-harness.json"],
        candidateClass: "omission",
      });
    } else {
      hits.push({
        findingCode: `${controlId}-CB-SPECIALTY-UNEXPECTED-EMIT`,
        occurrenceRef: `/${cbField}`,
        exactWording: JSON.stringify(cbValue).slice(0, 200),
        plainEnglish: `CaseBrain output unexpectedly emits ${cbField} while honesty policy requires specialty bags absent from production — contradiction.`,
        evidenceRefs: [`/${cbField}`, "specialty-bags-harness.json"],
        candidateClass: "contradiction",
      });
    }
  }

  return {
    controlId,
    namedControlExerciseStatus: batchAResult.namedControlExerciseStatus,
    applicable: batchAResult.applicable,
    missingInputReason,
    evidenceRefs: [
      ...batchAResult.evidenceRefs,
      ...(harnessPresent ? ["specialty-bags-harness.json"] : []),
    ],
    hits,
    backing,
    phraseProbeUsed: false,
  };
}

export function evaluateSpecialtyFamily(inputs: EssentialCaseInputs): EssentialControlResult[] {
  const cb = inputs.casebrainOutput.value ?? {};
  const harness = inputs.specialtyBagsHarness.value;
  const harnessPresent = isObj(harness);

  // Evaluator surface built from harness bags ONLY — never merge into CB.
  const harnessEvalSurface: Record<string, unknown> = {
    legalStateTaxonomy: harnessPresent ? harness!.legalStateTaxonomy ?? null : null,
    dobAgeCalcLedger: harnessPresent ? harness!.dobAgeCalcLedger ?? null : null,
    proceduralPartyState: harnessPresent ? harness!.proceduralPartyState ?? null : null,
    derivedNumericClaims: harnessPresent ? harness!.derivedNumericClaims ?? null : null,
  };

  const batchASixResults = evaluateAllBatchASix(harnessEvalSurface);

  return batchASixResults.map((r) =>
    toEssentialResult(
      r.controlId as EssentialControlId,
      r,
      harnessPresent,
      CONTROL_CB_FIELD[r.controlId]!,
      cb[CONTROL_CB_FIELD[r.controlId]!],
    ),
  );
}
