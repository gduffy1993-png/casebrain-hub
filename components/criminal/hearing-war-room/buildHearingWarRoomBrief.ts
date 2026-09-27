import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";
import {
  filterWorkflowPilotLines,
  resolveWorkflowProfile,
  softenPilotRiskWording,
  sanitizePilotVisibleLine,
  sanitizePilotEvidenceAnchors,
  pilotCleanupVisibleText,
  pilotFinalizeBriefLines,
  pilotPositionDisplayLabel,
} from "@/lib/criminal/pilot-workflow";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import {
  buildBundleTruthLedger,
  formatDisplayLabelCasing,
  guardSolicitorLines,
  sanitizeTextAgainstForbiddenClaims,
  textViolatesForbiddenClaims,
  isBlockedBattleboardTemplateLine,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger } from "@/lib/criminal/bundle-truth-types";
import {
  type BundleContradiction,
} from "@/lib/criminal/extract-bundle-contradictions";
import { extractAllBundleContradictions } from "@/lib/criminal/merge-bundle-contradictions";
import { isBundleContradictionSurfacingEnabled } from "@/lib/criminal/bundle-contradiction-surfacing";
import { isBundleSequenceSurfacingEnabled } from "@/lib/criminal/bundle-sequence-surfacing";
import { isBundleScopeSurfacingEnabled } from "@/lib/criminal/bundle-scope-surfacing";
import { isBundleStrengthSurfacingEnabled } from "@/lib/criminal/bundle-strength-surfacing";
import { isBundleMultiIncidentSurfacingEnabled } from "@/lib/criminal/bundle-multi-incident-surfacing";
import { isBundleTriangulationSurfacingEnabled } from "@/lib/criminal/bundle-triangulation-surfacing";
import { buildClientSafeExplanation } from "@/lib/criminal/build-client-safe-explanation";
import { isBundleClientSafeSurfacingEnabled } from "@/lib/criminal/bundle-client-safe-surfacing";
import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan";
import {
  lineIsUnbackedOffenceFamilyFurniture,
  smokePackSolicitorFurniture,
} from "@/lib/criminal/smoke-pack-front-sheet";
import { buildContradictionActions } from "@/lib/criminal/contradiction-actions";
import { guardHearingWarRoomBrief, type SourceTruthGuardianReport } from "@/lib/criminal/source-truth-guardian";
import {
  humanizeChaseFragmentLabel,
} from "@/lib/criminal/disclosure-chase-finalize";
import { dedupePilotCourtRecordLines } from "@/lib/criminal/pilot-matter-display-polish";

const FORBIDDEN_RE =
  /\b(this wins|case collapses|crowns?\s+will\s+lose|crown\s+case\s+collapses|guaranteed|will\s+be\s+acquitted|plead\s+guilty|plead\s+not\s+guilty)\b/i;

const COURT_RECORD_PREFIX = "Ask the court to record";

export type HearingWarRoomBrief = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  readiness: string;
  safePositionToday: string;
  sayThis: string[];
  doNotOverstate: string[];
  askCourtToRecord: string[];
  instructionsNeeded: string[];
  nextHearingMoves: string[];
  evidenceAnchors: string[];
  collapseRisks: string[];
  /** Document-pair inconsistencies — additive; empty when bundle does not support them. */
  bundleContradictions?: BundleContradiction[];
  draftWording: {
    disclosureTimetable: string;
    adjournment: string;
    clientExplanation: string;
  };
  sourceTruthGuardian?: SourceTruthGuardianReport;
};

export type BuildHearingWarRoomBriefInput = {
  caseId: string;
  caseTitle: string;
  clientLabel: string;
  allegation: string;
  stage: string;
  hearingStatus: string;
  bundleHealth: string;
  positionStatus: string;
  readiness: string;
  battleboard: BattleboardOutput | null;
  hasSavedPosition: boolean;
  chaseItems: string[];
  defencePlan?: DefenceStrategyPlan | null;
  proceduralOutstanding?: string[];
  bundleText?: string | null;
  profileHint?: WorkflowProfile | null;
  briefPlan?: CriminalBriefPlan | null;
  /** Non-admin pilot demo: softer instruction copy (no “record position” CTA). */
  pilotDemoReadOnly?: boolean;
  /** Live canonical findings — merged into collapse risks / do-not-overstate / evidence anchors. */
  canonicalFindings?: Array<{
    title: string;
    summary: string;
    unresolved: boolean;
    provenanceLine: string;
    severity?: string;
  }>;
};

function sanitizeLine(text: string): string | null {
  const t = text.trim();
  if (!t || FORBIDDEN_RE.test(t)) return null;
  return t;
}

