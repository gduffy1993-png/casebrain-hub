/**
 * Anomaly Detector
 * 
 * Role-agnostic detection of "what stood out" in case review:
 * - Timeline anomalies
 * - Narrative inconsistencies
 * - Evidence gaps
 * - Governance gaps
 * - Communication patterns
 */

import type { Observation, ObservationType } from "./types";
import type { MoveSequenceInput } from "./types";
import { 
  detectTreatmentDelays, 
  detectSymptomsVsImaging, 
  detectAddendumTiming, 
  detectLateCreatedNotes 
} from "./enhanced-anomaly-detector";
import { detectAwaabsLawTriggers, generateAwaabsLawObservation } from "./awaabs-law-detector";

/**
 * Detect timeline anomalies
 */
function detectTimelineAnomalies(
  timeline: Array<{ date?: string; description: string }>,
  documents: MoveSequenceInput["documents"]
): Observation[] {
  const observations: Observation[] = [];
  
  // Extract all dates
  const dates: Array<{ date: Date; description: string; source: string }> = [];
  
  timeline.forEach(event => {
    if (event.date) {
      try {
        dates.push({
          date: new Date(event.date),
          description: event.description,
          source: "timeline",
        });
      } catch {
        // Invalid date, skip
      }
    }
  });
  
  // Extract dates from documents
  documents.forEach(doc => {
    const extracted = doc.extracted_json;
    if (extracted?.dates) {
      extracted.dates.forEach((d: any) => {
        if (d.date) {
          try {
            dates.push({
              date: new Date(d.date),
              description: d.description || doc.name,
              source: doc.id,
            });
          } catch {
            // Invalid date, skip
          }
        }
      });
    }
  });
  
  // Sort by date
  dates.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Detect gaps (more than 30 days between events)
  for (let i = 1; i < dates.length; i++) {
    const gap = dates[i].date.getTime() - dates[i - 1].date.getTime();
    const daysGap = gap / (1000 * 60 * 60 * 24);
    
    if (daysGap > 30) {
        observations.push({
          id: `timeline-gap-${i}`,
          type: "TIMELINE_ANOMALY",
          description: `Gap of ${Math.round(daysGap)} days between events`,
          whyUnusual: `Significant time gap between "${dates[i - 1].description}" and "${dates[i].description}"`,
          whatShouldExist: `Expected activity or documentation during this ${Math.round(daysGap)}-day period`,
          leveragePotential: daysGap > 90 ? "HIGH" : daysGap > 60 ? "MEDIUM" : "LOW",
          relatedDates: [dates[i - 1].date.toISOString(), dates[i].date.toISOString()],
          whyThisIsOdd: `No records exist for ${Math.round(daysGap)} days between critical events. If proper procedure was followed, contemporaneous documentation should exist.`,
          whyOpponentCannotIgnoreThis: `Silence during this period creates inference that procedure was not followed or documentation was not created at the time.`,
        });
    }
  }
  
  // Detect compressed timelines (too much happening too fast)
  const recentDates = dates.filter(d => {
    const daysAgo = (Date.now() - d.date.getTime()) / (1000 * 60 * 60 * 24);
    return daysAgo <= 90;
  });
  
  if (recentDates.length > 10) {
    const timeSpan = recentDates[recentDates.length - 1].date.getTime() - recentDates[0].date.getTime();
    const daysSpan = timeSpan / (1000 * 60 * 60 * 24);
    
    if (daysSpan < 30 && recentDates.length > 10) {
      observations.push({
        id: "timeline-compressed",
        type: "TIMELINE_ANOMALY",
        description: `Unusually high activity: ${recentDates.length} events in ${Math.round(daysSpan)} days`,
        whyUnusual: "Events compressed into very short timeframe, may indicate delayed documentation or cover-up",
        whatShouldExist: "Expected events to be spread over longer period or contemporaneous documentation",
        leveragePotential: "MEDIUM",
        relatedDates: recentDates.map(d => d.date.toISOString()),
      });
    }
  }
  
  return observations;
}

/**
 * Detect narrative inconsistencies
 */
function detectNarrativeInconsistencies(
  documents: MoveSequenceInput["documents"]
): Observation[] {
  const observations: Observation[] = [];
  
  // Extract claims/statements from documents
  const claims: Array<{ claim: string; source: string; date?: string }> = [];
  
  documents.forEach(doc => {
    const extracted = doc.extracted_json;
    if (extracted?.keyIssues) {
      extracted.keyIssues.forEach((issue: any) => {
        if (issue.label) {
          claims.push({
            claim: issue.label,
            source: doc.id,
            date: doc.created_at,
          });
        }
      });
    }
    
    // Also extract from summary/description
    if (extracted?.summary) {
      claims.push({
        claim: extracted.summary,
        source: doc.id,
        date: doc.created_at,
      });
    }
  });
  
  // Simple contradiction detection (can be enhanced with AI)
  // For now, detect if same topic mentioned with different details
  const claimGroups = new Map<string, Array<{ claim: string; source: string }>>();
  
  claims.forEach(c => {
    const key = c.claim.toLowerCase().substring(0, 50); // Simple grouping
    if (!claimGroups.has(key)) {
      claimGroups.set(key, []);
    }
    claimGroups.get(key)!.push(c);
  });
  
  // If same claim appears multiple times, check for variations
  claimGroups.forEach((group, key) => {
    if (group.length > 1) {
      const uniqueClaims = new Set(group.map(g => g.claim));
      if (uniqueClaims.size > 1) {
        observations.push({
          id: `narrative-inconsistency-${key.substring(0, 20)}`,
          type: "INCONSISTENCY",
          description: `Contradictory statements about: ${key.substring(0, 50)}`,
          whyUnusual: "Same topic described differently across documents, may indicate evolving narrative or contradiction",
          whatShouldExist: "Consistent narrative across all documents",
          leveragePotential: "MEDIUM",
          sourceDocumentIds: group.map(g => g.source),
          whyThisIsOdd: "Same event described differently in contemporaneous documents. If facts are clear, descriptions should align.",
          whyOpponentCannotIgnoreThis: "Contradictions undermine credibility. Opponent must explain discrepancy or risk inference that later version is sanitized.",
        });
      }
    }
  });
  
  return observations;
}

