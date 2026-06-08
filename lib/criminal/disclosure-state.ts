/**
 * Disclosure State - Single Source of Truth
 *
 * Computes canonical disclosure state from multiple sources to prevent UI contradictions.
 * This function is the ONLY place that determines disclosure status.
 * V2: Optional bundleMentionedTopics (from Key Facts) filters which items are relevant.
 */

/** V2: Derive topics mentioned in the case from key-facts response (structuredKeyFacts + solicitorBuckets). Pass to computeDisclosureState as bundleMentionedTopics. */
export function deriveBundleMentionedTopics(keyFacts: {
  structuredKeyFacts?: {
    cctvRefs: unknown[];
    forensicRefs: unknown[];
    disclosure: unknown[];
    evidence: unknown[];
  } | null;
  solicitorBuckets?: {
    missingDisclosure: string[];
    prosecutionCase: string[];
    defenceCase: string[];
  } | null;
} | null): string[] {
  if (!keyFacts) return [];
  const topics: string[] = [];
  const add = (s: string) => {
    const t = s.toLowerCase().trim();
    if (t && !topics.includes(t)) topics.push(t);
  };
  if (keyFacts.structuredKeyFacts) {
    const s = keyFacts.structuredKeyFacts;
    if (s.cctvRefs?.length) {
      add("cctv");
      add("cctv continuity");
    }
    if (s.forensicRefs?.length) {
      add("forensic");
      add("fire cause");
      add("footwear");
    }
    if (s.disclosure?.length) {
      add("disclosure");
      add("interview");
      add("custody");
    }
    if (s.evidence?.length) add("evidence");
  }
  const missing = keyFacts.solicitorBuckets?.missingDisclosure ?? [];
  const allText = [
    ...missing,
    ...(keyFacts.solicitorBuckets?.prosecutionCase ?? []),
    ...(keyFacts.solicitorBuckets?.defenceCase ?? []),
  ].join(" ").toLowerCase();
  if (/cctv|footage|continuity/i.test(allText)) add("cctv");
  if (/bwv|body worn/i.test(allText)) add("bwv");
  if (/999|cad|dispatch/i.test(allText)) {
    add("999");
    add("cad");
  }
  if (/interview|pace/i.test(allText)) add("interview");
  if (/custody/i.test(allText)) add("custody record");
  if (/forensic|fire cause|accelerant|footwear/i.test(allText)) {
    add("forensic");
    add("fire cause");
    add("footwear");
  }
  return topics;
}

/**
 * Standard disclosure items that must be checked
 */
const STANDARD_DISCLOSURE_ITEMS = [
  {
    key: "cctv_full_window",
    label: "CCTV Full Window",
    severity: "critical" as const,
    patterns: ["cctv", "camera footage", "video footage", "cctv footage", "cctv window"],
  },
  {
    key: "cctv_continuity",
    label: "CCTV Continuity",
    severity: "critical" as const,
    patterns: ["cctv continuity", "continuity log", "cctv chain of custody"],
  },
  {
    key: "bwv",
    label: "Body Worn Video (BWV)",
    severity: "critical" as const,
    patterns: ["bwv", "body worn video", "body-worn video", "body worn"],
  },
  {
    key: "call_999_audio",
    label: "999 Call Audio",
    severity: "high" as const,
    patterns: ["999", "emergency call", "999 call", "emergency recording", "999 audio"],
  },
  {
    key: "cad_log",
    label: "CAD Log",
    severity: "high" as const,
    patterns: ["cad", "computer aided dispatch", "dispatch log", "cad log"],
  },
  {
    key: "interview_recording",
    label: "Interview Recording",
    severity: "critical" as const,
    patterns: ["interview recording", "interview audio", "interview video", "interview transcript", "pace interview"],
  },
  {
    key: "custody_record_or_custody_cctv",
    label: "Custody Record / Custody CCTV",
    severity: "high" as const,
    patterns: ["custody record", "custody cctv", "custody footage", "custody video"],
  },
] as const;

/** V2: Only included when bundle/key facts mention these (Key Facts → Safety). */
const CONDITIONAL_DISCLOSURE_ITEMS = [
  { key: "fire_cause_report", label: "Fire cause report", severity: "high" as const, patterns: ["fire cause", "cause of fire", "cause report", "accelerant"] },
  { key: "forensic_report", label: "Forensic report", severity: "high" as const, patterns: ["forensic", "forensics", "comparison", "footwear"] },
  { key: "footwear_comparison", label: "Footwear comparison", severity: "high" as const, patterns: ["footwear", "footwear comparison", "not yet compared"] },
] as const;

