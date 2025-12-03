"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { 
  BookOpen, 
  FileStack, 
  Loader2, 
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Upload,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import type { CaseBundle, BundlePhaseASummary, BundleJobStatus } from "@/lib/types/casebrain";

type BundlePhaseAPanelProps = {
  caseId: string;
};

const statusConfig: Record<BundleJobStatus, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
}> = {
  pending: { 
    icon: <Clock className="h-4 w-4" />, 
    color: "text-accent-muted", 
    label: "Pending" 
  },
  running: { 
    icon: <Loader2 className="h-4 w-4 animate-spin" />, 
    color: "text-primary", 
    label: "Processing" 
  },
  completed: { 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: "text-success", 
    label: "Complete" 
  },
  failed: { 
    icon: <XCircle className="h-4 w-4" />, 
    color: "text-danger", 
    label: "Failed" 
  },
};

export function BundlePhaseAPanel({ caseId }: BundlePhaseAPanelProps) {
  const [bundle, setBundle] = useState<CaseBundle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showAnalyzeForm, setShowAnalyzeForm] = useState(false);
  const [bundleName, setBundleName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [pageCount, setPageCount] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { push: showToast } = useToast();

  // Fetch bundle status
  const fetchBundle = useCallback(async () => {
    try {
      const res = await fetch(`/api/cases/${caseId}/bundle`);
      if (res.ok) {
        const data = await res.json();
        setBundle(data.bundle);
      }
    } catch (error) {
      console.error("Failed to fetch bundle:", error);
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchBundle();
  }, [fetchBundle]);

  // Auto-refresh while processing
  useEffect(() => {
    if (bundle?.status === "running") {
      const interval = setInterval(fetchBundle, 3000);
      return () => clearInterval(interval);
    }
  }, [bundle?.status, fetchBundle]);

  // Phase A Quick Analysis
  const handlePhaseAAnalyze = () => {
    if (!bundleName.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/bundle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bundleName,
            textContent: textContent || undefined,
            pageCount: pageCount ? parseInt(pageCount, 10) : undefined,
            analysisLevel: "phase_a",
          }),
        });

        if (res.ok) {
          await fetchBundle();
          setShowAnalyzeForm(false);
          setBundleName("");
          setTextContent("");
          setPageCount("");
          showToast("Bundle analyzed!");
        } else {
          const data = await res.json();
          showToast(`Error: ${data.error}`);
        }
      } catch (error) {
        showToast("Failed to analyze bundle");
      }
    });
  };

  // Start Full Analysis
  const handleStartFullAnalysis = async () => {
    if (!bundle) return;

    const pages = parseInt(pageCount, 10) || bundle.totalPages || 50;
    
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/bundle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleName: bundle.bundleName,
          pageCount: pages,
          analysisLevel: "full",
        }),
      });

      if (res.ok) {
        showToast("Full analysis started!");
        await fetchBundle();
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error}`);
      }
    } catch (error) {
      showToast("Failed to start full analysis");
    } finally {
      setIsProcessing(false);
    }
  };

  // Continue Processing
  const handleContinueProcessing = async () => {
    if (!bundle) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/bundle/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bundleId: bundle.id,
          maxChunks: 3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBundle(data.bundle);
        if (data.isComplete) {
          showToast("Analysis complete!");
        } else {
          showToast(`Processed ${data.processed} chunks, ${data.remaining} remaining`);
        }
      } else {
        const data = await res.json();
        showToast(`Error: ${data.error}`);
      }
    } catch (error) {
      showToast("Failed to continue processing");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <Card title="Bundle Navigator" className="animate-pulse">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  const statusInfo = bundle ? statusConfig[bundle.status] : null;

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          Bundle Navigator
          {bundle?.analysisLevel === "full" && (
            <Badge variant="success" size="sm">Full</Badge>
          )}
          {bundle?.analysisLevel === "phase_a" && (
            <Badge variant="outline" size="sm">Preview</Badge>
          )}
        </div>
      }
      description="AI-powered bundle analysis and navigation"
      action={
        !bundle && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAnalyzeForm(!showAnalyzeForm)}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            Analyze Bundle
          </Button>
        )
      }
    >
      {/* Analyze Form */}
      {showAnalyzeForm && (
        <div className="mb-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-accent-soft">
              Bundle Name
            </label>
            <input
              type="text"
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder="e.g., Trial Bundle - Smith v Jones"
              className="w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-accent"
            />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-accent-soft">
                Page Count
              </label>
              <input
                type="number"
                value={pageCount}
                onChange={(e) => setPageCount(e.target.value)}
                placeholder="e.g., 250"
                className="w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-accent"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-accent-soft">
              Sample Text (first 5-10 pages)
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Paste text from the bundle for quick preview..."
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-surface-muted px-3 py-2 text-sm text-accent"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAnalyzeForm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePhaseAAnalyze}
              variant="primary"
              size="sm"
              disabled={isPending || !bundleName.trim()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Quick Preview
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Bundle Status & Progress */}
      {bundle && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileStack className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-accent">{bundle.bundleName}</h4>
                <p className="text-xs text-accent-muted">
                  {bundle.totalPages > 0 ? `${bundle.totalPages} pages` : "Pages unknown"} • 
                  Updated {new Date(bundle.updatedAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
            {statusInfo && (
              <div className={`flex items-center gap-1.5 ${statusInfo.color}`}>
                {statusInfo.icon}
                <span className="text-xs font-medium">{statusInfo.label}</span>
              </div>
            )}
          </div>

          {/* Progress Bar (for full analysis) */}
          {bundle.analysisLevel === "full" && bundle.status !== "completed" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-accent-muted">Analysis Progress</span>
                <span className="font-semibold text-primary">{bundle.progress}%</span>
              </div>
              <div className="h-3 rounded-full bg-surface-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                  style={{ width: `${bundle.progress}%` }}
                />
              </div>
              
              {/* Continue Processing Button */}
              {bundle.status === "running" && (
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleContinueProcessing}
                    disabled={isProcessing}
                    className="gap-1.5"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Continue Processing
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Detected Sections */}
          {bundle.detectedSections.length > 0 && (
            <div>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent-muted">
                Detected Sections
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {bundle.detectedSections.map((section, i) => (
                  <Badge key={i} variant="outline" size="sm">
                    {section}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {(bundle.phaseASummary || bundle.fullSummary) && (
            <div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center justify-between rounded-lg bg-surface-muted/50 px-3 py-2 text-left text-xs font-medium text-accent-soft hover:bg-surface-muted transition-colors"
              >
                <span>AI Summary</span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              
              {isExpanded && (
                <div className="mt-2 rounded-lg bg-surface-muted/30 p-3">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-accent-soft leading-relaxed">
                    {bundle.fullSummary || bundle.phaseASummary}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {bundle.analysisLevel === "phase_a" && bundle.status === "completed" && (
            <div className="flex items-center justify-between rounded-xl border border-secondary/20 bg-secondary/5 p-4">
              <div>
                <h5 className="text-sm font-semibold text-secondary">Upgrade to Full Analysis</h5>
                <p className="text-xs text-accent-muted mt-1">
                  Get complete TOC, timeline, search, and contradiction detection
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStartFullAnalysis}
                disabled={isProcessing}
                className="gap-1.5"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Start Full Analysis
              </Button>
            </div>
          )}

          {/* Phase A Notice */}
          {bundle.analysisLevel === "phase_a" && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
              <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-accent-muted">
                Phase A preview only. Start Full Analysis for complete navigation with TOC, timeline, search, and issue detection.
              </p>
            </div>
          )}

          {/* Completed Full Analysis */}
          {bundle.analysisLevel === "full" && bundle.status === "completed" && (
            <div className="flex items-start gap-2 rounded-lg bg-success/5 border border-success/10 p-3">
              <CheckCircle className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-accent-muted">
                Full analysis complete. TOC, timeline, and issue mapping now available.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!bundle && !showAnalyzeForm && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <p className="mt-4 text-sm font-medium text-accent">No bundle analyzed yet</p>
          <p className="mt-1 text-xs text-accent-soft">
            Click "Analyze Bundle" to get an AI summary of your trial bundle
          </p>
        </div>
      )}
    </Card>
  );
}
