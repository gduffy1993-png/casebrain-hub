/**
 * Strategy Output Model - Evidence Snapshot
 * 
 * Builds a deterministic snapshot of current evidence state for use by strategic lenses.
 * All flags and assessments are derived from actual data, never guessed.
 */

import type { EvidenceSnapshot } from "./types";

// Re-export type for convenience
export type { EvidenceSnapshot };

/**
 * Build Evidence Snapshot from case data
 * 
 * @param input - Case data input
 * @returns EvidenceSnapshot
 */
export function buildEvidenceSnapshot(input: {
  offenceCode?: string;
  offenceLabel?: string;
  phase?: number;
  recordedPosition?: string;
  declaredDependencies?: Array<{
    id?: string;
    label?: string;
    status?: string;
    note?: string;
  }>;
  disclosureTimelineEntries?: Array<{
    item?: string;
    action?: string;
    date?: string;
  }>;
  extracted?: any;
}): EvidenceSnapshot {
  const snapshot: EvidenceSnapshot = {
    offence: {
      code: input.offenceCode || undefined,
      label: input.offenceLabel || undefined,
    },
    posture: {
      has_position: Boolean(input.recordedPosition && input.recordedPosition.trim().length > 0),
      position_summary: input.recordedPosition && input.recordedPosition.trim().length > 0
        ? input.recordedPosition.trim().slice(0, 200) // Limit length
        : undefined,
      phase: typeof input.phase === "number" && input.phase > 0 ? input.phase : undefined,
    },
    disclosure: {
      required_dependencies: [],
      required_without_timeline: [],
      timeline_items_present: [],
    },
    evidence: {
      docs_count: 0,
      extracted_text_chars: undefined,
      key_docs_present: [],
      key_gaps: [],
    },
    flags: {},
  };

  // Build disclosure state
  buildDisclosureState(input.declaredDependencies, input.disclosureTimelineEntries, snapshot);

  // Build evidence state
  buildEvidenceState(input.extracted, snapshot);

  // Build flags (deterministic only)
  buildFlags(input.extracted, snapshot);

  return snapshot;
}

/**
 * Build disclosure state from dependencies and timeline
 */
function buildDisclosureState(
  declaredDependencies: any[] | undefined,
  timelineEntries: any[] | undefined,
  snapshot: EvidenceSnapshot
): void {
  if (!Array.isArray(declaredDependencies) || declaredDependencies.length === 0) {
    return;
  }

  // Normalize dependency status (Required/required/REQUIRED -> required)
  const requiredDeps: string[] = [];
  const timelineItems = new Set<string>();

  // Extract timeline items (normalize to lowercase for matching)
  if (Array.isArray(timelineEntries)) {
    for (const entry of timelineEntries) {
      if (entry && entry.item && typeof entry.item === "string") {
        timelineItems.add(entry.item.toLowerCase().trim());
      }
    }
  }

  // Find required dependencies
  for (const dep of declaredDependencies) {
    if (!dep || typeof dep !== "object") continue;

    const status = dep.status;
    if (!status || typeof status !== "string") continue;

    // Normalize status: Required/required/REQUIRED -> required
    const normalizedStatus = status.toLowerCase().trim();
    if (normalizedStatus === "required") {
      const label = dep.label || dep.id || "";
      if (label && typeof label === "string" && label.trim().length > 0) {
        requiredDeps.push(label.trim());
      }
    }
  }

  snapshot.disclosure.required_dependencies = requiredDeps;

  // Find required dependencies without timeline entries
  const requiredWithoutTimeline: string[] = [];
  for (const depLabel of requiredDeps) {
    const normalizedLabel = depLabel.toLowerCase().trim();
    let hasTimelineEntry = false;

    for (const timelineItem of timelineItems) {
      if (
        timelineItem.includes(normalizedLabel) ||
        normalizedLabel.includes(timelineItem)
      ) {
        hasTimelineEntry = true;
        break;
      }
    }

    if (!hasTimelineEntry) {
      requiredWithoutTimeline.push(depLabel);
    }
  }

  snapshot.disclosure.required_without_timeline = requiredWithoutTimeline;
  snapshot.disclosure.timeline_items_present = Array.from(timelineItems);
}

