import { isCriminalPilotMode } from "@/lib/pilot-mode";

export type WorkflowFlagSearchParams = {
  get: (key: string) => string | null;
} | null;

/** Criminal pilot solicitors get core workflow flags ON unless URL/storage overrides. */
export function isCriminalPilotDefaultWorkflowFlagsOn(): boolean {
  return isCriminalPilotMode();
}

/**
 * Query param wins when set; else explicit localStorage true; else pilot default.
 * Pass `defaultOn: false` in tests to assert legacy off behaviour.
 */
export function resolveCriminalWorkflowFlag(
  searchParams: WorkflowFlagSearchParams,
  paramKey: string,
  storageExplicitTrue: boolean,
  options?: { defaultOn?: boolean },
): boolean {
  const q = searchParams?.get(paramKey);
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;
  if (storageExplicitTrue) return true;
  const defaultOn = options?.defaultOn ?? isCriminalPilotDefaultWorkflowFlagsOn();
  return defaultOn;
}
