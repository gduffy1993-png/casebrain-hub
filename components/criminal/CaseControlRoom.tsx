"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DashboardCard } from "./control-room/DashboardCard";
import { ControlRoomAssistantDock } from "./control-room/ControlRoomAssistant";
import { ControlRoomBattleboardAccordion } from "./control-room/ControlRoomBattleboardAccordion";
import { CaseSummaryCard } from "./control-room/CaseSummaryCard";
import { ControlRoomCockpit } from "./control-room/ControlRoomCockpit";
import { ReasoningV2Panel } from "./control-room/ReasoningV2Panel";
import { ProofMapPanel } from "./control-room/ProofMapPanel";
import { PreHearingReadinessBadge } from "./control-room/PreHearingReadinessBadge";
import { EvidenceChangeDetectorPanel } from "./control-room/EvidenceChangeDetectorPanel";
import { EvidenceChangeMaterialBadge } from "./control-room/EvidenceChangeMaterialBadge";
import { buildEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/build-evidence-change-snapshot";
import { compareEvidenceChanges } from "@/lib/criminal/evidence-change-detector/compare-evidence-changes";
import { loadEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import { SolicitorExportBuilderPanel } from "./control-room/SolicitorExportBuilderPanel";
import { SupervisorQAPanel } from "./control-room/SupervisorQAPanel";
import { ClientExplanationPanel } from "./control-room/ClientExplanationPanel";
import { buildReasoningV2ViewModel } from "@/lib/criminal/reasoning-v2/build-reasoning-v2-view-model";
import { useReasoningV2Enabled } from "@/lib/criminal/reasoning-v2/reasoning-v2-flag";
import { buildProductProofMap } from "@/lib/criminal/proof-map/build-product-proof-map";
import { useProofMapEnabled } from "@/lib/criminal/proof-map/proof-map-flag";
import { useClientStressEnabled } from "@/lib/criminal/client-stress-test/client-stress-flag";
import { buildClientStressResult } from "@/lib/criminal/client-stress-test/build-client-stress-result";
import { loadClientStressSelection } from "@/lib/criminal/client-stress-test/client-stress-selection-storage";
import { ClientAccountStressTestPanel } from "./control-room/ClientAccountStressTestPanel";
import { useReadinessEnabled } from "@/lib/criminal/pre-hearing-readiness/readiness-flag";
import { useEvidenceChangesEnabled } from "@/lib/criminal/evidence-change-detector/evidence-change-flag";
import { useExportsEnabled } from "@/lib/criminal/disclosure-export/export-flag";
import { useSupervisorQAEnabled } from "@/lib/criminal/supervisor-qa/supervisor-qa-flag";
import { useClientExplainEnabled } from "@/lib/criminal/client-explanation/client-explanation-flag";
import { CaseWorkflowShell } from "./workflow/CaseWorkflowShell";
import { isThickPilotBundle } from "./workflow/workflowPilotDisplay";
import { pilotPapersDeepScope, workflowPilotCard, workflowSectionTitle } from "./workflow/workflowUi";
import { buildCaseSummarySnippet } from "@/lib/criminal/build-case-summary-snippet";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { usePilotDemoSession } from "@/components/criminal/workflow/usePilotDemoSession";
import { mapSnapshotToWorkflowDocuments } from "@/components/criminal/workflow/caseWorkflowDocuments";
import {
  cleanPilotHeaderClient,
  filterBattleboardForWorkflowPilot,
  filterWorkflowPilotLines,
  cleanPilotCourtHeaderCell,
  cleanPilotHearingHeaderCell,
  pilotBundlePositionNote,
  pilotPositionDisplayLabel,
  pilotCleanupVisibleText,
  sanitizePilotVisibleLine,
  pilotCaseBrainPositionStatus,
  pilotDisplayMetadataNote,
  pilotStrategyBasisDisplay,
  shouldSuppressPilotStrategyBasisReason,
  workflowDisclosureChaseLabels,
  workflowHeaderOverrides,
  workflowPrimaryRouteTitle,
  workflowSafeCourtLine,
  workflowTopNextActions,
  prioritizeWorkflowItems,
  showPilotRouteDetailPanel,
} from "@/lib/criminal/pilot-workflow";
import { safeSolicitorCaseTitle } from "@/lib/criminal/dev-ref-scrub";
import type { DocumentRowMeta } from "@/lib/bundle/parse-bundle-display";
import { RiskColumn } from "./control-room/GlanceGrid";
import { buildClassicCaseHref, clearControlRoomPreference } from "./criminalCaseNavigation";
import {
  collectChaseItems,
  formatDisclosureGlance,
} from "./control-room/chaseItems";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import type { DefenceStrategyPlan } from "@/lib/criminal/strategy-output";
import type { StrategyCommitment } from "./StrategyCommitmentPanel";
import type { BattleboardOutput } from "@/lib/criminal/strategy-battleboard";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import {
  buildBundleTruthLedger,
  filterTemplateSafeLines,
} from "@/lib/criminal/bundle-truth-ledger";
import type { BundleTruthLedger } from "@/lib/criminal/bundle-truth-types";
import {
  resolveCaseHeaderMetadata,
  sanitizeHeaderAllegation,
  sanitizeHeaderClient,
} from "@/lib/criminal/resolve-case-header-metadata";
import { ClientInstructionsRecorder } from "./ClientInstructionsRecorder";
import {
  displayPrimaryRouteTitle,
  filterBundleFamilyWarnings,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";

type SavedPosition = {
  position_text: string;
  created_at?: string;
  phase?: number;
} | null;

type ProceduralSafety = {
  status: string;
  explanation?: string;
  outstandingItems?: string[];
} | null;

export type CaseControlRoomProps = {
  caseId: string;
  snapshot: CaseSnapshot | null;
  snapshotLoading: boolean;
  savedPosition: SavedPosition;
  hasSavedPosition: boolean;
  defencePlan: DefenceStrategyPlan | null;
  displayStrategy: { displayLabel: string; displayCategory: string } | null;
  committedStrategy: StrategyCommitment | null;
  matterState: string | null;
  effectiveProceduralSafety: ProceduralSafety;
  evidenceSummary?: string;
  timelineSummary?: string;
  onRecordPosition?: () => void;
  onUploadEvidence?: () => void;
  /** Control Room sub-surface when opened via workflow tabs. */
  surface?: "default" | "battleboard" | "position" | "papers";
  /** Parent already mounted CaseWorkflowShell (pilot Papers tab). */
  embedInShell?: boolean;
};

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
  header?: {
    shortTitle: string | null;
    stage: string | null;
    primaryEvalHook: string | null;
    accused?: string | null;
  };
  snippets?: {
    mg5: string | null;
    mg6: string | null;
    exhibits: string | null;
  };
  caseMetadata?: ExtractedBundleCaseMetadata | null;
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

function formatNextHearing(snapshot: CaseSnapshot | null): string {
  const at = snapshot?.caseMeta?.hearingNextAt;
  if (!at) return "No hearing date safely extracted";
  const datePart = formatGbDate(at);
  if (!datePart) return "No hearing date safely extracted";
  const type = snapshot?.caseMeta?.hearingNextType?.trim();
  return type ? `${type} · ${datePart}` : datePart;
}


function stripRepeatedPositionNotice(items: string[], notice: string | null | undefined): string[] {
  if (!notice?.trim()) {
    return items.filter((i) => !/defence position not safely recorded/i.test(i));
  }
  const key = notice.slice(0, 48).toLowerCase();
  return items.filter((i) => {
    const t = i.trim().toLowerCase();
    if (!t) return false;
    if (t.includes(key)) return false;
    if (/defence position not safely recorded/i.test(t)) return false;
    return true;
  });
}

function buildPlanSummary(plan: DefenceStrategyPlan | null): string {
  if (!plan) return "";
  const parts: string[] = [];
  if (plan.strategy_in_one_line) parts.push(plan.strategy_in_one_line);
  if (plan.primary_route?.label) parts.push(`Primary route: ${plan.primary_route.label}`);
  if (plan.posture) parts.push(plan.posture);
  return parts.slice(0, 12).join("\n");
}


export function CaseControlRoom({
  caseId,
  snapshot,
  snapshotLoading,
  savedPosition,
  hasSavedPosition,
  defencePlan,
  displayStrategy,
  committedStrategy,
  matterState,
  effectiveProceduralSafety,
  evidenceSummary,
  timelineSummary,
  onRecordPosition,
  onUploadEvidence,
  surface = "default",
  embedInShell = false,
}: CaseControlRoomProps) {
  const router = useRouter();
  const [papersDeepOpen, setPapersDeepOpen] = useState(false);
  const [matter, setMatter] = useState<MatterSummary | null>(null);
  const [battleboard, setBattleboard] = useState<BattleboardOutput | null>(null);
  const [battleboardLoading, setBattleboardLoading] = useState(true);
  const [bundleSource, setBundleSource] = useState<BundleSourceSummary | null>(null);
  const [bundleSourceLoading, setBundleSourceLoading] = useState(true);
  const reasoningV2Enabled = useReasoningV2Enabled();
  const proofMapEnabled = useProofMapEnabled();
  const readinessEnabled = useReadinessEnabled();
  const evidenceChangesEnabled = useEvidenceChangesEnabled();
  const exportsEnabled = useExportsEnabled();
  const supervisorEnabled = useSupervisorQAEnabled();
  const clientExplainEnabled = useClientExplainEnabled();
  const clientStressEnabled = useClientStressEnabled();

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
          defendantName: data.defendantName ?? data.station?.defendantName ?? null,
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
    setBundleSourceLoading(true);
    fetch(`/api/criminal/${caseId}/bundle-source`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.ok || !res?.data) return;
        const d = res.data as BundleSourceSummary & {
          documentRows?: DocumentRowMeta[];
          frontMatterScan?: string;
        };
        setBundleSource({
          documentCount: d.documentCount ?? 0,
          combinedTextLength: d.combinedTextLength ?? 0,
          documentRows: Array.isArray(d.documentRows) ? d.documentRows : undefined,
          frontMatterScan: d.frontMatterScan ?? null,
          header: d.header
            ? {
                shortTitle: d.header.shortTitle ?? null,
                stage: d.header.stage ?? null,
                primaryEvalHook: d.header.primaryEvalHook ?? null,
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
        if (!cancelled) setBundleSourceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  const hasBattleboardMaterial = useMemo(() => battleboardHasMaterial(battleboard), [battleboard]);

  const planSummary = useMemo(() => {
    const base = buildPlanSummary(defencePlan);
    const bb = battleboard?.primary_route;
    const snippet = bb
      ? `Battleboard primary: ${bb.title}. ${bb.hearing_line}`.slice(0, 400)
      : battleboard?.solicitor_safe_summary?.slice(0, 300) ?? "";
    return [base, snippet].filter(Boolean).join("\n");
  }, [defencePlan, battleboard]);

  const caseTitle = snapshot?.caseMeta?.title?.trim() || "Criminal case";

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

  const readinessBundleMeta = useMemo(
    () =>
      bundleSource
        ? {
            documentCount: bundleSource.documentCount,
            combinedTextLength: bundleSource.combinedTextLength,
          }
        : null,
    [bundleSource],
  );

  const readinessHearingMeta = useMemo(
    () => ({
      hearingDateIso:
        bundleSource?.caseMetadata?.nextHearingIso ?? snapshot?.caseMeta?.hearingNextAt ?? null,
      stage: bundleSource?.header?.stage ?? snapshot?.caseMeta?.caseStage ?? null,
    }),
    [bundleSource, snapshot],
  );

  const evidenceSourceStateInput = useMemo(
    () =>
      bundleSource
        ? {
            documentCount: bundleSource.documentCount,
            combinedTextLength: bundleSource.combinedTextLength,
            snippets: bundleSource.snippets,
            documentRows: bundleSource.documentRows?.map((r) => ({ updatedAt: r.updatedAt })),
            frontMatterScan: bundleSource.frontMatterScan,
          }
        : null,
    [bundleSource],
  );

  const evidenceChangeComparison = useMemo(() => {
    if (reasoningV2Result?.available !== true) return null;
    const current = buildEvidenceChangeSnapshot({
      reasoning: reasoningV2Result,
      clientStress: clientStressForReadiness,
      readinessInput: {
        bundleMeta: readinessBundleMeta,
        hearingMeta: readinessHearingMeta,
        workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
      },
      sourceStateInput: evidenceSourceStateInput ?? undefined,
    });
    const previous = loadEvidenceChangeSnapshot(caseId);
    const outcome = compareEvidenceChanges(previous, current);
    return outcome.available ? outcome : null;
  }, [
    reasoningV2Result,
    clientStressForReadiness,
    readinessBundleMeta,
    readinessHearingMeta,
    bundleSource?.header?.primaryEvalHook,
    evidenceSourceStateInput,
    caseId,
  ]);

  const truthLedger = useMemo((): BundleTruthLedger | null => {
    const text = bundleSource?.frontMatterScan;
    if (!text?.trim()) return null;
    return buildBundleTruthLedger({
      bundleText: text,
      parsedHeader: bundleSource?.header ?? undefined,
    });
  }, [bundleSource]);

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
        matterState,
        bundleText: bundleSource?.frontMatterScan ?? null,
        truthLedger,
      }),
    [snapshot, matter, bundleSource, matterState, truthLedger],
  );

  const clientLabelBase = sanitizeHeaderClient(headerMeta.clientLabel);
  const allegationBase = sanitizeHeaderAllegation(headerMeta.allegation);
  const clientLabel = isCriminalPilotMode() ? cleanPilotHeaderClient(clientLabelBase) : clientLabelBase;

  const pilotOverrides = useMemo(
    () =>
      workflowHeaderOverrides(caseTitle, {
        allegation: allegationBase,
        routeTitle: battleboard?.primary_route?.title,
        bundleText: bundleSource?.frontMatterScan ?? null,
        clientLabel,
      }),
    [caseTitle, allegationBase, clientLabel, battleboard?.primary_route?.title, bundleSource?.frontMatterScan],
  );
  const caseTitleDisplay = safeSolicitorCaseTitle(
    pilotOverrides?.displayTitle ?? pilotOverrides?.title ?? caseTitle,
  );
  const allegation = pilotOverrides?.allegation ?? allegationBase;

  const proofMapResult = useMemo(() => {
    if (!proofMapEnabled) return null;
    return buildProductProofMap({
      frontMatterScan: bundleSource?.frontMatterScan,
      snippets: bundleSource?.snippets,
      combinedTextLength: bundleSource?.combinedTextLength,
      matterLabel: caseTitleDisplay,
      allegation,
      workflowProfileHint: pilotOverrides?.profile ?? bundleSource?.header?.primaryEvalHook ?? null,
    });
  }, [proofMapEnabled, bundleSource, caseTitleDisplay, allegation, pilotOverrides?.profile, bundleSource?.header?.primaryEvalHook]);

  const workflowContext = useMemo(
    () => ({
      caseTitle: caseTitleDisplay,
      allegation,
      routeTitle: battleboard?.primary_route?.title,
      bundleText: bundleSource?.frontMatterScan ?? null,
      clientLabel,
      profileHint: pilotOverrides?.profile ?? null,
    }),
    [caseTitleDisplay, allegation, clientLabel, battleboard?.primary_route?.title, bundleSource?.frontMatterScan, pilotOverrides?.profile],
  );

  const pilotMode = isCriminalPilotMode();
  const { uploadDisabled: pilotUploadDisabled, recordPositionDisabled: pilotRecordPositionHidden } =
    usePilotDemoSession();
  const offenceWordingUnknown = useMemo(() => isUnknownOffenceLabel(allegation), [allegation]);
  const stage = headerMeta.stage;
  const nextHearing = headerMeta.nextHearing;
  const metadataNote = headerMeta.metadataNote;
  const hearingDateIso =
    bundleSource?.caseMetadata?.nextHearingIso ?? snapshot?.caseMeta?.hearingNextAt ?? null;
  const courtLabelDisplay = pilotMode
    ? cleanPilotCourtHeaderCell(headerMeta.court)
    : headerMeta.court?.trim() || undefined;
  const hearingLabelDisplay = pilotMode
    ? cleanPilotHearingHeaderCell(nextHearing, hearingDateIso)
    : nextHearing;

  const filteredBattleboard = useMemo(
    () => filterBattleboardForWorkflowPilot(battleboard, workflowContext),
    [battleboard, workflowContext],
  );

  const existingBattleboardRoute = useMemo(
    () =>
      filteredBattleboard?.primary_route?.title ||
      battleboard?.primary_route?.title ||
      null,
    [filteredBattleboard, battleboard],
  );

  const chaseItemsAll = useMemo(
    () => {
      const profileLabels = workflowDisclosureChaseLabels(workflowContext);
      if (profileLabels?.length) return profileLabels;
      const raw = collectChaseItems({
        snapshotMissing: snapshot?.evidence.missingEvidence,
        proceduralOutstanding: effectiveProceduralSafety?.outstandingItems,
        battleboard,
      });
      return prioritizeWorkflowItems(raw, workflowContext);
    },
    [snapshot, effectiveProceduralSafety, battleboard, workflowContext],
  );

  const chaseItems = useMemo(() => chaseItemsAll.slice(0, 6), [chaseItemsAll]);

  const caseSummary = useMemo(
    () =>
      buildCaseSummarySnippet({
        clientLabel,
        allegation,
        defencePosition: headerMeta.defencePosition,
        complainant: headerMeta.complainant,
        court: headerMeta.court,
        battleboard: filteredBattleboard ?? battleboard,
        chaseItems: chaseItemsAll,
        bundleMg5: bundleSource?.snippets?.mg5,
        bundleCombinedText: bundleSource?.frontMatterScan ?? null,
        primaryPressureRouteLabel: workflowPrimaryRouteTitle(workflowContext),
        pilotMode,
        workflowContext,
      }),
    [
      clientLabel,
      allegation,
      headerMeta,
      battleboard,
      filteredBattleboard,
      chaseItemsAll,
      bundleSource?.snippets?.mg5,
      bundleSource?.frontMatterScan,
      workflowContext,
      pilotMode,
    ],
  );

  const riskLabel = useMemo(() => {
    if (effectiveProceduralSafety?.status === "UNSAFE_TO_PROCEED") return "Procedural — resolve disclosure";
    if (effectiveProceduralSafety?.status === "CONDITIONALLY_UNSAFE") return "Conditional — disclosure gaps";
    if (battleboard?.global_collapse_risks?.length) return "Collapse risks on file — review routes";
    if (battleboard?.overall_status === "needs_review") return "Routes need review";
    if (battleboard?.overall_status === "thin_bundle" && !hasBattleboardMaterial) {
      return "Thin bundle — provisional strategy";
    }
    const tier = snapshot?.analysis.capabilityTier;
    if (tier === "thin" && !hasBattleboardMaterial) return "Thin bundle — provisional strategy";
    if (defencePlan?.risks_pivots_short?.length) return "Strategic risks on file";
    return "Review — standard caution";
  }, [effectiveProceduralSafety, snapshot, defencePlan, battleboard, hasBattleboardMaterial]);

  const positionLabel = useMemo(() => {
    if (hasSavedPosition && savedPosition?.position_text?.trim()) {
      const first =
        savedPosition.position_text.split(/[.!?]/)[0].trim() +
        (savedPosition.position_text.includes(".") ? "." : "");
      return pilotMode ? pilotPositionDisplayLabel(first, workflowContext) : first;
    }
    if (headerMeta.defencePosition) {
      const raw =
        headerMeta.defencePosition.length > 120
          ? `${headerMeta.defencePosition.slice(0, 117)}…`
          : headerMeta.defencePosition;
      return pilotMode ? pilotPositionDisplayLabel(raw, workflowContext) : raw;
    }
    if (pilotMode && !hasSavedPosition) return pilotCaseBrainPositionStatus(false);
    if (battleboard?.position_notice?.includes("not safely recorded")) {
      return "Position not safely recorded yet";
    }
    return "Position not recorded";
  }, [
    hasSavedPosition,
    savedPosition,
    headerMeta.defencePosition,
    pilotMode,
    workflowContext,
    battleboard?.position_notice,
  ]);

  const bundleLabel = useMemo(
    () =>
      formatCaseBundleHealthLabel({
        documentCount: Math.max(
          snapshot?.analysis.docCount ?? 0,
          bundleSource?.documentCount ?? 0,
          snapshot?.evidence.documents?.length ?? 0,
        ),
        combinedTextLength: bundleSource?.combinedTextLength ?? 0,
        capabilityTier: snapshot?.analysis.capabilityTier,
        battleboard,
        documentRows: bundleSource?.documentRows,
        hasBattleboardMaterial,
        bundleTextHint: bundleSource?.frontMatterScan,
      }),
    [snapshot, bundleSource, battleboard, hasBattleboardMaterial],
  );

  const disclosureLabel = snapshot ? formatDisclosureGlance(chaseItemsAll) : "—";

  const positionNoticeOnce = useMemo(() => {
    if (hasSavedPosition) return null;
    const notice = battleboard?.position_notice?.trim();
    if (pilotMode) {
      if (notice) {
        const sanitized = sanitizePilotVisibleLine(notice, workflowContext);
        if (sanitized) return sanitized;
      }
      return pilotRecordPositionHidden
        ? "Defence position not safely recorded yet — position is provisional; confirm client instructions before relying on it."
        : "Defence position not safely recorded yet — record instructions before fixing strategy.";
    }
    if (notice) return notice;
    return "Defence position not safely recorded yet — record instructions before fixing strategy.";
  }, [battleboard, hasSavedPosition, pilotMode, pilotRecordPositionHidden, workflowContext]);

  const workflowDocuments = useMemo(
    () => mapSnapshotToWorkflowDocuments(snapshot),
    [snapshot],
  );

  const immediateActions = useMemo(() => {
    const profileActions = workflowTopNextActions(workflowContext);
    if (profileActions?.length) return profileActions;
    const items: string[] = [];
    if (!hasSavedPosition && !positionNoticeOnce) {
      items.push("Record defence position / take instructions before committing strategy.");
    }
    for (const m of chaseItems.slice(0, 4)) {
      const line = m.startsWith("Chase") ? m : `Chase/record: ${m}`;
      if (!items.includes(line)) items.push(line);
    }
    if (battleboard?.urgent_next_moves?.length) {
      for (const u of battleboard.urgent_next_moves) {
        if (!items.includes(u)) items.push(u);
      }
    }
    if (defencePlan?.next_72_hours?.length) {
      for (const n of defencePlan.next_72_hours.slice(0, 4)) {
        if (!items.includes(n)) items.push(n);
      }
    }
    const defaults = [
      "Review interview recording/transcript against MG5/MG6.",
      "Chase CCTV master, CAD audit, and 999 audio if listed.",
      "Prepare hearing line — conditional only; do not overstate.",
    ];
    for (const d of defaults) {
      if (items.length >= 8) break;
      if (!items.some((i) => i.toLowerCase().includes(d.slice(0, 20).toLowerCase()))) items.push(d);
    }
    return stripRepeatedPositionNotice(items, positionNoticeOnce).slice(0, 8);
  }, [hasSavedPosition, chaseItems, battleboard, defencePlan, positionNoticeOnce, workflowContext]);

  const { evidentialRisks, proceduralRisks, strategicRisks } = useMemo(() => {
    const cols = deriveRiskColumns(
      filteredBattleboard,
      defencePlan,
      snapshot,
      effectiveProceduralSafety,
      chaseItems,
      positionNoticeOnce,
      workflowContext,
    );
    const bundleText = bundleSource?.frontMatterScan ?? null;
    const bundleHay = bundleText ?? "";
    const polishRisk = (lines: string[]) =>
      filterBundleFamilyWarnings(
        lines.map((line) => polishPresentationLine(line, bundleHay)),
        bundleHay,
      );
    return {
      evidentialRisks: polishRisk(filterTemplateSafeLines(cols.evidentialRisks, truthLedger, bundleText, 5)),
      proceduralRisks: polishRisk(filterTemplateSafeLines(cols.proceduralRisks, truthLedger, bundleText, 5)),
      strategicRisks: polishRisk(filterTemplateSafeLines(cols.strategicRisks, truthLedger, bundleText, 5)),
    };
  }, [
    filteredBattleboard,
    defencePlan,
    snapshot,
    effectiveProceduralSafety,
    chaseItems,
    positionNoticeOnce,
    workflowContext,
    truthLedger,
    bundleSource?.frontMatterScan,
  ]);

  const strategyBasisNotice = useMemo(() => {
    const label = snapshot?.analysis.strategyBasisLabel?.trim();
    const reason = snapshot?.analysis.strategyBasisReason?.trim();
    if (!label && !reason) return null;
    if (!offenceWordingUnknown && isStaleOffenceStrategyNotice(label, reason)) return null;
    const pilotLabel = pilotStrategyBasisDisplay(label);
    return {
      label: pilotLabel ?? label ?? "",
      reason: shouldSuppressPilotStrategyBasisReason(label) ? undefined : reason,
    };
  }, [snapshot, offenceWordingUnknown]);

  const prosecutionWeakness = useMemo(() => {
    const fromRoute = filterStaleOffenceWording(
      filterWorkflowPilotLines(battleboard?.primary_route?.why_it_helps ?? [], workflowContext, {
        max: 3,
        useFallbacks: false,
      }),
    );
    const bundleHay = bundleSource?.frontMatterScan ?? "";
    const filtered = filterBundleFamilyWarnings(
      filterTemplateSafeLines(
      fromRoute.length
        ? fromRoute
        : filterStaleOffenceWording(
            filterWorkflowPilotLines(
              [...(defencePlan?.prosecution_pressure ?? []), ...(defencePlan?.winning_angles ?? [])],
              workflowContext,
              { max: 3, useFallbacks: false },
            ),
          ),
      truthLedger,
      bundleSource?.frontMatterScan ?? null,
      3,
      ).map((line) => polishPresentationLine(line, bundleHay)),
      bundleHay,
    );
    if (filtered.length) return filtered;
    return [
      "Outstanding source material may limit how Crown can prove its case — conditional on what is served.",
    ];
  }, [battleboard, defencePlan, workflowContext, truthLedger, bundleSource?.frontMatterScan]);

  const defenceRisks = useMemo(() => {
    const bundleHay = bundleSource?.frontMatterScan ?? "";
    const items = filterBundleFamilyWarnings(
      filterTemplateSafeLines(
      stripRepeatedPositionNotice(
        filterWorkflowPilotLines(
          uniqueStrings(
            filterStaleOffenceWording([
              ...(filteredBattleboard?.primary_route?.collapse_risks ?? []),
              ...(filteredBattleboard?.global_collapse_risks ?? []),
              ...(defencePlan?.risks_if_we_fight ?? []),
              ...(defencePlan?.risks_pivots_short ?? []),
            ]),
          ),
          workflowContext,
          { max: 4 },
        ),
        positionNoticeOnce,
      ),
      truthLedger,
      bundleSource?.frontMatterScan ?? null,
      2,
      ).map((line) => polishPresentationLine(line, bundleHay)),
      bundleHay,
    );
    if (items.length) return items;
    return [
      "Assumed position may conflict with interview or served evidence — solicitor review required.",
    ];
  }, [filteredBattleboard, defencePlan, positionNoticeOnce, workflowContext, truthLedger, bundleSource?.frontMatterScan]);

  const bundlePositionNote = pilotMode ? pilotBundlePositionNote(workflowContext) : null;

  const bestRouteTitleRaw =
    workflowPrimaryRouteTitle(workflowContext) ||
    battleboard?.primary_route?.title ||
    defencePlan?.primary_route?.label ||
    displayStrategy?.displayLabel ||
    (committedStrategy?.primary
      ? String(committedStrategy.primary).replace(/_/g, " ")
      : "Provisional — commit strategy or record position");
  const bestRouteTitle = pilotMode
    ? pilotCleanupVisibleText(
        displayPrimaryRouteTitle(
          bestRouteTitleRaw,
          bundleSource?.frontMatterScan ?? "",
          allegation,
        ),
      )
    : bestRouteTitleRaw;

  const safeCourtLine = useMemo(() => {
    const profileLine = workflowSafeCourtLine(workflowContext);
    let line: string;
    if (profileLine) line = profileLine;
    else {
      const fromRoute = battleboard?.primary_route?.hearing_line?.trim();
      if (fromRoute) line = fromRoute;
      else {
        const summary = battleboard?.solicitor_safe_summary?.trim();
        line = summary
          ? summary.slice(0, 600)
          : "Prepare a conditional hearing line after reviewing served material — do not overstate position or facts.";
      }
    }
    if (pilotMode) {
      return pilotCleanupVisibleText(
        sanitizePilotVisibleLine(line, workflowContext) ?? line,
      );
    }
    return line;
  }, [battleboard, workflowContext, pilotMode]);

  const exitClassic = () => {
    clearControlRoomPreference();
    router.replace(buildClassicCaseHref(caseId));
  };

  const riskOverviewSection = (
    <DashboardCard
      title="Risk & weakness overview"
      icon={<AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
      bodyClassName="py-2"
      className="border-slate-200 bg-white"
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <RiskColumn title="Evidential" items={evidentialRisks} />
        <RiskColumn title="Procedural / disclosure" items={proceduralRisks} />
        <RiskColumn title="Strategic" items={strategicRisks} />
      </div>
    </DashboardCard>
  );

  const battleboardSectionNode =
    showPilotRouteDetailPanel() ? (
      <ControlRoomBattleboardAccordion
        caseId={caseId}
        battleboard={filteredBattleboard}
        battleboardLoading={battleboardLoading}
        variant={surface === "battleboard" ? "full" : "preview"}
        riskOverviewSection={surface === "battleboard" ? riskOverviewSection : undefined}
      />
    ) : null;

  const workflowShellProps = {
    caseId,
    documents: workflowDocuments,
    onRecordPosition: pilotRecordPositionHidden ? undefined : onRecordPosition,
    onUploadEvidence: pilotUploadDisabled ? undefined : onUploadEvidence,
    pilotUploadDisabled,
    pilotRecordPositionHidden,
  };

  const pilotDocCount = bundleSource?.documentCount ?? snapshot?.analysis.docCount ?? 0;
  const pilotTextLen = bundleSource?.combinedTextLength ?? 0;
  const thickPilotBundle = isThickPilotBundle(pilotDocCount, pilotTextLen);

  useEffect(() => {
    if (surface === "papers") {
      setPapersDeepOpen(thickPilotBundle);
    }
  }, [surface, thickPilotBundle]);

  if (surface === "battleboard") {
    return (
      <div className="min-h-0 pb-20 xl:pb-4 text-slate-900" data-testid="case-control-room-battleboard">
        <div className="xl:mr-[min(360px,26vw)] xl:pr-3 max-w-[1400px]">
          {snapshotLoading ? (
            <Card className="p-8 flex items-center justify-center gap-2 text-slate-600 border-slate-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
              Loading case data…
            </Card>
          ) : (
            <CaseWorkflowShell {...workflowShellProps}>
              {battleboardSectionNode ?? (
                <Card className="p-6 border-slate-200 bg-white text-sm text-slate-600">
                  Battleboard routes not available on this layout.
                </Card>
              )}
            </CaseWorkflowShell>
          )}
        </div>
        <ControlRoomAssistantDock
          caseId={caseId}
          planSummary={planSummary}
          evidenceSummary={evidenceSummary}
          timelineSummary={timelineSummary}
          assistantContext={{
            battleboard,
            allegation,
            stage,
            positionNotice: positionNoticeOnce,
            missingEvidence: chaseItemsAll,
            bundleHeader: bundleSource?.header ?? null,
            bundleSnippets: bundleSource?.snippets ?? null,
            fileTextHints: evidenceSummary?.slice(0, 2500),
            primaryRouteTitle: bestRouteTitle,
          }}
        />
      </div>
    );
  }

  if (surface === "position") {
    return (
      <div className="min-h-0 pb-20 xl:pb-4 text-slate-900" data-testid="case-control-room-position">
        <div className="xl:mr-[min(360px,26vw)] xl:pr-3 max-w-[1400px]">
          {snapshotLoading ? (
            <Card className="p-8 flex items-center justify-center gap-2 text-slate-600 border-slate-200 bg-white">
              <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
              Loading case data…
            </Card>
          ) : (
            <CaseWorkflowShell {...workflowShellProps}>
              <DashboardCard
                title="Position & notes"
                bodyClassName="py-3 space-y-2"
                className="border-slate-200 bg-white"
              >
                <p className="text-xs text-slate-500">Current position on file</p>
                <p className="text-sm font-medium text-slate-900">{positionLabel}</p>
                {positionNoticeOnce ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
                    {positionNoticeOnce}
                  </p>
                ) : null}
              </DashboardCard>
              <ClientInstructionsRecorder caseId={caseId} />
            </CaseWorkflowShell>
          )}
        </div>
        <ControlRoomAssistantDock
          caseId={caseId}
          planSummary={planSummary}
          evidenceSummary={evidenceSummary}
          timelineSummary={timelineSummary}
          assistantContext={{
            battleboard,
            allegation,
            stage,
            positionNotice: positionNoticeOnce,
            missingEvidence: chaseItemsAll,
            bundleHeader: bundleSource?.header ?? null,
            bundleSnippets: bundleSource?.snippets ?? null,
            fileTextHints: evidenceSummary?.slice(0, 2500),
            primaryRouteTitle: bestRouteTitle,
          }}
        />
      </div>
    );
  }

  if (surface === "papers") {
    const papersLoader = (
      <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        Loading papers…
      </div>
    );

    const primaryPanels = (
      <>
        <ControlRoomCockpit
          caseId={caseId}
          caseTitle={caseTitleDisplay}
          clientLabel={clientLabel}
          courtLabel={courtLabelDisplay}
          allegation={pilotOverrides ? "" : allegation}
          stage={stage}
          bundleLabel={bundleLabel}
          positionLabel={positionLabel}
          nextHearing={hearingLabelDisplay}
          disclosureLabel={disclosureLabel}
          bestRouteTitle={bestRouteTitle}
          routeStatus={battleboard?.primary_route?.status ?? null}
          prosecutionWeakness={prosecutionWeakness}
          defenceRisks={defenceRisks}
          immediateActions={immediateActions}
          strategyBasisNotice={strategyBasisNotice}
          positionNotice={positionNoticeOnce}
          riskLabel={riskLabel}
          safeCourtLine={safeCourtLine}
          loading={snapshotLoading}
          onExitClassic={exitClassic}
          hideClassicWorkspace={isCriminalPilotMode()}
          metadataNote={pilotDisplayMetadataNote(metadataNote)}
          bundlePositionNote={bundlePositionNote}
          battleboardSection={battleboardSectionNode ?? undefined}
          pilotDark
        />
        {thickPilotBundle ? (
          <PreHearingReadinessBadge
            reasoningV2Enabled={reasoningV2Enabled}
            readinessEnabled={readinessEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            bundleMeta={readinessBundleMeta}
            hearingMeta={readinessHearingMeta}
            workflowProfileHint={bundleSource?.header?.primaryEvalHook ?? null}
            loading={bundleSourceLoading}
          />
        ) : null}
      </>
    );

    const deepPanels = (
      <>
        <ProofMapPanel
          result={proofMapResult}
          loading={bundleSourceLoading}
          proofMapEnabled={proofMapEnabled}
        />
        <EvidenceChangeMaterialBadge
          comparison={evidenceChangeComparison}
          evidenceChangesEnabled={evidenceChangesEnabled}
          reasoningV2Enabled={reasoningV2Enabled}
        />
        <EvidenceChangeDetectorPanel
          caseId={caseId}
          reasoningV2Enabled={reasoningV2Enabled}
          evidenceChangesEnabled={evidenceChangesEnabled}
          reasoningResult={reasoningV2Result}
          clientStressResult={clientStressForReadiness}
          sourceStateInput={evidenceSourceStateInput}
          readinessInput={{
            bundleMeta: readinessBundleMeta,
            hearingMeta: readinessHearingMeta,
            workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
          }}
          loading={bundleSourceLoading}
        />
        <SolicitorExportBuilderPanel
          caseId={caseId}
          caseLabel={caseTitleDisplay}
          clientLabel={clientLabel}
          stage={readinessHearingMeta.stage}
          hearingDateIso={readinessHearingMeta.hearingDateIso}
          reasoningV2Enabled={reasoningV2Enabled}
          exportsEnabled={exportsEnabled}
          reasoningResult={reasoningV2Result}
          clientStressResult={clientStressForReadiness}
          readinessInput={{
            bundleMeta: readinessBundleMeta,
            hearingMeta: readinessHearingMeta,
            workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
          }}
          loading={bundleSourceLoading}
        />
        <SupervisorQAPanel
          caseId={caseId}
          reasoningV2Enabled={reasoningV2Enabled}
          supervisorEnabled={supervisorEnabled}
          exportsEnabled={exportsEnabled}
          reasoningResult={reasoningV2Result}
          clientStressResult={clientStressForReadiness}
          readinessInput={{
            bundleMeta: readinessBundleMeta,
            hearingMeta: readinessHearingMeta,
            workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
          }}
          workflowProfileHint={bundleSource?.header?.primaryEvalHook ?? null}
          loading={bundleSourceLoading}
        />
        <ClientExplanationPanel
          caseId={caseId}
          caseLabel={caseTitleDisplay}
          clientLabel={clientLabel}
          stage={readinessHearingMeta.stage}
          hearingDateIso={readinessHearingMeta.hearingDateIso}
          reasoningV2Enabled={reasoningV2Enabled}
          clientExplainEnabled={clientExplainEnabled}
          reasoningResult={reasoningV2Result}
          clientStressResult={clientStressForReadiness}
          readinessInput={{
            bundleMeta: readinessBundleMeta,
            hearingMeta: readinessHearingMeta,
            workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
          }}
          loading={bundleSourceLoading}
        />
        {reasoningV2Enabled ? (
          <ReasoningV2Panel
            caseId={caseId}
            reasoningV2Enabled={reasoningV2Enabled}
            result={reasoningV2Result}
            loading={bundleSourceLoading}
            existingBattleboardRoute={existingBattleboardRoute}
          />
        ) : null}
        <ClientAccountStressTestPanel
          caseId={caseId}
          clientStressEnabled={clientStressEnabled}
          reasoningV2Enabled={reasoningV2Enabled}
          reasoningResult={reasoningV2Result}
        />
      </>
    );

    return (
      <div className="min-h-0 max-w-[1400px]" data-testid="pilot-papers-view">
        {snapshotLoading ? (
          papersLoader
        ) : (
          <div className="space-y-3">
            {primaryPanels}
            <div className={`${workflowPilotCard} px-4 py-3`}>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 text-left"
                onClick={() => setPapersDeepOpen((v) => !v)}
              >
                <div>
                  <p className={workflowSectionTitle}>
                    {thickPilotBundle ? "Full papers workspace" : "More papers detail"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {thickPilotBundle
                      ? "Proof map, readiness, exports, and supervisor tools — scroll inside this section."
                      : "Proof map, readiness checks, and additional control-room panels."}
                  </p>
                </div>
                {papersDeepOpen ? (
                  <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                )}
              </button>
              {papersDeepOpen ? (
                <div
                  className={`mt-3 border-t border-slate-700/60 pt-3 max-h-[min(70vh,900px)] overflow-y-auto space-y-3 ${pilotPapersDeepScope}`}
                >
                  {deepPanels}
                </div>
              ) : null}
            </div>
            <p className="text-[10px] text-center text-slate-500 pb-1">
              Evidence-linked · conditional · provisional where stated · solicitor review required
            </p>
          </div>
        )}
      </div>
    );
  }

  const defaultRoomPanels = (
    <>
          <CaseSummaryCard summary={caseSummary} loading={snapshotLoading} />
          <ProofMapPanel
            result={proofMapResult}
            loading={bundleSourceLoading}
            proofMapEnabled={proofMapEnabled}
          />
          <SupervisorQAPanel
            compact
            caseId={caseId}
            reasoningV2Enabled={reasoningV2Enabled}
            supervisorEnabled={supervisorEnabled}
            exportsEnabled={exportsEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            readinessInput={{
              bundleMeta: readinessBundleMeta,
              hearingMeta: readinessHearingMeta,
              workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
            }}
            workflowProfileHint={bundleSource?.header?.primaryEvalHook ?? null}
            loading={bundleSourceLoading}
          />
          <ControlRoomCockpit
            caseId={caseId}
            caseTitle={caseTitleDisplay}
            clientLabel={clientLabel}
            courtLabel={courtLabelDisplay}
            allegation={pilotOverrides ? "" : allegation}
            stage={stage}
            bundleLabel={bundleLabel}
            positionLabel={positionLabel}
            nextHearing={hearingLabelDisplay}
            disclosureLabel={disclosureLabel}
            bestRouteTitle={bestRouteTitle}
            routeStatus={battleboard?.primary_route?.status ?? null}
            prosecutionWeakness={prosecutionWeakness}
            defenceRisks={defenceRisks}
            immediateActions={immediateActions}
            strategyBasisNotice={strategyBasisNotice}
            positionNotice={positionNoticeOnce}
            riskLabel={riskLabel}
            safeCourtLine={safeCourtLine}
            loading={snapshotLoading}
            onExitClassic={exitClassic}
            hideClassicWorkspace={isCriminalPilotMode()}
            metadataNote={pilotDisplayMetadataNote(metadataNote)}
            bundlePositionNote={bundlePositionNote}
            battleboardSection={battleboardSectionNode ?? undefined}
          />
          <PreHearingReadinessBadge
            reasoningV2Enabled={reasoningV2Enabled}
            readinessEnabled={readinessEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            bundleMeta={readinessBundleMeta}
            hearingMeta={readinessHearingMeta}
            workflowProfileHint={bundleSource?.header?.primaryEvalHook ?? null}
            loading={bundleSourceLoading}
          />
          <EvidenceChangeMaterialBadge
            comparison={evidenceChangeComparison}
            evidenceChangesEnabled={evidenceChangesEnabled}
            reasoningV2Enabled={reasoningV2Enabled}
          />
          <EvidenceChangeDetectorPanel
            caseId={caseId}
            reasoningV2Enabled={reasoningV2Enabled}
            evidenceChangesEnabled={evidenceChangesEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            sourceStateInput={evidenceSourceStateInput}
            readinessInput={{
              bundleMeta: readinessBundleMeta,
              hearingMeta: readinessHearingMeta,
              workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
            }}
            loading={bundleSourceLoading}
          />
          <SolicitorExportBuilderPanel
            caseId={caseId}
            caseLabel={caseTitleDisplay}
            clientLabel={clientLabel}
            stage={readinessHearingMeta.stage}
            hearingDateIso={readinessHearingMeta.hearingDateIso}
            reasoningV2Enabled={reasoningV2Enabled}
            exportsEnabled={exportsEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            readinessInput={{
              bundleMeta: readinessBundleMeta,
              hearingMeta: readinessHearingMeta,
              workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
            }}
            loading={bundleSourceLoading}
          />
          <SupervisorQAPanel
            caseId={caseId}
            reasoningV2Enabled={reasoningV2Enabled}
            supervisorEnabled={supervisorEnabled}
            exportsEnabled={exportsEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            readinessInput={{
              bundleMeta: readinessBundleMeta,
              hearingMeta: readinessHearingMeta,
              workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
            }}
            workflowProfileHint={bundleSource?.header?.primaryEvalHook ?? null}
            loading={bundleSourceLoading}
          />
          <ClientExplanationPanel
            caseId={caseId}
            caseLabel={caseTitleDisplay}
            clientLabel={clientLabel}
            stage={readinessHearingMeta.stage}
            hearingDateIso={readinessHearingMeta.hearingDateIso}
            reasoningV2Enabled={reasoningV2Enabled}
            clientExplainEnabled={clientExplainEnabled}
            reasoningResult={reasoningV2Result}
            clientStressResult={clientStressForReadiness}
            readinessInput={{
              bundleMeta: readinessBundleMeta,
              hearingMeta: readinessHearingMeta,
              workflowProfileHint: bundleSource?.header?.primaryEvalHook ?? null,
            }}
            loading={bundleSourceLoading}
          />
          {reasoningV2Enabled ? (
            <ReasoningV2Panel
              caseId={caseId}
              reasoningV2Enabled={reasoningV2Enabled}
              result={reasoningV2Result}
              loading={bundleSourceLoading}
              existingBattleboardRoute={existingBattleboardRoute}
            />
          ) : null}
          <ClientAccountStressTestPanel
            caseId={caseId}
            clientStressEnabled={clientStressEnabled}
            reasoningV2Enabled={reasoningV2Enabled}
            reasoningResult={reasoningV2Result}
          />
    </>
  );

  return (
    <div className="min-h-0 pb-20 xl:pb-4 text-slate-900" data-testid="case-control-room">
      <div className={embedInShell ? "max-w-[1400px]" : "xl:mr-[min(360px,26vw)] xl:pr-3 max-w-[1400px]"}>
        {snapshotLoading ? (
          <Card className="p-8 flex items-center justify-center gap-2 text-slate-600 border-slate-200 bg-white">
            <Loader2 className="h-5 w-5 animate-spin text-blue-700" />
            Loading case data…
          </Card>
        ) : embedInShell ? (
          defaultRoomPanels
        ) : (
          <CaseWorkflowShell
            caseId={caseId}
            documents={workflowDocuments}
            onRecordPosition={pilotRecordPositionHidden ? undefined : onRecordPosition}
            onUploadEvidence={pilotUploadDisabled ? undefined : onUploadEvidence}
            pilotUploadDisabled={pilotUploadDisabled}
            pilotRecordPositionHidden={pilotRecordPositionHidden}
          >
          {defaultRoomPanels}
          </CaseWorkflowShell>
        )}

        <p className="text-[10px] text-center text-slate-500 pb-1 mt-4">
          Evidence-linked · conditional · provisional where stated · solicitor review required · no predictions
        </p>
      </div>

      {!embedInShell ? (
      <ControlRoomAssistantDock
        caseId={caseId}
        planSummary={planSummary}
        evidenceSummary={evidenceSummary}
        timelineSummary={timelineSummary}
        assistantContext={{
          battleboard,
          allegation,
          stage,
          positionNotice: positionNoticeOnce,
          missingEvidence: chaseItemsAll,
          bundleHeader: bundleSource?.header ?? null,
          bundleSnippets: bundleSource?.snippets ?? null,
          fileTextHints: evidenceSummary?.slice(0, 2500),
          primaryRouteTitle: bestRouteTitle,
        }}
      />
      ) : null}
    </div>
  );
}

function isUnknownOffenceLabel(label: string | null | undefined): boolean {
  if (!label?.trim()) return true;
  const l = label.trim().toLowerCase();
  return (
    l.startsWith("unknown") ||
    l.includes("add charge sheet") ||
    l === "allegation not recorded" ||
    l.startsWith("offence wording not safely extracted")
  );
}

function isStaleOffenceStrategyNotice(label: string | undefined, reason: string | undefined): boolean {
  const r = reason?.trim().toLowerCase() ?? "";
  const l = label?.trim().toLowerCase() ?? "";
  if (r === "offence not identified." || r === "offence not identified") return true;
  if (r.includes("offence not identified")) return true;
  if (l.includes("add charge sheet or key evidence for offence-specific")) return true;
  return false;
}

function filterStaleOffenceWording(items: string[]): string[] {
  return items.filter((item) => {
    const t = item?.trim();
    if (!t) return false;
    const l = t.toLowerCase();
    if (l === "offence not identified." || l === "offence not identified") return false;
    if (l.includes("offence not identified")) return false;
    if (l === "put prosecution to proof on each element — check charge wording on file.") return false;
    if (l.includes("put prosecution to proof on each element") && l.includes("check charge wording")) {
      return false;
    }
    return true;
  });
}

function battleboardHasMaterial(bb: BattleboardOutput | null): boolean {
  if (!bb) return false;
  if (bb.primary_route?.evidence_anchors?.length) return true;
  return bb.routes.some((r) => r.evidence_anchors.length > 0);
}

function resolveAllegationLabel(
  snapshot: CaseSnapshot | null,
  matter: MatterSummary | null,
  battleboard: BattleboardOutput | null,
  bundleSource: BundleSourceSummary | null,
): string {
  const candidates: (string | null | undefined)[] = [
    snapshot?.resolvedOffence?.label,
    matter?.allegedOffence,
    snapshot?.charges?.[0]?.offence,
    bundleSource?.header?.shortTitle,
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t && !isUnknownOffenceLabel(t)) return t;
  }
  if (battleboardHasMaterial(battleboard) || (bundleSource?.combinedTextLength ?? 0) > 0) {
    return "Offence wording not safely extracted yet — check charge sheet / MG5 header on file.";
  }
  return "Offence wording not safely extracted yet";
}

function isProceduralRisk(text: string): boolean {
  return /\b(disclosure|mg6|continuity|chase|served|outstanding|pace|custody|procedural|cad|cctv|999|exhibit|bundle|disclose)\b/i.test(
    text,
  );
}

function isStrategicRisk(text: string): boolean {
  return /\b(position|route|strategy|commit|provisional|assumed|hearing line|collapse)\b/i.test(text);
}

function deriveRiskColumns(
  battleboard: BattleboardOutput | null,
  defencePlan: DefenceStrategyPlan | null,
  snapshot: CaseSnapshot | null,
  proceduralSafety: ProceduralSafety,
  chaseItems: string[],
  positionNotice: string | null,
  workflowContext?: {
    caseTitle?: string | null;
    allegation?: string | null;
    routeTitle?: string | null;
    bundleText?: string | null;
  },
): { evidentialRisks: string[]; proceduralRisks: string[]; strategicRisks: string[] } {
  const raw: string[] = stripRepeatedPositionNotice(
    uniqueStrings(
      filterWorkflowPilotLines(
        [
          ...(battleboard?.primary_route?.collapse_risks ?? []),
          ...(battleboard?.global_collapse_risks ?? []),
          ...(defencePlan?.kill_switches?.map((k) => k.if) ?? []),
          ...(defencePlan?.risks_if_we_fight ?? []),
          ...(defencePlan?.risks_pivots_short ?? []),
          ...(defencePlan?.risks_fallbacks ?? []),
          ...(snapshot?.strategy.pressurePoints?.map((p) => p.label) ?? []),
          ...(proceduralSafety?.outstandingItems ?? []),
          ...chaseItems.map((m) => `Outstanding: ${m}`),
          ...(defencePlan?.disclosure_weapon_steps ?? []),
        ],
        workflowContext ?? {},
        { max: 24, useFallbacks: false },
      ),
    ),
    positionNotice,
  );

  const evidential: string[] = [];
  const procedural: string[] = [];
  const strategic: string[] = [];

  for (const item of raw) {
    if (isProceduralRisk(item)) procedural.push(item);
    else if (isStrategicRisk(item)) strategic.push(item);
    else evidential.push(item);
  }

  if (evidential.length === 0 && battleboard?.primary_route?.collapse_risks?.length) {
    evidential.push(
      ...filterWorkflowPilotLines(battleboard.primary_route.collapse_risks, workflowContext ?? {}, {
        max: 3,
      }),
    );
  }
  if (strategic.length === 0 && battleboard?.global_collapse_risks?.length) {
    for (const g of filterWorkflowPilotLines(battleboard.global_collapse_risks, workflowContext ?? {}, {
      max: 3,
    })) {
      if (isStrategicRisk(g)) strategic.push(g);
      else if (!procedural.includes(g) && !evidential.includes(g)) evidential.push(g);
    }
  }

  return {
    evidentialRisks: uniqueStrings(evidential).slice(0, 5),
    proceduralRisks: uniqueStrings(procedural).slice(0, 5),
    strategicRisks: uniqueStrings(strategic).slice(0, 5),
  };
}

function uniqueStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const s = raw?.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

