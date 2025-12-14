/**
 * Expert Report Detection
 * 
 * Simple rule-based detection of expert reports in case documents.
 */

import { getSupabaseAdminClient } from "../supabase";

interface ExpertDetectionInput {
  caseId: string;
  orgId: string;
  documents: Array<{ id: string; name: string; created_at: string }>;
}

/**
 * Check if an expert report has been uploaded
 */
export async function hasExpertReport(
  input: ExpertDetectionInput,
): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  let allText = "";

  try {
    // Get documents with raw text and extracted JSON
    const { data: documentsWithContent } = await supabase
      .from("documents")
      .select("id, raw_text, extracted_json, name, type")
      .eq("case_id", input.caseId)
      .eq("org_id", input.orgId)
      .limit(20);

    if (documentsWithContent) {
      for (const doc of documentsWithContent) {
        // Check filename for expert indicators
        const nameLower = doc.name.toLowerCase();
        if (
          nameLower.includes("expert") ||
          nameLower.includes("report") ||
          nameLower.includes("opinion") ||
          nameLower.includes("medico-legal")
        ) {
          // Additional check: does the content look like an expert report?
          if (doc.raw_text) {
            allText += " " + doc.raw_text;
          }
          if (doc.extracted_json) {
            allText += " " + JSON.stringify(doc.extracted_json);
          }
        } else {
          // Check content even if filename doesn't match
          if (doc.raw_text) {
            allText += " " + doc.raw_text;
          }
          if (doc.extracted_json) {
            allText += " " + JSON.stringify(doc.extracted_json);
          }
        }
      }
    }
  } catch (error) {
    console.warn("[expert-detection] Failed to load document content:", error);
    return false;
  }

  const textLower = allText.toLowerCase();

  // Expert report indicators
  const expertPatterns = [
    /expert report/i,
    /medico-legal/i,
    /expert opinion/i,
    /expert witness/i,
    /breach of duty/i,
    /standard of care/i,
    /causation/i,
    /quantum/i,
    /prognosis/i,
    /expert concludes/i,
    /in my opinion/i,
    /i am of the opinion/i,
    /expert statement/i,
  ];

  // Check if any expert patterns match
  for (const pattern of expertPatterns) {
    if (pattern.test(textLower)) {
      // Additional check: must have multiple expert-related terms (not just one mention)
      const matchCount = expertPatterns.filter(p => p.test(textLower)).length;
      if (matchCount >= 3) {
        return true;
      }
    }
  }

  return false;
}

