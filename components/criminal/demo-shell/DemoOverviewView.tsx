"use client";

import { useEffect, useMemo, useState } from "react";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildHearingMode } from "@/lib/criminal/hearing-mode";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { assembleBundleTextForReasoning } from "@/lib/criminal/reasoning-v2/assemble-bundle-text";
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
  buildDemoKeyDefenceIssues,
  buildDemoReadiness,
  buildDemoStatCounts,
} from "./demoOverviewAdapter";
import { DemoOverviewCanvas } from "./DemoOverviewCanvas";
import {
  receiptFromClientFactLine,
  receiptFromClientLineSources,
  receiptFromCourtLine,
} from "@/lib/criminal/visible-output-receipt";
import { extractBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";
import { usePilotMatterTabHref } from "@/components/criminal/workflow/pilotDeskNavContext";

function firstSourceLineMatching(text: string, pattern: RegExp): string | null {
  const normalized = (text ?? "").replace(/\r/g, "\n");
  for (const rawLine of normalized.split(/\n+/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (line.length >= 8 && pattern.test(line)) return line;
  }
  const compact = normalized.replace(/\s+/g, " ").trim();
  const match = compact.match(pattern);
  if (!match || match.index === undefined) return null;
  const start = Math.max(0, match.index - 80);
  const end = Math.min(compact.length, match.index + match[0].length + 120);
  return compact.slice(start, end).trim();
}

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

  const sourceBundleText =
    bundleMeta?.canonical?.pageAwareFrontMatterScan ??
    (bundleMeta as { pageAwareFrontMatterScan?: string | null } | null)?.pageAwareFrontMatterScan ??
    bundleMeta?.frontMatterScan ??
    "";
  const issueBundleText = useMemo(
    () =>
      assembleBundleTextForReasoning({
        frontMatterScan: sourceBundleText,
        snippets: bundleMeta?.snippets,
      }) || sourceBundleText,
    [sourceBundleText, bundleMeta?.snippets],
  );

  const bundleHay = useMemo(
    () =>
      [
        sourceBundleText,
        issueBundleText,
        allegation ?? "",
        ...(chase?.primaryItems ?? []).map((i) => `${i.label} ${i.whyItMatters ?? ""}`),
      ].join(" "),
    [sourceBundleText, issueBundleText, allegation, chase?.primaryItems],
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
      bundleText: sourceBundleText || undefined,
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
  }, [warRoom, chase, allegation, matterConfidence, filteredDoNotOverstate, sourceBundleText, bundleHay]);

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
      keyIssues={[]}
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
  const keyIssues = buildDemoKeyDefenceIssues(issueBundleText, chasePool);

  const courtLineText = polishPresentationLine(
    chase.safeCourtLine?.trim() ||
      (hearingMode
        ? displayCopyBody(hearingMode.safeCourtLine.text, hearingMode.safeCourtLine.footer ?? undefined)
        : ""),
    bundleHay,
  );

  const clientSummarySection = exportPack?.sections.find((s) => s.id === "client_summary");
  const clientUpdate = clientSummarySection
    ? polishPresentationBlock(displayCopyBody(clientSummarySection.textForClipboard), bundleHay)
    : dedupePresentationLines(
        attention.slice(0, 3).map((a) => `Outstanding: ${a.title}`),
      ).join("\n") || "Limited papers — keep the client update provisional.";
  const courtLineNorm = courtLineText.replace(/\s+/g, " ").trim().toLowerCase();
  const courtSources = chasePool
    .filter((item) => {
      const label = (item.label ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const displayLabel =
        polishChasePreviewLabel(polishPresentationLine(item.label, bundleHay)) ||
        item.label;
      const display = displayLabel.replace(/\s+/g, " ").trim().toLowerCase();
      const itemCourt = (item.courtLine ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      return (
        Boolean(label && courtLineNorm.includes(label)) ||
        Boolean(display && courtLineNorm.includes(display)) ||
        Boolean(itemCourt && itemCourt === courtLineNorm)
      );
    })
    .slice(0, 4);
  const absenceCourtSource =
    courtSources.length === 0 && /\bno\s+cctv\b|cctv\s+(?:is|was)?\s*not\s+available|without\s+cctv/i.test(courtLineText)
      ? {
          label: courtLineText,
          baseStatus: "Not safely confirmed",
          source: "File extract",
          evidenceAnchor: firstSourceLineMatching(
            bundleHay,
            /\bno\s+cctv\b[^.;\n]*|\bcctv\s+(?:is|was)?\s*not\s+available\b[^.;\n]*|\bwithout\s+cctv\b[^.;\n]*/i,
          ),
        }
      : null;
  const courtReceipt = receiptFromCourtLine(courtLineText, absenceCourtSource ? [absenceCourtSource] : courtSources);
  const clientSource = chasePool.find((item) =>
    clientUpdate.toLowerCase().includes((item.label ?? "").toLowerCase().slice(0, 24)),
  );
  const clientSummarySources =
    clientSource || !/\b(?:outstanding|missing|waiting|still reviewing|full disclosure)\b/i.test(clientUpdate)
      ? []
      : chasePool
          .filter((item) => item.evidenceAnchor || item.sourceScheduleRef || item.provenance)
          .slice(0, 4);
  const clientReceipt =
    clientSummarySources.length > 1
      ? receiptFromClientLineSources(clientUpdate, clientSummarySources)
      : receiptFromClientFactLine(clientUpdate, {
          status: clientSource?.baseStatus,
          scheduleRef: clientSource?.sourceScheduleRef,
          displayLine: clientSource?.evidenceAnchor,
          excerpt: clientSource?.evidenceAnchor,
          sourceLabel: clientSource?.source,
          provenance: clientSource?.provenance ?? null,
        });

  const liveFileIdentity = extractBundleCaseMetadata(
    [
      bundleMeta?.frontMatterScan ?? "",
      sourceBundleText,
      bundleMeta?.snippets?.mg5 ?? "",
      bundleMeta?.snippets?.mg11 ?? "",
    ].join("\n\n"),
  );

  const clientDisplay = [
    liveFileIdentity.defendantName ?? "",
    bundleMeta?.caseMetadata?.defendantName ?? "",
    typeof clientLabel === "string" ? clientLabel : "",
  ]
    .map((candidate) => displayPilotStripClient(candidate))
    .find((candidate) => candidate && !/\bnot on papers\b/i.test(candidate));
  const clientName = clientDisplay ?? "";

  const chargeLine = resolvePilotChargeDisplay(
    polishPresentationLine(
      liveFileIdentity.offenceDisplay ||
        liveFileIdentity.offenceWording ||
        allegation ||
        "",
      bundleHay,
    ),
  );

  const provisional = matterConfidence.level !== "safe";
  const readinessBanner = provisional
    ? "Not ready for final court position — solicitor review required before relying on strategy lines."
    : "Papers look fuller — still check sources before fixing the hearing position.";

  const fileHearing = [liveFileIdentity.court, liveFileIdentity.nextHearingRaw]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" · ");
  const stageLine = displayPilotStripHearing(
    fileHearing || (typeof hearingLabel === "string" ? hearingLabel : ""),
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
      keyIssues={keyIssues}
      attention={attention}
      courtLine={courtLineText}
      courtReceipt={courtReceipt}
      clientUpdate={clientUpdate}
      clientReceipt={clientReceipt}
      readiness={readiness}
      doNotItems={doNotItems}
      fileHref={buildTabHref(caseId, "file")}
      papersHref={buildTabHref(caseId, "papers")}
      chaseHref={buildTabHref(caseId, "disclosure-chase")}
      courtHref={buildTabHref(caseId, "today")}
    />
  );
}
