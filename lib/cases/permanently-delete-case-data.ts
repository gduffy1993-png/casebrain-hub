import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Deletes related rows then the case row. Caller must verify org + archived first.
 * Mirrors app/api/cases/[caseId]/permanent-delete.
 */
export async function permanentlyDeleteCaseData(
  supabase: SupabaseClient,
  caseId: string,
): Promise<void> {
  await supabase.from("letters").delete().eq("case_id", caseId);
  await supabase.from("documents").delete().eq("case_id", caseId);
  await supabase.from("tasks").delete().eq("case_id", caseId);
  await supabase.from("risk_flags").delete().eq("case_id", caseId);
  await supabase.from("deadlines").delete().eq("case_id", caseId);
  await supabase.from("case_notes").delete().eq("case_id", caseId);

  await supabase.from("pi_cases").delete().eq("id", caseId);
  await supabase.from("pi_medical_reports").delete().eq("case_id", caseId);
  await supabase.from("pi_offers").delete().eq("case_id", caseId);
  await supabase.from("pi_hearings").delete().eq("case_id", caseId);
  await supabase.from("pi_disbursements").delete().eq("case_id", caseId);

  await supabase.from("housing_cases").delete().eq("id", caseId);
  await supabase.from("housing_defects").delete().eq("case_id", caseId);
  await supabase.from("housing_timeline").delete().eq("case_id", caseId);
  await supabase.from("housing_landlord_responses").delete().eq("case_id", caseId);

  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;
}
