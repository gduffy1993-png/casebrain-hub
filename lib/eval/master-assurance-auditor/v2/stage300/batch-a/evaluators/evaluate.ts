/**
 * Six Batch-A substantive evaluators — fail-closed, no phrase probes.
 */

import type { Stage150Hit } from "../../../stage150/detectors";
import {
  PINNED_LEGAL_STATE_CATEGORY_SET,
  type BatchAEvalExerciseStatus,
  type BatchASixControlId,
  type LegalStateCategory,
} from "./constants";
import { BATCH_A_SPEC_BY_ID, type BatchAControlSpec } from "./specs";

function isObj(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function hit(
  spec: BatchAControlSpec,
  args: {
    occurrenceRef: string;
    plainEnglish: string;
    evidenceRefs: string[];
    exactWording?: string;
    candidateClass?: Stage150Hit["candidateClass"];
  },
): Stage150Hit {
  return {
    engineId: spec.engineId,
    handlerId: spec.handlerId,
    controlId: spec.controlId,
    findingCode: spec.findingCode,
    occurrenceRef: args.occurrenceRef,
    exactWording: args.exactWording ?? "",
    candidateClass: args.candidateClass ?? "candidate_defect",
    plainEnglish: args.plainEnglish,
    evidenceRefs: args.evidenceRefs,
  };
}

export type BatchAEvaluatorResult = {
  controlId: BatchASixControlId;
  namedControlExerciseStatus: BatchAEvalExerciseStatus;
  applicable: boolean;
  missingInputReason: string | null;
  unresolvedReason: string | null;
  evidenceRefs: string[];
  hits: Stage150Hit[];
  emptyHitsDoNotImplyPass: true;
  phraseProbeUsed: false;
};

function youthAgeClass(dobIso: string, asOfIso: string): "youth" | "adult" | "unresolved" {
  const dob = Date.parse(dobIso);
  const asOf = Date.parse(asOfIso);
  if (!Number.isFinite(dob) || !Number.isFinite(asOf) || asOf < dob) return "unresolved";
  const years = (asOf - dob) / (365.25 * 24 * 3600 * 1000);
  if (!Number.isFinite(years)) return "unresolved";
  return years < 18 ? "youth" : "adult";
}

/** LSL-05 — category-set coverage against pinned taxonomy. */
export function evaluateLsl05(output: Record<string, unknown>): BatchAEvaluatorResult {
  const spec = BATCH_A_SPEC_BY_ID.get("MAA2-LSL-05-CATEGORY-SET-COVERAGE")!;
  const bag = output.legalStateTaxonomy;
  if (!isObj(bag)) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason:
        "legalStateTaxonomy absent — chargeInstruments/courtNote alone do not exercise LSL-05 category-set coverage",
      unresolvedReason: null,
      evidenceRefs: [],
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const version = typeof bag.taxonomyVersion === "string" ? bag.taxonomyVersion.trim() : "";
  const used = Array.isArray(bag.usedCategories)
    ? bag.usedCategories.filter((c): c is string => typeof c === "string").map((c) => c.trim())
    : [];
  const surfaceRefs = Array.isArray(bag.surfaceRefs)
    ? bag.surfaceRefs.filter((c): c is string => typeof c === "string")
    : [];
  const evidenceRefs = [
    "/legalStateTaxonomy/taxonomyVersion",
    "/legalStateTaxonomy/usedCategories",
    ...used.map((_, i) => `/legalStateTaxonomy/usedCategories/${i}`),
    ...surfaceRefs.map((_, i) => `/legalStateTaxonomy/surfaceRefs/${i}`),
  ];

  if (!version) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "legalStateTaxonomy.taxonomyVersion missing",
      unresolvedReason: null,
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  if (used.length === 0) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: "taxonomyVersion present but usedCategories empty",
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const pinned = new Set<string>(PINNED_LEGAL_STATE_CATEGORY_SET);
  const unknown = used.filter((c) => !pinned.has(c) && c !== "fact" && c !== "opinion");
  if (unknown.length) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: `unknown category labels: ${unknown.join(",")}`,
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  // Truncation: only fact/opinion (or source_fact+inference) binary on relied surfaces.
  const normalised = new Set(used.map((c) => (c === "fact" ? "source_fact" : c === "opinion" ? "inference" : c)));
  const onlyBinary =
    normalised.size > 0 &&
    [...normalised].every((c) => c === "source_fact" || c === "inference" || c === "fact" || c === "opinion");

  if (onlyBinary) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "evaluated",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: null,
      evidenceRefs,
      hits: [
        hit(spec, {
          occurrenceRef: "/legalStateTaxonomy/usedCategories",
          plainEnglish:
            "Legal-state taxonomy truncated to fact/opinion binary; full pinned category set not available on relied surfaces.",
          evidenceRefs,
          exactWording: used.join(","),
        }),
      ],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  // Positive: non-truncated use of pinned set (at least one non-binary category beyond fact/opinion).
  return {
    controlId: spec.controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    unresolvedReason: null,
    evidenceRefs,
    hits: [],
    emptyHitsDoNotImplyPass: true,
    phraseProbeUsed: false,
  };
}

/** CHR-06 — age at offence/hearing. */
export function evaluateChr06(output: Record<string, unknown>): BatchAEvaluatorResult {
  const spec = BATCH_A_SPEC_BY_ID.get("MAA2-CHR-06-AGE-AT-OFFENCE-HEARING")!;
  const ledger = output.dobAgeCalcLedger;
  if (!isObj(ledger)) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason:
        "dobAgeCalcLedger absent — chronologyEvents timestamps alone never invent DOB/age",
      unresolvedReason: null,
      evidenceRefs: [],
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const dob = typeof ledger.dateOfBirth === "string" ? ledger.dateOfBirth.trim() : "";
  const offenceDate = typeof ledger.offenceDate === "string" ? ledger.offenceDate.trim() : "";
  const hearingDate = typeof ledger.hearingDate === "string" ? ledger.hearingDate.trim() : "";
  const reported =
    typeof ledger.reportedAgeClass === "string" ? ledger.reportedAgeClass.trim().toLowerCase() : "";
  const evidenceRefs = [
    "/dobAgeCalcLedger/dateOfBirth",
    "/dobAgeCalcLedger/offenceDate",
    "/dobAgeCalcLedger/hearingDate",
    "/dobAgeCalcLedger/reportedAgeClass",
  ];

  if (!reported) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "dobAgeCalcLedger.reportedAgeClass missing",
      unresolvedReason: null,
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  if (!dob) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: "reportedAgeClass present while dateOfBirth unknown",
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  if (!offenceDate && !hearingDate) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "dobAgeCalcLedger lacks offenceDate and hearingDate",
      unresolvedReason: null,
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const asOf = offenceDate || hearingDate;
  const expected = youthAgeClass(dob, asOf);
  if (expected === "unresolved") {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: "DOB/asOf dates not parseable for age class",
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  if (reported !== expected && (reported === "adult" || reported === "youth")) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "evaluated",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: null,
      evidenceRefs,
      hits: [
        hit(spec, {
          occurrenceRef: "/dobAgeCalcLedger/reportedAgeClass",
          plainEnglish: `Wrong age class: reported=${reported} expected=${expected} from DOB+${offenceDate ? "offenceDate" : "hearingDate"}.`,
          evidenceRefs,
          exactWording: reported,
        }),
      ],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  return {
    controlId: spec.controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    unresolvedReason: null,
    evidenceRefs,
    hits: [],
    emptyHitsDoNotImplyPass: true,
    phraseProbeUsed: false,
  };
}

/** CHR-12 — transparent calc inputs. */
export function evaluateChr12(output: Record<string, unknown>): BatchAEvaluatorResult {
  const spec = BATCH_A_SPEC_BY_ID.get("MAA2-CHR-12-TRANSPARENT-CALC-INPUTS")!;
  const claims: Array<{ ref: string; label: string; value: unknown; inputs: unknown; unresolved?: boolean }> =
    [];

  const derivedBag = Array.isArray(output.derivedNumericClaims) ? output.derivedNumericClaims : [];
  derivedBag.forEach((raw, i) => {
    if (!isObj(raw)) return;
    claims.push({
      ref: `/derivedNumericClaims/${i}`,
      label: typeof raw.label === "string" ? raw.label : `claim-${i}`,
      value: raw.value,
      inputs: raw.calcInputs,
      unresolved: raw.calcInputsUnresolved === true,
    });
  });

  const ledger = output.dobAgeCalcLedger;
  if (isObj(ledger) && Array.isArray(ledger.derivedValues)) {
    ledger.derivedValues.forEach((raw, i) => {
      if (!isObj(raw)) return;
      claims.push({
        ref: `/dobAgeCalcLedger/derivedValues/${i}`,
        label: typeof raw.label === "string" ? raw.label : `derived-${i}`,
        value: raw.value,
        inputs: raw.calcInputs ?? ledger.calcInputs,
        unresolved: raw.calcInputsUnresolved === true,
      });
    });
  }

  // Age class as a derived claim when reported without calcInputs on ledger
  if (isObj(ledger) && typeof ledger.reportedAgeClass === "string" && ledger.reportedAgeClass.trim()) {
    const hasDerived = claims.some((c) => c.ref.includes("reportedAgeClass") || c.label === "reportedAgeClass");
    if (!hasDerived && Array.isArray(ledger.calcInputs)) {
      claims.push({
        ref: "/dobAgeCalcLedger/reportedAgeClass",
        label: "reportedAgeClass",
        value: ledger.reportedAgeClass,
        inputs: ledger.calcInputs,
      });
    } else if (!hasDerived && ledger.derivedValues == null && derivedBag.length === 0) {
      // Only treat as derived claim when age class is the sole derived surface and calcInputs key exists or is missing
      if ("calcInputs" in ledger || ledger.requireCalcInputs === true) {
        claims.push({
          ref: "/dobAgeCalcLedger/reportedAgeClass",
          label: "reportedAgeClass",
          value: ledger.reportedAgeClass,
          inputs: ledger.calcInputs,
        });
      }
    }
  }

  if (claims.length === 0) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "No derivedNumericClaims[] / dobAgeCalcLedger.derivedValues — not exercised",
      unresolvedReason: null,
      evidenceRefs: [],
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const evidenceRefs = claims.map((c) => c.ref);
  const unresolved = claims.filter((c) => c.unresolved);
  if (unresolved.length) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: `calcInputs marked unresolved on ${unresolved.map((c) => c.ref).join(",")}`,
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const opaque = claims.filter((c) => !Array.isArray(c.inputs) || c.inputs.length === 0);
  if (opaque.length) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "evaluated",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: null,
      evidenceRefs,
      hits: opaque.map((c) =>
        hit(spec, {
          occurrenceRef: c.ref,
          plainEnglish: `Derived number "${c.label}" lacks transparent calcInputs.`,
          evidenceRefs: [c.ref, `${c.ref}/calcInputs`],
          exactWording: String(c.value ?? ""),
        }),
      ),
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  return {
    controlId: spec.controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    unresolvedReason: null,
    evidenceRefs,
    hits: [],
    emptyHitsDoNotImplyPass: true,
    phraseProbeUsed: false,
  };
}

/** PRC-03 — youth state. */
export function evaluatePrc03(output: Record<string, unknown>): BatchAEvaluatorResult {
  const spec = BATCH_A_SPEC_BY_ID.get("MAA2-PRC-03-YOUTH-STATE")!;
  const state = output.proceduralPartyState;
  if (!isObj(state) || !isObj(state.youthState)) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "proceduralPartyState.youthState absent",
      unresolvedReason: null,
      evidenceRefs: [],
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const ys = state.youthState;
  const evidenceRefs = [
    "/proceduralPartyState/youthState",
    "/proceduralPartyState/youthState/defendantId",
    "/proceduralPartyState/youthState/safeguardPrompts",
  ];
  const ageUnknown = ys.ageUnknown === true || ys.dateOfBirthKnown === false;
  const safeguardsClaimed =
    ys.safeguardsSurfaced === true ||
    (Array.isArray(ys.safeguardPrompts) && ys.safeguardPrompts.length > 0);

  if (ageUnknown && safeguardsClaimed) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: "Youth safeguards claimed while age unknown",
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const conflated = ys.culpabilityConflation === true || ys.conflatedWithGuilt === true;

  if (conflated) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "evaluated",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: null,
      evidenceRefs,
      hits: [
        hit(spec, {
          occurrenceRef: "/proceduralPartyState/youthState",
          plainEnglish: "Youth state conflated with culpability/guilt.",
          evidenceRefs,
          exactWording: typeof ys.note === "string" ? ys.note : "culpabilityConflation=true",
        }),
      ],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  return {
    controlId: spec.controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    unresolvedReason: null,
    evidenceRefs,
    hits: [],
    emptyHitsDoNotImplyPass: true,
    phraseProbeUsed: false,
  };
}

/** PRC-04 — fitness/participation. */
export function evaluatePrc04(output: Record<string, unknown>): BatchAEvaluatorResult {
  const spec = BATCH_A_SPEC_BY_ID.get("MAA2-PRC-04-FITNESS-PARTICIPATION")!;
  const state = output.proceduralPartyState;
  if (!isObj(state) || !isObj(state.fitnessParticipation)) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "proceduralPartyState.fitnessParticipation absent",
      unresolvedReason: null,
      evidenceRefs: [],
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const fp = state.fitnessParticipation;
  const evidenceRefs = [
    "/proceduralPartyState/fitnessParticipation",
    "/proceduralPartyState/fitnessParticipation/decided",
    "/proceduralPartyState/fitnessParticipation/limitationText",
  ];

  if (fp.status === "unresolved" && fp.decided !== true) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: "Fitness/participation cues present with status=unresolved",
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  // fitToPlead boolean present (true OR false) means an automated fitness finding was asserted.
  const decided = fp.decided === true || typeof fp.fitToPlead === "boolean";

  if (decided) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "evaluated",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: null,
      evidenceRefs,
      hits: [
        hit(spec, {
          occurrenceRef: "/proceduralPartyState/fitnessParticipation",
          plainEnglish: "Automated fitness/participation finding asserted — solicitor decision required.",
          evidenceRefs,
          exactWording: `decided=${String(fp.decided)} fitToPlead=${String(fp.fitToPlead)}`,
        }),
      ],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  return {
    controlId: spec.controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    unresolvedReason: null,
    evidenceRefs,
    hits: [],
    emptyHitsDoNotImplyPass: true,
    phraseProbeUsed: false,
  };
}

/** PRC-07 — disclosure/PII state. */
export function evaluatePrc07(output: Record<string, unknown>): BatchAEvaluatorResult {
  const spec = BATCH_A_SPEC_BY_ID.get("MAA2-PRC-07-DISCLOSURE-PII-STATE")!;
  const state = output.proceduralPartyState;
  if (!isObj(state) || !isObj(state.disclosurePiiState)) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "not_exercised",
      applicable: false,
      missingInputReason: "proceduralPartyState.disclosurePiiState absent",
      unresolvedReason: null,
      evidenceRefs: [],
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const d = state.disclosurePiiState;
  const hasDisclosure = d.disclosureState != null;
  const hasPii = d.piiState != null;
  const evidenceRefs = [
    "/proceduralPartyState/disclosurePiiState/disclosureState",
    "/proceduralPartyState/disclosurePiiState/piiState",
    "/proceduralPartyState/disclosurePiiState/conflated",
  ];

  if (!hasDisclosure || !hasPii) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "unresolved",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: "disclosurePiiState incomplete — both disclosureState and piiState required",
      evidenceRefs,
      hits: [],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  const conflated = d.conflated === true || d.piiCountedAsDisclosureServed === true;

  if (conflated) {
    return {
      controlId: spec.controlId,
      namedControlExerciseStatus: "evaluated",
      applicable: true,
      missingInputReason: null,
      unresolvedReason: null,
      evidenceRefs,
      hits: [
        hit(spec, {
          occurrenceRef: "/proceduralPartyState/disclosurePiiState",
          plainEnglish: "Disclosure and PII states conflated (e.g. PII redaction treated as disclosure served).",
          evidenceRefs,
          exactWording: `conflated=${String(d.conflated)} piiCountedAsDisclosureServed=${String(d.piiCountedAsDisclosureServed)}`,
        }),
      ],
      emptyHitsDoNotImplyPass: true,
      phraseProbeUsed: false,
    };
  }

  return {
    controlId: spec.controlId,
    namedControlExerciseStatus: "evaluated",
    applicable: true,
    missingInputReason: null,
    unresolvedReason: null,
    evidenceRefs,
    hits: [],
    emptyHitsDoNotImplyPass: true,
    phraseProbeUsed: false,
  };
}

export function evaluateBatchASixControl(
  controlId: BatchASixControlId,
  output: Record<string, unknown>,
): BatchAEvaluatorResult {
  switch (controlId) {
    case "MAA2-LSL-05-CATEGORY-SET-COVERAGE":
      return evaluateLsl05(output);
    case "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING":
      return evaluateChr06(output);
    case "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS":
      return evaluateChr12(output);
    case "MAA2-PRC-03-YOUTH-STATE":
      return evaluatePrc03(output);
    case "MAA2-PRC-04-FITNESS-PARTICIPATION":
      return evaluatePrc04(output);
    case "MAA2-PRC-07-DISCLOSURE-PII-STATE":
      return evaluatePrc07(output);
    default: {
      const _exhaustive: never = controlId;
      throw new Error(`Unknown Batch-A control ${_exhaustive}`);
    }
  }
}

export function evaluateAllBatchASix(output: Record<string, unknown>): BatchAEvaluatorResult[] {
  return (
    [
      "MAA2-LSL-05-CATEGORY-SET-COVERAGE",
      "MAA2-CHR-06-AGE-AT-OFFENCE-HEARING",
      "MAA2-CHR-12-TRANSPARENT-CALC-INPUTS",
      "MAA2-PRC-03-YOUTH-STATE",
      "MAA2-PRC-04-FITNESS-PARTICIPATION",
      "MAA2-PRC-07-DISCLOSURE-PII-STATE",
    ] as const
  ).map((id) => evaluateBatchASixControl(id, output));
}

/** Merge dual-channel bags without inventing specialty fields. */
export function buildEvaluatorInputBag(args: {
  casebrainOutput: Record<string, unknown> | null;
  structuredPacketProjected: Record<string, unknown> | null;
}): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ...(args.casebrainOutput ?? {}),
  };
  const sp = args.structuredPacketProjected;
  if (sp) {
    for (const [k, v] of Object.entries(sp)) {
      if (k === "projectedFrom" || k === "invented") continue;
      // Prefer casebrain specialty bags when present; else take structured.
      if (out[k] == null) out[k] = v;
      else if (Array.isArray(out[k]) && Array.isArray(v) && (out[k] as unknown[]).length === 0 && v.length) {
        out[k] = v;
      }
    }
    // Specialty bags only from explicit sources — copy if present on structured packet root before projection.
  }
  return out;
}

export type { LegalStateCategory };
