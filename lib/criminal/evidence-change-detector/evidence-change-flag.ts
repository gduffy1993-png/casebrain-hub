"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const EVIDENCE_CHANGES_STORAGE_KEY = "casebrain:evidenceChanges";

export function readEvidenceChangesFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(EVIDENCE_CHANGES_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeEvidenceChangesToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(EVIDENCE_CHANGES_STORAGE_KEY, "true");
    else window.localStorage.removeItem(EVIDENCE_CHANGES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Requires reasoningV2=1 and evidenceChanges=1. Default OFF. */
export function isEvidenceChangesEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
): boolean {
  const q = searchParams?.get("evidenceChanges");
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;
  return storageEnabled;
}

export function useEvidenceChangesEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readEvidenceChangesFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("evidenceChanges");
    if (q === "1" || q === "true") writeEvidenceChangesToStorage(true);
    if (q === "0" || q === "false") writeEvidenceChangesToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isEvidenceChangesEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function shouldShowEvidenceChangeDetector(
  reasoningV2Enabled: boolean,
  evidenceChangesEnabled: boolean,
  hasSourceBackedReasoning: boolean,
): boolean {
  if (!reasoningV2Enabled || !evidenceChangesEnabled) return false;
  return hasSourceBackedReasoning;
}
