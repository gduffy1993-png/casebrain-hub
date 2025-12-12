/**
 * Paywall Usage Tracking
 * 
 * Functions to check usage limits and increment counters
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { PAYWALL_LIMITS, type PlanName, type FeatureKind, getFeatureLimit, isUnlimited } from "./config";
import { shouldBypassPaywall } from "./bypass";

export interface UsageStatus {
  plan: PlanName | "OWNER";
  uploadCount: number;
  analysisCount: number;
  exportCount: number;
  canUpload: boolean;
  canAnalyse: boolean;
  canExport: boolean;
  uploadLimit: number;
  analysisLimit: number;
  exportLimit: number;
  isOwner?: boolean;
  bypassActive?: boolean;
  remainingUploads?: number;
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
    // New users should be able to upload (they have 0 uploads, which is less than the limit)
    const freeUploadLimit = PAYWALL_LIMITS.free.maxUploads;
    const freeAnalysisLimit = PAYWALL_LIMITS.free.maxAnalysis;
    const freeExportLimit = PAYWALL_LIMITS.free.maxExports;
    
    return {
      plan: "free",
      uploadCount: 0,
      analysisCount: 0,
      exportCount: 0,
      canUpload: true, // 0 < limit, so they can upload
      canAnalyse: true, // 0 < limit, so they can analyse
      canExport: true, // 0 < limit, so they can export
      uploadLimit: freeUploadLimit,
      analysisLimit: freeAnalysisLimit,
      exportLimit: freeExportLimit,
    };
  }

  // Handle plan migration: old "FREE" -> "free", old "PAID_*" -> "pro", support "starter"
  let plan: PlanName = "free";
  if (org.plan === "pro" || org.plan === "starter") {
    plan = org.plan as PlanName;
  } else if (org.plan === "FREE" || org.plan === "free") {
    plan = "free";
  } else if (org.plan === "PAID_MONTHLY" || org.plan === "PAID_YEARLY") {
    plan = "pro";
  }
  
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
  userId?: string; // Optional: for owner exemption check
  email?: string | null; // Optional: for owner exemption check
}): Promise<UsageCheckResult> {
  const { orgId, feature, userId, email } = params;
  const supabase = getSupabaseAdminClient();

  // ============================================
  // BYPASS CHECK - MUST HAPPEN FIRST (BEFORE ANY DB CALLS)
  // ============================================
  const bypassed = await shouldBypassPaywall(userId, email);
  if (bypassed) {
    console.log("[paywall] ✅ Bypass active - skipping usage check");
    return { allowed: true };
  }
  
  console.log("[paywall] Regular usage check proceeding");

  // Load plan + counts
  const { data: org, error } = await supabase
    .from("organisations")
    .select("plan, upload_count, analysis_count, export_count")
    .eq("id", orgId)
    .single();

  if (error || !org) {
    // If org doesn't exist, default to free plan with 0 usage (should allow uploads)
    console.log("[paywall] ⚠️ Org not found, defaulting to free plan with 0 usage");
    const freeUploadLimit = PAYWALL_LIMITS.free.maxUploads;
    return {
      allowed: true, // New users should be able to upload
      currentCount: 0,
      limit: freeUploadLimit,
    };
  }

  // Handle plan migration: old "FREE" -> "free", old "PAID_*" -> "pro", support "starter"
  let plan: PlanName = "free";
  if (org.plan === "pro" || org.plan === "starter") {
    plan = org.plan as PlanName;
  } else if (org.plan === "FREE" || org.plan === "free") {
    plan = "free";
  } else if (org.plan === "PAID_MONTHLY" || org.plan === "PAID_YEARLY") {
    plan = "pro";
  }

  // Pro plan has unlimited access
  if (plan === "pro") {
    console.log("[paywall] ✅ Pro plan - unlimited access");
    return { allowed: true };
  }
  
  // Starter plan has higher limits but still needs checking
  if (plan === "starter") {
    // Check limits for starter (will be checked below)
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

  // Ensure currentCount is a valid number (handle NULL/undefined)
  currentCount = Number(currentCount) || 0;
  
  console.log(`[paywall] Feature check: ${feature}, currentCount: ${currentCount}, limit: ${limit}, plan: ${plan}`);

  // Check if limit is reached
  // If limit is 15, user can upload 15 times:
  // - After 0 uploads: count = 0 (< 15, allowed)
  // - After 14 uploads: count = 14 (< 15, allowed) 
  // - After 15 uploads: count = 15 (= 15, blocked - they've used all 15)
  // So we block when currentCount >= limit
  // BUT: We check BEFORE incrementing, so if currentCount is 14 and limit is 15, they can still upload
  // The check is correct: block if currentCount >= limit
  if (currentCount >= limit) {
    console.log(`[paywall] ❌ Blocked: currentCount (${currentCount}) >= limit (${limit})`);
    return {
      allowed: false,
      reason: "UPGRADE_REQUIRED",
      currentCount,
      limit,
    };
  }
  
  console.log(`[paywall] ✅ Allowed: currentCount (${currentCount}) < limit (${limit})`);

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
      .select("upload_count, analysis_count, export_count")
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

