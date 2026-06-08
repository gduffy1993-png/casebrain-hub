import {
  GENERIC_PROVISIONAL_PRIMARY_ROUTE_TITLE,
  MOTORING_PRIMARY_ROUTE_TITLE,
} from "./provisional-offence-policy";
import type {
  BattleboardDisclosurePriority,
  BattleboardProofPointAttacked,
  BattleboardViewCaseResult,
  BattleboardViewEvidenceItem,
} from "./battleboard-view-types";
import { FORBIDDEN_BATTLEBOARD_PHRASES } from "./battleboard-view-types";
import type { ProofMapLink, ProofMapOffenceLens, ProofMapProofPoint } from "./proof-map-types";

/** Proof map fields consumed by Battleboard (no eval overall/skip). */
export type ProofMapForBattleboard = {
  bundleId: string;
  label: string;
  charge: string;
  stage: string | null;
  offenceLens: ProofMapOffenceLens;
  humanReviewRequired: boolean;
  humanReviewReasons: string[];
  proofPoints: ProofMapProofPoint[];
  links: ProofMapLink[];
  bundleTextChars: number;
};

const PRESSURE_LINK_TYPES = new Set([
  "missing",
  "weakens",
  "contradiction",
  "risk",
  "route_impact",
  "disclosure_chase",
]);

const HELPING_LINK_TYPES = new Set(["missing", "weakens", "contradiction", "risk", "disclosure_chase"]);
const HURTING_LINK_TYPES = new Set(["supports"]);

function dedupeKey(label: string, proofPointId: string, linkType: string): string {
  return `${proofPointId}|${linkType}|${label.toLowerCase().slice(0, 80)}`;
}

function linkToEvidenceItem(link: ProofMapLink): BattleboardViewEvidenceItem {
  return {
    label: link.label,
    proofPointId: link.proofPointId,
    linkType: link.linkType,
    sourceSection: link.sourceSection,
    sourceBasis: link.sourceBasis,
    confidenceTag: link.confidenceTag,
    routeImpact: link.routeImpact,
    disclosureChase: link.disclosureChase,
    safeHearingAction: link.safeHearingAction,
    doNotOverstate: link.doNotOverstate,
  };
}

function dedupeEvidenceItems(items: BattleboardViewEvidenceItem[]): BattleboardViewEvidenceItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = dedupeKey(item.label, item.proofPointId, item.linkType);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function lensDefaultPrimaryRoute(lens: ProofMapOffenceLens): string {
  switch (lens) {
    case "fraud":
      return "Fraud / account-control / dishonesty pressure";
    case "pwits":
      return "Possession / knowledge / phone-attribution pressure";
    case "robbery_id":
      return "Identification / participation / attribution pressure";
    case "violence_gbh":
      return "Violence / injury / identification / disclosure pressure";
    case "motoring":
      return MOTORING_PRIMARY_ROUTE_TITLE;
    case "generic_provisional":
      return GENERIC_PROVISIONAL_PRIMARY_ROUTE_TITLE;
    default:
      return "Provisional route — proof map only (human review)";
  }
}

/** Accept pilot export cover lines only — reject deep strategy / outcome language in bundle text. */
function isRepoSafePilotRouteLine(line: string, lens: ProofMapOffenceLens): boolean {
  const lower = line.toLowerCase();
  if (/turnbull|case fails|this wins|crown collapses|proves innocence|guaranteed/i.test(lower)) {
    return false;
  }
  switch (lens) {
    case "fraud":
      return /fraud|account|dishonesty/i.test(lower);
    case "pwits":
      return /possession|phone|supply|knowledge/i.test(lower);
    case "robbery_id":
      return /identification|participation|attribution/i.test(lower);
    default:
      return false;
  }
}

function primaryRouteForLens(lens: ProofMapOffenceLens, bundleText: string): string {
  const cover = bundleText.match(/\*\*Primary route:\*\*\s*(.+)/i)?.[1]?.trim();
  if (cover && isRepoSafePilotRouteLine(cover, lens)) return cover;
  return lensDefaultPrimaryRoute(lens);
}

