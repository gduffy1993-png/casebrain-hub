/**
 * Merge additive contradiction modules for brief enrichment.
 */
import {
  extractBundleContradictions,
  type BundleContradiction,
  type BundleContradictionType,
} from "./extract-bundle-contradictions";
import { isBundleContradictionSurfacingEnabled } from "./bundle-contradiction-surfacing";
import { extractSequenceContradictions } from "./extract-sequence-contradictions";
import { isBundleSequenceSurfacingEnabled } from "./bundle-sequence-surfacing";
import { extractScopeContradictions } from "./extract-scope-contradictions";
import { isBundleScopeSurfacingEnabled } from "./bundle-scope-surfacing";
import { extractStrengthContradictions } from "./extract-strength-contradictions";
import { isBundleStrengthSurfacingEnabled } from "./bundle-strength-surfacing";
import { extractMultiIncidentContradictions } from "./extract-multi-incident-contradictions";
import { isBundleMultiIncidentSurfacingEnabled } from "./bundle-multi-incident-surfacing";

/** Bundle + additive modules — respects per-module kill switches. */
export function extractAllBundleContradictions(
  bundleText: string | null | undefined,
): BundleContradiction[] {
  const out: BundleContradiction[] = [];
  if (isBundleContradictionSurfacingEnabled()) {
    out.push(...extractBundleContradictions(bundleText));
  }
  if (isBundleSequenceSurfacingEnabled()) {
    out.push(...extractSequenceContradictions(bundleText));
  }
  if (isBundleScopeSurfacingEnabled()) {
    out.push(...extractScopeContradictions(bundleText));
  }
  if (isBundleStrengthSurfacingEnabled()) {
    out.push(...extractStrengthContradictions(bundleText));
  }
  if (isBundleMultiIncidentSurfacingEnabled()) {
    out.push(...extractMultiIncidentContradictions(bundleText));
  }

  const seen = new Set<BundleContradictionType>();
  return out.filter((c) => {
    if (seen.has(c.type)) return false;
    seen.add(c.type);
    return true;
  });
}
