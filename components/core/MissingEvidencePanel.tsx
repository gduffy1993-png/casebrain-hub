"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CheckCircle, FileQuestion, Loader2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MissingEvidenceItem, Severity, EvidenceCategory } from "@/lib/types/casebrain";

type MissingEvidencePanelProps = {
  caseId: string;
  items: MissingEvidenceItem[];
};

const priorityColors: Record<Severity, string> = {
  CRITICAL: "bg-danger/10 text-danger border-danger/20",
  HIGH: "bg-warning/10 text-warning border-warning/20",
  MEDIUM: "bg-primary/10 text-primary border-primary/20",
  LOW: "bg-accent/10 text-accent/60 border-accent/20",
};

const priorityIcons: Record<Severity, string> = {
  CRITICAL: "text-danger",
  HIGH: "text-warning",
  MEDIUM: "text-primary",
  LOW: "text-accent/40",
};

const categoryLabels: Record<EvidenceCategory, string> = {
  LIABILITY: "Liability",
  CAUSATION: "Causation",
  QUANTUM: "Quantum",
  HOUSING: "Housing",
  PROCEDURE: "Procedure",
};

const statusIcons = {
  MISSING: AlertTriangle,
  REQUESTED: Loader2,
  RECEIVED: CheckCircle,
};

export function MissingEvidencePanel({ caseId, items }: MissingEvidencePanelProps) {
  const [localItems, setLocalItems] = useState(items);
  const [isPending, startTransition] = useTransition();

  const missingCount = localItems.filter((i) => i.status === "MISSING").length;
  const requestedCount = localItems.filter((i) => i.status === "REQUESTED").length;

  const handleCreateTask = (item: MissingEvidenceItem) => {
    startTransition(async () => {
      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            title: `Obtain: ${item.label}`,
            description: `${item.reason}\n\nSuggested action: ${item.suggestedAction ?? "Request from client or relevant party"}`,
            source: "MISSING_EVIDENCE",
          }),
        });

        // Update status to REQUESTED
        setLocalItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "REQUESTED" as const } : i,
          ),
        );
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    });
  };

  // Group by category
  const groupedItems = localItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<EvidenceCategory, MissingEvidenceItem[]>,
  );

  if (!localItems.length) {
    return (
      <Card
        title="Evidence Checklist"
        description="Required evidence for this case."
      >
        <div className="flex items-center gap-3 rounded-xl bg-green-500/10 p-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">
            All required evidence appears to be present. Review documents to confirm.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title="Missing Evidence"
      description="Evidence gaps detected. Create tasks to obtain missing items."
      action={
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-danger/10 px-2 py-1 text-danger">
            {missingCount} missing
          </span>
          {requestedCount > 0 && (
            <span className="rounded-full bg-warning/10 px-2 py-1 text-warning">
              {requestedCount} requested
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {(Object.keys(groupedItems) as EvidenceCategory[]).map((category) => (
          <div key={category} className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-accent/50">
              {categoryLabels[category]}
            </h4>

            <ul className="space-y-2">
              {groupedItems[category].map((item) => {
                const StatusIcon = statusIcons[item.status];
                const isReceived = item.status === "RECEIVED";
                const isRequested = item.status === "REQUESTED";

                return (
                  <li
                    key={item.id}
                    className={`rounded-xl border p-3 ${
                      isReceived
                        ? "border-green-200 bg-green-50/50"
                        : isRequested
                          ? "border-warning/20 bg-warning/5"
                          : priorityColors[item.priority]
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <StatusIcon
                          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                            isReceived
                              ? "text-green-600"
                              : isRequested
                                ? "animate-spin text-warning"
                                : priorityIcons[item.priority]
                          }`}
                        />
                        <div>
                          <p
                            className={`text-sm font-medium ${
                              isReceived ? "text-green-700" : ""
                            }`}
                          >
                            {item.label}
                          </p>
                          <p className="mt-0.5 text-xs opacity-70">{item.reason}</p>
                          {item.suggestedAction && item.status === "MISSING" && (
                            <p className="mt-1 text-[11px] italic opacity-60">
                              💡 Suggested: {item.suggestedAction}
                            </p>
                          )}
                          {!item.suggestedAction && item.status === "MISSING" && (
                            <p className="mt-1 text-[11px] italic opacity-60">
                              💡 Create a task to request this from the client or relevant party
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            isReceived
                              ? "bg-green-100 text-green-700"
                              : isRequested
                                ? "bg-warning/20 text-warning"
                                : "bg-white/50"
                          }`}
                        >
                          {item.status === "MISSING"
                            ? item.priority
                            : item.status.toLowerCase()}
                        </span>

                        {item.status === "MISSING" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleCreateTask(item)}
                            disabled={isPending}
                            className="gap-1 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                            Task
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Server-side wrapper to fetch missing evidence
 */
export async function getMissingEvidence(
  caseId: string,
  caseType: string,
  documents: Array<{ name: string; type?: string; extracted_json?: unknown }>,
): Promise<MissingEvidenceItem[]> {
  const { findMissingEvidence } = await import("@/lib/missing-evidence");
  return findMissingEvidence(caseId, caseType, documents);
}

