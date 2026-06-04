import type { ProofMapForBattleboard } from "./battleboard-view-generate";
import type {
  WarRoomCourtRecordRequest,
  WarRoomDisclosureTimetableRequest,
  WarRoomHearingAction,
  WarRoomProsecutionResponsePoint,
  WarRoomViewCaseResult,
} from "./war-room-view-types";
import { FORBIDDEN_WAR_ROOM_PHRASES } from "./war-room-view-types";
import type { ProofMapLink } from "./proof-map-types";

function lintWarRoomText(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_WAR_ROOM_PHRASES.filter((p) => lower.includes(p));
}

function missingLinks(map: ProofMapForBattleboard): ProofMapLink[] {
  return map.links.filter((l) => l.linkType === "missing" || l.linkType === "disclosure_chase");
}

function contradictionLinks(map: ProofMapForBattleboard): ProofMapLink[] {
  return map.links.filter((l) => l.linkType === "contradiction");
}

function buildSafeHearingLine(
  map: ProofMapForBattleboard,
  missingCount: number,
  contraCount: number,
): string {
  const stage = map.stage ?? "next hearing";
  const parts = [
    `For ${map.charge} (${stage}): the defence hearing line on current papers remains provisional.`,
  ];
  if (missingCount > 0) {
    parts.push(
      `${missingCount} disclosure item(s) on the proof map are outstanding or partial — do not concede evidential strength on linked proof points until served material is on file.`,
    );
  }
  if (contraCount > 0) {
    parts.push(
      `${contraCount} contradiction(s) are unresolved — ask the court to record the conflict; do not merge accounts into one agreed fact.`,
    );
  }
  if (map.humanReviewRequired) {
    parts.push("Solicitor review required before fixing final hearing position or concessions.");
  } else if (map.offenceLens === "generic_provisional" || map.offenceLens === "unknown") {
    parts.push("Solicitor review required before fixing final hearing position or concessions.");
  }
  parts.push("Take instructions; chase disclosure; record asks on the court file.");
  return parts.join(" ");
}

function courtRecordFromLink(link: ProofMapLink): string {
  if (link.linkType === "contradiction") {
    const short = link.label.length > 90 ? `${link.label.slice(0, 87)}...` : link.label;
    return `Ask the court to record that "${short}" is unresolved on the papers — do not treat as an agreed fact.`;
  }
  if (link.safeHearingAction?.trim()) return link.safeHearingAction.trim();
  const short = link.label.length > 90 ? `${link.label.slice(0, 87)}...` : link.label;
  return `Ask the court to record that ${short} appears outstanding or incomplete on the current papers.`;
}

function proofPointLabel(map: ProofMapForBattleboard, id: string): string {
  return map.proofPoints.find((p) => p.id === id)?.label ?? id;
}

function uniquifyCourtRequest(
  request: string,
  proofPointId: string,
  map: ProofMapForBattleboard,
): string {
  const label = proofPointLabel(map, proofPointId);
  const snippet = label.length > 50 ? `${label.slice(0, 47)}...` : label;
  if (request.toLowerCase().includes(snippet.toLowerCase().slice(0, 24))) return request;
  return `${request.replace(/\.$/, "")} (proof map: ${snippet}).`;
}

function bestLinkForProofPoint(links: ProofMapLink[], proofPointId: string): ProofMapLink | undefined {
  const candidates = links.filter((l) => l.proofPointId === proofPointId);
  if (!candidates.length) return undefined;
  return candidates.sort((a, b) => {
    const aGeneric = /^disclosure chase \(outstanding on export\)$/i.test(a.label.trim()) ? 0 : 1;
    const bGeneric = /^disclosure chase \(outstanding on export\)$/i.test(b.label.trim()) ? 0 : 1;
    if (aGeneric !== bGeneric) return bGeneric - aGeneric;
    return b.label.length - a.label.length;
  })[0];
}

