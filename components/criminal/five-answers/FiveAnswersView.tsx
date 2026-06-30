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
import { CaseSnapshotPanel } from "./CaseSnapshotPanel";
import { WhatMattersNowPanel } from "./WhatMattersNowPanel";
import { EvidenceTruthMapPanel } from "./EvidenceTruthMapPanel";
import { OverviewSectionNav } from "./OverviewSectionNav";
import { OverviewAdvancedPanel } from "./OverviewAdvancedPanel";
import { ProofPacketPreviewPanel } from "./ProofPacketPreviewPanel";
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
  defaultOpen = true,
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

function servedSummaryText(rows: FiveAnswersEvidenceRow[], bundleThin: boolean): string {
  const served = servedRows(rows);
  if (served.length === 0 || bundleThin) {
    return "Limited papers are available. The bundle is thin — do not rely on material that is not served and reviewed.";
  }
  return `${served.length} served item(s) on file — still requires solicitor review before reliance.`;
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

  const view = useMemo(() => {
    if (!warRoom || !chase) return null;
    return buildFiveAnswersView({
      allegation: allegation ?? "",
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate,
    });
  }, [warRoom, chase, allegation, matterConfidence, doNotOverstate]);

  const decisionBoard = useMemo(() => {
    if (!briefPlan || !warRoom || !chase) return null;
    return buildDecisionBoard({
      briefPlan,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate,
    });
  }, [briefPlan, warRoom, chase, matterConfidence, doNotOverstate]);

  const hearingMode = useMemo(() => {
    if (!briefPlan || !warRoom || !chase) return null;
    return buildHearingMode({
      allegation: allegation ?? "",
      briefPlan,
      warRoom,
      chase,
      matterConfidence,
      doNotOverstate,
      primaryRouteTitle,
      documentCount: bundleMeta?.documentCount ?? 0,
    });
  }, [
    briefPlan,
    warRoom,
    chase,
    allegation,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle,
    bundleMeta?.documentCount,
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
      doNotOverstate,
      primaryRouteTitle,
      appVersion,
    });
  }, [
    caseId,
    warRoom,
    chase,
    allegation,
    briefPlan,
    matterConfidence,
    doNotOverstate,
    primaryRouteTitle,
  ]);

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
        <p className="text-xs text-slate-500">Not safely confirmed — solicitor review required.</p>
      </div>
    );
  }

  const served = servedRows(view.evidenceState.rows);
  const gaps = gapRows(view.evidenceState.rows);
  const topChase = view.chase.slice(0, 5).map((c) => c.label);
  const topWarning = view.mustNotOverstate[0] ?? null;

  return (
    <div className="space-y-3" data-testid="five-answers-view">
      <OverviewSectionNav />

      <div id="overview-understand" className="space-y-3 scroll-mt-4">
        <CaseSnapshotPanel
          clientLabel={clientLabel}
          allegation={allegation}
          courtLine={courtLabel}
          hearingLine={hearingLabel ?? chase.hearingStatus}
          confidence={matterConfidence}
        />

        <WhatMattersNowPanel
          confidence={matterConfidence}
          servedSummary={servedSummaryText(view.evidenceState.rows, bundleThin)}
          topChaseLabels={topChase}
          topWarning={topWarning}
        />

        <div id="overview-trust" className="space-y-3 scroll-mt-4">
          <EvidenceTruthMapPanel rows={view.evidenceState.rows} />

          <ProofPacketPreviewPanel rows={view.evidenceState.rows} warnings={view.mustNotOverstate} />
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1">
            Five answers
          </p>

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
            defaultOpen
          >
            {served.length ? (
              <ul className="space-y-1.5 text-sm text-slate-300">
                {served.map((row, i) => (
                  <li key={i}>{row.label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">
                Limited papers only — nothing safely confirmed as fully served for reliance.
              </p>
            )}
          </AnswerCard>

          <AnswerCard
            number={3}
            title="What is referred only / missing / not safely confirmed?"
            testId="five-answers-evidence-gaps"
            traceSection="missing_referred"
            traceRows={view.evidenceTrace.bySection.missing_referred}
            defaultOpen={false}
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
              <p className="text-sm text-slate-400">No key gaps listed — still check papers before reliance.</p>
            )}
          </AnswerCard>

          <AnswerCard
            number={4}
            title="What do I chase?"
            testId="five-answers-chase"
            traceSection="chase"
            traceRows={view.evidenceTrace.bySection.chase}
            defaultOpen={false}
          >
            {topChase.length ? (
              <ul className="space-y-1 text-sm text-slate-300 list-disc pl-4">
                {topChase.map((label, i) => (
                  <li key={i}>{label}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">No chase items yet — check Papers / Chase tabs.</p>
            )}
            <Link
              href={buildTabHref(caseId, "disclosure-chase")}
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-1"
            >
              CPS chase drafts in Export pack <ExternalLink className="h-3 w-3" />
            </Link>
          </AnswerCard>

          <AnswerCard
            number={5}
            title="What must I not overstate?"
            testId="five-answers-must-not"
            traceSection="do_not_overstate"
            traceRows={view.evidenceTrace.bySection.do_not_overstate}
            defaultOpen
          >
            <DontSaySafetyBox items={view.mustNotOverstate.slice(0, 5)} compact />
          </AnswerCard>
        </div>

        <div className="flex justify-end">
          <H5FeedbackFlag
            caseId={caseId}
            surface="five_answers"
            section="overview"
            sendability={matterConfidence.summarySendability ?? null}
          />
        </div>
      </div>

      {hearingMode ? (
        <div id="overview-prepare" className="scroll-mt-4">
          <HearingModePanel
            model={hearingMode}
            caseId={caseId}
            todayHref={buildTabHref(caseId, "today")}
            chaseHref={buildTabHref(caseId, "disclosure-chase")}
          />
        </div>
      ) : null}

      {exportPack ? (
        <div id="overview-send" className="scroll-mt-4">
          <ExportPackPanel model={exportPack} caseId={caseId} />
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
        </OverviewAdvancedPanel>
      </div>

      <p className="text-[10px] text-center text-slate-600 pb-1">
        Evidence-linked · conditional · provisional where stated · solicitor review required
      </p>
    </div>
  );
}
