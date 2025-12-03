"use client";

import { AlertCircle, FileText, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { KeyIssue, Severity } from "@/lib/types/casebrain";

// Re-export buildKeyIssues from lib for backwards compatibility
export { buildKeyIssues } from "@/lib/key-issues";

type KeyIssuesPanelProps = {
  issues: KeyIssue[];
};

const severityColors: Record<Severity, string> = {
  CRITICAL: "bg-danger/10 text-danger border-danger/20",
  HIGH: "bg-warning/10 text-warning border-warning/20",
  MEDIUM: "bg-primary/10 text-primary border-primary/20",
  LOW: "bg-accent/10 text-accent/60 border-accent/20",
};

const severityIcons: Record<Severity, string> = {
  CRITICAL: "text-danger",
  HIGH: "text-warning",
  MEDIUM: "text-primary",
  LOW: "text-accent/40",
};

const categoryLabels: Record<string, string> = {
  LIABILITY: "Liability",
  CAUSATION: "Causation",
  QUANTUM: "Quantum",
  HOUSING: "Housing",
  PROCEDURE: "Procedure",
  OTHER: "Other",
};

export function KeyIssuesPanel({ issues }: KeyIssuesPanelProps) {
  if (!issues.length) {
    return (
      <Card title="Key Issues" description="Issues extracted from case documents.">
        <p className="text-sm text-accent/60">
          No key issues identified yet. Upload documents to extract issues.
        </p>
      </Card>
    );
  }

  // Group by category
  const groupedIssues = issues.reduce(
    (acc, issue) => {
      const cat = issue.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(issue);
      return acc;
    },
    {} as Record<string, KeyIssue[]>,
  );

  // Sort categories by severity of their highest-severity issue
  const severityOrder: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const sortedCategories = Object.keys(groupedIssues).sort((a, b) => {
    const aMax = Math.min(
      ...groupedIssues[a].map((i) => severityOrder.indexOf(i.severity)),
    );
    const bMax = Math.min(
      ...groupedIssues[b].map((i) => severityOrder.indexOf(i.severity)),
    );
    return aMax - bMax;
  });

  return (
    <Card
      title="Key Issues"
      description="Issues extracted from case documents. Review and investigate."
    >
      <div className="space-y-4">
        {sortedCategories.map((category) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-accent/40" />
              <span className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                {categoryLabels[category] ?? category}
              </span>
              <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent/60">
                {groupedIssues[category].length}
              </span>
            </div>

            <ul className="space-y-2 pl-6">
              {groupedIssues[category].map((issue) => (
                <li
                  key={issue.id}
                  className={`rounded-xl border p-3 ${severityColors[issue.severity]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${severityIcons[issue.severity]}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{issue.label}</p>
                        {issue.reason && (
                          <p className="mt-1 text-xs opacity-70">{issue.reason}</p>
                        )}
                      </div>
                    </div>
                    <span className="flex-shrink-0 rounded-md bg-white/50 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {issue.severity}
                    </span>
                  </div>

                  {issue.sourceDocs.length > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] opacity-60">
                      <FileText className="h-3 w-3" />
                      <span>
                        {issue.sourceDocs.length} source document
                        {issue.sourceDocs.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}


