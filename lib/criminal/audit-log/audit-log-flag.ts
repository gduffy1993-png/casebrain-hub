"use client";

import { useMemo } from "react";
import { useTrustFeedbackPersistenceEnabled } from "@/lib/criminal/persistence/persistence-flag";

/** Audit log visible when trust feedback is persisted for review (H5 internal queue). */
export function isAuditLogPageEnabled(trustFeedbackPersistenceEnabled: boolean): boolean {
  return trustFeedbackPersistenceEnabled;
}

export function useAuditLogPageEnabled(): boolean {
  const trustPersistence = useTrustFeedbackPersistenceEnabled();
  return useMemo(() => isAuditLogPageEnabled(trustPersistence), [trustPersistence]);
}
