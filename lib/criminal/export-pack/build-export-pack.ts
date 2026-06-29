import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type {
  MatterConfidenceResult,
  SendabilityLevel,
} from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { buildMatterBrief } from "@/components/criminal/workflow/buildMatterBrief";
import { stripReqAndInternalCodes } from "@/components/criminal/workflow/matterBriefAssembly";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import {
  evidenceExistenceLabel,
  evidenceReliabilityLabel,
} from "@/lib/criminal/five-answers/evidence-trace";
import { inferChaseItemSourceState, buildCopySafeResult } from "@/lib/criminal/trust/copy-safe";
import { FIRM_SENDABILITY_LABELS } from "@/lib/criminal/trust/firm-facing-labels";
import type { ExportPackModel, ExportPackSection, ExportVersionStamp } from "./types";

const UNSAFE_PHRASE_RE =
  /\b(you will win|case collapses|defence succeeds|charge will be dropped|we win|must be acquitted|guaranteed|change your advice)\b/i;

const COURT_IN_CPS_RE =
  /\b(ask the court|the defence asks the court|the court to record|your honour|my learned friend)\b/i;

const INTERNAL_ROUTE_RE =
  /\b(digital_attribution|bwv_police_contact|custody_pace|mixed_unclear|primary route:|REQ-|proof-map)\b/i;

const REVIEW_FOOTER =
  "Solicitor review required before sending to CPS, court, or client.";

function sanitise(text: string): string {
  const t = text.trim();
  if (!t) return "";
  if (UNSAFE_PHRASE_RE.test(t)) return "Provisional summary — requires solicitor review before use.";
  return t;
}

function worstSendability(levels: SendabilityLevel[]): SendabilityLevel {
  const rank: Record<SendabilityLevel, number> = {
    blocked: 4,
    provisional_check_source: 3,
    needs_solicitor_review: 2,
    safe_to_send: 1,
  };
  return levels.reduce((a, b) => (rank[b] > rank[a] ? b : a), "safe_to_send");
}

function makeExportId(caseId: string, generatedAt: string): string {
  const t = generatedAt.replace(/[^\d]/g, "").slice(0, 14);
  return `exp-${caseId.slice(0, 8)}-${t}`;
}

function buildCpsChaseSection(
  chase: DisclosureChaseBrief,
  matterConfidence: MatterConfidenceResult | null,
): ExportPackSection {
  const blocks: string[] = [];
  const sendabilities: SendabilityLevel[] = [];
  let blockedReason: string | null = null;

  for (const item of chase.primaryItems.slice(0, 5)) {
    const sourceState = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const raw = item.draftChaseWording?.trim() || `Please provide ${item.label}.`;
    const copy = buildCopySafeResult({
      text: raw,
      kind: "cps_chase",
      sourceState,
      sourceLabel: item.source,
      matterLevel: matterConfidence?.chaseSendability,
    });
    sendabilities.push(copy.sendability);
    if (copy.blockedReason) blockedReason = copy.blockedReason;
    if (COURT_IN_CPS_RE.test(raw)) {
      blockedReason = "Court wording must not appear in CPS chase copy.";
    }
    const stateLabel = sourceState.replace(/_/g, " ");
    const line = copy.canCopy
      ? copy.textForClipboard.split("\n\n")[0]!
      : sanitise(raw) + "\n\n[Blocked — solicitor review required]";
    blocks.push(`— ${item.label} [${stateLabel}]\n${line}`);
  }

  const body =
    blocks.length > 0
      ? `CPS DISCLOSURE CHASE DRAFT\n(not for court — requests material only)\n\n${blocks.join("\n\n")}`
      : "No chase items on current papers — open Chase tab before drafting CPS correspondence.";

  const sendability = blockedReason ? "blocked" : worstSendability(sendabilities);
  const canCopy = sendability !== "blocked" && !COURT_IN_CPS_RE.test(body);

  return {
    id: "cps_chase",
    title: "CPS chase draft",
    textForClipboard: canCopy ? `${body}\n\n${REVIEW_FOOTER}` : body,
    canCopy,
    sendability,
    sendabilityLabel: FIRM_SENDABILITY_LABELS[sendability],
    footer: REVIEW_FOOTER,
    blockedReason,
  };
}

