/**
 * Medical Evidence Content Detector
 * 
 * Detects presence of medical evidence (A&E, radiology, GP notes) in case content
 * using pattern-based detection, not filename-based checks.
 * 
 * Used to override/adjust missing-evidence flags when medical records are actually present.
 */

import { getSupabaseAdminClient } from "../supabase";

export type MedicalEvidenceSignals = {
  hasMedicalRecords: boolean;
  hasAandE: boolean;
  hasRadiology: boolean;
  hasGP: boolean;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  matched: string[];
};

type MedicalEvidenceInput = {
  caseId: string;
  orgId: string;
};

/**
 * Pattern groups for medical evidence detection
 */
const AAND_E_PATTERNS = [
  "a&e",
  "accident and emergency",
  "ed",
  "emergency department",
  "triage",
  "discharge",
  "presenting complaint",
  "ambulance",
  "minor injuries unit",
];

const RADIOLOGY_PATTERNS = [
  "x-ray",
  "xray",
  "radiology",
  "imaging",
  "report",
  "addendum",
  "film",
  "fracture visible",
  "misread",
  "missed fracture",
];

const GP_PATTERNS = [
  "gp",
  "general practitioner",
  "surgery",
  "referred",
  "fit note",
  "follow up",
  "persistent pain",
  "review",
];

const MEDICAL_RECORDS_GENERAL_PATTERNS = [
  "nhs",
  "patient",
  "attendance",
  "clinical note",
  "observations",
  "bp",
  "pulse",
  "exam",
  "diagnosis",
  "plan",
];

/**
 * Check if text contains enough patterns from a group to trigger detection
 */
function checkPatternGroup(text: string, patterns: string[], threshold: number): { matched: boolean; matchedPhrases: string[] } {
  const lowerText = text.toLowerCase();
  const matchedPhrases: string[] = [];
  
  for (const pattern of patterns) {
    if (lowerText.includes(pattern)) {
      matchedPhrases.push(pattern);
    }
  }
  
  return {
    matched: matchedPhrases.length >= threshold,
    matchedPhrases: matchedPhrases.slice(0, 12), // Keep top ~12 unique matches
  };
}

/**
 * Detect medical evidence signals from case content
 */
export async function detectMedicalEvidenceSignals(
  opts: MedicalEvidenceInput
): Promise<MedicalEvidenceSignals> {
  const supabase = getSupabaseAdminClient();
  
  // Collect all text from multiple sources
  let allText = "";
  const allMatched: string[] = [];
  
  try {
    // 1. Get documents with raw_text and extracted_json
    const { data: documents } = await supabase
      .from("documents")
      .select("raw_text, extracted_json")
      .eq("case_id", opts.caseId)
      .eq("org_id", opts.orgId)
      .limit(50);
    
    if (documents) {
      for (const doc of documents) {
        // Add raw_text (OCR text)
        if (doc.raw_text && typeof doc.raw_text === "string") {
          allText += " " + doc.raw_text;
        }
        
        // Add extracted_json as stringified content
        if (doc.extracted_json) {
          const jsonStr = typeof doc.extracted_json === "string"
            ? doc.extracted_json
            : JSON.stringify(doc.extracted_json);
          allText += " " + jsonStr;
        }
      }
    }
    
    // 2. Get bundle chunks (raw_text and ai_summary) via bundles table
    const { data: bundles } = await supabase
      .from("case_bundles")
      .select("id")
      .eq("case_id", opts.caseId)
      .eq("org_id", opts.orgId)
      .limit(1);
    
    if (bundles && bundles.length > 0) {
      const bundleId = bundles[0].id;
      
      const { data: chunks } = await supabase
        .from("bundle_chunks")
        .select("raw_text, ai_summary")
        .eq("bundle_id", bundleId)
        .limit(100);
      
      if (chunks) {
        for (const chunk of chunks) {
          if (chunk.raw_text && typeof chunk.raw_text === "string") {
            allText += " " + chunk.raw_text;
          }
          if (chunk.ai_summary && typeof chunk.ai_summary === "string") {
            allText += " " + chunk.ai_summary;
          }
        }
      }
      
      // Also check bundle summaries
      const { data: bundleRecords } = await supabase
        .from("case_bundles")
        .select("phase_a_summary, full_summary")
        .eq("id", bundleId)
        .single();
      
      if (bundleRecords) {
        if (bundleRecords.phase_a_summary) {
          allText += " " + bundleRecords.phase_a_summary;
        }
        if (bundleRecords.full_summary) {
          allText += " " + bundleRecords.full_summary;
        }
      }
    }
    
    // 3. Get timeline events (bonus)
    const { data: timeline } = await supabase
      .from("timeline_events")
      .select("description")
      .eq("case_id", opts.caseId)
      .limit(100);
    
    if (timeline) {
      for (const event of timeline) {
        if (event.description) {
          allText += " " + event.description;
        }
      }
    }
    
    // Cap text length to prevent excessive processing (keep first 500k chars)
    if (allText.length > 500000) {
      allText = allText.substring(0, 500000);
    }
    
    // Convert to lowercase for pattern matching
    const lowerText = allText.toLowerCase();
    
    // Check pattern groups with thresholds
    const aandE = checkPatternGroup(lowerText, AAND_E_PATTERNS, 2);
    const radiology = checkPatternGroup(lowerText, RADIOLOGY_PATTERNS, 2);
    const gp = checkPatternGroup(lowerText, GP_PATTERNS, 2);
    const medicalGeneral = checkPatternGroup(lowerText, MEDICAL_RECORDS_GENERAL_PATTERNS, 3);
    
    // Collect matched phrases
    if (aandE.matched) allMatched.push(...aandE.matchedPhrases);
    if (radiology.matched) allMatched.push(...radiology.matchedPhrases);
    if (gp.matched) allMatched.push(...gp.matchedPhrases);
    if (medicalGeneral.matched) allMatched.push(...medicalGeneral.matchedPhrases);
    
    // Deduplicate matched phrases
    const uniqueMatched = Array.from(new Set(allMatched)).slice(0, 12);
    
    // Determine hasMedicalRecords
    const hasMedicalRecords = aandE.matched || radiology.matched || gp.matched || medicalGeneral.matched;
    
    // Determine confidence
    let confidence: "HIGH" | "MEDIUM" | "LOW";
    const categoryCount = [aandE.matched, radiology.matched, gp.matched].filter(Boolean).length;
    
    if (categoryCount >= 2) {
      confidence = "HIGH";
    } else if (hasMedicalRecords) {
      confidence = "MEDIUM";
    } else {
      confidence = "LOW";
    }
    
    return {
      hasMedicalRecords,
      hasAandE: aandE.matched,
      hasRadiology: radiology.matched,
      hasGP: gp.matched,
      confidence,
      matched: uniqueMatched,
    };
  } catch (error) {
    console.warn("[medical-evidence-detector] Error detecting medical evidence:", error);
    // Return safe defaults on error
    return {
      hasMedicalRecords: false,
      hasAandE: false,
      hasRadiology: false,
      hasGP: false,
      confidence: "LOW",
      matched: [],
    };
  }
}

