"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

type WhatChangedPanelProps = {
  caseId: string;
};

type AnalysisDelta = {
  momentumChanged?: { from: string | null; to: string | null };
  newIssues?: Array<{ label: string; type: string; severity?: string }>;
  resolvedIssues?: Array<{ label: string; type: string }>;
  newMissingEvidence?: Array<{ label: string; type: string }>;
  resolvedMissingEvidence?: Array<{ label: string; type: string }>;
  notes?: string[];
};

export function WhatChangedPanel({ caseId }: WhatChangedPanelProps) {
  const [delta, setDelta] = useState<AnalysisDelta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDelta();
  }, [caseId]);

  const fetchDelta = async () => {
    try {
      const response = await fetch(`/api/cases/${caseId}/analysis/version/latest`);
      if (response.ok) {
        const data = await response.json();
        setDelta(data?.analysis_delta || null);
      }
    } catch (err) {
      console.error("Failed to load delta:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatMomentum = (rating: string | null): string => {
    if (!rating) return "UNKNOWN";
    const mapping: Record<string, string> = {
      WEAK: "WEAK",
      BALANCED: "BALANCED",
      STRONG_PENDING: "STRONG (EXPERT PENDING)",
      STRONG: "STRONG",
    };
    return mapping[rating] || rating;
  };

  if (loading) {
    return (
      <Card className="p-4">
        <p className="text-sm text-accent/60">Loading changes...</p>
      </Card>
    );
  }

  if (!delta || (!delta.momentumChanged && !delta.newIssues?.length && !delta.resolvedIssues?.length && !delta.newMissingEvidence?.length && !delta.resolvedMissingEvidence?.length)) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-accent mb-2">What Changed This Version</h3>
        <p className="text-sm text-accent/60">
          This is the first full analysis for this case.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-accent mb-4">What Changed This Version</h3>
      <div className="space-y-3">
        {/* Momentum change */}
        {delta.momentumChanged && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-accent/60">Momentum:</span>
            <span className="font-medium text-accent">
              {formatMomentum(delta.momentumChanged.from)}
            </span>
            <ArrowRight className="h-4 w-4 text-accent/40" />
            <span className="font-medium text-primary">
              {formatMomentum(delta.momentumChanged.to)}
            </span>
          </div>
        )}

        {/* New issues */}
        {delta.newIssues && delta.newIssues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-accent">New issues:</span>
            </div>
            <ul className="ml-6 space-y-1">
              {delta.newIssues.map((issue, idx) => (
                <li key={idx} className="text-sm text-accent/80">
                  {issue.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolved issues */}
        {delta.resolvedIssues && delta.resolvedIssues.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-accent">Issues resolved:</span>
            </div>
            <ul className="ml-6 space-y-1">
              {delta.resolvedIssues.map((issue, idx) => (
                <li key={idx} className="text-sm text-accent/80">
                  {issue.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolved missing evidence */}
        {delta.resolvedMissingEvidence && delta.resolvedMissingEvidence.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-accent">Missing evidence resolved:</span>
            </div>
            <ul className="ml-6 space-y-1">
              {delta.resolvedMissingEvidence.map((item, idx) => (
                <li key={idx} className="text-sm text-accent/80">
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Still missing evidence */}
        {delta.newMissingEvidence && delta.newMissingEvidence.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium text-accent">Still missing:</span>
            </div>
            <ul className="ml-6 space-y-1">
              {delta.newMissingEvidence.map((item, idx) => (
                <li key={idx} className="text-sm text-accent/80">
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