function buildCourtNoteSection(
  chase: DisclosureChaseBrief,
  warRoom: HearingWarRoomBrief,
  matterConfidence: MatterConfidenceResult | null,
): ExportPackSection {
  const raw = chase.safeCourtLine?.trim() || warRoom.safePositionToday?.trim() || "";
  const copy = buildCopySafeResult({
    text: raw || "Source-backed court note not yet available — review Today tab.",
    kind: "court_line",
    sourceState: "needs_review",
    matterLevel: matterConfidence?.level === "blocked" ? "blocked" : "needs_solicitor_review",
  });

  const body = `COURT NOTE\n(not for CPS chase)\n\n${copy.textForClipboard}`;

  return {
    id: "court_note",
    title: "Court note",
    textForClipboard: `${body}\n\n${REVIEW_FOOTER}`,
    canCopy: copy.canCopy,
    sendability: copy.sendability,
    sendabilityLabel: FIRM_SENDABILITY_LABELS[copy.sendability],
    footer: copy.footer,
    blockedReason: copy.blockedReason,
  };
}

function buildClientSummarySection(
  warRoom: HearingWarRoomBrief,
  chase: DisclosureChaseBrief,
  briefPlan: CriminalBriefPlan | null,
  primaryRouteTitle: string | null,
  matterConfidence: MatterConfidenceResult | null,
): ExportPackSection {
  const matterBrief = buildMatterBrief({ warRoom, chase, primaryRouteTitle, briefPlan });
  const clientSection = matterBrief.sections.find((s) => s.id === "client");
  let raw = [clientSection?.paragraph, ...(clientSection?.bullets ?? [])]
    .filter(Boolean)
    .map((line) => stripReqAndInternalCodes(String(line)))
    .join("\n\n");

  if (!raw.trim()) {
    raw =
      "We are reviewing the papers. Some material may still be outstanding or only referred on the schedule — nothing is confirmed until served and reviewed.";
  }

  if (INTERNAL_ROUTE_RE.test(raw)) {
    raw =
      "We are reviewing the case papers. Some evidence may still be outstanding or provisional — solicitor review required before discussing details with the client.";
  }

  const copy = buildCopySafeResult({
    text: sanitise(raw),
    kind: "client_summary",
    sourceState: "provisional",
    matterLevel: matterConfidence?.summarySendability,
  });

  const body = `CLIENT-SAFE SUMMARY\n(not for court or CPS)\n\n${copy.textForClipboard}`;

  return {
    id: "client_summary",
    title: "Client-safe summary",
    textForClipboard: `${body}\n\n${REVIEW_FOOTER}`,
    canCopy: copy.canCopy,
    sendability: copy.sendability,
    sendabilityLabel: FIRM_SENDABILITY_LABELS[copy.sendability],
    footer: copy.footer,
    blockedReason: copy.blockedReason,
  };
}

function buildEvidenceGapsSection(
  allegation: string,
  warRoom: HearingWarRoomBrief,
  chase: DisclosureChaseBrief,
  matterConfidence: MatterConfidenceResult | null,
  doNotOverstate: string[],
): ExportPackSection {
  const five = buildFiveAnswersView({
    allegation,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
  });

  const lines = five.evidenceState.rows.slice(0, 8).map((row) => {
    const existence = evidenceExistenceLabel(row.existence);
    const reliability = evidenceReliabilityLabel(row.reliability);
    const note = row.note?.trim() ? ` — ${sanitise(row.note)}` : "";
    return `• ${row.label} [${existence} / ${reliability}]${note}`;
  });

  const chaseLines = chase.primaryItems.slice(0, 5).map((item) => {
    const state = inferChaseItemSourceState({
      label: item.label,
      source: item.source,
      baseStatus: item.baseStatus,
      evidenceAnchor: item.evidenceAnchor,
    });
    const anchor = item.evidenceAnchor?.trim() || item.source?.trim() || "Papers";
    const why = item.whyItMatters?.trim() ? ` — ${sanitise(item.whyItMatters)}` : "";
    return `• Chase: ${item.label} [${state.replace(/_/g, " ")}] (${anchor})${why}`;
  });

  const combined = [...lines, ...chaseLines.filter((l) => !lines.some((x) => x.includes(l.slice(10, 30))))];
  const body = `EVIDENCE GAP LIST\n\n${combined.length ? combined.join("\n") : "No outstanding gaps flagged on current papers."}`;
  const sendability: SendabilityLevel = "needs_solicitor_review";

  return {
    id: "evidence_gaps",
    title: "Evidence gap list",
    textForClipboard: `${body}\n\n${REVIEW_FOOTER}`,
    canCopy: true,
    sendability,
    sendabilityLabel: FIRM_SENDABILITY_LABELS[sendability],
    footer: REVIEW_FOOTER,
    blockedReason: null,
  };
}

