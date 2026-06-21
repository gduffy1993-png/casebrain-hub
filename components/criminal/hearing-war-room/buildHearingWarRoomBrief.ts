import { collectChaseItems } from "@/components/criminal/control-room/chaseItems";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import type { WorkflowProfile } from "@/lib/criminal/pilot-workflow";
import {
  filterWorkflowItems,
  filterWorkflowPilotLines,
  prioritizeWorkflowItems,
  resolveWorkflowProfile,
  softenPilotRiskWording,
  workflowDraftDisclosureSnippet,
  workflowProfileAskCourtOnly,
  workflowSafeCourtLine,
  workflowTopNextActions,
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
  /** Non-admin pilot demo: softer instruction copy (no “record position” CTA). */
  pilotDemoReadOnly?: boolean;
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

function toCourtRecordAsk(item: string): string {
  const t = formatDisplayLabelCasing(item.trim());
  if (!t) return "";
  if (/^ask the court/i.test(t)) return formatDisplayLabelCasing(t);
  const label = t.replace(/^chase[:\s]*/i, "").replace(/^outstanding[:\s]*/i, "");
  return formatDisplayLabelCasing(
    `${COURT_RECORD_PREFIX} that ${label.charAt(0).toLowerCase()}${label.slice(1)} remains outstanding and should be disclosed on a timetable.`,
  );
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

function defaultSayThis(hasChase: boolean, profile: WorkflowProfile): string[] {
  if (profile === "fraud_account_control") {
    return [
      "The defence position remains provisional pending served bank/account material and solicitor instructions.",
      "The court is asked to record outstanding source material and set a disclosure timetable.",
    ];
  }
  if (profile === "pwits_phone_attribution") {
    return [
      "The defence position remains provisional pending served phone/search material and solicitor instructions.",
      "The court is asked to record outstanding source material and set a disclosure timetable.",
    ];
  }
  const base = [
    "The defence position remains provisional pending served source material and solicitor instructions.",
    "The court is asked to record outstanding source material and set a disclosure timetable.",
  ];
  if (hasChase && profile === "robbery_identification") {
    base.push(
      "Identification and timing remain conditional until served CCTV, ID procedure and complainant account material are reviewed.",
    );
  } else if (hasChase && profile === "generic") {
    base.push(
      "Timing and sequence remain conditional until served source material and continuity records are reviewed.",
    );
  }
  return base;
}

function defaultDoNotOverstate(profile: WorkflowProfile): string[] {
  if (profile === "fraud_account_control") {
    return [
      "Assumed position may conflict with interview or served account records.",
      "Served bank/device material may support the Crown account once disclosed.",
      "Do not commit to final trial strategy until served material and instructions are reviewed.",
    ];
  }
  if (profile === "pwits_phone_attribution") {
    return [
      "Assumed position may conflict with interview or served phone/search material.",
      "Served extraction/attribution material may support Crown possession case once disclosed.",
      "Do not commit to final trial strategy until served material and instructions are reviewed.",
    ];
  }
  if (profile === "robbery_identification") {
    return [
      "Assumed position may conflict with interview or served CCTV/ID material.",
      "Served CCTV may support Crown identification account if served and consistent.",
      "CAD/999 timing may affect sequence if served and reconciled.",
      "Do not commit to final trial strategy until served material and instructions are reviewed.",
    ];
  }
  return [
    "Assumed position may conflict with interview or served evidence.",
    "Identification remains conditional on served CCTV once disclosed and reviewed.",
    "Timing sequence remains conditional on served CAD/999 material once disclosed.",
    "Do not commit to final trial strategy until served material and instructions are reviewed.",
  ];
}

/** Strip repeated section prefixes; keep plain risk lines or short imperatives. */
function cleanDoNotBullet(raw: string): string | null {
  let s = sanitizeLine(raw);
  if (!s) return null;
  s = s
    .replace(/^do not overstate:\s*/i, "")
    .replace(/^do not assume:\s*/i, "")
    .replace(/^safety note on file:\s*/i, "")
    .trim();
  if (!s || FORBIDDEN_RE.test(s)) return null;
  if (/^do not /i.test(s)) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isCourtSayable(line: string): boolean {
  const l = line.toLowerCase();
  if (FORBIDDEN_RE.test(line)) return false;
  if (/\b(chase|upload|record position|next 72|commit strategy|mg6 chase)\b/i.test(l)) return false;
  return /\b(provisional|court|record|conditional|position|material|defence asks|timing)\b/i.test(l);
}

function resolveSafePosition(battleboard: BattleboardOutput | null): string {
  const fromRoute = battleboard?.primary_route?.hearing_line?.trim();
  if (fromRoute && !FORBIDDEN_RE.test(fromRoute)) return fromRoute;
  const summary = battleboard?.solicitor_safe_summary?.trim();
  if (summary && !FORBIDDEN_RE.test(summary)) {
    return summary.slice(0, 600);
  }
  return "Timing/sequence remains conditional on served CCTV/CAD/999 material. The defence asks the court to record outstanding source material and set a timetable — position remains provisional pending instructions.";
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
}): string[] {
  return collectChaseItems(input);
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

  const forbiddenDoNot = ledger.forbiddenClaims.map(
    (fc) => `Do not state "${fc.phrase}" — ${fc.reason}`,
  );

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

function enrichBriefWithContradictions(
  brief: HearingWarRoomBrief,
  bundleText?: string | null,
): HearingWarRoomBrief {
  if (
    !isBundleContradictionSurfacingEnabled() &&
    !isBundleSequenceSurfacingEnabled() &&
    !isBundleScopeSurfacingEnabled() &&
    !isBundleStrengthSurfacingEnabled() &&
    !isBundleMultiIncidentSurfacingEnabled()
  ) {
    return brief;
  }

  const contradictions = extractAllBundleContradictions(bundleText);
  if (contradictions.length === 0) return brief;

  return {
    ...brief,
    bundleContradictions: contradictions,
    collapseRisks: uniqueLines(
      [...contradictions.map((c) => c.riskLine), ...brief.collapseRisks],
      Math.max(brief.collapseRisks.length + contradictions.length, 8),
    ),
    nextHearingMoves: uniqueLines(
      [...contradictions.map((c) => c.opportunityLine), ...brief.nextHearingMoves],
      Math.max(brief.nextHearingMoves.length + contradictions.length, 8),
    ),
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
  };
  const profile = resolveWorkflowProfile(workflowContext);
  const profileAsks = workflowProfileAskCourtOnly(workflowContext);
  const prioritizedChase = prioritizeWorkflowItems(
    filterWorkflowItems(input.chaseItems, workflowContext),
    workflowContext,
  );
  const hasChase = prioritizedChase.length > 0;

  const safePositionToday = workflowSafeCourtLine(workflowContext) ?? resolveSafePosition(bb);

  const sayFromRoute =
    profile === "generic" && route?.hearing_line
      ? splitSentences(route.hearing_line).filter(isCourtSayable).slice(0, 2)
      : [];
  const sayThis = uniqueLines([...sayFromRoute, ...defaultSayThis(hasChase, profile)], 5);

  const hurts = route?.what_hurts_us ?? [];
  const collapseRaw = [
    ...(route?.collapse_risks ?? []),
    ...(bb?.global_collapse_risks ?? []),
    ...(input.defencePlan?.risks_if_we_fight ?? []),
    ...(input.defencePlan?.kill_switches?.map((k) => k.if) ?? []),
    ...hurts,
  ];
  const collapse =
    profile !== "generic"
      ? filterWorkflowPilotLines(collapseRaw, workflowContext, { max: 5 })
      : collapseRaw;
  const doNotRaw =
    profile !== "generic"
      ? filterWorkflowPilotLines(
          [
            ...collapse.map((r) => cleanDoNotBullet(r) ?? "").filter(Boolean),
            ...defaultDoNotOverstate(profile),
          ],
          workflowContext,
          { max: 6, useFallbacks: false },
        )
      : [...collapse.map((r) => cleanDoNotBullet(r) ?? "").filter(Boolean), ...defaultDoNotOverstate(profile)];
  const doNotOverstate = uniqueLines(
    doNotRaw.map((l) => (isCriminalPilotMode() ? softenPilotRiskWording(l) : l)),
    5,
  );

  const collapseRisks =
    profile !== "generic"
      ? uniqueLines(
          filterWorkflowPilotLines(collapseRaw, workflowContext, { max: 5, useFallbacks: false }).map(
            (l) => softenPilotRiskWording(l),
          ),
          5,
        )
      : uniqueLines(
          collapseRaw.map((l) => (isCriminalPilotMode() ? softenPilotRiskWording(l) : l)),
          8,
        );

  const askCourtToRecord =
    profile !== "generic" && profileAsks?.length
      ? uniqueLines(profileAsks, 5)
      : uniqueLines(
          [
            ...prioritizedChase.map(toCourtRecordAsk).filter(Boolean),
            ...(input.proceduralOutstanding ?? [])
              .filter((p) => /\b(cctv|cad|999|mg6|disclosure|continuity|bwv|interview)\b/i.test(p))
              .map(toCourtRecordAsk),
          ],
          8,
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
      ...(input.defencePlan?.next_72_hours ?? []).filter((n) =>
        /instruction|position|interview|client/i.test(n),
      ),
    ],
    6,
  );

  const pilotMoves = workflowTopNextActions(workflowContext);
  const nextHearingMoves = uniqueLines(
    pilotMoves?.length
      ? [
          ...pilotMoves,
          "Ask court to record outstanding source material on the order.",
          "Seek timetable / review date — avoid open-ended adjournment without dates.",
        ]
      : [
          "Record position (provisional, source-linked).",
          "Chase outstanding disclosure / source material.",
          "Ask court to record outstanding source material on the order.",
          "Seek timetable / review date — avoid open-ended adjournment without dates.",
          "Avoid committing to final trial strategy until served material is reviewed.",
        ],
    5,
  );

  const evidenceAnchorRaw = uniqueLines(
    [
      ...(route?.evidence_anchors ?? []),
      ...(bb?.routes ?? []).flatMap((r) => r.evidence_anchors ?? []).slice(0, 6),
    ],
    12,
  );
  const evidenceAnchors = isCriminalPilotMode()
    ? sanitizePilotEvidenceAnchors(evidenceAnchorRaw, workflowContext).slice(0, 8)
    : uniqueLines(
        filterWorkflowPilotLines(evidenceAnchorRaw, workflowContext, { max: 8, useFallbacks: false }),
        8,
      );

  const chaseSnippet =
    profile !== "generic"
      ? workflowDraftDisclosureSnippet(workflowContext, 3)
      : input.chaseItems.slice(0, 4).join("; ") || "outstanding source material on file";

  const draftWording = {
    disclosureTimetable:
      profile !== "generic"
        ? `The defence asks the court to record that ${chaseSnippet} remain outstanding on the current papers. The defence invites the court to order disclosure of that material by [date] with a review hearing on [date]. Position remains provisional pending service and instructions.`
        : `The defence asks the court to record that ${chaseSnippet} remains outstanding. The defence invites the court to order disclosure of that material by [date] with a review hearing on [date]. Position remains provisional pending service and instructions.`,
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
    return applyLedgerForbiddenGuards(enrichBriefWithContradictions(brief, input.bundleText), ledger, input.bundleText);
  }

  return applyLedgerForbiddenGuards(
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
    ledger,
    input.bundleText,
  );
}
