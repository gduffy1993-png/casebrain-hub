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
import { usePilotMatterTabHref } from "@/components/criminal/workflow/pilotDeskNavContext";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { OverviewAdvancedPanel } from "./OverviewAdvancedPanel";
import { OverviewCaseHeaderStrip } from "./OverviewCaseHeaderStrip";
import { OverviewClientSummaryCard } from "./OverviewClientSummaryCard";
import { OverviewCourtPrepCard } from "./OverviewCourtPrepCard";
import { OverviewEvidenceGapsCard } from "./OverviewEvidenceGapsCard";
import { OverviewProofDepthDrawer } from "./OverviewProofDepthDrawer";
import { OverviewSafeWordingCard } from "./OverviewSafeWordingCard";
import { OverviewSnapshotBoxes } from "./OverviewSnapshotBoxes";
import { EvidenceTruthMapPanel } from "./EvidenceTruthMapPanel";
import { ProofReceiptPanel } from "./ProofReceiptPanel";
import { buildProofReceiptView } from "@/lib/criminal/proof-receipt";
import { humanizeEvidenceLabel } from "./evidence-display";
import {
  ensureDigitalHarassmentGapRows,
  filterBundleFamilyWarnings,
  polishPresentationBlock,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";
import {
  countEvidenceStates,
  dedupeEvidenceRowsByLabel,
  dedupePresentationLines,
  filterFamilyProofCardsForBundle,
  gapEvidenceRows,
  overviewBlockedExamples,
  overviewStatusLabel,
  servedEvidenceRows,
} from "@/lib/criminal/overview-presentation";
import { useMemo } from "react";

export function FiveAnswersView({ caseId }: { caseId: string }) {
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
    briefPlan,
    primaryRouteTitle,
    bundleMeta,
  } = useMatterBrief(caseId);
  const buildTabHref = usePilotMatterTabHref();
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
    const built = buildFiveAnswersView({
      allegation: allegation ?? "",
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      bundleText: bundleMeta?.frontMatterScan ?? undefined,
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
  }, [warRoom, chase, allegation, matterConfidence, filteredDoNotOverstate, bundleMeta?.frontMatterScan, bundleHay]);

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
    return buildHearingMode({
      allegation: allegation ?? "",
      briefPlan,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      primaryRouteTitle: primaryRouteTitle ? polishPresentationLine(primaryRouteTitle, bundleHay) : primaryRouteTitle,
      documentCount: bundleMeta?.documentCount ?? 0,
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
  ]);

  const exportPack = useMemo(() => {
    if (!warRoom || !chase) return null;
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

  if (loading && !view) {
    return (
      <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        <span className="text-sm">Loading case overview…</span>
      </div>
    );
  }

  if (!view || !matterConfidence || !chase) {
    return (
      <div className={`${workflowPilotCard} p-6 text-sm text-slate-400 space-y-2`}>
        <p>Case overview will appear once documents are processed.</p>
      </div>
    );
  }

  const served = servedEvidenceRows(view.evidenceState.rows);
  const gaps = gapEvidenceRows(view.evidenceState.rows);
  const stateCounts = countEvidenceStates(view.evidenceState.rows);
  const topChase = view.chase.slice(0, 5).map((c) => polishPresentationLine(c.label, bundleHay));
  const riskFlags = overviewBlockedExamples(view.mustNotOverstate, 3);
  const blockedExamples = overviewBlockedExamples(view.mustNotOverstate, 2);
  const status = overviewStatusLabel(matterConfidence.level);
  const clientSummarySection = exportPack?.sections.find((s) => s.id === "client_summary");
  const clientSummaryText = clientSummarySection
    ? polishPresentationBlock(displayCopyBody(clientSummarySection.textForClipboard), bundleHay)
    : null;

  const safeToSay = [
    view.caseSaying.mainIssue ? polishPresentationLine(view.caseSaying.mainIssue, bundleHay) : "",
    served.length
      ? `${served
          .slice(0, 2)
          .map((r) => humanizeEvidenceLabel(r.label, r.existence))
          .join("; ")} on papers (check before reliance).`
      : "Limited papers — keep the position provisional.",
  ].filter(Boolean);

  const courtChaseLabels =
    hearingMode?.topChaseItems.map((i) => polishPresentationLine(i.label, bundleHay)) ?? topChase;

  return (
    <div className="space-y-3" data-testid="five-answers-view">
      <div id="overview-understand" className="space-y-3 scroll-mt-4">
        <OverviewCaseHeaderStrip
          defendant={clientLabel?.trim() || "Client"}
          offence={allegation?.trim() || view.caseSaying.allegation || "Offence not confirmed"}
          court={courtLabel?.trim() || "Court not confirmed"}
          hearing={hearingLabel?.trim() || "Hearing not confirmed"}
          statusLabel={status.label}
          statusVariant={status.variant}
        />

        <section className={`${workflowPilotCard} px-3 py-2.5 sm:px-4`} data-testid="five-answers-case-saying">
          <p className={`${workflowSectionTitle} mb-1`}>Main issue</p>
          <p className="text-sm text-slate-200 leading-relaxed line-clamp-4">
            {polishPresentationLine(view.caseSaying.mainIssue, bundleHay)}
          </p>
        </section>

        <OverviewSnapshotBoxes
          servedCount={stateCounts.served}
          referredCount={stateCounts.referred}
          missingCount={stateCounts.missing}
          topChaseLabels={topChase.map((label) => humanizeEvidenceLabel(label, "missing"))}
          riskFlags={riskFlags}
        />

        <OverviewSafeWordingCard safeToSay={safeToSay} notSafeToSay={blockedExamples} />

        {hearingMode ? (
          <OverviewCourtPrepCard
            courtLine={hearingMode.safeCourtLine.text}
            courtFooter={hearingMode.safeCourtLine.footer}
            sendabilityLabel={hearingMode.safeCourtLine.sendabilityLabel}
            topChaseLabels={courtChaseLabels}
            courtHref={buildTabHref(caseId, "today")}
            chaseHref={buildTabHref(caseId, "disclosure-chase")}
          />
        ) : null}

        <OverviewClientSummaryCard
          summaryText={clientSummaryText}
          summaryHref={buildTabHref(caseId, "summary")}
        />

        <OverviewEvidenceGapsCard gaps={gaps} />

        <OverviewProofDepthDrawer>
          <EvidenceTruthMapPanel rows={view.evidenceState.rows} />
          <ProofReceiptPanel
            model={proofReceipts!}
            evidenceRows={view.evidenceState.rows}
            warnings={view.mustNotOverstate}
          />
        </OverviewProofDepthDrawer>
      </div>

      <div id="overview-review" className="scroll-mt-4 space-y-3">
        <OverviewAdvancedPanel>
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
