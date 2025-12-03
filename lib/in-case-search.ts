import "server-only";

import { getSupabaseAdminClient } from "./supabase";
import type { SearchHit } from "./types/casebrain";

/**
 * Search within a specific case's documents
 */
export async function inCaseSearch(
  caseId: string,
  orgId: string,
  query: string,
): Promise<SearchHit[]> {
  if (!query.trim()) {
    return [];
  }

  const supabase = getSupabaseAdminClient();

  // Search in documents for this case
  const { data: documents, error } = await supabase
    .from("documents")
    .select("id, name, type, extracted_json, case_id")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const hits: SearchHit[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

  for (const doc of documents ?? []) {
    // Check document title
    if (doc.name.toLowerCase().includes(queryLower)) {
      hits.push({
        caseId,
        documentId: doc.id,
        documentTitle: doc.name,
        snippet: `Document: ${doc.name}`,
        highlightedText: query,
        score: 1.0,
        matchType: "title",
      });
    }

    // Search in extracted JSON
    const extracted = doc.extracted_json as Record<string, unknown> | null;
    if (extracted) {
      const textContent = extractTextContent(extracted);

      // Find matches in text content
      for (const { field, text } of textContent) {
        const lowerText = text.toLowerCase();
        let matchFound = false;
        let matchScore = 0;

        // Exact phrase match
        if (lowerText.includes(queryLower)) {
          matchFound = true;
          matchScore = 0.9;
        } else {
          // Term matching
          const matchingTerms = queryTerms.filter((term) =>
            lowerText.includes(term),
          );
          if (matchingTerms.length > 0) {
            matchFound = true;
            matchScore = (matchingTerms.length / queryTerms.length) * 0.7;
          }
        }

        if (matchFound) {
          const snippet = extractSnippet(text, queryLower, queryTerms);
          hits.push({
            caseId,
            documentId: doc.id,
            documentTitle: doc.name,
            snippet: `${field}: ${snippet}`,
            highlightedText: query,
            score: matchScore,
            matchType: "content",
          });
        }
      }
    }
  }

  // Also search in letters
  const { data: letters } = await supabase
    .from("letters")
    .select("id, case_id, body, template_id, version")
    .eq("case_id", caseId);

  for (const letter of letters ?? []) {
    if (letter.body.toLowerCase().includes(queryLower)) {
      const snippet = extractSnippet(letter.body, queryLower, queryTerms);
      hits.push({
        caseId,
        documentId: letter.id,
        documentTitle: `Letter v${letter.version} (${letter.template_id})`,
        snippet,
        highlightedText: query,
        score: 0.8,
        matchType: "content",
      });
    }
  }

  // Sort by score and dedupe
  const uniqueHits = hits.reduce(
    (acc, hit) => {
      const key = `${hit.documentId}-${hit.matchType}`;
      if (!acc[key] || (acc[key].score ?? 0) < (hit.score ?? 0)) {
        acc[key] = hit;
      }
      return acc;
    },
    {} as Record<string, SearchHit>,
  );

  return Object.values(uniqueHits).sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );
}

/**
 * Extract text content from extracted JSON for searching
 */
function extractTextContent(
  obj: Record<string, unknown>,
  prefix = "",
): Array<{ field: string; text: string }> {
  const results: Array<{ field: string; text: string }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fieldName = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string" && value.length > 0) {
      results.push({ field: fieldName, text: value });
    } else if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (typeof item === "string") {
          results.push({ field: `${fieldName}[${i}]`, text: item });
        } else if (typeof item === "object" && item !== null) {
          results.push(
            ...extractTextContent(item as Record<string, unknown>, `${fieldName}[${i}]`),
          );
        }
      }
    } else if (typeof value === "object" && value !== null) {
      results.push(
        ...extractTextContent(value as Record<string, unknown>, fieldName),
      );
    }
  }

  return results;
}

/**
 * Extract a snippet around the match
 */
function extractSnippet(
  text: string,
  query: string,
  queryTerms: string[],
): string {
  const maxLength = 200;
  const lowerText = text.toLowerCase();

  // Find the position of the match
  let matchPos = lowerText.indexOf(query.toLowerCase());
  if (matchPos === -1) {
    // Find first matching term
    for (const term of queryTerms) {
      matchPos = lowerText.indexOf(term);
      if (matchPos !== -1) break;
    }
  }

  if (matchPos === -1) {
    // No match found, return start of text
    return text.slice(0, maxLength) + (text.length > maxLength ? "..." : "");
  }

  // Calculate snippet boundaries
  const start = Math.max(0, matchPos - 60);
  const end = Math.min(text.length, matchPos + 140);

  let snippet = text.slice(start, end);

  // Add ellipsis if truncated
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

