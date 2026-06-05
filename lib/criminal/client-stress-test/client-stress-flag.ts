"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const CLIENT_STRESS_STORAGE_KEY = "casebrain:clientStress";

export function readClientStressFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLIENT_STRESS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeClientStressToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(CLIENT_STRESS_STORAGE_KEY, "true");
    else window.localStorage.removeItem(CLIENT_STRESS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isClientStressEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
): boolean {
  const q = searchParams?.get("clientStress");
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;
  return storageEnabled;
}

export function useClientStressEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readClientStressFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("clientStress");
    if (q === "1" || q === "true") writeClientStressToStorage(true);
    if (q === "0" || q === "false") writeClientStressToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isClientStressEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function shouldShowClientStressPanel(
  clientStressEnabled: boolean,
  reasoningV2Enabled: boolean,
  hasSourceBackedReasoning: boolean,
): boolean {
  if (!clientStressEnabled) return false;
  if (!reasoningV2Enabled && !hasSourceBackedReasoning) return false;
  return reasoningV2Enabled;
}
