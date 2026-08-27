import type { ParsedBundleHeader } from "@/lib/bundle/parse-bundle-display";
import type { ExtractedBundleCaseMetadata } from "@/lib/criminal/extract-bundle-case-metadata";

export type CourtTodayBundlePayload = {
  caseMetadata: ExtractedBundleCaseMetadata | null;
  header: ParsedBundleHeader | null;
  /** Compact source/front-matter text; used only for shared header truth fallbacks. */
  frontMatterScan: string | null;
};

export async function fetchCourtTodayBundleMetadata(
  caseId: string,
): Promise<CourtTodayBundlePayload | null> {
  try {
    const res = await fetch(`/api/criminal/${caseId}/bundle-source`, {
      cache: "no-store",
      credentials: "include",
    });
    const json = await res.json();
    if (!json?.ok || !json?.data) return null;
    const d = json.data as {
      caseMetadata?: ExtractedBundleCaseMetadata | null;
      header?: ParsedBundleHeader | null;
      frontMatterScan?: string | null;
    };
    return {
      caseMetadata: d.caseMetadata ?? null,
      header: d.header ?? null,
      frontMatterScan: typeof d.frontMatterScan === "string" ? d.frontMatterScan : null,
    };
  } catch {
    return null;
  }
}

export async function enrichCourtTodayBundles(
  caseIds: string[],
): Promise<Map<string, CourtTodayBundlePayload>> {
  const map = new Map<string, CourtTodayBundlePayload>();
  const batchSize = 6;
  for (let i = 0; i < caseIds.length; i += batchSize) {
    const batch = caseIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (id) => ({ id, data: await fetchCourtTodayBundleMetadata(id) })),
    );
    for (const { id, data } of results) {
      if (data) map.set(id, data);
    }
  }
  return map;
}
