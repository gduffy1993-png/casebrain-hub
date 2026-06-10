"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCriminalWorkflowFlag } from "@/lib/criminal/workflow/criminal-workflow-flag-defaults";

export const READINESS_STORAGE_KEY = "casebrain:readiness";

export function readReadinessFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(READINESS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeReadinessToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(READINESS_STORAGE_KEY, "true");
    else window.localStorage.removeItem(READINESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Requires reasoningV2=1 and readiness=1. ON by default in criminal pilot mode. */
export function isReadinessEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
  options?: { defaultOn?: boolean },
): boolean {
  return resolveCriminalWorkflowFlag(searchParams, "readiness", storageEnabled, options);
}

export function useReadinessEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readReadinessFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("readiness");
    if (q === "1" || q === "true") writeReadinessToStorage(true);
    if (q === "0" || q === "false") writeReadinessToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isReadinessEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function shouldShowPreHearingReadiness(
  reasoningV2Enabled: boolean,
  readinessEnabled: boolean,
  hasSourceBackedReasoning: boolean,
): boolean {
  if (!reasoningV2Enabled || !readinessEnabled) return false;
  return hasSourceBackedReasoning;
}
