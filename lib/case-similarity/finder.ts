/**
 * Case Similarity Engine
 * 
 * Finds similar cases and learns from history
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import type { PracticeArea } from "@/lib/types/casebrain";

export interface SimilarCase {
  caseId: string;
  caseTitle: string;
  similarityScore: number; // 0-100
  practiceArea: PracticeArea;
  similarFacts: string[];
  outcome: string | null;
  settlementAmount: number | null;
  strategy: string | null;
  whatWorked: string[];
  whatDidntWork: string[];
  opponentName: string | null;
}

/**
 * Find similar cases
 */
export async function findSimilarCases(
  orgId: string,
  caseId: string,
  limit: number = 5
): Promise<SimilarCase[]> {
  const supabase = getSupabaseAdminClient();

  // Get current case data
  const { data: currentCase } = await supabase
    .from("cases")
    .select("id, title, practice_area")
    .eq("id", caseId)
    .single();

  if (!currentCase) return [];

  // Get extracted facts
  const { data: documents } = await supabase
    .from("documents")
    .select("extracted_json")
    .eq("case_id", caseId)
    .limit(1);

  const extractedFacts = documents?.[0]?.extracted_json as {
    summary?: string;
    keyIssues?: string[];
    parties?: Array<{ name: string; role: string }>;
  } | null;

  // Find cases in same practice area
  const { data: similarCases } = await supabase
    .from("cases")
    .select("id, title, practice_area, is_archived")
    .eq("org_id", orgId)
    .eq("practice_area", currentCase.practice_area)
    .neq("id", caseId)
    .eq("is_archived", true) // Only closed cases for learning
    .limit(20);

  if (!similarCases || similarCases.length === 0) return [];

  // Calculate similarity scores (simplified - would use embeddings in production)
  const similar: SimilarCase[] = [];

  for (const similarCase of similarCases) {
    // Get extracted facts for similar case
    const { data: similarDocs } = await supabase
      .from("documents")
      .select("extracted_json")
      .eq("case_id", similarCase.id)
      .limit(1);

    const similarFacts = similarDocs?.[0]?.extracted_json as {
      summary?: string;
      keyIssues?: string[];
    } | null;

    // Simple similarity calculation (would use embeddings in production)
    let similarityScore = 50; // Base score for same practice area

    if (extractedFacts?.summary && similarFacts?.summary) {
      // Check for common keywords
      const currentWords = extractedFacts.summary.toLowerCase().split(/\s+/);
      const similarWords = similarFacts.summary.toLowerCase().split(/\s+/);
      const commonWords = currentWords.filter(w => similarWords.includes(w));
      similarityScore += (commonWords.length / Math.max(currentWords.length, similarWords.length)) * 30;
    }

    if (extractedFacts?.keyIssues && similarFacts?.keyIssues) {
      const commonIssues = extractedFacts.keyIssues.filter(i => similarFacts.keyIssues?.includes(i));
      similarityScore += (commonIssues.length / Math.max(extractedFacts.keyIssues.length, similarFacts.keyIssues.length)) * 20;
    }

    // Get outcome data
    let outcome: string | null = null;
    let settlementAmount: number | null = null;
    let strategy: string | null = null;

    // Get case profitability data
    const { data: profitability } = await supabase
      .from("case_profitability")
      .select("status, total_recovered")
      .eq("case_id", similarCase.id)
      .single();

    if (profitability) {
      if (profitability.status === "profitable") {
        outcome = "Successful";
      } else if (profitability.status === "unprofitable") {
        outcome = "Unsuccessful";
      }
      settlementAmount = profitability.total_recovered || null;
    }

    // Get opponent name
    const { data: opponentData } = await supabase
      .from("opponent_behavior_events")
      .select("opponent_name")
      .eq("case_id", similarCase.id)
      .limit(1)
      .single();

    similar.push({
      caseId: similarCase.id,
      caseTitle: similarCase.title,
      similarityScore: Math.min(100, Math.round(similarityScore)),
      practiceArea: similarCase.practice_area as PracticeArea,
      similarFacts: extractedFacts?.keyIssues?.filter(i => similarFacts?.keyIssues?.includes(i)) || [],
      outcome,
      settlementAmount,
      strategy: null, // Would extract from case notes or strategic intelligence
      whatWorked: [], // Would extract from case notes
      whatDidntWork: [], // Would extract from case notes
      opponentName: opponentData?.opponent_name || null,
    });
  }

  // Sort by similarity and return top results
  return similar
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

