/**
 * Kill switch for Module 7 — client-safe explanation packaging.
 * Set NEXT_PUBLIC_BUNDLE_CLIENT_SAFE_SURFACING=false to disable.
 */
export function isBundleClientSafeSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_CLIENT_SAFE_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
