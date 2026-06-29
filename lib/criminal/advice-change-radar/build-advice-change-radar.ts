import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { compareEvidenceChanges } from "@/lib/criminal/evidence-change-detector/compare-evidence-changes";
import type { EvidenceChangeCompareResult, EvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { evidenceExistenceLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import type { DecisionIssueKind } from "@/lib/criminal/decision-board/types";
import { DECISION_ISSUE_LABELS } from "@/lib/criminal/decision-board/types";
import { surfaceContradictions } from "@/lib/criminal/five-answers/contradiction-surface";
import type {
  AdviceChangeRadarModel,
  AdviceRadarItem,
  PressureDirection,
} from "./types";

const UNSAFE_PHRASE_RE =
  /\b(you will win|case collapses|defence succeeds|charge will be dropped|we win|must be acquitted|change your advice|you should advise|drop the charge)\b/i;

const COMMAND_PHRASE_RE = /\b(change your advice|you must advise|advise the client to)\b/i;

const REVIEW_PREFIX = "Review needed because";

function sanitiseLine(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return `${REVIEW_PREFIX} papers changed — solicitor review required.`;
  if (UNSAFE_PHRASE_RE.test(trimmed) || COMMAND_PHRASE_RE.test(trimmed)) {
    return `${REVIEW_PREFIX} source material changed — solicitor review before reliance.`;
  }
  return trimmed;
}

function reviewLine(reason: string): string {
  const clean = sanitiseLine(reason);
  if (clean.toLowerCase().startsWith("review needed")) return clean;
  return `${REVIEW_PREFIX} ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
}

function kindFromMaterialLabel(label: string): DecisionIssueKind {
  const hay = label.toLowerCase();
  if (/\b(bwv|body[-\s]?worn|cctv)\b/.test(hay)) return "missing_bwv_cctv";
  if (/\b(pace|custody|safeguard|interview)\b/.test(hay)) return "custody_pace";
  if (/\b(attribution|phone|extraction|metadata|message|subscriber|download)\b/.test(hay)) return "attribution";
  if (/\b(id|identification|parade|dock)\b/.test(hay)) return "identification";
  if (/\b(mg11|complainant|witness statement)\b/.test(hay)) return "disclosure_pressure";
  if (/\b(medical|injury|hospital)\b/.test(hay)) return "charge_fit";
  if (/\b(disclosure|mg6|unused)\b/.test(hay)) return "disclosure_pressure";
  if (/\b(charge|fit|indictment|offence)\b/.test(hay)) return "charge_fit";
  return "disclosure_pressure";
}

function pressureImpactForKind(kind: DecisionIssueKind): { direction: PressureDirection; impact: string } {
  switch (kind) {
    case "missing_bwv_cctv":
      return {
        direction: "may_weaken",
        impact: "BWV/CCTV pressure may weaken if served material supports the officer account; may strengthen if it contradicts.",
      };
    case "custody_pace":
      return {
        direction: "may_strengthen",
        impact: "PACE/safeguard pressure may strengthen if custody material shows issues on served papers.",
      };
    case "attribution":
      return {
        direction: "may_weaken",
        impact: "Attribution pressure may weaken if phone/subscriber data links the client; review needed if still ambiguous.",
      };
    case "identification":
      return {
        direction: "may_strengthen",
        impact: "Identification pressure may strengthen if CCTV or ID material contradicts the defence account.",
      };
    case "disclosure_pressure":
      return {
        direction: "may_strengthen",
        impact: "Disclosure/account pressure may strengthen if MG11 or key statements are missing or inconsistent.",
      };
    case "charge_fit":
      return {
        direction: "may_weaken",
        impact: "Charge-fit pressure may weaken if medical or injury evidence on papers supports a serious harm account.",
      };
    case "contradiction_timeline":
      return {
        direction: "review_needed",
        impact: "Timeline/account pressure may shift if new statements resolve or deepen a paper conflict.",
      };
    default:
      return {
        direction: "review_needed",
        impact: "Pressure point may shift when outstanding material is served — solicitor review required.",
      };
  }
}

function pushItem(items: AdviceRadarItem[], seen: Set<string>, item: AdviceRadarItem): void {
  const key = `${item.kind}:${item.whatChanged.slice(0, 64)}`;
  if (seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

function itemFromChange(
  id: string,
  whatChanged: string,
  whyItMatters: string,
  affectedOutput: string,
  reviewReason: string,
  doNotRelyOnYet: string,
  safeNextAction: string,
  pressureDirection: PressureDirection = "review_needed",
): AdviceRadarItem {
  return {
    id,
    kind: "material_change",
    whatChanged: sanitiseLine(whatChanged),
    whyItMatters: sanitiseLine(whyItMatters),
    affectedOutput: sanitiseLine(affectedOutput),
    reviewNeeded: reviewLine(reviewReason),
    doNotRelyOnYet: sanitiseLine(doNotRelyOnYet),
    pressureDirection,
    safeNextAction: sanitiseLine(safeNextAction),
    solicitorReviewRequired: true,
  };
}

function itemsFromComparison(compare: EvidenceChangeCompareResult): AdviceRadarItem[] {
  const items: AdviceRadarItem[] = [];
  const seen = new Set<string>();

  if (compare.sourceMaterialChanged) {
    pushItem(
      items,
      seen,
      itemFromChange(
        "source-material",
        "Bundle / document set on file changed",
        "New or revised documents may alter served, referred, and missing material.",
        "Five Answers evidence state; Chase list; Today/Court line; Decision Board options.",
        "source material on file changed",
        "Any prior overview, chase wording, or court line copied before this upload.",
        "Compare papers and confirm what is newly served before updating chase or court lines.",
      ),
    );
  }

  for (const [i, line] of compare.sourceStateChanges.entries()) {
    pushItem(
      items,
      seen,
      itemFromChange(
        `source-state-${i}`,
        line,
        "Upload or bundle processing may have added or revised source text.",
        "Overview evidence trace; Chase priorities.",
        line.replace(/^Review needed because /i, ""),
        "Prior position fixed before confirming what landed on file.",
        "Open Papers and Chase to confirm served vs referred status.",
      ),
    );
  }

  for (const [i, line] of compare.closedMissingItems.entries()) {
    const label = line.replace(/^Previously missing item appears closed:\s*/i, "");
    const kind = kindFromMaterialLabel(label);
    pushItem(
      items,
      seen,
      itemFromChange(
        `closed-missing-${i}`,
        label ? `${label} — may no longer be outstanding` : line,
        "Item dropped from missing list on current papers — may be served or reclassified.",
        "Five Answers chase answer; Disclosure Chase tab; prior chase letter wording.",
        `${label || "outstanding material"} may now be on file`,
        "Previous chase item or court line that assumed this was still missing.",
        `Confirm served/referred status for ${label || "this item"} before removing from chase.`,
        kind === "missing_bwv_cctv" ? "may_weaken" : "review_needed",
      ),
    );
  }

  for (const [i, line] of compare.newMissingItems.entries()) {
    const label = line.replace(/^New missing or partial item on papers:\s*/i, "");
    pushItem(
      items,
      seen,
      itemFromChange(
        `new-missing-${i}`,
        label ? `New gap flagged: ${label}` : line,
        "Fresh missing or partial item may affect what can safely be said in court.",
        "Five Answers must-not-overstate; Chase list; Today warnings.",
        `${label || "new missing material"} appeared on papers`,
        "Any court line or client explanation that assumed fuller disclosure.",
        `Chase ${label || "outstanding material"} or confirm partial status in writing.`,
        "may_strengthen",
      ),
    );
  }

  for (const [i, line] of compare.newOrChangedContradictions.entries()) {
    pushItem(
      items,
      seen,
      itemFromChange(
        `contradiction-${i}`,
        line,
        "Paper conflict may affect how timelines and accounts can be described.",
        "Today tab; source-backed court note; must-not-overstate list.",
        "a timeline or account conflict changed on papers",
        "Any court line that treated accounts as aligned.",
        "Compare MG11/CCTV/BWV anchors and note provisional position for court.",
        "review_needed",
      ),
    );
  }

  if (compare.warRoomHearingLineUpdate) {
    pushItem(
      items,
      seen,
      itemFromChange(
        "hearing-line",
        "Source-backed court / Today line changed on papers",
        "Safe hearing wording on file is different from the saved baseline.",
        "Today tab; Five Answers court note (answer 5).",
        "the safe hearing line changed",
        "Prior Today or Overview court note until solicitor reviews new wording.",
        "Open Today tab and review the source-backed court line before hearing.",
      ),
    );
  }

  for (const [i, line] of compare.disclosureChaseUpdates.entries()) {
    pushItem(
      items,
      seen,
      itemFromChange(
        `chase-update-${i}`,
        line,
        "Chase priority order or labels shifted on current papers.",
        "Five Answers chase answer; Disclosure Chase tab.",
        "disclosure chase priorities changed",
        "Earlier chase ordering or CPS wording.",
        "Reconcile Chase tab with current papers before sending chase letter.",
        "review_needed",
      ),
    );
  }

  for (const [i, line] of compare.doNotConcedeChanges.entries()) {
    pushItem(
      items,
      seen,
      itemFromChange(
        `do-not-${i}`,
        line,
        "A do-not-overstate guard changed — risk of unsafe concession wording.",
        "Five Answers answer 3; Today warnings.",
        "do-not-concede wording changed",
        "Prior must-not-overstate list or client explanation.",
        "Review must-not-overstate items before any client or court communication.",
        "may_strengthen",
      ),
    );
  }

  for (const [i, line] of compare.routeImpact.entries()) {
    pushItem(
      items,
      seen,
      itemFromChange(
        `route-${i}`,
        line,
        "Primary defence route label changed on source-backed reasoning.",
        "Decision Board; Summary tab; Today route context.",
        "the primary route label changed",
        "Prior route-led court line or strategy note.",
        "Review Summary and Decision Board before fixing hearing position.",
      ),
    );
  }

  for (const [i, line] of compare.readinessImpact.entries()) {
    pushItem(
      items,
      seen,
      itemFromChange(
        `readiness-${i}`,
        line,
        "Matter readiness band changed — reliance threshold may differ.",
        "Matter confidence header; Today readiness cues.",
        "readiness level changed",
        "Prior assumption that papers were ready to rely on.",
        "Re-check bundle health and missing material before hearing.",
      ),
    );
  }

  return items;
}

function watchFromChaseItem(
  item: DisclosureChaseBrief["primaryItems"][number],
  index: number,
): AdviceRadarItem | null {
  const state = inferChaseItemSourceState({
    label: item.label,
    source: item.source,
    baseStatus: item.baseStatus,
    evidenceAnchor: item.evidenceAnchor,
  });
  const existence = mapSourceStateToExistence(state);
  if (existence === "served" || existence === "unknown") return null;

  const kind = kindFromMaterialLabel(item.label);
  const { direction, impact } = pressureImpactForKind(kind);
  const stateLabel = evidenceExistenceLabel(existence);

  return {
    id: `watch-chase-${index}`,
    kind: "watch_point",
    whatChanged: `${item.label} — ${stateLabel}`,
    whyItMatters: sanitiseLine(impact),
    affectedOutput: sanitiseLine(
      `${DECISION_ISSUE_LABELS[kind]} on Decision Board; Chase copy; Today/Court line if this material is mentioned.`,
    ),
    reviewNeeded: reviewLine(
      `${item.label} is ${stateLabel.toLowerCase()} — position may shift when served material lands`,
    ),
    doNotRelyOnYet: sanitiseLine(
      existence === "referred_only"
        ? "Any line that treats referred material as proof until served and reviewed."
        : "Any firm chase resolution or court line until material status is confirmed.",
    ),
    pressureDirection: direction,
    currentSourceState: stateLabel,
    safeNextAction: sanitiseLine(
      item.draftChaseWording?.slice(0, 180) || `Track ${item.label} on Chase tab until served or confirmed absent.`,
    ),
    solicitorReviewRequired: true,
  };
}

function watchFromContradiction(label: string, summary: string, index: number): AdviceRadarItem {
  return {
    id: `watch-contradiction-${index}`,
    kind: "watch_point",
    whatChanged: `${label} — paper conflict flagged`,
    whyItMatters: sanitiseLine(
      summary || "If further statements or CCTV land, timeline/account pressure may shift.",
    ),
    affectedOutput: "Today tab; must-not-overstate; source-backed court note.",
    reviewNeeded: reviewLine("a paper conflict is open on current bundle"),
    doNotRelyOnYet: "Any court line that assumes accounts align without reviewing anchors.",
    pressureDirection: "review_needed",
    safeNextAction: sanitiseLine("Compare anchors on Papers and note provisional position."),
    solicitorReviewRequired: true,
  };
}

export type BuildAdviceChangeRadarInput = {
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  briefPlan: CriminalBriefPlan;
  matterConfidence: MatterConfidenceResult | null;
  previousSnapshot: EvidenceChangeSnapshot | null;
  currentSnapshot: EvidenceChangeSnapshot;
};

export function buildAdviceChangeRadar(input: BuildAdviceChangeRadarInput): AdviceChangeRadarModel {
  const { warRoom, chase, briefPlan, matterConfidence, previousSnapshot, currentSnapshot } = input;
  const compareOutcome = compareEvidenceChanges(previousSnapshot, currentSnapshot);
  const hasBaseline = compareOutcome.available && compareOutcome.hasPreviousSnapshot;

  const items: AdviceRadarItem[] = [];
  const seen = new Set<string>();

  if (compareOutcome.available && compareOutcome.hasPreviousSnapshot) {
    for (const item of itemsFromComparison(compareOutcome)) {
      pushItem(items, seen, item);
    }
  }

  for (const [i, item] of chase.primaryItems.slice(0, 6).entries()) {
    const watch = watchFromChaseItem(item, i);
    if (watch) pushItem(items, seen, watch);
  }

  const contradictions = surfaceContradictions(warRoom.bundleContradictions ?? []);
  for (const [i, c] of contradictions.slice(0, 3).entries()) {
    pushItem(items, seen, watchFromContradiction(c.label, c.summary, i));
  }

  if (
    matterConfidence?.mainIssue &&
    items.length < 8 &&
    !items.some((it) => it.whatChanged.toLowerCase().includes(matterConfidence.mainIssue!.toLowerCase().slice(0, 24)))
  ) {
    const kind = kindFromMaterialLabel(matterConfidence.mainIssue);
    const { direction, impact } = pressureImpactForKind(kind);
    pushItem(items, seen, {
      id: "watch-confidence",
      kind: "watch_point",
      whatChanged: matterConfidence.mainIssue,
      whyItMatters: sanitiseLine(impact),
      affectedOutput: "Matter confidence header; Decision Board; Today tab.",
      reviewNeeded: reviewLine("main issue on papers may shift when outstanding material is served"),
      doNotRelyOnYet: "Any firm position line until source gaps are closed or reviewed.",
      pressureDirection: direction,
      currentSourceState: "Not safely confirmed",
      safeNextAction: sanitiseLine(matterConfidence.nextBestAction || "Review chase list and record provisional position."),
      solicitorReviewRequired: true,
    });
  }

  if (briefPlan.missingEvidence.length && items.length < 10) {
    const topMissing = briefPlan.missingEvidence[0];
    if (topMissing?.label) {
      const kind = kindFromMaterialLabel(topMissing.label);
      const { direction, impact } = pressureImpactForKind(kind);
      pushItem(items, seen, {
        id: "watch-brief-missing",
        kind: "watch_point",
        whatChanged: `${topMissing.label} — outstanding on brief plan`,
        whyItMatters: sanitiseLine(impact),
        affectedOutput: "Five Answers chase; Decision Board missing-evidence prompts.",
        reviewNeeded: reviewLine(`${topMissing.label} is still outstanding on current papers`),
        doNotRelyOnYet: "Final advice or court line that assumes this material is already dealt with.",
        pressureDirection: direction,
        currentSourceState: "Missing / not on file",
        safeNextAction: sanitiseLine(`Chase or confirm status of ${topMissing.label}.`),
        solicitorReviewRequired: true,
      });
    }
  }

  let changeSummary: string;
  if (!hasBaseline) {
    changeSummary = sanitiseLine(
      "No saved papers baseline — save current state after review to detect changes on the next upload.",
    );
  } else if (compareOutcome.available) {
    changeSummary = compareOutcome.changeSummary;
  } else {
    changeSummary = sanitiseLine("Compare unavailable — review papers manually.");
  }

  const solicitorReviewRequired =
    (compareOutcome.available && compareOutcome.solicitorReviewRequired) ||
    items.some((it) => it.solicitorReviewRequired);

  return {
    items: items.slice(0, 10),
    hasBaseline,
    changeSummary,
    solicitorReviewRequired,
    reviewNotice:
      "Advice change radar flags review triggers when papers change — not commands to change advice, outcome predictions, or sendable court lines.",
  };
}