export type DisclosureState = {
  is_simulated: boolean;
  missing_items: Array<{
    key: string;
    label: string;
    severity: "critical" | "high" | "medium" | "low";
  }>;
  satisfied_items: Array<{
    key: string;
    label: string;
  }>;
  status: "unsafe" | "conditionally_unsafe" | "safe";
  rationale: string[];
};

type DisclosureStateInput = {
  documents?: Array<{
    name?: string;
    title?: string;
    id?: string;
  }>;
  declaredDependencies?: Array<{
    id?: string;
    label?: string;
    status?: "required" | "helpful" | "not_needed";
  }>;
  disclosureTimeline?: Array<{
    item?: string;
    action?: string;
    date?: string;
  }>;
  evidenceImpactMap?: Array<{
    evidenceItem: {
      name: string;
      urgency?: string;
    };
  }>;
  /** V2: When set, only check standard/conditional items that match these topics (from Key Facts / bundle). If absent, all standard items are checked. */
  bundleMentionedTopics?: string[];
};

/**
 * Check if any document is simulated (case-insensitive check for "SIMULATED" in title/name)
 */
function isSimulated(documents: DisclosureStateInput["documents"]): boolean {
  if (!documents || documents.length === 0) return false;

  return documents.some((doc) => {
    const title = (doc.title || doc.name || "").toUpperCase();
    return title.includes("SIMULATED");
  });
}

type DisclosureItem = {
  key: string;
  label: string;
  severity: string;
  patterns: readonly string[];
};

/**
 * Check if a disclosure item is satisfied (served/received in timeline or present in documents)
 */
function isItemSatisfied(
  item: DisclosureItem,
  input: DisclosureStateInput
): boolean {
  const itemKey = item.key.toLowerCase();
  const itemLabel = item.label.toLowerCase();
  const itemPatterns = item.patterns.map((p) => p.toLowerCase());

  // Check disclosure timeline for served/received status
  if (input.disclosureTimeline && input.disclosureTimeline.length > 0) {
    for (const entry of input.disclosureTimeline) {
      const entryItem = (entry.item || "").toLowerCase();
      const entryAction = (entry.action || "").toLowerCase();

      // Check if timeline entry matches this disclosure item
      const matchesItem =
        entryItem.includes(itemKey) ||
        itemKey.includes(entryItem) ||
        entryItem.includes(itemLabel) ||
        itemLabel.includes(entryItem) ||
        itemPatterns.some((pattern) => entryItem.includes(pattern) || entryItem.includes(pattern.replace(/\s+/g, "")));

      if (matchesItem) {
        // If action is "served" or "reviewed", item is satisfied
        if (entryAction === "served" || entryAction === "reviewed") {
          return true;
        }
      }
    }
  }

  // Check documents for matching disclosure items
  if (input.documents && input.documents.length > 0) {
    for (const doc of input.documents) {
      const docName = (doc.name || doc.title || "").toLowerCase();

      // Check if document name matches any pattern for this item
      const matchesPattern = itemPatterns.some((pattern) => docName.includes(pattern));

      if (matchesPattern) {
        return true;
      }
    }
  }

  // Check declared dependencies
  if (input.declaredDependencies && input.declaredDependencies.length > 0) {
    for (const dep of input.declaredDependencies) {
      const depId = (dep.id || "").toLowerCase();
      const depLabel = (dep.label || "").toLowerCase();

      // Check if dependency matches this item
      const matchesItem =
        depId.includes(itemKey) ||
        itemKey.includes(depId) ||
        depLabel.includes(itemLabel) ||
        itemLabel.includes(depLabel) ||
        itemPatterns.some((pattern) => depLabel.includes(pattern));

      if (matchesItem) {
        // If dependency is marked as "not_needed", consider it satisfied (not missing)
        if (dep.status === "not_needed") {
          return true;
        }
        // If dependency is "required" or "helpful" but we have a timeline entry showing served, it's satisfied
        if (input.disclosureTimeline) {
          const hasServedEntry = input.disclosureTimeline.some((entry) => {
            const entryItem = (entry.item || "").toLowerCase();
            const entryAction = (entry.action || "").toLowerCase();
            return (
              (entryItem.includes(depId) || entryItem.includes(depLabel)) &&
              (entryAction === "served" || entryAction === "reviewed")
            );
          });
          if (hasServedEntry) {
            return true;
          }
        }
      }
    }
  }

  // Check evidence impact map for outstanding items
  if (input.evidenceImpactMap && input.evidenceImpactMap.length > 0) {
    for (const impact of input.evidenceImpactMap) {
      const itemName = impact.evidenceItem.name.toLowerCase();
      const urgency = (impact.evidenceItem.urgency || "").toLowerCase();

      // Check if this impact item matches our disclosure item
      const matchesPattern = itemPatterns.some((pattern) => itemName.includes(pattern));

      if (matchesPattern) {
        // If urgency indicates missing/outstanding, item is NOT satisfied
        const isMissing =
          urgency.includes("missing") ||
          urgency.includes("outstanding") ||
          urgency.includes("not received") ||
          urgency.includes("not disclosed");

        // If not marked as missing, consider it satisfied (present in evidence map)
        if (!isMissing) {
          return true;
        }
      }
    }
  }

  return false;
}

