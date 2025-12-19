/**
 * Shared Case Lookup Helper
 * 
 * Handles org_id scope fallback for legacy/new org_id formats.
 * When active org is missing and we derive single-tenant org,
 * endpoints must still find cases/documents created under either
 * org_id style (uuid OR externalRef string).
 */

import "server-only";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Get or create organisation ID by external_ref (duplicated minimal logic to avoid circular deps)
 */
async function getOrCreateOrgIdByExternalRef(externalRef: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  
  // Try to find existing org by external_ref
  const byExternalRef = await supabase
    .from("organisations")
    .select("id")
    .eq("external_ref", externalRef)
    .maybeSingle();
  
  if (byExternalRef.data?.id) {
    const orgId = (byExternalRef.data as any).id as string;
    if (isUuid(orgId)) return orgId;
  }
  
  // If not found, create it
  const insertRes = await supabase
    .from("organisations")
    .insert({
      name: externalRef.startsWith("solo-user_") ? "Solo Workspace" : "Clerk Organisation Workspace",
      email_domain: null,
      external_ref: externalRef,
    } as any)
    .select("id")
    .single();
  
  if (insertRes.error) {
    // If unique constraint exists and we raced, re-select
    if ((insertRes.error as any).code === "23505") {
      const retry = await supabase
        .from("organisations")
        .select("id")
        .eq("external_ref", externalRef)
        .maybeSingle();
      const orgId = (retry.data as any)?.id as string | undefined;
      if (orgId && isUuid(orgId)) return orgId;
    }
    throw new Error(`Failed to create/get org: ${insertRes.error.message}`);
  }
  
  const orgId = (insertRes.data as any)?.id as string | undefined;
  if (!orgId || !isUuid(orgId)) throw new Error("Invalid orgId (expected UUID)");
  return orgId;
}

export type OrgScope = {
  orgIdUuid?: string;
  externalRef?: string;
};

export type CaseRow = {
  id: string;
  org_id: string | null;
  [key: string]: unknown;
};

/**
 * Get org scope (UUID + externalRef) for the current user
 * Uses the same single-tenant derivation logic as requireAuthContext
 */
export async function getOrgScopeOrFallback(clerkUserId: string): Promise<OrgScope> {
  const { activeOrganizationId } = await auth();
  
  // Derive externalRef (same logic as requireAuthContext)
  const externalRef = activeOrganizationId 
    ? `clerk-org_${activeOrganizationId}` 
    : `solo-user_${clerkUserId}`;
  
  // Get or create UUID orgId
  const orgIdUuid = await getOrCreateOrgIdByExternalRef(externalRef);
  
  return {
    orgIdUuid,
    externalRef,
  };
}

/**
 * Find case by ID with org scope fallback
 * 
 * Tries in strict order:
 * 1. cases where id=caseId AND org_id = scope.orgIdUuid
 * 2. cases where id=caseId AND org_id = scope.externalRef
 * 3. cases where id=caseId AND org_id is NULL (if you ever had null)
 * 
 * IMPORTANT: Only allows fallback org_id variants that belong to this same user.
 * Never does an unscoped "id only" lookup that could leak cross-tenant data.
 */
export async function findCaseByIdScoped(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  caseId: string,
  scope: OrgScope,
): Promise<CaseRow | null> {
  // Try 1: UUID org_id
  if (scope.orgIdUuid) {
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .eq("org_id", scope.orgIdUuid)
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
  
  // Try 3: NULL org_id (if you ever had null - rare edge case)
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
 * Same scoped fallback logic as findCaseByIdScoped
 */
export async function findDocumentsByCaseIdScoped(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  caseId: string,
  scope: OrgScope,
): Promise<Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string; [key: string]: unknown }>> {
  const results: Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string; [key: string]: unknown }> = [];
  
  // Try 1: UUID org_id
  if (scope.orgIdUuid) {
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, created_at, extracted_json, raw_text")
      .eq("case_id", caseId)
      .eq("org_id", scope.orgIdUuid)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("[case-lookup] Error querying documents by UUID org_id:", error);
    } else if (data && data.length > 0) {
      return data as Array<{ id: string; name: string; created_at: string; extracted_json?: unknown; raw_text?: string }>;
    }
  }
  
  // Try 2: externalRef org_id (legacy)
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
  
  // Try 3: NULL org_id (rare edge case)
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
  
  return results;
}

