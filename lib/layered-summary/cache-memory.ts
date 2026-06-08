import type { LayeredSummary } from "./types";
import type { LayeredSummaryCache } from "./cache";

/**
 * In-memory cache for tests / local usage.
 * Pure (no env, no DB).
 */
export function createMemoryLayeredSummaryCache(): LayeredSummaryCache {
  const store = new Map<string, LayeredSummary>();

  const keyFor = (caseId: string, orgId: string) => `${orgId}:${caseId}`;

  return {
    get: async ({ caseId, orgId }) => {
      return store.get(keyFor(caseId, orgId)) ?? null;
    },
    set: async ({ caseId, orgId, layeredSummary }) => {
      store.set(keyFor(caseId, orgId), layeredSummary);
    },
  };
}


