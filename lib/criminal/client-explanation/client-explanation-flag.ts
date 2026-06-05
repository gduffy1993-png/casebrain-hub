"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const CLIENT_EXPLAIN_STORAGE_KEY = "casebrain:clientExplain";

export function readClientExplainFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(CLIENT_EXPLAIN_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeClientExplainToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(CLIENT_EXPLAIN_STORAGE_KEY, "true");
    else window.localStorage.removeItem(CLIENT_EXPLAIN_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Requires reasoningV2=1 and clientExplain=1. Default OFF. */
export function isClientExplainEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
): boolean {
  const q = searchParams?.get("clientExplain");
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;
  return storageEnabled;
}

export function useClientExplainEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readClientExplainFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("clientExplain");
    if (q === "1" || q === "true") writeClientExplainToStorage(true);
    if (q === "0" || q === "false") writeClientExplainToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isClientExplainEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function shouldShowClientExplanation(
  reasoningV2Enabled: boolean,
  clientExplainEnabled: boolean,
  hasSourceBackedReasoning: boolean,
): boolean {
  if (!reasoningV2Enabled || !clientExplainEnabled) return false;
  return hasSourceBackedReasoning;
}
