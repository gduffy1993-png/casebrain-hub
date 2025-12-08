"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Scale } from "lucide-react";

type CPRComplianceIssue = {
  id: string;
  rule: string;
  breach: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  description: string;
  suggestedApplication: string;
  applicationText: string;
};

type JudicialExpectationsPanelProps = {
  caseId: string;
};

export function JudicialExpectationsPanel({ caseId }: JudicialExpectationsPanelProps) {
  const [cprIssues, setCprIssues] = useState<CPRComplianceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/strategic/${caseId}/cpr-compliance`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch CPR compliance");
        }

        const result = await response.json();
        setCprIssues(result.cprIssues || []);
      } catch (err) {
        console.error("Failed to fetch CPR compliance:", err);
        setError("No judicial expectations data available yet.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [caseId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading judicial expectations…</span>
        </div>
      </Card>
    );
  }

  if (error || cprIssues.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <Scale className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Judicial Expectations</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {error || "No judicial expectations data available yet. Run analysis again after more documents are uploaded."}
        </p>
      </Card>
    );
  }

  // Group by what court expects of us vs opponent
  const ourCompliance = cprIssues.filter(issue => 
    issue.breach.toLowerCase().includes("missing") ||
    issue.breach.toLowerCase().includes("no")
  );
  const opponentCompliance = cprIssues.filter(issue => 
    !issue.breach.toLowerCase().includes("missing") &&
    !issue.breach.toLowerCase().includes("no")
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="h-4 w-4 text-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Judicial Expectations</h3>
      </div>

      <div className="space-y-4">
        {/* What court expects of us */}
        {ourCompliance.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">
              What the court expects of YOU at this stage:
            </h4>
            <div className="space-y-2">
              {ourCompliance.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{issue.rule}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{issue.description}</p>
                  {issue.applicationText && (
                    <p className="text-xs text-cyan-400">{issue.applicationText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What court expects of opponent */}
        {opponentCompliance.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-foreground mb-2">
              What the court is likely to expect of the OPPONENT:
            </h4>
            <div className="space-y-2">
              {opponentCompliance.slice(0, 3).map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1.5"
                >
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <span className="text-xs font-medium text-foreground">{issue.rule}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{issue.description}</p>
                  {issue.applicationText && (
                    <p className="text-xs text-cyan-400">{issue.applicationText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

