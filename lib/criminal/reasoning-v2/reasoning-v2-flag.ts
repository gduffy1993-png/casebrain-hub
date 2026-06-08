"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCriminalWorkflowFlag } from "@/lib/criminal/workflow/criminal-workflow-flag-defaults";

export const REASONING_V2_STORAGE_KEY = "casebrain:reasoningV2";

export function readReasoningV2FromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(REASONING_V2_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeReasoningV2ToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(REASONING_V2_STORAGE_KEY, "true");
    else window.localStorage.removeItem(REASONING_V2_STORAGE_KEY);
  } catch {
    /* ignore quota / privacy mode */
  }
}

/** Query param wins; else localStorage; else ON in criminal pilot mode. */
export function isReasoningV2Enabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
  options?: { defaultOn?: boolean },
): boolean {
  return resolveCriminalWorkflowFlag(searchParams, "reasoningV2", storageEnabled, options);
}

export function useReasoningV2Enabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readReasoningV2FromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("reasoningV2");
    if (q === "1" || q === "true") writeReasoningV2ToStorage(true);
    if (q === "0" || q === "false") writeReasoningV2ToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isReasoningV2Enabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}
