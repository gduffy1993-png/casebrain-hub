/**
 * Demo Overview shell (UI-only). Does not change invent / chase / hearing brains.
 *
 * Default ON for this branch. Opt out: ?classicOverview=1 or NEXT_PUBLIC_DEMO_OVERVIEW_SHELL=0
 * Force on: ?demoShell=1
 */

export function isDemoOverviewShellEnvEnabled(): boolean {
  const raw = (process.env.NEXT_PUBLIC_DEMO_OVERVIEW_SHELL ?? "true").trim();
  return !/^(0|false|no|off)$/i.test(raw);
}

export function resolveDemoOverviewShellFromSearchParams(
  searchParams: { get(name: string): string | null } | null | undefined,
): boolean {
  if (searchParams?.get("classicOverview") === "1") return false;
  if (searchParams?.get("demoShell") === "1") return true;
  return isDemoOverviewShellEnvEnabled();
}