function buildDoNotOverstateSection(doNotOverstate: string[]): ExportPackSection {
  const lines = doNotOverstate.slice(0, 8).map((line) => {
    const clean = sanitise(stripReqAndInternalCodes(line));
    return `• Do not say: ${clean}\n  Why unsafe: Source not confirmed on current papers — solicitor review required.`;
  });

  const body = `DO NOT OVERSTATE\n(warnings — not allegations)\n\n${lines.length ? lines.join("\n\n") : "No specific do-not-overstate warnings on current papers."}`;
  const sendability: SendabilityLevel = "needs_solicitor_review";

  return {
    id: "do_not_overstate",
    title: "Do-not-overstate warnings",
    textForClipboard: `${body}\n\n${REVIEW_FOOTER}`,
    canCopy: true,
    sendability,
    sendabilityLabel: FIRM_SENDABILITY_LABELS[sendability],
    footer: REVIEW_FOOTER,
    blockedReason: null,
  };
}

export type BuildExportPackInput = {
  caseId: string;
  allegation: string;
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  briefPlan: CriminalBriefPlan | null;
  matterConfidence: MatterConfidenceResult | null;
  doNotOverstate: string[];
  primaryRouteTitle: string | null;
  appVersion?: string | null;
  generatedAt?: string;
};

export function buildExportPack(input: BuildExportPackInput): ExportPackModel {
  const {
    caseId,
    allegation,
    warRoom,
    chase,
    briefPlan,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle,
    appVersion = null,
    generatedAt = new Date().toISOString(),
  } = input;

  const cpsChase = buildCpsChaseSection(chase, matterConfidence);
  const courtNote = buildCourtNoteSection(chase, warRoom, matterConfidence);
  const clientSummary = buildClientSummarySection(
    warRoom,
    chase,
    briefPlan,
    primaryRouteTitle,
    matterConfidence,
  );
  const evidenceGaps = buildEvidenceGapsSection(
    allegation,
    warRoom,
    chase,
    matterConfidence,
    doNotOverstate,
  );
  const doNot = buildDoNotOverstateSection(doNotOverstate);

  const coreSections: ExportPackSection[] = [
    cpsChase,
    courtNote,
    clientSummary,
    evidenceGaps,
    doNot,
  ];

  const sourceStatesIncluded = [
    ...(matterConfidence?.sourceBadges ?? []),
    ...chase.primaryItems.map((item) =>
      inferChaseItemSourceState({
        label: item.label,
        source: item.source,
        baseStatus: item.baseStatus,
        evidenceAnchor: item.evidenceAnchor,
      }),
    ),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const sendability = worstSendability(coreSections.map((s) => s.sendability));
  const blockedReason =
    coreSections.find((s) => s.blockedReason)?.blockedReason ??
    (matterConfidence?.level === "blocked" ? "Matter confidence blocked — review before export." : null);

  const version: ExportVersionStamp = {
    exportId: makeExportId(caseId, generatedAt),
    caseId,
    generatedAt,
    exportType: "h5_export_pack_v1",
    bundleVersionLabel: `overview-export@${generatedAt.slice(0, 10)}`,
    appVersion,
    sourceStatesIncluded,
    sendability: blockedReason ? "blocked" : sendability,
    warningCount: doNotOverstate.length,
    blockedReason,
    reviewFooter: REVIEW_FOOTER,
  };

  const versionBlock = [
    "— VERSION STAMP —",
    `Export ID: ${version.exportId}`,
    `Case ID: ${caseId}`,
    `Generated: ${generatedAt}`,
    version.appVersion ? `Build: ${version.appVersion}` : null,
    `Bundle/output: ${version.bundleVersionLabel}`,
    `Source states: ${sourceStatesIncluded.join(", ") || "not recorded"}`,
    `Sendability: ${FIRM_SENDABILITY_LABELS[version.sendability]}`,
    version.blockedReason ? `Blocked: ${version.blockedReason}` : null,
    version.reviewFooter,
  ]
    .filter(Boolean)
    .join("\n");

  const fullPack = [...coreSections.map((s) => s.textForClipboard), versionBlock].join(
    "\n\n────────────\n\n",
  );

  const sections: ExportPackSection[] = [
    ...coreSections,
    {
      id: "full_pack",
      title: "Full export pack",
      textForClipboard: fullPack,
      canCopy: !blockedReason,
      sendability: version.sendability,
      sendabilityLabel: FIRM_SENDABILITY_LABELS[version.sendability],
      footer: REVIEW_FOOTER,
      blockedReason,
    },
  ];

  return {
    sections,
    version,
    reviewNotice:
      "Export pack separates CPS chase, court note, and client summary — each with source-state labels. Not legal advice.",
  };
}