/**
 * Detect evidence gaps using evidence map
 */
function detectEvidenceGaps(
  input: MoveSequenceInput,
  evidenceMap: any
): Observation[] {
  const observations: Observation[] = [];
  
  // Check each expected evidence type
  evidenceMap.expectedEvidence.forEach((expected: any) => {
    // Check if we have documents matching this pattern
    const hasEvidence = input.documents.some(doc => {
      const nameLower = (doc.name || "").toLowerCase();
      const contentLower = JSON.stringify(doc.extracted_json || {}).toLowerCase();
      const patterns: string[] = expected.detectPatterns || [];
      return patterns.some((pattern: string) => {
        const p = (pattern || "").toLowerCase();
        if (!p) return false;
        return nameLower.includes(p) || contentLower.includes(p);
      });
    });
    
    if (!hasEvidence) {
        const priority = (expected.priority || "HIGH") as any;
        const leveragePotential =
          priority === "CRITICAL" ? "CRITICAL" :
          priority === "HIGH" ? "HIGH" :
          priority === "MEDIUM" ? "MEDIUM" :
          "LOW";

        observations.push({
          id: `evidence-gap-${expected.id}`,
          type: "EVIDENCE_GAP",
          description: `Missing expected evidence: ${expected.label}`,
          whyUnusual: expected.ifMissingMeans,
          whatShouldExist: `${expected.label} (${expected.whenExpected})`,
          leveragePotential, // Use expected priority when provided
          whyThisIsOdd: `Expected evidence ${expected.label} is missing. If proper procedure was followed, this documentation should exist.`,
          whyOpponentCannotIgnoreThis: `Absence of ${expected.label} creates inference that procedure was not followed or documentation was not created. Opponent must explain absence or produce documentation.`,
        });
    }
  });
  
  return observations;
}

/**
 * Detect governance gaps
 */
function detectGovernanceGaps(
  input: MoveSequenceInput,
  evidenceMap: any
): Observation[] {
  const observations: Observation[] = [];
  
  // Check governance rules
  evidenceMap.governanceRules?.forEach((rule: any) => {
    // Simple check: if rule mentions something that should exist, check if we have it
    const ruleLower = rule.rule.toLowerCase();
    const hasCompliance = input.documents.some(doc => {
      const nameLower = doc.name.toLowerCase();
      const contentLower = JSON.stringify(doc.extracted_json || {}).toLowerCase();
      return nameLower.includes(ruleLower.substring(0, 20)) || contentLower.includes(ruleLower.substring(0, 20));
    });
    
    if (!hasCompliance) {
      observations.push({
        id: `governance-gap-${rule.rule.substring(0, 30)}`,
        type: "GOVERNANCE_GAP",
        description: `Potential governance gap: ${rule.rule}`,
        whyUnusual: rule.ifViolated,
        whatShouldExist: `Evidence of compliance with: ${rule.rule}`,
        leveragePotential: "MEDIUM",
      });
    }
  });
  
  return observations;
}

/**
 * Main anomaly detection function
 */
export function detectAnomalies(
  input: MoveSequenceInput,
  evidenceMap: any
): Observation[] {
  const observations: Observation[] = [];
  
  // Detect different types of anomalies
  observations.push(...detectTimelineAnomalies(input.timeline, input.documents));
  observations.push(...detectNarrativeInconsistencies(input.documents));
  observations.push(...detectEvidenceGaps(input, evidenceMap));
  observations.push(...detectGovernanceGaps(input, evidenceMap));
  
  // Enhanced detection
  observations.push(...detectTreatmentDelays(input));
  observations.push(...detectSymptomsVsImaging(input));
  observations.push(...detectAddendumTiming(input));
  observations.push(...detectLateCreatedNotes(input));

  // Awaab's Law detection (housing only)
  if (input.practiceArea === "housing_disrepair") {
    const awaabsTrigger = detectAwaabsLawTriggers(input);
    const awaabsObservation = generateAwaabsLawObservation(awaabsTrigger);
    if (awaabsObservation) {
      observations.push(awaabsObservation);
    }
  }
  
  // Limit to top 6 by leverage potential
  const sorted = observations.sort((a, b) => {
    const leverageOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    return leverageOrder[b.leveragePotential] - leverageOrder[a.leveragePotential];
  });
  
  return sorted.slice(0, 6);
}

