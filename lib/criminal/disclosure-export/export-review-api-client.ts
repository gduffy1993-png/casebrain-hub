import type { BuildExportReviewInput } from "./export-review-types";
import type { ExportReviewRecord } from "./export-review-types";

export async function postExportReviewToApi(
  caseId: string,
  input: BuildExportReviewInput,
): Promise<{ ok: true; record: ExportReviewRecord } | { ok: false }> {
  try {
    const res = await fetch(`/api/criminal/${encodeURIComponent(caseId)}/export-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exportType: input.exportType,
        reviewStatus: input.reviewStatus,
        routeLabel: input.routeLabel,
        readinessLevel: input.readinessLevel,
        humanReviewRequired: input.humanReviewRequired,
        solicitorReviewRequired: input.solicitorReviewRequired,
        exportHash: input.exportHash,
        note: input.note,
        reviewedAt: input.reviewedAt,
        appVersion: input.appVersion,
      }),
    });

    if (!res.ok) return { ok: false };

    const json = (await res.json()) as { ok?: boolean; record?: ExportReviewRecord };
    if (!json.ok || !json.record) return { ok: false };

    return { ok: true, record: json.record };
  } catch {
    return { ok: false };
  }
}

export async function fetchExportReviewsFromApi(
  caseId: string,
): Promise<ExportReviewRecord[] | null> {
  try {
    const res = await fetch(`/api/criminal/${encodeURIComponent(caseId)}/export-review`, {
      cache: "no-store",
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { ok?: boolean; records?: ExportReviewRecord[] };
    if (!json.ok || !Array.isArray(json.records)) return null;
    return json.records;
  } catch {
    return null;
  }
}
