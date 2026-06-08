"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCriminalWorkflowFlag } from "@/lib/criminal/workflow/criminal-workflow-flag-defaults";

export const EXPORTS_STORAGE_KEY = "casebrain:exports";

export function readExportsFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EXPORTS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeExportsToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(EXPORTS_STORAGE_KEY, "true");
    else window.localStorage.removeItem(EXPORTS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Requires reasoningV2=1 and exports=1. ON by default in criminal pilot mode. */
export function isExportsEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
  options?: { defaultOn?: boolean },
): boolean {
  return resolveCriminalWorkflowFlag(searchParams, "exports", storageEnabled, options);
}

export function useExportsEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readExportsFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("exports");
    if (q === "1" || q === "true") writeExportsToStorage(true);
    if (q === "0" || q === "false") writeExportsToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isExportsEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function shouldShowSolicitorExportBuilder(
  reasoningV2Enabled: boolean,
  exportsEnabled: boolean,
  hasSourceBackedReasoning: boolean,
): boolean {
  if (!reasoningV2Enabled || !exportsEnabled) return false;
  return hasSourceBackedReasoning;
}
