/**
 * Kill switch for append-only bundle contradiction surfacing.
 * Set NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING=false to disable enrichment.
 */
export function isBundleContradictionSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_CONTRADICTION_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