function uniqueLines(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = sanitizeLine(raw);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

const FILE_BACKED_QUIET_COURT_LINE =
  "The defence position remains provisional pending served source material and solicitor instructions.";

export function courtShortlistLabelsFromChaseItems(
  chaseItems: string[],
  bundleText?: string | null,
): string[] {
  return uniqueLines(
    chaseItems
      .map((raw) => raw.trim())
      .filter((line) => {
        if (!line) return false;
        if (/\bserved\b/i.test(line) && !/\boutstanding\b/i.test(line)) return false;
        if (lineIsUnbackedOffenceFamilyFurniture(line, bundleText)) return false;
        return true;
      }),
    12,
  );
}

export function composeFileBackedCourtSafeLine(input: {
  labelledCourtLine?: string | null;
  shortlist: string[];
}): string {
  const labelled = input.labelledCourtLine?.trim();
  if (labelled) return labelled;
  const named = uniqueLines(input.shortlist, 3);
  if (!named.length) return FILE_BACKED_QUIET_COURT_LINE;
  const joined = named.join("; ");
  const verb = named.length === 1 ? "remains" : "remain";
  return `The defence asks the court to record that ${joined} ${verb} outstanding on the current papers. Position remains provisional pending served source material and solicitor instructions.`;
}

function toCourtRecordAsk(item: string): string {
  const t = item.trim();
  if (!t || /^please provide/i.test(t)) return "";
  if (/^ask the court/i.test(t)) {
    return dedupePilotCourtRecordLines([formatDisplayLabelCasing(t)])[0] ?? "";
  }

  let label = humanizeChaseFragmentLabel(
    t.replace(/^chase[:\s]*/i, "").replace(/^outstanding[:\s]*/i, ""),
  );
  if (!label) label = t.replace(/^chase[:\s]*/i, "").replace(/^outstanding[:\s]*/i, "").trim();
  if (!label) return "";

  return (
    dedupePilotCourtRecordLines([
      formatDisplayLabelCasing(
        `${COURT_RECORD_PREFIX} that ${label.charAt(0).toLowerCase()}${label.slice(1)} remains outstanding and should be disclosed on a timetable.`,
      ),
    ])[0] ?? ""
  );
}

function fileBackedSayThis(hasChase: boolean): string[] {
  if (!hasChase) return [FILE_BACKED_QUIET_COURT_LINE];
  return [
    "Keep the position provisional and tied to the uploaded papers.",
    "The court is asked to record outstanding File-named source material and set a disclosure timetable.",
  ];
}

function fileBackedDoNotOverstate(): string[] {
  return [
    "Do not import another offence-family template unless the papers support it.",
    "Do not treat unserved source material as proved.",
    "Do not chase served material as if it were outstanding.",
    "Solicitor review is required before fixing hearing position.",
  ];
}

function resolveReadinessLabel(input: BuildHearingWarRoomBriefInput): string {
  if (input.readiness?.trim()) return input.readiness;
  if (!input.hasSavedPosition) {
    return input.pilotDemoReadOnly && isCriminalPilotMode()
      ? "Conditional — confirm instructions"
      : "Conditional — record position before hearing";
  }
  if (input.chaseItems.length >= 2) return "Conditional — disclosure chase outstanding";
  if (input.battleboard?.overall_status === "thin_bundle") return "Thin bundle — provisional routes only";
  if (input.battleboard?.primary_route) return "Routes on file — solicitor review before court";
  return "Review — standard caution";
}

export function buildChaseItemsForHearing(input: {
  snapshotMissing?: { label: string; status: string }[];
  proceduralOutstanding?: string[];
  battleboard?: BattleboardOutput | null;
  bundleText?: string | null;
  /** When set (including empty), Court Today uses this File/PDF shortlist instead of snapshot family templates. */
  fileBackedShortlist?: string[] | null;
}): string[] {
  if (Array.isArray(input.fileBackedShortlist)) {
    return courtShortlistLabelsFromChaseItems(input.fileBackedShortlist, input.bundleText);
  }
  return collectChaseItems(input).filter(
    (line) => !lineIsUnbackedOffenceFamilyFurniture(line, input.bundleText),
  );
}

function lineBlockedByLedger(raw: string, ledger: BundleTruthLedger, bundleText?: string | null): boolean {
  if (isBlockedBattleboardTemplateLine(raw, ledger, bundleText)) return true;
  if (textViolatesForbiddenClaims(raw, ledger)) return true;
  const lower = raw.toLowerCase();
  if (ledger.forbiddenClaims.some((f) => f.id.startsWith("forbid-cctv")) && /cctv may confirm|served cctv may confirm/i.test(lower)) {
    return true;
  }
  if (ledger.forbiddenClaims.some((f) => f.id.startsWith("forbid-medical")) && /medical.*(?:proves|consistent|final)/i.test(lower)) {
    return true;
  }
  if (ledger.forbiddenClaims.some((f) => f.id.startsWith("forbid-witness") || f.id.startsWith("forbid-mg11")) && /mg11.*(?:served|consistent|final)/i.test(lower)) {
    return true;
  }
  return false;
}

function applyLedgerForbiddenGuards(
  brief: HearingWarRoomBrief,
  ledger: BundleTruthLedger | null,
  bundleText?: string | null,
): HearingWarRoomBrief {
  if (!ledger) return brief;

  const guardLines = (lines: string[], max: number) =>
    uniqueLines(
      lines
        .map((raw) => {
          if (lineBlockedByLedger(raw, ledger, bundleText)) return null;
          const cleaned = sanitizeTextAgainstForbiddenClaims(raw, ledger);
          return sanitizeLine(cleaned);
        })
        .filter((l): l is string => Boolean(l)),
      max,
    );

  const forbiddenDoNot = ledger.forbiddenClaims
    .map((fc) => `Do not state "${fc.phrase}" — ${fc.reason}`)
    .filter((line) => !lineIsUnbackedOffenceFamilyFurniture(line, bundleText));

  const safePosition = guardLines([brief.safePositionToday], 1)[0] ?? brief.safePositionToday;

  return {
    ...brief,
    safePositionToday: safePosition,
    sayThis: guardLines(brief.sayThis, brief.sayThis.length),
    doNotOverstate: uniqueLines(
      [...guardSolicitorLines(brief.doNotOverstate, { ledger, bundleText }, 6), ...forbiddenDoNot],
      8,
    ),
    askCourtToRecord: guardSolicitorLines(
      brief.askCourtToRecord,
      { ledger, bundleText },
      brief.askCourtToRecord.length,
    ),
    nextHearingMoves: guardLines(brief.nextHearingMoves, brief.nextHearingMoves.length),
    collapseRisks: guardLines(brief.collapseRisks, brief.collapseRisks.length),
    evidenceAnchors: guardSolicitorLines(brief.evidenceAnchors, { ledger, bundleText }, brief.evidenceAnchors.length),
    bundleContradictions: brief.bundleContradictions?.map((c) => ({
      ...c,
      theoryLine: guardLines([c.theoryLine], 1)[0] ?? c.theoryLine,
      riskLine: guardLines([c.riskLine], 1)[0] ?? c.riskLine,
      opportunityLine: guardLines([c.opportunityLine], 1)[0] ?? c.opportunityLine,
    })),
  };
}

function enrichBriefWithClientSafe(
  brief: HearingWarRoomBrief,
  hasOutstandingDisclosure: boolean,
  ledger: BundleTruthLedger | null,
): HearingWarRoomBrief {
  if (!isBundleClientSafeSurfacingEnabled()) return brief;
  const contradictionActions = buildContradictionActions(brief.bundleContradictions);
  const clientExplanation = buildClientSafeExplanation({
    clientLabel: brief.clientLabel,
    allegation: brief.allegation,
    contradictions: brief.bundleContradictions,
    contradictionActionLines: contradictionActions.map((a) => a.clientSafeLine),
    hasOutstandingDisclosure,
    fallback: brief.draftWording.clientExplanation,
  });
  return {
    ...brief,
    draftWording: { ...brief.draftWording, clientExplanation },
  };
}

function enrichBriefWithContradictions(
  brief: HearingWarRoomBrief,
  bundleText?: string | null,
): HearingWarRoomBrief {
  if (
    !isBundleContradictionSurfacingEnabled() &&
    !isBundleSequenceSurfacingEnabled() &&
    !isBundleScopeSurfacingEnabled() &&
    !isBundleStrengthSurfacingEnabled() &&
    !isBundleMultiIncidentSurfacingEnabled() &&
    !isBundleTriangulationSurfacingEnabled()
  ) {
    return brief;
  }

  const contradictions = extractAllBundleContradictions(bundleText);
  if (contradictions.length === 0) return brief;

  // Keep extracted contradictions for more-detail / client-safe, but do not
  // prepend offence-family playbook chase/ask furniture onto Court Today.
  return {
    ...brief,
    bundleContradictions: contradictions,
  };
}

export function buildHearingWarRoomBrief(input: BuildHearingWarRoomBriefInput): HearingWarRoomBrief {
  const ledger = input.bundleText?.trim()
    ? buildBundleTruthLedger({ bundleText: input.bundleText })
    : null;

  const bb = input.battleboard;
  const route = bb?.primary_route;
  const workflowContext = {
    caseTitle: input.caseTitle,
    allegation: input.allegation,
    routeTitle: route?.title,
    bundleText: input.bundleText,
    clientLabel: input.clientLabel,
    profileHint: input.profileHint,
    ledger,
  };
  const profile = resolveWorkflowProfile(workflowContext);
  const fileShortlist = courtShortlistLabelsFromChaseItems(input.chaseItems, input.bundleText);
  const hasChase = fileShortlist.length > 0;

  const labelled = smokePackSolicitorFurniture(input.bundleText ?? "");
  const safePositionToday = composeFileBackedCourtSafeLine({
    labelledCourtLine: labelled?.courtLine,
    shortlist: fileShortlist,
  });

  const sayThis = uniqueLines(
    labelled
      ? [labelled.caseWideLine, "Keep the position provisional and tied to the uploaded papers."]
      : fileBackedSayThis(hasChase),
    6,
  );

  const hurts = route?.what_hurts_us ?? [];
  const collapseRaw = [
    ...(route?.collapse_risks ?? []),
    ...(bb?.global_collapse_risks ?? []),
    ...(input.defencePlan?.risks_if_we_fight ?? []),
    ...(input.defencePlan?.kill_switches?.map((k) => k.if) ?? []),
    ...hurts,
  ];
  const findingLines = (input.canonicalFindings ?? [])
    .filter((f) => f.unresolved || f.severity === "critical")
    .map((f) => `${f.title}: ${f.summary}`);

  const doNotOverstate = uniqueLines(
    labelled
      ? [
          "Do not import another offence-family template unless the papers support it.",
          "Do not treat unserved source material as proved.",
          "Solicitor review is required before fixing hearing position.",
        ]
      : [...fileBackedDoNotOverstate(), ...findingLines].filter(
          (line) => !lineIsUnbackedOffenceFamilyFurniture(line, input.bundleText),
        ),
    8,
  );

  const collapseRisks = uniqueLines(
    [
      ...(profile !== "generic"
        ? filterWorkflowPilotLines(collapseRaw, workflowContext, { max: 5, useFallbacks: false }).map((l) =>
            softenPilotRiskWording(l),
          )
        : collapseRaw.map((l) => (isCriminalPilotMode() ? softenPilotRiskWording(l) : l))),
      ...findingLines,
    ].filter((line) => !lineIsUnbackedOffenceFamilyFurniture(line, input.bundleText)),
    8,
  );

  const askCourtToRecord = dedupePilotCourtRecordLines(
    labelled?.courtRecordAsks.length
      ? labelled.courtRecordAsks
      : uniqueLines(
          fileShortlist.map(toCourtRecordAsk).filter(Boolean),
          8,
        ),
  );

  const rawPositionNotice = bb?.position_notice?.trim() ?? "";
  const positionNoticeForInstructions =
    isCriminalPilotMode() && bb?.position_notice?.includes("not safely recorded")
      ? ""
      : isCriminalPilotMode() && rawPositionNotice
        ? (sanitizePilotVisibleLine(rawPositionNotice, workflowContext) ?? "")
        : rawPositionNotice;

  const positionStatusDisplay = isCriminalPilotMode()
    ? pilotPositionDisplayLabel(input.positionStatus, workflowContext)
    : input.positionStatus;

  const instructionsNeeded = uniqueLines(
    [
      !input.hasSavedPosition
        ? input.pilotDemoReadOnly && isCriminalPilotMode()
          ? "Confirm client instructions before fixing a hearing line."
          : "Record defence position on file before fixing a hearing line."
        : "",
      positionNoticeForInstructions,
      route?.route_type === "interview"
        ? "Take instructions on interview account — check conflict with served MG5/MG6."
        : "",
      "Take instructions on timing/sequence — do not fix facts without source material.",
      "Check whether client account conflicts with served evidence before advancing a positive case.",
      "Confirm whether any positive defence can safely be advanced today.",
      labelled?.mainIssue
        ? `Main issue to check: ${labelled.mainIssue}`
        : hasChase
          ? `Main issue to check: ${fileShortlist[0]}`
          : "Main issue to check: served papers and solicitor instructions.",
      ...(input.defencePlan?.next_72_hours ?? []).filter((n) =>
        /instruction|position|interview|client/i.test(n),
      ),
    ],
    6,
  );

  const fileBackedMoves = hasChase
    ? [
        ...fileShortlist.slice(0, 3).map((label) => `Chase: ${label}.`),
        "Ask court to record outstanding source material on the order.",
        "Seek timetable / review date — avoid open-ended adjournment without dates.",
      ]
    : [
        "Keep the hearing line provisional pending served papers.",
        "Seek timetable / review date — avoid open-ended adjournment without dates.",
      ];
  const nextHearingMoves = uniqueLines(
    labelled?.nextActions?.length
      ? [
          ...labelled.nextActions,
          "Ask court to record outstanding source material on the order.",
          "Seek timetable / review date — avoid open-ended adjournment without dates.",
        ]
      : fileBackedMoves,
    5,
  );

  const evidenceAnchorRaw = uniqueLines(
    [
      ...(route?.evidence_anchors ?? []),
      ...(bb?.routes ?? []).flatMap((r) => r.evidence_anchors ?? []).slice(0, 6),
      ...(input.canonicalFindings ?? [])
        .map((f) => f.provenanceLine)
        .filter((l) => Boolean(l?.trim())),
    ],
    12,
  );
  const evidenceAnchors = isCriminalPilotMode()
    ? sanitizePilotEvidenceAnchors(evidenceAnchorRaw, workflowContext).slice(0, 8)
    : uniqueLines(
        filterWorkflowPilotLines(evidenceAnchorRaw, workflowContext, { max: 8, useFallbacks: false }),
        8,
      );

  const chaseSnippet = hasChase
    ? fileShortlist.slice(0, 4).join("; ")
    : labelled?.disclosureLabels?.slice(0, 3).join("; ") || "outstanding source material on the current papers";

  const draftWording = {
    disclosureTimetable: `The defence asks the court to record that ${chaseSnippet} ${hasChase && fileShortlist.length === 1 ? "remains" : "remain"} outstanding on the current papers. The defence invites the court to order disclosure of that material by [date] with a review hearing on [date]. Position remains provisional pending service and instructions.`,
    adjournment: `The defence position remains provisional pending served source material and instructions. The defence asks the court to adjourn to [date] for disclosure compliance and a further case management hearing — not for final trial strategy to be fixed today.`,
    clientExplanation: `Your position with the court today is conditional: we will ask the court to record what material is still outstanding and for a timetable. We are not saying the case is won or lost — we need the served material and your instructions before anything firm is advanced.`,
  };

  const brief: HearingWarRoomBrief = {
    caseId: input.caseId,
    caseTitle: input.caseTitle,
    clientLabel: input.clientLabel,
    allegation: input.allegation,
    stage: input.stage,
    hearingStatus: input.hearingStatus,
    bundleHealth: input.bundleHealth,
    positionStatus: positionStatusDisplay,
    readiness: resolveReadinessLabel(input),
    safePositionToday,
    sayThis,
    doNotOverstate,
    askCourtToRecord,
    instructionsNeeded,
    nextHearingMoves,
    evidenceAnchors,
    collapseRisks,
    draftWording,
  };

  if (!isCriminalPilotMode()) {
    const enriched = enrichBriefWithContradictions(brief, input.bundleText);
    return guardHearingWarRoomBrief(applyLedgerForbiddenGuards(
      enrichBriefWithClientSafe(enriched, input.chaseItems.length > 0, ledger),
      ledger,
      input.bundleText,
    ), { ledger, bundleText: input.bundleText });
  }

  return guardHearingWarRoomBrief(applyLedgerForbiddenGuards(
    enrichBriefWithClientSafe(
      enrichBriefWithContradictions(
        {
          ...brief,
          safePositionToday: pilotCleanupVisibleText(brief.safePositionToday),
          sayThis: pilotFinalizeBriefLines(brief.sayThis),
          doNotOverstate: pilotFinalizeBriefLines(brief.doNotOverstate),
          askCourtToRecord: pilotFinalizeBriefLines(brief.askCourtToRecord),
          instructionsNeeded: pilotFinalizeBriefLines(brief.instructionsNeeded),
          nextHearingMoves: pilotFinalizeBriefLines(brief.nextHearingMoves),
          collapseRisks: pilotFinalizeBriefLines(brief.collapseRisks),
          draftWording: {
            disclosureTimetable: pilotCleanupVisibleText(brief.draftWording.disclosureTimetable),
            adjournment: pilotCleanupVisibleText(brief.draftWording.adjournment),
            clientExplanation: pilotCleanupVisibleText(brief.draftWording.clientExplanation),
          },
        },
        input.bundleText,
      ),
      input.chaseItems.length > 0,
      ledger,
    ),
    ledger,
    input.bundleText,
  ), { ledger, bundleText: input.bundleText });
}
