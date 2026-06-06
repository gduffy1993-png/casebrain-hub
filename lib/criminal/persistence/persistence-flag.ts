"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const PERSISTENCE_STORAGE_KEY = "casebrain:persistence";
export const REASONING_FEEDBACK_PERSISTENCE_STORAGE_KEY = "casebrain:persistence:feedback";

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

/** Query param wins when set; otherwise localStorage. Default OFF. */
export function isPersistenceEnabled(
  searchParams: { get: (key: string) => string | null } | null,
  storageEnabled = false,
): boolean {
  const q = searchParams?.get("persistence");
  if (q === "1" || q === "true") return true;
  if (q === "0" || q === "false") return false;
  return storageEnabled;
}

export function isReasoningFeedbackPersistenceEnabled(
  persistenceEnabled: boolean,
  feedbackKillSwitchOff = false,
): boolean {
  if (!persistenceEnabled) return false;
  return !feedbackKillSwitchOff;
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
