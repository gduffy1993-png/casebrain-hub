import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { FiveAnswersEvidenceRow } from "./types";
import type { EvidenceStateTruthKey } from "@/lib/eval/evidence-state-audit/types";
import { buildTruthMapRowsFromTruthKey, usesDemoAuditPresentationPolish } from "@/lib/eval/demo-audit-packs/presentation-polish";

/**
 * Presentation-only display pass for truth-map rows.
 *
 * HARD RULE (CB-HIST-PRESENTATION-CANNOT-CREATE-EVIDENCE-STATE):
 * must not invent evidence items or promote contextual shapes into new existence states.
 * Formatting may reorder / dedupe aliases only via upstream helpers — this function
 * returns the incoming factual set unchanged for production matters.
 *
 * Demo/eval truth-key packs may still materialise their own labelled rows, but only
 * behind the explicit demo-audit case-id gate (never for arbitrary production matters).
 */
export function expandTruthMapRowsForDisplay(input: {
  rows: FiveAnswersEvidenceRow[];
  chase: DisclosureChaseBrief;
  allegation: string;
  doNotOverstate: string[];
  truthKey?: EvidenceStateTruthKey;
  bundleText?: string;
}): FiveAnswersEvidenceRow[] {
  if (input.truthKey && usesDemoAuditPresentationPolish(input.truthKey.caseId)) {
    return buildTruthMapRowsFromTruthKey(input.truthKey);
  }

  // Production path: never synthesise served/missing/referred rows from allegation shape.
  void input.chase;
  void input.allegation;
  void input.doNotOverstate;
  void input.bundleText;
  return input.rows;
}
