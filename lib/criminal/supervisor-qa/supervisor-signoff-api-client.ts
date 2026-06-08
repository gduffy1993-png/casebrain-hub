import type { BuildSupervisorSignoffInput, SupervisorSignoffRecord } from "./supervisor-signoff-types";

export async function postSupervisorSignoffToApi(
  caseId: string,
  input: BuildSupervisorSignoffInput,
): Promise<{ ok: true; record: SupervisorSignoffRecord } | { ok: false }> {
  try {
    const res = await fetch(`/api/criminal/${encodeURIComponent(caseId)}/supervisor-signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: input.status,
        qaStatus: input.qaStatus,
        reasonLabels: input.reasonLabels,
        readinessLevel: input.readinessLevel,
        humanReviewRequired: input.humanReviewRequired,
        evidenceChangeStatus: input.evidenceChangeStatus,
        note: input.note,
        reviewedAt: input.reviewedAt,
        appVersion: input.appVersion,
      }),
    });

    if (!res.ok) return { ok: false };

    const json = (await res.json()) as { ok?: boolean; record?: SupervisorSignoffRecord };
    if (!json.ok || !json.record) return { ok: false };

    return { ok: true, record: json.record };
  } catch {
    return { ok: false };
  }
}
