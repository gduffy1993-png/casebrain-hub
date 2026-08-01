/**
 * Stage-300 essential-43 registry — maps every one of the 43 controlIds to its evaluator family.
 * `runAllEssentialControls` is the single call site the pipeline uses; it never special-cases a
 * controlId outside its family module.
 */

import { ESSENTIAL_43_IDS, type EssentialControlId, essentialFamilyOf } from "./constants";
import type { EssentialCaseInputs } from "./inputs/load-essential-inputs";
import type { EssentialControlResult } from "./types";
import { evaluateSpecialtyFamily } from "./families/specialty";
import { evaluateAudXppFamily } from "./families/aud-xpp";
import { evaluateVdrFamily } from "./families/vdr";
import { evaluateEldFamily } from "./families/eld";
import { evaluateSrcFamily } from "./families/src";

export function runAllEssentialControls(inputs: EssentialCaseInputs): EssentialControlResult[] {
  const byControlId = new Map<EssentialControlId, EssentialControlResult>();

  for (const r of evaluateSpecialtyFamily(inputs)) byControlId.set(r.controlId, r);
  for (const r of evaluateAudXppFamily(inputs)) byControlId.set(r.controlId, r);
  for (const r of evaluateVdrFamily(inputs)) byControlId.set(r.controlId, r);
  for (const r of evaluateEldFamily(inputs)) byControlId.set(r.controlId, r);
  for (const r of evaluateSrcFamily(inputs)) byControlId.set(r.controlId, r);

  const missingControlIds = ESSENTIAL_43_IDS.filter((id) => !byControlId.has(id));
  if (missingControlIds.length) {
    throw new Error(`Essential-43 registry did not produce a result for: ${missingControlIds.join(",")}`);
  }

  return ESSENTIAL_43_IDS.map((id) => byControlId.get(id)!);
}

export function runOneEssentialControl(controlId: EssentialControlId, inputs: EssentialCaseInputs): EssentialControlResult {
  const family = essentialFamilyOf(controlId);
  const results =
    family === "SPECIALTY"
      ? evaluateSpecialtyFamily(inputs)
      : family === "AUD_XPP"
        ? evaluateAudXppFamily(inputs)
        : family === "VDR"
          ? evaluateVdrFamily(inputs)
          : family === "ELD"
            ? evaluateEldFamily(inputs)
            : evaluateSrcFamily(inputs);
  const found = results.find((r) => r.controlId === controlId);
  if (!found) throw new Error(`No evaluator result produced for ${controlId}`);
  return found;
}
