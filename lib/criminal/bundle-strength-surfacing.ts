/**
 * Kill switch for additive strength contradiction surfacing (Module 4).
 * Set NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING=false to disable.
 */
export function isBundleStrengthSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_STRENGTH_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
