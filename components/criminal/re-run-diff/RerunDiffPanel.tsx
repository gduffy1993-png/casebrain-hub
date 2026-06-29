"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GitCompare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { ExportPackModel } from "@/lib/criminal/export-pack/types";
import type { FiveAnswersViewModel } from "@/lib/criminal/five-answers/types";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import {
  buildRerunDiffSnapshotFromBrief,
  compareRerunDiff,
  loadRerunDiffSnapshot,
  saveRerunDiffSnapshot,
} from "@/lib/criminal/re-run-diff";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

type RerunDiffPanelProps = {
  caseId: string;
  view: FiveAnswersViewModel;
  chase: DisclosureChaseBrief;
  matterConfidence: MatterConfidenceResult | null;
  documentCount: number;
  exportPack: ExportPackModel | null;
};

export function RerunDiffPanel({
  caseId,
  view,
  chase,
  matterConfidence,
  documentCount,
  exportPack,
}: RerunDiffPanelProps) {
  const [previous, setPrevious] = useState(() => loadRerunDiffSnapshot(caseId));
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const current = useMemo(
    () =>
      buildRerunDiffSnapshotFromBrief({
        view,
        chase,
        matterConfidence,
        documentCount,
        exportStamp: exportPack?.version ?? null,
      }),
    [view, chase, matterConfidence, documentCount, exportPack?.version],
  );

  const reload = useCallback(() => {
    setPrevious(loadRerunDiffSnapshot(caseId));
    setLoaded(true);
  }, [caseId]);

  useEffect(() => {
    reload();
  }, [reload, current.savedAt]);

  const model = useMemo(() => compareRerunDiff(previous, current), [previous, current]);

  const saveBaseline = () => {
    setSaving(true);
    setSaveNote(null);
    try {
      const ok = saveRerunDiffSnapshot(caseId, current);
      if (ok) {
        setSaveNote("Version baseline saved for this case.");
        reload();
      } else {
        setSaveNote("Could not save baseline.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-3`} data-testid="rerun-diff-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2 min-w-0">
          <GitCompare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <h2 className={workflowSectionTitle}>Re-run diff</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">{model.reviewNotice}</p>
            <p className="text-sm text-slate-300 mt-1">{model.headline}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={saving}
            onClick={saveBaseline}
            data-testid="rerun-diff-save-baseline"
          >
            {saving ? "Saving…" : model.hasPrevious ? "Update version baseline" : "Save version baseline"}
          </Button>
          <H5FeedbackFlag caseId={caseId} surface="five_answers" section="rerun_diff" />
        </div>
      </div>

      {saveNote ? <p className="text-[11px] text-emerald-400/90">{saveNote}</p> : null}

      {!model.hasPrevious ? (
        <p className="text-[11px] text-slate-400 rounded border border-slate-700/80 bg-slate-950/40 px-2 py-1.5">
          Save a version baseline after reviewing the current Overview. The next upload or re-process will
          show what changed — review prompts only, no automatic export updates.
        </p>
      ) : null}

      {model.hasPrevious && model.noChanges ? (
        <p className="text-xs text-slate-400">No grouped changes since the last saved baseline.</p>
      ) : null}

      {model.groups.length ? (
        <div className="space-y-3">
          {model.groups.map((group) => (
            <div
              key={group.id}
              className="rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 space-y-1.5"
              data-testid={`rerun-diff-group-${group.id}`}
            >
              <p className="text-xs font-semibold text-slate-200">{group.title}</p>
              <ul className="list-disc pl-4 space-y-1">
                {group.lines.map((line) => (
                  <li key={line} className="text-[11px] text-slate-300 leading-relaxed">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {model.exportImpact?.current ? (
        <div className="rounded border border-slate-800/80 px-3 py-2 text-[11px] text-slate-400 space-y-1">
          <p>
            <span className="text-slate-500">Current export: </span>
            {model.exportImpact.current.exportType} · {model.exportImpact.current.exportId} ·{" "}
            {model.exportImpact.current.generatedAt}
          </p>
          {model.exportImpact.previous ? (
            <p>
              <span className="text-slate-500">Previous export: </span>
              {model.exportImpact.previous.exportId} · {model.exportImpact.previous.generatedAt}
            </p>
          ) : null}
          {model.solicitorReviewRecommended ? (
            <Badge variant="outline" className="text-[9px] mt-1">
              Review exports before sending
            </Badge>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
