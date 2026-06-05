import fs from "node:fs";
import path from "node:path";
import { buildDisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import { buildHearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { buildCourtCaseBrief } from "@/components/criminal/court-today/courtCaseBrief";
import { buildCourtTodayBuckets } from "@/components/criminal/court-today/courtTodayDiary";
import type { CourtCasesApiRow } from "@/components/criminal/court-today/types";
import { buildCaseWorkflowTabHref } from "@/components/criminal/criminalCaseNavigation";
import type { BattleboardOutput, BattleboardRoute } from "@/lib/criminal/strategy-battleboard";
import {
  filterBattleboardForWorkflowPilot,
  filterWorkflowPilotLines,
  pilotCourtChaseLabels,
  pilotRouteStatusBadgeLabel,
  showPilotRouteDetailPanel,
  workflowDisclosureCaseWideLine,
  workflowHeaderOverrides,
  workflowPrimaryRouteTitle,
  workflowSafeCourtLine,
  workflowTopNextActions,
} from "@/lib/criminal/pilot-workflow";
import {
  formatPilotCourtTodayHeader,
  isCriminalPilotMode,
  isPilotDemoAllowlistMatter,
  isPilotDemoChaseActionsDisabled,
  isPilotDemoUploadDisabled,
  PILOT_COURT_TODAY_ANCHOR,
} from "@/lib/pilot-mode";
import {
  flattenReasoningV2ProbeForAudit,
  probeReasoningV2Surface,
} from "./reasoning-v2-auditor-probe";
import type {
  AuditorScreen,
  CaseTruthManifest,
  CollectionStatus,
  ScreenCollection,
  SurfaceSource,
  UserRoleMode,
} from "./types";

function flatten(value: unknown, depth = 0): string {
  if (depth > 8 || value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => flatten(v, depth + 1)).join("\n");
  return Object.values(value as Record<string, unknown>)
    .map((v) => flatten(v, depth + 1))
    .join("\n");
}

function workflowContext(manifest: CaseTruthManifest) {
  return {
    caseTitle: manifest.caseTitle,
    clientLabel: manifest.expectedDefendant,
    allegation: manifest.expectedAllegation,
    profileHint: manifest.profile,
  };
}

/** Stress pollution exercised through real pilot filters (live-builder). */
export function buildStressBattleboard(manifest: CaseTruthManifest): BattleboardOutput {
  const route: BattleboardRoute = {
    id: `${manifest.caseId}_primary`,
    route_type: "intent",
    title: manifest.expectedRouteTitle,
    status: "conditional",
    why_it_helps: [
      "Full CCTV confirms Crown timing..",
      "Phone or witness material may undermine participation/attribution dispute if consistent.",
      "Missing expert/source report comes back against defence.",
    ],
    what_hurts_us: ["Interview admission narrows the defence route."],
    evidence_anchors: [
      "6MG6 disclosure schedule21Search BWV and full phone extraction",
      "5Device login attribution note19Summary only",
      "Count 2: Possession of criminal property is noted as under review pending final count sheet.",
      "with a second male. The CCTV footage itself is not included in full. The stills are described as poor lighting and",
    ],
    collapse_risks: [
      "CAD/999 timing supports Crown sequence.",
      "Outstanding expert/source material may return against the defence route if served.",
    ],
    next_moves: ["Record position before hearing."],
    hearing_line:
      manifest.profile === "pwits_phone_attribution"
        ? "Possession, knowledge, intent to supply and phone attribution remain conditional on full phone, search, continuity and forensic material."
        : manifest.profile === "robbery_identification"
          ? "Identification, participation and attribution remain conditional on full CCTV, ID procedure material, phone evidence and witness source material."
          : "Account-control issues remain conditional on served bank/device material / against extract.",
    safety_note: "Provisional — solicitor review required.",
  };

  return {
    case_id: manifest.caseId,
    generated_at: new Date().toISOString(),
    overall_status: "needs_review",
    solicitor_safe_summary: route.hearing_line,
    position_notice:
      "Defence position not safely recorded yet — position is provisional; take/record instructions before relying on it.",
    primary_route: route,
    routes: [route],
    global_collapse_risks: route.collapse_risks ?? [],
    urgent_next_moves: route.next_moves ?? [],
  };
}

function hearingIso(manifest: CaseTruthManifest): string {
  const [hh, mm] = manifest.expectedHearingTime.split(":");
  return `${manifest.expectedHearingDate}T${hh!.padStart(2, "0")}:${mm ?? "00"}:00`;
}

function toApiRow(manifest: CaseTruthManifest): CourtCasesApiRow {
  return {
    id: manifest.caseId,
    title: manifest.caseTitle,
    updated_at: new Date().toISOString(),
    next_hearing_date: hearingIso(manifest),
    next_hearing_type: "PTPH",
    offence_label: manifest.expectedAllegation,
    strategy_recorded: false,
    strategy_preview: null,
    disclosure_outstanding: 8,
  };
}

function screen(
  name: AuditorScreen,
  payload: Record<string, unknown>,
  collectionStatus: CollectionStatus,
  surfaceSource: SurfaceSource,
  missing?: string[],
): ScreenCollection {
  return {
    screen: name,
    collectionStatus,
    surfaceSource,
    payload,
    allText: flatten(payload),
    missingSections: missing,
  };
}

export function collectCaseSurfaces(
  manifest: CaseTruthManifest,
  opts: { userRole: UserRoleMode; pilotUserId: string },
): ScreenCollection[] {
  const ctx = workflowContext(manifest);
  const filteredBb = filterBattleboardForWorkflowPilot(buildStressBattleboard(manifest), ctx);
  const header = workflowHeaderOverrides(manifest.caseTitle);
  const apiRow = toApiRow(manifest);
  const pilotReadOnly = opts.userRole === "pilot-non-admin";
  const bucketNow = pilotReadOnly ? PILOT_COURT_TODAY_ANCHOR : undefined;
  const screens: ScreenCollection[] = [];

  try {
    const courtBrief = buildCourtCaseBrief(
      apiRow,
      { battleboard: filteredBb ?? undefined },
      { bucketNow },
    );
    screens.push(
      screen(
        "court_today",
        {
          hearingBucket: courtBrief.hearingBucket,
          courtLabel: courtBrief.courtLabel,
          chaseItems: courtBrief.chaseItems,
        },
        "collected",
        "live-builder",
      ),
    );
  } catch (e) {
    screens.push(screen("court_today", { error: String(e) }, "missing", "live-builder", ["court_today"]));
  }

  try {
    const primaryRoute = workflowPrimaryRouteTitle(ctx);
    const nextActions = workflowTopNextActions(ctx) ?? [];
    const reasoningV2Probe = probeReasoningV2Surface(manifest);
    screens.push(
      screen(
        "control_room",
        {
          displayTitle: header?.displayTitle,
          allegation: header?.allegation,
          primaryRoute,
          safeCourtLine: workflowSafeCourtLine(ctx),
          disclosureCaseWide: workflowDisclosureCaseWideLine(ctx),
          routeStatusBadge: pilotRouteStatusBadgeLabel(filteredBb?.primary_route?.status ?? "conditional"),
          prosecutionWeakness: filterWorkflowPilotLines(filteredBb?.primary_route?.why_it_helps ?? [], ctx, {
            max: 4,
          }),
          defenceRisks: filterWorkflowPilotLines(
            [
              ...(filteredBb?.primary_route?.collapse_risks ?? []),
              ...(filteredBb?.global_collapse_risks ?? []),
            ],
            ctx,
            { max: 4 },
          ),
          nextActions: nextActions.slice(0, 3),
          reasoningV2Panel: reasoningV2Probe,
          reasoningV2PanelText: flattenReasoningV2ProbeForAudit(reasoningV2Probe),
        },
        primaryRoute ? "collected" : "partial",
        "live-builder",
        primaryRoute ? undefined : ["primaryRoute"],
      ),
    );
  } catch (e) {
    screens.push(screen("control_room", { error: String(e) }, "missing", "live-builder", ["control_room"]));
  }

  try {
    const hwr = buildHearingWarRoomBrief({
      caseId: apiRow.id,
      caseTitle: header?.displayTitle ?? manifest.caseTitle,
      clientLabel: manifest.expectedDefendant,
      allegation: manifest.expectedAllegation,
      stage: "PTPH",
      hearingStatus: "Listed",
      bundleHealth: "Partial — provisional",
      positionStatus: "CaseBrain position: not recorded",
      readiness: "",
      battleboard: filteredBb,
      hasSavedPosition: false,
      chaseItems: pilotCourtChaseLabels(ctx),
      profileHint: manifest.profile,
      pilotDemoReadOnly: pilotReadOnly,
    });
    screens.push(
      screen(
        "hearing_war_room",
        {
          safePositionToday: hwr.safePositionToday,
          sayThis: hwr.sayThis,
          doNotOverstate: hwr.doNotOverstate,
          askCourtToRecord: hwr.askCourtToRecord,
          instructionsNeeded: hwr.instructionsNeeded,
          nextHearingMoves: hwr.nextHearingMoves,
          evidenceAnchors: hwr.evidenceAnchors,
          collapseRisks: hwr.collapseRisks,
          draftWording: hwr.draftWording,
        },
        "collected",
        "live-builder",
      ),
    );
  } catch (e) {
    screens.push(screen("hearing_war_room", { error: String(e) }, "missing", "live-builder", ["hearing_war_room"]));
  }

  try {
    const disclosure = buildDisclosureChaseBrief({
      caseId: apiRow.id,
      caseTitle: manifest.caseTitle,
      clientLabel: manifest.expectedDefendant,
      allegation: manifest.expectedAllegation,
      stage: "PTPH",
      hearingStatus: "Listed",
      hearingDateIso: hearingIso(manifest),
      bundleHealth: "Partial",
      positionStatus: "Not recorded",
      battleboard: filteredBb,
      snapshotMissing: [],
      proceduralOutstanding: [],
      bundleText: null,
      profileHint: manifest.profile,
    });
    screens.push(
      screen(
        "disclosure_chase",
        {
          safeCourtLine: disclosure.safeCourtLine,
          primaryLabels: disclosure.primaryItems.map((i) => i.label),
          primaryCount: disclosure.primaryItems.length,
        },
        disclosure.primaryItems.length > 0 ? "collected" : "partial",
        "live-builder",
        disclosure.primaryItems.length > 0 ? undefined : ["primaryItems"],
      ),
    );
  } catch (e) {
    screens.push(screen("disclosure_chase", { error: String(e) }, "missing", "live-builder", ["disclosure_chase"]));
  }

  const docHref = buildCaseWorkflowTabHref(apiRow.id, "documents");
  const docsPanelPath = path.join(process.cwd(), "components/criminal/workflow/PilotCaseDocumentsPanel.tsx");
  const caseFilesPath = path.join(process.cwd(), "components/cases/CaseFilesList.tsx");
  const navPath = path.join(process.cwd(), "components/criminal/criminalCaseNavigation.ts");
  const docsPanelSrc = fs.existsSync(docsPanelPath) ? fs.readFileSync(docsPanelPath, "utf8") : "";
  const caseFilesSrc = fs.existsSync(caseFilesPath) ? fs.readFileSync(caseFilesPath, "utf8") : "";
  const navSrc = fs.existsSync(navPath) ? fs.readFileSync(navPath, "utf8") : "";

  screens.push(
    screen(
      "documents",
      {
        documentsTabHref: docHref,
        documentCount: manifest.expectedDocumentCount,
        hasViewContract:
          docsPanelSrc.includes('data-testid="pilot-documents-panel"') &&
          docsPanelSrc.includes("CaseFilesList") &&
          (caseFilesSrc.includes("View") || docsPanelSrc.includes("View")),
        usesTabDocuments: navSrc.includes("tab=documents"),
        hashOnlyNav: navSrc.includes("#case-files"),
      },
      "collected",
      "live-builder",
    ),
  );

  return screens;
}

export function collectPilotUiSurface(pilotUserId: string, userRole: UserRoleMode): ScreenCollection {
  const pilotModeActive = isCriminalPilotMode();
  return screen(
    "pilot_ui",
    {
      pilotModeActive,
      uploadDisabled: isPilotDemoUploadDisabled(pilotUserId),
      chaseActionsHidden: isPilotDemoChaseActionsDisabled(pilotUserId),
      routeDetailHidden: !showPilotRouteDetailPanel(),
      note: pilotModeActive
        ? "Pilot flags from lib/pilot-mode (NEXT_PUBLIC_CRIMINAL_PILOT_MODE set in shell)."
        : "Set NEXT_PUBLIC_CRIMINAL_PILOT_MODE=true in shell for live pilot flag checks.",
    },
    pilotModeActive ? "collected" : "partial",
    pilotModeActive ? "live-builder" : "synthetic",
    pilotModeActive ? undefined : ["pilotModeEnv"],
  );
}

export function collectAggregateCourtToday(
  manifests: CaseTruthManifest[],
  userRole: UserRoleMode,
): ScreenCollection {
  const rows = manifests.map((m) => ({
    ...toApiRow(m),
    defendant_name: m.expectedDefendant,
    alleged_offence: m.expectedAllegation,
    summary: "Bundle-derived pilot matter.",
    practice_area: "criminal",
  }));

  const filtered = rows.filter((r) => isPilotDemoAllowlistMatter(r.title));
  const bucketNow = userRole === "pilot-non-admin" ? PILOT_COURT_TODAY_ANCHOR : undefined;
  const buckets = buildCourtTodayBuckets(filtered, new Map(), new Map(), { bucketNow });
  const scheduled = [...buckets.today, ...buckets.tomorrow, ...buckets.this_week];
  const missingEvidence = scheduled.reduce((sum, b) => sum + (b.chaseItems?.length ?? 0), 0);

  return screen(
    "court_today",
    {
      header: formatPilotCourtTodayHeader(bucketNow ?? new Date()),
      todayCount: buckets.today.length,
      missingEvidenceItems: missingEvidence,
      visibleTitles: scheduled.map((b) => b.caseTitle),
    },
    filtered.length > 0 ? "collected" : "missing",
    "live-builder",
    filtered.length > 0 ? undefined : ["cases"],
  );
}