function buildCourtRecordRequests(map: ProofMapForBattleboard): WarRoomCourtRecordRequest[] {
  const seenRequests = new Set<string>();
  const items: WarRoomCourtRecordRequest[] = [];
  const coveredProofPoints = new Set<string>();

  const orderedLinks = [...contradictionLinks(map), ...missingLinks(map)];

  // At least one court record per proof point id represented on pressure links
  const proofPointIds = [...new Set(orderedLinks.map((l) => l.proofPointId))];
  for (const proofPointId of proofPointIds) {
    const link = bestLinkForProofPoint(orderedLinks, proofPointId);
    if (!link || coveredProofPoints.has(proofPointId)) continue;
    coveredProofPoints.add(proofPointId);
    let request = courtRecordFromLink(link);
    let key = request.toLowerCase().slice(0, 100);
    if (seenRequests.has(key)) {
      request = uniquifyCourtRequest(request, link.proofPointId, map);
      key = request.toLowerCase().slice(0, 100);
    }
    seenRequests.add(key);
    items.push({
      request,
      proofPointId: link.proofPointId,
      sourceSection: link.sourceSection,
      sourceBasis: link.sourceBasis,
      linkedIssue: link.label,
      confidenceTag: link.confidenceTag,
    });
  }

  for (const link of orderedLinks) {
    const request = courtRecordFromLink(link);
    const key = request.toLowerCase().slice(0, 100);
    if (seenRequests.has(key)) continue;
    seenRequests.add(key);
    items.push({
      request,
      proofPointId: link.proofPointId,
      sourceSection: link.sourceSection,
      sourceBasis: link.sourceBasis,
      linkedIssue: link.label,
      confidenceTag: link.confidenceTag,
    });
    if (items.length >= 14) break;
  }

  for (const p of map.proofPoints) {
    if (p.confidenceTag !== "needs_solicitor_review") continue;
    if (coveredProofPoints.has(p.id)) continue;
    coveredProofPoints.add(p.id);
    items.push({
      request: `Ask the court to note that ${p.label} remains provisional pending served material and solicitor review.`,
      proofPointId: p.id,
      sourceSection: p.sourceSection,
      sourceBasis: p.sourceBasis,
      linkedIssue: p.label,
      confidenceTag: p.confidenceTag,
    });
  }

  return items.slice(0, 16);
}

