import {
  fetchLatestEvidenceChangeSnapshotFromApi,
  postEvidenceChangeSnapshotToApi,
} from "./evidence-change-snapshot-api-client";
import { lintEvidenceChangeOutput } from "./evidence-change-sanitize";
import type { EvidenceChangeSnapshot } from "./evidence-change-types";

export const EVIDENCE_CHANGE_SNAPSHOT_PREFIX = "casebrain:evidenceChanges:snapshot:";

export function evidenceChangeSnapshotKey(caseId: string): string {
  return `${EVIDENCE_CHANGE_SNAPSHOT_PREFIX}${caseId}`;
}

export function loadEvidenceChangeSnapshot(caseId: string): EvidenceChangeSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(evidenceChangeSnapshotKey(caseId));
    if (!raw) return null;
    if (lintEvidenceChangeOutput(raw).length) return null;
    const parsed = JSON.parse(raw) as EvidenceChangeSnapshot;
    if (!parsed || typeof parsed.timestamp !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveEvidenceChangeSnapshot(caseId: string, snapshot: EvidenceChangeSnapshot): boolean {
  if (typeof window === "undefined") return false;
  const blob = JSON.stringify(snapshot);
  if (lintEvidenceChangeOutput(blob).length) return false;
  try {
    window.localStorage.setItem(evidenceChangeSnapshotKey(caseId), blob);
    return true;
  } catch {
    return false;
  }
}

export type SaveEvidenceChangeSnapshotResult = {
  ok: boolean;
  /** True when persisted to DB via API (persistence flag on). */
  persisted: boolean;
  snapshot: EvidenceChangeSnapshot | null;
};

/**
 * Load snapshot for compare: when persistence is on, prefer latest DB row;
 * fall back to localStorage when DB has no row or API fails.
 */
export async function loadEvidenceChangeSnapshotForCompare(
  caseId: string,
  options?: { persistenceEnabled?: boolean },
): Promise<EvidenceChangeSnapshot | null> {
  if (options?.persistenceEnabled) {
    const dbSnapshot = await fetchLatestEvidenceChangeSnapshotFromApi(caseId);
    if (dbSnapshot) return dbSnapshot;
  }
  return loadEvidenceChangeSnapshot(caseId);
}

/**
 * Save snapshot: when persistence is on, attempt DB via API first;
 * always mirror to localStorage so other panels keep working offline.
 */
export async function saveEvidenceChangeSnapshotAsync(
  caseId: string,
  snapshot: EvidenceChangeSnapshot,
  options?: { persistenceEnabled?: boolean },
): Promise<SaveEvidenceChangeSnapshotResult> {
  const blob = JSON.stringify(snapshot);
  if (lintEvidenceChangeOutput(blob).length) {
    return { ok: false, persisted: false, snapshot: null };
  }

  if (options?.persistenceEnabled) {
    const apiResult = await postEvidenceChangeSnapshotToApi(caseId, snapshot);
    if (apiResult.ok) {
      saveEvidenceChangeSnapshot(caseId, apiResult.snapshot);
      return { ok: true, persisted: true, snapshot: apiResult.snapshot };
    }
  }

  const localOk = saveEvidenceChangeSnapshot(caseId, snapshot);
  return { ok: localOk, persisted: false, snapshot: localOk ? snapshot : null };
}

export function clearEvidenceChangeSnapshot(caseId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(evidenceChangeSnapshotKey(caseId));
  } catch {
    /* ignore */
  }
}
