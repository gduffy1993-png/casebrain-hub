"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { workflowCard, workflowMuted, workflowSectionTitle } from "@/components/criminal/workflow/workflowUi";
import { buildPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/build-pre-hearing-readiness";
import { shouldShowPreHearingReadiness } from "@/lib/criminal/pre-hearing-readiness/readiness-flag";
import type {
  PreHearingReadinessBundleMeta,
  PreHearingReadinessHearingMeta,
} from "@/lib/criminal/pre-hearing-readiness/readiness-types";
import type { ClientStressResult } from "@/lib/criminal/client-stress-test/client-stress-types";
import type { ReasoningV2Result } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { REASONING_V2_UNAVAILABLE_MESSAGE } from "@/lib/criminal/reasoning-v2/reasoning-v2-types";
import { ExpandableStringList } from "./reasoningV2Ui";

export type PreHearingReadinessBadgeProps = {
  compact?: boolean;
  reasoningV2Enabled: boolean;
  readinessEnabled: boolean;
  reasoningResult: ReasoningV2Result | null;
  clientStressResult?: ClientStressResult | null;
  bundleMeta?: PreHearingReadinessBundleMeta | null;
  hearingMeta?: PreHearingReadinessHearingMeta | null;
  workflowProfileHint?: string | null;
  loading?: boolean;
};

const LEVEL_STYLES = {
  green: "bg-emerald-50 text-emerald-900 border-emerald-200",
  amber: "bg-amber-50 text-amber-950 border-amber-200",
  red: "bg-rose-50 text-rose-950 border-rose-200",
} as const;

function DetailSection({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="min-w-0">
      <p className={workflowSectionTitle}>{title}</p>
      <ExpandableStringList items={items} previewCount={4} className="list-disc pl-4 space-y-1 text-xs text-slate-800 leading-relaxed mt-1" />
    </div>
  );
}

export function PreHearingReadinessBadge({
  compact = false,
  reasoningV2Enabled,
  readinessEnabled,
  reasoningResult,
  clientStressResult = null,
  bundleMeta = null,
  hearingMeta = null,
  workflowProfileHint = null,
  loading = false,
}: PreHearingReadinessBadgeProps) {
  const [expanded, setExpanded] = useState(false);
  const hasReasoning = reasoningResult?.available === true;

  const visible = shouldShowPreHearingReadiness(
    reasoningV2Enabled,
    readinessEnabled,
    hasReasoning,
  );

  const readiness = useMemo(() => {
    if (!visible || !hasReasoning) return null;
    return buildPreHearingReadiness(reasoningResult, clientStressResult, {
      bundleMeta,
      hearingMeta,
      workflowProfileHint,
    });
  }, [
    visible,
    hasReasoning,
    reasoningResult,
    clientStressResult,
    bundleMeta,
    hearingMeta,
    workflowProfileHint,
  ]);

  if (!reasoningV2Enabled || !readinessEnabled) return null;

  if (loading) {
    return (
      <div
        className={`${compact ? "rounded-md border border-slate-200 bg-white px-3 py-2" : `${workflowCard} border-slate-200`} min-w-0`}
        data-testid="pre-hearing-readiness-badge"
      >
        <p className={`text-xs ${workflowMuted}`}>Loading pre-hearing readiness…</p>
      </div>
    );
  }

  if (!hasReasoning) {
    return (
      <div
        className={`${compact ? "rounded-md border border-slate-200 bg-white px-3 py-2" : `${workflowCard} border-slate-200`} min-w-0`}
        data-testid="pre-hearing-readiness-badge"
      >
        <p className={`text-xs ${workflowMuted}`}>{REASONING_V2_UNAVAILABLE_MESSAGE}</p>
      </div>
    );
  }

  if (!readiness?.available) return null;

  const levelStyle = LEVEL_STYLES[readiness.level];

  if (compact) {
    return (
      <div
        className={`rounded-md border px-3 py-2 min-w-0 ${levelStyle}`}
        data-testid="pre-hearing-readiness-badge"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="text-xs font-semibold">{readiness.label}</span>
          {readiness.solicitorReviewRequired ? (
            <Badge variant="secondary" size="sm" className="text-[10px] bg-white/70">
              Solicitor review
            </Badge>
          ) : null}
        </div>
        {readiness.topBlockers[0] ? (
          <p className="text-[11px] mt-1 opacity-90 break-words">{readiness.topBlockers[0]}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className={`${workflowCard} border-slate-200 min-w-0`}
      aria-label="Pre-hearing readiness"
      data-testid="pre-hearing-readiness-badge"
    >
      <div className={`px-4 py-3 border-b flex flex-wrap items-center gap-2 ${levelStyle}`}>
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Pre-hearing readiness</h2>
          <p className="text-xs mt-0.5 opacity-90">{readiness.label}</p>
        </div>
        {readiness.solicitorReviewRequired ? (
          <Badge variant="secondary" size="sm" className="bg-white/80 shrink-0">
            Solicitor review required
          </Badge>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-2 min-w-0">
        <p className="text-xs text-slate-700 leading-relaxed break-words">{readiness.explanation}</p>
        <p className={`text-[11px] ${workflowMuted}`}>
          Not case strength · not plea advice · papers readiness only
        </p>

        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left pt-1"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          <span className={`${workflowSectionTitle} text-indigo-900`}>Why this readiness?</span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
          )}
        </button>

        {expanded ? (
          <div className="space-y-3 pt-1 border-t border-slate-100">
            {readiness.topBlockers.length ? (
              <div className="rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2">
                <p className={`${workflowSectionTitle} flex items-center gap-1`}>
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-700" />
                  Top blockers
                </p>
                <ExpandableStringList items={readiness.topBlockers} previewCount={5} />
              </div>
            ) : null}
            <DetailSection title="Disclosure chase priorities" items={readiness.disclosureChasePriorities} />
            <DetailSection title="Client instruction gaps" items={readiness.clientInstructionGaps} />
            <DetailSection title="Do not concede / overstate" items={readiness.doNotConcedeRisks} />
            <div className="min-w-0">
              <p className={workflowSectionTitle}>Safe next action</p>
              <p className="text-xs text-slate-800 mt-1 break-words">{readiness.safeNextAction}</p>
            </div>
          </div>
        ) : (
          <ExpandableStringList items={readiness.topBlockers.slice(0, 3)} previewCount={3} />
        )}

        {!expanded && readiness.topBlockers.length > 3 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-1 text-[11px] text-indigo-800"
            onClick={() => setExpanded(true)}
          >
            Show why this readiness
          </Button>
        ) : null}
      </div>
    </section>
  );
}
