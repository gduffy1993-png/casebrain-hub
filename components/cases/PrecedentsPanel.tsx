"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeApiResponse, isGated } from "@/lib/api-response-normalizer";

type Precedent = {
  caseName: string;
  year: number;
  matchPercentage: number;
  facts: string;
  outcome: string;
  useCase: string;
  citation: string;
  relevance: string;
};

type Precedents = {
  precedents: Precedent[];
  topMatches: Precedent[];
  readyToUseCitations: string[];
};

type PrecedentsPanelProps = {
  caseId: string;
};

export function PrecedentsPanel({ caseId }: PrecedentsPanelProps) {
  const [precedents, setPrecedents] = useState<Precedents | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrecedents() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/cases/${caseId}/precedents`);
        if (!response.ok) {
          throw new Error("Failed to fetch precedents");
        }

        const result = await response.json();
        const normalized = normalizeApiResponse<Precedents>(result);

        if (isGated(normalized)) {
          setError("Analysis unavailable. Upload text-based PDFs to generate precedents.");
          setPrecedents(null);
          return;
        }

        setPrecedents(normalized.data || result);
      } catch (err) {
        console.error("Failed to fetch precedents:", err);
        setError("Precedents not available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchPrecedents();
  }, [caseId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Finding relevant precedents…</span>
        </div>
      </Card>
    );
  }

  if (error || !precedents) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          {error || "Precedents not available yet."}
        </p>
      </Card>
    );
  }

  const getMatchColor = (match: number) => {
    if (match >= 90) return "text-green-400";
    if (match >= 75) return "text-yellow-400";
    if (match >= 60) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Precedent Matcher</h2>
        {precedents.topMatches.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {precedents.topMatches.length} top matches
          </Badge>
        )}
      </div>

      {precedents.precedents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No precedents found yet</p>
          <p className="text-xs mt-1">Upload case documents to begin analysis</p>
        </div>
      ) : (
        <>
          {/* Top Matches */}
          {precedents.topMatches.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Top Matches (Use These First)</h3>
              <div className="space-y-3">
                {precedents.topMatches.map((precedent, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border bg-primary/10 border-primary/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{precedent.caseName} [{precedent.year}]</span>
                        <Badge className={getMatchColor(precedent.matchPercentage)}>
                          {precedent.matchPercentage}% match
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Facts: </span>
                      {precedent.facts}
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Outcome: </span>
                      <span className="text-green-400">{precedent.outcome}</span>
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Use: </span>
                      {precedent.useCase}
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Citation: </span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{precedent.citation}</code>
                    </div>
                    <div className="text-xs text-muted-foreground">{precedent.relevance}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => copyToClipboard(precedent.citation, `citation-${idx}`)}
                    >
                      {copied === `citation-${idx}` ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Citation
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Precedents */}
          {precedents.precedents.length > precedents.topMatches.length && (
            <div>
              <h3 className="text-sm font-semibold mb-2">All Precedents</h3>
              <div className="space-y-2">
                {precedents.precedents
                  .filter((p) => !precedents.topMatches.includes(p))
                  .map((precedent, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30 border-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {precedent.caseName} [{precedent.year}]
                        </span>
                        <Badge variant="secondary" className={getMatchColor(precedent.matchPercentage)}>
                          {precedent.matchPercentage}%
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mb-1">{precedent.facts}</div>
                      <div className="text-xs">
                        <span className="font-medium">Outcome: </span>
                        <span className="text-green-400">{precedent.outcome}</span>
                      </div>
                      <code className="text-xs bg-muted px-2 py-1 rounded mt-1 inline-block">
                        {precedent.citation}
                      </code>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Ready-to-Use Citations */}
          {precedents.readyToUseCitations.length > 0 && (
            <div className="mt-4 p-3 bg-muted/50 border border-border rounded">
              <h3 className="text-sm font-semibold mb-2">Ready-to-Use Citations</h3>
              <div className="space-y-1">
                {precedents.readyToUseCitations.map((citation, idx) => (
                  <div key={idx} className="text-sm font-mono">{citation}</div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() =>
                  copyToClipboard(precedents.readyToUseCitations.join("\n"), "all-citations")
                }
              >
                {copied === "all-citations" ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy All Citations
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
