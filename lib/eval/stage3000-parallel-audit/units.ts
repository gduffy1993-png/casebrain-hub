/**
 * Retain occurrence / string / template / case / root-cause units separately.
 * Never collapse denominators.
 */

import { shortHash, templateHash, wordingHash } from "./hashes";
import type { EvidenceUnit } from "./types";

export function buildOccurrenceUnit(input: {
  caseId: string;
  controlId: string;
  occurrenceId: string;
  exactWording: string;
  rootCauseId: string | null;
}): EvidenceUnit {
  return {
    unitKind: "occurrence",
    unitId: `occ-unit-${shortHash(input.occurrenceId)}`,
    caseId: input.caseId,
    controlId: input.controlId,
    stringHash: wordingHash(input.exactWording),
    templateHash: templateHash(input.exactWording),
    occurrenceId: input.occurrenceId,
    rootCauseId: input.rootCauseId,
    exactWording: input.exactWording,
    retainedSeparately: true,
  };
}

export function buildStringUnit(input: {
  caseId: string;
  controlId: string;
  exactWording: string;
  occurrenceId: string;
}): EvidenceUnit {
  const sh = wordingHash(input.exactWording);
  return {
    unitKind: "string",
    unitId: `str-unit-${shortHash(sh)}`,
    caseId: input.caseId,
    controlId: input.controlId,
    stringHash: sh,
    templateHash: null,
    occurrenceId: input.occurrenceId,
    rootCauseId: null,
    exactWording: input.exactWording,
    retainedSeparately: true,
  };
}

export function buildTemplateUnit(input: {
  caseId: string;
  controlId: string;
  exactWording: string;
  occurrenceId: string;
}): EvidenceUnit {
  const th = templateHash(input.exactWording);
  return {
    unitKind: "template",
    unitId: `tpl-unit-${shortHash(th)}`,
    caseId: input.caseId,
    controlId: input.controlId,
    stringHash: null,
    templateHash: th,
    occurrenceId: input.occurrenceId,
    rootCauseId: null,
    exactWording: null,
    retainedSeparately: true,
  };
}

export function buildCaseUnit(caseId: string): EvidenceUnit {
  return {
    unitKind: "case",
    unitId: `case-unit-${shortHash(caseId)}`,
    caseId,
    controlId: null,
    stringHash: null,
    templateHash: null,
    occurrenceId: null,
    rootCauseId: null,
    exactWording: null,
    retainedSeparately: true,
  };
}

export function buildRootCauseUnit(input: {
  rootCauseId: string;
  caseIds: string[];
  controlId: string | null;
}): EvidenceUnit {
  return {
    unitKind: "root_cause",
    unitId: `rc-unit-${shortHash(input.rootCauseId)}`,
    caseId: input.caseIds[0] ?? "multi",
    controlId: input.controlId,
    stringHash: null,
    templateHash: null,
    occurrenceId: null,
    rootCauseId: input.rootCauseId,
    exactWording: null,
    retainedSeparately: true,
  };
}

/** Expand one occurrence into the five retained unit kinds (root-cause filled later). */
export function expandOccurrenceUnits(input: {
  caseId: string;
  controlId: string;
  occurrenceId: string;
  exactWording: string;
}): EvidenceUnit[] {
  return [
    buildCaseUnit(input.caseId),
    buildStringUnit(input),
    buildTemplateUnit(input),
    buildOccurrenceUnit({ ...input, rootCauseId: null }),
  ];
}
