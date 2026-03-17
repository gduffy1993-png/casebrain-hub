/**
 * Unified case state snapshot — single source of truth for offence, stance, stage, and committed strategy.
 * All reasoning tools (Chat, Strategy, bail, sentencing, mitigation, disclosure, timeline, Defence Plan box)
 * must read ONLY from this object for authoritative state. No caching; built fresh per request.
 * @see docs/CHAT_FIX_PLAN_SINGLE_SOURCE_OF_TRUTH.md
 */

import { getSupabaseAdminClient } from "@/lib/supabase";

export type CaseStateSnapshot = {
  case_id: string;
  offence_detected_code: string | null;
  offence_detected_label: string | null;
  stance_detected: string | null;
  stage_detected: string | null;
  strategy_committed_primary: string | null;
  strategy_committed_secondary: string[];
  strategy_committed_at: string | null;
  bundle_uploaded_at: string | null;
  disclosure_status: string | null;
  timestamp: string;
};

/**
 * Build the canonical case state snapshot from the DB. No caching.
 * Use this in all API routes and server code that need offence/stance/stage/strategy.
 */
export async function getCaseStateSnapshot(
  caseId: string,
  orgId: string
): Promise<CaseStateSnapshot> {
  const timestamp = new Date().toISOString();
  const supabase = getSupabaseAdminClient();

  const [caseRes, commitmentRes] = await Promise.all([
    supabase
      .from("criminal_cases")
      .select("offence_detected_code, offence_detected_label, stance_detected, stage_detected")
      .eq("id", caseId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("case_strategy_commitments")
      .select("primary_strategy, fallback_strategies, committed_at")
      .eq("case_id", caseId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const row = caseRes.data as {
    offence_detected_code?: string | null;
    offence_detected_label?: string | null;
    stance_detected?: string | null;
    stage_detected?: string | null;
  } | null;
  const commitment = commitmentRes.data as {
    primary_strategy?: string | null;
    fallback_strategies?: unknown;
    committed_at?: string | null;
  } | null;

  const fallbacks = commitment?.fallback_strategies;
  const strategy_committed_secondary: string[] = Array.isArray(fallbacks)
    ? fallbacks.filter((x): x is string => typeof x === "string")
    : typeof fallbacks === "string"
      ? (() => {
          try {
            const parsed = JSON.parse(fallbacks);
            return Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === "string") : [];
          } catch {
            return [];
          }
        })()
      : [];

  return {
    case_id: caseId,
    offence_detected_code: row?.offence_detected_code?.trim() ?? null,
    offence_detected_label: row?.offence_detected_label?.trim() ?? null,
    stance_detected: row?.stance_detected?.trim() ?? null,
    stage_detected: row?.stage_detected?.trim() ?? null,
    strategy_committed_primary: commitment?.primary_strategy ?? null,
    strategy_committed_secondary,
    strategy_committed_at: commitment?.committed_at ?? null,
    bundle_uploaded_at: null, // TODO: from cases/documents when needed
    disclosure_status: null, // TODO: from Safety/disclosure state when needed
    timestamp,
  };
}
