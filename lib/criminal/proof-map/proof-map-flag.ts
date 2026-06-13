"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCriminalWorkflowFlag } from "@/lib/criminal/workflow/criminal-workflow-flag-defaults";

export const PROOF_MAP_STORAGE_KEY = "casebrain:proofMap";

export function readProofMapFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PROOF_MAP_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeProofMapToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(PROOF_MAP_STORAGE_KEY, "true");
    else window.localStorage.removeItem(PROOF_MAP_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Query param wins; else localStorage; else ON in criminal pilot mode. */
export function isProofMapEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
  options?: { defaultOn?: boolean },
): boolean {
  return resolveCriminalWorkflowFlag(searchParams, "proofMap", storageEnabled, options);
}

export function useProofMapEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readProofMapFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("proofMap");
    if (q === "1" || q === "true") writeProofMapToStorage(true);
    if (q === "0" || q === "false") writeProofMapToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isProofMapEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}
