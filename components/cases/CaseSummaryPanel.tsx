"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Calendar, Building, AlertCircle } from "lucide-react";
import type { CaseInsights } from "@/lib/core/enterprise-types";

interface CaseSummaryPanelProps {
  caseId: string;
  caseTitle: string;
  practiceArea?: string | null;
  summary?: string | null;
  insightsSummary?: CaseInsights["summary"] | null;
  className?: string;
}

/**
 * Case Summary Panel
 * 
 * Shows a clear, visible summary at the top of the case page.
 * Uses insights summary if available, otherwise shows basic case info.
 */
export function CaseSummaryPanel({
  caseId,
  caseTitle,
  practiceArea,
  summary,
  insightsSummary,
  className = "",
}: CaseSummaryPanelProps) {
  const [insights, setInsights] = useState<CaseInsights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Try to fetch insights summary for richer one-liner, but don't block on it
  useEffect(() => {
    let cancelled = false;
    setIsLoadingInsights(true);
    
    fetch(`/api/cases/${caseId}/insights`)
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (!cancelled && data && typeof data === "object" && "summary" in data) {
          setInsights(data as CaseInsights);
        }
      })
      .catch(err => {
        console.error("[CaseSummaryPanel] Failed to fetch insights:", err);
        // Silently fail - we'll use fallback summary
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingInsights(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [caseId]);

  // Prefer insights summary, then provided insightsSummary, then case summary, then fallback
  const displaySummary = insights?.summary?.oneLiner 
    || insightsSummary?.oneLiner
    || summary
    || "Summary will appear here once documents have been analysed.";

  const practiceAreaLabel = insights?.summary?.practiceArea 
    || insightsSummary?.practiceArea
    || practiceArea
    || null;

  const clientName = insights?.summary?.clientName 
    || insightsSummary?.clientName
    || null;

  const opponentName = insights?.summary?.opponentName 
    || insightsSummary?.opponentName
    || null;

  const stageLabel = insights?.summary?.stageLabel 
    || insightsSummary?.stageLabel
    || null;

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white/90">
          <FileText className="h-5 w-5 text-primary" />
          Case Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title and badges */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white mb-2">{caseTitle}</h2>
            <div className="flex flex-wrap gap-2">
              {practiceAreaLabel && (
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  {practiceAreaLabel}
                </Badge>
              )}
              {stageLabel && (
                <Badge variant="outline" className="bg-white/5 text-white/70 border-white/20">
                  {stageLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Parties info */}
        {(clientName || opponentName) && (
          <div className="flex flex-wrap gap-4 text-sm">
            {clientName && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-white/80">
                  <span className="text-white/50">Client:</span> {clientName}
                </span>
              </div>
            )}
            {opponentName && (
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-red-400" />
                <span className="text-white/80">
                  <span className="text-white/50">Opponent:</span> {opponentName}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Summary text */}
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-sm leading-relaxed text-white/80">
            {displaySummary}
          </p>
        </div>

        {/* Loading indicator for insights fetch (subtle) */}
        {isLoadingInsights && (
          <p className="text-xs text-white/40 italic">
            Loading enhanced summary...
          </p>
        )}
      </CardContent>
    </Card>
  );
}

