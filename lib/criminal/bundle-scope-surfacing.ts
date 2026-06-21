/**
 * Kill switch for additive scope contradiction surfacing (Module 3).
 * Set NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING=false to disable.
 */
export function isBundleScopeSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_SCOPE_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
