import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { inferChaseItemSourceState, buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { finalizeSolicitorVisibleProse } from "@/lib/criminal/solicitor-visible-boundary";
import { FIRM_SENDABILITY_LABELS } from "@/lib/criminal/trust/firm-facing-labels";
import { surfaceContradictions } from "./contradiction-surface";
import { evidenceRowFromSourceState, FIVE_ANSWERS_HARD_RULES } from "./evidence-trace";
import { buildEvidenceTrace } from "./build-evidence-trace";
import { expandTruthMapRowsForDisplay } from "./expand-truth-map-rows";
import type { FiveAnswersChaseRow, FiveAnswersViewModel } from "./types";
import { mapSourceStateToExistence } from "./types";

export type BuildFiveAnswersViewInput = {
  allegation: string;
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  matterConfidence: MatterConfidenceResult | null;
  doNotOverstate: string[];
  truthKey?: import("@/lib/eval/evidence-state-audit/types").EvidenceStateTruthKey;
  bundleText?: string;
};

function nextActionFromConfidence(confidence: MatterConfidenceResult | null): string {
  if (!confidence) return "Review papers and open Chase for outstanding material.";
  return confidence.nextBestAction || "Review chase items and source-backed court note before court.";
}

export function buildFiveAnswersView(input: BuildFiveAnswersViewInput): FiveAnswersViewModel {
  const { allegation, warRoom, chase, matterConfidence, doNotOverstate } = input;

  const rawEvidenceRows = chase.primaryItems.slice(0, 8).map((item) => {
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const row = evidenceRowFromSourceState(item.label, state, item.whyItMatters?.trim() || undefined);
    if (state === "missing") {
      const note = row.note ?? "";
      const alreadyGuidesChase =
        /still chase|confirm their relevance|appear to be outstanding|confirm relevance/i.test(note);
      if (!alreadyGuidesChase) {
        row.note = note
          ? `${note} — still chase if disclosure-relevant.`
          : "Still chase if disclosure-relevant.";
      }
    }
    if (state === "referred_only") {
      row.note = row.note ? `${row.note} — referred only, not usable as proof.` : "Referred only — not usable as proof.";
    }
    return row;
  });

  const evidenceRows = expandTruthMapRowsForDisplay({
    rows: rawEvidenceRows,
    chase,
    allegation,
    doNotOverstate,
    truthKey: input.truthKey,
    bundleText: input.bundleText,
  });

  const chaseRows: FiveAnswersChaseRow[] = chase.primaryItems.slice(0, 5).map((item) => {
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const copy = buildCopySafeResult({
      text: item.draftChaseWording,
      kind: "cps_chase",
      sourceState: state,
      sourceLabel: item.source,
      matterLevel: matterConfidence?.chaseSendability,
    });
    const finalized = finalizeSolicitorVisibleProse(copy.textForClipboard);
    return {
      label: item.label,
      existence: mapSourceStateToExistence(state),
      copySuggestion: finalized.ok ? finalized.text : item.label,
      sendabilityLabel: FIRM_SENDABILITY_LABELS[copy.sendability] ?? copy.sendabilityLabel,
      canCopy: copy.canCopy && finalized.ok,
    };
  });

  const courtRaw = chase.safeCourtLine?.trim() || warRoom.safePositionToday?.trim() || "";
  const courtCopy = buildCopySafeResult({
    text: courtRaw || "Source-backed court note not yet available — review Today tab.",
    kind: "court_line",
    sourceState: "needs_review",
    matterLevel: matterConfidence?.level === "blocked" ? "blocked" : "needs_solicitor_review",
  });

  const mainIssueRaw =
    matterConfidence?.mainIssue?.trim() ||
    warRoom.safePositionToday?.trim() ||
    chase.disclosureSummary?.trim() ||
    "Provisional — review served papers before relying on any line.";
  const mainIssueFinal = finalizeSolicitorVisibleProse(mainIssueRaw);

  return {
    caseSaying: {
      allegation: allegation.trim() || "Charge not on papers",
      mainIssue: mainIssueFinal.ok
        ? mainIssueFinal.text
        : "Provisional — review served papers before relying on any line.",
      nextAction: nextActionFromConfidence(matterConfidence),
    },
    evidenceState: {
      rows: evidenceRows,
      hardRules: [...FIVE_ANSWERS_HARD_RULES],
    },
    mustNotOverstate: doNotOverstate.slice(0, 8),
    chase: chaseRows,
    courtNote: {
      text: courtCopy.textForClipboard,
      copySuggestionLabel: courtCopy.canCopy ? "Copy suggestion" : "Not for sending until reviewed",
      sendabilityLabel: FIRM_SENDABILITY_LABELS[courtCopy.sendability] ?? courtCopy.sendabilityLabel,
      canCopy: courtCopy.canCopy,
      footer: courtCopy.footer,
    },
    contradictions: surfaceContradictions(warRoom.bundleContradictions ?? []),
    evidenceTrace: buildEvidenceTrace({
      allegation,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate,
    }),
  };
}
