"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FileDiff, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { buildEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/build-evidence-change-snapshot";
import { compareEvidenceChanges } from "@/lib/criminal/evidence-change-detector/compare-evidence-changes";
import { shouldShowEvidenceChangeDetector } from "@/lib/criminal/evidence-change-detector/evidence-change-flag";
import {
  loadEvidenceChangeSnapshotForCompare,
  saveEvidenceChangeSnapshotAsync,
} from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import type { EvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-types";
import { useEvidenceChangeSnapshotPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { BuildEvidenceSourceStateInput } from "@/lib/criminal/evidence-change-detector/build-evidence-source-state";
import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { ExpandableStringList } from "./reasoningV2Ui";

export type EvidenceChangeDetectorPanelProps = {
  compact?: boolean;
  caseId: string;
  reasoningV2Enabled: boolean;
  evidenceChangesEnabled: boolean;
  reasoningResult: ReasoningV2Result | null;
  clientStressResult?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput | null;
  sourceStateInput?: BuildEvidenceSourceStateInput | null;
  loading?: boolean;
};

function DetailBlock({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className={workflowSectionTitle}>{title}</p>
      <ExpandableStringList
        items={items}
        previewCount={4}
        className="list-disc pl-4 space-y-1 text-xs text-slate-800 leading-relaxed mt-1"
      />
    </div>
  );
}

export function EvidenceChangeDetectorPanel({
  compact = false,
  caseId,
  reasoningV2Enabled,
  evidenceChangesEnabled,
  reasoningResult,
  clientStressResult = null,
  readinessInput = null,
  sourceStateInput = null,
  loading = false,
}: EvidenceChangeDetectorPanelProps) {
  const snapshotPersistenceEnabled = useEvidenceChangeSnapshotPersistenceEnabled();
  const [expanded, setExpanded] = useState(false);
  const [previousSnapshot, setPreviousSnapshot] = useState<EvidenceChangeSnapshot | null>(null);
  const [snapshotLoaded, setSnapshotLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const hasReasoning = reasoningResult?.available === true;

  const visible = shouldShowEvidenceChangeDetector(
    reasoningV2Enabled,
    evidenceChangesEnabled,
    hasReasoning,
  );

  const reloadPreviousSnapshot = useCallback(async () => {
    if (!visible) return;
    setSnapshotLoaded(false);
    const prev = await loadEvidenceChangeSnapshotForCompare(caseId, {
      persistenceEnabled: snapshotPersistenceEnabled,
    });
    setPreviousSnapshot(prev);
    setSavedAt(prev?.timestamp ?? null);
    setSnapshotLoaded(true);
  }, [visible, caseId, snapshotPersistenceEnabled]);

  useEffect(() => {
    void reloadPreviousSnapshot();
  }, [reloadPreviousSnapshot, refreshKey]);

  const currentSnapshot = useMemo(() => {
    if (!hasReasoning) return null;
    return buildEvidenceChangeSnapshot({
      reasoning: reasoningResult,
      clientStress: clientStressResult,
      readinessInput: readinessInput ?? undefined,
      sourceStateInput: sourceStateInput ?? undefined,
    });
  }, [hasReasoning, reasoningResult, clientStressResult, readinessInput, sourceStateInput]);

  const comparison = useMemo(() => {
    if (!currentSnapshot || !snapshotLoaded) return null;
    return compareEvidenceChanges(previousSnapshot, currentSnapshot);
  }, [currentSnapshot, previousSnapshot, snapshotLoaded]);

  const onSaveSnapshot = useCallback(async () => {
    if (!currentSnapshot || saving) return;
    setSaving(true);
    setSaveConfirm(null);
    try {
      const result = await saveEvidenceChangeSnapshotAsync(caseId, currentSnapshot, {
        persistenceEnabled: snapshotPersistenceEnabled,
      });
      if (result.ok && result.snapshot) {
        setPreviousSnapshot(result.snapshot);
        setSavedAt(result.snapshot.timestamp);
        setSaveConfirm("Snapshot saved for review");
        setRefreshKey((k) => k + 1);
      }
    } finally {
      setSaving(false);
    }
  }, [caseId, currentSnapshot, saving, snapshotPersistenceEnabled]);

  if (!reasoningV2Enabled || !evidenceChangesEnabled) return null;

  if (loading) {
    return (
      <div
        className={compact ? "rounded-md border border-slate-200 bg-white px-3 py-2" : `${workflowCard} border-slate-200`}
        data-testid="evidence-change-detector"
      >
        <p className={`text-xs ${workflowMuted}`}>Loading evidence changes…</p>
      </div>
    );
  }

  if (!hasReasoning) {
    return (
      <div
        className={compact ? "rounded-md border border-slate-200 bg-white px-3 py-2" : `${workflowCard} border-slate-200`}
        data-testid="evidence-change-detector"
      >
        <p className={`text-xs ${workflowMuted}`}>{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
      </div>
    );
  }

  if (!comparison?.available) return null;

  if (compact) {
    return (
      <div
        className="rounded-md border border-indigo-100 bg-indigo-50/40 px-3 py-2 min-w-0"
        data-testid="evidence-change-detector"
      >
        <div className="flex flex-wrap items-center gap-2">
          <FileDiff className="h-3.5 w-3.5 text-indigo-800 shrink-0" />
          <span className="text-xs font-semibold text-indigo-950">Evidence changes since last review</span>
          {comparison.solicitorReviewRequired ? (
            <Badge variant="secondary" size="sm" className="text-[10px] bg-amber-50 text-amber-900">
              Review
            </Badge>
          ) : null}
        </div>
        <p className="text-[11px] text-slate-700 mt-1 break-words">{comparison.changeSummary}</p>
        {comparison.topChanges[0] ? (
          <p className="text-[11px] text-slate-600 mt-1 break-words">{comparison.topChanges[0]}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={`${workflowCard} border-indigo-100/80 min-w-0`}
      aria-label="Evidence changes since last review"
      data-testid="evidence-change-detector"
    >
      <div className="border-b border-slate-100 bg-indigo-50/50 px-4 py-3 flex flex-wrap items-center gap-2">
        <FileDiff className="h-4 w-4 text-indigo-800 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Evidence changes since last review</h2>
          <p className={`text-[11px] ${workflowMuted}`}>
            Compare before relying on previous position — not prediction or legal advice.
          </p>
        </div>
        {comparison.solicitorReviewRequired ? (
          <Badge variant="secondary" size="sm" className="bg-amber-50 text-amber-900 shrink-0">
            Solicitor review
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-3 min-w-0">
        <p className="text-xs text-slate-700 leading-relaxed break-words">{comparison.changeSummary}</p>
        {savedAt ? (
          <p className={`text-[11px] ${workflowMuted}`}>
            Last saved snapshot: {new Date(savedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        ) : (
          <p className={`text-[11px] ${workflowMuted}`}>No saved snapshot for this matter yet.</p>
        )}

        {saveConfirm ? (
          <p className="text-[11px] text-indigo-900" data-testid="evidence-change-save-confirm">
            {saveConfirm}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            onClick={() => void onSaveSnapshot()}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : comparison.hasPreviousSnapshot
                ? "Update snapshot after review"
                : "Save current snapshot"}
          </Button>
          {comparison.hasPreviousSnapshot ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setRefreshKey((k) => k + 1)}
            >
              Compare to last snapshot
            </Button>
          ) : null}
        </div>

        {comparison.sourceMaterialChanged ? (
          <div className="rounded-md border border-indigo-200 bg-indigo-50/70 px-3 py-2">
            <p className="text-xs font-medium text-indigo-950 break-words">
              Source material appears to have changed — compare before relying on previous position.
            </p>
          </div>
        ) : null}

        {comparison.solicitorReviewRequired ? (
          <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
            <p className="text-xs text-amber-950">
              Paper-state changes may affect route, readiness, or hearing wording — solicitor review before
              finalising position.
            </p>
          </div>
        ) : null}

        {comparison.topChanges.length ? (
          <ExpandableStringList items={comparison.topChanges} previewCount={5} />
        ) : null}

        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left pt-1"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className={`${workflowSectionTitle} text-indigo-900`}>Change detail</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          )}
        </button>

        {expanded ? (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <DetailBlock title="Source state changes" items={comparison.sourceStateChanges} />
            <DetailBlock title="Closed missing items" items={comparison.closedMissingItems} />
            <DetailBlock title="New missing items" items={comparison.newMissingItems} />
            <DetailBlock title="Contradictions" items={comparison.newOrChangedContradictions} />
            <DetailBlock title="Route impact" items={comparison.routeImpact} />
            <DetailBlock title="Readiness impact" items={comparison.readinessImpact} />
            <DetailBlock title="Disclosure chase updates" items={comparison.disclosureChaseUpdates} />
            <DetailBlock title="Client instruction updates" items={comparison.clientInstructionUpdates} />
            <DetailBlock title="Do-not-concede changes" items={comparison.doNotConcedeChanges} />
            {comparison.warRoomHearingLineUpdate ? (
              <div className="min-w-0">
                <p className={workflowSectionTitle}>War Room / hearing line</p>
                <p className="text-xs text-slate-800 mt-1 break-words">
                  {comparison.warRoomHearingLineUpdate}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
