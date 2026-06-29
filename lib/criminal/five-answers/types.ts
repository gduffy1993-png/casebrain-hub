import type { SourceStateKind } from "@/lib/criminal/matter-confidence/matter-confidence-types";

/** Existence axis — what is on the bundle vs referred vs missing. */
export type EvidenceExistence =
  | "served"
  | "referred_only"
  | "missing"
  | "unknown"
  | "not_safely_confirmed";

/** Reliability axis — separate from existence (H5 hard rule: served ≠ reliable). */
export type EvidenceReliability =
  | "strong"
  | "weak"
  | "contested"
  | "unsafe"
  | "inference_only"
  | "needs_review";

export type ContradictionSurfaceKind =
  | "statement_conflict"
  | "timeline_mismatch"
  | "attribution_issue"
  | "source_contradiction"
  | "missing_underlying_material";

export type FiveAnswersEvidenceRow = {
  label: string;
  existence: EvidenceExistence;
  reliability: EvidenceReliability;
  note?: string;
};

export type FiveAnswersContradictionRow = {
  kind: ContradictionSurfaceKind;
  label: string;
  summary: string;
};

export type FiveAnswersChaseRow = {
  label: string;
  existence: EvidenceExistence;
  copySuggestion: string;
  sendabilityLabel: string;
  canCopy: boolean;
};

export type FiveAnswersViewModel = {
  caseSaying: {
    allegation: string;
    mainIssue: string;
    nextAction: string;
  };
  evidenceState: {
    rows: FiveAnswersEvidenceRow[];
    hardRules: string[];
  };
  mustNotOverstate: string[];
  chase: FiveAnswersChaseRow[];
  courtNote: {
    text: string;
    copySuggestionLabel: string;
    sendabilityLabel: string;
    canCopy: boolean;
    footer: string;
  };
  contradictions: FiveAnswersContradictionRow[];
  evidenceTrace: EvidenceTraceModel;
};

export type EvidenceTraceSection =
  | "allegation"
  | "key_evidence"
  | "missing_referred"
  | "do_not_overstate"
  | "chase"
  | "court_note";

export type EvidenceTraceRow = {
  id: string;
  section: EvidenceTraceSection;
  claim: string;
  existence: EvidenceExistence;
  reliability: EvidenceReliability;
  sourceAnchor?: string | null;
  sourceLabel?: string | null;
  critical?: boolean;
  inference?: boolean;
  notUsable?: boolean;
  traceWarning?: string | null;
};

export type EvidenceTraceModel = {
  rows: EvidenceTraceRow[];
  bySection: Record<EvidenceTraceSection, EvidenceTraceRow[]>;
};

export type BuildFiveAnswersInput = {
  allegation: string;
  mainIssue: string;
  nextAction: string;
  doNotOverstate: string[];
  evidenceRows: FiveAnswersEvidenceRow[];
  chaseRows: FiveAnswersChaseRow[];
  courtNoteText: string;
  courtCopySuggestion: string;
  courtSendabilityLabel: string;
  courtCanCopy: boolean;
  courtFooter: string;
  contradictions: FiveAnswersContradictionRow[];
};

export function mapSourceStateToExistence(state: SourceStateKind | null): EvidenceExistence {
  if (!state) return "unknown";
  if (state === "provisional") return "unknown";
  if (state === "needs_review") return "not_safely_confirmed";
  return state;
}
