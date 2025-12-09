/**
 * Paywall Usage Tracking
 * 
 * Functions to check usage limits and increment counters
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { PAYWALL_LIMITS, type PlanName, type FeatureKind, getFeatureLimit, isUnlimited } from "./config";

export interface UsageStatus {
  plan: PlanName;
  uploadCount: number;
  analysisCount: number;
  exportCount: number;
  canUpload: boolean;
  canAnalyse: boolean;
  canExport: boolean;
  uploadLimit: number;
  analysisLimit: number;
  exportLimit: number;
}

export interface UsageCheckResult {
  allowed: boolean;
  reason?: "UPGRADE_REQUIRED" | "UNKNOWN_PLAN";
  currentCount?: number;
  limit?: number;
}

/**
 * Get current usage status for an organisation
 */
export async function getUserUsage(
  orgId: string
): Promise<UsageStatus> {
  const supabase = getSupabaseAdminClient();

  const { data: org, error } = await supabase
    .from("organisations")
    .select("plan, upload_count, analysis_count, export_count")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    // Default to free plan if org not found
    return {
      plan: "free",
      uploadCount: 0,
      analysisCount: 0,
      exportCount: 0,
      canUpload: false,
      canAnalyse: false,
      canExport: false,
      uploadLimit: PAYWALL_LIMITS.free.maxUploads,
      analysisLimit: PAYWALL_LIMITS.free.maxAnalysis,
      exportLimit: PAYWALL_LIMITS.free.maxExports,
    };
  }

  const plan = (org.plan === "pro" ? "pro" : "free") as PlanName;
  const uploadCount = org.upload_count ?? 0;
  const analysisCount = org.analysis_count ?? 0;
  const exportCount = org.export_count ?? 0;

  const uploadLimit = getFeatureLimit(plan, "upload");
  const analysisLimit = getFeatureLimit(plan, "analysis");
  const exportLimit = getFeatureLimit(plan, "export");

  return {
    plan,
    uploadCount,
    analysisCount,
    exportCount,
    canUpload: isUnlimited(plan, "upload") || uploadCount < uploadLimit,
    canAnalyse: isUnlimited(plan, "analysis") || analysisCount < analysisLimit,
    canExport: isUnlimited(plan, "export") || exportCount < exportLimit,
    uploadLimit,
    analysisLimit,
    exportLimit,
  };
}

/**
 * Check if user can use a specific feature
 */
export async function ensureCanUseFeature(params: {
  orgId: string;
  feature: FeatureKind;
}): Promise<UsageCheckResult> {
  const { orgId, feature } = params;
  const supabase = getSupabaseAdminClient();

  // Load plan + counts
  const { data: org, error } = await supabase
    .from("organisations")
    .select("plan, upload_count, analysis_count, export_count")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    return {
      allowed: false,
      reason: "UNKNOWN_PLAN",
    };
  }

  const plan = (org.plan === "pro" ? "pro" : "free") as PlanName;

  // Pro plan has unlimited access
  if (plan === "pro") {
    return { allowed: true };
  }

  // Free plan: check limits
  const limit = getFeatureLimit(plan, feature);
  let currentCount = 0;

  switch (feature) {
    case "upload":
      currentCount = org.upload_count ?? 0;
      break;
    case "analysis":
      currentCount = org.analysis_count ?? 0;
      break;
    case "export":
      currentCount = org.export_count ?? 0;
      break;
  }

  if (currentCount >= limit) {
    return {
      allowed: false,
      reason: "UPGRADE_REQUIRED",
      currentCount,
      limit,
    };
  }

  return {
    allowed: true,
    currentCount,
    limit,
  };
}

/**
 * Increment usage counter for a feature
 */
export async function incrementUsage(params: {
  orgId: string;
  feature: FeatureKind;
}): Promise<void> {
  const { orgId, feature } = params;
  const supabase = getSupabaseAdminClient();

  // Use atomic increment via SQL function
  const { error } = await supabase.rpc("increment_usage_counter", {
    org_id_param: orgId,
    counter_type: feature,
  });

  if (error) {
    console.error(`[paywall] Failed to increment ${feature} counter:`, error);
    // Fallback to direct update if function doesn't exist
    const columnName = `${feature}_count` as "upload_count" | "analysis_count" | "export_count";
    const { data: org } = await supabase
      .from("organisations")
      .select(columnName)
      .eq("id", orgId)
      .single();

    if (org) {
      const currentValue = (org[columnName] as number) ?? 0;
      await supabase
        .from("organisations")
        .update({ [columnName]: currentValue + 1 })
        .eq("id", orgId);
    }
  }
}

