"use client";

import { useMemo } from "react";
import { usePersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";
import { useSupervisorQAEnabled } from "@/lib/criminal/supervisor-qa/supervisor-qa-flag";

/** Page visible when supervisor QA or persistence review mode is enabled. */
export function isSupervisorQueuePageEnabled(
  supervisorEnabled: boolean,
  persistenceEnabled: boolean,
): boolean {
  return supervisorEnabled || persistenceEnabled;
}

export function useSupervisorQueuePageEnabled(): boolean {
  const supervisorEnabled = useSupervisorQAEnabled();
  const persistenceEnabled = usePersistenceEnabled();
  return useMemo(
    () => isSupervisorQueuePageEnabled(supervisorEnabled, persistenceEnabled),
    [supervisorEnabled, persistenceEnabled],
  );
}
