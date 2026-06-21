/**
 * Kill switch for additive multi-incident contradiction surfacing (Module 5).
 * Set NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING=false to disable.
 */
export function isBundleMultiIncidentSurfacingEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_BUNDLE_MULTI_INCIDENT_SURFACING ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}
