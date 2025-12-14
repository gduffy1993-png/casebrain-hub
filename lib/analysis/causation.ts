/**
 * Causation Analysis for Clinical Negligence
 * 
 * Rule-based detection of causation indicators linking delay/miss to harm.
 * Uses keyword/phrase pattern matching - deterministic and explainable.
 */

import { CausationAnalysis, EvidenceFlag } from "./types";
import { getSupabaseAdminClient } from "../supabase";

interface CausationInput {
  rawText: string;
  practiceArea?: string;
}

interface CausationDetectionInput {
  caseId: string;
  orgId: string;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
}

type CausationPattern = {
  match: RegExp | string;
  weight: number;
  label: string;
  reasoning: string;
};

/**
 * Analyse causation from medical record text
 */
export function analyseCausation(input: CausationInput): CausationAnalysis {
  const { rawText, practiceArea } = input;
  
  // Only analyse clinical negligence cases
  if (practiceArea !== "clinical_negligence" && practiceArea !== "clinical-negligence") {
    return {
      score: 0,
      level: "NONE",
      detected: false,
      flags: [],
      indicators: [],
    };
  }

  const textLower = rawText.toLowerCase();
  const flags: EvidenceFlag[] = [];
  let totalScore = 0;
  let flagId = 0;

  // ============================================
  // CAUSATION PATTERNS - Deterioration
  // ============================================
  const deteriorationPatterns: CausationPattern[] = [
    {
      match: /re-presented|re-presentation|returned to a&e|returned to ed|re-attended|re-attendance/i,
      weight: 20,
      label: "Re-presentation with deterioration",
      reasoning: "Patient re-presented, indicating condition did not resolve and may have worsened.",
    },
    {
      match: /ongoing pain|persistent pain|continued pain|pain persisted/i,
      weight: 15,
      label: "Ongoing/persistent pain",
      reasoning: "Pain persisted beyond expected timeframe, suggesting delay may have contributed to ongoing symptoms.",
    },
    {
      match: /worsening|deteriorated|deterioration|not improving|failed to improve/i,
      weight: 25,
      label: "Condition worsened",
      reasoning: "Condition deteriorated, suggesting delay in diagnosis/treatment may have contributed.",
    },
    {
      match: /not improving|failed to improve|no improvement/i,
      weight: 15,
      label: "No improvement",
      reasoning: "Lack of improvement suggests delay may have contributed to ongoing issues.",
    },
  ];

  // ============================================
  // CAUSATION PATTERNS - Clear Link Between Miss and Harm
  // ============================================
  const linkPatterns: CausationPattern[] = [
    {
      match: /in retrospect|retrospectively|on retrospective review/i,
      weight: 20,
      label: "Retrospective identification",
      reasoning: "Retrospective review identifies that earlier intervention would have been appropriate.",
    },
    {
      match: /delay in diagnosis|diagnosis delayed|delayed diagnosis|delay to diagnosis/i,
      weight: 30,
      label: "Delay in diagnosis",
      reasoning: "Explicit documentation of delay in diagnosis, linking delay to outcome.",
    },
    {
      match: /earlier intervention may have|earlier treatment would have|timely treatment|earlier diagnosis would have/i,
      weight: 25,
      label: "Earlier intervention would have helped",
      reasoning: "Documentation suggests earlier intervention would have improved outcome.",
    },
    {
      match: /associated with worsening|linked to|contributed to|resulted in/i,
      weight: 20,
      label: "Delay associated with harm",
      reasoning: "Documentation links delay to worsening outcome.",
    },
  ];

  // ============================================
  // CAUSATION PATTERNS - Escalation
  // ============================================
  const escalationPatterns: CausationPattern[] = [
    {
      match: /admitted to icu|icu admission|intensive care/i,
      weight: 30,
      label: "ICU admission",
      reasoning: "Requirement for intensive care suggests significant deterioration, potentially linked to delay.",
    },
    {
      match: /emergency surgery|urgent surgery required|emergency operation/i,
      weight: 25,
      label: "Emergency surgery required",
      reasoning: "Requirement for emergency surgery suggests delay may have contributed to need for urgent intervention.",
    },
    {
      match: /sepsis diagnosed|septic|septicaemia/i,
      weight: 30,
      label: "Sepsis diagnosed",
      reasoning: "Development of sepsis suggests delay in treatment may have contributed to serious deterioration.",
    },
    {
      match: /fracture now displaced|displaced fracture|fracture displacement/i,
      weight: 25,
      label: "Fracture displacement",
      reasoning: "Fracture displacement suggests delay in treatment may have contributed to worsening.",
    },
  ];

  // Combine all patterns
  const allPatterns = [
    ...deteriorationPatterns,
    ...linkPatterns,
    ...escalationPatterns,
  ];

  // Test each pattern
  for (const pattern of allPatterns) {
    const match = typeof pattern.match === "string"
      ? textLower.includes(pattern.match.toLowerCase())
      : pattern.match.test(textLower);

    if (match) {
      totalScore += pattern.weight;
      flags.push({
        id: `causation-${flagId++}`,
        label: pattern.label,
        severity: pattern.weight >= 25 ? "HIGH" : pattern.weight >= 20 ? "MEDIUM" : "LOW",
        reasoning: pattern.reasoning,
        practiceArea: "clinical_negligence",
      });
    }
  }

  // Determine level based on score
  let level: "LOW" | "MEDIUM" | "HIGH" | "NONE";
  if (totalScore === 0) {
    level = "NONE";
  } else if (totalScore < 20) {
    level = "LOW";
  } else if (totalScore < 50) {
    level = "MEDIUM";
  } else {
    level = "HIGH";
  }

  // Extract indicators for backward compatibility
  const indicators = flags.map(f => f.label);

  return {
    score: Math.min(100, totalScore),
    level,
    detected: flags.length > 0,
    flags,
    indicators,
  };
}

