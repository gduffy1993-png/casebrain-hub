/**
 * Case Role Detection
 * 
 * Infers whether the case is claimant-side or defendant-side based on:
 * - Document language and tone
 * - Document structure (claim forms, defences, expert reports)
 * - Presence of damages narratives
 * - Expert opinion positioning
 * - Party references
 */

import { getSupabaseAdminClient } from "../supabase";
import type { PracticeArea } from "../types/casebrain";

export type CaseRole = "claimant" | "defendant";

type RoleDetectionInput = {
  caseId: string;
  orgId: string;
  practiceArea: PracticeArea;
  documents: Array<{ id: string; name: string; created_at: string }>;
  timeline: Array<{ event_date: string; description: string }>;
};

/**
 * Detect case role (claimant vs defendant)
 * 
 * Analyzes document names, timeline events, and extracted content
 * to determine if this is a claimant case or defendant case.
 */
export async function detectCaseRole(
  input: RoleDetectionInput,
): Promise<CaseRole> {
  const supabase = getSupabaseAdminClient();
  
  // Collect all text content for analysis
  const documentNames = input.documents.map(d => d.name.toLowerCase());
  const timelineDescriptions = input.timeline.map(t => t.description.toLowerCase());
  const allText = [...documentNames, ...timelineDescriptions].join(" ");
  
  // CLAIMANT INDICATORS (strong positive signals)
  const claimantIndicators = [
    // Document types
    "particulars of claim",
    "letter of claim",
    "schedule of loss",
    "schedule of damages",
    "expert report breach",
    "expert report causation",
    "expert report liability",
    "witness statement",
    "claimant statement",
    "client statement",
    "statement of case",
    "claim form",
    "cnf", // Claim notification form
    "pap letter", // Pre-action protocol letter
    
    // Language patterns
    "we claim",
    "claimant alleges",
    "claimant suffered",
    "as a result of",
    "breach of duty",
    "failure to",
    "negligent",
    "delayed diagnosis",
    "missed diagnosis",
    "guideline breach",
    "nice guideline",
    "standard of care",
    "damages",
    "compensation",
    "injury caused by",
    "avoidable",
    "should have",
    
    // Expert positioning
    "expert confirms",
    "expert opinion",
    "breach established",
    "causation established",
    "avoidable harm",
    
    // Clinical negligence specific
    "guideline breach",
    "nice guideline",
    "sepsis pathway",
    "triage failure",
    "observation failure",
    "escalation failure",
    "delay in",
    "delay to",
    "icu admission",
    "sepsis",
    "infection",
    "abscess",
    "surgical",
    "psychological injury",
    "psychiatric",
  ];
  
  // DEFENDANT INDICATORS (strong negative signals)
  const defendantIndicators = [
    // Document types
    "defence",
    "defence and counterclaim",
    "response to",
    "acknowledgment of service",
    "defendant's",
    "deny",
    "denies",
    
    // Language patterns
    "we deny",
    "defendant denies",
    "dispute",
    "disputes",
    "contested",
    "not admitted",
    "not liable",
    "not responsible",
    "causation disputed",
    "quantum disputed",
    "mitigation",
    "contributory",
    "pre-existing",
    
    // Procedural/defensive language
    "strike out",
    "summary judgment",
    "no reasonable prospects",
    "abuse of process",
    "frivolous",
    "vexatious",
  ];
  
  // Count indicators
  let claimantScore = 0;
  let defendantScore = 0;
  
  // Check document names and timeline
  for (const indicator of claimantIndicators) {
    if (allText.includes(indicator)) {
      claimantScore += 1;
    }
  }
  
  for (const indicator of defendantIndicators) {
    if (allText.includes(indicator)) {
      defendantScore += 1;
    }
  }
  
  // Try to get extracted facts from documents for deeper analysis
  try {
    const { data: documentsWithFacts } = await supabase
      .from("documents")
      .select("id, extracted_json, name")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId)
      .limit(5);
    
    if (documentsWithFacts) {
      for (const doc of documentsWithFacts) {
        const extracted = doc.extracted_json as any;
        if (extracted) {
          const docText = JSON.stringify(extracted).toLowerCase();
          
          // Check for claimant language in extracted facts
          if (
            docText.includes("claimant") ||
            docText.includes("client") ||
            docText.includes("injured party") ||
            docText.includes("victim")
          ) {
            claimantScore += 2;
          }
          
          // Check for damages/quantum language
          if (
            docText.includes("damages") ||
            docText.includes("loss") ||
            docText.includes("compensation") ||
            docText.includes("quantum")
          ) {
            claimantScore += 1;
          }
          
          // Check for breach/causation language (claimant perspective)
          if (
            docText.includes("breach") ||
            docText.includes("negligence") ||
            docText.includes("causation") ||
            docText.includes("avoidable")
          ) {
            // Only count if not in defensive context
            if (!docText.includes("deny") && !docText.includes("dispute")) {
              claimantScore += 1;
            }
          }
        }
      }
    }
  } catch (error) {
    // Continue with document name analysis if extraction fails
    console.warn("[role-detection] Failed to analyze extracted facts:", error);
  }
  
  // Default to claimant if scores are equal (most cases are claimant)
  // Only choose defendant if defendant score is significantly higher
  if (defendantScore > claimantScore + 2) {
    console.log(`[role-detection] Detected DEFENDANT role (scores: claimant=${claimantScore}, defendant=${defendantScore})`);
    return "defendant";
  }
  
  console.log(`[role-detection] Detected CLAIMANT role (scores: claimant=${claimantScore}, defendant=${defendantScore})`);
  return "claimant";
}

