/**
 * Harm Analysis for Clinical Negligence
 * 
 * Rule-based detection of harm/outcome indicators from medical records.
 * Uses keyword/phrase pattern matching - deterministic and explainable.
 */

import { HarmAnalysis, EvidenceFlag } from "./types";
import { getSupabaseAdminClient } from "../supabase";

interface HarmInput {
  rawText: string;
  practiceArea?: string;
}

interface HarmDetectionInput {
  caseId: string;
  orgId: string;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
}

type HarmPattern = {
  match: RegExp | string;
  weight: number;
  label: string;
  reasoning: string;
};

/**
 * Analyse harm from medical record text
 */
export function analyseHarm(input: HarmInput): HarmAnalysis {
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
  // HARM PATTERNS - Treatment
  // ============================================
  const treatmentPatterns: HarmPattern[] = [
    {
      match: /surgery|operation|surgical|surgical intervention/i,
      weight: 25,
      label: "Surgery required",
      reasoning: "Surgical intervention indicates significant harm requiring operative treatment.",
    },
    {
      match: /orif|fixation|internal fixation|surgical fixation/i,
      weight: 30,
      label: "Surgical fixation required",
      reasoning: "Requirement for surgical fixation indicates significant fracture/injury requiring operative treatment.",
    },
    {
      match: /immobilised|immobilized|plaster|cast applied|splint/i,
      weight: 15,
      label: "Immobilisation required",
      reasoning: "Requirement for immobilisation indicates functional impact and treatment needs.",
    },
  ];

  // ============================================
  // HARM PATTERNS - Functional Impact
  // ============================================
  const functionalPatterns: HarmPattern[] = [
    {
      match: /restricted movement|reduced movement|limited movement/i,
      weight: 20,
      label: "Restricted movement",
      reasoning: "Restricted movement indicates functional impairment and ongoing impact.",
    },
    {
      match: /reduced function|decreased function|loss of function|functional loss/i,
      weight: 25,
      label: "Reduced function",
      reasoning: "Reduced function indicates significant functional impairment.",
    },
    {
      match: /ongoing symptoms|persistent symptoms|continued symptoms/i,
      weight: 15,
      label: "Ongoing symptoms",
      reasoning: "Ongoing symptoms indicate persistent impact from the injury/condition.",
    },
    {
      match: /persistent pain|chronic pain|ongoing pain|continued pain/i,
      weight: 20,
      label: "Persistent pain",
      reasoning: "Persistent pain indicates ongoing harm and functional impact.",
    },
    {
      match: /limited mobility|reduced mobility|decreased mobility|loss of mobility/i,
      weight: 20,
      label: "Limited mobility",
      reasoning: "Limited mobility indicates functional impairment affecting daily activities.",
    },
  ];

  // ============================================
  // HARM PATTERNS - Long-term / Serious Outcomes
  // ============================================
  const seriousOutcomePatterns: HarmPattern[] = [
    {
      match: /permanent deficit|permanent impairment|permanent disability/i,
      weight: 40,
      label: "Permanent deficit",
      reasoning: "Permanent deficit indicates long-term, irreversible harm.",
    },
    {
      match: /long-term disability|chronic disability|ongoing disability/i,
      weight: 35,
      label: "Long-term disability",
      reasoning: "Long-term disability indicates significant ongoing harm.",
    },
    {
      match: /chronic pain|persistent pain|long-term pain/i,
      weight: 25,
      label: "Chronic pain",
      reasoning: "Chronic pain indicates ongoing harm and functional impact.",
    },
    {
      match: /residual weakness|ongoing weakness|persistent weakness/i,
      weight: 20,
      label: "Residual weakness",
      reasoning: "Residual weakness indicates ongoing functional impairment.",
    },
  ];

  // Combine all patterns
  const allPatterns = [
    ...treatmentPatterns,
    ...functionalPatterns,
    ...seriousOutcomePatterns,
  ];

  // Test each pattern
  for (const pattern of allPatterns) {
    const match = typeof pattern.match === "string"
      ? textLower.includes(pattern.match.toLowerCase())
      : pattern.match.test(textLower);

    if (match) {
      totalScore += pattern.weight;
      flags.push({
        id: `harm-${flagId++}`,
        label: pattern.label,
        severity: pattern.weight >= 30 ? "HIGH" : pattern.weight >= 20 ? "MEDIUM" : "LOW",
        reasoning: pattern.reasoning,
        practiceArea: "clinical_negligence",
      });
    }
  }

  // Determine level based on score
  // For harm, we use "PRESENT" instead of "HIGH" for backward compatibility
  let level: "LOW" | "MEDIUM" | "HIGH" | "NONE" | "PRESENT";
  if (totalScore === 0) {
    level = "NONE";
  } else if (totalScore < 20) {
    level = "LOW";
  } else if (totalScore < 50) {
    level = "MEDIUM";
  } else {
    level = "PRESENT"; // Maps to "HIGH" for harm analysis
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
 * Detect harm evidence from case documents (wrapper function)
 * Extracts text from documents and calls analyseHarm
 */
export async function detectHarmEvidence(
  input: HarmDetectionInput,
): Promise<{ level: "PRESENT" | "NONE"; detected: boolean; indicators: string[] }> {
  const supabase = getSupabaseAdminClient();
  let allText = "";

  try {
    // Get documents with raw text and extracted JSON
    const { data: documentsWithContent } = await supabase
      .from("documents")
      .select("id, raw_text, extracted_json, name")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId)
      .limit(20);

    if (documentsWithContent) {
      for (const doc of documentsWithContent) {
        // Add raw text
        if (doc.raw_text && doc.raw_text.length > 50) {
          allText += " " + doc.raw_text;
        }

        // Add extracted JSON content
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
    console.warn("[harm-detection] Failed to load document content:", error);
  }

  // Analyse harm
  const result = analyseHarm({
    rawText: allText,
    practiceArea: "clinical_negligence",
  });

  // Return in expected format (PRESENT/NONE for harm)
  return {
    level: result.level === "PRESENT" ? "PRESENT" : "NONE",
    detected: result.detected,
    indicators: result.indicators,
  };
}
