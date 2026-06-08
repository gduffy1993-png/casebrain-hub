/**
 * Compute Analysis Delta
 * 
 * Compares two analysis snapshots and returns what changed.
 * Used to show "What Changed" between analysis versions.
 */

export type AnalysisSnapshot = {
  risk_rating: string | null;
  summary: string | null;
  key_issues: Array<{
    type?: string;
    label: string;
    severity?: string;
    notes?: string;
  }> | null;
  timeline: Array<{
    date?: string;
    description: string;
    label?: string;
  }> | null;
  missing_evidence: Array<{
    area?: string;
    label: string;
    priority?: string;
    notes?: string;
  }> | null;
};

export type AnalysisDelta = {
  momentumChanged?: { from: string | null; to: string | null };
  newIssues?: Array<{ label: string; type: string; severity?: string }>;
  resolvedIssues?: Array<{ label: string; type: string }>;
  newMissingEvidence?: Array<{ label: string; type: string }>;
  resolvedMissingEvidence?: Array<{ label: string; type: string }>;
  notes?: string[];
};

/**
 * Compute delta between previous and current analysis snapshots
 */
export function computeAnalysisDelta(
  prev: AnalysisSnapshot | null,
  next: AnalysisSnapshot,
): AnalysisDelta {
  const delta: AnalysisDelta = {
    notes: [],
  };

  // If no previous version, this is the first analysis
  if (!prev) {
    delta.notes?.push("This is the first full analysis for this case.");
    return delta;
  }

  // 1. Check momentum/risk rating change
  const prevRating = prev.risk_rating || null;
  const nextRating = next.risk_rating || null;
  
  if (prevRating !== nextRating) {
    delta.momentumChanged = {
      from: prevRating,
      to: nextRating,
    };
    
    // Add human-readable note
    const fromLabel = formatMomentumLabel(prevRating);
    const toLabel = formatMomentumLabel(nextRating);
    delta.notes?.push(`Momentum changed from ${fromLabel} to ${toLabel}`);
  }

  // 2. Compare key issues
  const prevIssues = prev.key_issues || [];
  const nextIssues = next.key_issues || [];

  // Create maps for comparison (by type + label)
  const prevIssueMap = new Map<string, { type: string; label: string; severity?: string }>();
  prevIssues.forEach((issue) => {
    const key = `${issue.type || "unknown"}:${issue.label}`;
    prevIssueMap.set(key, {
      type: issue.type || "unknown",
      label: issue.label,
      severity: issue.severity,
    });
  });

  const nextIssueMap = new Map<string, { type: string; label: string; severity?: string }>();
  nextIssues.forEach((issue) => {
    const key = `${issue.type || "unknown"}:${issue.label}`;
    nextIssueMap.set(key, {
      type: issue.type || "unknown",
      label: issue.label,
      severity: issue.severity,
    });
  });

  // Find new issues (in next but not in prev)
  const newIssues: Array<{ label: string; type: string; severity?: string }> = [];
  nextIssueMap.forEach((issue, key) => {
    if (!prevIssueMap.has(key)) {
      newIssues.push(issue);
    }
  });

  // Find resolved issues (in prev but not in next)
  const resolvedIssues: Array<{ label: string; type: string }> = [];
  prevIssueMap.forEach((issue, key) => {
    if (!nextIssueMap.has(key)) {
      resolvedIssues.push({
        label: issue.label,
        type: issue.type,
      });
    }
  });

  if (newIssues.length > 0) {
    delta.newIssues = newIssues;
    const issueLabels = newIssues.map((i) => i.label).join("; ");
    delta.notes?.push(`New issues identified: ${issueLabels}`);
  }

  if (resolvedIssues.length > 0) {
    delta.resolvedIssues = resolvedIssues;
    const issueLabels = resolvedIssues.map((i) => i.label).join("; ");
    delta.notes?.push(`Issues resolved: ${issueLabels}`);
  }

  // 3. Compare missing evidence
  const prevMissing = prev.missing_evidence || [];
  const nextMissing = next.missing_evidence || [];

  // Create maps for comparison (by area + label)
  const prevMissingMap = new Map<string, { area: string; label: string }>();
  prevMissing.forEach((item) => {
    const key = `${item.area || "other"}:${item.label}`;
    prevMissingMap.set(key, {
      area: item.area || "other",
      label: item.label,
    });
  });

  const nextMissingMap = new Map<string, { area: string; label: string }>();
  nextMissing.forEach((item) => {
    const key = `${item.area || "other"}:${item.label}`;
    nextMissingMap.set(key, {
      area: item.area || "other",
      label: item.label,
    });
  });

  // Find new missing evidence (in next but not in prev)
  const newMissingEvidence: Array<{ label: string; type: string }> = [];
  nextMissingMap.forEach((item, key) => {
    if (!prevMissingMap.has(key)) {
      newMissingEvidence.push({
        label: item.label,
        type: item.area,
      });
    }
  });

  // Find resolved missing evidence (in prev but not in next)
  const resolvedMissingEvidence: Array<{ label: string; type: string }> = [];
  prevMissingMap.forEach((item, key) => {
    if (!nextMissingMap.has(key)) {
      resolvedMissingEvidence.push({
        label: item.label,
        type: item.area,
      });
    }
  });

  if (newMissingEvidence.length > 0) {
    delta.newMissingEvidence = newMissingEvidence;
    const labels = newMissingEvidence.map((m) => m.label).join("; ");
    delta.notes?.push(`New missing evidence identified: ${labels}`);
  }

  if (resolvedMissingEvidence.length > 0) {
    delta.resolvedMissingEvidence = resolvedMissingEvidence;
    const labels = resolvedMissingEvidence.map((m) => m.label).join("; ");
    delta.notes?.push(`Missing evidence resolved: ${labels}`);
  }

  return delta;
}

/**
 * Format momentum label for display
 */
function formatMomentumLabel(rating: string | null): string {
  if (!rating) return "UNKNOWN";
  
  // Map database values to display labels
  const mapping: Record<string, string> = {
    WEAK: "WEAK",
    BALANCED: "BALANCED",
    STRONG_PENDING: "STRONG (Expert Pending)",
    STRONG: "STRONG",
  };
  
  return mapping[rating] || rating;
}

