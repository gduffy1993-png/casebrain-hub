import type { DisclosureChaseBrief, DisclosureChaseItem } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { evidenceRowFromSourceState, reliabilityForSourceState } from "./evidence-trace";
import { surfaceContradictions } from "./contradiction-surface";
import type {
  EvidenceExistence,
  EvidenceReliability,
  EvidenceTraceModel,
  EvidenceTraceRow,
  EvidenceTraceSection,
  FiveAnswersContradictionRow,
} from "./types";
import { mapSourceStateToExistence } from "./types";

export type BuildEvidenceTraceInput = {
  allegation: string;
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  matterConfidence: MatterConfidenceResult | null;
  doNotOverstate: string[];
};

function sectionRows(rows: EvidenceTraceRow[], section: EvidenceTraceSection): EvidenceTraceRow[] {
  return rows.filter((r) => r.section === section);
}

function traceId(section: EvidenceTraceSection, index: number): string {
  return `${section}-${index}`;
}

function sourceStateForItem(item: DisclosureChaseItem) {
  return inferChaseItemSourceState({
    label: item.label,
    source: item.source,
    baseStatus: item.baseStatus,
    evidenceAnchor: item.evidenceAnchor,
  });
}

function isInferenceClaim(text: string): boolean {
  return /\b(infer|inference|provisional|pending|unclear|not on papers|do not (?:say|state|import))\b/i.test(text);
}

function allegationReliability(allegation: string): EvidenceReliability {
  if (!allegation.trim() || /not on papers|charge not|unknown/i.test(allegation)) {
    return "inference_only";
  }
  return "needs_review";
}

function doNotOverstateReliability(line: string): EvidenceReliability {
  if (/^do not\b/i.test(line.trim())) return "unsafe";
  if (isInferenceClaim(line)) return "inference_only";
  return "unsafe";
}

function contradictionWarningForLabel(
  label: string,
  contradictions: FiveAnswersContradictionRow[],
): string | null {
  const hay = label.toLowerCase();
  const hit = contradictions.find(
    (c) => hay.includes(c.summary.toLowerCase().slice(0, 24)) || c.summary.toLowerCase().includes(hay.slice(0, 24)),
  );
  return hit ? `${hit.label}: ${hit.summary}` : null;
}

function rowFromChaseItem(
  item: DisclosureChaseItem,
  section: EvidenceTraceSection,
  index: number,
  options?: { critical?: boolean; contradictions?: FiveAnswersContradictionRow[] },
): EvidenceTraceRow {
  const state = sourceStateForItem(item);
  const existence = mapSourceStateToExistence(state);
  const reliability = reliabilityForSourceState(state);
  const referredOnly = existence === "referred_only";
  return {
    id: traceId(section, index),
    section,
    claim: item.label,
    existence,
    reliability,
    sourceAnchor: item.evidenceAnchor,
    sourceLabel: item.source?.trim() || null,
    critical: options?.critical ?? (existence === "missing" && item.baseStatus !== "Received"),
    inference: false,
    notUsable: referredOnly,
    traceWarning: options?.contradictions ? contradictionWarningForLabel(item.label, options.contradictions) : null,
  };
}

