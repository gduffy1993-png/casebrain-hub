import type { BuildReasoningFeedbackInput, ReasoningFeedbackRecord } from "./reasoning-feedback-types";

export async function postReasoningFeedbackToApi(
  caseId: string,
  input: BuildReasoningFeedbackInput,
): Promise<{ ok: true; record: ReasoningFeedbackRecord } | { ok: false }> {
  try {
    const res = await fetch(`/api/criminal/${encodeURIComponent(caseId)}/reasoning-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        surface: input.surface,
        feedbackOption: input.feedbackOption,
        note: input.note,
        routeLabel: input.routeLabel,
        humanReviewRequired: input.humanReviewRequired,
        timestamp: input.timestamp,
        appVersion: input.appVersion,
      }),
    });

    if (!res.ok) return { ok: false };

    const json = (await res.json()) as { ok?: boolean; record?: ReasoningFeedbackRecord };
    if (!json.ok || !json.record) return { ok: false };

    return { ok: true, record: json.record };
  } catch {
    return { ok: false };
  }
}
