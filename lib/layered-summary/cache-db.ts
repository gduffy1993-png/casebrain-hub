import type { LayeredSummary } from "./types";
import type { LayeredSummaryCache } from "./cache";

type CachedLayeredSummaryEnvelope = {
  layeredSummary?: LayeredSummary;
};

/**
 * DB-backed cache adapter.
 * IMPORTANT: no top-level imports of supabase/env. We lazy-import at call time so unit tests can run with zero env vars.
 */
export function createDbLayeredSummaryCache(): LayeredSummaryCache {
  return {
    get: async ({ caseId, orgId }) => {
      const { getSupabaseAdminClient } = await import("@/lib/supabase");
      const supabase = getSupabaseAdminClient();

      const { data } = await supabase
        .from("cases")
        .select("current_analysis")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();

      const current = (data?.current_analysis ?? null) as CachedLayeredSummaryEnvelope | null;
      const layered = current?.layeredSummary ?? null;
      return layered && layered.version === 1 ? layered : null;
    },

    set: async ({ caseId, orgId, layeredSummary }) => {
      const { getSupabaseAdminClient } = await import("@/lib/supabase");
      const supabase = getSupabaseAdminClient();

      const { data } = await supabase
        .from("cases")
        .select("current_analysis")
        .eq("id", caseId)
        .eq("org_id", orgId)
        .maybeSingle();

      const prev = (data?.current_analysis ?? {}) as Record<string, unknown>;
      const next = {
        ...prev,
        layeredSummary,
      };

      await supabase
        .from("cases")
        .update({ current_analysis: next })
        .eq("id", caseId)
        .eq("org_id", orgId);
    },
  };
}


