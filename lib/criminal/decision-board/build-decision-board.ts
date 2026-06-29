import type { CriminalBriefPlan, CriminalBriefPlanProfile } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { CRIMINAL_BRIEF_PLAYBOOKS } from "@/lib/criminal/brief-plan/playbooks";
import { FIRM_SENDABILITY_LABELS } from "@/lib/criminal/trust/firm-facing-labels";
import { inferChaseItemSourceState } from "@/lib/criminal/trust/copy-safe";
import { surfaceContradictions } from "@/lib/criminal/five-answers/contradiction-surface";
import { mapSourceStateToExistence } from "@/lib/criminal/five-answers/types";
import { reliabilityForSourceState } from "@/lib/criminal/five-answers/evidence-trace";
import type { DecisionBoardModel, DecisionBoardOption, DecisionIssueKind } from "./types";
import { DECISION_ISSUE_LABELS } from "./types";

const UNSAFE_PHRASE_RE =
  /\b(you will win|case collapses|defence succeeds|charge will be dropped|we win|must be acquitted)\b/i;

const REVIEW_LABEL = FIRM_SENDABILITY_LABELS.needs_solicitor_review;

export type BuildDecisionBoardInput = {
  briefPlan: CriminalBriefPlan;
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  matterConfidence: MatterConfidenceResult | null;
  doNotOverstate: string[];
};

function sanitiseLine(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "Possible issue — requires solicitor review.";
  if (UNSAFE_PHRASE_RE.test(trimmed)) {
    return "Source-backed concern — requires solicitor review before reliance.";
  }
  return trimmed;
}

function profilePrimaryKind(profile: CriminalBriefPlanProfile): DecisionIssueKind {
  switch (profile) {
    case "digital_attribution":
    case "domestic_harassment":
      return "attribution";
    case "bwv_police_contact":
    case "violence_assault":
      return "missing_bwv_cctv";
    case "custody_pace":
      return "custody_pace";
    case "robbery_id":
      return "identification";
    case "fraud_account":
    case "driving_motoring":
    case "mixed_unclear":
      return "charge_fit";
    case "drugs_pwits":
      return "attribution";
    case "sexual_abe":
      return "disclosure_pressure";
    default:
      return "charge_fit";
  }
}

function kindFromMaterialLabel(label: string): DecisionIssueKind {
  const hay = label.toLowerCase();
  if (/\b(bwv|body[-\s]?worn|cctv)\b/.test(hay)) return "missing_bwv_cctv";
  if (/\b(pace|custody|safeguard|interview)\b/.test(hay)) return "custody_pace";
  if (/\b(attribution|phone|extraction|metadata|message)\b/.test(hay)) return "attribution";
  if (/\b(id|identification|parade|dock)\b/.test(hay)) return "identification";
  if (/\b(co-?def|co defendant|bleed)\b/.test(hay)) return "co_defendant_bleed";
  if (/\b(disclosure|mg6|unused)\b/.test(hay)) return "disclosure_pressure";
  if (/\b(charge|fit|indictment|offence)\b/.test(hay)) return "charge_fit";
  return "disclosure_pressure";
}

function optionFromProfile(plan: CriminalBriefPlan, matterConfidence: MatterConfidenceResult | null): DecisionBoardOption {
  const playbook = CRIMINAL_BRIEF_PLAYBOOKS[plan.profile];
  const kind = profilePrimaryKind(plan.profile);
  const missing = plan.missingEvidence.slice(0, 4).map((m) => m.label);
  return {
    id: `profile-${plan.profile}`,
    issueKind: kind,
    title: DECISION_ISSUE_LABELS[kind],
    whyItMatters: sanitiseLine(plan.mainIssue || playbook.opportunities[0] || plan.summaryAngle),
    sourceBasis: sanitiseLine(
      plan.servedEvidence[0]?.sourceRef
        ? `${plan.servedEvidence[0].label} — ${plan.servedEvidence[0].sourceRef}`
        : plan.summaryAngle || playbook.safeWording.summary,
    ),
    missingEvidence: missing.length ? missing : playbook.missingMaterial.slice(0, 3),
    riskCaution: sanitiseLine(playbook.risks[0] ?? "Needs evidence before reliance on any firm line."),
    nextAction: sanitiseLine(
      matterConfidence?.nextBestAction ||
        playbook.safeWording.chase ||
        "Review chase list and record provisional position.",
    ),
    sendabilityLabel: REVIEW_LABEL,
    existence: missing.length ? "missing" : "not_safely_confirmed",
    reliability: "needs_review",
  };
}

