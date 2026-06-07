"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Copy, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted } from "@/components/criminal/workflow/workflowUi";
import { buildClientExplanation } from "@/lib/criminal/client-explanation/build-client-explanation";
import { shouldShowClientExplanation } from "@/lib/criminal/client-explanation/client-explanation-flag";
import { compareEvidenceChanges } from "@/lib/criminal/evidence-change-detector/compare-evidence-changes";
import { buildEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/build-evidence-change-snapshot";
import { loadEvidenceChangeSnapshot } from "@/lib/criminal/evidence-change-detector/evidence-change-snapshot-storage";
import { computeExportHash } from "@/lib/criminal/disclosure-export/export-review-hash";
import { buildExportReviewMetadata } from "@/lib/criminal/disclosure-export/export-review-metadata";
import { saveExportReview } from "@/lib/criminal/disclosure-export/export-review-storage";
import { useExportReviewPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import type { PreHearingReadinessInput } from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";

export type ClientExplanationPanelProps = {
  caseId: string;
  caseLabel: string;
  clientLabel?: string | null;
  stage?: string | null;
  hearingDateIso?: string | null;
  reasoningV2Enabled: boolean;
  clientExplainEnabled: boolean;
  reasoningResult: ReasoningV2Result | null;
  clientStressResult?: ClientStressResult | null;
  readinessInput?: PreHearingReadinessInput | null;
  loading?: boolean;
};

export function ClientExplanationPanel({
  caseId,
  caseLabel,
  clientLabel = null,
  stage = null,
  hearingDateIso = null,
  reasoningV2Enabled,
  clientExplainEnabled,
  reasoningResult,
  clientStressResult = null,
  readinessInput = null,
  loading = false,
}: ClientExplanationPanelProps) {
  const exportReviewPersistence = useExportReviewPersistenceEnabled();
  const [copied, setCopied] = useState(false);
  const [reviewConfirm, setReviewConfirm] = useState<string | null>(null);
  const [savingReview, setSavingReview] = useState(false);
  const lastGeneratedKeyRef = useRef<string>("");

  const hasReasoning = reasoningResult?.available === true;

  const visible = shouldShowClientExplanation(
    reasoningV2Enabled,
    clientExplainEnabled,
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

  const explanation = useMemo(() => {
    if (!visible || !hasReasoning) return null;
    return buildClientExplanation(
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
      solicitorReviewRequired: true,
    };
  }, [hasReasoning, reasoningResult, clientStressResult, readinessInput]);

  const persistReview = useCallback(
    async (
      reviewStatus: "generated" | "copied" | "reviewed" | "needs_review",
      exportHash: string | null,
      confirmMessage: string,
    ) => {
      if (!metadataCtx || !exportReviewPersistence) return;
      setSavingReview(true);
      try {
        const input = buildExportReviewMetadata(
          caseId,
          "client_explanation",
          reviewStatus,
          { ...metadataCtx, exportHash },
        );
        const result = await saveExportReview(input, { persistenceEnabled: true });
        if (result.ok) setReviewConfirm(confirmMessage);
      } finally {
        setSavingReview(false);
      }
    },
    [metadataCtx, exportReviewPersistence, caseId],
  );

  useEffect(() => {
    if (!exportReviewPersistence || !explanation?.available || !metadataCtx) return;
    let cancelled = false;
    void (async () => {
      const hash = await computeExportHash(explanation.fullText);
      if (cancelled || !hash) return;
      if (lastGeneratedKeyRef.current === hash) return;
      lastGeneratedKeyRef.current = hash;
      await persistReview("generated", hash, "Export review saved");
    })();
    return () => {
      cancelled = true;
    };
  }, [exportReviewPersistence, explanation, metadataCtx, persistReview]);

  const onCopy = async () => {
    if (!explanation?.available) return;
    try {
      await navigator.clipboard.writeText(explanation.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (exportReviewPersistence && metadataCtx) {
        const hash = await computeExportHash(explanation.fullText);
        await persistReview(
          "copied",
          hash,
          "Draft copied — solicitor review still required",
        );
      }
    } catch {
      /* clipboard blocked */
    }
  };

  if (!reasoningV2Enabled || !clientExplainEnabled) return null;

  if (loading) {
    return (
      <div className={`${workflowCard} border-slate-200`} data-testid="client-explanation-panel">
        <p className={`text-xs ${workflowMuted} px-4 py-3`}>Loading client explanation draft…</p>
      </div>
    );
  }

  if (!hasReasoning) {
    return (
      <div className={`${workflowCard} border-slate-200`} data-testid="client-explanation-panel">
        <p className={`text-xs ${workflowMuted} px-4 py-3`}>{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
      </div>
    );
  }

  if (!explanation?.available) return null;

  return (
    <section
      className={`${workflowCard} border-teal-100/80 min-w-0`}
      aria-label="Client explanation draft"
      data-testid="client-explanation-panel"
    >
      <div className="border-b border-slate-100 bg-teal-50/50 px-4 py-3 flex flex-wrap items-center gap-2">
        <MessageCircle className="h-4 w-4 text-teal-800 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">Client explanation draft</h2>
          <p className={`text-[11px] ${workflowMuted}`}>
            Plain-English draft for solicitor review — not sent to client automatically.
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
            Draft only — solicitor review required. Not legal advice, not plea advice, not a prediction.
          </p>
        </div>

        <textarea
          readOnly
          value={explanation.fullText}
          rows={16}
          className="w-full rounded-md border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 leading-relaxed resize-y min-h-[14rem]"
          aria-label="Client explanation preview"
        />

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
                onClick={() => void persistReview("reviewed", null, "Export review saved")}
              >
                Mark reviewed
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={savingReview}
                onClick={() => void persistReview("needs_review", null, "Export review saved")}
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
      </div>
    </section>
  );
}
