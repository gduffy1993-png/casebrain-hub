"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { ExportPackModel } from "@/lib/criminal/export-pack/types";
import type { FiveAnswersViewModel } from "@/lib/criminal/five-answers/types";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import {
  buildConfidenceDashboard,
  buildConfidenceDashboardInputFromH5,
} from "@/lib/criminal/confidence-dashboard";
import type { ConfidenceDashboardStatus } from "@/lib/criminal/confidence-dashboard";
import { buildAdviceChangeRadar, buildMatterEvidenceSnapshot } from "@/lib/criminal/advice-change-radar";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import { loadEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import { buildRerunDiffSnapshotFromBrief, compareRerunDiff, loadRerunDiffSnapshot } from "@/lib/criminal/re-run-diff";
import { listTrustFeedbackForCase } from "@/lib/criminal/trust/feedback/trust-feedback-storage";
import { useTrustFeedbackPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

type BundleMeta = {
  documentCount: number;
  combinedTextLength: number;
  snippets?: unknown;
  documentRows?: unknown;
  frontMatterScan?: unknown;
};

function statusBadgeClass(status: ConfidenceDashboardStatus): string {
  switch (status) {
    case "ready_for_solicitor_review":
      return "bg-emerald-950 text-emerald-200 border-emerald-800";
    case "provisional":
      return "bg-amber-950 text-amber-200 border-amber-800";
    case "needs_source_review":
      return "bg-orange-950 text-orange-200 border-orange-800";
    case "blocked_pending_material":
      return "bg-red-950 text-red-200 border-red-800";
    default:
      return "bg-slate-800 text-slate-300 border-slate-600";
  }
}

export function ConfidenceDashboardPanel({
  caseId,
  view,
  chase,
  briefPlan,
  warRoom,
  matterConfidence,
  exportPack,
  documentCount,
  bundleMeta,
  primaryRouteTitle,
}: {
  caseId: string;
  view: FiveAnswersViewModel;
  chase: DisclosureChaseBrief;
  briefPlan: CriminalBriefPlan | null;
  warRoom: HearingWarRoomBrief;
  matterConfidence: MatterConfidenceResult | null;
  exportPack: ExportPackModel | null;
  documentCount: number;
  bundleMeta: BundleMeta | null;
  primaryRouteTitle: string | null;
}) {
  const persistenceEnabled = useTrustFeedbackPersistenceEnabled();
  const [auditConcernCount, setAuditConcernCount] = useState(0);
  const [feedbackRecords, setFeedbackRecords] = useState(() => listTrustFeedbackForCase(caseId));

  useEffect(() => {
    setFeedbackRecords(listTrustFeedbackForCase(caseId));
  }, [caseId]);

  useEffect(() => {
    if (!persistenceEnabled) return;
    void (async () => {
      try {
        const res = await fetch(
          `/api/criminal/audit-log?caseId=${encodeURIComponent(caseId)}&severity=blocking&concernsOnly=1`,
          { credentials: "include", cache: "no-store" },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { entries?: unknown[] };
        setAuditConcernCount(Array.isArray(json.entries) ? json.entries.length : 0);
      } catch {
        /* ignore */
      }
    })();
  }, [caseId, persistenceEnabled]);

  const adviceRadar = useMemo(() => {
    if (!briefPlan) return null;
    const previous = loadEvidenceChangeSnapshot(caseId);
    const current = buildMatterEvidenceSnapshot({
      warRoom,
      chase,
      briefPlan,
      primaryRouteTitle,
      documentCount,
      sourceStateInput: bundleMeta
        ? {
            documentCount: bundleMeta.documentCount,
            combinedTextLength: bundleMeta.combinedTextLength,
            snippets: bundleMeta.snippets as never,
            documentRows: bundleMeta.documentRows as never,
            frontMatterScan: bundleMeta.frontMatterScan as never,
          }
        : null,
    });
    return buildAdviceChangeRadar({
      warRoom,
      chase,
      briefPlan,
      matterConfidence,
      previousSnapshot: previous,
      currentSnapshot: current,
    });
  }, [caseId, warRoom, chase, briefPlan, matterConfidence, primaryRouteTitle, documentCount, bundleMeta]);

  const rerunDiff = useMemo(() => {
    const previous = loadRerunDiffSnapshot(caseId);
    const current = buildRerunDiffSnapshotFromBrief({
      view,
      chase,
      matterConfidence,
      documentCount,
      exportStamp: exportPack?.version ?? null,
    });
    return compareRerunDiff(previous, current);
  }, [caseId, view, chase, matterConfidence, documentCount, exportPack?.version]);

  const model = useMemo(() => {
    const input = buildConfidenceDashboardInputFromH5({
      documentCount,
      view,
      chase,
      briefPlan,
      matterConfidence,
      exportPack,
      feedbackRecords,
      rerunDiff,
      adviceRadar,
      auditConcernCount,
    });
    return buildConfidenceDashboard(input);
  }, [
    documentCount,
    view,
    chase,
    briefPlan,
    matterConfidence,
    exportPack,
    feedbackRecords,
    rerunDiff,
    adviceRadar,
    auditConcernCount,
  ]);

  const counts = model.evidenceCounts;

  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-3`} data-testid="confidence-dashboard">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <Gauge className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h2 className={workflowSectionTitle}>Confidence dashboard</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{model.reviewDisclaimer}</p>
          </div>
        </div>
        <Badge variant="outline" className={statusBadgeClass(model.status)}>
          {model.statusLabel}
        </Badge>
      </div>

      <p className="text-sm text-slate-200">
        <span className="text-slate-500">Next review step: </span>
        {model.recommendedAction}
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded border border-slate-800/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Evidence states</p>
          {counts.available ? (
            <ul className="mt-1 text-[11px] text-slate-300 space-y-0.5">
              <li>Served: {counts.served}</li>
              <li>Referred only: {counts.referred_only}</li>
              <li>Missing: {counts.missing}</li>
              <li>Incomplete: {counts.incomplete}</li>
              <li>Not safely confirmed: {counts.not_safely_confirmed}</li>
              <li>Provisional / solicitor review: {counts.provisional_or_needs_review}</li>
            </ul>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">Not enough source-state data yet</p>
          )}
        </div>

        <div className="rounded border border-slate-800/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Source-state coverage</p>
          <p className="text-[11px] text-slate-300 mt-1">
            {model.sourceCoverage.labelledOutputs}/{model.sourceCoverage.totalOutputs} outputs with source-state
            support
          </p>
          {model.sourceCoverage.missingLabelOutputs.length ? (
            <p className="text-[10px] text-amber-400/90 mt-1">
              Gaps: {model.sourceCoverage.missingLabelOutputs.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="rounded border border-slate-800/80 px-2.5 py-2">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Feedback</p>
          {model.feedbackSummary.hasFeedback ? (
            <ul className="mt-1 text-[11px] text-slate-300 space-y-0.5">
              <li>Blocking: {model.feedbackSummary.blocking}</li>
              <li>Warning: {model.feedbackSummary.warning}</li>
              <li>Polish: {model.feedbackSummary.polish}</li>
              <li>Export-related: {model.feedbackSummary.exportRelated}</li>
            </ul>
          ) : (
            <p className="text-[11px] text-slate-500 mt-1">No feedback recorded yet</p>
          )}
        </div>
      </div>

      {model.outputSendability.length ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Output sendability</p>
          <ul className="space-y-1">
            {model.outputSendability.map((row) => (
              <li
                key={row.outputId}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-300 border-b border-slate-800/60 pb-1 last:border-0"
              >
                <span className="font-medium text-slate-200 min-w-[8rem]">{row.label}</span>
                <span>{row.sendabilityLabel}</span>
                <span className="text-slate-500">· source {row.sourceStateSupport}</span>
                {row.exportId ? <span className="text-slate-600">· {row.exportId}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {model.unresolvedWork.length ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Unresolved work</p>
          <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-0.5">
            {model.unresolvedWork.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {model.riskWarnings.length ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Risk warnings</p>
          <ul className="list-disc pl-4 text-[11px] text-amber-200/90 space-y-0.5">
            {model.riskWarnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {model.recentChanges.length ? (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Recent changes</p>
          <ul className="list-disc pl-4 text-[11px] text-slate-400 space-y-0.5">
            {model.recentChanges.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