function proofPointsAttackedFromMap(map: ProofMapForBattleboard): BattleboardProofPointAttacked[] {
  const counts = new Map<string, number>();
  for (const link of map.links) {
    if (!PRESSURE_LINK_TYPES.has(link.linkType)) continue;
    counts.set(link.proofPointId, (counts.get(link.proofPointId) ?? 0) + 1);
  }
  return map.proofPoints
    .filter(
      (p) =>
        (counts.get(p.id) ?? 0) > 0 ||
        (p.humanReviewRequired && p.confidenceTag === "needs_solicitor_review"),
    )
    .map((p) => ({
      id: p.id,
      label: p.label,
      pressureLinkCount: counts.get(p.id) ?? 0,
    }))
    .sort((a, b) => b.pressureLinkCount - a.pressureLinkCount);
}

function buildWhyRouteIsLive(
  primaryRoute: string,
  map: ProofMapForBattleboard,
  attacked: BattleboardProofPointAttacked[],
  missingCount: number,
  contraCount: number,
): string {
  const parts = [
    `Primary route "${primaryRoute}" is live on current papers (offence lens: ${map.offenceLens}).`,
    `${attacked.length} Crown proof point(s) are under pressure from the evidence graph.`,
  ];
  if (missingCount > 0) {
    parts.push(
      `${missingCount} missing or partial disclosure item(s) limit how firmly Crown can rely on linked proof points — route remains provisional.`,
    );
  }
  if (contraCount > 0) {
    parts.push(
      `${contraCount} contradiction(s) on the map are unresolved; do not merge conflicting accounts before reconciliation on file.`,
    );
  }
  if (map.humanReviewRequired) {
    parts.push("Human review required before fixing advice or hearing position.");
  }
  return parts.join(" ");
}

function buildCollapseRisks(map: ProofMapForBattleboard): string[] {
  const risks: string[] = [];
  for (const link of map.links) {
    if (link.linkType === "risk" && link.routeImpact) {
      risks.push(`${link.label}: ${link.routeImpact}`);
    } else if (link.linkType === "contradiction" && link.defenceRisk) {
      risks.push(`${link.label}: ${link.defenceRisk}`);
    } else if (link.linkType === "missing" && link.crownRisk) {
      risks.push(`${link.label}: ${link.crownRisk}`);
    }
  }
  const unique = [...new Set(risks)];
  return unique.slice(0, 12);
}

function buildRouteChangeTriggers(map: ProofMapForBattleboard): string[] {
  const triggers = map.links
    .map((l) => l.routeChangeIf?.trim())
    .filter((t): t is string => Boolean(t));
  return [...new Set(triggers)].slice(0, 10);
}

