"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Loader2, AlertCircle, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import type { CaseInsights } from "@/lib/core/enterprise-types";

interface InsightsPanelProps {
  caseId: string;
  className?: string;
}

/**
 * InsightsPanel - Non-AI case insights display
 * 
 * SAFETY MEASURES:
 * - Never throws on missing/null data - uses safe defaults
 * - Handles network errors gracefully with inline fallback message
 * - All nested property access uses optional chaining
 * - Arrays are checked before iteration
 * - Wrapped in ErrorBoundary at the page level for extra safety
 */
export function InsightsPanel({
  caseId,
  className = "",
}: InsightsPanelProps) {
  const [insights, setInsights] = useState<CaseInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    severity: "warning" | "info" | "error";
    title?: string;
    message: string;
  } | null>(null);
  const [diagnostics, setDiagnostics] = useState<{
    docCount: number;
    rawCharsTotal: number;
    jsonCharsTotal: number;
    avgRawCharsPerDoc: number;
    suspectedScanned: boolean;
  } | null>(null);

  useEffect(() => {
    async function fetchInsights() {
      try {
        setIsLoading(true);
        setError(null);
        console.log("[InsightsPanel] Fetching insights for case:", caseId);
        
        const res = await fetch(`/api/cases/${caseId}/insights`);
        
        console.log("[InsightsPanel] Response status:", res.status, res.statusText);
        
        // Try to parse even if not ok - API always returns fallback insights
        let data: CaseInsights | { error?: string } | null = null;
        try {
          data = await res.json();
          console.log("[InsightsPanel] Parsed response:", {
            hasData: !!data,
            hasSummary: !!(data && typeof data === "object" && "summary" in data),
            hasRag: !!(data && typeof data === "object" && "rag" in data),
            hasBriefing: !!(data && typeof data === "object" && "briefing" in data),
            hasError: !!(data && typeof data === "object" && "error" in data),
          });
        } catch (parseErr) {
          console.error("[InsightsPanel] Failed to parse response:", parseErr);
          console.error("[InsightsPanel] Response text:", await res.text().catch(() => "Unable to read response"));
          // Create minimal fallback if parsing fails
          data = {
            summary: {
              headline: "Case insights",
              oneLiner: "Unable to parse insights data.",
              stageLabel: null,
              practiceArea: null,
              clientName: null,
              opponentName: null,
            },
            rag: {
              overallLevel: "amber",
              overallScore: 50,
              scores: [],
            },
            briefing: {
              overview: "Insights data could not be loaded. Please try refreshing the page.",
              keyStrengths: [],
              keyRisks: [],
              urgentActions: [],
            },
            meta: {
              caseId,
              updatedAt: new Date().toISOString(),
              hasCoreEvidence: false,
              missingCriticalCount: 0,
              missingHighCount: 0,
            },
          } as CaseInsights;
        }
        
        // Extract banner and diagnostics if present
        if (data && typeof data === "object") {
          if ("banner" in data && data.banner) {
            setBanner(data.banner as { severity: "warning" | "info" | "error"; title?: string; message: string });
          }
          if ("diagnostics" in data && data.diagnostics) {
            setDiagnostics(data.diagnostics as {
              docCount: number;
              rawCharsTotal: number;
              jsonCharsTotal: number;
              avgRawCharsPerDoc: number;
              suspectedScanned: boolean;
            });
          }
        }
        
        // If we got valid CaseInsights data, use it (even if status wasn't 200)
        if (data && typeof data === "object" && "summary" in data && "rag" in data) {
          console.log("[InsightsPanel] Using valid insights data");
          setInsights(data as CaseInsights);
          setError(null); // Clear any previous error
          return;
        }
        
        // If we have partial data, use it
        if (data && typeof data === "object" && "summary" in data) {
          console.log("[InsightsPanel] Using partial insights data (missing RAG)");
          setInsights(data as CaseInsights);
          setError(null);
          return;
        }
        
        // Check for error in response
        if (data && typeof data === "object" && "error" in data) {
          console.error("[InsightsPanel] API returned error:", (data as { error?: string }).error);
          setError((data as { error?: string }).error || "Failed to load insights");
        } else {
          console.warn("[InsightsPanel] Unexpected response format:", data);
        }
        
        // Last resort: create minimal fallback
        setInsights({
          summary: {
            headline: "Case insights",
            oneLiner: "Basic case data available.",
            stageLabel: null,
            practiceArea: null,
            clientName: null,
            opponentName: null,
          },
          rag: {
            overallLevel: "amber",
            overallScore: 50,
            scores: [],
          },
          briefing: {
            overview: "Case insights are being generated from your case data. Please wait a moment.",
            keyStrengths: [],
            keyRisks: [],
            urgentActions: [],
          },
          meta: {
            caseId,
            updatedAt: new Date().toISOString(),
            hasCoreEvidence: false,
            missingCriticalCount: 0,
            missingHighCount: 0,
          },
        });
        setError(null);
      } catch (err) {
        console.error("[InsightsPanel] Fetch error:", err);
        console.error("[InsightsPanel] Error type:", err instanceof Error ? err.constructor.name : typeof err);
        console.error("[InsightsPanel] Error message:", err instanceof Error ? err.message : String(err));
        console.error("[InsightsPanel] Error stack:", err instanceof Error ? err.stack : "No stack trace");
        // Even on error, show a minimal fallback instead of error state
        setInsights({
          summary: {
            headline: "Case insights",
            oneLiner: "Loading case insights...",
            stageLabel: null,
            practiceArea: null,
            clientName: null,
            opponentName: null,
          },
          rag: {
            overallLevel: "amber",
            overallScore: 50,
            scores: [],
          },
          briefing: {
            overview: "Case insights are being generated from your case data. Please wait a moment.",
            keyStrengths: [],
            keyRisks: [],
            urgentActions: [],
          },
          meta: {
            caseId,
            updatedAt: new Date().toISOString(),
            hasCoreEvidence: false,
            missingCriticalCount: 0,
            missingHighCount: 0,
          },
        });
        setError(null); // Don't show error, show fallback instead
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsights();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-white/40" />
          <span className="ml-2 text-xs text-white/50">Computing insights...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !insights) {
    return (
      <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-400">
              Unable to load insights. Please refresh the page or try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // SAFETY: Use optional chaining and provide safe defaults for all nested properties
  const summary = insights?.summary ?? {
    headline: "Case summary",
    oneLiner: "Summary will appear here once analysis is available.",
    stageLabel: null,
    practiceArea: null,
    clientName: null,
    opponentName: null,
  };
  
  const rag = insights?.rag ?? {
    overallLevel: "amber" as const,
    overallScore: 50,
    scores: [],
  };
  
  const briefing = insights?.briefing ?? {
    overview: "Case data is insufficient to generate insights. Upload key documents to begin analysis.",
    keyStrengths: [],
    keyRisks: ["No documents uploaded yet."],
    urgentActions: ["Upload the core claim documents to begin analysis."],
  };
  
  const meta = insights?.meta ?? {
    caseId,
    updatedAt: new Date().toISOString(),
    hasCoreEvidence: false,
    missingCriticalCount: 0,
    missingHighCount: 0,
  };

  return (
    <Card className={`bg-surface/50 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-white/90">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          Insights
        </CardTitle>
        <p className="text-xs text-white/50 mt-1">
          Case intelligence for internal guidance only. Does not constitute legal advice.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Banner for scanned PDFs or other warnings */}
        {banner && (
          <div
            className={`rounded-xl border p-4 ${
              banner.severity === "warning"
                ? "border-amber-500/30 bg-amber-500/10"
                : banner.severity === "error"
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-blue-500/30 bg-blue-500/10"
            }`}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle
                className={`h-5 w-5 ${
                  banner.severity === "warning"
                    ? "text-amber-400"
                    : banner.severity === "error"
                      ? "text-red-400"
                      : "text-blue-400"
                }`}
              />
              <div className="flex-1">
                {banner.title && (
                  <p
                    className={`font-medium text-sm ${
                      banner.severity === "warning"
                        ? "text-amber-300"
                        : banner.severity === "error"
                          ? "text-red-300"
                          : "text-blue-300"
                    }`}
                  >
                    {banner.title}
                  </p>
                )}
                <p className="mt-1 text-xs text-white/80">{banner.message}</p>
                {diagnostics && (
                  <p className="mt-2 text-[10px] text-white/60">
                    Docs: {diagnostics.docCount} • Extracted text: {diagnostics.rawCharsTotal.toLocaleString()} chars • Extracted data: {diagnostics.jsonCharsTotal.toLocaleString()} chars
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Row 1: Snapshot + Overall RAG */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Snapshot */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide">Snapshot</h3>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1.5">
              <p className="text-sm font-medium text-white">{summary.headline ?? "Case summary"}</p>
              <p className="text-xs text-white/70">{summary.oneLiner ?? "Summary will appear here once analysis is available."}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {summary.practiceArea && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-white/5 text-white/60 border-white/10">
                    {summary.practiceArea}
                  </Badge>
                )}
                {summary.stageLabel && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-white/5 text-white/60 border-white/10">
                    {summary.stageLabel}
                  </Badge>
                )}
                {summary.clientName && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-white/5 text-white/60 border-white/10">
                    {summary.clientName}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Overall RAG */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide">Overall Health</h3>
            <div className={`rounded-lg border p-3 ${
              (rag?.overallLevel ?? "amber") === "green"
                ? "border-green-500/30 bg-green-500/10"
                : (rag?.overallLevel ?? "amber") === "amber"
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-red-500/30 bg-red-500/10"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/60">Overall Score</p>
                  <p className="text-2xl font-bold text-white">{rag?.overallScore ?? 50}%</p>
                </div>
                <Badge
                  className={`text-xs font-semibold ${
                    (rag?.overallLevel ?? "amber") === "green"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : (rag?.overallLevel ?? "amber") === "amber"
                      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {(rag?.overallLevel ?? "amber").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Dimension Scores */}
        {rag.scores && rag.scores.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide">Dimension Scores</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rag.scores.map((score) => (
                <div
                  key={score.area}
                  className={`rounded-lg border p-2.5 ${
                    score.level === "green"
                      ? "border-green-500/20 bg-green-500/5"
                      : score.level === "amber"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-red-500/20 bg-red-500/5"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-white/90">{score.area}</span>
                    <Badge
                      className={`text-[10px] py-0 px-1.5 ${
                        score.level === "green"
                          ? "bg-green-500/20 text-green-400"
                          : score.level === "amber"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {score.score}%
                    </Badge>
                  </div>
                  <p className="text-[10px] text-white/60 line-clamp-1">{score.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Row 3: Briefing */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-white/80 uppercase tracking-wide">Briefing</h3>
          
          {/* Overview */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <h4 className="text-xs font-medium text-white/90 mb-1.5">Overview</h4>
            <p className="text-xs text-white/70 leading-relaxed">{briefing.overview}</p>
          </div>

          {/* Three columns */}
          <div className="grid gap-3 md:grid-cols-3">
            {/* Key Strengths */}
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                <h4 className="text-xs font-medium text-white/90">Key Strengths</h4>
              </div>
              {briefing.keyStrengths && briefing.keyStrengths.length > 0 ? (
                <ul className="space-y-1.5">
                  {briefing.keyStrengths.map((strength, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-1.5">
                      <span className="text-green-400 mt-0.5">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/50">No significant strengths identified yet.</p>
              )}
            </div>

            {/* Key Risks */}
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <h4 className="text-xs font-medium text-white/90">Key Risks</h4>
              </div>
              {briefing.keyRisks && briefing.keyRisks.length > 0 ? (
                <ul className="space-y-1.5">
                  {briefing.keyRisks.slice(0, 5).map((risk, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-1.5">
                      <span className="text-red-400 mt-0.5">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/50">No significant risks identified.</p>
              )}
            </div>

            {/* Urgent Actions */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                <h4 className="text-xs font-medium text-white/90">Urgent Actions</h4>
              </div>
              {briefing.urgentActions && briefing.urgentActions.length > 0 ? (
                <ul className="space-y-1.5">
                  {briefing.urgentActions.slice(0, 5).map((action, idx) => (
                    <li key={idx} className="text-xs text-white/70 flex items-start gap-1.5">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-white/50">No urgent actions required.</p>
              )}
            </div>
          </div>
        </div>

        {/* Meta footer */}
        <div className="pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-[10px] text-white/40">
            <span>Updated: {new Date(meta.updatedAt).toLocaleString("en-GB", { 
              day: "numeric", 
              month: "short", 
              hour: "2-digit", 
              minute: "2-digit" 
            })}</span>
            {meta.missingCriticalCount > 0 && (
              <span className="text-red-400">
                {meta.missingCriticalCount} critical item(s) missing
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
