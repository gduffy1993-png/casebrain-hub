"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MomentumBadge } from "./MomentumBadge";
import { EvidenceSelectorModal } from "./EvidenceSelectorModal";
import { RefreshCw, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type EvidenceStrategyHeaderProps = {
  caseId: string;
};

type AnalysisVersion = {
  version_number: number | null;
  summary: string | null;
  risk_rating: string | null;
  created_at: string | null;
};

export function EvidenceStrategyHeader({ caseId }: EvidenceStrategyHeaderProps) {
  const router = useRouter();
  const [version, setVersion] = useState<AnalysisVersion | null>(null);
  const [loading, setLoading] = useState(false); // Start false - only set true during refetch
  const [refreshing, setRefreshing] = useState(false); // Track refresh state
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchLatestVersion();
  }, [caseId]);

  const fetchLatestVersion = async () => {
    // Only set loading=true if we have no data (initial load)
    const isInitialLoad = version === null;
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    
    try {
      const response = await fetch(`/api/cases/${caseId}/analysis/version/latest`);
      if (response.ok) {
        const data = await response.json();
        setVersion(data);
      }
    } catch (err) {
      console.error("Failed to load analysis version:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReanalyze = () => {
    setShowModal(true);
  };

  const handleSuccess = () => {
    // Refresh page data to update all components (effects will re-fetch)
    router.refresh();
  };

  const formatMomentum = (rating: string | null): string => {
    if (!rating) return "BALANCED";
    const mapping: Record<string, string> = {
      WEAK: "WEAK",
      BALANCED: "BALANCED",
      STRONG_PENDING: "STRONG (Expert Pending)",
      STRONG: "STRONG",
    };
    return mapping[rating] || rating;
  };

  return (
    <>
      <Card className="p-6">
        <div className="flex items-start justify-between gap-6">
          {/* Left side: Momentum and summary */}
          <div className="flex-1 min-w-0">
            {version?.version_number ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <MomentumBadge
                    state={formatMomentum(version?.risk_rating || null)}
                    size="md"
                  />
                </div>
                <p className="text-sm text-accent/80 leading-relaxed">
                  {version.summary || "Analysis pending. Click 'Re-analyse with new evidence' to generate."}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <MomentumBadge
                    state={formatMomentum(null)}
                    size="md"
                  />
                </div>
                <p className="text-sm text-accent/80 leading-relaxed">
                  No analysis version yet. Run analysis to create v1.
                </p>
              </>
            )}
          </div>

          {/* Right side: Version info and button */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            {version?.version_number && (
              <div className="text-right text-xs text-accent/60 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span>Analysis version: v{version.version_number}</span>
                  {refreshing && (
                    <span className="text-xs text-muted-foreground">(Refreshing...)</span>
                  )}
                </div>
                {version.created_at && (
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    <span>
                      Last updated: {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )}
              </div>
            )}
            <Button
              onClick={handleReanalyze}
              className="gap-2"
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {version?.version_number ? "Re-analyse with new evidence" : "Run analysis (v1)"}
            </Button>
          </div>
        </div>
      </Card>

      {showModal && (
        <EvidenceSelectorModal
          caseId={caseId}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

