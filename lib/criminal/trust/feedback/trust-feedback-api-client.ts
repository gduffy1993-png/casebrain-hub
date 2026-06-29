import type { BuildTrustFeedbackInput, TrustFeedbackRecord } from "./trust-feedback-types";

export async function postTrustFeedbackToApi(
  caseId: string,
  input: BuildTrustFeedbackInput,
): Promise<{ ok: true; record: TrustFeedbackRecord } | { ok: false }> {
  try {
    const res = await fetch(`/api/criminal/${encodeURIComponent(caseId)}/trust-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab: input.tab,
        feedbackKind: input.feedbackKind,
        lineSnippet: input.lineSnippet,
        contextLabel: input.contextLabel,
        sourceState: input.sourceState,
        sendability: input.sendability,
        note: input.note,
        timestamp: input.timestamp,
        outputVersion: input.outputVersion,
        section: input.section,
        severity: input.severity,
        exportId: input.exportId,
        exportType: input.exportType,
      }),
    });

    if (!res.ok) return { ok: false };

    const json = (await res.json()) as { ok?: boolean; record?: TrustFeedbackRecord };
    if (!json.ok || !json.record) return { ok: false };

    return { ok: true, record: json.record };
  } catch {
    return { ok: false };
  }
}
