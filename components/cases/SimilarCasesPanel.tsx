"use client";

import { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { SimilarCase } from "@/lib/types/casebrain";

type SimilarCasesPanelProps = {
  caseId: string;
};

export function SimilarCasesPanel({ caseId }: SimilarCasesPanelProps) {
  const [similarCases, setSimilarCases] = useState<SimilarCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSimilarCases = async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/similar`);
        if (res.ok) {
          const data = await res.json();
          setSimilarCases(data.cases ?? []);
        } else {
          const data = await res.json();
          setError(data.error ?? "Failed to load similar cases");
        }
      } catch (err) {
        setError("Failed to load similar cases");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilarCases();
  }, [caseId]);

  if (isLoading) {
    return (
      <Card title="Similar Cases" className="animate-pulse">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (error || similarCases.length === 0) {
    return null; // Hide if no similar cases
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-secondary" />
          Similar Cases
        </div>
      }
      description="Cases with similar facts or issues"
    >
      <ul className="space-y-3">
        {similarCases.map((similar) => (
          <li
            key={similar.caseId}
            className="group rounded-xl border border-white/10 bg-surface-muted/50 p-3 transition-all hover:border-primary/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link
                  href={`/cases/${similar.caseId}`}
                  className="font-medium text-accent group-hover:text-primary transition-colors line-clamp-1"
                >
                  {similar.title}
                </Link>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" size="sm">
                    {similar.practiceArea.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-xs text-accent-muted">
                    {Math.round(similar.similarity * 100)}% similar
                  </span>
                </div>
                {similar.matchReasons.length > 0 && (
                  <p className="mt-2 text-xs text-accent-soft line-clamp-1">
                    {similar.matchReasons.slice(0, 3).join(" • ")}
                  </p>
                )}
              </div>
              <Link
                href={`/cases/${similar.caseId}`}
                className="flex-shrink-0 rounded-lg bg-primary/10 p-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

