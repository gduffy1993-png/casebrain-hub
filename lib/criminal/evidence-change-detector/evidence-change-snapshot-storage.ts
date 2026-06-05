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

export function clearEvidenceChangeSnapshot(caseId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(evidenceChangeSnapshotKey(caseId));
  } catch {
    /* ignore */
  }
}
