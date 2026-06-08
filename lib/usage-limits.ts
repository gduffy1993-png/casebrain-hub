import "server-only";
import { getSupabaseAdminClient } from "./supabase";
import type { OrganisationPlan } from "./organisations";

// FREE tier limits
export const FREE_TIER_LIMITS = {
  PDF_UPLOADS_PER_MONTH: 30,
  ACTIVE_CASES_MAX: 10,
} as const;

export type UsageLimitError =
  | "PDF_LIMIT_REACHED"
  | "CASE_LIMIT_REACHED"
  | "FREE_TRIAL_ALREADY_USED"
  | "PHONE_NOT_VERIFIED"
  | "ABUSE_DETECTED";

export interface UsageLimitCheckResult {
  allowed: boolean;
  error?: UsageLimitError;
  limit?: number;
  plan?: OrganisationPlan;
}

/**
 * Get current year-month string (e.g., "2024-12")
 */
function getCurrentYearMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get or create usage counter for organisation and current month
 */
async function getOrCreateUsageCounter(
  organisationId: string,
): Promise<{ pdf_uploads: number; cases_active: number }> {
  const supabase = getSupabaseAdminClient();
  const yearMonth = getCurrentYearMonth();

  const { data: existing } = await supabase
    .from("usage_counters")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("year_month", yearMonth)
    .maybeSingle();

  if (existing) {
    return {
      pdf_uploads: existing.pdf_uploads ?? 0,
      cases_active: existing.cases_active ?? 0,
    };
  }

  // Create new counter for this month
  const { data: newCounter, error } = await supabase
    .from("usage_counters")
    .insert({
      organisation_id: organisationId,
      year_month: yearMonth,
      pdf_uploads: 0,
      cases_active: 0,
    })
    .select("*")
    .single();

  if (error || !newCounter) {
    console.error("[usage-limits] Failed to create usage counter:", error);
    return { pdf_uploads: 0, cases_active: 0 };
  }

  return {
    pdf_uploads: newCounter.pdf_uploads ?? 0,
    cases_active: newCounter.cases_active ?? 0,
  };
}

/**
 * Count active cases for an organisation
 */
async function countActiveCases(organisationId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();

  const { count, error } = await supabase
    .from("cases")
    .select("*", { count: "exact", head: true })
    .eq("org_id", organisationId)
    .eq("is_archived", false);

  if (error) {
    console.error("[usage-limits] Failed to count active cases:", error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Check if organisation can upload a PDF
 */
export async function checkPDFUploadLimit(
  organisationId: string,
  plan: OrganisationPlan,
): Promise<UsageLimitCheckResult> {
  // Paid plans have no limits
  if (plan === "PAID_MONTHLY" || plan === "PAID_YEARLY") {
    return { allowed: true };
  }

  // LOCKED plan means free trial already used
  if (plan === "LOCKED") {
    return {
      allowed: false,
      error: "FREE_TRIAL_ALREADY_USED",
      plan: "LOCKED",
    };
  }

  // FREE plan: check limits
  if (plan === "FREE") {
    const usage = await getOrCreateUsageCounter(organisationId);

    if (usage.pdf_uploads >= FREE_TIER_LIMITS.PDF_UPLOADS_PER_MONTH) {
      return {
        allowed: false,
        error: "PDF_LIMIT_REACHED",
        limit: FREE_TIER_LIMITS.PDF_UPLOADS_PER_MONTH,
        plan: "FREE",
      };
    }
  }

  return { allowed: true };
}

/**
 * Check if organisation can create a new case
 */
export async function checkCaseCreationLimit(
  organisationId: string,
  plan: OrganisationPlan,
): Promise<UsageLimitCheckResult> {
  // Paid plans have no limits
  if (plan === "PAID_MONTHLY" || plan === "PAID_YEARLY") {
    return { allowed: true };
  }

  // LOCKED plan means free trial already used
  if (plan === "LOCKED") {
    return {
      allowed: false,
      error: "FREE_TRIAL_ALREADY_USED",
      plan: "LOCKED",
    };
  }

  // FREE plan: check active case limit
  if (plan === "FREE") {
    const activeCases = await countActiveCases(organisationId);

    if (activeCases >= FREE_TIER_LIMITS.ACTIVE_CASES_MAX) {
      return {
        allowed: false,
        error: "CASE_LIMIT_REACHED",
        limit: FREE_TIER_LIMITS.ACTIVE_CASES_MAX,
        plan: "FREE",
      };
    }
  }

  return { allowed: true };
}

/**
 * Increment PDF upload counter
 */
export async function incrementPDFUploadCounter(
  organisationId: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const yearMonth = getCurrentYearMonth();

  // Get or create counter first
  const current = await getOrCreateUsageCounter(organisationId);

  // Increment using update
  const { error } = await supabase
    .from("usage_counters")
    .update({
      pdf_uploads: current.pdf_uploads + 1,
      last_updated_at: new Date().toISOString(),
    })
    .eq("organisation_id", organisationId)
    .eq("year_month", yearMonth);

  if (error) {
    console.error("[usage-limits] Failed to increment PDF counter:", error);
  }
}

/**
 * Update active case count (call after case creation/deletion/archive)
 */
export async function updateActiveCaseCount(
  organisationId: string,
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const yearMonth = getCurrentYearMonth();
  const activeCount = await countActiveCases(organisationId);

  // Get or create counter
  await getOrCreateUsageCounter(organisationId);

  // Update active case count
  const { error } = await supabase
    .from("usage_counters")
    .update({
      cases_active: activeCount,
      last_updated_at: new Date().toISOString(),
    })
    .eq("organisation_id", organisationId)
    .eq("year_month", yearMonth);

  if (error) {
    console.error("[usage-limits] Failed to update active case count:", error);
  }
}

