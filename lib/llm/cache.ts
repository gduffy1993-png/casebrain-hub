/**
 * Smart Caching for LLM Analysis
 * 
 * Caches LLM outputs by caseId + docHash + analysis type to avoid re-computation.
 */

import { getSupabaseAdminClient } from "@/lib/supabase";
import { createHash } from "crypto";

export type CacheKey = {
  analysisName: string; // e.g., "loopholes", "strategyRoutes", "aggressive-defense"
  caseId: string;
  docSetHash: string; // Hash of doc IDs + updatedAt + extractedCharsTotal
  practiceArea: string; // e.g., "criminal"
  roleLens?: string; // Optional role lens identifier
};

export type CacheEntry<T = unknown> = {
  id: string;
  org_id: string;
  case_id: string;
  cache_key: string;
  payload: T;
  created_at: string;
  updated_at: string;
};

/**
 * Generate cache key string from components
 */
export function generateCacheKey(key: CacheKey): string {
  const parts = [
    key.analysisName,
    key.caseId,
    key.docSetHash,
    key.practiceArea,
    key.roleLens || "",
  ];
  return parts.join("::");
}

/**
 * Generate doc set hash from document metadata
 */
export function generateDocSetHash(documents: Array<{
  id: string;
  updated_at?: string;
  raw_text?: string;
}>): string {
  // Sort by ID for consistency
  const sorted = [...documents].sort((a, b) => a.id.localeCompare(b.id));
  
  // Create hash from IDs + updatedAt + text lengths
  const hashInput = sorted
    .map((doc) => `${doc.id}:${doc.updated_at || ""}:${doc.raw_text?.length || 0}`)
    .join("|");
  
  return createHash("sha256").update(hashInput).digest("hex").slice(0, 16);
}

/**
 * Get cached LLM result
 */
export async function getCachedLLMResult<T = unknown>(
  orgId: string,
  cacheKey: CacheKey,
): Promise<{ cached: true; data: T } | { cached: false }> {
  try {
    const supabase = getSupabaseAdminClient();
    const keyString = generateCacheKey(cacheKey);

    const { data, error } = await supabase
      .from("llm_cache")
      .select("*")
      .eq("org_id", orgId)
      .eq("cache_key", keyString)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table might not exist - that's ok, just return cache miss
      const errorCode = (error as any).code;
      if (errorCode === "PGRST205" || error?.message?.includes("Could not find the table")) {
        console.warn("[llm-cache] Table 'llm_cache' not found, treating as cache miss");
        return { cached: false };
      }
      console.error("[llm-cache] Error fetching cache:", error);
      return { cached: false };
    }

    if (!data) {
      return { cached: false };
    }

    // Cache hit - return data
    return {
      cached: true,
      data: data.payload as T,
    };
  } catch (error) {
    console.error("[llm-cache] Error in getCachedLLMResult:", error);
    return { cached: false };
  }
}

/**
 * Set cached LLM result
 */
export async function setCachedLLMResult<T = unknown>(
  orgId: string,
  caseId: string,
  cacheKey: CacheKey,
  payload: T,
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    const keyString = generateCacheKey(cacheKey);

    const { error } = await supabase
      .from("llm_cache")
      .upsert(
        {
          org_id: orgId,
          case_id: caseId,
          cache_key: keyString,
          payload: payload as any,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "cache_key",
        },
      );

    if (error) {
      // Table might not exist - that's ok, just log and continue
      const errorCode = (error as any).code;
      if (errorCode === "PGRST205" || error?.message?.includes("Could not find the table")) {
        console.warn("[llm-cache] Table 'llm_cache' not found, skipping cache write");
        return;
      }
      console.error("[llm-cache] Error setting cache:", error);
    }
  } catch (error) {
    console.error("[llm-cache] Error in setCachedLLMResult:", error);
    // Don't throw - caching is best effort
  }
}

/**
 * Invalidate cache for a case (when new documents are uploaded)
 */
export async function invalidateCaseCache(
  orgId: string,
  caseId: string,
): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();

    const { error } = await supabase
      .from("llm_cache")
      .delete()
      .eq("org_id", orgId)
      .eq("case_id", caseId);

    if (error) {
      const errorCode = (error as any).code;
      if (errorCode === "PGRST205" || error?.message?.includes("Could not find the table")) {
        // Table doesn't exist - that's fine
        return;
      }
      console.error("[llm-cache] Error invalidating cache:", error);
    }
  } catch (error) {
    console.error("[llm-cache] Error in invalidateCaseCache:", error);
    // Don't throw - cache invalidation is best effort
  }
}

