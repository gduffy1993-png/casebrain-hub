/**
 * Criminal law corpus – ingest and retrieve for Phase 2 (Defence Plan box / chat).
 * Uses OpenAI embeddings and pgvector; source = real legislation (e.g. CPIA from legislation.gov.uk).
 */

import { getSupabaseAdminClient } from "@/lib/supabase";
import { generateEmbedding } from "@/lib/semantic-search";

const CHUNK_MAX_CHARS = 1500;
const CHUNK_OVERLAP = 150;

export type LawChunk = {
  source: string;
  title: string;
  content_text: string;
};

export type LawChunkWithEmbedding = LawChunk & { content_hash: string; embedding: number[] };

/**
 * Split text into overlapping chunks for embedding.
 */
export function chunkText(text: string, maxChars = CHUNK_MAX_CHARS, overlap = CHUNK_OVERLAP): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maxChars, text.length);
    if (end < text.length) {
      const lastSpace = text.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }
    chunks.push(text.slice(start, end).trim());
    start = end - (end === text.length ? 0 : overlap);
  }
  return chunks.filter((c) => c.length > 0);
}

/**
 * Delete all chunks for a source (e.g. before re-ingesting).
 */
export async function deleteLawChunksBySource(source: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("criminal_law_chunks").delete().eq("source", source);
  return { ok: !error, error: error?.message };
}

/**
 * Ingest law chunks: generate embeddings and insert into criminal_law_chunks.
 */
export async function ingestLawChunks(chunks: LawChunk[]): Promise<{ ok: boolean; count: number; error?: string }> {
  const supabase = getSupabaseAdminClient();
  let count = 0;
  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.content_text);
    if (!embedding) continue;
    const content_hash = Buffer.from(chunk.content_text).toString("base64").slice(0, 64);
    const { error } = await supabase.from("criminal_law_chunks").insert({
      source: chunk.source,
      title: chunk.title,
      content_text: chunk.content_text,
      content_hash,
      embedding,
    });
    if (error) return { ok: false, count, error: error.message };
    count++;
  }
  return { ok: true, count };
}

/**
 * Retrieve top-k law chunks by semantic similarity to query. Used to ground box/chat.
 */
export async function retrieveLawChunks(
  query: string,
  limit = 5,
  sourceFilter?: string
): Promise<Array<{ source: string; title: string; content_text: string; similarity: number }>> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const supabase = getSupabaseAdminClient();
  let queryBuilder = supabase.rpc("match_criminal_law_chunks", {
    query_embedding: embedding,
    match_count: limit,
  });

  // If we had a filter we'd add .eq("source", sourceFilter) but RPC doesn't support that easily; filter in app
  const { data, error } = await queryBuilder;
  if (error) {
    console.error("[retrieveLawChunks]", error);
    return [];
  }
  const rows = (data ?? []) as Array<{ source: string; title: string; content_text: string; similarity: number }>;
  if (sourceFilter) return rows.filter((r) => r.source === sourceFilter);
  return rows;
}

/**
 * Return chunk counts per source (for verifying ingestion). Used by GET /api/criminal/law/counts.
 */
export async function getLawChunkCountsBySource(): Promise<Record<string, number>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("criminal_law_chunks")
    .select("source")
    .not("embedding", "is", null);
  if (error) {
    console.error("[getLawChunkCountsBySource]", error);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const s = row.source ?? "unknown";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}
