"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resolveCriminalWorkflowFlag } from "@/lib/criminal/workflow/criminal-workflow-flag-defaults";

export const PERSISTENCE_STORAGE_KEY = "casebrain:persistence";
export const REASONING_FEEDBACK_PERSISTENCE_STORAGE_KEY = "casebrain:persistence:feedback";
export const SUPERVISOR_SIGNOFF_PERSISTENCE_STORAGE_KEY = "casebrain:persistence:signoffs";
export const EVIDENCE_CHANGE_SNAPSHOT_PERSISTENCE_STORAGE_KEY = "casebrain:persistence:snapshots";
export const EXPORT_REVIEW_PERSISTENCE_STORAGE_KEY = "casebrain:persistence:exports";
export const CASE_REVIEW_AUDIT_PERSISTENCE_STORAGE_KEY = "casebrain:persistence:audit";

export function readPersistenceFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(PERSISTENCE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function writePersistenceToStorage(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(PERSISTENCE_STORAGE_KEY, "true");
    else window.localStorage.removeItem(PERSISTENCE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readReasoningFeedbackPersistenceFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(REASONING_FEEDBACK_PERSISTENCE_STORAGE_KEY);
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

/** Query param wins; else localStorage; else ON in criminal pilot mode. */
export function isPersistenceEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
  options?: { defaultOn?: boolean },
): boolean {
  return resolveCriminalWorkflowFlag(searchParams, "persistence", storageEnabled, options);
}

export function isReasoningFeedbackPersistenceEnabled(
  persistenceEnabled: boolean,
  feedbackKillSwitchOff = false,
): boolean {
  if (!persistenceEnabled) return false;
  return !feedbackKillSwitchOff;
}

export function readSupervisorSignoffPersistenceFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(SUPERVISOR_SIGNOFF_PERSISTENCE_STORAGE_KEY);
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function isSupervisorSignoffPersistenceEnabled(
  persistenceEnabled: boolean,
  signoffKillSwitchOff = false,
): boolean {
  if (!persistenceEnabled) return false;
  return !signoffKillSwitchOff;
}

export function readEvidenceChangeSnapshotPersistenceFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(EVIDENCE_CHANGE_SNAPSHOT_PERSISTENCE_STORAGE_KEY);
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function isEvidenceChangeSnapshotPersistenceEnabled(
  persistenceEnabled: boolean,
  snapshotKillSwitchOff = false,
): boolean {
  if (!persistenceEnabled) return false;
  return !snapshotKillSwitchOff;
}

export function readExportReviewPersistenceFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(EXPORT_REVIEW_PERSISTENCE_STORAGE_KEY);
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function isExportReviewPersistenceEnabled(
  persistenceEnabled: boolean,
  exportKillSwitchOff = false,
): boolean {
  if (!persistenceEnabled) return false;
  return !exportKillSwitchOff;
}

export function readCaseReviewAuditPersistenceFromStorage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(CASE_REVIEW_AUDIT_PERSISTENCE_STORAGE_KEY);
    if (v === "false") return false;
    return true;
  } catch {
    return true;
  }
}

export function isCaseReviewAuditPersistenceEnabled(
  persistenceEnabled: boolean,
  auditKillSwitchOff = false,
): boolean {
  if (!persistenceEnabled) return false;
  return !auditKillSwitchOff;
}

export function usePersistenceEnabled(): boolean {
  const searchParams = useSearchParams();
  const [storageEnabled, setStorageEnabled] = useState(false);

  useEffect(() => {
    setStorageEnabled(readPersistenceFromStorage());
  }, []);

  useEffect(() => {
    const q = searchParams.get("persistence");
    if (q === "1" || q === "true") writePersistenceToStorage(true);
    if (q === "0" || q === "false") writePersistenceToStorage(false);
  }, [searchParams]);

  return useMemo(
    () => isPersistenceEnabled(searchParams, storageEnabled),
    [searchParams, storageEnabled],
  );
}

export function useReasoningFeedbackPersistenceEnabled(): boolean {
  const persistenceEnabled = usePersistenceEnabled();
  const [feedbackEnabled, setFeedbackEnabled] = useState(true);

  useEffect(() => {
    setFeedbackEnabled(readReasoningFeedbackPersistenceFromStorage());
  }, []);

  return useMemo(
    () => isReasoningFeedbackPersistenceEnabled(persistenceEnabled, !feedbackEnabled),
    [persistenceEnabled, feedbackEnabled],
  );
}

export function useSupervisorSignoffPersistenceEnabled(): boolean {
  const persistenceEnabled = usePersistenceEnabled();
  const [signoffEnabled, setSignoffEnabled] = useState(true);

  useEffect(() => {
    setSignoffEnabled(readSupervisorSignoffPersistenceFromStorage());
  }, []);

  return useMemo(
    () => isSupervisorSignoffPersistenceEnabled(persistenceEnabled, !signoffEnabled),
    [persistenceEnabled, signoffEnabled],
  );
}

export function useEvidenceChangeSnapshotPersistenceEnabled(): boolean {
  const persistenceEnabled = usePersistenceEnabled();
  const [snapshotEnabled, setSnapshotEnabled] = useState(true);

  useEffect(() => {
    setSnapshotEnabled(readEvidenceChangeSnapshotPersistenceFromStorage());
  }, []);

  return useMemo(
    () => isEvidenceChangeSnapshotPersistenceEnabled(persistenceEnabled, !snapshotEnabled),
    [persistenceEnabled, snapshotEnabled],
  );
}

export function useExportReviewPersistenceEnabled(): boolean {
  const persistenceEnabled = usePersistenceEnabled();
  const [exportEnabled, setExportEnabled] = useState(true);

  useEffect(() => {
    setExportEnabled(readExportReviewPersistenceFromStorage());
  }, []);

  return useMemo(
    () => isExportReviewPersistenceEnabled(persistenceEnabled, !exportEnabled),
    [persistenceEnabled, exportEnabled],
  );
}

export function useCaseReviewAuditPersistenceEnabled(): boolean {
  const persistenceEnabled = usePersistenceEnabled();
  const [auditEnabled, setAuditEnabled] = useState(true);

  useEffect(() => {
    setAuditEnabled(readCaseReviewAuditPersistenceFromStorage());
  }, []);

  return useMemo(
    () => isCaseReviewAuditPersistenceEnabled(persistenceEnabled, !auditEnabled),
    [persistenceEnabled, auditEnabled],
  );
}
