import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { loadRulesFromDatabase } from "./registry";
import type { ApprovedRule } from "./core";
export async function loadApprovedRules(orgId: string): Promise<{ rules: ApprovedRule[]; status: "ready" | "disabled" | "unavailable" }> {
  if (process.env.CASEBRAIN_CONTROLLED_LEARNING !== "1") return { rules: [], status: "disabled" };
  return loadRulesFromDatabase(getSupabaseAdminClient(), orgId);
}
