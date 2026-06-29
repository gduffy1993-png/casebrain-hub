"use client";

import Link from "next/link";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DontSaySafetyBox } from "@/components/criminal/trust/DontSaySafetyBox";
import { MatterConfidenceHeader } from "@/components/criminal/trust/MatterConfidenceHeader";
import { SOURCE_BACKED_COURT_NOTE_LABEL } from "@/lib/criminal/trust/firm-facing-labels";
import { buildFiveAnswersView } from "@/lib/criminal/five-answers/build-five-answers-view";
import { buildDecisionBoard } from "@/lib/criminal/decision-board/build-decision-board";
import { buildHearingMode } from "@/lib/criminal/hearing-mode";
import { DefenceDecisionBoard } from "@/components/criminal/decision-board/DefenceDecisionBoard";
import { AdviceChangeRadarPanel } from "@/components/criminal/advice-change-radar/AdviceChangeRadarPanel";
import { HearingModePanel } from "@/components/criminal/hearing-mode/HearingModePanel";
import { evidenceExistenceLabel, evidenceReliabilityLabel } from "@/lib/criminal/five-answers/evidence-trace";
import { useMatterBrief } from "@/components/criminal/workflow/useMatterBrief";
import { usePilotMatterTabHref } from "@/components/criminal/workflow/pilotDeskNavContext";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { EvidenceTracePanel } from "./EvidenceTracePanel";
import type { EvidenceTraceRow, EvidenceTraceSection } from "@/lib/criminal/five-answers/types";
import { useMemo, useState, type ReactNode } from "react";

function TraceBadge({ label, tone }: { label: string; tone: "existence" | "reliability" }) {
  const variant = tone === "existence" ? "secondary" : "outline";
  return (
    <Badge variant={variant} size="sm" className="text-[10px] font-medium">
      {label}
    </Badge>
  );
}

