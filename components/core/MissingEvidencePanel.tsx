"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, FileQuestion, Loader2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MissingEvidenceItem, Severity, EvidenceCategory } from "@/lib/types/casebrain";
import { safeFetch } from "@/lib/utils/safe-fetch";

type MissingEvidencePanelProps = {
  caseId: string;
  items?: MissingEvidenceItem[]; // Optional - will fetch from case_analysis_versions if not provided
};

type VersionMissingEvidence = {
  area: string;
  label: string;
  priority?: string;
  notes?: string;
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
  UNKNOWN: FileQuestion,
  UNASSESSED: FileQuestion,
};

export function MissingEvidencePanel({ caseId, items: propItems }: MissingEvidencePanelProps) {
  const [versionItems, setVersionItems] = useState<VersionMissingEvidence[]>([]);
  const [loading, setLoading] = useState(false); // Start false - only set true during initial load
  const [refreshing, setRefreshing] = useState(false); // Track refresh state
  const [isPending, startTransition] = useTransition();
  const [banner, setBanner] = useState<{ title: string; message: string; severity?: "error" | "warning" | "info" } | null>(null);
  const [hasAnalysisVersion, setHasAnalysisVersion] = useState<boolean>(false);
  const [analysisMode, setAnalysisMode] = useState<"complete" | "preview" | "none">("none");
  const isFirstLoadRef = useRef(true);

  // Fetch from case_analysis_versions if items not provided
  useEffect(() => {
    if (propItems) {
      // Use provided items (backward compatibility)
      return;
    }

    async function fetchMissingEvidence() {
      const endpoint = `/api/cases/${caseId}/analysis/version/latest`;
      // Only set loading=true if this is the first load
      const isInitialLoad = isFirstLoadRef.current;
      if (isInitialLoad) {
        setLoading(true);
        isFirstLoadRef.current = false;
      } else {
        setRefreshing(true);
      }
      
      // Use safeFetch for consistent error handling
      const result = await safeFetch(endpoint);
      
      if (!result.ok) {
        // On any fetch/shape failure: render neutral fallback (not scary "error")
        setVersionItems([]);
        setHasAnalysisVersion(false);
        setAnalysisMode("none");
        setBanner(null); // No error banner - just show empty state
        setLoading(false);
        return;
      }
      
      // Normalize response to canonical shape (support both wrapped and direct)
      const responseData = result.data?.data || result.data || {};
      
      // Canonical shape: missing_evidence is always an array
      const missing = Array.isArray(responseData?.missing_evidence) 
        ? responseData.missing_evidence 
        : [];
      
      // Canonical shape: has_analysis_version and analysis_mode
      const hasVersion = responseData?.has_analysis_version === true || 
                         responseData?.version_number !== null ||
                         responseData?.version_number !== undefined;
      const mode = responseData?.analysis_mode || (hasVersion ? "complete" : "none");
      
      setHasAnalysisVersion(hasVersion);
      setAnalysisMode(mode);
      
      // Strong guards: default values for item fields, skip invalid items
      const safeMissing = missing
        .filter((item: any) => item && typeof item === "object") // Skip invalid items
        .map((item: any) => ({
          area: item?.area || "other",
          label: item?.label || "Unknown evidence item",
          priority: item?.priority || "MEDIUM",
          notes: item?.notes || "",
          status: item?.status || "UNASSESSED", // Default to UNASSESSED, not MISSING
        }));
      
      setVersionItems(safeMissing);
      setBanner(null);
      setLoading(false);
      setRefreshing(false);
    }

    fetchMissingEvidence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, propItems]); // Note: versionItems/hasAnalysisVersion intentionally not in deps

  // Convert version items to MissingEvidenceItem format (fail-safe)
  const convertVersionItems = (versionItems: VersionMissingEvidence[]): MissingEvidenceItem[] => {
    if (!Array.isArray(versionItems)) {
      return [];
    }
    return versionItems.map((item, idx) => {
      const safeItem = item || {};
      // Version items from API don't have status - default to "UNASSESSED" for court safety
      // Only items explicitly marked as "MISSING" in the analysis should be "MISSING"
      // For now, we treat all version items as "UNASSESSED" unless the analysis explicitly flags them
      // In future, the API could include a status field in version items
      const itemStatus: "MISSING" | "REQUESTED" | "RECEIVED" | "UNKNOWN" | "UNASSESSED" = "UNASSESSED";
      
      return {
        id: `version-${caseId}-${idx}`,
        caseId,
        category: mapAreaToCategory(safeItem.area || "other"),
        label: safeItem.label || "Unknown evidence item",
        reason: safeItem.notes || "",
        priority: (safeItem.priority?.toUpperCase() || "MEDIUM") as Severity,
        status: itemStatus,
        suggestedAction: undefined, // No suggested action for UNKNOWN items
      };
    });
  };

  const items = propItems || convertVersionItems(versionItems || []);
  const [localItems, setLocalItems] = useState<MissingEvidenceItem[]>(items || []);

  // Update local items when items change
  useEffect(() => {
    setLocalItems(Array.isArray(items) ? items : []);
  }, [items]);

  const safeLocalItems = Array.isArray(localItems) ? localItems : [];
  const missingCount = safeLocalItems.filter((i) => i?.status === "MISSING").length;
  const requestedCount = safeLocalItems.filter((i) => i?.status === "REQUESTED").length;
  const unassessedCount = safeLocalItems.filter((i) => i?.status === "UNASSESSED" || i?.status === "UNKNOWN").length;

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

  // Group by category or area (fail-safe)
  const groupedItems = safeLocalItems.reduce(
    (acc, item) => {
      if (!item || !item.category) return acc;
      const category = item.category as EvidenceCategory;
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    },
    {} as Record<EvidenceCategory, MissingEvidenceItem[]>,
  );

  // Only show full loading state if we have no data
  if (loading && versionItems.length === 0 && !propItems) {
    return (
      <Card
        title="Evidence Checklist"
        description="Required evidence for this case."
      >
        <div className="flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-accent/60">Loading missing evidence...</p>
        </div>
      </Card>
    );
  }

  if (banner) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>Evidence Checklist</span>
            {refreshing && (
              <span className="text-xs text-muted-foreground">(Refreshing...)</span>
            )}
          </div>
        }
        description="Required evidence for this case."
      >
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground">{banner.title}</p>
            <p className="text-sm text-muted-foreground">{banner.message}</p>
          </div>
        </div>
      </Card>
    );
  }

  // Check for disclosure gaps in criminal cases before showing success message
  const [hasDisclosureGaps, setHasDisclosureGaps] = useState<boolean>(false);
  
  useEffect(() => {
    // For criminal cases, check disclosure tracker for gaps
    async function checkDisclosureGaps() {
      const endpoint = `/api/criminal/${caseId}/disclosure`;
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const disclosureData = await res.json();
          // Handle both wrapped and direct responses
          const data = disclosureData?.data || disclosureData;
          const hasGaps = Array.isArray(data?.missingItems) && data.missingItems.length > 0 || 
                         data?.incompleteDisclosure === true || 
                         data?.lateDisclosure === true;
          setHasDisclosureGaps(hasGaps);
        }
      } catch (err) {
        // Silently fail - disclosure check is optional
        // Dev-only error logging
        if (process.env.NODE_ENV !== "production") {
          console.error("[MissingEvidencePanel] Disclosure check failed:", {
            endpoint,
            error: err,
            caseId,
          });
        }
      }
    }
    
    // Only check for criminal cases (practice area check would require prop, so check endpoint exists)
    checkDisclosureGaps();
  }, [caseId]);

  // Empty state: distinguish between analysis exists vs not
  // RULE: If analysis_mode !== "complete", do NOT attempt to render missing_evidence items
  // Always render an explanatory empty state
  if (!safeLocalItems.length && !hasDisclosureGaps) {
    if (analysisMode !== "complete") {
      // Not complete - show explanatory empty state based on mode
      if (analysisMode === "preview") {
        return (
          <Card
            title="Evidence Checklist"
            description="Required evidence for this case."
          >
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Preview mode — full outputs appear once analysis is complete.
                </p>
              </div>
            </div>
          </Card>
        );
      } else {
        // analysisMode === "none"
        return (
          <Card
            title="Evidence Checklist"
            description="Required evidence for this case."
          >
            <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  This section will populate once analysis is run.
                </p>
              </div>
            </div>
          </Card>
        );
      }
    } else {
      // analysisMode === "complete" - analysis exists and missing_evidence is empty
      return (
        <Card
          title="Evidence Checklist"
          description="Required evidence for this case."
        >
          <div className="flex items-center gap-3 rounded-xl bg-muted/20 p-4">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">
                No missing evidence flagged in this analysis (may change with new documents).
              </p>
            </div>
          </div>
        </Card>
      );
    }
  }
  
  // If no local items but disclosure gaps exist, show outstanding items message
  if (!safeLocalItems.length && hasDisclosureGaps) {
    return (
      <Card
        title="Evidence Checklist"
        description="Required evidence for this case."
      >
        <div className="flex items-center gap-3 rounded-xl bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <p className="text-sm text-amber-700">
            Outstanding disclosure items detected. Review disclosure tracker for details.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span>Missing Evidence</span>
          {refreshing && (
            <span className="text-xs text-muted-foreground">(Refreshing...)</span>
          )}
        </div>
      }
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
          {unassessedCount > 0 && (
            <span className="rounded-full bg-muted/20 px-2 py-1 text-muted-foreground">
              Unassessed: {unassessedCount}
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {(Object.keys(groupedItems) as EvidenceCategory[]).map((category) => {
          const categoryItems = groupedItems[category] || [];
          if (!Array.isArray(categoryItems) || categoryItems.length === 0) {
            return null;
          }
          return (
            <div key={category} className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-accent/50">
                {categoryLabels[category] || category}
              </h4>

              <ul className="space-y-2">
                {categoryItems.map((item) => {
                  if (!item) return null;
                  
                  // Fail-safe: ensure all required fields exist
                  // Default to UNASSESSED, not MISSING, unless explicitly set
                  const itemStatus = item.status === "MISSING" || item.status === "REQUESTED" || item.status === "RECEIVED" || item.status === "UNKNOWN" || item.status === "UNASSESSED"
                    ? item.status
                    : "UNASSESSED";
                  const itemPriority = item.priority || "MEDIUM";
                  const itemLabel = item.label || "Unknown evidence item";
                  const itemReason = item.reason || "";
                  const itemId = item.id || `item-${category}-${Math.random()}`;
                  
                  const StatusIcon = statusIcons[itemStatus] || statusIcons.UNKNOWN;
                  const isReceived = itemStatus === "RECEIVED";
                  const isRequested = itemStatus === "REQUESTED";
                  const isUnknown = itemStatus === "UNKNOWN" || itemStatus === "UNASSESSED";

                  return (
                    <li
                      key={itemId}
                      className={`rounded-xl border p-3 ${
                        isReceived
                          ? "border-green-200 bg-green-50/50"
                          : isRequested
                            ? "border-warning/20 bg-warning/5"
                            : priorityColors[itemPriority as Severity] || priorityColors.MEDIUM
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
                                  : priorityIcons[itemPriority as Severity] || priorityIcons.MEDIUM
                            }`}
                          />
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                isReceived ? "text-green-700" : ""
                              }`}
                            >
                              {itemLabel}
                            </p>
                            {itemReason && (
                              <p className="mt-0.5 text-xs opacity-70">{itemReason}</p>
                            )}
                            {itemStatus === "MISSING" && (
                              <p className="mt-1 text-[11px] italic opacity-60">
                                💡 {item.suggestedAction 
                                  ? `Suggested: ${item.suggestedAction}` 
                                  : "Create a task to request this from the client or relevant party"}
                              </p>
                            )}
                            {isUnknown && (
                              <p className="mt-1 text-[11px] italic opacity-60">
                                ⚠️ Status not assessed. Review evidence to determine if this item is missing.
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
                            {itemStatus === "MISSING"
                              ? itemPriority
                              : itemStatus.toLowerCase()}
                          </span>

                          {itemStatus === "MISSING" && (
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
          );
        })}
        {Object.keys(groupedItems).length === 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-muted/20 p-4">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
            <div>
              {hasAnalysisVersion && analysisMode !== "none" ? (
                <>
                  <p className="text-sm font-medium text-foreground">
                    No missing evidence flagged in the current analysis.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {analysisMode === "preview"
                      ? "Full outputs appear once analysis is complete."
                      : "Add more documents or re-run analysis to deepen evidence mapping."}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">
                    This section will populate once analysis is run.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Awaiting further documents or analysis.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Map area from version to category
 */
function mapAreaToCategory(area: string): EvidenceCategory {
  const mapping: Record<string, EvidenceCategory> = {
    medical_records: "LIABILITY",
    expert: "CAUSATION",
    witness: "QUANTUM",
    funding: "PROCEDURE",
    admin: "PROCEDURE",
    other: "PROCEDURE",
  };
  return mapping[area] || "PROCEDURE";
}

/**
 * Server-side wrapper to fetch missing evidence
 * TODO: legacy missing evidence – replaced by case_analysis_versions
 * Kept for backward compatibility only
 */
export async function getMissingEvidence(
  caseId: string,
  caseType: string,
  documents: Array<{ name: string; type?: string; extracted_json?: unknown }>,
): Promise<MissingEvidenceItem[]> {
  const { findMissingEvidence } = await import("@/lib/missing-evidence");
  return findMissingEvidence(caseId, caseType, documents);
}

