"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildDecisionBoard } from "@/lib/criminal/decision-board/build-decision-board";
import { buildHearingMode } from "@/lib/criminal/hearing-mode";
import { buildExportPack } from "@/lib/criminal/export-pack";
import { DefenceDecisionBoard } from "@/components/criminal/decision-board/DefenceDecisionBoard";
import { AdviceChangeRadarPanel } from "@/components/criminal/advice-change-radar/AdviceChangeRadarPanel";
import { HearingModePanel } from "@/components/criminal/hearing-mode/HearingModePanel";
import { ExportPackPanel } from "@/components/criminal/export-pack/ExportPackPanel";
import { RerunDiffPanel } from "@/components/criminal/re-run-diff/RerunDiffPanel";
import { ConfidenceDashboardPanel } from "@/components/criminal/confidence-dashboard/ConfidenceDashboardPanel";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import { displayExistenceLabel } from "@/lib/criminal/five-answers/display-labels";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { usePilotMatterTabHref } from "@/components/criminal/workflow/pilotDeskNavContext";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { EvidenceTracePanel } from "./EvidenceTracePanel";
import { CaseCockpitPanel } from "./CaseCockpitPanel";
import { EvidenceTruthMapPanel } from "./EvidenceTruthMapPanel";
import { OverviewAdvancedPanel } from "./OverviewAdvancedPanel";
import { ProofPacketPreviewPanel } from "./ProofPacketPreviewPanel";
import { ProofReceiptPanel } from "./ProofReceiptPanel";
import { buildProofReceiptView } from "@/lib/criminal/proof-receipt";
import { FiveAnswersCompactSection } from "./FiveAnswersCompactSection";
import { humanizeEvidenceLabel } from "./evidence-display";
import {
  ensureDigitalHarassmentGapRows,
  filterBundleFamilyWarnings,
  polishPresentationLine,
} from "@/lib/criminal/demo-presentation-polish";
import type { EvidenceTraceRow, EvidenceTraceSection, FiveAnswersEvidenceRow } from "@/lib/criminal/five-answers/types";
import { useMemo, useState, type ReactNode } from "react";

