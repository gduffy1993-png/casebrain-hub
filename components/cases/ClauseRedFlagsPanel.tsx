"use client";

import { useState, useEffect } from "react";
import {
  AlertTriangle,
  FileWarning,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/Toast";
import type { ClauseRedFlagSummary, ClauseRedFlag, ClauseRedFlagCategory } from "@/lib/types/casebrain";

type ClauseRedFlagsPanelProps = {
  caseId: string;
  documentId: string;
  documentName: string;
};

const severityColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const categoryLabels: Record<ClauseRedFlagCategory, string> = {
  repair_obligation: "Repair Obligation",
  break_clause: "Break Clause",
  rent_increase: "Rent Increase",
  unfair_term: "Unfair Term",
  liability_cap: "Liability Cap",
  indemnity: "Indemnity",
  notice_requirement: "Notice Requirement",
  missing_signature: "Missing Signature",
  inconsistent_term: "Inconsistent Term",
  exclusion_clause: "Exclusion Clause",
  service_requirement: "Service Requirement",
  other: "Other",
};

export function ClauseRedFlagsPanel({
  caseId,
  documentId,
  documentName,
}: ClauseRedFlagsPanelProps) {
  const [summary, setSummary] = useState<ClauseRedFlagSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const { push: showToast } = useToast();

  useEffect(() => {
    fetchRedFlags();
  }, [caseId, documentId]);

  const fetchRedFlags = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${documentId}/redflags`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch red flags:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyse = async () => {
    setIsAnalysing(true);
    try {
      const res = await fetch(`/api/cases/${caseId}/documents/${documentId}/redflags`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setSummary(data.summary);
      showToast(`Found ${data.summary.redFlags.length} potential issues`);
    } catch (error) {
      console.error("Analysis failed:", error);
      showToast(error instanceof Error ? error.message : "Analysis failed");
    } finally {
      setIsAnalysing(false);
    }
  };

  const toggleFlag = (flagId: string) => {
    const newExpanded = new Set(expandedFlags);
    if (newExpanded.has(flagId)) {
      newExpanded.delete(flagId);
    } else {
      newExpanded.add(flagId);
    }
    setExpandedFlags(newExpanded);
  };

  const filteredFlags = summary?.redFlags.filter(
    f => !filterSeverity || f.severity === filterSeverity
  ) ?? [];

  if (isLoading) {
    return (
      <Card title="Clause Analysis">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <FileWarning className="h-5 w-5 text-warning" />
            <span>Clause Analysis</span>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-accent/70">
            Analyse <span className="font-medium">{documentName}</span> for dangerous clauses,
            unfair terms, and red-flag provisions.
          </p>
          <ul className="ml-4 space-y-1 text-xs text-accent/60">
            <li>• Repair obligations</li>
            <li>• Break clauses</li>
            <li>• Unfair terms (CRA 2015)</li>
            <li>• Liability caps & exclusions</li>
            <li>• Indemnity clauses</li>
            <li>• Notice requirements</li>
          </ul>
          <Button
            variant="primary"
            onClick={handleAnalyse}
            disabled={isAnalysing}
            className="w-full gap-2"
          >
            {isAnalysing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analysing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Analyse Document
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  const hasFlags = summary.redFlags.length > 0;

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileWarning className={`h-5 w-5 ${hasFlags ? "text-warning" : "text-success"}`} />
            <span>Clause Analysis</span>
            {hasFlags && (
              <Badge variant="warning" className="text-[10px]">
                {summary.redFlags.length} issue{summary.redFlags.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAnalyse}
            disabled={isAnalysing}
            className="gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isAnalysing ? "animate-spin" : ""}`} />
            Re-analyse
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-2">
          {summary.totalCritical > 0 && (
            <Badge className={severityColors.critical}>
              {summary.totalCritical} Critical
            </Badge>
          )}
          {summary.totalHigh > 0 && (
            <Badge className={severityColors.high}>
              {summary.totalHigh} High
            </Badge>
          )}
          {summary.totalMedium > 0 && (
            <Badge className={severityColors.medium}>
              {summary.totalMedium} Medium
            </Badge>
          )}
          {summary.totalLow > 0 && (
            <Badge className={severityColors.low}>
              {summary.totalLow} Low
            </Badge>
          )}
          {!hasFlags && (
            <Badge variant="success">No issues detected</Badge>
          )}
        </div>

        {/* Filter */}
        {hasFlags && (
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-accent/50" />
            <select
              value={filterSeverity ?? ""}
              onChange={(e) => setFilterSeverity(e.target.value || null)}
              className="rounded-lg border border-primary/20 bg-surface-muted px-2 py-1 text-xs text-accent"
            >
              <option value="">All severities</option>
              <option value="critical">Critical only</option>
              <option value="high">High only</option>
              <option value="medium">Medium only</option>
              <option value="low">Low only</option>
            </select>
          </div>
        )}

        {/* Flags List */}
        {hasFlags && (
          <div className="space-y-2">
            {filteredFlags.map((flag) => (
              <RedFlagItem
                key={flag.id}
                flag={flag}
                isExpanded={expandedFlags.has(flag.id)}
                onToggle={() => toggleFlag(flag.id)}
              />
            ))}
          </div>
        )}

        {/* No results after filter */}
        {hasFlags && filteredFlags.length === 0 && (
          <p className="text-sm text-accent/60">
            No issues match the selected filter.
          </p>
        )}

        {/* Analysis timestamp */}
        <p className="text-[10px] text-accent/40">
          Analysed: {new Date(summary.analysedAt).toLocaleString("en-GB")}
        </p>
      </div>
    </Card>
  );
}

function RedFlagItem({
  flag,
  isExpanded,
  onToggle,
}: {
  flag: ClauseRedFlag;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        flag.severity === "critical"
          ? "border-red-500/30 bg-red-500/5"
          : flag.severity === "high"
            ? "border-orange-500/30 bg-orange-500/5"
            : flag.severity === "medium"
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-slate-500/30 bg-slate-500/5"
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-2 text-left"
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              flag.severity === "critical"
                ? "text-red-400"
                : flag.severity === "high"
                  ? "text-orange-400"
                  : flag.severity === "medium"
                    ? "text-amber-400"
                    : "text-slate-400"
            }`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-accent">
                {categoryLabels[flag.category]}
              </span>
              <Badge className={`text-[10px] ${severityColors[flag.severity]}`}>
                {flag.severity}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-accent/60">{flag.explanation}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-accent/50" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-accent/50" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 rounded-lg border border-primary/10 bg-surface-muted/50 p-3">
          <p className="text-xs uppercase tracking-wide text-accent/50">Clause Text</p>
          <p className="mt-1 text-sm text-accent/80 italic">"{flag.clauseText}"</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for document list
 */
export function ClauseRedFlagsBadge({
  caseId,
  documentId,
}: {
  caseId: string;
  documentId: string;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/documents/${documentId}/redflags`);
        if (res.ok) {
          const data = await res.json();
          if (data.summary) {
            const critical = data.summary.totalCritical + data.summary.totalHigh;
            setCount(critical);
          }
        }
      } catch {
        // Ignore errors
      }
    };

    fetchCount();
  }, [caseId, documentId]);

  if (count === null || count === 0) return null;

  return (
    <Badge variant="danger" className="text-[10px]">
      <AlertTriangle className="mr-1 h-2.5 w-2.5" />
      {count} risk{count !== 1 ? "s" : ""}
    </Badge>
  );
}

