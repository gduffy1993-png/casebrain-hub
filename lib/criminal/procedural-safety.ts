/**
 * Procedural Safety Status
 * 
 * Determines procedural safety status for criminal cases based on disclosure items.
 * This is a deterministic, evidence-based assessment - no predictions or assumptions.
 */

// EvidenceImpactMap type - matches StrategyCommitmentPanel structure
type EvidenceImpactMap = {
  evidenceItem: {
    name: string;
    urgency?: string;
  };
};

export type ProceduralSafetyStatus = "SAFE" | "CONDITIONALLY_UNSAFE" | "UNSAFE_TO_PROCEED";

export type ProceduralSafety = {
  status: ProceduralSafetyStatus;
  explanation: string;
  outstandingItems: string[];
  reasons?: string[]; // Optional: detailed reasons for the status
};

/**
 * Declared dependency type (from API)
 */
export type DeclaredDependency = {
  id: string;
  label: string;
  status: "required" | "helpful" | "not_needed";
  note?: string;
  updated_at?: string;
  updated_by?: string;
};

/**
 * Disclosure timeline entry type (from API)
 */
export type DisclosureTimelineEntry = {
  item: string;
  action: string;
  date: string;
  note?: string;
};

/**
 * Key disclosure items that must be present for safe progression
 */
const CRITICAL_DISCLOSURE_ITEMS = [
  { id: "cctv", labels: ["CCTV", "cctv", "footage", "video footage"] },
  { id: "bwv", labels: ["BWV", "body worn video", "body-worn video", "body worn"] },
  { id: "999", labels: ["999", "emergency call", "999 call", "emergency recording"] },
  { id: "cad", labels: ["CAD", "computer aided dispatch", "dispatch log"] },
  { id: "interview", labels: ["interview recording", "interview audio", "interview video", "interview transcript"] },
] as const;

/**
 * Check if a disclosure item is present in evidenceImpactMap
 */
function hasDisclosureItem(
  itemId: string,
  evidenceImpactMap: Array<{ evidenceItem: { name: string } }>
): boolean {
  const item = CRITICAL_DISCLOSURE_ITEMS.find((i) => i.id === itemId);
  if (!item) return false;

  // Check if any evidence impact item matches the labels
  return evidenceImpactMap.some((impact) => {
    const itemName = impact.evidenceItem.name.toLowerCase();
    return item.labels.some((label) => itemName.includes(label.toLowerCase()));
  });
}

/**
 * Check if disclosure item is marked as missing/outstanding
 */
function isDisclosureItemOutstanding(
  itemId: string,
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>
): boolean {
  const item = CRITICAL_DISCLOSURE_ITEMS.find((i) => i.id === itemId);
  if (!item) return false;

  // Check if any evidence impact item indicates missing/outstanding
  return evidenceImpactMap.some((impact) => {
    const itemName = impact.evidenceItem.name.toLowerCase();
    const urgency = impact.evidenceItem.urgency?.toLowerCase() || "";
    
    // Check if item name matches and urgency indicates missing
    const matchesLabel = item.labels.some((label) => itemName.includes(label.toLowerCase()));
    const isMissing = urgency.includes("missing") || 
                     urgency.includes("outstanding") || 
                     urgency.includes("not received") ||
                     urgency.includes("not disclosed");
    
    return matchesLabel && isMissing;
  });
}

/**
 * Match a dependency to a timeline entry by comparing id/label with item
 */
function matchesTimelineEntry(
  dependency: DeclaredDependency,
  timelineEntry: DisclosureTimelineEntry
): boolean {
  const depId = dependency.id.toLowerCase();
  const depLabel = dependency.label.toLowerCase();
  const timelineItem = timelineEntry.item.toLowerCase();
  
  // Exact match on id or label
  if (timelineItem === depId || timelineItem === depLabel) {
    return true;
  }
  
  // Partial match: timeline item contains dependency id/label or vice versa
  if (timelineItem.includes(depId) || depId.includes(timelineItem)) {
    return true;
  }
  if (timelineItem.includes(depLabel) || depLabel.includes(timelineItem)) {
    return true;
  }
  
  return false;
}

