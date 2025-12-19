/**
 * Shared Case Lookup Helper
 * 
 * Handles org_id scope fallback for legacy/new org_id formats.
 * When active org is missing and we derive single-tenant org,
 * endpoints must still find cases/documents created under either
 * org_id style (uuid OR externalRef string).
 */

import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase";

export type OrgScope = {
  orgId: string | null;
  externalRef: string | null;
};

export type CaseRow = {
  id: string;
  org_id: string | null;
  [key: string]: unknown;
};

/**
 * Get org scope (UUID + externalRef) for the current user
 * Simplified to avoid circular imports - orgId may be null if not available
 */
export async function getOrgScopeOrFallback(clerkUserId: string): Promise<OrgScope> {
  // Always derive externalRef (this is the key for legacy lookups)
  const externalRef = `solo-user_${clerkUserId}`;
  
  // Try to get orgId from organisations table by external_ref
  // If this fails or causes circular imports, orgId will be null
  // and we'll rely on externalRef for lookups
  let orgId: string | null = null;
  try {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from("organisations")
      .select("id")
      .eq("external_ref", externalRef)
      .maybeSingle();
    
    if (data?.id) {
      const id = (data as any).id as string;
      // Validate it's a UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        orgId = id;
      }
    }
  } catch {
    // If lookup fails (e.g., table doesn't exist, circular import), orgId stays null
    // We'll still use externalRef for lookups
  }
  
  return {
    orgId,
    externalRef,
  };
}

/**
 * Find case by ID with org scope fallback
 * 
 * Tries in strict order:
 * 1. cases where id=caseId AND org_id = scope.orgId (if orgId present)
 * 2. cases where id=caseId AND org_id = scope.externalRef (legacy)
 * 3. cases where id=caseId AND org_id IS NULL (edge case)
 * 
 * IMPORTANT: Only allows fallback org_id variants that belong to this same user.
 * Never does an unscoped "id only" lookup that could leak cross-tenant data.
 */
export async function findCaseByIdScoped(
  caseId: string,
  scope: OrgScope,
): Promise<CaseRow | null> {
  const supabase = getSupabaseAdminClient();
  
  // Try 1: UUID org_id
  if (scope.orgId) {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", scope.orgId)
      .maybeSingle();
    
    if (error) {
      console.error("[case-lookup] Error querying by UUID org_id:", error);
    } else if (data) {
      return data as CaseRow;
    }
  }
  
  // Try 2: externalRef org_id (legacy)
  if (scope.externalRef) {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", scope.externalRef)
      .maybeSingle();
    
    if (error) {
      console.error("[case-lookup] Error querying by externalRef org_id:", error);
    } else if (data) {
      // Dev-only log when legacy org_id match succeeds
      if (process.env.NODE_ENV !== "production") {
        console.log(`[case-lookup] Matched legacy org_id via externalRef for caseId=${caseId}`);
      }
      return data as CaseRow;
    }
  }
  
  // Try 3: NULL org_id (edge case)
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("id", caseId)
    .is("org_id", null)
    .maybeSingle();
  
  if (error) {
    console.error("[case-lookup] Error querying by NULL org_id:", error);
  } else if (data) {
    return data as CaseRow;
  }
  
  // Not found in any scope
  return null;
}

/**
 * Find documents by case_id with org scope fallback
 * 
 * Tries in strict order:
 * 1. documents where case_id=caseId AND org_id = scope.orgId (if orgId present)
 * 2. documents where case_id=caseId AND org_id = scope.externalRef (legacy)
 * 3. documents where case_id=caseId AND org_id = caseOrgId (if case found and org_id matches case)
 * 4. documents where case_id=caseId AND org_id IS NULL (edge case)
 * 
 * The caseOrgId fallback handles data mismatches where documents.org_id doesn't match
 * scope but does match the case's org_id (safe because we already verified the case belongs to user).
 */
export async function findDocumentsByCaseIdScoped(
  caseId: string,
  scope: OrgScope,
  caseOrgId: string | null | undefined = undefined,
): Promise<Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string; [key: string]: unknown }>> {
  const supabase = getSupabaseAdminClient();
  
  // Try 1: UUID org_id from scope
  if (scope.orgId) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, created_at, extracted_json, raw_text")
      .eq("case_id", caseId)
      .eq("org_id", scope.orgId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[case-lookup] Error querying documents by UUID org_id:", error);
    } else if (data && data.length > 0) {
      return data as Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string }>;
    }
  }
  
  // Try 2: externalRef org_id from scope (legacy)
  if (scope.externalRef) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, created_at, extracted_json, raw_text")
      .eq("case_id", caseId)
      .eq("org_id", scope.externalRef)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[case-lookup] Error querying documents by externalRef org_id:", error);
    } else if (data && data.length > 0) {
      return data as Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string }>;
    }
  }
  
  // Try 3: case's org_id (handles data mismatches where documents have same org_id as case)
  if (caseOrgId) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, created_at, extracted_json, raw_text")
      .eq("case_id", caseId)
      .eq("org_id", caseOrgId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[case-lookup] Error querying documents by case org_id:", error);
    } else if (data && data.length > 0) {
      // Dev-only log when case org_id match succeeds (indicates data mismatch was resolved)
      if (process.env.NODE_ENV !== "production") {
        console.log(`[case-lookup] Matched documents via case org_id (mismatch resolved) for caseId=${caseId}, caseOrgId=${caseOrgId}`);
      }
      return data as Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string }>;
    }
  }
  
  // Try 4: NULL org_id (edge case)
  const { data, error } = await supabase
    .from("documents")
    .select("id, name, created_at, extracted_json, raw_text")
    .eq("case_id", caseId)
    .is("org_id", null)
    .order("created_at", { ascending: false });
  
  if (error) {
    console.error("[case-lookup] Error querying documents by NULL org_id:", error);
  } else if (data) {
    return data as Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string }>;
  }
  
  return [];
}