/**
 * Detect causation evidence from case documents (wrapper function)
 * Extracts text from documents and calls analyseCausation
 */
export async function detectCausationEvidence(
  input: CausationDetectionInput,
): Promise<{ level: "HIGH" | "MEDIUM" | "LOW" | "NONE"; detected: boolean; indicators: string[] }> {
  const supabase = getSupabaseAdminClient();
  let allText = "";

  try {
    // Get documents with extracted JSON (raw_text may not exist in documents table)
    const { data: documentsWithContent } = await supabase
      .from("documents")
      .select("id, extracted_json, name, ai_summary")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId)
      .limit(20);

    if (documentsWithContent) {
      for (const doc of documentsWithContent) {
        // Add AI summary if available
        if (doc.ai_summary && doc.ai_summary.length > 50) {
          allText += " " + doc.ai_summary;
        }

        // Add extracted JSON content (this is the primary source)
        if (doc.extracted_json) {
          const extracted = doc.extracted_json as any;
          if (extracted.summary) {
            allText += " " + String(extracted.summary);
          }
          if (extracted.keyIssues && Array.isArray(extracted.keyIssues)) {
            allText += " " + extracted.keyIssues.map((issue: any) =>
              typeof issue === "string" ? issue : (issue.label || issue.description || "")
            ).join(" ");
          }
          if (extracted.timeline && Array.isArray(extracted.timeline)) {
            allText += " " + extracted.timeline.map((event: any) =>
              typeof event === "string" ? event : (event.description || event.label || "")
            ).join(" ");
          }
          // Add full JSON as string for pattern matching
          allText += " " + JSON.stringify(extracted);
        }
      }
    }

    // Also check bundle_chunks for raw text (if bundles exist)
    const { data: bundles } = await supabase
      .from("case_bundles")
      .select("id")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId)
      .limit(1);

    if (bundles && bundles.length > 0) {
      const { data: bundleChunks } = await supabase
        .from("bundle_chunks")
        .select("raw_text, ai_summary")
        .eq("bundle_id", bundles[0].id)
        .limit(50);

      if (bundleChunks) {
        for (const chunk of bundleChunks) {
          if (chunk.raw_text && chunk.raw_text.length > 50) {
            allText += " " + chunk.raw_text;
          }
          if (chunk.ai_summary && chunk.ai_summary.length > 50) {
            allText += " " + chunk.ai_summary;
          }
        }
      }
    }

    // Add timeline descriptions
    const timelineDescriptions = input.timeline.map(t => t.description).join(" ");
    allText += " " + timelineDescriptions;

    // Get timeline events from database
    const { data: timelineEvents } = await supabase
      .from("timeline_events")
      .select("description")
      .eq("case_id", input.caseId)
      .limit(100);

    if (timelineEvents) {
      allText += " " + timelineEvents.map(e => e.description || "").join(" ");
    }
  } catch (error) {
    console.warn("[causation-detection] Failed to load document content:", error);
  }

  // Only analyse if we have meaningful text
  if (allText.trim().length < 100) {
    return {
      level: "NONE",
      detected: false,
      indicators: [],
    };
  }

  // Analyse causation
  const result = analyseCausation({
    rawText: allText,
    practiceArea: "clinical_negligence",
  });

  // Return in expected format
  return {
    level: result.level === "NONE" ? "LOW" : result.level,
    detected: result.detected,
    indicators: result.indicators,
  };
}
