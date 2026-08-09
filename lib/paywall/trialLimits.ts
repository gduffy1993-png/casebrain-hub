import { isOwnerUser } from "./owner";
import { PAYWALL_LIMITS } from "./config";
import { WORKSPACE_ENTITLEMENT_GRANTS } from "./workspace-entitlement-grants";
import {
  DEFAULT_TRIAL_CASES_LIMIT,
  DEFAULT_TRIAL_DOCUMENTS_LIMIT,
  resolveEffectiveCapacityLimits,
} from "./workspace-entitlement";

export type TrialStatus = {
  isBlocked: boolean;
  reason?: "TRIAL_EXPIRED" | "DOC_LIMIT" | "CASE_LIMIT";
  trialEndsAt?: string | null;
  docsUsed?: number;
  docsLimit?: number;
  casesUsed?: number;
  casesLimit?: number;
};

type GetTrialStatusParams = {
  supabase: any;
  orgId: string;
  userId?: string | null;
  email?: string | null;
};

/** Trial length in days from first use */
const TRIAL_DAYS = 14;

/** Max cases allowed during trial (abuse prevention) */
const TRIAL_MAX_CASES = DEFAULT_TRIAL_CASES_LIMIT;

/** Max documents allowed during trial (abuse prevention) */
const TRIAL_MAX_DOCS = DEFAULT_TRIAL_DOCUMENTS_LIMIT;

function capacityForOrg(orgId: string) {
  return resolveEffectiveCapacityLimits({
    workspaceId: orgId,
    entitlements: WORKSPACE_ENTITLEMENT_GRANTS,
    defaultCasesLimit: TRIAL_MAX_CASES,
    defaultDocumentsLimit: TRIAL_MAX_DOCS,
    defaultAnalysesLimit: PAYWALL_LIMITS.free.maxAnalysis,
    defaultExportsLimit: PAYWALL_LIMITS.free.maxExports,
  });
}

/**
 * Get trial status for an organization
 * 
 * Business Rules:
 * - 14 days (2 weeks) from first use (first case created OR first document uploaded)
 * - Max 2 cases during trial (abuse prevention)
 * - Max 10 documents total during trial
 * - Unlimited re-analysis/versions within allowed cases
 * - Exports allowed during trial
 * 
 * USAGE:
 * - PRIMARY: Call in API routes (POST endpoints) to enforce limits and return 402
 * - SECONDARY: Can be called in Server Components for READ-ONLY display (never blocks render)
 * 
 * SAFETY: This function NEVER throws errors. It always returns a safe status
 * even if database queries fail. This ensures it can be called safely in any
 * context without crashing Server Components.
 * 
 * ENFORCEMENT: Paywall enforcement (returning 402) should ONLY happen in API routes:
 * - POST /api/upload
 * - POST /api/cases/[caseId]/analysis/rebuild
 * 
 * Server Components should NEVER block rendering based on trial status.
 */
