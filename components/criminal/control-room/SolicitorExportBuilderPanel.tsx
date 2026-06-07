"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, FileOutput } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { buildSolicitorExport } from "@/lib/criminal/disclosure-export/build-solicitor-export";
import { shouldShowSolicitorExportBuilder } from "@/lib/criminal/disclosure-export/export-flag";
import { computeExportHash } from "@/lib/criminal/disclosure-export/export-review-hash";
import {
  buildExportReviewMetadata,
  solicitorReviewRequiredFromExport,
} from "@/lib/criminal/disclosure-export/export-review-metadata";
import { saveExportReview } from "@/lib/criminal/disclosure-export/export-review-storage";
import type { ExportReviewType } from "@/lib/criminal/disclosure-export/export-review-types";
import type { SolicitorExportType } from "@/lib/criminal/disclosure-export/export-types";
import { compareEvidenceChanges } from "@/lib/criminal/evidence-change-detector/compare-evidence-changes";
import { buildEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/build-evidence-change-snapshot";
import { loadEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import { useExportReviewPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";

export type SolicitorExportBuilderPanelProps = {
  compact?: boolean;
  caseId: string;
  caseLabel: string;
  clientLabel?: string | null;
  stage?: string | null;
  hearingDateIso?: string | null;
  reasoningV2Enabled: boolean;
  exportsEnabled: boolean;
  reasoningResult: ReasoningV2Result | null;
  clientStressResult?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput | null;
  loading?: boolean;
};

const EXPORT_OPTIONS: { value: SolicitorExportType; label: string }[] = [
  { value: "disclosure_chase", label: "Disclosure chase" },
  { value: "hearing_prep", label: "Hearing prep note" },
  { value: "case_handover", label: "Case handover" },
];

function toExportReviewType(type: SolicitorExportType): ExportReviewType {
  return type;
}

export function SolicitorExportBuilderPanel({
  compact = false,
  caseId,
  caseLabel,
  clientLabel = null,
  stage = null,
  hearingDateIso = null,
  reasoningV2Enabled,
  exportsEnabled,
  reasoningResult,
  clientStressResult = null,
  readinessInput = null,
  loading = false,
}: SolicitorExportBuilderPanelProps) {
  const exportReviewPersistence = useExportReviewPersistenceEnabled();
  const [exportType, setExportType] = useState<SolicitorExportType>("disclosure_chase");
  const [copied, setCopied] = useState(false);
  const [reviewConfirm, setReviewConfirm] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const lastGeneratedKeyRef = useRef<string>("");

  const hasReasoning = reasoningResult?.available === true;

  const visible = shouldShowSolicitorExportBuilder(
    reasoningV2Enabled,
    exportsEnabled,
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

  const exportDraft = useMemo(() => {
    if (!visible || !hasReasoning) return null;
    return buildSolicitorExport(
      exportType,
      reasoningResult,
      { caseLabel, clientLabel, stage, hearingDateIso },
      {
        clientStress: clientStressResult,
        readinessInput: readinessInput ?? undefined,
        evidenceChanges,
      },
    );
  }, [
    visible,
    hasReasoning,
    exportType,
    reasoningResult,
    caseLabel,
    clientLabel,
    stage,
    hearingDateIso,
    clientStressResult,
    readinessInput,
    evidenceChanges,
  ]);

  const metadataCtx = useMemo(() => {
    if (!hasReasoning) return null;
    return {
      reasoning: reasoningResult,
      clientStress: clientStressResult,
      readinessInput,
      solicitorReviewRequired: solicitorReviewRequiredFromExport(exportDraft),
    };
  }, [hasReasoning, reasoningResult, clientStressResult, readinessInput, exportDraft]);

  const persistReview = useCallback(
    async (
      reviewStatus: "generated" | "copied" | "reviewed" | "needs_review",
      exportHash: string | null,
      confirmMessage: string,
    ) => {
      if (!metadataCtx || !exportReviewPersistence) return;
      setSavingReview(true);
      try {
        const input = buildExportReviewMetadata(caseId, toExportReviewType(exportType), reviewStatus, {
          ...metadataCtx,
          exportHash,
        });
        const result = await saveExportReview(input, { persistenceEnabled: true });
        if (result.ok) setReviewConfirm(confirmMessage);
      } finally {
        setSavingReview(false);
      }
    },
    [metadataCtx, exportReviewPersistence, caseId, exportType],
  );

  useEffect(() => {
    if (!exportReviewPersistence || !exportDraft?.fullText || !metadataCtx) return;
    let cancelled = false;
    void (async () => {
      const hash = await computeExportHash(exportDraft.fullText);
      if (cancelled || !hash) return;
      const key = `${exportType}:${hash}`;
      if (lastGeneratedKeyRef.current === key) return;
      lastGeneratedKeyRef.current = key;
      await persistReview("generated", hash, "Export review saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [exportReviewPersistence, exportDraft, exportType, metadataCtx, persistReview]);

  const onCopy = async () => {
    if (!exportDraft?.fullText) return;
    try {
      await navigator.clipboard.writeText(exportDraft.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (exportReviewPersistence && metadataCtx) {
        const hash = await computeExportHash(exportDraft.fullText);
        const needsReview = solicitorReviewRequiredFromExport(exportDraft);
        await persistReview(
          "copied",
          hash,
          needsReview
            ? "Draft copied — solicitor review still required"
            : "Export review saved",
        );
      }
    } catch {
      /* clipboard blocked */
    }
  };

  const onMarkReviewed = () =>
    void persistReview("reviewed", null, "Export review saved");

  const onNeedsReview = () =>
    void persistReview("needs_review", null, "Export review saved");

  if (!reasoningV2Enabled || !exportsEnabled) return null;

  if (loading) {
    return (
      <div
        className={compact ? "rounded-md border border-slate-200 bg-white px-3 py-2" : `${workflowCard} border-slate-200`}
        data-testid="solicitor-export-builder"
      >
        <p className={`text-xs ${workflowMuted}`}>Loading draft outputs…</p>
      </div>
    );
  }

  if (!hasReasoning) {
    return (
      <div
        className={compact ? "rounded-md border border-slate-200 bg-white px-3 py-2" : `${workflowCard} border-slate-200`}
        data-testid="solicitor-export-builder"
      >
        <p className={`text-xs ${workflowMuted}`}>{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className="rounded-md border border-slate-200 bg-white px-3 py-2 min-w-0"
        data-testid="solicitor-export-builder"
      >
        <div className="flex flex-wrap items-center gap-2">
          <FileOutput className="h-3.5 w-3.5 text-slate-700 shrink-0" />
          <span className="text-xs font-semibold text-slate-900">Draft solicitor outputs</span>
        </div>
        <p className={`text-[11px] ${workflowMuted} mt-1`}>Open Control Room for full preview and copy.</p>
      </div>
    );
  }

  return (
    <section
      className={`${workflowCard} border-slate-200 min-w-0`}
      aria-label="Draft solicitor outputs"
      data-testid="solicitor-export-builder"
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 flex flex-wrap items-center gap-2">
        <FileOutput className="h-4 w-4 text-slate-700 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Draft solicitor outputs</h2>
          <p className={`text-[11px] ${workflowMuted}`}>
            Generated from source-backed reasoning — draft only, not for automatic sending.
          </p>
        </div>
        <Badge variant="secondary" size="sm" className="bg-amber-50 text-amber-900 shrink-0">
          Draft only
        </Badge>
      </div>

      <div className="px-4 py-3 space-y-3 min-w-0">
        <div className="rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-950">
            Draft only — solicitor review required. Not a final court document. No automatic send.
          </p>
        </div>

        <div>
          <p className={workflowSectionTitle}>Export type</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {EXPORT_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={exportType === opt.value ? "primary" : "outline"}
                className="h-8 text-[11px]"
                onClick={() => {
                  setExportType(opt.value);
                  setReviewConfirm(null);
                }}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {exportDraft ? (
          <>
            <div className="min-w-0">
              <p className={workflowSectionTitle}>Preview</p>
              <textarea
                readOnly
                value={exportDraft.fullText}
                rows={14}
                className="mt-1.5 w-full rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 font-mono leading-relaxed resize-y min-h-[12rem]"
                aria-label="Export draft preview"
              />
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" size="sm" className="h-8 text-xs gap-1.5" onClick={() => void onCopy()}>
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied" : "Copy draft"}
              </Button>
              {exportReviewPersistence ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={savingReview}
                    onClick={onMarkReviewed}
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    disabled={savingReview}
                    onClick={onNeedsReview}
                  >
                    Needs review
                  </Button>
                </>
              ) : null}
            </div>
            {reviewConfirm ? (
              <p className="text-[11px] text-indigo-900" data-testid="export-review-confirm">
                {reviewConfirm}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