/**
 * Compute procedural safety from required dependencies and timeline entries
 * This ensures truthfulness: if required deps exist but no timeline entries, status is CONDITIONALLY_UNSAFE
 */
export function computeProceduralSafetyFromDependencies(params: {
  requiredDeps: DeclaredDependency[];
  timelineEntries: DisclosureTimelineEntry[];
  existingStatus?: ProceduralSafety;
}): ProceduralSafety {
  const { requiredDeps, timelineEntries, existingStatus } = params;
  
  // If no required dependencies, use existing status
  if (!requiredDeps || requiredDeps.length === 0) {
    return existingStatus || {
      status: "SAFE",
      explanation: "No required dependencies declared.",
      outstandingItems: [],
    };
  }
  
  // Check which required dependencies have timeline entries
  const depsWithoutTimeline: DeclaredDependency[] = [];
  const reasons: string[] = [];
  
  for (const dep of requiredDeps) {
    const hasTimelineEntry = timelineEntries.some(entry => 
      matchesTimelineEntry(dep, entry)
    );
    
    if (!hasTimelineEntry) {
      depsWithoutTimeline.push(dep);
    }
  }
  
  // If any required dependency lacks a timeline entry, status is CONDITIONALLY_UNSAFE
  if (depsWithoutTimeline.length > 0) {
    const outstandingLabels = depsWithoutTimeline.map(d => d.label);
    return {
      status: "CONDITIONALLY_UNSAFE",
      explanation: "Required disclosure items not yet recorded in timeline. This case may be conditionally unsafe to proceed until disclosure tracking is established.",
      outstandingItems: outstandingLabels,
      reasons: [
        "Required disclosure items not yet recorded in timeline",
        `${depsWithoutTimeline.length} required ${depsWithoutTimeline.length === 1 ? "dependency" : "dependencies"} without timeline entries`,
      ],
    };
  }
  
  // All required dependencies have timeline entries - use existing status or default to SAFE
  return existingStatus || {
    status: "SAFE",
    explanation: "All required dependencies have timeline entries. Procedural safety assessment based on disclosure status.",
    outstandingItems: [],
  };
}

/**
 * Compute procedural safety status from evidence impact map
 */
export function computeProceduralSafety(
  evidenceImpactMap: Array<{ evidenceItem: { name: string; urgency?: string } }>
): ProceduralSafety {
  if (!evidenceImpactMap || evidenceImpactMap.length === 0) {
    return {
      status: "CONDITIONALLY_UNSAFE",
      explanation: "Evidence impact map not available. Cannot assess procedural safety without disclosure status.",
      outstandingItems: [],
    };
  }

  const outstandingItems: string[] = [];
  
  // Check each critical disclosure item
  for (const item of CRITICAL_DISCLOSURE_ITEMS) {
    // If item is mentioned but marked as outstanding
    if (isDisclosureItemOutstanding(item.id, evidenceImpactMap)) {
      outstandingItems.push(item.labels[0].toUpperCase());
    }
      // If item is expected but not present at all
      else if (!hasDisclosureItem(item.id, evidenceImpactMap)) {
        // Check if this case type would typically require this item
        // For now, we'll be conservative and flag if CCTV/BWV/999 are mentioned but missing
        const mentioned = evidenceImpactMap.some((impact) => {
          const itemName = impact.evidenceItem.name.toLowerCase();
          return item.labels.some((label) => itemName.includes(label.toLowerCase()));
        });
      
      if (mentioned) {
        outstandingItems.push(item.labels[0].toUpperCase());
      }
    }
  }

  // Determine status
  if (outstandingItems.length === 0) {
    return {
      status: "SAFE",
      explanation: "All critical disclosure items appear to be present or not applicable to this case.",
      outstandingItems: [],
    };
  } else if (outstandingItems.length >= 2) {
    return {
      status: "UNSAFE_TO_PROCEED",
      explanation: "This case cannot safely progress beyond a holding position until disclosure obligations are met. Multiple critical disclosure items are outstanding.",
      outstandingItems,
    };
  } else {
    return {
      status: "CONDITIONALLY_UNSAFE",
      explanation: "This case may be conditionally unsafe to proceed. At least one critical disclosure item is outstanding.",
      outstandingItems,
    };
  }
}