function buildDisclosurePriorities(map: ProofMapForBattleboard): BattleboardDisclosurePriority[] {
  const items: BattleboardDisclosurePriority[] = [];
  for (const link of map.links) {
    if (link.linkType !== "disclosure_chase" && link.linkType !== "missing") continue;
    if (!link.disclosureChase && !link.safeHearingAction && link.linkType !== "disclosure_chase") continue;
    items.push({
      label: link.label,
      proofPointId: link.proofPointId,
      disclosureChase: link.disclosureChase,
      safeHearingAction: link.safeHearingAction,
    });
  }
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.label.toLowerCase().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSafeNextAction(priorities: BattleboardDisclosurePriority[], map: ProofMapForBattleboard): string {
  const chase =
    priorities.find((p) => p.disclosureChase?.trim())?.disclosureChase ??
    map.links.find((l) => l.disclosureChase?.trim())?.disclosureChase;
  if (chase) return chase;
  return "Record outstanding disclosure on file; chase prosecution with focused requests; take instructions before fixing hearing position.";
}

function buildDoNotOverstateWarning(map: ProofMapForBattleboard): string {
  const lines = [
    ...map.proofPoints.map((p) => p.doNotOverstate),
    ...map.links.map((l) => l.doNotOverstate),
  ];
  const unique = [...new Set(lines.map((s) => s.trim()).filter(Boolean))];
  const joined = unique.slice(0, 5).join(" ");
  return joined.length > 900 ? `${joined.slice(0, 897)}...` : joined;
}

function lintBattleboardText(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_BATTLEBOARD_PHRASES.filter((p) => lower.includes(p));
}

export function generateBattleboardView(
  map: ProofMapForBattleboard,
  bundleText: string,
): Omit<BattleboardViewCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote"> {
  const primaryRoute = primaryRouteForLens(map.offenceLens, bundleText);
  const helping = dedupeEvidenceItems(
    map.links.filter((l) => HELPING_LINK_TYPES.has(l.linkType)).map(linkToEvidenceItem),
  );
  const hurting = dedupeEvidenceItems(
    map.links.filter((l) => HURTING_LINK_TYPES.has(l.linkType)).map(linkToEvidenceItem),
  );
  const missingMaterial = dedupeEvidenceItems(
    map.links
      .filter((l) => l.linkType === "missing" || l.linkType === "disclosure_chase")
      .map(linkToEvidenceItem),
  );
  const contradictions = dedupeEvidenceItems(
    map.links.filter((l) => l.linkType === "contradiction").map(linkToEvidenceItem),
  );
  const proofPointsAttacked = proofPointsAttackedFromMap(map);
  const disclosureChasePriorities = buildDisclosurePriorities(map);
  const whyRouteIsLive = buildWhyRouteIsLive(
    primaryRoute,
    map,
    proofPointsAttacked,
    missingMaterial.length,
    contradictions.length,
  );

  const humanReviewReasons = [...map.humanReviewReasons];
  const collapseRisks = buildCollapseRisks(map);
  const allText = [whyRouteIsLive, primaryRoute, buildDoNotOverstateWarning(map), ...collapseRisks].join(
    " ",
  );
  const forbidden = lintBattleboardText(allText);
  if (forbidden.length) {
    humanReviewReasons.push(`Forbidden phrasing in battleboard output: ${forbidden.join(", ")}`);
  }

  return {
    bundleId: map.bundleId,
    label: map.label,
    charge: map.charge,
    stage: map.stage,
    offenceLens: map.offenceLens,
    primaryRoute,
    whyRouteIsLive,
    proofPointsAttacked,
    evidenceHelpingDefence: helping,
    evidenceHurtingDefence: hurting,
    missingMaterial,
    contradictions,
    collapseRisks,
    routeChangeTriggers: buildRouteChangeTriggers(map),
    disclosureChasePriorities,
    safeNextAction: buildSafeNextAction(disclosureChasePriorities, map),
    doNotOverstateWarning: buildDoNotOverstateWarning(map),
    humanReviewRequired: map.humanReviewRequired || forbidden.length > 0,
    humanReviewReasons,
    proofMapProofPointIds: map.proofPoints.map((p) => p.id),
    bundleTextChars: map.bundleTextChars,
  };
}

export function lintBattleboardViewResult(
  view: Pick<
    BattleboardViewCaseResult,
    | "primaryRoute"
    | "whyRouteIsLive"
    | "safeNextAction"
    | "doNotOverstateWarning"
    | "collapseRisks"
    | "routeChangeTriggers"
    | "evidenceHelpingDefence"
    | "evidenceHurtingDefence"
    | "missingMaterial"
    | "contradictions"
  >,
): string[] {
  const errs: string[] = [];
  const blobs = [
    view.primaryRoute,
    view.whyRouteIsLive,
    view.safeNextAction,
    view.doNotOverstateWarning,
    ...view.collapseRisks,
    ...view.routeChangeTriggers,
  ];
  for (const blob of blobs) {
    errs.push(...lintBattleboardText(blob).map((e) => `battleboard text: ${e}`));
  }
  for (const item of [
    ...view.evidenceHelpingDefence,
    ...view.evidenceHurtingDefence,
    ...view.missingMaterial,
    ...view.contradictions,
  ]) {
    errs.push(
      ...lintBattleboardText(JSON.stringify(item)).map((e) => `item ${item.proofPointId}: ${e}`),
    );
    if (!item.doNotOverstate?.trim()) errs.push(`item ${item.proofPointId}: missing doNotOverstate`);
  }
  if (!view.doNotOverstateWarning?.trim()) errs.push("missing doNotOverstateWarning");
  if (!view.safeNextAction?.trim()) errs.push("missing safeNextAction");
  return errs;
}
