/**
 * Kill switch for additive triangulation contradiction surfacing (Module 6).
 * Set NEXT_PUBLIC_BUNDLE_TRIANGULATION_SURFACING=false to disable.
 */
export function isBundleTriangulationSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_TRIANGULATION_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