function AnswerCard({
  number,
  title,
  children,
  testId,
  traceSection,
  traceRows,
  headerAction,
  defaultOpen = false,
}: {
  number: number;
  title: string;
  children: ReactNode;
  testId: string;
  traceSection?: EvidenceTraceSection;
  traceRows?: EvidenceTraceRow[];
  headerAction?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`${workflowPilotCard} px-4 py-2 space-y-0`} data-testid={testId}>
      <button
        type="button"
        className="w-full flex items-center gap-2 py-1.5 text-left"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[11px] font-bold text-blue-300">
          {number}
        </span>
        <h2 className={`${workflowSectionTitle} flex-1 min-w-0`}>{title}</h2>
        {headerAction}
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
        )}
      </button>
      {open ? (
        <div className="pb-3 space-y-2">
          {children}
          {traceSection && traceRows?.length ? (
            <EvidenceTracePanel section={traceSection} rows={traceRows} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function servedRows(rows: FiveAnswersEvidenceRow[]) {
  return rows.filter((r) => r.existence === "served");
}

function gapRows(rows: FiveAnswersEvidenceRow[]) {
  return rows.filter((r) =>
    ["referred_only", "missing", "unknown", "not_safely_confirmed"].includes(r.existence),
  );
}

function sourcePositionText(rows: FiveAnswersEvidenceRow[], bundleThin: boolean): string {
  const served = servedRows(rows);
  const gaps = gapRows(rows);
  if (served.length === 0 && gaps.length === 0) {
    return bundleThin ? "Thin bundle — limited papers on file." : "Limited papers — source state not confirmed.";
  }
  if (served.length === 0) {
    return `${gaps.length} gap(s) flagged — nothing safely served for reliance yet.`;
  }
  if (gaps.length === 0) {
    return `${served.length} served item(s) on file — check before reliance.`;
  }
  return `${served.length} served · ${gaps.length} gap(s) flagged — chase before fixing position.`;
}

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

    const gapRows = ensureDigitalHarassmentGapRows(
      built.evidenceState.rows,
      bundleHay,
      allegation ?? "",
    );

    return {
      ...built,
      evidenceState: { ...built.evidenceState, rows: gapRows },
      mustNotOverstate: built.mustNotOverstate.map((line) => polishPresentationLine(line, bundleHay)),
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
    return buildProofReceiptView({
      view,
      chase: chase ?? null,
      bundleHay,
      allegation: allegation ?? "",
    });
  }, [view, chase, bundleHay, allegation]);

  const bundleThin = (bundleMeta?.documentCount ?? 0) <= 1;

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

  const served = servedRows(view.evidenceState.rows);
  const gaps = gapRows(view.evidenceState.rows);
  const topChase = view.chase.slice(0, 5).map((c) => polishPresentationLine(c.label, bundleHay));
  const hasWarningsAbove = view.mustNotOverstate.length > 0;

  const answerSummaries = [
    {
      id: "1",
      title: "Case",
      preview: view.caseSaying.mainIssue,
      testId: "five-answers-case-saying",
    },
    {
      id: "2",
      title: "Served",
      preview: served.length
        ? served
            .slice(0, 2)
            .map((r) => r.label)
            .join("; ")
        : "Limited papers — nothing fully served for reliance.",
      testId: "five-answers-evidence-state",
    },
    {
      id: "3",
      title: "Gaps",
      preview: gaps.length
        ? gaps
            .slice(0, 2)
            .map((r) => `${humanizeEvidenceLabel(r.label, r.existence)} (${displayExistenceLabel(r.existence)})`)
            .join("; ")
        : "No additional gaps shown in this preview.",
      testId: "five-answers-evidence-gaps",
    },
    {
      id: "4",
      title: "Chase",
      preview: topChase.length
        ? topChase
            .slice(0, 2)
            .map((label) => humanizeEvidenceLabel(label, "missing"))
            .join("; ")
        : "Check CPS Chase tab for drafts.",
      testId: "five-answers-chase",
    },
    {
      id: "5",
      title: "Do not",
      preview: view.mustNotOverstate[0] ?? "No overstatement warnings listed.",
      testId: "five-answers-must-not",
    },
  ];

  return (
    <div className="space-y-3" data-testid="five-answers-view">
      <div id="overview-understand" className="space-y-3 scroll-mt-4">
        <CaseCockpitPanel
          mainIssue={matterConfidence.mainIssue}
          sourcePosition={sourcePositionText(view.evidenceState.rows, bundleThin)}
          nextAction={matterConfidence.nextBestAction}
        />

        <div id="overview-trust" className="space-y-3 scroll-mt-4">
          <EvidenceTruthMapPanel rows={view.evidenceState.rows} />
          <ProofReceiptPanel model={proofReceipts!} />
          <ProofPacketPreviewPanel rows={view.evidenceState.rows} warnings={view.mustNotOverstate} />
        </div>

        <FiveAnswersCompactSection summaries={answerSummaries}>
          <AnswerCard
            number={1}
            title="What is this case saying?"
            testId="five-answers-case-saying"
            traceSection="allegation"
            traceRows={view.evidenceTrace.bySection.allegation}
            defaultOpen
          >
            <p className="text-sm text-slate-200 leading-relaxed line-clamp-5">{view.caseSaying.mainIssue}</p>
          </AnswerCard>

          <AnswerCard
            number={2}
            title="What is actually served?"
            testId="five-answers-evidence-state"
            traceSection="key_evidence"
            traceRows={view.evidenceTrace.bySection.key_evidence}
            headerAction={
              <H5FeedbackFlag
                caseId={caseId}
                surface="evidence_trace"
                section="key_evidence"
                sendability={matterConfidence.chaseSendability ?? null}
              />
            }
          >
            {served.length ? (
              <ul className="space-y-1.5 text-sm text-slate-300">
                {served.map((row, i) => (
                  <li key={i}>{row.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Limited papers only — nothing confirmed as fully served.</p>
            )}
          </AnswerCard>

          <AnswerCard
            number={3}
            title="What is referred only / missing / not safely confirmed?"
            testId="five-answers-evidence-gaps"
            traceSection="missing_referred"
            traceRows={view.evidenceTrace.bySection.missing_referred}
          >
            {gaps.length ? (
              <ul className="space-y-2">
                {gaps.slice(0, 6).map((row, i) => (
                  <li key={i} className="text-sm text-slate-300 flex flex-wrap items-center gap-2">
                    <span>{row.label}</span>
                    <Badge variant="secondary" size="sm" className="text-[9px]">
                      {displayExistenceLabel(row.existence)}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No additional gaps shown here — still check papers before reliance.</p>
            )}
          </AnswerCard>

          <AnswerCard
            number={4}
            title="What do I chase?"
            testId="five-answers-chase"
            traceSection="chase"
            traceRows={view.evidenceTrace.bySection.chase}
          >
            {topChase.length ? (
              <ul className="space-y-1 text-sm text-slate-300 list-disc pl-4">
                {topChase.map((label, i) => (
                  <li key={i}>{label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No chase items yet — check CPS Chase tab.</p>
            )}
            <Link
              href={buildTabHref(caseId, "disclosure-chase")}
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1"
            >
              CPS chase drafts in Send / copy outputs <ExternalLink className="h-3 w-3" />
            </Link>
          </AnswerCard>

          <AnswerCard
            number={5}
            title="What must I not overstate?"
            testId="five-answers-must-not"
            traceSection="do_not_overstate"
            traceRows={view.evidenceTrace.bySection.do_not_overstate}
          >
            <DontSaySafetyBox items={view.mustNotOverstate.slice(0, 5)} compact />
          </AnswerCard>
        </FiveAnswersCompactSection>
      </div>

      {hearingMode ? (
        <div id="overview-prepare" className="scroll-mt-4">
          <HearingModePanel
            model={hearingMode}
            caseId={caseId}
            todayHref={buildTabHref(caseId, "today")}
            chaseHref={buildTabHref(caseId, "disclosure-chase")}
            suppressDoNotOverstate={hasWarningsAbove}
          />
        </div>
      ) : null}

      {exportPack ? (
        <div id="overview-send" className="scroll-mt-4">
          <ExportPackPanel model={exportPack} caseId={caseId} hideDoNotOverstatePreview={hasWarningsAbove} />
        </div>
      ) : null}

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
