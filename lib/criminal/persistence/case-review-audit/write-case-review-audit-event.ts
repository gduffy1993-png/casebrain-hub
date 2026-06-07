import { getSupabaseAdminClient } from "@/lib/supabase";
import {
  buildCaseReviewAuditEventRecord,
  recordToAuditInsertPayload,
} from "./case-review-audit-validate";
import type { WriteCaseReviewAuditEventInput } from "./case-review-audit-types";

/**
 * Append-only audit write — never throws; failures are logged only.
 * Call after a successful primary persistence insert.
 */
export async function writeCaseReviewAuditEvent(
  input: WriteCaseReviewAuditEventInput,
): Promise<{ ok: boolean; eventId?: string }> {
  try {
    const record = buildCaseReviewAuditEventRecord(input);
    const supabase = getSupabaseAdminClient();
    const payload = recordToAuditInsertPayload(
      record,
      input.caseId,
      input.orgId,
      input.actorId,
    );

    const { data, error } = await supabase
      .from("case_review_audit_events")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error(`[case_review_audit_events][insert] caseId=${input.caseId}`, {
        code: error.code,
        message: error.message,
        eventType: input.eventType,
      });
      return { ok: false };
    }

    return { ok: true, eventId: data?.id as string | undefined };
  } catch (error) {
    console.error("[writeCaseReviewAuditEvent] error:", error);
    return { ok: false };
  }
}
