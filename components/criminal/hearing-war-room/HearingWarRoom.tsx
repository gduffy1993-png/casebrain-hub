"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  CheckSquare,
  ClipboardList,
  Copy,
  FileSearch,
  Gavel,
  LayoutDashboard,
  Loader2,
  MessageSquareQuote,
  Mic,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { StrategyCommitment } from "@/components/criminal/StrategyCommitmentPanel";
import {
  buildChaseItemsForHearing,
  buildHearingWarRoomBrief,
  type HearingWarRoomBrief,
} from "./buildHearingWarRoomBrief";
import { buildDisclosureChaseHref } from "@/components/criminal/disclosure-chase/disclosureChaseLinks";
import { CaseWorkflowShell } from "@/components/criminal/workflow/CaseWorkflowShell";
import { buildControlRoomHref } from "./hearingWarRoomLinks";
import { HearingWarRoomAssistant } from "./HearingWarRoomAssistant";
import type { ControlRoomAssistantContext } from "@/components/criminal/control-room/assistantBattleboardFallback";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "@/lib/criminal/resolve-case-header-metadata";
import {
  cleanPilotHeaderClient,
  cleanPilotCourtHeaderCell,
  cleanPilotHearingHeaderCell,
  pilotCaseBrainPositionStatus,
  pilotPositionDisplayLabel,
  pilotDisplayMetadataNote,
  workflowHeaderOverrides,
  workflowPrimaryRouteTitle,
} from "@/lib/criminal/pilot-workflow";
import { safeSolicitorCaseTitle } from "@/lib/criminal/dev-ref-scrub";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { usePilotDemoSession } from "@/components/criminal/workflow/usePilotDemoSession";
import { WarRoomReasoningBridge } from "@/components/criminal/control-room/WarRoomReasoningBridge";
import { PreHearingReadinessBadge } from "@/components/criminal/control-room/PreHearingReadinessBadge";
import { EvidenceChangeDetectorPanel } from "@/components/criminal/control-room/EvidenceChangeDetectorPanel";
import { SolicitorExportBuilderPanel } from "@/components/criminal/control-room/SolicitorExportBuilderPanel";
import { buildReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { PilotTodayDashboard, type PilotTodayDashboardView } from "@/components/criminal/workflow/PilotTodayDashboard";
import { useReasoningV2Enabled } from "@/lib/criminal/reasoning-v2/reasoning-v2-flag";
import { useReadinessEnabled } from "@/lib/criminal/pre-hearing-readiness/readiness-flag";
import { useEvidenceChangesEnabled } from "@/lib/criminal/evidence-change-detector/evidence-change-flag";
import { useExportsEnabled } from "@/lib/criminal/disclosure-export/export-flag";
import { buildClientStressResult } from "@/lib/criminal/client-stress-test/build-client-stress-result";
import { loadClientStressSelection } from "@/lib/criminal/client-stress-test/client-stress-selection-storage";
import {
  displayChaseBulletLine,
  filterBundleFamilyWarnings,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";

const ABOVE_FOLD_LIST_CAP = 5;

const HEARING_PROMPTS = [
  "Draft hearing note",
  "Draft disclosure timetable request",
  "Explain this to client",
  "What should I not say?",
  "What instruction do I need?",
] as const;

type MatterSummary = {
  clientInitials: string | null;
  allegedOffence: string | null;
  stageDetected: string | null;
  defendantName?: string | null;
  bailOutcome?: string | null;
};

type BundleSourceSummary = {
  documentCount: number;
  combinedTextLength: number;
  documentRows?: DocumentRowMeta[];
  frontMatterScan?: string | null;
  header?: { shortTitle: string | null; stage: string | null; accused?: string | null };
  caseMetadata?: ExtractedBundleCaseMetadata | null;
  snippets?: {
    mg5?: string | null;
    mg6?: string | null;
    exhibits?: string | null;
  };
};

export type HearingWarRoomProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  hasSavedPosition: boolean;
  savedPosition: { position_text: string } | null;
  defencePlan: DefenceStrategyPlan | null;
  displayStrategy: { displayLabel: string } | null;
  committedStrategy: StrategyCommitment | null;
  matterState: string | null;
  effectiveProceduralSafety: {
    status: string;
    outstandingItems?: string[];
  } | null;
  evidenceSummary?: string;
  timelineSummary?: string;
  controlRoomMode?: boolean;
  onRecordPosition?: () => void;
  onUploadEvidence?: () => void;
  /** Parent mounted CaseWorkflowShell (Court Today desk or case page). */
  embedInShell?: boolean;
  /** Court Today desk charge line — snapshot/strip UI fallback only. */
  deskChargeLine?: string | null;
};

function formatGbDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}


