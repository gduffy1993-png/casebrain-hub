import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase";
import { getEvidenceChecklist } from "@/lib/packs";
import { findMissingEvidence } from "@/lib/missing-evidence";

export type CriminalBundleCompleteness = {
  completeness: number; // 0-100
  criticalMissingCount: number;
  totalRequirements: number;
  missingCount: number;
};

export async function getCriminalBundleCompleteness(params: {
  caseId: string;
  orgId: string;
}): Promise<CriminalBundleCompleteness> {
  const supabase = getSupabaseAdminClient();

  const { data: docs } = await supabase
    .from("documents")
    .select("name, type, extracted_json")
    .eq("case_id", params.caseId)
    .eq("org_id", params.orgId);

  const documents = (docs ?? []).map((d: any) => ({
    name: d.name as string,
    type: (d.type as string | undefined) ?? undefined,
    extracted_json: d.extracted_json ?? undefined,
  }));

  const totalRequirements = getEvidenceChecklist("criminal").length;
  const missing = findMissingEvidence(params.caseId, "criminal", documents);

  const missingCount = missing.length;
  const criticalMissingCount = missing.filter((m) => m.priority === "CRITICAL").length;

  const completeness =
    totalRequirements > 0
      ? Math.max(0, Math.min(100, Math.round(((totalRequirements - missingCount) / totalRequirements) * 100)))
      : 0;

  return { completeness, criticalMissingCount, totalRequirements, missingCount };
}