export function buildEvidenceTrace(input: BuildEvidenceTraceInput): EvidenceTraceModel {
  const { allegation, warRoom, chase, matterConfidence, doNotOverstate } = input;
  const contradictions = surfaceContradictions(warRoom.bundleContradictions ?? []);
  const rows: EvidenceTraceRow[] = [];

  const mainIssue =
    matterConfidence?.mainIssue?.trim() ||
    warRoom.safePositionToday?.trim() ||
    chase.disclosureSummary?.trim() ||
    "";

  rows.push({
    id: traceId("allegation", 0),
    section: "allegation",
    claim: allegation.trim() || "Charge not on papers",
    existence: allegation.trim() ? "served" : "unknown",
    reliability: allegationReliability(allegation),
    sourceAnchor: chase.primaryItems[0]?.evidenceAnchor ?? null,
    sourceLabel: "Charge sheet / papers",
    inference: !allegation.trim(),
  });

  if (mainIssue) {
    rows.push({
      id: traceId("allegation", 1),
      section: "allegation",
      claim: mainIssue.slice(0, 280),
      existence: "not_safely_confirmed",
      reliability: "needs_review",
      sourceLabel: matterConfidence?.mainIssue ? "Matter confidence" : "Today / chase summary",
      inference: /provisional/i.test(mainIssue),
      traceWarning: contradictions[0] ? `${contradictions[0].label}: ${contradictions[0].summary}` : null,
    });
  }

  for (const [i, item] of chase.primaryItems.slice(0, 8).entries()) {
    const state = sourceStateForItem(item);
    const existence = mapSourceStateToExistence(state);
    const section: EvidenceTraceSection =
      existence === "missing" || existence === "referred_only" ? "missing_referred" : "key_evidence";
    rows.push(rowFromChaseItem(item, section, i, { critical: existence === "missing", contradictions }));
  }

  for (const [i, line] of doNotOverstate.slice(0, 8).entries()) {
    rows.push({
      id: traceId("do_not_overstate", i),
      section: "do_not_overstate",
      claim: line,
      existence: "not_safely_confirmed",
      reliability: doNotOverstateReliability(line),
      sourceLabel: "Guardian / bundle guard",
      inference: isInferenceClaim(line),
      traceWarning: contradictionWarningForLabel(line, contradictions),
    });
  }

  for (const [i, item] of chase.primaryItems.slice(0, 5).entries()) {
    const trace = rowFromChaseItem(item, "chase", i, { contradictions });
    trace.claim = item.draftChaseWording?.slice(0, 200) || item.label;
    rows.push(trace);
  }

  const courtRaw = chase.safeCourtLine?.trim() || warRoom.safePositionToday?.trim() || "";
  rows.push({
    id: traceId("court_note", 0),
    section: "court_note",
    claim: courtRaw || "Source-backed court note not yet available.",
    existence: courtRaw ? "not_safely_confirmed" : "unknown",
    reliability: courtRaw ? "needs_review" : "inference_only",
    sourceLabel: chase.safeCourtLine ? "Disclosure chase brief" : "Hearing war room",
    sourceAnchor: chase.primaryItems[0]?.evidenceAnchor ?? null,
    inference: !courtRaw,
  });

  for (const c of contradictions) {
    const existing = rows.find((r) => r.traceWarning?.includes(c.summary.slice(0, 40)));
    if (existing) continue;
    rows.push({
      id: `contradiction-${rows.length}`,
      section: "key_evidence",
      claim: c.summary,
      existence: "unknown",
      reliability: "contested",
      sourceLabel: c.label,
      traceWarning: `${c.label} (existing detection)`,
      inference: false,
    });
  }

  const bySection: EvidenceTraceModel["bySection"] = {
    allegation: sectionRows(rows, "allegation"),
    key_evidence: sectionRows(rows, "key_evidence"),
    missing_referred: sectionRows(rows, "missing_referred"),
    do_not_overstate: sectionRows(rows, "do_not_overstate"),
    chase: sectionRows(rows, "chase"),
    court_note: sectionRows(rows, "court_note"),
  };

  return { rows, bySection };
}

/** Merge chase item fields into a display row with both axes (for inline evidence list). */
export function traceRowForEvidenceLabel(
  label: string,
  state: ReturnType<typeof inferChaseItemSourceState>,
  note?: string,
): Pick<EvidenceTraceRow, "existence" | "reliability" | "notUsable" | "inference"> {
  const base = evidenceRowFromSourceState(label, state, note);
  return {
    existence: base.existence,
    reliability: base.reliability,
    notUsable: base.existence === "referred_only",
    inference: base.reliability === "inference_only",
  };
}
