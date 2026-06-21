/**
 * Kill switch for additive sequence contradiction surfacing (Module 2).
 * Set NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING=false to disable.
 */
export function isBundleSequenceSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_SEQUENCE_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
