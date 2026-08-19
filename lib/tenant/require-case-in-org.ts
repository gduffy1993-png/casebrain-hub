/**
 * Shared tenant case/document gate.
 *
 * CB-HIST / tenant isolation:
 * authenticated org A + foreign org B resource ID must be observationally
 * equivalent to a nonexistent resource ID (uniform 404, identical body).
 *
 * Never:
 * - load by id alone then compare org (403 vs 404 oracle)
 * - trust case.org_id after an unscoped lookup for further writes
 * - disclose that a foreign case/document exists
 */
import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const TENANT_CASE_NOT_FOUND = "Case not found";
export const TENANT_DOCUMENT_NOT_FOUND = "Document not found";

export type TenantCaseRow = {
  id: string;
  org_id: string;
  [key: string]: unknown;
};

export type TenantDocumentRow = {
  id: string;
  case_id: string;
  org_id: string;
  [key: string]: unknown;
};

export type RequireCaseInOrgOk = {
  ok: true;
  caseRow: TenantCaseRow;
};

export type RequireCaseInOrgFail = {
  ok: false;
  response: NextResponse;
};

export type RequireCaseInOrgResult = RequireCaseInOrgOk | RequireCaseInOrgFail;

/**
 * Load a case only when it belongs to the authenticated org.
 * Foreign and missing cases both yield HTTP 404 with the same body.
 */
export async function requireCaseInOrg(
  caseId: string,
  orgId: string,
  options?: { select?: string },
): Promise<RequireCaseInOrgResult> {
  if (!caseId?.trim() || !orgId?.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: TENANT_CASE_NOT_FOUND }, { status: 404 }),
    };
  }

  const supabase = getSupabaseAdminClient();
  const select = options?.select ?? "id, org_id";
  const { data, error } = await supabase
    .from("cases")
    .select(select)
    .eq("id", caseId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: TENANT_CASE_NOT_FOUND }, { status: 404 }),
    };
  }

  const row = data as unknown as TenantCaseRow;
  if (!row.org_id || row.org_id !== orgId) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: TENANT_CASE_NOT_FOUND }, { status: 404 }),
    };
  }

  return { ok: true, caseRow: row };
}

/**
 * Load a document only when it belongs to the authenticated org.
 * Foreign and missing documents both yield HTTP 404 with the same body.
 */
export async function requireDocumentInOrg(
  documentId: string,
  orgId: string,
  options?: { select?: string },
): Promise<
  | { ok: true; document: TenantDocumentRow }
  | { ok: false; response: NextResponse }
> {
  if (!documentId?.trim() || !orgId?.trim()) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: TENANT_DOCUMENT_NOT_FOUND }, { status: 404 }),
    };
  }

  const supabase = getSupabaseAdminClient();
  const select = options?.select ?? "id, case_id, org_id";
  const { data, error } = await supabase
    .from("documents")
    .select(select)
    .eq("id", documentId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: TENANT_DOCUMENT_NOT_FOUND }, { status: 404 }),
    };
  }

  const row = data as unknown as TenantDocumentRow;
  if (!row.org_id || row.org_id !== orgId) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: TENANT_DOCUMENT_NOT_FOUND }, { status: 404 }),
    };
  }

  return { ok: true, document: row };
}

/**
 * Pure contract helper for tests — foreign vs missing must share status + error text.
 */
export function tenantNotFoundEquivalence(foreign: { status: number; error: string }, missing: { status: number; error: string }): boolean {
  return foreign.status === 404 && missing.status === 404 && foreign.error === missing.error;
}
