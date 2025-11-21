import "server-only";

import { getSupabaseAdminClient } from "./supabase";

type AuditPayload = {
  caseId: string;
  userId: string;
  action: string;
  details: Record<string, unknown>;
};

export async function appendAuditLog(payload: AuditPayload) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("audit_log").insert({
    case_id: payload.caseId,
    user_id: payload.userId,
    action: payload.action,
    details: payload.details,
  });

  if (error) {
    throw error;
  }
}

export async function recordDocumentVersion({
  documentId,
  version,
  checksum,
}: {
  documentId: string;
  version: number;
  checksum: string;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("documents_versions").insert({
    document_id: documentId,
    version,
    checksum,
  });

  if (error) {
    throw error;
  }
}

