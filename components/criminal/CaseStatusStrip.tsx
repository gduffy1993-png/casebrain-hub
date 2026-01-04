"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { CaseSnapshot } from "@/lib/criminal/case-snapshot-adapter";

type CaseStatusStripProps = {
  snapshot: CaseSnapshot;
};

export function CaseStatusStrip({ snapshot }: CaseStatusStripProps) {
  // Derive disclosure status conservatively
  const missingCount = snapshot.evidence.missingEvidence.filter(
    (item) => item.status === "MISSING" || item.status === "UNASSESSED"
  ).length;
  const docCount = snapshot.analysis.docCount || 0;
  
  let disclosureStatus: "Thin" | "Partial" | "Good" = "Thin";
  let disclosureColor = "bg-amber-500/10 text-amber-600 border-amber-500/30";
  
  if (docCount >= 3 && missingCount === 0) {
    disclosureStatus = "Good";
    disclosureColor = "bg-green-500/10 text-green-600 border-green-500/30";
  } else if (docCount >= 2 || missingCount < 3) {
    disclosureStatus = "Partial";
    disclosureColor = "bg-blue-500/10 text-blue-600 border-blue-500/30";
  }

  // Analysis status
  const analysisStatus = snapshot.analysis.mode === "complete" 
    ? "Complete" 
    : snapshot.analysis.mode === "preview" 
    ? "Preview" 
    : "Not run";
  const analysisColor = snapshot.analysis.mode === "complete"
    ? "bg-green-500/10 text-green-600 border-green-500/30"
    : snapshot.analysis.mode === "preview"
    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-muted/20 text-muted-foreground border-border/50";

  // Current position
  const positionLabel = snapshot.decisionLog.currentPosition
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

  const lastUpdated = formatDate(snapshot.caseMeta.lastUpdatedAt);
  const nextHearing = formatDate(snapshot.caseMeta.hearingNextAt);

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-border/50 bg-muted/10">
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

      {/* Last Updated */}
      {lastUpdated && (
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Updated:</span>
          <span className="text-xs font-medium text-foreground">{lastUpdated}</span>
        </div>
      )}

      {/* Next Hearing */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Next hearing:</span>
        <span className="text-xs font-medium text-foreground">
          {nextHearing || "Not set"}
        </span>
      </div>

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

