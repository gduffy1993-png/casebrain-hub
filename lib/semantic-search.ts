/**
 * Semantic Search Brain
 * 
 * Enables natural language search across cases, documents, and letters
 * using OpenAI embeddings and vector similarity.
 */

import { getSupabaseAdminClient } from "./supabase";
import type { SimilarCase } from "./types/casebrain";

export type SearchCategory = "cases" | "documents" | "letters" | "all";

export type SemanticSearchResult = {
  id: string;
  type: "case" | "document" | "letter";
  caseId: string;
  title: string;
  summary: string;
  practiceArea?: string;
  similarity: number;
  matchedContent?: string;
  createdAt: string;
};

export type SemanticSearchParams = {
  query: string;
  orgId: string;
  category?: SearchCategory;
  practiceArea?: string;
  limit?: number;
  excludeCaseIds?: string[];
};

/**
 * Generate embedding for a text query using OpenAI
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: text.slice(0, 8000), // Limit input length
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Failed to generate embedding:", error);
    return null;
  }
}

/**
 * Perform semantic search across the organization's data
 */
export async function semanticSearch(
  params: SemanticSearchParams
): Promise<SemanticSearchResult[]> {
  const { query, orgId, category = "all", practiceArea, limit = 20, excludeCaseIds = [] } = params;
  const supabase = getSupabaseAdminClient();
  const results: SemanticSearchResult[] = [];

  // For now, use keyword-based search as a fallback
  // In production with embeddings, would use vector similarity
  
  const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

  // Search cases
  if (category === "cases" || category === "all") {
    let casesQuery = supabase
      .from("cases")
      .select("id, title, summary, practice_area, created_at")
      .eq("org_id", orgId)
      .eq("is_archived", false);

    if (excludeCaseIds.length > 0) {
      casesQuery = casesQuery.not("id", "in", `(${excludeCaseIds.join(",")})`);
    }

    if (practiceArea) {
      casesQuery = casesQuery.eq("practice_area", practiceArea);
    }

    const { data: cases } = await casesQuery.limit(limit);

    for (const c of cases ?? []) {
      const titleLower = (c.title ?? "").toLowerCase();
      const summaryLower = (c.summary ?? "").toLowerCase();
      const searchText = `${titleLower} ${summaryLower}`;

      const matchCount = searchTerms.filter(term => searchText.includes(term)).length;
      if (matchCount > 0) {
        results.push({
          id: c.id,
          type: "case",
          caseId: c.id,
          title: c.title,
          summary: c.summary ?? "",
          practiceArea: c.practice_area,
          similarity: matchCount / searchTerms.length,
          createdAt: c.created_at,
        });
      }
    }
  }

  // Search documents
  if (category === "documents" || category === "all") {
    const { data: documents } = await supabase
      .from("documents")
      .select("id, name, type, case_id, summary, created_at, cases!inner(org_id, is_archived)")
      .eq("cases.org_id", orgId)
      .eq("cases.is_archived", false)
      .limit(limit * 2);

    for (const doc of documents ?? []) {
      const nameLower = (doc.name ?? "").toLowerCase();
      const summaryLower = (doc.summary ?? "").toLowerCase();
      const searchText = `${nameLower} ${summaryLower}`;

      const matchCount = searchTerms.filter(term => searchText.includes(term)).length;
      if (matchCount > 0) {
        results.push({
          id: doc.id,
          type: "document",
          caseId: doc.case_id,
          title: doc.name,
          summary: doc.summary ?? doc.type ?? "Document",
          similarity: matchCount / searchTerms.length,
          createdAt: doc.created_at,
        });
      }
    }
  }

  // Search letters
  if (category === "letters" || category === "all") {
    const { data: letters } = await supabase
      .from("letters")
      .select("id, template_id, body, case_id, created_at, cases!inner(org_id, title, is_archived)")
      .eq("cases.org_id", orgId)
      .eq("cases.is_archived", false)
      .limit(limit * 2);

    for (const letter of letters ?? []) {
      const bodyLower = (letter.body ?? "").toLowerCase();
      const templateLower = (letter.template_id ?? "").toLowerCase();
      const searchText = `${templateLower} ${bodyLower}`;

      const matchCount = searchTerms.filter(term => searchText.includes(term)).length;
      if (matchCount > 0) {
        results.push({
          id: letter.id,
          type: "letter",
          caseId: letter.case_id,
          title: `Letter: ${letter.template_id}`,
          summary: letter.body?.slice(0, 200) ?? "",
          similarity: matchCount / searchTerms.length,
          matchedContent: letter.body?.slice(0, 300),
          createdAt: letter.created_at,
        });
      }
    }
  }

  // Sort by similarity and return top results
  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Find similar cases to a given case
 */
export async function findSimilarCases(
  caseId: string,
  orgId: string,
  limit: number = 5
): Promise<SimilarCase[]> {
  const supabase = getSupabaseAdminClient();

  // Get the source case
  const { data: sourceCase } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area")
    .eq("id", caseId)
    .single();

  if (!sourceCase) return [];

  // Get other cases in the same practice area
  const { data: candidates } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area, created_at")
    .eq("org_id", orgId)
    .eq("is_archived", false)
    .neq("id", caseId)
    .eq("practice_area", sourceCase.practice_area)
    .limit(50);

  if (!candidates || candidates.length === 0) return [];

  // Simple keyword-based similarity
  const sourceTerms = new Set(
    `${sourceCase.title ?? ""} ${sourceCase.summary ?? ""}`
      .toLowerCase()
      .split(/\s+/)
      .filter(t => t.length > 3)
  );

  const similarCases: SimilarCase[] = candidates.map(c => {
    const candidateText = `${c.title ?? ""} ${c.summary ?? ""}`.toLowerCase();
    const candidateTerms = candidateText.split(/\s+/).filter(t => t.length > 3);
    
    const matchingTerms = candidateTerms.filter(t => sourceTerms.has(t));
    const similarity = matchingTerms.length / Math.max(sourceTerms.size, 1);

    return {
      caseId: c.id,
      title: c.title,
      similarity: Math.min(similarity * 2, 0.95), // Scale up, cap at 95%
      matchReasons: matchingTerms.slice(0, 5).map(t => `Contains "${t}"`),
      practiceArea: c.practice_area ?? "unknown",
    };
  });

  return similarCases
    .filter(c => c.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Index a case for semantic search (generate and store embedding)
 */
export async function indexCase(caseId: string, orgId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();

  // Get case data
  const { data: caseData } = await supabase
    .from("cases")
    .select("id, title, summary, practice_area")
    .eq("id", caseId)
    .single();

  if (!caseData) return false;

  // Build content for embedding
  const content = [
    caseData.title,
    caseData.summary,
    caseData.practice_area,
  ].filter(Boolean).join(" ");

  // Generate embedding
  const embedding = await generateEmbedding(content);
  if (!embedding) return false;

  // Create hash
  const contentHash = Buffer.from(content).toString("base64").slice(0, 32);

  // Upsert embedding
  const { error } = await supabase
    .from("case_embeddings")
    .upsert({
      case_id: caseId,
      org_id: orgId,
      content_hash: contentHash,
      content_summary: content.slice(0, 1000),
      embedding: embedding,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "case_id",
    });

  return !error;
}