function buildDisclosureTimetableRequests(
  map: ProofMapForBattleboard,
): WarRoomDisclosureTimetableRequest[] {
  const seen = new Set<string>();
  const items: WarRoomDisclosureTimetableRequest[] = [];
  for (const link of map.links) {
    if (link.linkType !== "disclosure_chase" && link.linkType !== "missing") continue;
    const short = link.label.length > 100 ? `${link.label.slice(0, 97)}...` : link.label;
    const request = `Request prosecution timetable and date for service of: ${short}`;
    const key = `${link.proofPointId}|${short.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ request, proofPointId: link.proofPointId, linkedIssue: link.label });
  }
  return items.slice(0, 12);
}

function buildProsecutionResponsePoints(map: ProofMapForBattleboard): WarRoomProsecutionResponsePoint[] {
  const points: WarRoomProsecutionResponsePoint[] = [];
  const seen = new Set<string>();

  for (const link of contradictionLinks(map)) {
    const crownSays = `Prosecution may treat "${link.label}" as settled on the served papers.`;
    const safeDefenceResponse = `Defence cannot safely accept that account — sources conflict on the bundle. Ask for reconciliation on file; do not concede the disputed point (${link.sourceSection}).`;
    const key = link.label.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({
      crownSays,
      safeDefenceResponse,
      proofPointId: link.proofPointId,
      sourceSection: link.sourceSection,
      doNotOverstate: link.doNotOverstate,
      confidenceTag: link.confidenceTag,
    });
  }

  for (const link of missingLinks(map)) {
    if (!/cctv|medical|phone|bank|999|cad|bwv|interview|mg6|export|continuity|identification|attribution/i.test(
      link.label,
    )) {
      continue;
    }
    const crownSays = `Prosecution may say ${link.label.slice(0, 90)} supports the Crown case or will be served shortly.`;
    const safeDefenceResponse = `Defence position: item marked outstanding or partial on papers — do not concede reliance on linked proof point until material is served and instructions taken.`;
    const key = `missing|${link.label.toLowerCase().slice(0, 60)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({
      crownSays,
      safeDefenceResponse,
      proofPointId: link.proofPointId,
      sourceSection: link.sourceSection,
      doNotOverstate: link.doNotOverstate,
      confidenceTag: link.confidenceTag,
    });
  }

  for (const p of map.proofPoints) {
    if (p.confidenceTag !== "needs_solicitor_review") continue;
    const key = `sr|${p.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    points.push({
      crownSays: `Prosecution may rely on ${p.label} as a charge element on the papers.`,
      safeDefenceResponse: `Defence position on ${p.label} remains provisional — take instructions; do not concede this element without served material. ${p.doNotOverstate}`,
      proofPointId: p.id,
      sourceSection: p.sourceSection,
      doNotOverstate: p.doNotOverstate,
      confidenceTag: p.confidenceTag,
    });
  }

  return points.slice(0, 12);
}

function buildDoNotConcede(map: ProofMapForBattleboard): string[] {
  const items: string[] = [];
  if (contradictionLinks(map).length > 0) {
    items.push(
      "Do not concede disputed facts while proof-map contradictions remain unreconciled on file.",
    );
  }
  for (const link of missingLinks(map).slice(0, 6)) {
    const short = link.label.length > 70 ? `${link.label.slice(0, 67)}...` : link.label;
    items.push(`Do not concede Crown reliance on "${short}" while marked outstanding on papers.`);
  }
  for (const p of map.proofPoints) {
    if (/do not concede|do not treat|do not state|do not fix|do not infer/i.test(p.doNotOverstate)) {
      items.push(p.doNotOverstate);
    }
  }
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))].slice(0, 12);
}

function buildHearingRisks(map: ProofMapForBattleboard): string[] {
  const risks: string[] = [];
  for (const link of map.links) {
    if (link.linkType === "contradiction" && link.defenceRisk) {
      risks.push(`${link.label}: ${link.defenceRisk}`);
    } else if (link.linkType === "risk" && link.routeImpact) {
      risks.push(`${link.label}: ${link.routeImpact}`);
    } else if (link.linkType === "missing" && link.defenceRisk) {
      risks.push(`${link.label}: ${link.defenceRisk}`);
    }
  }
  if (map.humanReviewRequired) {
    risks.push("Solicitor review required — offence lens or proof points flagged on proof map.");
  }
  return [...new Set(risks)].slice(0, 12);
}

function buildNextHearingActions(map: ProofMapForBattleboard): WarRoomHearingAction[] {
  const seen = new Set<string>();
  const actions: WarRoomHearingAction[] = [];
  for (const link of map.links) {
    const action =
      link.safeHearingAction?.trim() ??
      link.disclosureChase?.trim() ??
      (link.linkType === "disclosure_chase"
        ? `Chase disclosure for ${link.label.slice(0, 80)}; request timetable on file.`
        : null);
    if (!action) continue;
    const key = `${link.proofPointId}|${action.toLowerCase().slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    actions.push({
      action,
      proofPointId: link.proofPointId,
      linkedIssue: link.label,
      disclosureChase: link.disclosureChase,
    });
  }
  if (!actions.length) {
    const fallbackPp =
      map.proofPoints.find((p) => p.id === "pp-disclosure-fair-trial")?.id ?? map.proofPoints[0]?.id;
    if (fallbackPp) {
      actions.push({
        action:
          "Record outstanding disclosure on file; take instructions before fixing hearing position.",
        proofPointId: fallbackPp,
        linkedIssue: "Disclosure completeness",
      });
    }
  }
  return actions.slice(0, 12);
}

function buildDoNotOverstate(map: ProofMapForBattleboard): string {
  const lines = [
    ...map.proofPoints.map((p) => p.doNotOverstate),
    ...map.links.map((l) => l.doNotOverstate),
  ];
  const unique = [...new Set(lines.map((s) => s.trim()).filter(Boolean))];
  const joined = unique.slice(0, 6).join(" ");
  return joined.length > 900 ? `${joined.slice(0, 897)}...` : joined;
}

export function generateWarRoomView(
  map: ProofMapForBattleboard,
): Omit<WarRoomViewCaseResult, "overall" | "skipped" | "skipReason" | "scaffoldNote"> {
  const missing = missingLinks(map);
  const contradictions = contradictionLinks(map);
  const safeHearingLine = buildSafeHearingLine(map, missing.length, contradictions.length);
  const courtRecordRequests = buildCourtRecordRequests(map);
  const disclosureTimetableRequests = buildDisclosureTimetableRequests(map);
  const prosecutionResponsePoints = buildProsecutionResponsePoints(map);
  const doNotConcede = buildDoNotConcede(map);
  const doNotOverstate = buildDoNotOverstate(map);
  const hearingRisks = buildHearingRisks(map);
  const nextHearingActions = buildNextHearingActions(map);

  const solicitorReviewReasons = [...map.humanReviewReasons];
  if (map.proofPoints.some((p) => p.humanReviewRequired || p.confidenceTag === "needs_solicitor_review")) {
    solicitorReviewReasons.push("One or more proof points require solicitor review on proof map.");
  }

  const allText = [
    safeHearingLine,
    doNotOverstate,
    ...doNotConcede,
    ...prosecutionResponsePoints.map((p) => p.safeDefenceResponse),
    ...courtRecordRequests.map((c) => c.request),
  ].join(" ");
  const forbidden = lintWarRoomText(allText);
  if (forbidden.length) {
    solicitorReviewReasons.push(`Forbidden phrasing in war room output: ${forbidden.join(", ")}`);
  }

  return {
    bundleId: map.bundleId,
    label: map.label,
    charge: map.charge,
    stage: map.stage,
    offenceLens: map.offenceLens,
    safeHearingLine,
    courtRecordRequests,
    disclosureTimetableRequests,
    prosecutionResponsePoints,
    doNotConcede,
    doNotOverstate,
    solicitorReviewRequired:
      map.humanReviewRequired ||
      map.offenceLens === "generic_provisional" ||
      map.offenceLens === "unknown" ||
      forbidden.length > 0 ||
      map.proofPoints.some((p) => p.confidenceTag === "needs_solicitor_review"),
    solicitorReviewReasons: [...new Set(solicitorReviewReasons)],
    hearingRisks,
    nextHearingActions,
    proofMapProofPointIds: map.proofPoints.map((p) => p.id),
    bundleTextChars: map.bundleTextChars,
  };
}

export function lintWarRoomViewResult(
  view: Pick<
    WarRoomViewCaseResult,
    | "safeHearingLine"
    | "doNotOverstate"
    | "doNotConcede"
    | "hearingRisks"
    | "courtRecordRequests"
    | "prosecutionResponsePoints"
    | "nextHearingActions"
  >,
): string[] {
  const errs: string[] = [];
  const blobs = [
    view.safeHearingLine,
    view.doNotOverstate,
    ...view.doNotConcede,
    ...view.hearingRisks,
    ...view.courtRecordRequests.map((c) => c.request),
    ...view.prosecutionResponsePoints.flatMap((p) => [p.crownSays, p.safeDefenceResponse]),
    ...view.nextHearingActions.map((a) => a.action),
  ];
  for (const blob of blobs) {
    errs.push(...lintWarRoomText(blob).map((e) => `war room text: ${e}`));
  }
  if (!view.safeHearingLine?.trim()) errs.push("missing safeHearingLine");
  if (!view.doNotOverstate?.trim()) errs.push("missing doNotOverstate");
  if (!view.doNotConcede.length) errs.push("missing doNotConcede entries");
  for (const c of view.courtRecordRequests) {
    if (!c.proofPointId) errs.push("court record request missing proofPointId");
  }
  for (const p of view.prosecutionResponsePoints) {
    if (!p.doNotOverstate?.trim()) errs.push(`prosecution response ${p.proofPointId}: missing doNotOverstate`);
  }
  return errs;
}
