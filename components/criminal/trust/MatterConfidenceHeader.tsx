"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  EVIDENCE_COVERAGE_DISPLAY,
  SAFE_COURT_LINE_DISPLAY,
  SENDABILITY_DISPLAY,
  type MatterConfidenceResult,
  type SourceStateKind,
} from "@/lib/criminal/matter-confidence/matter-confidence-types";
import { SourceStateBadge, sourceStateBadgeLabel } from "./SourceStateBadge";

const LEVEL_VARIANTS: Record<
  MatterConfidenceResult["level"],
  "success" | "warning" | "secondary" | "danger"
> = {
  safe: "success",
  provisional: "secondary",
  needs_review: "warning",
  blocked: "danger",
};

function ReadinessGrid({ confidence }: { confidence: MatterConfidenceResult }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400 mt-1">
      <span>
        <span className="text-slate-500">Evidence:</span>{" "}
        {EVIDENCE_COVERAGE_DISPLAY[confidence.evidenceCoverage]}
      </span>
      <span>
        <span className="text-slate-500">Safe court line:</span>{" "}
        {SAFE_COURT_LINE_DISPLAY[confidence.safeCourtLineStatus]}
      </span>
      <span>
        <span className="text-slate-500">Chase:</span> {SENDABILITY_DISPLAY[confidence.chaseSendability]}
      </span>
      <span>
        <span className="text-slate-500">Summary:</span> {SENDABILITY_DISPLAY[confidence.summarySendability]}
      </span>
    </div>
  );
}

function SourceBadgeRow({
  visible,
  overflow,
  compact,
}: {
  visible: SourceStateKind[];
  overflow: SourceStateKind[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const showOverflow = expanded && overflow.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((state) => (
        <SourceStateBadge key={state} state={state} />
      ))}
      {overflow.length > 0 ? (
        <button
          type="button"
          className={
            compact
              ? "text-[10px] text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline"
              : "text-xs text-slate-500 hover:text-slate-300 underline-offset-2 hover:underline"
          }
          title={overflow.map(sourceStateBadgeLabel).join(" · ")}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Fewer badges" : `+${overflow.length} more`}
        </button>
      ) : null}
      {showOverflow
        ? overflow.map((state) => <SourceStateBadge key={`overflow-${state}`} state={state} />)
        : null}
    </div>
  );
}

export function MatterConfidenceHeader({
  confidence,
  compact = false,
}: {
  confidence: MatterConfidenceResult;
  compact?: boolean;
}) {
  const visible = confidence.sourceBadgesVisible ?? confidence.sourceBadges.slice(0, 3);
  const overflow = confidence.sourceBadgesOverflow ?? confidence.sourceBadges.slice(3);

  if (compact) {
    return (
      <div
        className="flex flex-col gap-1.5 border-t border-slate-700/70 pt-2 mt-2"
        data-testid="matter-confidence-header"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={LEVEL_VARIANTS[confidence.level]} size="sm">
            {confidence.label}
          </Badge>
          <SourceBadgeRow visible={visible} overflow={overflow} compact />
        </div>
        <ReadinessGrid confidence={confidence} />
        <p className="text-[11px] text-slate-400 line-clamp-2">
          <span className="text-slate-500 font-medium">Main issue:</span> {confidence.mainIssue}
        </p>
        <p className="text-[11px] text-slate-300 line-clamp-2">
          <span className="text-slate-500 font-medium">Next:</span> {confidence.nextBestAction}
        </p>
        {confidence.doNotRelyYetReason ? (
          <p className="text-[11px] text-amber-400/90 line-clamp-2">{confidence.doNotRelyYetReason}</p>
        ) : null}
      </div>
    );
  }

  return (
    <section
      className="rounded-lg border border-slate-700/60 bg-slate-900/40 px-3 py-2.5 space-y-2"
      data-testid="matter-confidence-header"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={LEVEL_VARIANTS[confidence.level]} size="sm">
          {confidence.label}
        </Badge>
        <SourceBadgeRow visible={visible} overflow={overflow} />
      </div>
      <ReadinessGrid confidence={confidence} />
      <div className="grid gap-1 text-xs text-slate-300">
        <p>
          <span className="font-medium text-slate-500">Main issue:</span> {confidence.mainIssue}
        </p>
        <p>
          <span className="font-medium text-slate-500">Next best action:</span> {confidence.nextBestAction}
        </p>
        {confidence.doNotRelyYetReason ? (
          <p className="text-amber-400/90">{confidence.doNotRelyYetReason}</p>
        ) : null}
      </div>
    </section>
  );
}

/** Section-level trust chrome for Today/Summary lines. */
export function TrustSectionChrome({
  title,
  sourceState = "provisional",
}: {
  title: string;
  sourceState?: "provisional" | "needs_review" | "not_safely_confirmed" | "missing" | "referred_only";
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{title}</span>
      <SourceStateBadge state={sourceState} />
    </div>
  );
}
