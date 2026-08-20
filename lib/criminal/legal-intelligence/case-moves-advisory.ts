/**
 * Adapt Case Moves Engine (6de1c4c24) outputs into typed PRACTITIONER_CONSIDERATION
 * advisory intelligence. Does not write evidence state or chase counters.
 */

import {
  buildCaseMoves,
  type BuildCaseMovesInput,
  type CaseMove,
  type CaseMovesResult,
} from "@/lib/criminal/case-moves-engine";
import type { AdvisoryConsideration } from "./types";

const MOVE_SURFACES = [
  "overview",
  "court",
  "papers",
  "client",
  "file",
  "hearing_mode",
  "export",
] as const;

/** Categories that are unsafe to emit as actionable pleading language without confirmation. */
const HIGH_RISK_CATEGORIES = new Set([
  "self_defence",
  "lawful_excuse",
  "lawful_reason",
]);

function softenWhat(move: CaseMove): string {
  if (HIGH_RISK_CATEGORIES.has(move.category)) {
    return `Consider whether to ${move.recommendedMove.replace(/^(Plead|Frame|Set out)\s+/i, "").replace(/\.$/, "")} — only after instructions and source-backed anchors are confirmed.`;
  }
  // Disclosure / tactical moves: keep actionable but labelled as consideration
  if (move.category === "disclosure" || move.category === "no_safe_strategy") {
    return move.recommendedMove;
  }
  return `Consider: ${move.recommendedMove}`;
}

function mustConfirm(move: CaseMove): string[] {
  const base = [...move.unsupportedAssumptions];
  if (HIGH_RISK_CATEGORIES.has(move.category)) {
    base.push(
      "Client instructions supporting the defence",
      "Source-backed evidential anchors (not offence shape alone)",
    );
  }
  if (move.confidence !== "high") {
    base.push("Higher-confidence structured evidence before factual court wording");
  }
  return Array.from(new Set(base.filter(Boolean)));
}

export function caseMoveToConsideration(move: CaseMove): AdvisoryConsideration {
  const offenceShapeOnly =
    move.sourceSignals.length === 0 ||
    move.sourceDisciplineNote.toLowerCase().includes("bundle preview");

  return {
    id: `case-move:${move.id}`,
    what: softenWhat(move),
    why: move.whyItMatters,
    canonicalTriggers: [
      ...move.triggerSignals.map((t) => `trigger:${t}`),
      ...move.sourceSignals.map((s) => `signal:${s}`),
    ],
    provenance: [
      "case_moves_engine_6de1c4c24",
      move.sourceDisciplineNote,
      `category:${move.category}`,
      `confidence:${move.confidence}`,
    ],
    scope: offenceShapeOnly ? "general_professional" : "source_specific",
    mustConfirmBeforeFactualLanguage: mustConfirm(move),
    supportClass: "PRACTITIONER_CONSIDERATION",
    allowedSurfaces: [...MOVE_SURFACES],
    category: move.category,
    confidence: move.confidence,
    offenceShapeOnly,
    recoverySource: "case_moves_engine_6de1c4c24",
  };
}

export function buildCaseMovesAdvisory(input: BuildCaseMovesInput): {
  result: CaseMovesResult;
  considerations: AdvisoryConsideration[];
  summary: string;
} {
  const result = buildCaseMoves(input);
  const considerations = result.moves.map(caseMoveToConsideration);
  const summary =
    result.moves.length === 0
      ? "No case-move considerations generated from supplied signals."
      : `${result.moves.length} practitioner case-move consideration(s); overall risk ${result.overallRiskLevel}. Advisory only — not evidence facts.`;
  return { result, considerations, summary };
}

export type { BuildCaseMovesInput, CaseMovesResult };