function deriveBundleHealth(
  snapshot: CaseSnapshot | null,
  bundleSource: BundleSourceSummary | null,
  battleboard: BattleboardOutput | null,
): string {
  return formatCaseBundleHealthLabel({
    documentCount: Math.max(
      snapshot?.analysis.docCount ?? 0,
      bundleSource?.documentCount ?? 0,
      snapshot?.evidence.documents?.length ?? 0,
    ),
    combinedTextLength: bundleSource?.combinedTextLength ?? 0,
    capabilityTier: snapshot?.analysis.capabilityTier,
    battleboard,
    documentRows: bundleSource?.documentRows,
    bundleTextHint: bundleSource?.frontMatterScan,
  });
}

function BriefListCard({
  title,
  icon,
  items,
  tone = "default",
  previewCount,
}: {
  title: string;
  icon: ReactNode;
  items: string[];
  tone?: "default" | "warn" | "safe" | "court";
  previewCount?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const cap = previewCount ?? items.length;
  const hasMore = items.length > cap;
  const visible = showAll || !hasMore ? items : items.slice(0, cap);

  const border =
    tone === "safe"
      ? "border-emerald-200/60 bg-emerald-50/30"
      : tone === "warn"
        ? "border-amber-200/60 bg-amber-50/30"
        : tone === "court"
          ? "border-blue-200/60 bg-blue-50/20"
          : "";
  return (
    <section className={`${workflowCard} ${border}`}>
      <header className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
        {icon}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </header>
      <ul className="px-4 py-3 space-y-2 text-sm text-slate-800 list-disc pl-4">
        {visible.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
      {hasMore && (
        <div className="px-4 pb-3 -mt-1">
          <button
            type="button"
            className="text-xs font-medium text-blue-700 hover:text-blue-900"
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Show fewer" : `Show all (${items.length})`}
          </button>
        </div>
      )}
    </section>
  );
}

function DraftBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className={workflowSectionTitle}>{title}</p>
        <button
          type="button"
          onClick={() => void copy()}
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-slate-900"
        >
          <Copy className="h-3 w-3" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-800 leading-relaxed italic">{text}</p>
    </div>
  );
}

