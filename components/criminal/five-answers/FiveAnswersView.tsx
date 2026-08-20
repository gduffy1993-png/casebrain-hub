"use client";

import { Loader2 } from "lucide-react";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildDecisionBoard } from "@/lib/criminal/decision-board/build-decision-board";
import { buildHearingMode } from "@/lib/criminal/hearing-mode";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { DefenceDecisionBoard } from "@/components/criminal/decision-board/DefenceDecisionBoard";
import { AdviceChangeRadarPanel } from "@/components/criminal/advice-change-radar/AdviceChangeRadarPanel";
import { RerunDiffPanel } from "@/components/criminal/re-run-diff/RerunDiffPanel";
import { ConfidenceDashboardPanel } from "@/components/criminal/confidence-dashboard/ConfidenceDashboardPanel";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import { displayCopyBody } from "@/lib/criminal/five-answers/display-labels";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { workflowPilotCard } from "@/components/criminal/workflow/workflowUi";
import { OverviewAdvancedPanel } from "./OverviewAdvancedPanel";
import { OverviewProofDepthDrawer } from "./OverviewProofDepthDrawer";
import { OverviewLegalIntelligenceCard } from "./OverviewLegalIntelligenceCard";
import { OverviewWorkspaceHeader } from "./OverviewWorkspaceHeader";
import { OverviewWhatNeedsAttention } from "./OverviewWhatNeedsAttention";
import { OverviewSelectedIssue } from "./OverviewSelectedIssue";
import { OverviewSummaryCards } from "./OverviewSummaryCards";
import { EvidenceTruthMapPanel } from "./EvidenceTruthMapPanel";
import { ProofReceiptPanel } from "./ProofReceiptPanel";
import { buildProofReceiptView } from "@/lib/criminal/proof-receipt";
import {
  ensureDigitalHarassmentGapRows,
  filterBundleFamilyWarnings,
  polishPresentationBlock,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";
import {
  dedupeEvidenceRowsByLabel,
  dedupePresentationLines,
  filterFamilyProofCardsForBundle,
} from "@/lib/criminal/overview-presentation";
import { buildOverviewWorkspaceVm } from "@/lib/criminal/overview-workspace";
import { useEffect, useMemo, useState } from "react";

export function overviewServedEvidenceLine(label: string): string {
  const clean = label.replace(/\s+/g, " ").trim().replace(/\.+$/g, "");
  if (!clean) return "";
  if (/\b(?:stops mid-narrative|continuation page|truncated extract|partial extract)\b/i.test(clean)) {
    return "Source extract appears incomplete — check the full served document before relying on this point.";
  }
  if (/\b(?:outstanding|not served|needs checking|referred to)\b/i.test(clean)) {
    return `${clean} — do not rely on it without checking the source.`;
  }
  if (/\bon file\b/i.test(clean) || /\bserved\b/i.test(clean)) {
    return `${clean} — check before relying on it.`;
  }
  return `${clean} appears on the papers — check before relying on it.`;
}

export function FiveAnswersView({ caseId }: { caseId: string }) {
  const [showLimitedLoadingFallback, setShowLimitedLoadingFallback] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showAllIssues, setShowAllIssues] = useState(false);
  const {
    loading,
    matterConfidence,
    doNotOverstate,
    warRoom,
    chase,
    allegation,
    clientLabel,
    courtLabel,
    hearingLabel,
    hearingStatusResolved,
    briefPlan,
    primaryRouteTitle,
    bundleMeta,
    outputIntegrity,
    canonical,
    evidenceRowsOverride,
    canonicalAuthority,
    suppressChaseDerivedEvidence,
    legalIntelligence,
    overviewConsiderations,
  } = useMatterBrief(caseId);

  useEffect(() => {
    setShowLimitedLoadingFallback(false);
    if (!loading) return;
    const timer = window.setTimeout(() => setShowLimitedLoadingFallback(true), 6000);
    return () => window.clearTimeout(timer);
  }, [caseId, loading]);
  const bundleHay = useMemo(
    () =>
      [
        bundleMeta?.frontMatterScan ?? "",
        allegation ?? "",
        ...(chase?.primaryItems ?? []).map((i) => `${i.label} ${i.whyItMatters ?? ""}`),
      ].join(" "),
    [bundleMeta?.frontMatterScan, allegation, chase?.primaryItems],
  );
  const filteredDoNotOverstate = useMemo(
    () => filterBundleFamilyWarnings(doNotOverstate, bundleHay),
    [doNotOverstate, bundleHay],
  );

  const view = useMemo(() => {
    if (!warRoom || !chase) return null;
    // Authenticated production: never silently rebuild factual evidence from Chase when
    // canonical is pending/unavailable (CB-HIST-AUTHENTICATED-CANONICAL-FAILURE-MUST-NOT-FALLBACK-TO-CHASE-TRUTH).
    if (suppressChaseDerivedEvidence || evidenceRowsOverride === undefined) {
      return null;
    }
    const built = buildFiveAnswersView({
      allegation: allegation ?? "",
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      bundleText: bundleMeta?.frontMatterScan ?? undefined,
      // Pass through [] / rows unchanged — never convert authoritative [] to undefined.
      evidenceRowsOverride,
      canonicalFindings: canonical?.findingSummaries,
    });

    const gapRowsPolished = ensureDigitalHarassmentGapRows(
      built.evidenceState.rows,
      bundleHay,
      allegation ?? "",
    );

    return {
      ...built,
      evidenceState: { ...built.evidenceState, rows: dedupeEvidenceRowsByLabel(gapRowsPolished) },
      mustNotOverstate: dedupePresentationLines(
        built.mustNotOverstate.map((line) => polishPresentationLine(line, bundleHay)),
      ),
    };
  }, [
    warRoom,
    chase,
    allegation,
    matterConfidence,
    filteredDoNotOverstate,
    bundleMeta?.frontMatterScan,
    bundleHay,
    evidenceRowsOverride,
    canonical?.findingSummaries,
    suppressChaseDerivedEvidence,
  ]);

  const decisionBoard = useMemo(() => {
    if (!briefPlan || !warRoom || !chase) return null;
    return buildDecisionBoard({
      briefPlan,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
    });
  }, [briefPlan, warRoom, chase, matterConfidence, filteredDoNotOverstate]);

  const hearingMode = useMemo(() => {
    if (!briefPlan || !warRoom || !chase) return null;
    if (suppressChaseDerivedEvidence || evidenceRowsOverride === undefined) return null;
    return buildHearingMode({
      allegation: allegation ?? "",
      briefPlan,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      primaryRouteTitle: primaryRouteTitle ? polishPresentationLine(primaryRouteTitle, bundleHay) : primaryRouteTitle,
      documentCount: bundleMeta?.documentCount ?? 0,
      evidenceRowsOverride,
    });
  }, [
    briefPlan,
    warRoom,
    chase,
    allegation,
    matterConfidence,
    filteredDoNotOverstate,
    primaryRouteTitle,
    bundleMeta?.documentCount,
    bundleHay,
    evidenceRowsOverride,
    suppressChaseDerivedEvidence,
  ]);

  const exportPack = useMemo(() => {
    if (!warRoom || !chase) return null;
    if (suppressChaseDerivedEvidence || evidenceRowsOverride === undefined) return null;
    const appVersion =
      typeof process !== "undefined" && process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
        ? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 12)
        : null;
    return buildExportPack({
      caseId,
      allegation: allegation ?? "",
      warRoom,
      chase,
      briefPlan,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      primaryRouteTitle: primaryRouteTitle ? polishPresentationLine(primaryRouteTitle, bundleHay) : primaryRouteTitle,
      appVersion,
      evidenceRowsOverride,
    });
  }, [
    caseId,
    warRoom,
    chase,
    allegation,
    briefPlan,
    matterConfidence,
    filteredDoNotOverstate,
    primaryRouteTitle,
    bundleHay,
    evidenceRowsOverride,
    suppressChaseDerivedEvidence,
  ]);

  const proofReceipts = useMemo(() => {
    if (!view) return null;
    const model = buildProofReceiptView({
      view,
      chase: chase ?? null,
      bundleHay,
      allegation: allegation ?? "",
    });
    return {
      ...model,
      familyCards: filterFamilyProofCardsForBundle(model.familyCards, bundleHay, allegation ?? ""),
    };
  }, [view, chase, bundleHay, allegation]);

  const clientSummaryText = useMemo(() => {
    const clientSummarySection = exportPack?.sections.find((s) => s.id === "client_summary");
    return clientSummarySection
      ? polishPresentationBlock(displayCopyBody(clientSummarySection.textForClipboard), bundleHay)
      : null;
  }, [exportPack, bundleHay]);

  const courtLineText = useMemo(() => {
    if (!hearingMode) return "";
    return polishPresentationLine(
      displayCopyBody(hearingMode.safeCourtLine.text, hearingMode.safeCourtLine.footer ?? undefined),
      bundleHay,
    );
  }, [hearingMode, bundleHay]);

  const workspaceVm = useMemo(() => {
    if (!view || !matterConfidence || !chase) return null;
    return buildOverviewWorkspaceVm({
      caseId,
      clientLabel,
      chargeLabel: allegation,
      courtLabel,
      hearingLabel,
      stageLabel: hearingStatusResolved?.statusLabel ?? null,
      matterConfidence,
      evidenceRows: view.evidenceState.rows,
      chaseItems: chase.primaryItems ?? [],
      contradictions: view.contradictions,
      legalIntelligence,
      overviewConsiderations: overviewConsiderations ?? [],
      safeCourtLine: courtLineText || hearingMode?.safeCourtLine.text || null,
      safeCourtLineCanCopy: Boolean(hearingMode?.safeCourtLine.canCopy),
      clientSummary: clientSummaryText,
    });
  }, [
    view,
    matterConfidence,
    chase,
    caseId,
    clientLabel,
    allegation,
    courtLabel,
    hearingLabel,
    hearingStatusResolved?.statusLabel,
    legalIntelligence,
    overviewConsiderations,
    courtLineText,
    hearingMode,
    clientSummaryText,
  ]);

  useEffect(() => {
    if (!workspaceVm?.issues.length) {
      setSelectedIssueId(null);
      return;
    }
    if (!selectedIssueId || !workspaceVm.issues.some((i) => i.id === selectedIssueId)) {
      setSelectedIssueId(workspaceVm.issues[0]!.id);
    }
  }, [workspaceVm, selectedIssueId]);

  if (loading && !view && !showLimitedLoadingFallback) {
    return (
      <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        <span className="text-sm">Loading case overview…</span>
      </div>
    );
  }

  if (loading && !view && showLimitedLoadingFallback) {
    return (
      <div className={`${workflowPilotCard} p-6 text-sm text-slate-500 space-y-3`}>
        <p className="font-semibold text-slate-900">Overview not ready yet.</p>
        <p>
          CaseBrain is still checking the uploaded papers. Do not treat this matter as reviewed until the
          overview loads or a solicitor checks the Papers and File tabs.
        </p>
        <p className="text-xs text-slate-400">
          Next step: reopen this tab after processing, or use the source papers to record the hearing
          position manually.
        </p>
      </div>
    );
  }

  if (!loading && suppressChaseDerivedEvidence && canonicalAuthority === "unavailable") {
    return (
      <div
        className={`${workflowPilotCard} p-6 text-sm text-slate-500 space-y-3`}
        data-testid="five-answers-canonical-unavailable"
      >
        <p className="font-semibold text-slate-900">Canonical evidence unavailable</p>
        <p>
          CaseBrain could not load the reconciled evidence state for this matter. Factual evidence
          rows are not reconstructed from Chase while that authority is missing.
        </p>
        <p className="text-xs text-slate-400">
          Retry the overview after the papers finish loading, or review Papers / File from the source
          documents. Do not treat Chase wording as a substitute evidence state.
        </p>
      </div>
    );
  }

  if (!view || !matterConfidence || !chase || !workspaceVm) {
    return (
      <div className={`${workflowPilotCard} p-6 text-sm text-slate-400 space-y-2`}>
        <p>Case overview will appear once documents are processed.</p>
      </div>
    );
  }

  const selectedIndex = workspaceVm.issues.findIndex((i) => i.id === selectedIssueId);
  const selectedIssue = selectedIndex >= 0 ? workspaceVm.issues[selectedIndex]! : null;

  return (
    <div className="space-y-3" data-testid="five-answers-view">
      <div id="overview-understand" className="space-y-3 scroll-mt-4">
        <OverviewWorkspaceHeader vm={workspaceVm} />

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
          <OverviewWhatNeedsAttention
            issues={workspaceVm.issues}
            selectedId={selectedIssue?.id ?? null}
            onSelect={setSelectedIssueId}
            showAll={showAllIssues}
            onToggleShowAll={() => setShowAllIssues((v) => !v)}
          />
          <OverviewSelectedIssue
            issue={selectedIssue}
            hasPrev={selectedIndex > 0}
            hasNext={selectedIndex >= 0 && selectedIndex < workspaceVm.issues.length - 1}
            onPrev={() => {
              if (selectedIndex > 0) setSelectedIssueId(workspaceVm.issues[selectedIndex - 1]!.id);
            }}
            onNext={() => {
              if (selectedIndex >= 0 && selectedIndex < workspaceVm.issues.length - 1) {
                setSelectedIssueId(workspaceVm.issues[selectedIndex + 1]!.id);
              }
            }}
          />
        </div>

        <OverviewSummaryCards vm={workspaceVm} />

        <OverviewProofDepthDrawer integrity={outputIntegrity}>
          <EvidenceTruthMapPanel rows={view.evidenceState.rows} />
          <ProofReceiptPanel
            model={proofReceipts!}
            evidenceRows={view.evidenceState.rows}
            warnings={view.mustNotOverstate}
            depthOnly
          />
        </OverviewProofDepthDrawer>
      </div>

      <div id="overview-review" className="scroll-mt-4 space-y-3">
        <OverviewAdvancedPanel integrity={outputIntegrity}>
          {legalIntelligence ? (
            <OverviewLegalIntelligenceCard
              legalIntelligence={legalIntelligence}
              overviewConsiderations={overviewConsiderations ?? []}
            />
          ) : null}
          {warRoom && chase ? (
            <ConfidenceDashboardPanel
              caseId={caseId}
              view={view}
              chase={chase}
              briefPlan={briefPlan}
              warRoom={warRoom}
              matterConfidence={matterConfidence}
              exportPack={exportPack}
              documentCount={bundleMeta?.documentCount ?? 0}
              bundleMeta={bundleMeta}
              primaryRouteTitle={primaryRouteTitle}
            />
          ) : null}
          {decisionBoard ? <DefenceDecisionBoard model={decisionBoard} caseId={caseId} /> : null}
          {warRoom && chase && briefPlan ? (
            <AdviceChangeRadarPanel
              caseId={caseId}
              warRoom={warRoom}
              chase={chase}
              briefPlan={briefPlan}
              matterConfidence={matterConfidence}
              primaryRouteTitle={primaryRouteTitle}
              bundleMeta={bundleMeta}
            />
          ) : null}
          {warRoom && chase ? (
            <RerunDiffPanel
              caseId={caseId}
              view={view}
              chase={chase}
              matterConfidence={matterConfidence}
              documentCount={bundleMeta?.documentCount ?? 0}
              exportPack={exportPack}
            />
          ) : null}
          <div className="flex justify-end px-3">
            <H5FeedbackFlag
              caseId={caseId}
              surface="five_answers"
              section="overview"
              sendability={matterConfidence.summarySendability ?? null}
            />
          </div>
        </OverviewAdvancedPanel>
      </div>
    </div>
  );
}