function AnswerCard({
  number,
  title,
  children,
  testId,
  traceSection,
  traceRows,
}: {
  number: number;
  title: string;
  children: ReactNode;
  testId: string;
  traceSection?: EvidenceTraceSection;
  traceRows?: EvidenceTraceRow[];
}) {
  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-2`} data-testid={testId}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-[11px] font-bold text-blue-300">
          {number}
        </span>
        <h2 className={workflowSectionTitle}>{title}</h2>
      </div>
      {children}
      {traceSection && traceRows?.length ? (
        <EvidenceTracePanel section={traceSection} rows={traceRows} />
      ) : null}
    </section>
  );
}

export function FiveAnswersView({ caseId }: { caseId: string }) {
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
  } = useMatterBrief(caseId);
  const buildTabHref = usePilotMatterTabHref();
  const [copied, setCopied] = useState(false);

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

  const copyCourtNote = async () => {
    if (!view?.courtNote.canCopy) return;
    try {
      await navigator.clipboard.writeText(view.courtNote.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (loading && !view) {
    return (
      <div className={`${workflowPilotCard} p-8 flex items-center justify-center gap-2 text-slate-400`}>
        <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
        Loading case overview…
      </div>
    );
  }

  if (!view) {
    return (
      <div className={`${workflowPilotCard} p-6 text-sm text-slate-400`}>
        Case overview will appear once documents are processed.
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="five-answers-view">
      {matterConfidence ? <MatterConfidenceHeader confidence={matterConfidence} /> : null}

      <div className={`${workflowPilotCard} px-4 py-2.5 border-blue-500/20 bg-blue-950/20`}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300/90">Evidence truth rules</p>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
          {view.evidenceState.hardRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>

      {hearingMode ? (
        <HearingModePanel
          model={hearingMode}
          todayHref={buildTabHref(caseId, "today")}
          chaseHref={buildTabHref(caseId, "disclosure-chase")}
        />
      ) : null}

      <AnswerCard
        number={1}
        title="What is this case saying?"
        testId="five-answers-case-saying"
        traceSection="allegation"
        traceRows={view.evidenceTrace.bySection.allegation}
      >
        <p className="text-sm font-medium text-slate-100">{view.caseSaying.allegation}</p>
        <p className="text-sm text-slate-300 leading-relaxed">{view.caseSaying.mainIssue}</p>
        <p className="text-xs text-blue-300/90">
          <span className="font-semibold text-blue-200">Next: </span>
          {view.caseSaying.nextAction}
        </p>
      </AnswerCard>

      <AnswerCard
        number={2}
        title="What is served / referred only / missing?"
        testId="five-answers-evidence-state"
        traceSection="key_evidence"
        traceRows={[
          ...view.evidenceTrace.bySection.key_evidence,
          ...view.evidenceTrace.bySection.missing_referred,
        ]}
      >
        {view.evidenceState.rows.length ? (
          <ul className="space-y-2">
            {view.evidenceState.rows.map((row, i) => (
              <li key={i} className="text-xs text-slate-300 border-b border-slate-800/80 pb-2 last:border-0">
                <p className="font-medium text-slate-200 line-clamp-2">{row.label}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <TraceBadge label={evidenceExistenceLabel(row.existence)} tone="existence" />
                  <TraceBadge label={evidenceReliabilityLabel(row.reliability)} tone="reliability" />
                </div>
                {row.note ? <p className="text-[11px] text-slate-500 mt-1">{row.note}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">Open Chase for material families once papers load.</p>
        )}
        {view.contradictions.length ? (
          <div className="mt-3 pt-2 border-t border-slate-800/80">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 mb-1.5">
              Paper conflicts (existing detection)
            </p>
            <ul className="space-y-1 text-xs text-slate-400">
              {view.contradictions.map((c, i) => (
                <li key={i}>
                  <span className="font-medium text-amber-300/90">{c.label}: </span>
                  {c.summary}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link
          href={buildTabHref(caseId, "disclosure-chase")}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-2"
        >
          Full chase list <ExternalLink className="h-3 w-3" />
        </Link>
      </AnswerCard>

      <AnswerCard
        number={3}
        title="What must I not overstate?"
        testId="five-answers-must-not"
        traceSection="do_not_overstate"
        traceRows={view.evidenceTrace.bySection.do_not_overstate}
      >
        <DontSaySafetyBox items={view.mustNotOverstate} compact />
        <Link
          href={buildTabHref(caseId, "today")}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 mt-2"
        >
          Today tab — full warnings <ExternalLink className="h-3 w-3" />
        </Link>
      </AnswerCard>

      <AnswerCard
        number={4}
        title="What do I chase?"
        testId="five-answers-chase"
        traceSection="chase"
        traceRows={view.evidenceTrace.bySection.chase}
      >
        {view.chase.length ? (
          <ul className="space-y-2">
            {view.chase.map((row, i) => (
              <li key={i} className="text-xs border-b border-slate-800/80 pb-2 last:border-0">
                <p className="font-medium text-slate-200">{row.label}</p>
                <p className="text-slate-500 mt-0.5 line-clamp-2">{row.copySuggestion}</p>
                <p className="text-[10px] text-slate-500 mt-1">{row.sendabilityLabel}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-slate-500">No chase items yet — check Papers / Chase tabs.</p>
        )}
        <Link
          href={buildTabHref(caseId, "disclosure-chase")}
          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
        >
          CPS chase copy <ExternalLink className="h-3 w-3" />
        </Link>
      </AnswerCard>

      <AnswerCard
        number={5}
        title={`What ${SOURCE_BACKED_COURT_NOTE_LABEL.toLowerCase()} can a solicitor review?`}
        testId="five-answers-court-note"
        traceSection="court_note"
        traceRows={view.evidenceTrace.bySection.court_note}
      >
        <p className="text-xs text-slate-500 mb-1">{view.courtNote.sendabilityLabel}</p>
        <p className="text-sm text-slate-300 leading-relaxed italic">{view.courtNote.text}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!view.courtNote.canCopy}
            onClick={() => void copyCourtNote()}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            {copied ? "Copied" : view.courtNote.copySuggestionLabel}
          </Button>
          <Link
            href={buildTabHref(caseId, "today")}
            className="text-[11px] text-blue-400 hover:text-blue-300"
          >
            Today tab
          </Link>
        </div>
        <p className="text-[10px] text-slate-600 mt-2">{view.courtNote.footer}</p>
      </AnswerCard>

      {decisionBoard ? <DefenceDecisionBoard model={decisionBoard} /> : null}

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
    </div>
  );
}