/**
 * Build evidence state from extracted data
 */
function buildEvidenceState(extracted: any, snapshot: EvidenceSnapshot): void {
  if (!extracted || typeof extracted !== "object") {
    return;
  }

  try {
    // Count documents
    const docs = extracted.documents || extracted.docs || extracted.evidence || [];
    if (Array.isArray(docs)) {
      snapshot.evidence.docs_count = docs.length;

      // Extract key document names
      const keyDocNames: string[] = [];
      for (const doc of docs.slice(0, 10)) { // Limit to first 10
        if (doc && typeof doc === "object") {
          const name = doc.name || doc.filename || doc.title || "";
          if (name && typeof name === "string" && name.trim().length > 0) {
            keyDocNames.push(name.trim());
          }
        }
      }
      snapshot.evidence.key_docs_present = keyDocNames;
    }

    // Count extracted text characters
    const extractedText = JSON.stringify(extracted);
    if (extractedText && extractedText.length > 0) {
      snapshot.evidence.extracted_text_chars = extractedText.length;
    }

    // Extract key gaps from evidence impact map if present
    const evidenceImpactMap = extracted.evidence_impact_map || extracted.missing_evidence || [];
    if (Array.isArray(evidenceImpactMap)) {
      const gaps: string[] = [];
      for (const item of evidenceImpactMap.slice(0, 10)) { // Limit to first 10
        if (item && typeof item === "object") {
          const name = item.name || item.label || item.evidenceItem?.name || "";
          if (name && typeof name === "string" && name.trim().length > 0) {
            gaps.push(name.trim());
          }
        }
      }
      snapshot.evidence.key_gaps = gaps;
    }
  } catch (error) {
    // Silently fail - leave defaults
  }
}

/**
 * Build flags (deterministic only - no guesses)
 */
function buildFlags(extracted: any, snapshot: EvidenceSnapshot): void {
  if (!extracted || typeof extracted !== "object") {
    return;
  }

  try {
    const extractedStr = JSON.stringify(extracted).toLowerCase();

    // Date conflicts: look for explicit date conflict indicators
    const dateConflictIndicators = [
      "date conflict",
      "date inconsistency",
      "date discrepancy",
      "conflicting dates",
      "date mismatch",
    ];
    snapshot.flags.date_conflicts = dateConflictIndicators.some(indicator =>
      extractedStr.includes(indicator)
    );

    // ID uncertainty: look for explicit uncertainty indicators
    const idUncertaintyIndicators = [
      "poor lighting",
      "couldn't see",
      "uncertain identification",
      "identification unclear",
      "not sure who",
      "couldn't identify",
      "unclear who",
    ];
    snapshot.flags.id_uncertainty = idUncertaintyIndicators.some(indicator =>
      extractedStr.includes(indicator)
    );

    // Weapon uncertainty: look for explicit weapon uncertainty indicators
    const weaponUncertaintyIndicators = [
      "weapon unclear",
      "unclear weapon",
      "weapon uncertain",
      "not sure weapon",
      "believes weapon",
      "thinks weapon",
      "didn't see weapon",
    ];
    snapshot.flags.weapon_uncertainty = weaponUncertaintyIndicators.some(indicator =>
      extractedStr.includes(indicator)
    );

    // Sequence missing: look for explicit sequence gap indicators
    const sequenceMissingIndicators = [
      "sequence unclear",
      "sequence missing",
      "unclear sequence",
      "sequence gap",
      "missing sequence",
      "sequence not clear",
    ];
    snapshot.flags.sequence_missing = sequenceMissingIndicators.some(indicator =>
      extractedStr.includes(indicator)
    );
  } catch (error) {
    // Silently fail - leave flags as undefined/false
  }
}
