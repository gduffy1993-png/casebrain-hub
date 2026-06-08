"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, XCircle, Clock, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type ChecklistItem = {
  item: string;
  status: "COMPLETE" | "IN_PROGRESS" | "MISSING" | "NOT_APPLICABLE";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  notes?: string;
  readyToUse?: string;
};

type CourtReadiness = {
  overallReadiness: number;
  status: "READY" | "NEARLY_READY" | "NOT_READY" | "CRITICAL_ISSUES";
  checklist: ChecklistItem[];
  criticalMissing: string[];
  confidenceScore: number;
  recommendations: string[];
  readyToUseChecklist: string;
};

type CourtReadinessPanelProps = {
  caseId: string;
};

export function CourtReadinessPanel({ caseId }: CourtReadinessPanelProps) {
  const [readiness, setReadiness] = useState<CourtReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchReadiness() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/court-readiness`);
        if (!response.ok) {
          throw new Error("Failed to fetch court readiness");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<CourtReadiness>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate court readiness.");
          setReadiness(null);
          return;
        }

        setReadiness(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch court readiness:", err);
        setError("Court readiness not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchReadiness();
  }, [caseId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    if (status === "READY") return "text-green-400";
    if (status === "NEARLY_READY") return "text-yellow-400";
    if (status === "CRITICAL_ISSUES") return "text-red-400";
    return "text-orange-400";
  };

  const getStatusBadge = (status: string) => {
    if (status === "READY") return "success";
    if (status === "NEARLY_READY") return "warning";
    if (status === "CRITICAL_ISSUES") return "danger";
    return "secondary";
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "CRITICAL") return "text-red-400";
    if (priority === "HIGH") return "text-orange-400";
    if (priority === "MEDIUM") return "text-yellow-400";
    return "text-blue-400";
  };

  const getStatusIcon = (status: string) => {
    if (status === "COMPLETE") return <CheckCircle className="h-4 w-4 text-green-400" />;
    if (status === "IN_PROGRESS") return <Clock className="h-4 w-4 text-yellow-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking court readiness…</span>
        </div>
      </Card>
    );
  }

  if (error || !readiness) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Court readiness not available yet."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 border-2 border-blue-500/20">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-5 w-5 text-blue-400" />
        <h2 className="text-xl font-bold">Court Readiness Checker</h2>
        <Badge variant={getStatusBadge(readiness.status)} className="ml-auto">
          {readiness.status.replace("_", " ")}
        </Badge>
      </div>

      {/* Overall Status */}
      <div className="mb-4 p-4 bg-muted/30 border border-border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold">Overall Readiness</span>
          <Badge variant={readiness.overallReadiness >= 90 ? "success" : readiness.overallReadiness >= 70 ? "warning" : "danger"}>
            {readiness.overallReadiness}%
          </Badge>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden mb-2">
          <div
            className={`h-full transition-all ${
              readiness.overallReadiness >= 90
                ? "bg-green-500"
                : readiness.overallReadiness >= 70
                  ? "bg-yellow-500"
                  : "bg-red-500"
            }`}
            style={{ width: `${readiness.overallReadiness}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confidence Score</span>
          <Badge variant="secondary">{readiness.confidenceScore}%</Badge>
        </div>
      </div>

      {/* Critical Missing */}
      {readiness.criticalMissing.length > 0 && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="font-semibold">Critical Missing Items</span>
          </div>
          <ul className="space-y-1">
            {readiness.criticalMissing.map((item, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-red-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">Readiness Checklist</h3>
        <div className="space-y-2">
          {readiness.checklist
            .filter((item) => item.status !== "NOT_APPLICABLE")
            .map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  item.status === "COMPLETE"
                    ? "bg-green-500/10 border-green-500/30"
                    : item.status === "IN_PROGRESS"
                      ? "bg-yellow-500/10 border-yellow-500/30"
                      : "bg-red-500/10 border-red-500/30"
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1">
                    {getStatusIcon(item.status)}
                    <span className="font-medium text-sm">{item.item}</span>
                  </div>
                  <Badge variant="secondary" className={getPriorityColor(item.priority)}>
                    {item.priority}
                  </Badge>
                </div>
                {item.notes && (
                  <p className="text-xs text-muted-foreground ml-6">{item.notes}</p>
                )}
                {item.readyToUse && (
                  <div className="mt-2 ml-6 p-2 bg-background/50 border border-border rounded text-xs">
                    <pre className="whitespace-pre-wrap">{item.readyToUse}</pre>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Recommendations */}
      {readiness.recommendations.length > 0 && (
        <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded">
          <h3 className="text-sm font-semibold mb-2">Recommendations</h3>
          <ul className="space-y-1">
            {readiness.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <span className="text-blue-400">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ready-to-Use Checklist */}
      <div className="p-4 bg-muted/50 border border-border rounded">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold">Ready-to-Use Checklist</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(readiness.readyToUseChecklist)}
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Checklist
              </>
            )}
          </Button>
        </div>
        <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
          {readiness.readyToUseChecklist}
        </pre>
      </div>
    </Card>
  );
}
