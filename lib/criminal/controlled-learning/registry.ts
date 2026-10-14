import type { SupabaseClient } from "@supabase/supabase-js";
import { LEARNING_VERSION, RuleSchema, type ApprovedRule } from "./core";

export async function loadRulesFromDatabase(db: SupabaseClient, orgId: string): Promise<{ rules: ApprovedRule[]; status: "ready" | "unavailable" }> {
  try {
    const { data, error } = await db.from("learning_lessons").select("id,field,label,status,evaluation")
      .eq("org_id", orgId).eq("status", "approved").limit(100);
    if (error) return { rules: [], status: "unavailable" };
    const rules = (data ?? []).flatMap(row => {
      const parsed = RuleSchema.safeParse({ field: row.field, label: row.label });
      const report = row.evaluation;
      if (!parsed.success || !report?.eligible || report.pipelineVersion !== LEARNING_VERSION || report.regressions !== 0 || report.failures !== 0) return [];
      return [{ ...parsed.data, id: row.id, status: "approved" as const, pipelineVersion: LEARNING_VERSION }];
    });
    return { rules, status: "ready" };
  } catch { return { rules: [], status: "unavailable" }; }
}
