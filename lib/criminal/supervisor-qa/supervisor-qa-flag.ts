"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const SUPERVISOR_STORAGE_KEY = "casebrain:supervisor";

export function readSupervisorFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SUPERVISOR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeSupervisorToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(SUPERVISOR_STORAGE_KEY, "true");
    else window.localStorage.removeItem(SUPERVISOR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Requires reasoningV2=1 and supervisor=1. Default OFF. */
export function isSupervisorQAEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
): boolean {
  const q = searchParams?.get("supervisor");
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;
  return storageEnabled;
}

export function useSupervisorQAEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readSupervisorFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("supervisor");
    if (q === "1" || q === "true") writeSupervisorToStorage(true);
    if (q === "0" || q === "false") writeSupervisorToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isSupervisorQAEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function shouldShowSupervisorQAPanel(
  reasoningV2Enabled: boolean,
  supervisorEnabled: boolean,
  hasSourceBackedReasoning: boolean,
): boolean {
  if (!reasoningV2Enabled || !supervisorEnabled) return false;
  return hasSourceBackedReasoning;
}