/** Returns true if this item is relevant given bundle/key-facts mentioned topics (V2). */
function isItemRelevant(
  item: { patterns: readonly string[] },
  bundleMentionedTopics: string[] | undefined,
): boolean {
  if (!bundleMentionedTopics || bundleMentionedTopics.length === 0) return true;
  const lower = bundleMentionedTopics.map((t) => t.toLowerCase());
  return item.patterns.some((p) => lower.some((t) => t.includes(p) || p.includes(t)));
}

/**
 * Compute canonical disclosure state
 *
 * This is the SINGLE SOURCE OF TRUTH for disclosure status.
 * All UI panels should use this function to prevent contradictions.
 * V2: When bundleMentionedTopics is provided, only items matching those topics are checked (Key Facts → Safety).
 */
export function computeDisclosureState(input: DisclosureStateInput): DisclosureState {
  const is_simulated = isSimulated(input.documents);
  const missing_items: DisclosureState["missing_items"] = [];
  const satisfied_items: DisclosureState["satisfied_items"] = [];
  const rationale: string[] = [];
  const topics = (input.bundleMentionedTopics ?? []).map((t) => t.toLowerCase());

  // Check each standard disclosure item (only if relevant when bundleMentionedTopics provided)
  for (const item of STANDARD_DISCLOSURE_ITEMS) {
    if (!isItemRelevant(item, input.bundleMentionedTopics)) continue;
    const satisfied = isItemSatisfied(item, input);

    if (satisfied) {
      satisfied_items.push({
        key: item.key,
        label: item.label,
      });
    } else {
      missing_items.push({
        key: item.key,
        label: item.label,
        severity: item.severity,
      });
    }
  }

  // V2: Conditional items (only when bundle/key facts mention them)
  for (const item of CONDITIONAL_DISCLOSURE_ITEMS) {
    if (!isItemRelevant(item, input.bundleMentionedTopics)) continue;
    const satisfied = isItemSatisfied(item, input);

    if (satisfied) {
      satisfied_items.push({ key: item.key, label: item.label });
    } else {
      missing_items.push({
        key: item.key,
        label: item.label,
        severity: item.severity,
      });
    }
  }

  // Determine status based on missing items
  const criticalMissing = missing_items.filter((item) => item.severity === "critical");
  const highMissing = missing_items.filter((item) => item.severity === "high");

  let status: DisclosureState["status"];
  if (criticalMissing.length > 0) {
    status = "unsafe";
    rationale.push(`${criticalMissing.length} critical disclosure item(s) missing: ${criticalMissing.map((i) => i.label).join(", ")}`);
    rationale.push("Case cannot safely progress until critical disclosure is received.");
  } else if (highMissing.length > 0 || missing_items.length >= 3) {
    status = "conditionally_unsafe";
    rationale.push(`${highMissing.length > 0 ? highMissing.length + " high" : missing_items.length} disclosure item(s) missing`);
    rationale.push("Case may be conditionally unsafe to proceed. Core trial viability may be affected.");
  } else {
    status = "safe";
    rationale.push("All critical and high-priority disclosure items are satisfied.");
    if (missing_items.length > 0) {
      rationale.push(`${missing_items.length} lower-priority item(s) remain outstanding but do not block progression.`);
    }
  }

  // Add simulated flag rationale if detected
  if (is_simulated) {
    rationale.push("Simulated documents detected (demo case).");
  }

  // Add summary
  if (satisfied_items.length > 0) {
    rationale.push(`Satisfied: ${satisfied_items.length} item(s)`);
  }
  if (missing_items.length > 0) {
    rationale.push(`Missing: ${missing_items.length} item(s)`);
  }

  return {
    is_simulated,
    missing_items,
    satisfied_items,
    status,
    rationale,
  };
}
