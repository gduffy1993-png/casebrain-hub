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
  dedupeEvidenceRowsByLabel,
  dedupePresentationLines,
  filterFamilyProofCardsForBundle,
  gapEvidenceRows,
  overviewBlockedExamples,
  overviewRiskFlagPointers,
  servedEvidenceRows,
} from "@/lib/criminal/overview-presentation";
import {
  collapseDontSayMg11WitnessLines,
  polishChasePreviewLabel,
  solicitorLinesNearlyEqual,
} from "@/lib/criminal/solicitor-display-dedupe";
import { adaptFiveAnswersAndChaseToCanonical } from "@/lib/criminal/canonical-matter-state";
import { useEffect, useMemo, useState } from "react";
import { useDemoOverviewShell } from "@/components/criminal/demo-shell/useDemoOverviewShell";
import { DemoOverviewView } from "@/components/criminal/demo-shell/DemoOverviewView";

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
  const demoShell = useDemoOverviewShell();
  if (demoShell) {
    return <DemoOverviewView caseId={caseId} />;
  }
  return <FiveAnswersViewClassic caseId={caseId} />;
}

function FiveAnswersViewClassic({ caseId }: { caseId: string }) {
  const [showLimitedLoadingFallback, setShowLimitedLoadingFallback] = useState(false);
  const {
    loading,
    matterConfidence,
    doNotOverstate,
    warRoom,
    chase,
    allegation,
    briefPlan,
    primaryRouteTitle,
    bundleMeta,
    outputIntegrity,
    canonical,
    evidenceRowsOverride,
  } = useMatterBrief(caseId);
  const buildTabHref = usePilotMatterTabHref();

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
    const built = buildFiveAnswersView({
      allegation: allegation ?? "",
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      bundleText: bundleMeta?.frontMatterScan ?? undefined,
      evidenceRowsOverride: evidenceRowsOverride?.length ? evidenceRowsOverride : undefined,
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
  }, [warRoom, chase, allegation, matterConfidence, filteredDoNotOverstate, bundleMeta?.frontMatterScan, bundleHay, evidenceRowsOverride, canonical?.findingSummaries]);

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

  if (!view || !matterConfidence || !chase) {
    return (
      <div className={`${workflowPilotCard} p-6 text-sm text-slate-400 space-y-2`}>
        <p>Case overview will appear once documents are processed.</p>
      </div>
    );
  }

  const served = servedEvidenceRows(view.evidenceState.rows);
  const gaps = gapEvidenceRows(view.evidenceState.rows);
  const canonicalMatter = adaptFiveAnswersAndChaseToCanonical({
    caseId,
    allegation,
    bundleHay,
    provisional: matterConfidence.level !== "safe",
    evidenceRows: view.evidenceState.rows,
    chase,
  });
  const stateCounts = canonicalMatter.evidence.counts;
  const topChase = dedupePresentationLines(
    view.chase
      .slice(0, 5)
      .map((c) => polishChasePreviewLabel(polishPresentationLine(c.label, bundleHay)))
      .filter((label): label is string => Boolean(label)),
  );
  const blockedExamples = collapseDontSayMg11WitnessLines(
    overviewBlockedExamples(view.mustNotOverstate, 4),
  ).slice(0, 2);
  const riskFlags = overviewRiskFlagPointers(blockedExamples);
  const clientSummarySection = exportPack?.sections.find((s) => s.id === "client_summary");
  const clientSummaryText = clientSummarySection
    ? polishPresentationBlock(displayCopyBody(clientSummarySection.textForClipboard), bundleHay)
    : null;

  const courtLineText = hearingMode
    ? polishPresentationLine(
        displayCopyBody(hearingMode.safeCourtLine.text, hearingMode.safeCourtLine.footer ?? undefined),
        bundleHay,
      )
    : "";
  const mainIssueText = polishPresentationLine(view.caseSaying.mainIssue, bundleHay);
  const mainIssueDistinct = !courtLineText || !solicitorLinesNearlyEqual(mainIssueText, courtLineText);

  const servedDisplayLabels = dedupePresentationLines(
    served
      .map((r) => humanizeEvidenceLabel(r.label, r.existence))
      .filter(Boolean),
  ).slice(0, 2);
  const safeToSay = dedupePresentationLines(
    [
      mainIssueDistinct ? mainIssueText : "",
      ...(servedDisplayLabels.length
        ? servedDisplayLabels.map(overviewServedEvidenceLine)
        : ["Limited papers — keep the position provisional."]),
    ].filter(Boolean),
  );

  return (
    <div className="space-y-3" data-testid="five-answers-view">
      <div id="overview-understand" className="space-y-3 scroll-mt-4">
        {/* Shell strip owns defendant / charge / court / provisional badge — no inner repeat. */}

        {mainIssueDistinct ? (
          <section className={`${workflowPilotCard} px-3 py-2.5 sm:px-4`} data-testid="five-answers-case-saying">
            <p className={`${workflowSectionTitle} mb-1`}>Main issue</p>
            <p className="text-sm text-slate-200 leading-relaxed line-clamp-4">{mainIssueText}</p>
          </section>
        ) : null}

        <OverviewSnapshotBoxes
          evidenceCounts={stateCounts}
          topChaseLabels={dedupePresentationLines(
            topChase.map((label) => humanizeEvidenceLabel(label, "missing")).filter(Boolean),
          )}
          riskFlags={riskFlags}
          canonicalFingerprint={canonicalMatter.fingerprint}
        />

        <OverviewSafeWordingCard safeToSay={safeToSay} notSafeToSay={blockedExamples} />

        {hearingMode ? (
          <OverviewCourtPrepCard
            courtLine={courtLineText || hearingMode.safeCourtLine.text}
            courtFooter={hearingMode.safeCourtLine.footer}
            sendabilityLabel={hearingMode.safeCourtLine.sendabilityLabel}
            topChaseLabels={topChase}
            hideChasePreview
            courtHref={buildTabHref(caseId, "today")}
            chaseHref={buildTabHref(caseId, "disclosure-chase")}
          />
        ) : null}

        <OverviewClientSummaryCard
          summaryText={clientSummaryText}
          summaryHref={buildTabHref(caseId, "summary")}
        />

        <OverviewEvidenceGapsCard gaps={gaps} />

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
