"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Users, Calendar, Building, AlertCircle, Scale, Shield, HelpCircle, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CaseInsights } from "@/lib/core/enterprise-types";
import type { KeyFactsSummary, SolicitorBuckets } from "@/lib/types/casebrain";

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
  const [keyFactsData, setKeyFactsData] = useState<{ keyFacts: KeyFactsSummary } | null>(null);
  const [agreedSummary, setAgreedSummary] = useState<{
    agreedSummaryShort: string | null;
    agreedSummaryDetailed: string | null;
    agreedSummaryFull: string | null;
    caseTheoryLine: string | null;
  } | null>(null);

  // Try to fetch insights summary for richer one-liner, but don't block on it
  useEffect(() => {
    let cancelled = false;
    setIsLoadingInsights(true);
    fetch(`/api/cases/${caseId}/insights`)
      .then(res => (!res.ok ? null : res.json()))
      .then(data => {
        if (!cancelled && data && typeof data === "object") {
          const insightsData = (data as any).insights || data;
          if ("summary" in insightsData && insightsData.summary?.oneLiner) {
            setInsights(insightsData as CaseInsights);
          }
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingInsights(false); });
    return () => { cancelled = true; };
  }, [caseId]);

  // For criminal: fetch key-facts (solicitor buckets) and agreed summary (V2)
  useEffect(() => {
    if (practiceArea !== "criminal") return;
    let cancelled = false;
    Promise.all([
      fetch(`/api/cases/${caseId}/key-facts`).then(res => (res.ok ? res.json() : null)).catch(() => null),
      fetch(`/api/criminal/${caseId}/agreed-summary`).then(res => (res.ok ? res.json() : null)).catch(() => null),
    ]).then(([kfData, agreedData]) => {
      if (!cancelled && kfData?.data?.keyFacts) setKeyFactsData({ keyFacts: kfData.data.keyFacts });
      if (!cancelled && agreedData) {
        setAgreedSummary({
          agreedSummaryShort: agreedData.agreedSummaryShort ?? null,
          agreedSummaryDetailed: agreedData.agreedSummaryDetailed ?? null,
          agreedSummaryFull: agreedData.agreedSummaryFull ?? null,
          caseTheoryLine: agreedData.caseTheoryLine ?? null,
        });
      }
    });
    return () => { cancelled = true; };
  }, [caseId, practiceArea]);

  // Prefer insights summary, then provided insightsSummary, then case summary
  // Only show fallback if we're not still loading and have no data
  const displaySummary = insights?.summary?.oneLiner 
    || insightsSummary?.oneLiner
    || summary
    || (isLoadingInsights ? undefined : "Summary will appear here once documents have been analysed.");

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

        {/* Summary text - only render if we have content or finished loading */}
        {displaySummary && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm leading-relaxed text-white/80">
              {displaySummary}
            </p>
          </div>
        )}

        {/* V2: Agreed case summary and case theory (criminal) */}
        {practiceArea === "criminal" && (
          <AgreedSummaryBlock
            caseId={caseId}
            agreedSummary={agreedSummary}
            onSaved={() => {
              fetch(`/api/criminal/${caseId}/agreed-summary`)
                .then(res => (res.ok ? res.json() : null))
                .then(data => data && setAgreedSummary({
                  agreedSummaryShort: data.agreedSummaryShort ?? null,
                  agreedSummaryDetailed: data.agreedSummaryDetailed ?? null,
                  agreedSummaryFull: data.agreedSummaryFull ?? null,
                  caseTheoryLine: data.caseTheoryLine ?? null,
                }));
            }}
          />
        )}

        {/* V2: Solicitor buckets (criminal) */}
        {practiceArea === "criminal" && keyFactsData?.keyFacts?.solicitorBuckets && (
          <SolicitorBucketsSection buckets={keyFactsData.keyFacts.solicitorBuckets} />
        )}

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

