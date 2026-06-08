"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { useSupervisorSignoffPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import { buildSupervisorQAResult } from "@/lib/criminal/supervisor-qa/build-supervisor-qa-result";
import { shouldShowSupervisorQAPanel } from "@/lib/criminal/supervisor-qa/supervisor-qa-flag";
import type { SupervisorReviewStatus } from "@/lib/criminal/supervisor-qa/supervisor-qa-types";
import type { SupervisorSignoffStatus } from "@/lib/criminal/supervisor-qa/supervisor-signoff-types";
import { SUPERVISOR_SIGNOFF_NOTE_MAX_CHARS } from "@/lib/criminal/supervisor-qa/supervisor-signoff-types";
import {
  getLatestSupervisorSignoffForCase,
  saveSupervisorSignoff,
} from "@/lib/criminal/supervisor-qa/supervisor-signoff-storage";
import { compareEvidenceChanges } from "@/lib/criminal/evidence-change-detector/compare-evidence-changes";
import { buildEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/build-evidence-change-snapshot";
import { loadEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import { listReasoningFeedbackForCase } from "@/lib/criminal/reasoning-v2/feedback/reasoning-feedback-storage";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { ExpandableStringList } from "./reasoningV2Ui";

export type SupervisorQAPanelProps = {
  compact?: boolean;
  caseId: string;
  reasoningV2Enabled: boolean;
  supervisorEnabled: boolean;
  exportsEnabled?: boolean;
  reasoningResult: ReasoningV2Result | null;
  clientStressResult?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput | null;
  workflowProfileHint?: string | null;
  loading?: boolean;
};

const STATUS_STYLES: Record<SupervisorReviewStatus, string> = {
  none: "bg-emerald-50 text-emerald-950 border-emerald-200",
  suggested: "bg-amber-50 text-amber-950 border-amber-200",
  required: "bg-rose-50 text-rose-950 border-rose-200",
};

function signoffStatusLabel(status: SupervisorSignoffStatus): string {
  switch (status) {
    case "reviewed":
      return "Reviewed";
    case "escalated":
      return "Escalated";
    case "no_issue":
      return "No obvious issue";
    default:
      return status;
  }
}

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className={workflowSectionTitle}>{title}</p>
      <ExpandableStringList items={items} previewCount={4} className="list-disc pl-4 space-y-1 text-xs text-slate-800 leading-relaxed mt-1" />
    </div>
  );
}