function optionFromContradiction(
  index: number,
  label: string,
  summary: string,
): DecisionBoardOption {
  return {
    id: `contradiction-${index}`,
    issueKind: "contradiction_timeline",
    title: DECISION_ISSUE_LABELS.contradiction_timeline,
    whyItMatters: sanitiseLine(summary),
    sourceBasis: sanitiseLine(`${label} — existing paper conflict detection`),
    missingEvidence: ["Underlying source material to resolve the conflict"],
    riskCaution: sanitiseLine("Possible issue if overstated before papers are aligned — requires solicitor review."),
    nextAction: sanitiseLine("Compare MG11/CCTV/BWV anchors and note provisional position for court."),
    sendabilityLabel: REVIEW_LABEL,
    existence: "unknown",
    reliability: "contested",
  };
}

function optionFromChaseItem(item: DisclosureChaseBrief["primaryItems"][number], index: number): DecisionBoardOption | null {
  const state = inferChaseItemSourceState({
    label: item.label,
    source: item.source,
    baseStatus: item.baseStatus,
    evidenceAnchor: item.evidenceAnchor,
  });
  const existence = mapSourceStateToExistence(state);
  if (existence !== "missing" && existence !== "referred_only" && existence !== "not_safely_confirmed") {
    return null;
  }
  const kind = kindFromMaterialLabel(item.label);
  return {
    id: `chase-${index}`,
    issueKind: kind,
    title: DECISION_ISSUE_LABELS[kind],
    whyItMatters: sanitiseLine(item.whyItMatters || `Outstanding material may affect ${item.label.toLowerCase()}.`),
    sourceBasis: sanitiseLine(item.evidenceAnchor || item.source || "Papers / disclosure schedule"),
    missingEvidence: [item.label],
    riskCaution:
      existence === "referred_only"
        ? sanitiseLine("Referred only — not usable as proof until served.")
        : sanitiseLine("Missing material — still chase if disclosure-relevant."),
    nextAction: sanitiseLine(item.draftChaseWording?.slice(0, 200) || `Chase ${item.label} or confirm status in writing.`),
    sendabilityLabel: REVIEW_LABEL,
    existence,
    reliability: reliabilityForSourceState(state),
  };
}

function optionFromCoDefBleed(lines: string[]): DecisionBoardOption | null {
  const hit = lines.find((l) => /\b(co-?def|import|bleed|other defendant)\b/i.test(l));
  if (!hit) return null;
  return {
    id: "co-def-bleed",
    issueKind: "co_defendant_bleed",
    title: DECISION_ISSUE_LABELS.co_defendant_bleed,
    whyItMatters: sanitiseLine("Papers may reference another defendant or account — keep this client's position separate."),
    sourceBasis: sanitiseLine(hit),
    missingEvidence: ["Client-specific source material only"],
    riskCaution: sanitiseLine("Source-backed concern — do not import another defendant's material without review."),
    nextAction: sanitiseLine("Check MG6/unused schedules and keep chase limited to this defendant's papers."),
    sendabilityLabel: REVIEW_LABEL,
    existence: "not_safely_confirmed",
    reliability: "unsafe",
  };
}

export function buildDecisionBoard(input: BuildDecisionBoardInput): DecisionBoardModel {
  const { briefPlan, warRoom, chase, matterConfidence, doNotOverstate } = input;
  const options: DecisionBoardOption[] = [];
  const seen = new Set<string>();

  const push = (opt: DecisionBoardOption) => {
    const key = `${opt.issueKind}:${opt.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    options.push(opt);
  };

  push(optionFromProfile(briefPlan, matterConfidence));

  for (const [i, c] of surfaceContradictions(warRoom.bundleContradictions ?? []).entries()) {
    push(optionFromContradiction(i, c.label, c.summary));
  }

  for (const [i, item] of chase.primaryItems.slice(0, 6).entries()) {
    const opt = optionFromChaseItem(item, i);
    if (opt) push(opt);
  }

  const coDef = optionFromCoDefBleed([...doNotOverstate, ...briefPlan.forbiddenTopics]);
  if (coDef) push(coDef);

  if (matterConfidence?.mainIssue && options.length < 6) {
    const kind = kindFromMaterialLabel(matterConfidence.mainIssue);
    push({
      id: "confidence-main",
      issueKind: kind,
      title: DECISION_ISSUE_LABELS[kind],
      whyItMatters: sanitiseLine(matterConfidence.mainIssue),
      sourceBasis: sanitiseLine("Matter confidence — source-linked summary"),
      missingEvidence: briefPlan.missingEvidence.slice(0, 2).map((m) => m.label),
      riskCaution: sanitiseLine("Possible issue — needs evidence before reliance."),
      nextAction: sanitiseLine(matterConfidence.nextBestAction || "Review papers and chase outstanding items."),
      sendabilityLabel: REVIEW_LABEL,
      existence: "not_safely_confirmed",
      reliability: "needs_review",
    });
  }

  return {
    options: options.slice(0, 8),
    reviewNotice:
      "Decision options are source-linked review prompts — not legal advice, outcome predictions, or sendable court lines.",
  };
}
