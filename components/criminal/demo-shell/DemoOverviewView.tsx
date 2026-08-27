"use client";

import { useEffect, useMemo, useState } from "react";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildHearingMode } from "@/lib/criminal/hearing-mode";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { displayCopyBody } from "@/lib/criminal/five-answers/display-labels";
import {
  ensureDigitalHarassmentGapRows,
  filterBundleFamilyWarnings,
  polishPresentationBlock,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";
import {
  dedupeEvidenceRowsByLabel,
  dedupePresentationLines,
} from "@/lib/criminal/overview-presentation";
import { adaptFiveAnswersAndChaseToCanonical } from "@/lib/criminal/canonical-matter-state";
import { polishChasePreviewLabel } from "@/lib/criminal/solicitor-display-dedupe";
import {
  displayPilotStripClient,
  displayPilotStripHearing,
  resolvePilotChargeDisplay,
} from "@/components/criminal/workflow/workflowPilotDisplay";
import {
  buildDemoAttentionItems,
  buildDemoReadiness,
  buildDemoStatCounts,
} from "./demoOverviewAdapter";
import { DemoOverviewCanvas } from "./DemoOverviewCanvas";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { usePilotMatterTabHref } from "@/components/criminal/workflow/pilotDeskNavContext";

/**
 * Demo Overview — presentation only. Reuses useMatterBrief / five-answers / chase briefs.
 * Does not edit invent / gate / hearing brains.
 */
export function DemoOverviewView({ caseId }: { caseId: string }) {
  const buildTabHref = usePilotMatterTabHref();
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
    clientLabel,
    hearingLabel,
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
    };
  }, [warRoom, chase, allegation, matterConfidence, filteredDoNotOverstate, bundleMeta?.frontMatterScan, bundleHay]);

  const hearingMode = useMemo(() => {
    if (!briefPlan || !warRoom || !chase) return null;
    return buildHearingMode({
      allegation: allegation ?? "",
      briefPlan,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      primaryRouteTitle: primaryRouteTitle
        ? polishPresentationLine(primaryRouteTitle, bundleHay)
        : primaryRouteTitle,
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
    return buildExportPack({
      caseId,
      allegation: allegation ?? "",
      warRoom,
      chase,
      briefPlan,
      matterConfidence,
      doNotOverstate: filteredDoNotOverstate,
      primaryRouteTitle: primaryRouteTitle
        ? polishPresentationLine(primaryRouteTitle, bundleHay)
        : primaryRouteTitle,
      appVersion: null,
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

  if (loading && !view && !showLimitedLoadingFallback) {
    return <DemoOverviewCanvas
      loading
      clientName="…"
      chargeLine=""
      stageLine=""
      provisional
      readinessBanner=""
      stats={{ missing: 0, incomplete: 0, activeChases: 0, openReviewItems: 0 }}
      attention={[]}
      courtLine=""
      clientUpdate=""
      readiness={{
        overallPct: 0,
        evidenceGatheredPct: 0,
        issuesResolvedPct: 0,
        toBeChasedPct: 0,
        softLabel: true,
      }}
    />;
  }

  if (loading && !view && showLimitedLoadingFallback) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 space-y-2">
        <p className="font-semibold text-slate-900">Overview not ready yet.</p>
        <p>
          CaseBrain is still checking the uploaded papers. Do not treat this matter as reviewed until the
          overview loads.
        </p>
      </div>
    );
  }

  if (!view || !matterConfidence || !chase) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Case overview will appear once documents are processed.
      </div>
    );
  }

  const canonicalMatter = adaptFiveAnswersAndChaseToCanonical({
    caseId,
    allegation,
    bundleHay,
    provisional: matterConfidence.level !== "safe",
    evidenceRows: view.evidenceState.rows,
    chase,
  });
  const stateCounts = canonicalMatter.evidence.counts;

  const chasePool = chase.primaryItems ?? [];
  // Pure projection of frozen shortlist — no second demote / invent / phone collapse.
  const attention = buildDemoAttentionItems(chasePool).map((item) => ({
    ...item,
    title: polishChasePreviewLabel(polishPresentationLine(item.title, bundleHay)) || item.title,
    blurb: polishPresentationLine(item.blurb, bundleHay),
    why: polishPresentationLine(item.why, bundleHay),
  }));
  const stats = buildDemoStatCounts(attention, stateCounts);
  const readiness = buildDemoReadiness(stateCounts, stats);

  const courtLineText = hearingMode
    ? polishPresentationLine(
        displayCopyBody(hearingMode.safeCourtLine.text, hearingMode.safeCourtLine.footer ?? undefined),
        bundleHay,
      )
    : "";

  const clientSummarySection = exportPack?.sections.find((s) => s.id === "client_summary");
  const clientUpdate = clientSummarySection
    ? polishPresentationBlock(displayCopyBody(clientSummarySection.textForClipboard), bundleHay)
    : dedupePresentationLines(
        attention.slice(0, 3).map((a) => `Outstanding: ${a.title}`),
      ).join("\n") || "Limited papers — keep the client update provisional.";

  const liveFileIdentity = extractBundleCaseMetadata(
    [
      bundleMeta?.frontMatterScan ?? "",
      bundleMeta?.snippets?.mg5 ?? "",
      bundleMeta?.snippets?.mg11 ?? "",
    ].join("\n\n"),
  );

  const clientDisplay = [
    liveFileIdentity.defendantName ?? "",
    typeof clientLabel === "string" ? clientLabel : "",
    bundleMeta?.caseMetadata?.defendantName ?? "",
  ]
    .map((candidate) => displayPilotStripClient(candidate))
    .find((candidate) => candidate && !/\bnot on papers\b/i.test(candidate));
  const clientName = clientDisplay ?? "";

  const chargeLine =
    resolvePilotChargeDisplay(polishPresentationLine(allegation ?? "", bundleHay));

  const provisional = matterConfidence.level !== "safe";
  const readinessBanner = provisional
    ? "Not ready for final court position — solicitor review required before relying on strategy lines."
    : "Papers look fuller — still check sources before fixing the hearing position.";

  const stageLine = displayPilotStripHearing(
    typeof hearingLabel === "string" ? hearingLabel : "",
  );

  const doNotItems = dedupePresentationLines(filteredDoNotOverstate).slice(0, 3);

  return (
    <DemoOverviewCanvas
      clientName={clientName}
      chargeLine={chargeLine}
      stageLine={stageLine}
      provisional={provisional}
      readinessBanner={readinessBanner}
      stats={stats}
      attention={attention}
      courtLine={courtLineText}
      clientUpdate={clientUpdate}
      readiness={readiness}
      doNotItems={doNotItems}
      fileHref={buildTabHref(caseId, "file")}
      papersHref={buildTabHref(caseId, "papers")}
      chaseHref={buildTabHref(caseId, "disclosure-chase")}
      courtHref={buildTabHref(caseId, "today")}
    />
  );
}