export function SupervisorQAPanel({
  compact = false,
  caseId,
  reasoningV2Enabled,
  supervisorEnabled,
  exportsEnabled = false,
  reasoningResult,
  clientStressResult = null,
  readinessInput = null,
  workflowProfileHint = null,
  loading = false,
}: SupervisorQAPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [feedbackTick, setFeedbackTick] = useState(0);
  const [signoffNote, setSignoffNote] = useState("");
  const [signoffSaving, setSignoffSaving] = useState(false);
  const [signoffSaved, setSignoffSaved] = useState(false);
  const [signoffError, setSignoffError] = useState<string | null>(null);
  const [signoffTick, setSignoffTick] = useState(0);
  const persistenceEnabled = useSupervisorSignoffPersistenceEnabled();

  const hasReasoning = reasoningResult?.available === true;

  useEffect(() => {
    setFeedbackTick((t) => t + 1);
    setSignoffNote("");
    setSignoffSaved(false);
    setSignoffError(null);
    setSignoffTick((t) => t + 1);
  }, [caseId]);

  const readinessLevel = useMemo(() => {
    if (!hasReasoning || !readinessInput) return null;
    const readiness = buildPreHearingReadiness(
      reasoningResult,
      clientStressResult,
      readinessInput,
    );
    return readiness.available ? readiness.level : null;
  }, [hasReasoning, reasoningResult, clientStressResult, readinessInput]);

  const latestSignoff = useMemo(() => {
    void signoffTick;
    return getLatestSupervisorSignoffForCase(caseId);
  }, [caseId, signoffTick]);

  const visible = shouldShowSupervisorQAPanel(
    reasoningV2Enabled,
    supervisorEnabled,
    hasReasoning,
  );

  const evidenceChanges = useMemo(() => {
    if (!hasReasoning) return null;
    const current = buildEvidenceChangeSnapshot({
      reasoning: reasoningResult,
      clientStress: clientStressResult,
      readinessInput: readinessInput ?? undefined,
    });
    const previous = loadEvidenceChangeSnapshot(caseId);
    const outcome = compareEvidenceChanges(previous, current);
    return outcome.available ? outcome : null;
  }, [hasReasoning, reasoningResult, clientStressResult, readinessInput, caseId]);

  const feedbackRecords = useMemo(() => {
    void feedbackTick;
    return listReasoningFeedbackForCase(caseId);
  }, [caseId, feedbackTick]);

  const qa = useMemo(() => {
    if (!visible || !hasReasoning) return null;
    return buildSupervisorQAResult(reasoningResult, {
      clientStress: clientStressResult,
      readinessInput: readinessInput ?? undefined,
      evidenceChanges,
      feedbackRecords,
      workflowProfileHint,
      exportsEnabled,
    });
  }, [
    visible,
    hasReasoning,
    reasoningResult,
    clientStressResult,
    readinessInput,
    evidenceChanges,
    feedbackRecords,
    workflowProfileHint,
    exportsEnabled,
  ]);

  async function submitSignoff(status: SupervisorSignoffStatus) {
    if (!qa?.available) return;
    setSignoffError(null);
    setSignoffSaving(true);
    try {
      await saveSupervisorSignoff(
        {
          caseId,
          status,
          qaStatus: qa.status,
          reasonLabels: qa.reasonsForReview,
          readinessLevel,
          humanReviewRequired: qa.status === "required",
          evidenceChangeStatus: qa.evidenceChangeStatus,
          note: signoffNote.trim() || null,
        },
        { persistenceEnabled },
      );
      setSignoffSaved(true);
      setSignoffNote("");
      setSignoffTick((t) => t + 1);
    } catch {
      setSignoffError("Could not save sign-off — check note for disallowed content.");
    } finally {
      setSignoffSaving(false);
    }
  }

  if (!reasoningV2Enabled || !supervisorEnabled) return null;

  if (loading) {
    return (
      <div
        className={compact ? "rounded-md border border-slate-200 px-3 py-2" : `${workflowCard} border-slate-200`}
        data-testid="supervisor-qa-panel"
      >
        <p className={`text-xs ${workflowMuted}`}>Loading supervisor review…</p>
      </div>
    );
  }

  if (!hasReasoning) {
    return (
      <div
        className={compact ? "rounded-md border border-slate-200 px-3 py-2" : `${workflowCard} border-slate-200`}
        data-testid="supervisor-qa-panel"
      >
        <p className={`text-xs ${workflowMuted}`}>{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
      </div>
    );
  }

  if (!qa?.available) return null;

  const style = STATUS_STYLES[qa.status];

  if (compact) {
    return (
      <div
        className={`rounded-md border px-3 py-2 min-w-0 ${style}`}
        data-testid="supervisor-qa-panel"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold">{qa.statusLabel}</span>
        </div>
        {qa.reasonsForReview[0] ? (
          <p className="text-[11px] mt-1 break-words opacity-90">{qa.reasonsForReview[0]}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={`${workflowCard} border-slate-200 min-w-0`}
      aria-label="Supervisor QA review"
      data-testid="supervisor-qa-panel"
    >
      <div className={`px-4 py-3 border-b flex flex-wrap items-center gap-2 ${style}`}>
        <Shield className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Supervisor review</h2>
          <p className="text-xs mt-0.5 opacity-90">{qa.statusLabel}</p>
        </div>
        <Badge variant="secondary" size="sm" className="bg-white/80 shrink-0">
          Not case strength
        </Badge>
      </div>

      <div className="px-4 py-3 space-y-2 min-w-0">
        <p className={`text-[11px] ${workflowMuted}`}>
          Review prioritisation on source-backed view — not win probability or plea advice.
        </p>

        {qa.reasonsForReview.length ? (
          <ExpandableStringList items={qa.reasonsForReview} previewCount={5} />
        ) : (
          <p className={`text-xs ${workflowMuted}`}>No review reasons flagged on current papers.</p>
        )}

        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left pt-1"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className={`${workflowSectionTitle} text-slate-800`}>Review detail</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          )}
        </button>

        {expanded ? (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <DetailBlock title="Top risks / blockers" items={qa.topRisks} />
            <DetailBlock title="Missing core disclosure" items={qa.missingCoreDisclosure} />
            <DetailBlock title="Contradictions" items={qa.contradictions} />
            <DetailBlock title="Do not concede" items={qa.doNotConcedePoints} />
            <div className="min-w-0">
              <p className={workflowSectionTitle}>Readiness</p>
              <p className="text-xs text-slate-800 mt-1 break-words">{qa.readinessStatus}</p>
            </div>
            <div className="min-w-0">
              <p className={workflowSectionTitle}>Evidence changes</p>
              <p className="text-xs text-slate-800 mt-1 break-words">{qa.evidenceChangeStatus}</p>
            </div>
            <DetailBlock title="Feedback concerns" items={qa.feedbackConcerns} />
            <div className="min-w-0">
              <p className={workflowSectionTitle}>Suggested supervisor action</p>
              <p className="text-xs text-slate-800 mt-1 break-words">{qa.suggestedSupervisorAction}</p>
            </div>
            <div className="min-w-0">
              <p className={workflowSectionTitle}>Handover / export</p>
              <p className="text-xs text-slate-800 mt-1 break-words">{qa.exportReminder}</p>
            </div>
          </div>
        ) : null}

        {persistenceEnabled ? (
          <div className="pt-3 mt-1 border-t border-slate-100 space-y-3">
            <p className={workflowSectionTitle}>Supervisor sign-off</p>
            <p className={`text-[11px] ${workflowMuted}`}>
              Record a review action for this matter — metadata only, not legal advice.
            </p>

            {latestSignoff ? (
              <p className="text-xs text-slate-700">
                Last recorded:{" "}
                <span className="font-medium">{signoffStatusLabel(latestSignoff.status)}</span>
                {latestSignoff.reviewedAt
                  ? ` · ${new Date(latestSignoff.reviewedAt).toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}`
                  : null}
              </p>
            ) : null}

            {signoffSaved ? (
              <p className="text-xs text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Sign-off saved for review
              </p>
            ) : null}

            <div>
              <label htmlFor={`${caseId}-supervisor-signoff-note`} className={workflowSectionTitle}>
                Optional note (short)
              </label>
              <textarea
                id={`${caseId}-supervisor-signoff-note`}
                value={signoffNote}
                onChange={(e) => {
                  setSignoffNote(e.target.value.slice(0, SUPERVISOR_SIGNOFF_NOTE_MAX_CHARS));
                  setSignoffSaved(false);
                }}
                rows={2}
                placeholder="Brief note for review record — not case papers"
                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-y min-h-[2.5rem]"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={signoffSaving}
                onClick={() => void submitSignoff("reviewed")}
              >
                Mark reviewed
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={signoffSaving}
                onClick={() => void submitSignoff("escalated")}
              >
                Escalate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-[11px]"
                disabled={signoffSaving}
                onClick={() => void submitSignoff("no_issue")}
              >
                No obvious issue
              </Button>
            </div>

            {signoffError ? <p className="text-[11px] text-red-700">{signoffError}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