function PilotWarRoomMoreDetail({ brief, bundleHay = "" }: { brief: HearingWarRoomBrief; bundleHay?: string }) {
  const sayThis = filterBundleFamilyWarnings(brief.sayThis, bundleHay).map((line) =>
    polishPresentationLine(line, bundleHay),
  );
  const doNotOverstate = filterBundleFamilyWarnings(brief.doNotOverstate, bundleHay).map((line) =>
    polishPresentationLine(line, bundleHay),
  );
  const collapseRisks = filterBundleFamilyWarnings(brief.collapseRisks, bundleHay).map((line) =>
    polishPresentationLine(line, bundleHay),
  );
  return (
    <section className={workflowCard}>
      <header className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
        <ShieldAlert className="h-4 w-4 text-slate-600" />
        <h2 className="text-sm font-semibold text-slate-900">More detail</h2>
      </header>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BriefListCard title="Say this" icon={<Mic className="h-4 w-4 text-blue-700" />} items={sayThis} tone="court" />
          <BriefListCard title="Do not overstate" icon={<Ban className="h-4 w-4 text-amber-700" />} items={doNotOverstate} tone="warn" />
        </div>
        {collapseRisks.length > 0 ? (
          <div>
            <p className={`${workflowSectionTitle} flex items-center gap-1 text-amber-800/90`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              Collapse risks (review — do not state as outcomes)
            </p>
            <ul className="mt-2 text-sm text-slate-800 list-disc pl-4 space-y-1">
              {collapseRisks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="space-y-3">
          <p className={workflowSectionTitle}>Draft wording blocks</p>
          <DraftBlock title="Disclosure timetable request" text={brief.draftWording.disclosureTimetable} />
          <DraftBlock title="Adjournment / provisional position" text={brief.draftWording.adjournment} />
          <DraftBlock title="Client explanation (plain language)" text={brief.draftWording.clientExplanation} />
        </div>
      </div>
    </section>
  );
}

export function HearingWarRoom({
  caseId,
  snapshot,
  snapshotLoading,
  hasSavedPosition,
  savedPosition,
  defencePlan,
  displayStrategy,
  committedStrategy,
  matterState,
  effectiveProceduralSafety,
  evidenceSummary,
  timelineSummary,
  controlRoomMode,
  onRecordPosition,
  onUploadEvidence,
  embedInShell = false,
  deskChargeLine,
}: HearingWarRoomProps) {
  const [matter, setMatter] = useState<MatterSummary | null>(null);
  const [battleboard, setBattleboard] = useState<BattleboardOutput | null>(null);
  const [battleboardLoading, setBattleboardLoading] = useState(true);
  const [bundleSource, setBundleSource] = useState<BundleSourceSummary | null>(null);
  const [bundleLoading, setBundleLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/criminal/${caseId}/matter`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setMatter({
          clientInitials: data.clientInitials ?? data.station?.clientInitials ?? null,
          allegedOffence: data.station?.allegedOffence ?? data.allegedOffence ?? null,
          stageDetected: data.matterState ?? data.stage ?? null,
          defendantName: data.defendantName ?? null,
          bailOutcome: data.bailOutcome ?? null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    setBattleboardLoading(true);
    fetch(`/api/criminal/${caseId}/strategy-battleboard`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res?.ok && res?.data) setBattleboard(res.data as BattleboardOutput);
        else setBattleboard(null);
      })
      .catch(() => {
        if (!cancelled) setBattleboard(null);
      })
      .finally(() => {
        if (!cancelled) setBattleboardLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    let cancelled = false;
    setBundleLoading(true);
    fetch(`/api/criminal/${caseId}/bundle-source`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.ok || !res?.data) return;
        const d = res.data as BundleSourceSummary;
        setBundleSource({
          documentCount: d.documentCount ?? 0,
          combinedTextLength: d.combinedTextLength ?? 0,
          documentRows: Array.isArray(d.documentRows) ? d.documentRows : undefined,
          frontMatterScan: (d as { frontMatterScan?: string }).frontMatterScan ?? null,
          header: d.header
            ? {
                shortTitle: d.header.shortTitle ?? null,
                stage: d.header.stage ?? null,
                accused: d.header.accused ?? null,
              }
            : undefined,
          caseMetadata: d.caseMetadata ?? null,
          snippets: d.snippets
            ? {
                mg5: d.snippets.mg5 ?? null,
                mg6: d.snippets.mg6 ?? null,
                exhibits: d.snippets.exhibits ?? null,
              }
            : undefined,
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBundleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const caseTitleBase = snapshot?.caseMeta?.title?.trim() || "Criminal case";

  const headerMeta = useMemo(
    () =>
      resolveCaseHeaderMetadata({
        snapshot,
        matter: matter
          ? {
              clientInitials: matter.clientInitials,
              defendantName: matter.defendantName,
              allegedOffence: matter.allegedOffence,
              stageDetected: matter.stageDetected,
              bailOutcome: matter.bailOutcome,
            }
          : null,
        bundleMetadata: bundleSource?.caseMetadata,
        bundleHeader: bundleSource?.header,
        bundleText: bundleSource?.frontMatterScan ?? null,
        matterState,
      }),
    [snapshot, matter, bundleSource, matterState],
  );

  const clientLabelBase = sanitizeHeaderClient(headerMeta.clientLabel);
  const allegationBase = sanitizeHeaderAllegation(headerMeta.allegation);
  const clientLabel = isCriminalPilotMode() ? cleanPilotHeaderClient(clientLabelBase) : clientLabelBase;
  const pilotHeader = useMemo(
    () =>
      workflowHeaderOverrides(caseTitleBase, {
        allegation: allegationBase,
        routeTitle: battleboard?.primary_route?.title,
        bundleText: bundleSource?.frontMatterScan ?? null,
        clientLabel,
      }),
    [caseTitleBase, allegationBase, clientLabel, battleboard?.primary_route?.title, bundleSource?.frontMatterScan],
  );
  const caseTitle = safeSolicitorCaseTitle(
    pilotHeader?.displayTitle ?? pilotHeader?.title ?? caseTitleBase,
  );
  const allegation = pilotHeader?.allegation ?? allegationBase;
  const reasoningV2Enabled = useReasoningV2Enabled();
  const readinessEnabled = useReadinessEnabled();
  const evidenceChangesEnabled = useEvidenceChangesEnabled();
  const exportsEnabled = useExportsEnabled();
  const reasoningV2Result = useMemo(() => {
    if (!reasoningV2Enabled) return null;
    return buildReasoningV2ViewModel({
      frontMatterScan: bundleSource?.frontMatterScan,
      snippets: bundleSource?.snippets,
      combinedTextLength: bundleSource?.combinedTextLength,
      matterLabel: caseTitle,
    });
  }, [reasoningV2Enabled, bundleSource, caseTitle]);

  const clientStressForReadiness = useMemo(() => {
    if (reasoningV2Result?.available !== true) return null;
    const saved = loadClientStressSelection(caseId);
    if (!saved?.selectedOptions?.length) return null;
    const outcome = buildClientStressResult(reasoningV2Result, saved);
    return outcome.available ? outcome : null;
  }, [caseId, reasoningV2Result]);
  const workflowContext = useMemo(
    () => ({
      caseTitle,
      allegation,
      routeTitle: battleboard?.primary_route?.title,
      bundleText: bundleSource?.frontMatterScan ?? null,
      clientLabel,
      profileHint: pilotHeader?.profile ?? null,
    }),
    [caseTitle, allegation, clientLabel, battleboard?.primary_route?.title, bundleSource?.frontMatterScan, pilotHeader?.profile],
  );
  const stage = headerMeta.stage;
  const metadataNote = pilotDisplayMetadataNote(headerMeta.metadataNote);
  const pilotMode = isCriminalPilotMode();
  const usePilotDeskUi = embedInShell || pilotMode;
  const { uploadDisabled: pilotUploadDisabled, recordPositionDisabled: pilotRecordPositionHidden } =
    usePilotDemoSession();
  const hearingDateIso =
    bundleSource?.caseMetadata?.nextHearingIso ?? snapshot?.caseMeta?.hearingNextAt ?? null;
  const courtDisplay = pilotMode
    ? cleanPilotCourtHeaderCell(headerMeta.court)
    : headerMeta.court?.trim() || "Court not safely extracted";
  const hearingDisplay = pilotMode
    ? cleanPilotHearingHeaderCell(
        snapshotLoading || bundleLoading ? "…" : headerMeta.nextHearing,
        hearingDateIso,
      )
    : (snapshotLoading || bundleLoading) && /not safely extracted/i.test(headerMeta.nextHearing)
      ? "…"
      : headerMeta.nextHearing;
  const hearingStatus = hearingDisplay;

  const chaseItemsAll = useMemo(
    () =>
      buildChaseItemsForHearing({
        snapshotMissing: snapshot?.evidence.missingEvidence,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
        battleboard,
      }),
    [snapshot, effectiveProceduralSafety, battleboard],
  );

  const positionStatus = useMemo(() => {
    let raw: string;
    if (hasSavedPosition && savedPosition?.position_text?.trim()) {
      raw =
        savedPosition.position_text.split(/[.!?]/)[0].trim() +
        (savedPosition.position_text.includes(".") ? "." : "");
    } else if (headerMeta.defencePosition) {
      raw =
        headerMeta.defencePosition.length > 100
          ? `${headerMeta.defencePosition.slice(0, 97)}…`
          : headerMeta.defencePosition;
    } else if (pilotMode && !hasSavedPosition) {
      raw = pilotCaseBrainPositionStatus(false);
    } else if (battleboard?.position_notice?.includes("not safely recorded")) {
      raw = "Position not safely recorded yet";
    } else {
      raw = "Position not recorded";
    }
    return pilotMode ? pilotPositionDisplayLabel(raw, workflowContext) : raw;
  }, [
    hasSavedPosition,
    savedPosition,
    headerMeta.defencePosition,
    pilotMode,
    battleboard?.position_notice,
    workflowContext,
  ]);

  const readiness = useMemo(() => {
    if (effectiveProceduralSafety?.status === "UNSAFE_TO_PROCEED") {
      return "Conditional — procedural disclosure gaps";
    }
    if (!hasSavedPosition) {
      return pilotRecordPositionHidden && pilotMode
        ? "Conditional — confirm instructions"
        : "Conditional — record position";
    }
    if (chaseItemsAll.length >= 2) return "Conditional — source material outstanding";
    if (battleboard?.primary_route) return "Routes on file — solicitor review";
    return "Review — standard caution";
  }, [effectiveProceduralSafety, hasSavedPosition, chaseItemsAll, battleboard, pilotMode, pilotRecordPositionHidden]);

  const brief: HearingWarRoomBrief = useMemo(
    () =>
      buildHearingWarRoomBrief({
        caseId,
        caseTitle,
        clientLabel,
        allegation,
        stage,
        hearingStatus,
        bundleHealth: deriveBundleHealth(snapshot, bundleSource, battleboard),
        positionStatus,
        readiness,
        battleboard,
        hasSavedPosition,
        chaseItems: chaseItemsAll,
        defencePlan,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
        bundleText: bundleSource?.frontMatterScan ?? null,
        profileHint: pilotHeader?.profile ?? null,
        pilotDemoReadOnly: pilotRecordPositionHidden,
      }),
    [
      caseId,
      caseTitle,
      clientLabel,
      allegation,
      stage,
      hearingStatus,
      bundleSource,
      battleboard,
      positionStatus,
      readiness,
      hasSavedPosition,
      chaseItemsAll,
      defencePlan,
      effectiveProceduralSafety,
      pilotHeader?.profile,
      pilotRecordPositionHidden,
    ],
  );

  const planSummary = useMemo(() => {
    const parts = [
      `Hearing War Room — ${caseTitle}`,
      `Safe position: ${brief.safePositionToday}`,
      brief.sayThis.length ? `Say this: ${brief.sayThis.join(" | ")}` : "",
    ];
    return parts.filter(Boolean).join("\n");
  }, [brief, caseTitle]);

  const assistantContext: ControlRoomAssistantContext = useMemo(
    () => ({
      battleboard,
      allegation,
      stage,
      positionNotice: battleboard?.position_notice ?? null,
      missingEvidence: chaseItemsAll,
      bundleHeader: bundleSource?.header ?? null,
      primaryRouteTitle:
        battleboard?.primary_route?.title ||
        displayStrategy?.displayLabel ||
        (committedStrategy?.primary ? String(committedStrategy.primary) : null),
    }),
    [battleboard, allegation, stage, chaseItemsAll, bundleSource, displayStrategy, committedStrategy],
  );

  const loading = snapshotLoading || battleboardLoading;
  const embedBlockingLoading = embedInShell ? snapshotLoading : loading;
  const controlRoomHref = buildControlRoomHref(caseId);
  const headerLoading = snapshotLoading || bundleLoading;

  const bundleContextHay = useMemo(
    () =>
      [
        bundleSource?.frontMatterScan ?? "",
        bundleSource?.snippets?.mg5 ?? "",
        bundleSource?.snippets?.mg6 ?? "",
        bundleSource?.snippets?.exhibits ?? "",
        allegation,
        brief.bundleHealth ?? "",
      ].join(" "),
    [bundleSource, allegation, brief.bundleHealth],
  );

  const pilotTodayView = useMemo((): PilotTodayDashboardView | null => {
    if (!usePilotDeskUi || snapshotLoading) return null;
    const filteredDno = filterBundleFamilyWarnings(brief.doNotOverstate, bundleContextHay);
    const filteredRisks = filterBundleFamilyWarnings(brief.collapseRisks, bundleContextHay);
    const filteredChase = filterBundleFamilyWarnings(chaseItemsAll, bundleContextHay).map(displayChaseBulletLine);
    const filteredSayThis = filterBundleFamilyWarnings(brief.sayThis, bundleContextHay).map((line) =>
      polishPresentationLine(line, bundleContextHay),
    );
    const filteredAskCourt = filterBundleFamilyWarnings(brief.askCourtToRecord, bundleContextHay).map((line) =>
      polishPresentationLine(line, bundleContextHay),
    );
    const filteredNextMoves = filterBundleFamilyWarnings(brief.nextHearingMoves, bundleContextHay).map((line) =>
      polishPresentationLine(line, bundleContextHay),
    );
    return {
      caseSummary: {
        clientLabel,
        allegation,
        court: courtDisplay,
        hearing: headerLoading ? "…" : hearingDisplay,
        stage: headerLoading ? "…" : stage,
        bundleHealth: brief.bundleHealth,
      },
      readiness: brief.readiness,
      positionStatus: brief.positionStatus,
      safeCourtLine: polishPresentationLine(brief.safePositionToday, bundleContextHay),
      sayThis: filteredSayThis,
      doNotOverstate: filteredDno,
      askCourtToRecord: filteredAskCourt,
      collapseRisks: filteredRisks,
      nextHearingMoves: filteredNextMoves,
      chaseItems: filteredChase,
      documentCount: Math.max(bundleSource?.documentCount ?? 0, snapshot?.analysis.docCount ?? 0),
    };
  }, [
    usePilotDeskUi,
    snapshotLoading,
    clientLabel,
    allegation,
    courtDisplay,
    headerLoading,
    hearingDisplay,
    stage,
    brief,
    chaseItemsAll,
    bundleSource,
    snapshot,
    bundleContextHay,
  ]);

  if (embedInShell && usePilotDeskUi) {
    return (
      <div className="min-h-0" data-testid="hearing-war-room">
        {embedBlockingLoading ? (
          <div className={`${workflowCard} p-8 flex items-center justify-center gap-2 text-slate-600`}>
            <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            Loading matter dashboard…
          </div>
        ) : pilotTodayView ? (
          <PilotTodayDashboard
            caseId={caseId}
            view={pilotTodayView}
            deskChargeLine={deskChargeLine}
            moreDetail={
              <>
                <BriefListCard
                  title="Ask court to record"
                  icon={<Scale className="h-4 w-4 text-blue-700" />}
                  items={pilotTodayView.askCourtToRecord}
                  tone="court"
                  previewCount={3}
                />
                <PilotWarRoomMoreDetail brief={brief} bundleHay={bundleContextHay} />
              </>
            }
          />
        ) : (
          <div className={`${workflowCard} p-6 text-sm text-slate-500`}>
            Matter dashboard will appear once case snapshot loads.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-0 pb-20 xl:pb-4 text-slate-900" data-testid="hearing-war-room">
      <div className={pilotMode ? "max-w-[1400px] space-y-4" : "xl:mr-[min(360px,26vw)] xl:pr-3 max-w-[1400px] space-y-4"}>
        <CaseWorkflowShell
          caseId={caseId}
          safeCourtLine={pilotMode && !loading ? brief.safePositionToday : undefined}
          onRecordPosition={pilotRecordPositionHidden ? undefined : onRecordPosition}
          onUploadEvidence={pilotUploadDisabled ? undefined : onUploadEvidence}
          pilotUploadDisabled={pilotUploadDisabled}
          pilotRecordPositionHidden={pilotRecordPositionHidden}
        >
        {!pilotMode ? (
        <header className={`${workflowCard} overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Gavel className="h-5 w-5 text-blue-700 shrink-0" />
                <h1 className="text-lg font-semibold text-slate-900">Hearing War Room</h1>
                <Badge variant="secondary" size="sm" className="bg-blue-100 text-blue-900">
                  Court prep
                </Badge>
              </div>
              <>
                <p className="mt-1 text-sm font-medium text-slate-800">{caseTitle}</p>
                {!pilotHeader && (
                  <p className={`text-xs ${workflowMuted} mt-0.5`}>
                    {clientLabel} · {allegation}
                  </p>
                )}
              </>
            </div>
            {controlRoomMode ? null : (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link href={buildControlRoomHref(caseId)}>
                  <Button type="button" size="sm" variant="outline" className="gap-1">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    Open Control Room
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-slate-100">
            {[
              {
                label: "Court",
                value: courtDisplay,
              },
              { label: "Stage", value: headerLoading ? "…" : stage },
              { label: "Hearing", value: headerLoading ? "…" : hearingDisplay },
              { label: "Bundle", value: brief.bundleHealth },
              { label: "Position", value: brief.positionStatus },
              { label: "Readiness", value: brief.readiness },
              {
                label: "Primary route",
                value:
                  workflowPrimaryRouteTitle(workflowContext) ||
                  battleboard?.primary_route?.title ||
                  displayStrategy?.displayLabel ||
                  "Provisional",
              },
            ].map((tile) => (
              <div key={tile.label} className="bg-white px-3 py-2.5 min-w-0">
                <dt className={workflowSectionTitle}>{tile.label}</dt>
                <dd className="text-xs font-medium text-slate-900 mt-1 line-clamp-3 leading-snug">
                  {loading ? "…" : tile.value}
                </dd>
              </div>
            ))}
          </dl>
          {metadataNote ? (
            <p className="px-4 py-2 text-[10px] text-slate-400 border-t border-slate-100">{metadataNote}</p>
          ) : null}
        </header>
        ) : null}

        {pilotMode ? (
          loading || !pilotTodayView ? (
            <div className={`${workflowCard} p-8 flex items-center justify-center gap-2 text-slate-600`}>
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
              Loading matter dashboard…
            </div>
          ) : (
            <PilotTodayDashboard
              caseId={caseId}
              view={pilotTodayView}
              moreDetail={
                <>
                  <BriefListCard
                    title="Ask court to record"
                    icon={<Scale className="h-4 w-4 text-blue-700" />}
                    items={brief.askCourtToRecord}
                    tone="court"
                    previewCount={3}
                  />
                  <PilotWarRoomMoreDetail brief={brief} bundleHay={bundleContextHay} />
                </>
              }
            />
          )
        ) : loading ? (
          <div className={`${workflowCard} p-8 flex items-center justify-center gap-2 text-slate-600`}>
            <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            Loading court-prep brief…
          </div>
        ) : (
          <>
            <section className={`${workflowCard} p-4 border-emerald-200/50 bg-emerald-50/40`}>
              <p className={`${workflowSectionTitle} text-emerald-900/80 flex items-center gap-1`}>
                <MessageSquareQuote className="h-3.5 w-3.5" />
                Safe position today
              </p>
              <blockquote className="mt-2 text-sm text-slate-900 leading-relaxed border-l-2 border-emerald-500/50 pl-3">
                {brief.safePositionToday}
              </blockquote>
              <p className="text-[10px] text-slate-500 mt-2">
                Provisional · conditional on served material · solicitor review required
              </p>
            </section>

            <PreHearingReadinessBadge
              compact
              reasoningV2Enabled={reasoningV2Enabled}
              readinessEnabled={readinessEnabled}
              reasoningResult={reasoningV2Result}
              clientStressResult={clientStressForReadiness}
              bundleMeta={
                bundleSource
                  ? {
                      documentCount: bundleSource.documentCount,
                      combinedTextLength: bundleSource.combinedTextLength,
                    }
                  : null
              }
              hearingMeta={{
                hearingDateIso,
                stage,
              }}
              workflowProfileHint={pilotHeader?.profile ?? null}
              loading={bundleLoading}
            />

            <EvidenceChangeDetectorPanel
              compact
              caseId={caseId}
              reasoningV2Enabled={reasoningV2Enabled}
              evidenceChangesEnabled={evidenceChangesEnabled}
              reasoningResult={reasoningV2Result}
              clientStressResult={clientStressForReadiness}
              sourceStateInput={
                bundleSource
                  ? {
                      documentCount: bundleSource.documentCount,
                      combinedTextLength: bundleSource.combinedTextLength,
                      snippets: bundleSource.snippets,
                      documentRows: bundleSource.documentRows?.map((r) => ({
                        updatedAt: r.updatedAt,
                      })),
                      frontMatterScan: bundleSource.frontMatterScan,
                    }
                  : null
              }
              readinessInput={{
                bundleMeta: bundleSource
                  ? {
                      documentCount: bundleSource.documentCount,
                      combinedTextLength: bundleSource.combinedTextLength,
                    }
                  : null,
                hearingMeta: { hearingDateIso, stage },
                workflowProfileHint: pilotHeader?.profile ?? null,
              }}
              loading={bundleLoading}
            />

            <SolicitorExportBuilderPanel
              compact
              caseId={caseId}
              caseLabel={caseTitle}
              clientLabel={clientLabel}
              stage={stage}
              hearingDateIso={hearingDateIso}
              reasoningV2Enabled={reasoningV2Enabled}
              exportsEnabled={exportsEnabled}
              reasoningResult={reasoningV2Result}
              clientStressResult={clientStressForReadiness}
              readinessInput={{
                bundleMeta: bundleSource
                  ? {
                      documentCount: bundleSource.documentCount,
                      combinedTextLength: bundleSource.combinedTextLength,
                    }
                  : null,
                hearingMeta: { hearingDateIso, stage },
                workflowProfileHint: pilotHeader?.profile ?? null,
              }}
              loading={bundleLoading}
            />

            {reasoningV2Enabled && reasoningV2Result?.available ? (
              <WarRoomReasoningBridge
                caseId={caseId}
                reasoningV2Enabled={reasoningV2Enabled}
                routeLabel={
                  reasoningV2Result.primaryRoute ||
                  battleboard?.primary_route?.title ||
                  null
                }
                warRoom={reasoningV2Result.warRoom}
              />
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <BriefListCard
                title="Say this"
                icon={<Mic className="h-4 w-4 text-blue-700" />}
                items={brief.sayThis}
                tone="court"
              />
              <BriefListCard
                title="Do not overstate"
                icon={<Ban className="h-4 w-4 text-amber-700" />}
                items={brief.doNotOverstate}
                tone="warn"
              />
              <div className="space-y-2">
                <BriefListCard
                  title="Ask court to record"
                  icon={<Scale className="h-4 w-4 text-blue-700" />}
                  items={brief.askCourtToRecord}
                  tone="court"
                  previewCount={ABOVE_FOLD_LIST_CAP}
                />
                <Link
                  href={buildDisclosureChaseHref(caseId, { controlRoom: controlRoomMode })}
                  className="inline-flex text-xs font-medium text-violet-800 hover:text-violet-950 px-1"
                >
                  Open full Disclosure Chase tracker →
                </Link>
              </div>
              <BriefListCard
                title="Instructions needed before hearing"
                icon={<ClipboardList className="h-4 w-4 text-slate-600" />}
                items={brief.instructionsNeeded}
              />
            </div>

            <BriefListCard
              title="Next hearing moves"
              icon={<CheckSquare className="h-4 w-4 text-emerald-700" />}
              items={brief.nextHearingMoves}
              tone="safe"
              previewCount={ABOVE_FOLD_LIST_CAP}
            />

            <section className={`${workflowCard}`}>
              <header className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/80">
                <ShieldAlert className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-900">Supporting detail</h2>
              </header>
              <div className="p-4 space-y-4">
                {brief.evidenceAnchors.length > 0 && (
                  <div>
                    <p className={workflowSectionTitle}>Evidence anchors</p>
                    <ul className="mt-2 text-sm text-slate-800 list-disc pl-4 space-y-1">
                      {brief.evidenceAnchors.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {brief.collapseRisks.length > 0 && (
                  <div>
                    <p className={`${workflowSectionTitle} flex items-center gap-1 text-amber-800/90`}>
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Collapse risks (review — do not state as outcomes)
                    </p>
                    <ul className="mt-2 text-sm text-slate-800 list-disc pl-4 space-y-1">
                      {brief.collapseRisks.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="space-y-3">
                  <p className={workflowSectionTitle}>Draft wording blocks</p>
                  <DraftBlock title="Disclosure timetable request" text={brief.draftWording.disclosureTimetable} />
                  <DraftBlock title="Adjournment / provisional position" text={brief.draftWording.adjournment} />
                  <DraftBlock title="Client explanation (plain language)" text={brief.draftWording.clientExplanation} />
                </div>
              </div>
            </section>

            <div className={`${workflowCard} p-3 xl:hidden`}>
              <p className={workflowSectionTitle}>Suggested assistant prompts</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {HEARING_PROMPTS.map((p) => (
                  <span
                    key={p}
                    className="text-[10px] px-2 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Use the assistant panel (bottom-right on mobile) — secondary to the brief above.
              </p>
            </div>
          </>
        )}
        </CaseWorkflowShell>
      </div>

      {pilotMode ? null : (
      <HearingWarRoomAssistant
        caseId={caseId}
        planSummary={planSummary}
        evidenceSummary={evidenceSummary}
        timelineSummary={timelineSummary}
        assistantContext={assistantContext}
      />
      )}
    </div>
  );
}