function AgreedSummaryBlock({
  caseId,
  agreedSummary,
  onSaved,
}: {
  caseId: string;
  agreedSummary: {
    agreedSummaryShort: string | null;
    agreedSummaryDetailed: string | null;
    agreedSummaryFull: string | null;
    caseTheoryLine: string | null;
  } | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [caseTheoryLine, setCaseTheoryLine] = useState(agreedSummary?.caseTheoryLine ?? "");
  const [detailed, setDetailed] = useState(agreedSummary?.agreedSummaryDetailed ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCaseTheoryLine(agreedSummary?.caseTheoryLine ?? "");
    setDetailed(agreedSummary?.agreedSummaryDetailed ?? "");
  }, [agreedSummary?.caseTheoryLine, agreedSummary?.agreedSummaryDetailed]);

  const hasAny = agreedSummary?.caseTheoryLine || agreedSummary?.agreedSummaryDetailed;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/criminal/${caseId}/agreed-summary`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseTheoryLine: caseTheoryLine.trim() || null,
          agreedSummaryDetailed: detailed.trim() || null,
        }),
      });
      if (res.ok) {
        setEditing(false);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <p className="text-xs uppercase tracking-wide text-white/50">Agreed case summary (V2)</p>
      <p className="mt-0.5 text-xs text-white/40">Canonical for Strategy and chat. Edit and save to update.</p>
      {editing ? (
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-white/70">Case theory line (one sentence)</label>
            <textarea
              className="mt-1 w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white/90"
              rows={2}
              value={caseTheoryLine}
              onChange={e => setCaseTheoryLine(e.target.value)}
              placeholder="Prosecution say X; we say Y; best angle Z"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-white/70">Detailed summary (2–3 paragraphs)</label>
            <textarea
              className="mt-1 w-full rounded border border-white/20 bg-white/5 px-2 py-1.5 text-sm text-white/90"
              rows={4}
              value={detailed}
              onChange={e => setDetailed(e.target.value)}
              placeholder="Agreed case narrative for chat and strategy"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-3.5 w-3.5 mr-1" />
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {hasAny ? (
            <>
              {agreedSummary?.caseTheoryLine && (
                <p className="text-sm font-medium text-primary">Case theory: {agreedSummary.caseTheoryLine}</p>
              )}
              {agreedSummary?.agreedSummaryDetailed && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-white/80">{agreedSummary.agreedSummaryDetailed}</p>
              )}
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(true)}>Edit</Button>
            </>
          ) : (
            <>
              <p className="text-sm text-white/50">No agreed summary yet. Click Edit to add case theory line and detailed summary.</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => setEditing(true)}>Add agreed summary</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SolicitorBucketsSection({ buckets }: { buckets: SolicitorBuckets }) {
  const sections: { key: keyof SolicitorBuckets; label: string; icon: React.ReactNode; className: string }[] = [
    { key: "prosecutionCase", label: "Prosecution case", icon: <Scale className="h-4 w-4" />, className: "border-red-500/20 bg-red-500/5" },
    { key: "defenceCase", label: "Defence case", icon: <Shield className="h-4 w-4" />, className: "border-blue-500/20 bg-blue-500/5" },
    { key: "disputedIssues", label: "Disputed issues", icon: <AlertCircle className="h-4 w-4" />, className: "border-amber-500/20 bg-amber-500/5" },
    { key: "agreedFacts", label: "Agreed facts", icon: <CheckCircle2 className="h-4 w-4" />, className: "border-green-500/20 bg-green-500/5" },
    { key: "unknowns", label: "Unknowns", icon: <HelpCircle className="h-4 w-4" />, className: "border-white/20 bg-white/5" },
    { key: "missingDisclosure", label: "Missing disclosure", icon: <FileText className="h-4 w-4" />, className: "border-orange-500/20 bg-orange-500/5" },
    { key: "risks", label: "Risks", icon: <AlertTriangle className="h-4 w-4" />, className: "border-amber-500/20 bg-amber-500/5" },
  ];
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wide text-white/50">Solicitor buckets (V2)</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {sections.map(({ key, label, icon, className }) => {
          const items = buckets[key];
          if (!items || items.length === 0) return null;
          return (
            <div key={key} className={`rounded-lg border p-3 ${className}`}>
              <div className="flex items-center gap-2 text-xs font-medium text-white/80">
                {icon}
                {label}
              </div>
              <ul className="mt-2 space-y-1 text-sm text-white/70">
                {items.slice(0, 5).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
                {items.length > 5 && <li className="text-white/50">+{items.length - 5} more</li>}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

