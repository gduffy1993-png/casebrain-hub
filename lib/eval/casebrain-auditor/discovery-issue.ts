import { isProductionScoredBucket } from "./corpus-bucket";
import type { AuditorIssue, CaseTruthManifest, CorpusBucket } from "./types";

export function tagDiscoveryIssue(
  manifest: CaseTruthManifest,
  partial: Omit<AuditorIssue, "corpusBucket" | "productionExcluded" | "manifestConfirmed"> & {
    manifestConfirmed?: boolean;
    productionExcluded?: boolean;
  },
): AuditorIssue {
  const bucket: CorpusBucket | undefined = manifest.corpusBucket;
  const productionExcluded =
    partial.productionExcluded ??
    (bucket === "C" || (bucket != null && !isProductionScoredBucket(bucket)));
  const productionScored = bucket === "A" || bucket === "B";
  const manifestConfirmed =
    partial.manifestConfirmed ??
    (productionScored &&
      (partial.severity === "CRITICAL" || partial.severity === "HIGH") &&
      partial.fingerprint.startsWith("source."));

  return {
    ...partial,
    corpusBucket: bucket,
    productionExcluded,
    manifestConfirmed,
  };
}