export async function getTrialStatus({
  supabase,
  orgId,
  userId,
  email,
}: GetTrialStatusParams): Promise<TrialStatus> {
  try {
    // Owner bypass - always allow (checked FIRST before any DB queries)
    if (isOwnerUser({ userId, email })) {
      return {
        isBlocked: false,
        docsUsed: 0,
        docsLimit: Infinity,
        casesUsed: 0,
        casesLimit: Infinity,
      };
    }

    // If PAYWALL_MODE is off, always allow (checked SECOND before any DB queries)
    const paywallMode = process.env.PAYWALL_MODE || "trial";
    if (paywallMode === "off") {
      return {
        isBlocked: false,
        docsUsed: 0,
        docsLimit: Infinity,
        casesUsed: 0,
        casesLimit: Infinity,
      };
    }

    // Wrap all database queries in try-catch to prevent errors from propagating
    let earliestCase: { created_at: string } | null = null;
    let earliestDoc: { created_at: string } | null = null;
    let casesUsed = 0;
    let docsUsed = 0;

    try {
      // Get earliest case creation date
      const { data, error } = await supabase
        .from("cases")
        .select("created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        earliestCase = data;
      }
    } catch (error) {
      console.error("[trialLimits] Error fetching earliest case:", error);
      // Continue with null - safe fallback
    }

    try {
      // Get earliest document creation date
      const { data, error } = await supabase
        .from("documents")
        .select("created_at")
        .eq("org_id", orgId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (!error && data) {
        earliestDoc = data;
      }
    } catch (error) {
      console.error("[trialLimits] Error fetching earliest document:", error);
      // Continue with null - safe fallback
    }

    // Determine trial start (earliest of case or document)
    let trialStart: Date | null = null;
    if (earliestCase?.created_at) {
      try {
        trialStart = new Date(earliestCase.created_at);
        if (isNaN(trialStart.getTime())) {
          trialStart = null; // Invalid date
        }
      } catch {
        trialStart = null;
      }
    }
    if (earliestDoc?.created_at) {
      try {
        const docDate = new Date(earliestDoc.created_at);
        if (!isNaN(docDate.getTime())) {
          if (!trialStart || docDate < trialStart) {
            trialStart = docDate;
          }
        }
      } catch {
        // Ignore invalid date
      }
    }

    const capacity = capacityForOrg(orgId);
    const casesLimit = capacity.casesLimit;
    const docsLimit = capacity.documentsLimit;

    // If no trial start, trial hasn't started - treat as active and not blocked
    if (!trialStart) {
      // Still try to get counts for display, but don't block on errors
      try {
        const [casesResult, docsResult] = await Promise.all([
          supabase
            .from("cases")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId),
          supabase
            .from("documents")
            .select("id", { count: "exact", head: true })
            .eq("org_id", orgId),
        ]);
        casesUsed = casesResult.count ?? 0;
        docsUsed = docsResult.count ?? 0;
      } catch (error) {
        console.error("[trialLimits] Error fetching counts:", error);
        // Use 0 as safe fallback
      }

      return {
        isBlocked: false,
        trialEndsAt: capacity.expiresAt,
        docsUsed,
        docsLimit,
        casesUsed,
        casesLimit,
      };
    }

    // Compute trial end (2 weeks from start), or entitlement expiry when active
    const trialEndsAt = new Date(trialStart);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
    const effectiveEndsAt =
      capacity.source === "workspace_entitlement" && capacity.expiresAt
        ? new Date(capacity.expiresAt)
        : trialEndsAt;

    // Get current counts (with error handling)
    try {
      const [casesResult, docsResult] = await Promise.all([
        supabase
          .from("cases")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId),
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("org_id", orgId),
      ]);
      casesUsed = casesResult.count ?? 0;
      docsUsed = docsResult.count ?? 0;
    } catch (error) {
      console.error("[trialLimits] Error fetching counts:", error);
      // Use 0 as safe fallback - this means we won't block if DB fails
      casesUsed = 0;
      docsUsed = 0;
    }

    // Apply limits
    const now = new Date();
    const isExpired =
      capacity.source === "workspace_entitlement"
        ? false // active entitlement already filtered by expiry in resolver
        : now > effectiveEndsAt;

    if (isExpired) {
      return {
        isBlocked: true,
        reason: "TRIAL_EXPIRED",
        trialEndsAt: effectiveEndsAt.toISOString(),
        docsUsed,
        docsLimit,
        casesUsed,
        casesLimit,
      };
    }

    // Check limits: block NEW case creation when at limit (abuse prevention)
    if (casesUsed >= casesLimit) {
      return {
        isBlocked: true,
        reason: "CASE_LIMIT",
        trialEndsAt: effectiveEndsAt.toISOString(),
        docsUsed,
        docsLimit,
        casesUsed,
        casesLimit,
      };
    }

    if (docsUsed >= docsLimit) {
      return {
        isBlocked: true,
        reason: "DOC_LIMIT",
        trialEndsAt: effectiveEndsAt.toISOString(),
        docsUsed,
        docsLimit,
        casesUsed,
        casesLimit,
      };
    }

    // Not blocked
    return {
      isBlocked: false,
      trialEndsAt: effectiveEndsAt.toISOString(),
      docsUsed,
      docsLimit,
      casesUsed,
      casesLimit,
    };
  } catch (error) {
    // CRITICAL: Never throw - always return a safe status
    // If anything goes wrong, default to "not blocked" to prevent crashes
    console.error("[trialLimits] Unexpected error in getTrialStatus:", error);
    return {
      isBlocked: false,
      docsUsed: 0,
      docsLimit: TRIAL_MAX_DOCS,
      casesUsed: 0,
      casesLimit: TRIAL_MAX_CASES,
    };
  }
}

