"use client";

import { useState, useEffect } from "react";
import { X, Eye, Calendar, FileText, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type AnalysisVersion = {
  id: string;
  versionNumber: number;
  riskRating: string | null;
  summary: string | null;
  documentCount: number;
  createdAt: string;
  createdBy: string | null;
};

type AnalysisHistoryModalProps = {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onViewVersion?: (versionNumber: number) => void;
};

export function AnalysisHistoryModal({
  caseId,
  isOpen,
  onClose,
  onViewVersion,
}: AnalysisHistoryModalProps) {
  const [versions, setVersions] = useState<AnalysisVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, caseId]);

  const loadVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/analysis/versions`);
      if (!res.ok) {
        throw new Error("Failed to load analysis versions");
      }
      const data = await res.json();
      setVersions(data.versions || []);
    } catch (err) {
      console.error("Failed to load analysis versions:", err);
      setError("Unable to load analysis history");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRiskBadgeVariant = (risk: string | null) => {
    if (!risk) return "outline";
    if (risk === "CRITICAL") return "danger";
    if (risk === "HIGH") return "warning";
    if (risk === "MEDIUM") return "primary";
    return "outline";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-accent/10">
          <h2 className="text-lg font-semibold text-accent">Analysis History</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-accent/60">Loading analysis history...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-danger/10 p-4 text-center">
              <p className="text-sm text-danger">{error}</p>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <FileText className="h-12 w-12 text-accent/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-accent/70 mb-1">
                  No analysis versions yet
                </p>
                <p className="text-xs text-accent/50">
                  Re-run analysis to create versioned snapshots
                </p>
              </div>
            </div>
          )}

          {!loading && !error && versions.length > 0 && (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-xl border border-accent/10 p-4 hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" size="sm">
                          Version {version.versionNumber}
                        </Badge>
                        {version.riskRating && (
                          <Badge
                            variant={getRiskBadgeVariant(version.riskRating)}
                            size="sm"
                          >
                            {version.riskRating}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-accent/60 mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(version.createdAt)}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {version.documentCount} document(s)
                        </div>
                      </div>
                      {version.summary && (
                        <p className="text-sm text-accent/70 line-clamp-2">
                          {version.summary}
                        </p>
                      )}
                    </div>
                    {onViewVersion && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          onViewVersion(version.versionNumber);
                          onClose();
                        }}
                        className="gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

