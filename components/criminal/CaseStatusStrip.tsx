"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";
import { isCriminalPilotMode } from "@/lib/pilot-mode";
import { pilotStrategyBasisDisplay, shouldSuppressPilotStrategyBasisReason } from "@/lib/criminal/pilot-workflow";
import { formatCaseBundleHealthLabel } from "@/lib/criminal/format-case-bundle-health";
import {
  assessBundleReadiness,
  resolveAnalysisStatusLabel,
} from "@/lib/criminal/bundle-readiness";

type CaseStatusStripProps = {
  snapshot: CaseSnapshot;
  /** When set (from Defence Plan), Position badge reflects this so it matches Strategy (e.g. Fight for Act Denial). */
  displayStrategyCategory?: "fight_charge" | "charge_reduction" | "outcome_management" | null;
};

export function CaseStatusStrip({ snapshot, displayStrategyCategory }: CaseStatusStripProps) {
  const pilotMode = isCriminalPilotMode();
  // Derive disclosure status conservatively
  const missingCount = snapshot.evidence.missingEvidence.filter(
    (item) => item.status === "MISSING" || item.status === "UNASSESSED"
  ).length;
  const docCount = Math.max(
    snapshot.analysis.docCount || 0,
    snapshot.evidence.documents.length,
    snapshot.analysis.isLargeBundle || (snapshot.analysis.rawCharsTotal ?? 0) > 0
      ? snapshot.analysis.docCount || snapshot.evidence.documents.length || 1
      : 0,
  );
  const bundleScore = snapshot.analysis.completenessScore;
  const bundleTier = snapshot.analysis.capabilityTier;
  const rawChars = snapshot.analysis.rawCharsTotal ?? 0;

  const readiness = assessBundleReadiness({
    documentCount: docCount,
    combinedTextLength: rawChars,
    pageCount: snapshot.analysis.pageCount ?? null,
    docs: snapshot.evidence.documents.map((d) => ({ name: d.name })),
  });

  const bundleBadgeText = formatCaseBundleHealthLabel({
    documentCount: readiness.effectiveDocumentCount,
    combinedTextLength: rawChars,
    capabilityTier: readiness.isLargeBundle
      ? readiness.extractionOk
        ? "partial"
        : bundleTier
      : bundleTier,
  });
  const bundleColor =
    readiness.isLargeBundle || bundleTier === "full"
      ? "bg-green-500/10 text-green-600 border-green-500/30"
      : bundleTier === "partial" || readiness.extractionOk
        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
        : "bg-blue-500/10 text-blue-600 border-blue-500/30";
  
  let disclosureStatus: "Thin" | "Partial" | "Good" = "Thin";
  let disclosureColor = "bg-amber-500/10 text-amber-600 border-amber-500/30";
  
  if (readiness.isLargeBundle || (docCount >= 3 && missingCount === 0)) {
    disclosureStatus = "Good";
    disclosureColor = "bg-green-500/10 text-green-600 border-green-500/30";
  } else if (docCount >= 1 || missingCount < 3 || readiness.extractionOk) {
    disclosureStatus = "Partial";
    disclosureColor = "bg-blue-500/10 text-blue-600 border-blue-500/30";
  }

  const analysisResolved = resolveAnalysisStatusLabel({
    canShowStrategyOutputs: snapshot.analysis.canShowStrategyOutputs,
    analysisMode: snapshot.analysis.mode,
    hasVersion: snapshot.analysis.hasVersion,
    hasRenderableStrategy: snapshot.strategy.hasRenderableData,
    readiness,
  });
  const analysisStatus = analysisResolved.label;
  const analysisColor =
    analysisStatus === "Complete"
      ? "bg-green-500/10 text-green-600 border-green-500/30"
      : analysisStatus === "Not run"
        ? "bg-muted/20 text-muted-foreground border-border/50"
        : "bg-amber-500/10 text-amber-600 border-amber-500/30";

  // Current position: prefer display strategy category when set so Position matches Strategy (e.g. Act Denial → Fight)
  const positionLabel = displayStrategyCategory
    ? (displayStrategyCategory === "fight_charge" ? "Fight" : displayStrategyCategory === "charge_reduction" ? "Reduce" : "Mitigate")
    : snapshot.decisionLog.currentPosition
      ? snapshot.decisionLog.currentPosition.position === "fight_charge"
        ? "Fight"
        : snapshot.decisionLog.currentPosition.position === "charge_reduction"
        ? "Reduce"
        : "Mitigate"
      : "Not recorded";

  // Format dates
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return null;
    }
  };

  const caseMeta = snapshot?.caseMeta;
  const lastUpdated = formatDate(caseMeta?.lastUpdatedAt ?? null);
  const nextHearingDate = formatDate(caseMeta?.hearingNextAt ?? null);
  const nextHearingType = caseMeta?.hearingNextType?.trim() || null;
  const nextHearing = nextHearingDate
    ? nextHearingType
      ? `${nextHearingType} ${nextHearingDate}`
      : nextHearingDate
    : null;

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/10">
      {/* Next Hearing – first for solicitor workflow */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Next:</span>
        <span className="text-xs font-semibold text-foreground">
          {nextHearing || "Not set"}
        </span>
      </div>

      {/* Bundle Completeness — shared health label (not Thin (0 docs) for large single PDF) */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Bundle:</span>
        <span title={bundleScore >= 0 ? `Completeness score: ${bundleScore}` : undefined}>
          <Badge className={`text-xs border ${bundleColor}`}>
            {bundleBadgeText}
          </Badge>
        </span>
      </div>

      {/* Disclosure Status */}
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Disclosure:</span>
        <Badge className={`text-xs border ${disclosureColor}`}>
          {disclosureStatus}
        </Badge>
      </div>

      {/* Analysis Status */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Analysis:</span>
        <Badge className={`text-xs border ${analysisColor}`}>
          {analysisStatus}
        </Badge>
      </div>

      {/* Strategy basis – what the strategy is based on */}
      {snapshot?.analysis?.strategyBasisLabel && (
        <div className="flex items-center gap-2" title={snapshot.analysis.strategyBasisReason ?? undefined}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Basis:</span>
          <span className="text-xs font-medium text-foreground max-w-[200px] truncate" title={snapshot.analysis.strategyBasisLabel}>
            {pilotStrategyBasisDisplay(snapshot.analysis.strategyBasisLabel) ??
              snapshot.analysis.strategyBasisLabel}
          </span>
        </div>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Updated:</span>
          <span className="text-xs font-medium text-foreground">{lastUpdated}</span>
        </div>
      )}

      {/* Current Position */}
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Position:</span>
        <Badge variant="outline" className="text-xs">
          {positionLabel}
        </Badge>
      </div>
    </div>
  );
}
