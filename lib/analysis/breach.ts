/**
 * Breach Analysis for Clinical Negligence
 * 
 * Rule-based detection of breach of duty indicators from medical records.
 * Uses keyword/phrase pattern matching - deterministic and explainable.
 */

import { BreachAnalysis, EvidenceFlag } from "./types";
import { getSupabaseAdminClient } from "../supabase";

interface BreachInput {
  rawText: string;
  practiceArea?: string;
}

interface BreachDetectionInput {
  caseId: string;
  orgId: string;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
}

type BreachPattern = {
  match: RegExp | string;
  weight: number;
  label: string;
  reasoning: string;
};

/**
 * Analyse breach of duty from medical record text
 */
export function analyseBreach(input: BreachInput): BreachAnalysis {
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
  // BREACH PATTERNS - Imaging Miss / Misread
  // ============================================
  const imagingMissPatterns: BreachPattern[] = [
    {
      match: /no fracture seen|no acute fracture identified|fracture not seen|fracture not identified/i,
      weight: 25,
      label: "Initial imaging missed fracture",
      reasoning: "Initial imaging report states no fracture, but later imaging confirms fracture was present.",
    },
    {
      match: /retrospective review|on review|retrospective|addendum/i,
      weight: 20,
      label: "Retrospective review identifies missed finding",
      reasoning: "Subsequent review of imaging identifies findings that were initially missed.",
    },
    {
      match: /subtle fracture identified|initially missed|missed on initial|overlooked/i,
      weight: 30,
      label: "Fracture initially missed on imaging",
      reasoning: "Fracture was present but not identified on initial imaging review.",
    },
    {
      match: /fracture later identified|fracture confirmed on repeat|repeat imaging shows fracture/i,
      weight: 25,
      label: "Fracture confirmed on repeat imaging",
      reasoning: "Fracture visible on repeat imaging, indicating it was present but missed initially.",
    },
  ];

  // ============================================
  // BREACH PATTERNS - Failure to Escalate
  // ============================================
  const escalationPatterns: BreachPattern[] = [
    {
      match: /no observations recorded|no obs|no observations taken/i,
      weight: 15,
      label: "No observations recorded",
      reasoning: "Failure to record observations when clinically indicated.",
    },
    {
      match: /no bloods taken|no blood tests|no investigations/i,
      weight: 15,
      label: "No investigations requested",
      reasoning: "Failure to request appropriate investigations when clinically indicated.",
    },
    {
      match: /no imaging requested|imaging not requested|no x-ray|no scan/i,
      weight: 20,
      label: "Imaging not requested",
      reasoning: "Failure to request imaging when clinically indicated (e.g., persistent pain, mechanism of injury).",
    },
    {
      match: /no safety net|no safety-netting|no follow-up arranged/i,
      weight: 15,
      label: "No safety-netting",
      reasoning: "Failure to provide safety-netting advice or arrange follow-up when required.",
    },
    {
      match: /not referred|no referral|should have been referred|failure to refer/i,
      weight: 20,
      label: "Failure to refer",
      reasoning: "Failure to refer to specialist when clinically indicated.",
    },
    {
      match: /discharged home despite|sent home despite|discharged despite/i,
      weight: 20,
      label: "Discharged despite concerning symptoms",
      reasoning: "Patient discharged despite symptoms or signs that warranted further investigation or admission.",
    },
  ];

  // ============================================
  // BREACH PATTERNS - Guideline / Pathway Hints
  // ============================================
  const guidelinePatterns: BreachPattern[] = [
    {
      match: /should have been|should have|ought to have/i,
      weight: 15,
      label: "Should have been done",
      reasoning: "Documentation suggests action should have been taken but was not.",
    },
    {
      match: /earlier review indicated|earlier intervention|timely treatment/i,
      weight: 20,
      label: "Earlier intervention indicated",
      reasoning: "Evidence suggests earlier intervention was indicated but delayed.",
    },
    {
      match: /not in accordance with|not according to|not following|breach of/i,
      weight: 25,
      label: "Not in accordance with policy/guidelines",
      reasoning: "Care not provided in accordance with established guidelines or local policy.",
    },
    {
      match: /failed to|failure to|did not|didn't/i,
      weight: 15,
      label: "Failure to act",
      reasoning: "Documentation indicates failure to take required action.",
    },
  ];

  // Combine all patterns
  const allPatterns = [
    ...imagingMissPatterns,
    ...escalationPatterns,
    ...guidelinePatterns,
  ];

  // Test each pattern
  for (const pattern of allPatterns) {
    const match = typeof pattern.match === "string"
      ? textLower.includes(pattern.match.toLowerCase())
      : pattern.match.test(textLower);

    if (match) {
      totalScore += pattern.weight;
      flags.push({
        id: `breach-${flagId++}`,
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
 * Detect breach evidence from case documents (wrapper function)
 * Extracts text from documents and calls analyseBreach
 */
export async function detectBreachEvidence(
  input: BreachDetectionInput,
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
    console.warn("[breach-detection] Failed to load document content:", error);
  }

  // Only analyse if we have meaningful text
  if (allText.trim().length < 100) {
    return {
      level: "NONE",
      detected: false,
      indicators: [],
    };
  }

  // Analyse breach
  const result = analyseBreach({
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
