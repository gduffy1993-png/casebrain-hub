"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { H5FeedbackFlag } from "@/components/criminal/feedback-console/H5FeedbackFlag";
import {
  buildAdviceChangeRadar,
  buildMatterEvidenceSnapshot,
} from "@/lib/criminal/advice-change-radar";
import type { AdviceChangeRadarModel } from "@/lib/criminal/advice-change-radar";
import type { CriminalBriefPlan } from "@/lib/criminal/brief-plan/types";
import type { DisclosureChaseBrief } from "@/components/criminal/disclosure-chase/buildDisclosureChaseBrief";
import type { HearingWarRoomBrief } from "@/components/criminal/hearing-war-room/buildHearingWarRoomBrief";
import type { MatterConfidenceResult } from "@/lib/criminal/matter-confidence/matter-confidence-types";
import type { BuildEvidenceSourceStateInput } from "@/lib/criminal/evidence-change-detector/build-evidence-source-state";
import {
  loadEvidenceChangeSnapshotForCompare,
  saveEvidenceChangeSnapshotAsync,
} from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import { workflowPilotCard, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";

type BundleMeta = BuildEvidenceSourceStateInput & {
  documentCount: number;
  combinedTextLength: number;
};

type AdviceChangeRadarPanelProps = {
  caseId: string;
  warRoom: HearingWarRoomBrief;
  chase: DisclosureChaseBrief;
  briefPlan: CriminalBriefPlan;
  matterConfidence: MatterConfidenceResult | null;
  primaryRouteTitle: string | null;
  bundleMeta: BundleMeta | null;
};

function pressureLabel(direction: AdviceChangeRadarModel["items"][number]["pressureDirection"]): string | null {
  if (!direction) return null;
  switch (direction) {
    case "may_strengthen":
      return "May strengthen pressure";
    case "may_weaken":
      return "May weaken pressure";
    default:
      return "Review if served";
  }
}

export function AdviceChangeRadarPanel({
  caseId,
  warRoom,
  chase,
  briefPlan,
  matterConfidence,
  primaryRouteTitle,
  bundleMeta,
}: AdviceChangeRadarPanelProps) {
  const [previousSnapshot, setPreviousSnapshot] = useState<Awaited<
    ReturnType<typeof loadEvidenceChangeSnapshotForCompare>
  > | null>(null);
  const [baselineLoaded, setBaselineLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  const sourceStateInput = useMemo((): BuildEvidenceSourceStateInput | null => {
    if (!bundleMeta) return null;
    return {
      documentCount: bundleMeta.documentCount,
      combinedTextLength: bundleMeta.combinedTextLength,
      snippets: bundleMeta.snippets,
      documentRows: bundleMeta.documentRows,
      frontMatterScan: bundleMeta.frontMatterScan,
    };
  }, [bundleMeta]);

  const currentSnapshot = useMemo(() => {
    return buildMatterEvidenceSnapshot({
      warRoom,
      chase,
      briefPlan,
      primaryRouteTitle,
      documentCount: bundleMeta?.documentCount ?? 0,
      sourceStateInput,
    });
  }, [warRoom, chase, briefPlan, primaryRouteTitle, bundleMeta?.documentCount, sourceStateInput]);

  const reloadBaseline = useCallback(async () => {
    const prev = await loadEvidenceChangeSnapshotForCompare(caseId);
    setPreviousSnapshot(prev);
    setBaselineLoaded(true);
  }, [caseId]);

  useEffect(() => {
    void reloadBaseline();
  }, [reloadBaseline, currentSnapshot.timestamp]);

  const model = useMemo((): AdviceChangeRadarModel => {
    return buildAdviceChangeRadar({
      warRoom,
      chase,
      briefPlan,
      matterConfidence,
      previousSnapshot,
      currentSnapshot,
    });
  }, [warRoom, chase, briefPlan, matterConfidence, previousSnapshot, currentSnapshot]);

  const saveBaseline = async () => {
    setSaving(true);
    setSaveNote(null);
    try {
      const result = await saveEvidenceChangeSnapshotAsync(caseId, currentSnapshot);
      if (result.ok) {
        setSaveNote("Papers baseline saved for this case.");
        await reloadBaseline();
      } else {
        setSaveNote("Could not save baseline — try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!baselineLoaded) return null;
  if (!model.items.length) return null;

  return (
    <section className={`${workflowPilotCard} px-4 py-3 space-y-3`} data-testid="advice-change-radar">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className={workflowSectionTitle}>Advice change radar</h2>
          <p className="text-[11px] text-slate-500 mt-1">{model.reviewNotice}</p>
          <p className="text-xs text-slate-400 mt-1">{model.changeSummary}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs shrink-0"
          disabled={saving}
          onClick={() => void saveBaseline()}
          data-testid="advice-radar-save-baseline"
        >
          {saving ? "Saving…" : model.hasBaseline ? "Refresh baseline" : "Save papers baseline"}
        </Button>
        <H5FeedbackFlag caseId={caseId} surface="advice_change_radar" section="items" />
      </div>
      {saveNote ? <p className="text-[11px] text-emerald-400/90">{saveNote}</p> : null}
      {!model.hasBaseline ? (
        <p className="text-[11px] text-amber-400/90 rounded border border-amber-500/20 bg-amber-950/20 px-2 py-1.5">
          Save a papers baseline after reviewing the current position. The next upload will flag what changed.
        </p>
      ) : null}
      <ul className="space-y-3">
        {model.items.map((item) => (
          <li
            key={item.id}
            className="rounded-md border border-slate-800/80 bg-slate-950/30 px-3 py-2.5 space-y-1.5"
            data-testid={`advice-radar-item-${item.id}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-100">{item.whatChanged}</p>
              <Badge variant="outline" size="sm" className="text-[9px]">
                {item.kind === "material_change" ? "Change detected" : "Watch point"}
              </Badge>
              {item.pressureDirection ? (
                <Badge variant="secondary" size="sm" className="text-[9px]">
                  {pressureLabel(item.pressureDirection)}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-300">
              <span className="font-medium text-slate-400">Why it matters: </span>
              {item.whyItMatters}
            </p>
            <p className="text-xs text-slate-400">
              <span className="font-medium text-slate-500">Affected output: </span>
              {item.affectedOutput}
            </p>
            <p className="text-[11px] text-amber-400/90">
              <span className="font-medium text-amber-300/80">Review: </span>
              {item.reviewNeeded}
            </p>
            <p className="text-[11px] text-rose-400/80">
              <span className="font-medium text-rose-300/70">Do not rely on yet: </span>
              {item.doNotRelyOnYet}
            </p>
            {item.currentSourceState ? (
              <p className="text-[11px] text-slate-500">
                <span className="font-medium">Current source state: </span>
                {item.currentSourceState}
              </p>
            ) : null}
            <p className="text-[11px] text-blue-300/90">
              <span className="font-medium text-blue-200/80">Safe next action: </span>
              {item.safeNextAction}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
